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
          className="ui-card px-4 sm:px-5 py-5"
        >
          <p className="text-sm text-[#64748B] mb-2">{label}</p>
          <p className="text-3xl font-semibold tabular-nums text-[#1B2E4B]">{value}</p>
        </div>
      ))}
    </div>
  )
}
