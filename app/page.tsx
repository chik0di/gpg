import Navbar from '@/components/shared/navbar'
import Footer from '@/components/shared/footer'
import Hero from '@/components/landing/hero'
import HowItWorks from '@/components/landing/how-it-works'
import WhatWeOffer from '@/components/landing/what-we-offer'
import WhyChooseUs from '@/components/landing/why-choose-us'
import FAQPreview from '@/components/landing/faq-preview'

export default function LandingPage() {
  return (
    <>
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
