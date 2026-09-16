import Link from 'next/link'

const OFFERINGS = [
  {
    label: 'Paid Service',
    headline: 'Custom Model Answers',
    description:
      'Written reports, presentations and technical work crafted to your exact brief by subject specialists.',
    examples: ['Essays & reports', 'Presentations', 'Technical work', 'All academic levels'],
    href: '/order',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: 'Free Tool',
    headline: 'Research Material Finder',
    description:
      'Find relevant academic sources for your topic instantly. Free, no account needed.',
    examples: ['Academic papers', 'Free PDFs highlighted', 'Instant search', 'No signup required'],
    href: '/resources/research-finder',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    label: 'Free Tool',
    headline: 'Reference Generator',
    description:
      'Generate correctly formatted citations in APA, Harvard, Vancouver, MLA and Chicago styles. Free.',
    examples: ['5 citation styles', 'Books, websites, journals', 'Bibliography builder', 'Copy to clipboard'],
    href: '/resources/reference-generator',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

export default function WhatWeOffer() {
  return (
    <section id="what-we-offer" className="py-20 md:py-28 bg-[#FDFAF6]">
      <div className="container-narrow">

        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-16">
          <p className="text-xs font-bold text-[#E8A020] uppercase tracking-widest mb-3">
            What we offer
          </p>
          <h2 className="font-extrabold text-[#1B2E4B] text-3xl md:text-4xl leading-tight mb-4">
            Tools to help you succeed
          </h2>
          <p className="text-[#6B7280] text-base leading-relaxed">
            Custom academic work and free research tools for students.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {OFFERINGS.map((item) => (
            <Link
              key={item.headline}
              href={item.href}
              className="group relative bg-white border border-[#E8E2D9] rounded-3xl p-7 hover:border-[#E8A020]/50 hover:shadow-[0_12px_40px_-4px_rgba(26,26,46,0.12)] transition-all duration-300 block"
            >
              {/* Amber accent line */}
              <div className="absolute top-0 left-8 right-8 h-0.5 rounded-b-full bg-[#E8A020] opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-[#FDF3DC] flex items-center justify-center text-[#E8A020] mb-6">
                {item.icon}
              </div>

              <p className="text-xs font-bold text-[#E8A020] uppercase tracking-widest mb-2">
                {item.label}
              </p>
              <h3 className="font-bold text-[#1B2E4B] text-xl mb-3">{item.headline}</h3>
              <p className="text-[#6B7280] text-sm leading-relaxed mb-6">{item.description}</p>

              {/* Examples */}
              <ul className="space-y-1.5">
                {item.examples.map((ex) => (
                  <li key={ex} className="flex items-center gap-2 text-sm text-[#6B7280]">
                    <span className="w-4 h-4 rounded-full bg-[#F5F0E8] flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-[#E8A020]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    {ex}
                  </li>
                ))}
              </ul>

              {/* Arrow indicator */}
              <div className="absolute bottom-7 right-7 w-8 h-8 rounded-lg bg-[#F5F0E8] group-hover:bg-[#E8A020] flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-[#6B7280] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
