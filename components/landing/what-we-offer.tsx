import Link from 'next/link'

const OFFERINGS = [
  {
    label: 'Custom service',
    headline: 'Custom model answers',
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
    label: 'Free tool',
    headline: 'Research material finder',
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
    label: 'Free tool',
    headline: 'Reference generator',
    description:
      'Generate correctly formatted citations in APA, Harvard, Vancouver, MLA and Chicago styles. Free.',
    examples: ['5 citation styles', 'Books, websites, journals', 'Bibliography builder', 'Word bibliography export'],
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
    <section id="what-we-offer" className="py-12 sm:py-16 lg:py-20 bg-[#FDFAF6]">
      <div className="container-narrow">

        {/* Header */}
        <div className="max-w-2xl mb-8 sm:mb-10">
          <p className="section-eyebrow mb-3">
            What we offer
          </p>
          <h2 className="page-heading text-[#1B2E4B] text-3xl md:text-4xl leading-tight mb-4">
            Tools to help you succeed
          </h2>
          <p className="text-[#6B7280] text-base leading-relaxed">
            A complete academic support ecosystem — custom work, free research tools, and citation help, all in one place.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {OFFERINGS.map((item) => (
            <Link
              key={item.headline}
              href={item.href}
              className="group ui-card p-6 hover:border-[#94A3B8] transition-colors flex flex-col"
            >
              {/* Icon */}
              <div className="w-10 h-10 flex items-center text-[#1B2E4B] mb-4">
                {item.icon}
              </div>

              <p className="section-eyebrow mb-2">
                {item.label}
              </p>
              <h3 className="font-semibold text-[#1B2E4B] text-xl mb-3">{item.headline}</h3>
              <p className="text-[#6B7280] text-sm leading-relaxed mb-6">{item.description}</p>

              {/* Examples */}
              <ul className="space-y-1.5">
                {item.examples.map((ex) => (
                  <li key={ex} className="flex items-center gap-2 text-sm text-[#6B7280]">
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-[#64748B]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    {ex}
                  </li>
                ))}
              </ul>

              <span className="mt-auto pt-5 text-sm font-semibold text-[#1B2E4B] inline-flex items-center gap-2">
                {item.href === '/order' ? 'Start an order' : 'Open tool'} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
