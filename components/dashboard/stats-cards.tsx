interface Order {
  status: string
  total_amount: number
}

export default function StatsCards({ orders }: { orders: Order[] }) {
  const total     = orders.length
  const active    = orders.filter((o) => ['pending', 'in_progress'].includes(o.status)).length
  const completed = orders.filter((o) => o.status === 'completed').length
  const spent     = orders
    .filter((o) => o.status !== 'pending')
    .reduce((s, o) => s + o.total_amount, 0)

  const stats = [
    { label: 'Total orders', value: String(total) },
    { label: 'Active', value: String(active) },
    { label: 'Completed', value: String(completed) },
    { label: 'Total spent', value: `£${spent % 1 === 0 ? spent : spent.toFixed(2)}` },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value }) => (
        <div
          key={label}
          className="bg-white rounded-2xl border border-[#E8E2D9] px-5 py-5"
          style={{ boxShadow: '0 1px 4px rgba(26,26,46,0.05)' }}
        >
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">{label}</p>
          <p className="text-2xl font-extrabold text-[#1B2E4B]">{value}</p>
        </div>
      ))}
    </div>
  )
}
