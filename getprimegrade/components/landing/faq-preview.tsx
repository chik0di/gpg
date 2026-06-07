'use client'

import Link from 'next/link'
import { useState } from 'react'

const FAQS = [
  {
    q: 'Is using a model answer service allowed?',
    a: "Yes. We provide educational reference material — model answers and study materials — in the same way a tutor, study guide or past paper does. How you use the material to guide and inform your own work is up to you. We never submit work on your behalf.",
  },
  {
    q: "Will my work be original?",
    a: "Every piece is written from scratch to your specific brief. We don't recycle or reuse outputs. Your model answer is written for your subject, your brief and your academic level — no one else gets the same work.",
  },
  {
    q: "What if I'm not happy with what I receive?",
    a: "Every order includes 3 free revisions. If the work doesn't match your brief after all three, we'll issue a full refund — no arguments, no hoops. Our guarantee is written into our Terms & Conditions.",
  },
]

export default function FAQPreview() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="py-20 md:py-28 bg-[#F5F0E8]">
      <div className="container-narrow">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">

          {/* Left — heading */}
          <div className="lg:col-span-2">
            <p className="text-xs font-bold text-[#E8A020] uppercase tracking-widest mb-3">
              FAQ
            </p>
            <h2 className="font-extrabold text-[#1B2E4B] text-3xl md:text-4xl leading-tight mb-6">
              Common questions, straight answers
            </h2>
            <p className="text-[#6B7280] text-base leading-relaxed mb-8">
              Still not sure? Browse the full FAQ or drop us a message.
            </p>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
              <Link
                href="/faq"
                className="inline-flex items-center gap-2 border-2 border-[#1B2E4B] text-[#1B2E4B] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#1B2E4B] hover:text-white transition-colors"
              >
                See all FAQs
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 text-[#1B2E4B] font-semibold text-sm px-5 py-2.5 rounded-xl hover:text-[#E8A020] transition-colors"
              >
                Contact us →
              </Link>
            </div>
          </div>

          {/* Right — accordion */}
          <div className="lg:col-span-3 space-y-3">
            {FAQS.map((item, i) => {
              const isOpen = open === i
              return (
                <div
                  key={i}
                  className={`bg-white border rounded-2xl overflow-hidden transition-all duration-200 ${
                    isOpen ? 'border-[#E8A020]/50 shadow-[0_4px_16px_-2px_rgba(232,160,32,0.12)]' : 'border-[#E8E2D9]'
                  }`}
                >
                  <button
                    className="w-full flex items-center justify-between text-left gap-4 px-6 py-5"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-[#1B2E4B] text-base leading-snug">
                      {item.q}
                    </span>
                    <span
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                        isOpen ? 'bg-[#E8A020] text-white' : 'bg-[#F5F0E8] text-[#6B7280]'
                      }`}
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-5">
                      <div className="h-px bg-[#E8E2D9] mb-4" />
                      <p className="text-[#6B7280] text-sm leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
