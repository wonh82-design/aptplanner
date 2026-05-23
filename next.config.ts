import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * 외부 이미지 호스트 화이트리스트.
     * - Vercel Blob: 자재 사진의 권장 호스팅
     * - Google Drive: 기존 자재 이미지 (마이그레이션 진행 중 임시 호환)
     * - picsum.photos: dev 환경 더미 이미지
     */
    remotePatterns: [
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    // 캐시 TTL — 동일 URL 의 변환 결과 재사용 (Vercel Image Optimization 한도 절약)
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7일
    // 자재 카드는 4:3 비율 카드 그리드. 모달은 큰 이미지.
    // 다양한 screen size 대응
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 256, 384, 600, 800],
  },
};

export default nextConfig;
