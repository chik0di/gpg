import Link from 'next/link'

const FOOTER_LINKS = {
  Services: [
    { href: '/order', label: 'Place an Order' },
    { href: '/#what-we-offer', label: 'Written Work' },
    { href: '/#what-we-offer', label: 'Presentations' },
    { href: '/#what-we-offer', label: 'Practical & Technical' },
  ],
  Company: [
    { href: '/#how-it-works', label: 'How it works' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact' },
    { href: '/terms', label: 'Terms & Conditions' },
    { href: '/privacy', label: 'Privacy Policy' },
  ],
  Account: [
    { href: '/login', label: 'Sign in' },
    { href: '/register', label: 'Create account' },
    { href: '/dashboard', label: 'My orders' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-[#1A1A2E] text-white/60">
      <div className="container-narrow pt-16 pb-10">

        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                style={{ background: '#E8A020' }}
              >
                G
              </span>
              <span className="font-extrabold text-white text-lg tracking-tight">GetPrimeGrade</span>
            </Link>
            <p className="text-sm leading-relaxed mb-6">
              Expert model answers and study materials for university and college students worldwide.
            </p>

            {/* Contact */}
            <div className="space-y-2 text-sm">
              <a
                href="mailto:admin@getprimegrade.com"
                className="flex items-center gap-2 hover:text-[#E8A020] transition-colors"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                admin@getprimegrade.com
              </a>
              <a
                href="https://wa.me/447880213838"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-[#E8A020] transition-colors"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                +44 7880 213838
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <p className="text-white font-bold text-sm mb-4">{heading}</p>
              <ul className="space-y-2.5">
                {links.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm hover:text-[#E8A020] transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>
            &copy; {new Date().getFullYear()} GetPrimeGrade. All rights reserved. Registered in England & Wales.
          </p>
          <p className="text-center sm:text-right max-w-sm">
            All content provided is for educational reference purposes only. GetPrimeGrade does not condone academic misconduct.
          </p>
        </div>
      </div>
    </footer>
  )
}
