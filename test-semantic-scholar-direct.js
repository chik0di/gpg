/**
 * Direct Semantic Scholar API Test (Server-side)
 * Tests from Node.js environment (NOT browser)
 */

async function testSemanticScholar() {
  const query = 'machine learning'
  const encodedQuery = encodeURIComponent(query)
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&limit=10&fields=title,authors,year,externalIds,openAccessPdf,abstract`

  console.log('================================================================================')
  console.log('DIRECT SEMANTIC SCHOLAR API TEST (Server-side)')
  console.log('================================================================================')
  console.log('Query:', query)
  console.log('Encoded:', encodedQuery)
  console.log('URL:', url)
  console.log('Environment: Node.js (Server)')
  console.log('================================================================================')
  console.log()

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    })

    console.log('RESPONSE STATUS')
    console.log('Status Code:', response.status)
    console.log('Status Text:', response.statusText)
    console.log('OK:', response.ok)
    console.log()

    console.log('RESPONSE HEADERS')
    const headers = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })
    console.log(JSON.stringify(headers, null, 2))
    console.log()

    if (!response.ok) {
      const errorText = await response.text()
      console.log('ERROR RESPONSE BODY')
      console.log(errorText)
      console.log()
      console.log('PARSED ERROR')
      try {
        const errorJson = JSON.parse(errorText)
        console.log(JSON.stringify(errorJson, null, 2))
      } catch (e) {
        console.log('(Not JSON)')
      }
      return
    }

    const data = await response.json()

    console.log('SUCCESS RESPONSE')
    console.log('Total results:', data.total)
    console.log('Offset:', data.offset)
    console.log('Next:', data.next)
    console.log('Data array length:', data.data?.length ?? 0)
    console.log()

    if (data.data && data.data.length > 0) {
      console.log('FIRST RESULT SAMPLE')
      console.log(JSON.stringify(data.data[0], null, 2))
      console.log()
    }

    console.log('================================================================================')
    console.log('TEST RESULT: SUCCESS')
    console.log('Semantic Scholar API is accessible from server environment')
    console.log('================================================================================')

  } catch (error) {
    console.log('EXCEPTION CAUGHT')
    console.log('Error type:', error.constructor.name)
    console.log('Error message:', error.message)
    console.log('Full error:', error)
    console.log()
    console.log('================================================================================')
    console.log('TEST RESULT: FAILED')
    console.log('================================================================================')
  }
}

testSemanticScholar()
