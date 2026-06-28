import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GetPrimeGrade — Expert Model Answers & Study Materials'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#FDFAF6',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '16px',
              background: '#1B2E4B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              fontWeight: 700,
              color: 'white',
            }}
          >
            G
          </div>
          <div
            style={{
              fontSize: '56px',
              fontWeight: 800,
              color: '#1B2E4B',
              letterSpacing: '-0.02em',
            }}
          >
            GetPrimeGrade
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '36px',
            fontWeight: 600,
            color: '#6B7280',
            textAlign: 'center',
            maxWidth: '900px',
            lineHeight: 1.4,
          }}
        >
          Expert Model Answers & Study Materials
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: '24px',
            color: '#9CA3AF',
            marginTop: '20px',
            textAlign: 'center',
          }}
        >
          Crafted to your brief — delivered before your deadline
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
