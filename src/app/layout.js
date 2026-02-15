import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'LinkEduPro - Education connectee',
  description: 'Plateforme SaaS educative de revision'
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <header className="border-b border-brand-100 bg-white/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-bold text-brand-700">LinkEduPro</Link>
            <div className="flex gap-3 text-sm">
              <Link href="/subjects" className="hover:text-brand-700">Matieres</Link>
              <Link href="/progress" className="hover:text-brand-700">Progres</Link>
              <Link href="/login" className="hover:text-brand-700">Connexion</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
