/** @type {import('next').NextConfig} */
const commercialSiteUrl = (
  process.env.COMMERCIAL_SITE_URL ??
  process.env.NEXT_PUBLIC_COMMERCIAL_SITE_URL ??
  "https://luckymatching.app"
).replace(/\/+$/, "");

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["react-simple-maps", "d3-geo", "d3-array", "d3-scale"],
  experimental: {
    serverComponentsExternalPackages: ["@modelcontextprotocol/sdk"],
    // OG 이미지 라우트가 런타임 실행될 경우에도 한글 폰트를 함수 번들에 포함 (Vercel 보험)
    outputFileTracingIncludes: {
      "/opengraph-image": ["./public/fonts/Cafe24PROUP.woff"],
    },
  },
  async redirects() {
    // 공개/해커톤 랜딩은 유지하고, 상품·수익화 플로우만 상용 도메인으로 임시 이동한다.
    // permanent:false는 Vercel/Next에서 307 Temporary Redirect로 동작해 308보다 롤백이 쉽다.
    return [
      {
        source: "/trips",
        destination: `${commercialSiteUrl}/trips`,
        permanent: false,
      },
      {
        source: "/trips/:path*",
        destination: `${commercialSiteUrl}/trips/:path*`,
        permanent: false,
      },
      { source: "/app", destination: commercialSiteUrl, permanent: false },
      {
        source: "/app/:path*",
        destination: `${commercialSiteUrl}/:path*`,
        permanent: false,
      },
      {
        source: "/result/:path*",
        destination: `${commercialSiteUrl}/result/:path*`,
        permanent: false,
      },
      {
        source: "/premium/:path*",
        destination: `${commercialSiteUrl}/premium/:path*`,
        permanent: false,
      },
      {
        source: "/shop/:path*",
        destination: `${commercialSiteUrl}/shop/:path*`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
