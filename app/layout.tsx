import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Premier Padel — Entrá a la pista',
  description:
    'Pádel 3D en español: dobles, paredes, golpes y torneos. Jugá tu próximo punto.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
