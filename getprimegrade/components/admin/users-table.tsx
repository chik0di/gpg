interface User {
  id: string
  email: string
  full_name?: string | null
  role: string
  created_at: string
}

export default function UsersTable({ users }: { users: User[] }) {
  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
        No users yet.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-900">{user.full_name ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{user.email}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(user.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
