const FEATURES = [
  { icon: '🎓', title: 'Subject-specialist writers', description: 'Every writer holds a degree in their subject area and has proven expertise in academic work. No exceptions.' },
  { icon: '⏰', title: 'Deadline guaranteed', description: 'We\'ve never missed a deadline. Your work arrives on time, every time.' },
  { icon: '🔒', title: '100% confidential', description: 'Your identity and order details are never shared with third parties.' },
  { icon: '♻️', title: 'Free revisions', description: 'Unlimited revisions within 14 days if the work doesn\'t match your brief.' },
  { icon: '📋', title: 'Plagiarism-free', description: 'Every piece is written from scratch and includes a free plagiarism report.' },
  { icon: '💬', title: '24/7 support', description: 'Our support team is available around the clock via live chat and email.' },
]

export default function Features() {
  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Why students choose us</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <span className="text-3xl mb-4 block">{feature.icon}</span>
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
