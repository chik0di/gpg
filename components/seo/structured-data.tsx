interface OrganizationSchema {
  '@context': string
  '@type': 'Organization'
  name: string
  description: string
  url: string
  logo: string
  contactPoint: {
    '@type': 'ContactPoint'
    contactType: string
    availableLanguage: string
  }
  areaServed: string
  sameAs: string[]
}

interface ServiceSchema {
  '@context': string
  '@type': 'Service'
  serviceType: string
  provider: {
    '@type': 'Organization'
    name: string
    url: string
  }
  areaServed: {
    '@type': 'Country'
    name: string
  }
  hasOfferCatalog: {
    '@type': 'OfferCatalog'
    name: string
    itemListElement: Array<{
      '@type': 'Offer'
      itemOffered: {
        '@type': 'Service'
        name: string
        description: string
      }
    }>
  }
}

export function OrganizationStructuredData() {
  const schema: OrganizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'GetPrimeGrade',
    description:
      'Expert model answers and study materials crafted to your brief — delivered before your deadline. Trusted by university and college students worldwide.',
    url: 'https://getprimegrade.com',
    logo: 'https://getprimegrade.com/android-chrome-512x512.png',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      availableLanguage: 'English',
    },
    areaServed: 'United Kingdom',
    sameAs: [],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function ServiceStructuredData() {
  const schema: ServiceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Academic Support Services',
    provider: {
      '@type': 'Organization',
      name: 'GetPrimeGrade',
      url: 'https://getprimegrade.com',
    },
    areaServed: {
      '@type': 'Country',
      name: 'United Kingdom',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Academic Study Materials',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Model Answers',
            description:
              'Custom model answers crafted to your assignment brief by expert writers',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Study Materials',
            description:
              'Comprehensive study materials and academic reference documents',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Assignment Reference',
            description:
              'High-quality assignment references to guide your academic work',
          },
        },
      ],
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
