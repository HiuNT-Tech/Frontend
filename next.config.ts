import type { NextConfig } from 'next';

/**
 * Origin của BE khi deploy tách domain (vd. Render). Khi đặt, Next proxy
 * `/api/*` và `/uploads/*` sang BE để API và cookie đăng nhập cùng origin với
 * trang; `NEXT_PUBLIC_API_URL` lúc đó chỉ cần là `/api`.
 * WebSocket không đi qua rewrite nên socket.io trỏ thẳng BE qua
 * `NEXT_PUBLIC_SOCKET_URL`.
 */
const backendUrl = process.env.BACKEND_URL?.trim().replace(/\/+$/, '');

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendUrl) return [];
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
