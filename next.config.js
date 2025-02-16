module.exports = {
  reactStrictMode: true,
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
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      fs: false, // <--- Tells Webpack "fs" is not needed in the browser
      net: false,
      // If other modules are missing, add them here:
      // buffer: require.resolve('buffer/'),
      // https: require.resolve('https-browserify')
    };

    return config;
  },
};
