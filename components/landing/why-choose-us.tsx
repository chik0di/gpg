const TRUST_SIGNALS = [
  {
    headline: 'Expert Work, Every Time',
    description:
      "Your brief goes to someone who knows the subject. Not a generalist — a specialist who understands exactly what your assignment requires.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    headline: '3 Free Revisions',
    description:
      "If the work doesn't match your brief, we'll fix it — three times, free, no questions asked. We're not done until you're satisfied.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    headline: 'Money-Back Guarantee',
    description:
      "Still not right after all revisions? We'll refund you. Your money is protected — simple as that. No hoops to jump through.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    headline: 'We Take Deadlines Seriously',
    description:
      "Need it in 2 days? We'll deliver. Deadlines aren't suggestions here — they're commitments. Your work arrives on time, every time.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export default function WhyChooseUs() {
  return (
    <section className="py-20 md:py-28 bg-[#1B2E4B]">
      <div className="container-narrow">

        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-16">
          <p className="text-xs font-bold text-[#E8A020] uppercase tracking-widest mb-3">
            Why choose us
          </p>
          <h2 className="font-extrabold text-white text-3xl md:text-4xl leading-tight mb-4">
            Built around what stressed students actually need
          </h2>
          <p className="text-white/60 text-base leading-relaxed">
            No gimmicks. Just reliable, expert work with a clear guarantee behind it.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {TRUST_SIGNALS.map((item) => (
            <div
              key={item.headline}
              className="flex gap-5 bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 hover:border-[#E8A020]/30 transition-all duration-200"
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#E8A020]/10 border border-[#E8A020]/20 flex items-center justify-center text-[#E8A020]">
                {item.icon}
              </div>

              <div>
                <h3 className="font-bold text-white text-base mb-2">{item.headline}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
