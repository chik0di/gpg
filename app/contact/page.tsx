'use client'

import { useState } from 'react'
import Navbar from '@/components/shared/navbar'
import Footer from '@/components/shared/footer'

type Status = 'idle' | 'sending' | 'success' | 'error'

export default function ContactPage() {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus]   = useState<Status>('idle')
  const [errMsg, setErrMsg]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrMsg('')

    try {
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, subject, message }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrMsg(data.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setErrMsg('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  const sending = status === 'sending'

  return (
    <>
      <Navbar />
      <main className="min-h-screen" style={{ background: '#F5F0E8' }}>
        {/* Header */}
        <section className="border-b border-[#E8E2D9]" style={{ background: '#FDFAF6' }}>
          <div className="container-narrow py-16 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#E8A020] mb-4">
              Get in touch
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1B2E4B] mb-4">
              Contact us
            </h1>
            <p className="text-[#6B7280] text-lg max-w-xl mx-auto leading-relaxed">
              Have a question or need help with your order? We typically respond within a few hours.
            </p>
          </div>
        </section>

        <section className="container-narrow py-16">
          <div className="grid md:grid-cols-5 gap-8 max-w-4xl mx-auto">

            {/* Contact channels */}
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-sm font-bold text-[#9CA3AF] uppercase tracking-widest mb-6">
                Reach us directly
              </h2>

              {/* Email */}
              <a
                href="mailto:admin@getprimegrade.com"
                className="flex items-start gap-4 p-5 bg-white border border-[#E8E2D9] rounded-2xl hover:border-[#E8A020] hover:shadow-sm transition-all group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: '#F5F0E8' }}
                >
                  <svg className="w-5 h-5 text-[#1B2E4B] group-hover:text-[#E8A020] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide mb-1">Email</p>
                  <p className="text-sm font-semibold text-[#1B2E4B] group-hover:text-[#E8A020] transition-colors break-all">
                    admin@getprimegrade.com
                  </p>
                </div>
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/447880213838"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 p-5 bg-white border border-[#E8E2D9] rounded-2xl hover:border-[#E8A020] hover:shadow-sm transition-all group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: '#F5F0E8' }}
                >
                  <svg className="w-5 h-5 text-[#1B2E4B] group-hover:text-[#E8A020] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide mb-1">WhatsApp</p>
                  <p className="text-sm font-semibold text-[#1B2E4B] group-hover:text-[#E8A020] transition-colors">
                    +44 7880 213838
                  </p>
                </div>
              </a>

              {/* Response time note */}
              <div
                className="rounded-2xl px-5 py-4 border border-[#E8E2D9]"
                style={{ background: '#FDFAF6' }}
              >
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-[#E8A020] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-[#6B7280] leading-relaxed">
                    We typically respond within a few hours during business hours (Mon–Sat, 9am–10pm GMT).
                  </p>
                </div>
              </div>
            </div>

            {/* Contact form */}
            <div className="md:col-span-3">
              <div
                className="bg-white rounded-3xl border border-[#E8E2D9] p-8"
                style={{ boxShadow: '0 8px 32px -4px rgba(26,26,46,0.08)' }}
              >
                {status === 'success' ? (
                  /* Success state */
                  <div className="flex flex-col items-center text-center py-6">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                      style={{ background: '#F0FDF4' }}
                    >
                      <svg className="w-7 h-7 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-[#1B2E4B] mb-2">Message sent!</h2>
                    <p className="text-sm text-[#6B7280] leading-relaxed max-w-xs">
                      Thanks for reaching out, {name.split(' ')[0]}. We&apos;ll get back to you at{' '}
                      <span className="font-semibold text-[#1B2E4B]">{email}</span> within a few hours.
                    </p>
                  </div>
                ) : (
                  /* Form */
                  <>
                    <h2 className="text-lg font-bold text-[#1B2E4B] mb-6">Send a message</h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-2">
                            Your name
                          </label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Jane Smith"
                            disabled={sending}
                            className="w-full border border-[#E8E2D9] rounded-xl px-4 py-3 text-sm text-[#1B2E4B] placeholder-[#C4BEB5] focus:outline-none focus:border-[#1B2E4B] transition-colors disabled:opacity-60"
                            style={{ background: '#FDFAF6' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-2">
                            Email address
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="jane@example.com"
                            disabled={sending}
                            className="w-full border border-[#E8E2D9] rounded-xl px-4 py-3 text-sm text-[#1B2E4B] placeholder-[#C4BEB5] focus:outline-none focus:border-[#1B2E4B] transition-colors disabled:opacity-60"
                            style={{ background: '#FDFAF6' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-2">
                          Subject
                        </label>
                        <input
                          type="text"
                          required
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="e.g. Question about my order"
                          disabled={sending}
                          className="w-full border border-[#E8E2D9] rounded-xl px-4 py-3 text-sm text-[#1B2E4B] placeholder-[#C4BEB5] focus:outline-none focus:border-[#1B2E4B] transition-colors disabled:opacity-60"
                          style={{ background: '#FDFAF6' }}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-2">
                          Message
                        </label>
                        <textarea
                          rows={5}
                          required
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Tell us how we can help…"
                          disabled={sending}
                          className="w-full border border-[#E8E2D9] rounded-xl px-4 py-3 text-sm text-[#1B2E4B] placeholder-[#C4BEB5] focus:outline-none focus:border-[#1B2E4B] transition-colors resize-none disabled:opacity-60"
                          style={{ background: '#FDFAF6' }}
                        />
                      </div>

                      {status === 'error' && (
                        <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200">
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {errMsg}
                        </div>
                      )}

                      <div
                        className="rounded-xl px-4 py-3 text-xs text-[#6B7280] flex items-start gap-2.5"
                        style={{ background: '#F5F0E8' }}
                      >
                        <svg className="w-3.5 h-3.5 text-[#9CA3AF] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        For order support, include your order reference so we can look it up faster.
                      </div>

                      <button
                        type="submit"
                        disabled={sending}
                        className="w-full flex items-center justify-center gap-2 bg-[#E8A020] hover:bg-[#C4861A] text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {sending ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Sending…
                          </>
                        ) : (
                          <>
                            Send message
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
