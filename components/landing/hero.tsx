import Link from 'next/link'

export default function Hero() {
  return (
    <section className="bg-[#FDFAF6] border-b border-[#E8E2D9] py-14 sm:py-20 lg:py-24">
      <div className="container-narrow">
        <div className="max-w-3xl">
          <p className="section-eyebrow mb-5">Academic support, built around your brief</p>
          <h1 className="page-heading text-[#1B2E4B] text-4xl sm:text-5xl lg:text-6xl mb-6">
            Everything you need to tackle your coursework.
          </h1>
          <p className="text-[#475569] text-base sm:text-lg leading-relaxed mb-8 max-w-2xl">
            Custom model answers, presentations and technical work, crafted to your exact brief by subject experts — plus free research and citation tools to support your studies.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/order" className="ui-button-primary min-h-12 px-7">Get started
              <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M18 12H6" /></svg>
            </Link>
            <Link href="#how-it-works" className="ui-button-secondary min-h-12">How it works</Link>
          </div>
        </div>
        <ul className="mt-10 pt-6 border-t border-[#E8E2D9] flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#475569]">
          {['3 free revisions included', 'Free research & citation tools', 'Delivered before your deadline'].map(text => (
            <li key={text} className="flex items-center gap-2"><svg aria-hidden="true" className="w-4 h-4 text-[#926314] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" /></svg>{text}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
