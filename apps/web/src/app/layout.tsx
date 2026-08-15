export const metadata = {
  title: 'Animora',
  description: 'Produtos e cuidados para cães, gatos, pássaros e animais de estimação.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  )
}
