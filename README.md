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

| Biến                           | Giá trị                                          |
| ------------------------------ | ------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`          | `/api`                                           |
| `BACKEND_URL`                  | `https://<ten-service>.onrender.com`             |
| `NEXT_PUBLIC_SOCKET_URL`       | `https://<ten-service>.onrender.com`             |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth Client ID (Web) – tuỳ chọn, bật nút Google |

`BACKEND_URL` bật rewrite `/api/*` và `/uploads/*` sang BE (xem `next.config.ts`) nên
cookie đăng nhập cùng origin với trang; websocket nối thẳng BE. Bên BE cần
`CORS_ORIGINS` và `FRONTEND_URL` trỏ về domain Vercel. Xem `.env.example` cho chạy local.

### Đăng nhập / đăng ký bằng Google

Nút Google dùng [Google Identity Services](https://developers.google.com/identity/gsi/web):
FE nhận ID token rồi gửi `POST /api/v1/auth/google`. Luồng xác minh email giữ nguyên:
tài khoản mới (hoặc chưa xác minh) được tạo ở trạng thái chưa kích hoạt và nhận mail
xác minh như đăng ký thường; chỉ tài khoản đã xác minh mới được đăng nhập. Tài khoản
email/mật khẩu có cùng email sẽ được liên kết với Google; tài khoản tạo bằng Google
đặt mật khẩu lần đầu ở Cài đặt → Mật khẩu (không cần mật khẩu hiện tại).

Cấu hình: tạo OAuth 2.0 Client ID loại _Web application_, thêm origin của FE vào
_Authorized JavaScript origins_, đặt `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (FE) và
`GOOGLE_CLIENT_ID` (BE) cùng giá trị. Không đặt thì nút Google ẩn đi.
