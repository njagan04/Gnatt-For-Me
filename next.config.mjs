// Security headers for every response.
const headers = [
  { key: 'X-Frame-Options', value: 'DENY' }, // no embedding the app in other sites (clickjacking)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

export default {
  async headers() {
    return [{ source: '/:path*', headers }];
  },
};
