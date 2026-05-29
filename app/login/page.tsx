"use client";
import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const response = await api.post("/auth/login", { email, password });
        const { token, name, role } = response.data;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify({ name: name || "", email, role }));

        toast.success("เข้าสู่ระบบสำเร็จ!");

        if (role === "ROLE_ADMIN") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/";
        }
      } else {
        if (!name || !email || !password) {
          toast.error("กรุณากรอกข้อมูลให้ครบทุกช่อง");
          setIsLoading(false);
          return;
        }

        await api.post("/auth/register", { name, email, password });

        toast.success("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านของคุณ");
        setIsLogin(true);
        setPassword("");
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      if (error.response && error.response.data && error.response.data.error) {
        toast.error("ข้อผิดพลาด: " + error.response.data.error);
      } else {
        toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ (เช็คว่าเปิด ngrok หรือยัง)");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-wrapper flex min-h-[100dvh] items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-md border border-border-default bg-bg-surface p-6 sm:p-8">

        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="logo-dd text-3xl">
            DD<span className="text-white">MOBILE</span>
          </Link>
        </div>

        {/* Toggle */}
        <div className="mb-8 flex border border-border-default">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 font-display text-sm uppercase tracking-widest transition-colors ${isLogin ? "bg-yellow text-black" : "text-text-muted hover:text-white"}`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 font-display text-sm uppercase tracking-widest transition-colors ${!isLogin ? "bg-yellow text-black" : "text-text-muted hover:text-white"}`}
          >
            ลงทะเบียน
          </button>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleAuth}>
          {!isLogin && (
            <div>
              <label htmlFor="name" className="label-dd">ชื่อ - นามสกุล</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="กรอกชื่อของคุณ"
                required={!isLogin}
                className="input-dd"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="label-dd">อีเมล (Email)</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              required
              className="input-dd"
            />
          </div>

          <div>
            <label htmlFor="password" className="label-dd">รหัสผ่าน (Password)</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input-dd"
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? "กำลังประมวลผล..." : (isLogin ? "เข้าสู่ระบบ →" : "สร้างบัญชีใหม่ →")}
          </button>
        </form>
      </div>
    </div>
  );
}
