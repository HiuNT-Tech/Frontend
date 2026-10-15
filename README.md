This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy (Vercel + Render)

FE chạy trên Vercel, BE (`backlog-be`) chạy trên Render. Biến môi trường trên Vercel:

| Biến                     | Giá trị                              |
| ------------------------ | ------------------------------------ |
| `NEXT_PUBLIC_API_URL`    | `/api`                               |
| `BACKEND_URL`            | `https://<ten-service>.onrender.com` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://<ten-service>.onrender.com` |

`BACKEND_URL` bật rewrite `/api/*` và `/uploads/*` sang BE (xem `next.config.ts`) nên
cookie đăng nhập cùng origin với trang; websocket nối thẳng BE. Bên BE cần
`CORS_ORIGINS` và `FRONTEND_URL` trỏ về domain Vercel. Xem `.env.example` cho chạy local.
