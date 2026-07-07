import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import { createClient } from '@supabase/supabase-js'

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
  "academic_level": "A-Level / College" or "Undergraduate" or "Masters" or null (if stated or clearly implied),
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
}`

interface ExtractionResult {
  subject_field: string | null
  academic_level: 'A-Level / College' | 'Undergraduate' | 'Masters' | null
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

    // Validate file type
    const fileName = file.name.toLowerCase()
    const isValidType = fileName.endsWith('.pdf') ||
                       fileName.endsWith('.doc') ||
                       fileName.endsWith('.docx')

    if (!isValidType) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Please upload a PDF or Word document (.pdf, .doc, .docx)',
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

    // Process based on file type
    if (fileName.endsWith('.pdf')) {
      // Send PDF directly to Claude as base64
      const base64Data = fileBuffer.toString('base64')
      const mediaType = 'application/pdf'

      const message = await anthropic.messages.create({
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

      extractionResult = JSON.parse(jsonMatch[0])
    } else {
      // Extract text from Word document first
      const text = await extractTextFromWord(fileBuffer)

      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          {
            error: 'Could not extract text from document. Please ensure the file is not empty or corrupted.',
            code: 'EXTRACTION_FAILED'
          },
          { status: 400 }
        )
      }

      const message = await anthropic.messages.create({
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

      extractionResult = JSON.parse(jsonMatch[0])
    }

    // Validate extraction result
    if (!extractionResult.deliverables || !Array.isArray(extractionResult.deliverables)) {
      throw new Error('Invalid extraction result: missing deliverables array')
    }

    if (extractionResult.deliverables.length === 0) {
      return NextResponse.json(
        {
          error: 'Could not identify any deliverables in the brief. Please fill in the form manually.',
          code: 'NO_DELIVERABLES'
        },
        { status: 400 }
      )
    }

    // Store extraction in database
    const { error: dbError } = await supabase
      .from('brief_extractions')
      .insert({
        session_id: sessionId,
        file_name: file.name,
        raw_extraction: extractionResult,
        model_used: 'claude-haiku-4-5-20251001',
      })

    if (dbError) {
      console.error('Failed to store extraction in database:', dbError)
      // Don't fail the request if we can't store it, just log the error
    }

    // Return extraction result
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
