'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * This component handles saving pending orders to the database after OAuth redirects.
 * For Google OAuth, we don't have the user's email until after they authenticate,
 * so we save the pending order once we land back in the app.
 *
 * Mount this on any page where users might land after OAuth (e.g., dashboard, checkout).
 */
export default function PendingOrderSaver() {
  const router = useRouter()

  useEffect(() => {
    async function savePendingOrderAfterAuth() {
      // Check if we have pending order data in sessionStorage
      const orderDataRaw = sessionStorage.getItem('gpg_pending_order')
      const fileDataRaw = sessionStorage.getItem('gpg_pending_file')

      if (!orderDataRaw) {
        // No pending order to save
        return
      }

      // Check if there's already a 'pending' parameter in the URL
      // If so, the order was already saved (email signup path)
      const params = new URLSearchParams(window.location.search)
      if (params.has('pending')) {
        console.log('[pending-order-saver] Pending order already saved, ID:', params.get('pending'))
        return
      }

      try {
        const orderData = JSON.parse(orderDataRaw)
        let fileData: string | null = null

        if (fileDataRaw) {
          const fileParsed = JSON.parse(fileDataRaw)
          fileData = fileParsed.data // Base64 string
        }

        // Get current user email
        const res = await fetch('/api/auth/user')
        if (!res.ok) {
          console.log('[pending-order-saver] User not authenticated yet')
          return
        }

        const { user } = await res.json()
        if (!user?.email) {
          console.log('[pending-order-saver] No user email available')
          return
        }

        console.log('[pending-order-saver] Saving pending order to database for:', user.email)

        const saveRes = await fetch('/api/pending-orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            orderData,
            fileData,
          }),
        })

        if (!saveRes.ok) {
          console.error('[pending-order-saver] Failed to save pending order:', await saveRes.text())
          return
        }

        const { pendingOrderId } = await saveRes.json()
        console.log('[pending-order-saver] Saved pending order:', pendingOrderId)

        // If we're on a page that would benefit from the pending order ID,
        // add it to the URL
        if (window.location.pathname === '/checkout' || window.location.pathname === '/dashboard') {
          const url = new URL(window.location.href)
          url.searchParams.set('pending', pendingOrderId)
          router.replace(url.pathname + url.search)
        }
      } catch (err) {
        console.error('[pending-order-saver] Error saving pending order:', err)
      }
    }

    savePendingOrderAfterAuth()
  }, [router])

  return null // This component doesn't render anything
}
