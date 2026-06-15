// ไฟล์: lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://bf87-2001-fb1-17c-2789-8052-d295-c907-f6f1.ngrok-free.app/api/v1",
  // ✅ SEC-08: ไม่ตั้ง Content-Type แบบ global — ปล่อยให้ axios เลือกเอง
  //   (object → application/json, FormData → multipart/form-data + boundary)
  //   เดิมตั้ง application/json ค้างไว้ ทำให้อัปโหลดรูป (FormData) ส่ง boundary ผิด
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
});


api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;