import Link from 'next/link'

const TIERS = [
  {
    name: 'Standard',
    description: '10–14 day deadline',
    price: '£10',
    unit: 'per 100 words',
    features: ['UK-qualified writer', 'Plagiarism report', '1 free revision', 'Email support'],
    cta: 'Order now',
    highlighted: false,
  },
  {
    name: 'Express',
    description: '3–9 day deadline',
    price: '£15',
    unit: 'per 100 words',
    features: ['UK-qualified writer', 'Plagiarism report', '3 free revisions', 'Priority support', 'Faster turnaround'],
    cta: 'Order now',
    highlighted: true,
  },
  {
    name: 'Urgent',
    description: '24–48 hr deadline',
    price: '£25',
    unit: 'per 100 words',
    features: ['Senior writer assigned', 'Plagiarism report', 'Unlimited revisions', '24/7 dedicated support', 'Same-day delivery'],
    cta: 'Order now',
    highlighted: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Simple, transparent pricing</h2>
          <p className="mt-3 text-gray-500">No hidden fees. Pricing is based on word count × deadline tier.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-8 flex flex-col ${
                tier.highlighted
                  ? 'border-brand-600 bg-brand-600 text-white shadow-xl scale-105'
                  : 'border-gray-200 bg-white text-gray-900'
              }`}
            >
              <p className={`text-sm font-semibold mb-1 ${tier.highlighted ? 'text-brand-200' : 'text-brand-600'}`}>
                {tier.name}
              </p>
              <p className={`text-xs mb-4 ${tier.highlighted ? 'text-brand-200' : 'text-gray-400'}`}>
                {tier.description}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">{tier.price}</span>
                <span className={`text-sm ml-1 ${tier.highlighted ? 'text-brand-200' : 'text-gray-400'}`}>
                  {tier.unit}
                </span>
              </div>
              <ul className="space-y-2 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/order"
                className={`block text-center font-semibold py-3 rounded-xl text-sm transition-colors ${
                  tier.highlighted
                    ? 'bg-white text-brand-700 hover:bg-brand-50'
                    : 'bg-brand-600 text-white hover:bg-brand-700'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
