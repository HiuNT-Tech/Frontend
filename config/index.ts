const config = {
  apiPath: process.env.NEXT_PUBLIC_API_PATH,
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  /** Origin của Socket.IO server; mặc định lấy origin của API_ROOT (README 4.6, D16). */
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL,
  /** Path Socket.IO; mặc định '/socket.io' (khớp SOCKET_PATH của BE). */
  socketPath: process.env.NEXT_PUBLIC_SOCKET_PATH,
  /**
   * Polling dự phòng cho unread-count (ms); 0 = tắt (mặc định). Dùng khi không mở được
   * WebSocket (demo fallback README 4.8). Socket vẫn là nguồn nhanh, REST là nguồn đúng.
   */
  notificationPollMs: Number(process.env.NEXT_PUBLIC_NOTIFICATION_POLL_MS ?? 0),
};

export default config;
