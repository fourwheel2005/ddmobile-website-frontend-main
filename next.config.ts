import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // รูปสินค้า = รูปถ่ายมือถือ ไม่จำเป็นต้อง generate เกิน 1920px (ลดภาระ optimizer/กัน upscale เว่อร์)
    // เพิ่ม 400 ให้จอเล็ก/การ์ดสินค้าขอ thumbnail 400px ได้ (ตรงกับที่ BFF pre-warm ไว้ ผ่าน stockImageLoader)
    deviceSizes: [400, 640, 750, 828, 1080, 1200, 1920],
    // รูปสินค้ามาจาก backend proxy (/api/v1/stock-image/*) — จำกัดเฉพาะ host จริง (กัน image optimizer เป็น open proxy)
    remotePatterns: [
      { protocol: "https", hostname: "ddmobilewebsite.fourwheel.in.th" },
      { protocol: "http", hostname: "localhost" },   // dev backend
    ],
  },
};

export default nextConfig;
