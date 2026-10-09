import { createHash } from 'node:crypto'
import { calculateOrderQuote, checkoutOrderSchema, type OrderQuote } from './order-quote'

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => JSON.stringify(key) + ':' + canonical(v)).join(',') + '}'
  return JSON.stringify(value) ?? 'null'
}

export function checkoutDigest(orderData: unknown): string {
  return createHash('sha256').update(canonical(orderData)).digest('hex')
}

export function verifyPaidCheckout(pi: { amount: number; currency: string; created: number; metadata: Record<string, string> }, storedData: unknown, userId: string) {
  if (pi.metadata.userId !== userId || pi.currency !== 'gbp') throw new Error('Payment does not belong to this account or currency.')
  const parsed = checkoutOrderSchema.parse(storedData)
  let quote: OrderQuote
  if (pi.metadata.orderHash) {
    if (checkoutDigest(storedData) !== pi.metadata.orderHash) throw new Error('Checkout details do not match the accepted quote.')
    quote = (storedData as { checkoutQuote: OrderQuote }).checkoutQuote
    if (!quote || quote.version !== 1 || quote.finalPence.length !== parsed.deliverables.length) throw new Error('Missing accepted quote.')
  } else {
    // Older payments were created before immutable quote snapshots. Price them at payment creation, not fulfilment.
    quote = calculateOrderQuote(parsed, pi.created * 1000)
  }
  if (quote.totalPence !== pi.amount) throw new Error('Payment amount does not match the accepted quote.')
  return { orderData: parsed, quote }
}
