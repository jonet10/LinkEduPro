import './globals.css';
import Link from 'next/link';
import Image from 'next/image';
import HeaderNav from '@/components/HeaderNav';
import ThemeInit from '@/components/ThemeInit';
import Footer from '@/components/Footer';
import SplashScreenGate from '@/components/SplashScreenGate';

export const metadata = {
  metadataBase: new URL('https://linkedupro-2.onrender.com'),
  title: 'LinkEduPro - Éducation connectée',
  description: 'LinkEduPro est une plateforme éducative qui aide les élèves et les enseignants à apprendre, réviser et progresser ensemble.',
  icons: {
    icon: '/icone.png',
    shortcut: '/icone.png',
    apple: '/icone.png'
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://linkedupro-2.onrender.com/',
    siteName: 'LinkEduPro',
    title: 'LinkEduPro - Éducation connectée',
    description: 'LinkEduPro est une plateforme éducative qui aide les élèves et les enseignants à apprendre, réviser et progresser ensemble.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Logo LinkEduPro'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LinkEduPro - Éducation connectée',
    description: 'LinkEduPro est une plateforme éducative qui aide les élèves et les enseignants à apprendre, réviser et progresser ensemble.',
    images: ['/logo.png']
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col">
        <ThemeInit />
        <SplashScreenGate />
        <header className="sticky top-0 z-[120] border-b border-brand-100 bg-white/85 shadow-sm backdrop-blur">
          <nav className="relative mx-auto flex w-full max-w-[1320px] items-center gap-4 px-4 py-3 md:px-6">
            <Link href="/" className="flex shrink-0 items-center gap-2 text-xl font-bold text-brand-800" aria-label="Accueil LinkEduPro">
              <Image src="/logo.png" alt="Logo LinkEduPro" width={40} height={40} priority />
              <span className="hidden lg:inline">LinkEduPro</span>
            </Link>
            <HeaderNav />
          </nav>
        </header>
        <main className="relative z-0 mx-auto w-full max-w-6xl flex-1 px-6 py-8 pb-28 md:pb-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
