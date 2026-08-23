const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3000' },
      // Fotografia de referência para o hero/marketing enquanto não há
      // fotografia própria de produto — ver apps/web/src/lib/fotosMarketing.ts.
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
}

export default nextConfig
