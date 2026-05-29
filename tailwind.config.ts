// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}", // เพิ่มบรรทัดนี้
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
      ],
  theme: {
    extend: {
      colors: {
        dd: {
          yellow: "#FACC15", // สีเหลืองหลักจากรูปตัวอย่าง
          black: "#1A1A1A",  // สีดำพรีเมียม
          gray: "#333333",
        },
      },
    },
  },
  plugins: [],
};
export default config;