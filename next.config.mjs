/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
                // Apply security headers to all routes
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://vercel.live https://vercel.com",
                            "style-src 'self' 'unsafe-inline' https://accounts.google.com https://vercel.live https://fonts.googleapis.com",
                            "img-src 'self' data: https: https://lh3.googleusercontent.com https://*.googlecode.com https://*.google.com https://vercel.com https://vercel.live",
                            "font-src 'self' data: https://fonts.gstatic.com",
                            "connect-src 'self' https://api.zerobounce.net https://accounts.google.com https://*.vercel.live wss://*.vercel.live",
                            "frame-src 'self' https://accounts.google.com https://vercel.live",
                            "frame-ancestors 'self'",
                        ].join('; ')
                    }
                ],
            },
        ];
    },
    // Enable React strict mode for better error detection
    reactStrictMode: true,

    // Optimize production builds
    poweredByHeader: false,

    // Compression
    compress: true,
};

export default nextConfig;
