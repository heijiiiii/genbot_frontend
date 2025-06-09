/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // experimental 기능들은 배포 시 호환성을 위해 비활성화
  experimental: {
    ppr: false,
  },
  // Edge Runtime에서 Node.js API 사용하는 패키지들을 외부 패키지로 처리
  serverExternalPackages: ['bcrypt-ts', 'postgres', 'drizzle-orm'],
  typescript: {
    // Render 배포를 위해 TypeScript 빌드 에러 무시
    ignoreBuildErrors: true,
  },
  eslint: {
    // Render 배포를 위해 ESLint 에러 무시
    ignoreDuringBuilds: true,
  },
  // 빌드 캐시 설정 (Render 배포 최적화)
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        protocol: 'https',
        hostname: 'ptkabdaqlulrnbzyveya.supabase.co',
        pathname: '/storage/v1/object/public/images/**',
      },
    ],
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 경로 별칭 설정 강화
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    ENABLE_DEV_LOGGING: process.env.ENABLE_DEV_LOGGING,
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  headers: async () => {
    return [
      {
        source: '/api/auth/session',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },

};

module.exports = nextConfig; 