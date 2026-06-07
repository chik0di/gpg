import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#FDFAF6] pt-20 pb-24 md:pt-28 md:pb-32">

      {/* Decorative warm blobs — CSS only, no images */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 w-[480px] h-[480px] rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, #E8A020 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 w-[560px] h-[560px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, #1B2E4B 0%, transparent 70%)',
        }}
      />

      <div className="container-narrow relative z-10">
        <div className="max-w-3xl mx-auto text-center">

          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 bg-[#FDF3DC] border border-[#E8A020]/30 text-[#C4861A] text-xs font-bold px-4 py-1.5 rounded-full mb-8 uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8A020] inline-block" />
            Expert academic support — model answers &amp; study materials
          </div>

          {/* Headline */}
          <h1 className="font-extrabold text-[#1B2E4B] leading-[1.1] mb-6"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)' }}>
            Expert Study Materials.{' '}
            <span className="relative inline-block">
              <span className="relative z-10">Delivered</span>
              <svg
                aria-hidden
                className="absolute -bottom-1 left-0 w-full"
                viewBox="0 0 200 8"
                fill="none"
                preserveAspectRatio="none"
              >
                <path d="M2 6 Q100 1 198 6" stroke="#E8A020" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            </span>
            {' '}Before Your Deadline.
          </h1>

          {/* Subheadline */}
          <p className="text-[#6B7280] text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            Model answers, presentations and technical work — crafted to your exact brief
            by subject experts. The reference you need to tackle your coursework with confidence.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/order"
              className="inline-flex items-center gap-2 bg-[#E8A020] hover:bg-[#C4861A] text-white font-bold text-base px-8 py-4 rounded-2xl transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-semibold text-[#1B2E4B] hover:text-[#E8A020] transition-colors underline underline-offset-4"
            >
              See how it works
            </Link>
          </div>

          {/* Social proof strip */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-[#6B7280]">
            {[
              { icon: '✓', text: '3 free revisions included' },
              { icon: '✓', text: 'Money-back guarantee' },
              { icon: '✓', text: 'Delivered before your deadline' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 font-medium">
                <span className="text-[#E8A020] font-bold">{icon}</span>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
