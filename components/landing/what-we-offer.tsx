const OFFERINGS = [
  {
    label: 'Written Work',
    headline: 'Essays, Reports & Coursework',
    description:
      'Clear, well-argued model answers for essays, literature reviews, reports, case studies and more, structured to your academic level and marking criteria.',
    examples: ['Essays', 'Reports', 'Literature reviews', 'Case studies', 'Dissertations'],
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    label: 'Presentations',
    headline: 'Slide Decks & Speaker Notes',
    description:
      'Professionally structured presentations with clear speaker notes: the reference you need for your upcoming seminar, pitch or graded presentation.',
    examples: ['PowerPoint / Google Slides', 'Speaker notes included', 'Up to 30+ slides'],
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    label: 'Practical & Technical',
    headline: 'Code, Data & Technical Work',
    description:
      'Real, working technical outputs (from Python scripts to network diagrams) that you can study, understand and use as a model for your own submission.',
    examples: ['Python / Web dev', 'Network simulations', 'Data analysis', 'Security assessments', 'Power BI / Tableau'],
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
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
            Three types of study material
          </h2>
          <p className="text-[#6B7280] text-base leading-relaxed">
            All produced by subject specialists, built around your brief.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {OFFERINGS.map((item, i) => (
            <div
              key={item.label}
              className="group relative bg-white border border-[#E8E2D9] rounded-3xl p-7 hover:border-[#E8A020]/50 hover:shadow-[0_12px_40px_-4px_rgba(26,26,46,0.12)] transition-all duration-300"
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
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
