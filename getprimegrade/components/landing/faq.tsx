'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'Is this service confidential?',
    a: 'Yes, completely. Your personal details and order information are never shared with anyone outside our team. We use industry-standard encryption for all data.',
  },
  {
    q: 'How do I know the work will be original?',
    a: 'Every piece is written from scratch to your brief. We include a free Turnitin plagiarism report with every order so you can verify this yourself.',
  },
  {
    q: 'What if I\'m not happy with the work?',
    a: 'We offer unlimited free revisions within 14 days of delivery. If the work fundamentally doesn\'t match your brief, we\'ll offer a full refund.',
  },
  {
    q: 'What subjects do you cover?',
    a: 'We cover all university subjects including Law, Business, Medicine, Engineering, Psychology, History, Literature, and more. Just select your subject when placing your order.',
  },
  {
    q: 'How is the price calculated?',
    a: 'Price = word count × rate per 100 words. The rate depends on your deadline tier (Standard, Express, or Urgent). You\'ll see the exact price before paying.',
  },
  {
    q: 'Can I communicate with my writer?',
    a: 'Yes. Once your order is accepted you can message your writer directly through your dashboard to share additional materials or clarify the brief.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20 px-4 bg-white">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Frequently asked questions</h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                className="w-full text-left px-6 py-4 flex items-center justify-between font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                {item.q}
                <svg
                  className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                  <div className="pt-4">{item.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
