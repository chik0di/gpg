import type { Metadata } from 'next'
import Navbar from '@/components/shared/navbar'
import Footer from '@/components/shared/footer'
import ResearchFinderClient from './client'

export const metadata: Metadata = {
  title: 'Free Research Material Finder — GetPrimeGrade',
  description: 'Find relevant academic papers and sources instantly. Free research tool with no account required.',
  keywords: ['research finder', 'academic papers', 'research materials', 'literature search', 'academic sources', 'paper finder', 'free research tool'],
  openGraph: {
    title: 'Free Research Material Finder — GetPrimeGrade',
    description: 'Find relevant academic papers and sources instantly. Free research tool with no account required.',
    url: 'https://getprimegrade.com/resources/research-finder',
    siteName: 'GetPrimeGrade',
    locale: 'en_GB',
    type: 'website',
  },
}

export default function ResearchFinderPage() {
  return (
    <>
      <Navbar />
      <ResearchFinderClient />
      <Footer />
    </>
  )
}
