import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import { createClient } from '@supabase/supabase-js'
import { validateExtraction, applySanityBounds, containsSuspiciousPhrases } from '@/lib/extraction-validation'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SYSTEM_PROMPT = `You are an academic assignment brief analyser. Extract structured information from the uploaded assignment brief. Return ONLY valid JSON with no other text. Be thorough — academic briefs often state requirements in different ways.`

const USER_PROMPT_TEMPLATE = `Analyse this assignment brief and extract the following information as JSON:

{
  "subject_field": string or null (the academic subject/field this assignment is for),
  "academic_level": "College" or "Undergraduate" or "Masters" or null (if stated or clearly implied),
  "deadline": string or null (any deadline or submission date mentioned, in ISO format if possible),
  "deliverables": [
    {
      "type": "written" or "presentation" or "technical",
      "description": string (plain English description of what needs to be delivered — be specific),
      "quantity": number or null (word count for written, slide count for presentation, null for technical),
      "quantity_type": "words" or "pages" or "slides" or null,
      "complexity": "simple" or "moderate" or "complex" or "expert" or null (for technical only — assess based on what is described),
      "price_gbp": number (calculate the price: for written use £5 per page where 275 words = 1 page rounded UP to nearest page using ceiling division, for presentation use £2.50 per slide, for technical use: simple=£40, moderate=£65, complex=£95, expert=£130),
      "confidence": "high" or "medium" or "low" (how confident you are in this deliverable extraction)
    }
  ],
  "additional_notes": string or null (any other important requirements noticed in the brief that don't fit the above fields)
}

CRITICAL TYPE CLASSIFICATION RULES:

TYPE "written" = Any text document with a word count or page count:
  - Essays, reports, dissertations, literature reviews, case studies, research papers
  - Written reports, evaluative reports, reflective reports, analysis reports
  - Word documents, written assignments, written evaluations
  - ANY deliverable described as a "report" or "essay" or "written" or "document"

TYPE "presentation" = Any slide deck with a slide count:
  - PowerPoint, Google Slides, Keynote, Prezi
  - Presentations, slideshows, slide decks
  - ANY deliverable described as a "presentation" or mentioning "slides"

TYPE "technical" = Actual code files, programs, executables, and technical implementations:
  - Source code files (.py, .java, .cs, .cpp, .js, etc.)
  - Programs, scripts, executables (.exe, .app, .bin)
  - Databases, SQL files (.sql, .db)
  - Network simulations (Cisco Packet Tracer, GNS3)
  - Flowcharts, ERD diagrams (as standalone technical artifacts)
  - Web/mobile applications (the actual running code)
  - APIs, backend/frontend code
  - ONLY when the deliverable IS the code itself, not a report ABOUT code

CRITICAL DISTINCTION — "written" vs "technical":
  ✓ "Written report evaluating a Python program" → type: "written" (it's a REPORT)
  ✓ "Essay discussing database design" → type: "written" (it's an ESSAY)
  ✓ "Analysis of software development lifecycle" → type: "written" (it's ANALYSIS)
  ✓ "Evaluation report on network security" → type: "written" (it's a REPORT)

  ✓ "Python program (.py file) to calculate grades" → type: "technical" (actual CODE)
  ✓ "Source code for calculator application" → type: "technical" (actual CODE)
  ✓ "Java program to manage records" → type: "technical" (actual PROGRAM)
  ✓ "SQL database with queries" → type: "technical" (actual DATABASE)

EXAMPLES OF "written" TYPE:
✓ "2000-word essay on climate change" → written, quantity: 2000, quantity_type: "words"
✓ "Written report (2000-2500 words) evaluating the software" → written, quantity: 2500, quantity_type: "words"
✓ "Reflective report (1500 words) on project management" → written, quantity: 1500, quantity_type: "words"
✓ "Case study analysis (3000 words)" → written, quantity: 3000, quantity_type: "words"
✓ "Literature review (10 pages)" → written, quantity: 10, quantity_type: "pages"
✓ "Evaluation report discussing database implementation" → written, quantity: (extract from brief), quantity_type: "words"

EXAMPLES OF "presentation" TYPE:
✓ "PowerPoint presentation (10-15 slides)" → presentation, quantity: 15, quantity_type: "slides"
✓ "Presentation (8-10 slides) on marketing strategy" → presentation, quantity: 10, quantity_type: "slides"
✓ "Slide deck explaining the system design" → presentation, quantity: (extract from brief), quantity_type: "slides"

EXAMPLES OF "technical" TYPE:
✓ "Python program to calculate student grades" → technical, complexity: "moderate", quantity: null
✓ "Visual Basic source code (.vb file)" → technical, complexity: "moderate", quantity: null
✓ "Executable program (.exe) for data entry" → technical, complexity: "complex", quantity: null
✓ "SQL database with 5 tables" → technical, complexity: "complex", quantity: null
✓ "Network simulation using Cisco Packet Tracer" → technical, complexity: "complex", quantity: null
✓ "Flowchart and ERD diagram for system design" → technical, complexity: "simple", quantity: null

DEFAULT RULE: If the brief says "report", "essay", "written", "document", "analysis", "evaluation" → type is "written" (NOT technical), even if it mentions code/software/databases in the context`

