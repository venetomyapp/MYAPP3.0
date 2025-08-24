/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Mantieni compatibilità con la struttura esistente
  experimental: {
    appDir: false, // Usa pages router per compatibilità
  },

  // Configurazione per Vercel
  trailingSlash: false,
  
  // Ottimizzazioni per le immagini
  images: {
    domains: ['localhost'],
    unoptimized: true, // Per compatibilità con documenti caricati
  },

  // Configurazioni API per SIM Carabinieri
  api: {
    bodyParser: {
      sizeLimit: '15mb', // Aumenta limite per documenti identità
    },
    responseLimit: '15mb', // Limite per PDF con allegati
    externalResolver: true, // Per multiparty
  },

  // Headers di sicurezza
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // In produzione, specifica il tuo dominio
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },

  // Rewrite per mantenere compatibilità con rotte esistenti
  async rewrites() {
    return [
      // Mantieni le tue rotte statiche esistenti
      {
        source: '/dashboard',
        destination: '/dashboard.html',
      },
      {
        source: '/login',
        destination: '/login.html',
      },
      // Aggiungi altre rotte esistenti se necessario
    ]
  },

  // Webpack config per compatibilità PDF
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Configurazione per pdf-lib e multiparty su Vercel
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }

    return config
  },

  // Variabili di ambiente pubbliche
  env: {
    NEXT_PUBLIC_APP_VERSION: '4.1.0',
    NEXT_PUBLIC_APP_NAME: 'MyApp',
  },
}

module.exports = nextConfig
