const TESTIMONIALS = [
  {
    quote:
      'My dissertation came back perfectly structured and well-argued. My supervisor was impressed. Delivered 2 days early too!',
    name: 'Sophie T.',
    university: 'University of Manchester',
    grade: '2:1',
  },
  {
    quote:
      'I was drowning in deadlines. GetPrimeGrade sorted my law essay overnight and I got a first. Absolute lifesaver.',
    name: 'James K.',
    university: 'University of Leeds',
    grade: 'First',
  },
  {
    quote:
      'The writer actually understood the brief properly, not like other services I\'ve tried. Communication was seamless.',
    name: 'Priya M.',
    university: 'King\'s College London',
    grade: '2:1',
  },
]

export default function Testimonials() {
  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">What students say</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="text-sm text-gray-700 leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.university}</p>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {t.grade}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
