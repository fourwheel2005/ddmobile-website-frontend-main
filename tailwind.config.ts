// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}", // เพิ่มบรรทัดนี้
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
      ],
  // สี/ฟอนต์/เงา กำหนดที่เดียวใน app/globals.css (@theme) — ห้ามประกาศซ้ำที่นี่ (เคยมีเหลือง 2 ค่าไม่ตรงกัน)
  theme: { extend: {} },
  plugins: [],
};
export default config;