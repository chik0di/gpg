export const COUNTRY_CURRENCY: Record<string, string> = {
  // British Isles
  'United Kingdom': 'GBP',
  // North America
  'United States': 'USD',
  'Canada': 'CAD',
  'Mexico': 'MXN',
  // Caribbean / Central America
  'Jamaica': 'JMD',
  'Trinidad and Tobago': 'TTD',
  'Bahamas': 'BSD',
  'Barbados': 'BBD',
  'Belize': 'BZD',
  'Costa Rica': 'CRC',
  'Guatemala': 'GTQ',
  'Honduras': 'HNL',
  'Panama': 'PAB',
  // South America
  'Argentina': 'ARS',
  'Bolivia': 'BOB',
  'Brazil': 'BRL',
  'Chile': 'CLP',
  'Colombia': 'COP',
  'Ecuador': 'USD',
  'Guyana': 'GYD',
  'Paraguay': 'PYG',
  'Peru': 'PEN',
  'Uruguay': 'UYU',
  'Venezuela': 'VES',
  // West Africa
  'Nigeria': 'NGN',
  'Ghana': 'GHS',
  'Senegal': 'XOF',
  'Ivory Coast': 'XOF',
  'Sierra Leone': 'SLL',
  'Liberia': 'LRD',
  'Gambia': 'GMD',
  'Guinea': 'GNF',
  // East Africa
  'Kenya': 'KES',
  'Tanzania': 'TZS',
  'Uganda': 'UGX',
  'Rwanda': 'RWF',
  'Ethiopia': 'ETB',
  'Sudan': 'SDG',
  'Djibouti': 'DJF',
  // Southern Africa
  'South Africa': 'ZAR',
  'Zimbabwe': 'ZWL',
  'Zambia': 'ZMW',
  'Mozambique': 'MZN',
  'Botswana': 'BWP',
  'Namibia': 'NAD',
  // North Africa
  'Egypt': 'EGP',
  'Morocco': 'MAD',
  'Algeria': 'DZD',
  'Tunisia': 'TND',
  'Libya': 'LYD',
  // Middle East
  'United Arab Emirates': 'AED',
  'Saudi Arabia': 'SAR',
  'Qatar': 'QAR',
  'Kuwait': 'KWD',
  'Bahrain': 'BHD',
  'Oman': 'OMR',
  'Jordan': 'JOD',
  'Israel': 'ILS',
  'Iraq': 'IQD',
  'Iran': 'IRR',
  'Lebanon': 'LBP',
  'Syria': 'SYP',
  'Yemen': 'YER',
  'Palestine': 'ILS',
  // South Asia
  'India': 'INR',
  'Pakistan': 'PKR',
  'Bangladesh': 'BDT',
  'Sri Lanka': 'LKR',
  'Nepal': 'NPR',
  'Bhutan': 'BTN',
  'Afghanistan': 'AFN',
  'Maldives': 'MVR',
  // South-East Asia
  'Singapore': 'SGD',
  'Malaysia': 'MYR',
  'Indonesia': 'IDR',
  'Thailand': 'THB',
  'Philippines': 'PHP',
  'Vietnam': 'VND',
  'Myanmar': 'MMK',
  'Cambodia': 'KHR',
  'Laos': 'LAK',
  'Brunei': 'BND',
  'Timor-Leste': 'USD',
  // East Asia
  'China': 'CNY',
  'Japan': 'JPY',
  'South Korea': 'KRW',
  'Taiwan': 'TWD',
  'Hong Kong': 'HKD',
  'Mongolia': 'MNT',
  'North Korea': 'KPW',
  // Central Asia
  'Kazakhstan': 'KZT',
  'Uzbekistan': 'UZS',
  'Kyrgyzstan': 'KGS',
  'Tajikistan': 'TJS',
  'Turkmenistan': 'TMT',
  // Eastern Europe
  'Russia': 'RUB',
  'Ukraine': 'UAH',
  'Belarus': 'BYN',
  'Georgia': 'GEL',
  'Armenia': 'AMD',
  'Azerbaijan': 'AZN',
  'Moldova': 'MDL',
  // Balkans
  'Serbia': 'RSD',
  'Bosnia and Herzegovina': 'BAM',
  'North Macedonia': 'MKD',
  'Albania': 'ALL',
  'Kosovo': 'EUR',
  // Non-euro Western Europe
  'Switzerland': 'CHF',
  'Liechtenstein': 'CHF',
  'Norway': 'NOK',
  'Sweden': 'SEK',
  'Denmark': 'DKK',
  'Iceland': 'ISK',
  'Czech Republic': 'CZK',
  'Poland': 'PLN',
  'Hungary': 'HUF',
  'Romania': 'RON',
  'Bulgaria': 'BGN',
  'Turkey': 'TRY',
  // Oceania
  'Australia': 'AUD',
  'New Zealand': 'NZD',
  'Fiji': 'FJD',
  'Papua New Guinea': 'PGK',
  // Euro zone
  'Andorra': 'EUR',
  'Austria': 'EUR',
  'Belgium': 'EUR',
  'Croatia': 'EUR',
  'Cyprus': 'EUR',
  'Estonia': 'EUR',
  'Finland': 'EUR',
  'France': 'EUR',
  'Germany': 'EUR',
  'Greece': 'EUR',
  'Ireland': 'EUR',
  'Italy': 'EUR',
  'Latvia': 'EUR',
  'Lithuania': 'EUR',
  'Luxembourg': 'EUR',
  'Malta': 'EUR',
  'Monaco': 'EUR',
  'Montenegro': 'EUR',
  'Netherlands': 'EUR',
  'Portugal': 'EUR',
  'San Marino': 'EUR',
  'Slovakia': 'EUR',
  'Slovenia': 'EUR',
  'Spain': 'EUR',
  'Vatican City': 'EUR',
}

export function getCurrencyForCountry(country: string): string {
  return COUNTRY_CURRENCY[country] ?? 'USD'
}

// Fetch live GBP → target currency rate.
// Uses fawazahmed0 CDN API (free, unlimited, 170+ currencies) with a fallback mirror.
export async function fetchGBPRate(currency: string): Promise<number> {
  if (currency === 'GBP') return 1

  const endpoints = [
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/gbp.json',
    'https://latest.currency-api.pages.dev/v1/currencies/gbp.json',
  ]

  const key = currency.toLowerCase()

  for (const url of endpoints) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data: { date: string; gbp: Record<string, number> } = await res.json()
      const rate = data.gbp[key]
      if (rate && rate > 0) return rate
    } catch {
      // try next endpoint
    }
  }

  throw new Error(`Could not fetch GBP→${currency} rate`)
}

// Human-readable name for a currency code: "US Dollar", "Nigerian Naira", etc.
export function getCurrencyDisplayName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) ?? code
  } catch {
    return code
  }
}

// Format a GBP amount using the target currency's symbol only.
// e.g. £25, $31.88, ₦49,600, €29.50
export function fmtInCurrency(gbpAmount: number, rate: number, currency: string): string {
  const amount = gbpAmount * rate
  if (currency === 'GBP') {
    return `£${amount % 1 === 0 ? amount : amount.toFixed(2)}`
  }
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
