/**
 * Test script to debug Research Finder
 * Run with: node test-research-finder.js
 */

async function testSemanticScholar() {
  const query = 'machine learning'
  const encodedQuery = encodeURIComponent(query)
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&limit=10&fields=title,authors,year,externalIds,openAccessPdf,abstract`

  console.log('========================================')
  console.log('🧪 DIRECT SEMANTIC SCHOLAR API TEST')
  console.log('========================================')
  console.log('Query (raw):', query)
  console.log('Query (encoded):', encodedQuery)
  console.log('Full URL:', url)
  console.log('========================================')

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    })

    console.log('📡 RESPONSE')
    console.log('Status:', response.status)
    console.log('Status Text:', response.statusText)
    console.log('OK:', response.ok)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))
    console.log('========================================')

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ ERROR RESPONSE')
      console.error('Error body:', errorText)
      console.error('========================================')
      return
    }

    const data = await response.json()

    console.log('📊 DATA')
    console.log('Has data array:', !!data.data)
    console.log('Data array length:', data.data?.length ?? 0)
    console.log('Total results:', data.total)
    console.log('========================================')

    if (data.data && data.data.length > 0) {
      console.log('📄 FIRST RESULT')
      console.log(JSON.stringify(data.data[0], null, 2))
      console.log('========================================')
    }

    console.log('✅ TEST COMPLETE')
  } catch (error) {
    console.error('❌ EXCEPTION')
    console.error(error)
  }
}

testSemanticScholar()
