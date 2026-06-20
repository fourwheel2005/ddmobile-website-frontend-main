// ไฟล์: lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://ddmobilewebsite.fourwheel.in.th/api/v1",
  // ✅ SEC-08: ไม่ตั้ง Content-Type แบบ global — ปล่อยให้ axios เลือกเอง
  //   (object → application/json, FormData → multipart/form-data + boundary)
  //   เดิมตั้ง application/json ค้างไว้ ทำให้อัปโหลดรูป (FormData) ส่ง boundary ผิด
  // ✅ SEC-10: ส่ง/รับ httpOnly cookie auth_token ด้วย (backend ออก cookie ตอน login)
  withCredentials: true,
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