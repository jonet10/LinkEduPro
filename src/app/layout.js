import './globals.css';
import Link from 'next/link';
import Image from 'next/image';
import HeaderNav from '@/components/HeaderNav';
import ThemeInit from '@/components/ThemeInit';
import Footer from '@/components/Footer';

export const metadata = {
  metadataBase: new URL('https://linkedupro-2.onrender.com'),
  title: 'LinkEduPro - Éducation connectée',
  description: 'LinkEduPro est une plateforme éducative qui aide les élèves et les enseignants à apprendre, réviser et progresser ensemble.',
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
        <header className="border-b border-brand-100 bg-white/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-3 text-xl font-bold text-brand-700" aria-label="Accueil LinkEduPro">
              <Image src="/logo.png" alt="Logo LinkEduPro" width={42} height={42} priority />
              <span>LinkEduPro</span>
            </Link>
            <HeaderNav />
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
