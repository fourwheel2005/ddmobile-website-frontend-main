// ไฟล์: lib/stockApi.ts
// axios instance สำหรับระบบ Stock (stockddmobile) — เป็นคนละ backend / คนละ auth กับ DD Mobile
// เก็บ token แยกใน localStorage key "stock_token" (ไม่ปนกับ token ของ DD Mobile)
import axios from "axios";

const stockApi = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_STOCK_API_URL ||
    "https://stockddmobile.fourwheel.in.th/api/v1",
});

stockApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("stock_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

export default stockApi;
