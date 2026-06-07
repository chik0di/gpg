import type { Metadata } from 'next'
import Navbar from '@/components/shared/navbar'
import OrderForm from '@/components/order/order-form'

export const metadata: Metadata = { title: 'Place an Order' }

export default function OrderPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen py-12 px-4" style={{ background: '#F5F0E8' }}>
        <div className="max-w-[680px] mx-auto">

          {/* Page header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-[#1B2E4B] mb-2">
              Place your order
            </h1>
            <p className="text-[#6B7280] text-base">
              Fill in the details below. Takes about 3 minutes.
            </p>
          </div>

          <OrderForm />

          {/* Reassurance strip */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#9CA3AF]">
            {[
              '3 free revisions',
              'Money-back guarantee',
              'Secure payment via Stripe',
              'Delivered before your deadline',
            ].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="text-[#E8A020]">✓</span>
                {t}
              </span>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
