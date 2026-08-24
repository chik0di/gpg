import type { Metadata } from 'next'
import Navbar from '@/components/shared/navbar'
import Footer from '@/components/shared/footer'
import Hero from '@/components/landing/hero'
import HowItWorks from '@/components/landing/how-it-works'
import WhatWeOffer from '@/components/landing/what-we-offer'
import WhyChooseUs from '@/components/landing/why-choose-us'
import FAQPreview from '@/components/landing/faq-preview'
import { OrganizationStructuredData, ServiceStructuredData } from '@/components/seo/structured-data'

export const metadata: Metadata = {
  title: 'GetPrimeGrade: Expert Model Answers & Study Materials for Students',
  description:
    'Get custom model answers and study materials crafted by experts to your exact brief. Guaranteed delivery before your deadline. Trusted by UK university and college students.',
  keywords: [
    'model answers UK',
    'custom assignment help',
    'academic study materials',
    'assignment writing service',
    'essay help online',
    'university coursework help',
  ],
  alternates: {
    canonical: 'https://getprimegrade.com',
  },
  openGraph: {
    url: 'https://getprimegrade.com',
  },
}

export default function LandingPage() {
  return (
    <>
      <OrganizationStructuredData />
      <ServiceStructuredData />
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <WhatWeOffer />
        <WhyChooseUs />
        <FAQPreview />
      </main>
      <Footer />
    </>
  )
}