interface ExtractionResult {
  subject_field: string | null
  academic_level: 'College' | 'Undergraduate' | 'Masters' | null
  deadline: string | null
  deliverables: Array<{
    type: 'written' | 'presentation' | 'technical'
    description: string
    quantity: number | null
    quantity_type: 'words' | 'pages' | 'slides' | null
    complexity: 'simple' | 'moderate' | 'complex' | 'expert' | null
    price_gbp: number
    confidence: 'high' | 'medium' | 'low'
  }>
  additional_notes: string | null
}

async function extractTextFromWord(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

/**
 * Extract brief information with automatic retry on failure
 * @returns Validated extraction result
 * @throws Error if both attempts fail
 */
async function extractWithRetry(
  anthropic: Anthropic,
  params: {
    model: string
    max_tokens: number
    system: string
    messages: any[]
  }
): Promise<ExtractionResult> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[extract-brief] Extraction attempt ${attempt}/2`)

      const message = await anthropic.messages.create(params)

      // Extract text content from response
      const textContent = message.content.find((block) => block.type === 'text')
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response')
      }

      // Parse JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response')
      }

      const rawExtraction = JSON.parse(jsonMatch[0])

      // Validate with Zod schema
      const extraction = validateExtraction(rawExtraction)

      // Apply sanity bounds (clamp out-of-range values)
      const boundedExtraction = applySanityBounds(extraction)

      console.log(`[extract-brief] Extraction succeeded on attempt ${attempt}`)
      return boundedExtraction

    } catch (error) {
      lastError = error as Error
      console.warn(`[extract-brief] Attempt ${attempt} failed:`, error instanceof Error ? error.message : error)

      if (attempt < 2) {
        // Wait 1 second before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  // Both attempts failed
  console.error('[extract-brief] Extraction failed after 2 attempts:', lastError)
  throw lastError!
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sessionId = formData.get('sessionId') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided', code: 'NO_FILE' },
        { status: 400 }
      )
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session ID provided', code: 'NO_SESSION' },
        { status: 400 }
      )
    }

    // Validate file type - accept PDF, Word, and images
    const fileName = file.name.toLowerCase()
    const mimeType = file.type.toLowerCase()

    const isPDF = fileName.endsWith('.pdf') || mimeType === 'application/pdf'
    const isWord = fileName.endsWith('.doc') || fileName.endsWith('.docx') ||
                   mimeType === 'application/msword' ||
                   mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    const isImage = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ||
                    fileName.endsWith('.png') || fileName.endsWith('.webp') ||
                    mimeType.startsWith('image/')

    if (!isPDF && !isWord && !isImage) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Please upload a PDF, Word document, or image file (.pdf, .doc, .docx, .jpg, .png, .webp)',
          code: 'INVALID_FILE_TYPE'
        },
        { status: 400 }
      )
    }

    // Validate file size (20MB max)
    const MAX_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error: 'File size exceeds 20MB limit',
          code: 'FILE_TOO_LARGE'
        },
        { status: 400 }
      )
    }

    // Store file temporarily in Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const tempPath = `briefs/temp/${sessionId}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('order-files')
      .upload(tempPath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Failed to upload file to storage:', uploadError)
      return NextResponse.json(
        { error: 'Failed to store file', code: 'STORAGE_ERROR' },
        { status: 500 }
      )
    }

    let extractionResult: ExtractionResult
    let briefTextForInjectionCheck: string | null = null

    // Process based on file type
    if (fileName.endsWith('.pdf')) {
      // Send PDF directly to Claude as base64
      const base64Data = fileBuffer.toString('base64')
      const mediaType = 'application/pdf'

      try {
        extractionResult = await extractWithRetry(anthropic, {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64Data,
                  },
                },
                {
                  type: 'text',
                  text: USER_PROMPT_TEMPLATE,
                },
              ],
            },
          ],
        })
      } catch (error) {
        // Check for password-protected PDF
        if (error instanceof Error &&
            (error.message?.toLowerCase().includes('password') ||
             error.message?.toLowerCase().includes('encrypted'))) {
          return NextResponse.json(
            {
              error: 'This PDF appears to be password-protected. Please upload an unprotected version.',
              code: 'PASSWORD_PROTECTED_PDF',
            },
            { status: 400 }
          )
        }

        // Generic extraction failure
        return NextResponse.json(
          {
            error: 'Could not extract information from brief. Please fill in the form manually.',
            code: 'EXTRACTION_FAILED',
            tempFilePath: tempPath,
          },
          { status: 400 }
        )
      }
    } else if (isImage) {
      // Process image file - send to Claude as image content block
      const base64Data = fileBuffer.toString('base64')

      // Determine media type from file extension and MIME type
      let mediaType = 'image/jpeg' // default
      if (fileName.endsWith('.png') || mimeType === 'image/png') {
        mediaType = 'image/png'
      } else if (fileName.endsWith('.webp') || mimeType === 'image/webp') {
        mediaType = 'image/webp'
      }

      try {
        extractionResult = await extractWithRetry(anthropic, {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64Data,
                  },
                },
                {
                  type: 'text',
                  text: USER_PROMPT_TEMPLATE,
                },
              ],
            },
          ],
        })
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Could not extract information from image. Please fill in the form manually.',
            code: 'EXTRACTION_FAILED',
            tempFilePath: tempPath,
          },
          { status: 400 }
        )
      }
    } else {
      // Extract text from Word document first
      const text = await extractTextFromWord(fileBuffer)

      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          {
            error: 'Could not extract text from document. Please ensure the file is not empty or corrupted.',
            code: 'NO_EXTRACTABLE_TEXT'
          },
          { status: 400 }
        )
      }

      // Store text for prompt injection check
      briefTextForInjectionCheck = text

      try {
        extractionResult = await extractWithRetry(anthropic, {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `${USER_PROMPT_TEMPLATE}\n\nDocument content:\n${text}`,
            },
          ],
        })
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Could not extract information from document. Please fill in the form manually.',
            code: 'EXTRACTION_FAILED',
            tempFilePath: tempPath,
          },
          { status: 400 }
        )
      }
    }

    // Check for prompt injection phrases (flag only, don't block)
    let suspiciousFlag = false
    if (briefTextForInjectionCheck) {
      suspiciousFlag = containsSuspiciousPhrases(briefTextForInjectionCheck)
      if (suspiciousFlag) {
        console.warn(`[extract-brief] Suspicious phrases detected in session ${sessionId}`)
      }
    }

    // Validate deliverables exist
    if (!extractionResult.deliverables || extractionResult.deliverables.length === 0) {
      return NextResponse.json(
        {
          error: 'Could not identify any deliverables in the brief. Please fill in the form manually.',
          code: 'NO_DELIVERABLES',
          tempFilePath: tempPath,
        },
        { status: 400 }
      )
    }

    // Store extraction in database with suspicious flag
    const { error: dbError } = await supabase
      .from('brief_extractions')
      .insert({
        session_id: sessionId,
        file_name: file.name,
        raw_extraction: extractionResult,
        model_used: 'claude-haiku-4-5-20251001',
        suspicious_content_flag: suspiciousFlag,
      })

    if (dbError) {
      console.error('Failed to store extraction in database:', dbError)
      // Don't fail the request if we can't store it, just log the error
    }

    // Return extraction result (suspiciousFlag is logged but doesn't affect client)
    return NextResponse.json({
      success: true,
      extraction: extractionResult,
      tempFilePath: tempPath,
    })
  } catch (error) {
    console.error('Brief extraction error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to extract brief information',
        code: 'EXTRACTION_ERROR',
      },
      { status: 500 }
    )
  }
}
