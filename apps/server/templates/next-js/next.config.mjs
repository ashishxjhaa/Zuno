/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // E2B preview hosts the app on *.e2b.app while Next serves localhost.
  allowedDevOrigins: ["*.e2b.app"],
}

export default nextConfig
