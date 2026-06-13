'use client'

import { useState } from 'react'
import { SUBJECT_GROUPS, ACADEMIC_LEVELS, getUrgencyWarning } from '@/lib/pricing'
import { getCurrencyForCountry, fetchGBPRate } from '@/lib/currency'
import type { OrderFormState } from '@/types/order-form'

// Pinned first, then alphabetical
const COUNTRIES = [
  'United Kingdom',
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium',
  'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana',
  'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic',
  'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
  'Congo (Democratic Republic)', 'Congo (Republic)', 'Costa Rica', 'Croatia',
  'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea',
  'Estonia', 'Eswatini', 'Ethiopia',
  'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece',
  'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya',
  'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
  'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia',
  'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua',
  'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
  'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay',
  'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar',
  'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
  'Samoa', 'San Marino', 'São Tomé and Príncipe', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
  'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo',
  'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United States', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  'Yemen',
  'Zambia', 'Zimbabwe',
]

interface Props {
  data: Pick<OrderFormState, 'subjectField' | 'academicLevel' | 'country' | 'deadline'>
  errors: Record<string, string>
  onChange: (key: string, value: string) => void
  onCurrencyChange: (currency: string, rate: number) => void
}

function getMinDate() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
}

const selectClass =
  'w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all text-[#1A1A2E]'

export default function StepBasicInfo({ data, errors, onChange, onCurrencyChange }: Props) {
  const [loadingCurrency, setLoadingCurrency] = useState(false)

  async function handleCountryChange(country: string) {
    onChange('country', country)
    const currency = getCurrencyForCountry(country)
    if (currency === 'GBP') {
      onCurrencyChange('GBP', 1)
      return
    }
    setLoadingCurrency(true)
    try {
      const rate = await fetchGBPRate(currency)
      onCurrencyChange(currency, rate)
    } catch {
      onCurrencyChange('GBP', 1)
    } finally {
      setLoadingCurrency(false)
    }
  }

  const urgencyWarning = getUrgencyWarning(data.deadline)

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-xl font-bold text-[#1B2E4B] mb-1">Basic information</h2>
        <p className="text-sm text-[#6B7280]">Tell us about the assignment and when you need it.</p>
      </div>

      {/* Subject / Field */}
      <div>
        <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
          Subject / Field
        </label>
        <p className="text-xs text-[#9CA3AF] mb-2">
          Select your field — related subjects are welcome
        </p>
        <select
          value={data.subjectField}
          onChange={(e) => onChange('subjectField', e.target.value)}
          className={selectClass}
          style={{
            borderColor: errors.subjectField ? '#EF4444' : '#E8E2D9',
            color: data.subjectField ? '#1A1A2E' : '#9CA3AF',
          }}
        >
          <option value="" disabled>Select your subject…</option>
          {SUBJECT_GROUPS.map(({ group, subjects }) => (
            <optgroup key={group} label={group}>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {errors.subjectField && (
          <p className="mt-1.5 text-xs text-red-500">{errors.subjectField}</p>
        )}
      </div>

      {/* Country */}
      <div>
        <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
          Country
        </label>
        <div className="relative">
          <select
            value={data.country}
            onChange={(e) => handleCountryChange(e.target.value)}
            className={selectClass}
            disabled={loadingCurrency}
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {loadingCurrency && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 animate-spin text-[#E8A020]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>
        {loadingCurrency && (
          <p className="mt-1.5 text-xs text-[#9CA3AF]">Fetching live exchange rate…</p>
        )}
      </div>

      {/* Academic level */}
      <div>
        <label className="block text-sm font-semibold text-[#1B2E4B] mb-3">
          Academic Level
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ACADEMIC_LEVELS.map(({ label }) => {
            const selected = data.academicLevel === label
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange('academicLevel', label)}
                className="p-4 rounded-xl border-2 text-left transition-all duration-150"
                style={{
                  borderColor: selected ? '#E8A020' : '#E8E2D9',
                  background:  selected ? '#FDF3DC' : '#fff',
                }}
              >
                <span
                  className="text-sm font-bold"
                  style={{ color: selected ? '#C4861A' : '#1B2E4B' }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
        {errors.academicLevel && (
          <p className="mt-1.5 text-xs text-red-500">{errors.academicLevel}</p>
        )}
      </div>

      {/* Deadline */}
      <div>
        <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
          Deadline
          <span className="ml-2 text-xs font-normal text-[#9CA3AF]">minimum 2 days from today</span>
        </label>
        <input
          type="date"
          min={getMinDate()}
          value={data.deadline}
          onChange={(e) => onChange('deadline', e.target.value)}
          className={selectClass}
          style={{ borderColor: errors.deadline ? '#EF4444' : '#E8E2D9' }}
        />
        <p className="mt-1.5 text-xs text-[#9CA3AF]">
          We require a minimum of 2 days to ensure quality work. Need it sooner?{' '}
          <a
            href="https://wa.me/447880213838"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#6B7280] hover:text-[#1B2E4B] underline underline-offset-2 transition-colors"
          >
            Chat with us on WhatsApp
          </a>
          .
        </p>
        {errors.deadline && (
          <p className="mt-1.5 text-xs text-red-500">{errors.deadline}</p>
        )}
        {urgencyWarning && !errors.deadline && (
          <div className="mt-2.5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-700">{urgencyWarning}</p>
          </div>
        )}
      </div>
    </div>
  )
}
