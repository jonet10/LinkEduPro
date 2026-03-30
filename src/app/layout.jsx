import './globals.css';

export const metadata = {
  title: 'LinkEduPro – Classe Numerique',
  description: 'Catalogue de cours en ligne LinkEduPro'
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <div className="app-shell">
          {children}
        </div>
      </body>
    </html>
  );
}
