import type { Metadata } from 'next'
import Navbar from '@/components/shared/navbar'
import Footer from '@/components/shared/footer'
import ReferenceGeneratorClient from './client'

export const metadata: Metadata = {
  title: 'Free Reference Generator — APA, Harvard, Vancouver, MLA, Chicago — GetPrimeGrade',
  description: 'Generate perfectly formatted citations in APA, Harvard, Vancouver, MLA and Chicago styles. Free reference generator, no account required.',
  keywords: ['reference generator', 'citation generator', 'APA citation', 'Harvard referencing', 'Vancouver style', 'MLA format', 'Chicago style', 'bibliography generator', 'free citation tool'],
  openGraph: {
    title: 'Free Reference Generator — GetPrimeGrade',
    description: 'Generate perfectly formatted citations in APA, Harvard, Vancouver, MLA and Chicago styles.',
    url: 'https://getprimegrade.com/resources/reference-generator',
    siteName: 'GetPrimeGrade',
    locale: 'en_GB',
    type: 'website',
  },
}

export default function ReferenceGeneratorPage() {
  return (
    <>
      <Navbar />
      <ReferenceGeneratorClient />
      <Footer />
    </>
  )
}
