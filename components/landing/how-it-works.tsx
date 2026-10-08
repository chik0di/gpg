const STEPS = [
  {
    number: '01',
    title: 'Place your order',
    description:
      'Choose your subject, academic level and deadline. Tell us exactly what you need (takes under 3 minutes).',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'We get to work',
    description:
      'A subject expert crafts your model answer or study material, built specifically around your brief and academic level.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Download your work',
    description:
      'Your model answer lands in your dashboard before the deadline. Download, study it and tackle your assessment with confidence.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-12 sm:py-16 lg:py-20 bg-[#F5F0E8]">
      <div className="container-narrow">

        {/* Header */}
        <div className="max-w-2xl mb-8 sm:mb-10">
          <p className="section-eyebrow mb-3">
            Simple process
          </p>
          <h2 className="page-heading text-[#1B2E4B] text-3xl md:text-4xl leading-tight mb-4">
            From order to download in three steps
          </h2>
          <p className="text-[#6B7280] text-base leading-relaxed">
            No back-and-forth, no confusion. Tell us what you need and we handle the rest.
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">

          {STEPS.map((step) => (
            <div key={step.number} className="border-t border-[#D9D2C8] pt-6">
              {/* Icon circle */}
              <div className="w-10 h-10 flex items-center text-[#1B2E4B] mb-3">
                {step.icon}
              </div>

              {/* Step number */}
              <span className="section-eyebrow block mb-2">
                Step {step.number}
              </span>

              <h3 className="font-semibold text-[#1B2E4B] text-xl mb-3">{step.title}</h3>
              <p className="text-[#6B7280] text-sm leading-relaxed max-w-sm">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
