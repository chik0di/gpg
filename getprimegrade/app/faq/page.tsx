'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/shared/navbar'
import Footer from '@/components/shared/footer'

const FAQS = [
  {
    q: 'What types of work do you cover?',
    a: 'We specialise in tech, computing, and business subjects. Orders can include up to six deliverables per submission, spanning written assignments, presentations, and practical or technical work — all tailored to your brief.',
  },
  {
    q: 'How does pricing work?',
    a: "Prices are based on the type of deliverable, its size, your academic level, and your deadline. You'll see a full itemised breakdown — including any level adjustment or urgency premium — in your order summary before you pay anything.",
  },
  {
    q: 'How do I receive the completed work?',
    a: "Once your work is ready, you'll receive an email notification. You can then download it directly from your dashboard at any time.",
  },
  {
    q: 'How many revisions do I get?',
    a: "Every order includes three free revisions. If the delivered work doesn't fully match your brief, simply request a revision through your dashboard and we'll address it promptly.",
  },
  {
    q: 'What is your refund policy?',
    a: "If the work doesn't meet the requirements in your original brief and all three revisions have been exhausted, you're entitled to a money-back refund. Refund requests must be submitted within 48 hours of delivery.",
  },
  {
    q: 'How long does delivery take?',
    a: 'Our minimum turnaround is two days from the time your order is confirmed. Tighter deadlines are possible with an urgency premium, which is clearly shown in your order summary so there are no surprises.',
  },
  {
    q: 'Is my information kept private?',
    a: 'Absolutely. Your personal details and order information are never shared with third parties. All payments are processed securely through Stripe — we never store your card details.',
  },
  {
    q: 'What file formats are accepted for briefs?',
    a: 'You can upload your assignment brief or supporting documents in PDF, Word (.docx), PowerPoint, Excel, or ZIP format. The maximum file size is 50 MB.',
  },
]

function AccordionItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-[#E8E2D9] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left transition-colors"
        style={{ background: open ? '#FDF8F0' : '#FFFFFF' }}
        aria-expanded={open}
      >
        <div className="flex items-center gap-4">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white shrink-0"
            style={{ background: '#1B2E4B' }}
          >
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-[#1B2E4B]">{q}</span>
        </div>
        <svg
          className="w-4 h-4 shrink-0 text-[#9CA3AF] transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-6 pb-5 pt-1 border-t border-[#E8E2D9]" style={{ background: '#FDF8F0' }}>
          <p className="text-sm text-[#6B7280] leading-relaxed pl-11">{a}</p>
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen" style={{ background: '#F5F0E8' }}>
        {/* Header */}
        <section className="border-b border-[#E8E2D9]" style={{ background: '#FDFAF6' }}>
          <div className="container-narrow py-16 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#E8A020] mb-4">
              Support
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1B2E4B] mb-4">
              Frequently asked questions
            </h1>
            <p className="text-[#6B7280] text-lg max-w-xl mx-auto leading-relaxed">
              Everything you need to know about placing an order, pricing, and how we work.
            </p>
          </div>
        </section>

        {/* FAQ list */}
        <section className="container-narrow py-16">
          <div className="max-w-2xl mx-auto space-y-3">
            {FAQS.map((item, i) => (
              <AccordionItem key={i} index={i} q={item.q} a={item.a} />
            ))}
          </div>

          {/* Still have questions CTA */}
          <div
            className="max-w-2xl mx-auto mt-12 rounded-3xl border border-[#E8E2D9] p-8 text-center"
            style={{ background: '#FFFFFF' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#FDF3DC' }}
            >
              <svg className="w-6 h-6 text-[#E8A020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[#1B2E4B] mb-2">Still have questions?</h2>
            <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
              Our team typically responds within a few hours. Reach out and we&apos;ll be happy to help.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-[#1B2E4B] hover:bg-[#16253d] text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors"
              >
                Contact us
              </Link>
              <Link
                href="/order"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#E8A020] hover:text-[#C4861A] transition-colors"
              >
                Place an order
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
