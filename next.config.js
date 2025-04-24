module.exports = {
  reactStrictMode: true,

  // For image optimization (Cloudinary)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Webpack polyfills (for Node.js modules in the browser)
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      // Polyfills for browser compatibility
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      // Disable server-only modules in the browser
      fs: false, // Filesystem (not needed client-side)
      net: false, // Networking (server-only)
      tls: false, // TLS (server-only)
    };
    return config;
  },

  // Optional: Increase timeout for Serverless Functions (Pro plan)
  // (Hobby plan max is 10s, Pro plan allows up to 300s)
  serverRuntimeConfig: {
    apiTimeout: 60, // 60 seconds (Pro plan only)
  },
};
