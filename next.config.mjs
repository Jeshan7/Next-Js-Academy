/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // monaco-editor ships ESM workers referenced via `new Worker(new URL(...))`
    // which webpack 5 handles natively; nothing extra needed, but keep
    // source maps of vendored code out of the build for speed.
    config.module.rules.push({ test: /\.map$/, type: "asset/resource" });
    return config;
  },
};
export default nextConfig;
