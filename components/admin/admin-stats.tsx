interface AdminStatsProps {
  totalOrders: number
  totalUsers: number
}

export default function AdminStats({ totalOrders, totalUsers }: AdminStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { label: 'Total orders', value: totalOrders },
        { label: 'Registered users', value: totalUsers },
        { label: 'Revenue (month)', value: '—' },
      ].map(({ label, value }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
      ))}
    </div>
  )
}
