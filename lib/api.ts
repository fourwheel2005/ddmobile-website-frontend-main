// ไฟล์: lib/api.ts
import axios, { AxiosError, AxiosRequestConfig } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://ddmobilewebsite.fourwheel.in.th/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
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

// ───────────────────────── Refresh token + ดักจับ 401 ─────────────────────────
// ปัญหาเดิม: access token หมดอายุ → backend คืน 401 → หน้าเว็บโชว์ 401 ดิบ ๆ ไม่เด้ง ไม่ต่ออายุ
// วิธีแก้: response interceptor
//   • 401 (ยังไม่ล็อกอิน/token หมดอายุ) → ลองต่ออายุด้วย refresh token (httpOnly cookie) แบบเงียบ ๆ 1 ครั้ง
//     สำเร็จ → ยิง request เดิมซ้ำอัตโนมัติ (ผู้ใช้ไม่รู้สึก)   ล้มเหลว → เคลียร์ + เด้ง /login
//   • 403 (ล็อกอินแล้วแต่ไม่มีสิทธิ์ เช่น ลูกค้าเรียก admin) → ปล่อยผ่าน ไม่ยุ่ง (ไม่ใช่ session หมดอายุ)
//   • Guest (ไม่เคยมี token ใน localStorage เลย เช่น กระดิ่งแจ้งเตือน poll ทุก 45 วิ) → เงียบ ไม่เด้ง

const REFRESH_URL = `${BASE_URL}/auth/refresh`;

// single-flight: ถ้ามีหลาย request เจอ 401 พร้อมกัน ให้ refresh แค่ครั้งเดียว แล้วรอ promise ก้อนเดียวกัน
let refreshing: Promise<boolean> | null = null;

function hadSession(): boolean {
  // เคยล็อกอินไหม — ใช้ตัดสินว่าจะ "ต่ออายุ/เด้ง login" หรือ "เงียบ" (guest)
  return typeof window !== "undefined" && !!localStorage.getItem("token");
}

async function doRefresh(): Promise<boolean> {
  try {
    // ยิงด้วย axios ดิบ (ไม่ผ่าน interceptor นี้ → กัน loop) · ต้อง withCredentials เพื่อส่ง refresh cookie
    const res = await axios.post(REFRESH_URL, null, {
      withCredentials: true,
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    const token = res.data?.token;
    if (token && typeof window !== "undefined") {
      localStorage.setItem("token", token);
      // อัปเดต user (merge — คง email เดิมที่ refresh ไม่ได้คืนมา) ให้ตรง key ที่หน้า login ใช้
      try {
        const prev = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({
          ...prev,
          name: res.data?.name ?? prev.name,
          role: res.data?.role ?? prev.role,
        }));
      } catch { /* user เดิมเพี้ยน → ข้าม */ }
    }
    return !!token;
  } catch {
    return false;   // refresh หมดอายุ/บัญชีถูกลบ → ให้ไปเด้ง login
  }
}

function forceLogout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  const path = window.location.pathname + window.location.search;
  // อย่า loop ถ้าอยู่หน้า login อยู่แล้ว
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = `/login?redirect=${encodeURIComponent(path)}`;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;

    // สนใจเฉพาะ 401 · ไม่ใช่ 403 (ไม่มีสิทธิ์ — คนละเรื่อง) · ต้องมี config เพื่อ retry ได้
    if (status !== 401 || !original) {
      return Promise.reject(error);
    }
    // อย่า refresh ให้ตัว endpoint refresh/login เอง (กัน loop)
    const url = original.url || "";
    if (url.includes("/auth/refresh") || url.includes("/auth/login")) {
      return Promise.reject(error);
    }
    // guest (ไม่เคยล็อกอิน) → เงียบ ไม่ต้อง refresh/เด้ง (เช่น NotificationBell poll)
    if (!hadSession()) {
      return Promise.reject(error);
    }
    // retry ได้ครั้งเดียวต่อ request (กันวน)
    if (original._retried) {
      forceLogout();
      return Promise.reject(error);
    }
    original._retried = true;

    // single-flight refresh
    if (!refreshing) refreshing = doRefresh().finally(() => { refreshing = null; });
    const ok = await refreshing;

    if (ok) {
      // แนบ token ใหม่แล้วยิงซ้ำ (request interceptor จะอ่าน localStorage ให้เอง แต่ตั้งตรงนี้ให้ชัวร์)
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token && original.headers) {
        (original.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      }
      return api(original);
    }
    forceLogout();
    return Promise.reject(error);
  }
);

export default api;
