import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Optimize images
  images: {
    unoptimized: true
  },
  
  // Reduce bundle size
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@prisma/client']
  },
  
  // Compress output
  compress: true,
  
  // Remove source maps in production
  productionBrowserSourceMaps: false
};

export default nextConfig;
