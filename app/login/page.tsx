"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";

/** ปลายทางหลัง login: ใช้ ?redirect= เฉพาะ path ภายในเว็บ (กัน open-redirect ออกโดเมนอื่น) */
function safeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  // ต้องเป็น path ที่ขึ้นต้น "/" ตัวเดียว (ไม่ใช่ "//evil.com" หรือ "/\evil") — กัน redirect ออกนอกเว็บ
  if (!/^\/(?!\/|\\)/.test(raw)) return null;
  return raw;
}

/** ครอบ Suspense — useSearchParams ต้องมี boundary ตอน prerender (Next 16) */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[100dvh] items-center justify-center bg-bg-subtle" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        // ปลายทาง: ?redirect= (ถ้าปลอดภัย) → ไม่งั้นแอดมินไปหลังบ้าน, ลูกค้าไปหน้าแรก
        if (redirectTo) window.location.href = redirectTo;
        else if (role === "ROLE_ADMIN") window.location.href = "/admin";
        else window.location.href = "/";
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
    } catch (error: unknown) {
      console.error("Auth Error:", error);
      toast.error(
        getApiError(error, isLogin ? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" : "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-wrapper flex min-h-[100dvh] items-center justify-center bg-bg-subtle px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-white p-6 shadow-card sm:p-8">

        <div className="mb-7 flex justify-center">
          <Link href="/" className="logo-dd text-2xl">DD<span className="text-yellow-hover">MOBILE</span></Link>
        </div>

        <div className="mb-7 flex rounded-full bg-bg-subtle p-1">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all ${isLogin ? "bg-yellow text-text-heading shadow-sm" : "text-text-muted hover:text-text-heading"}`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all ${!isLogin ? "bg-yellow text-text-heading shadow-sm" : "text-text-muted hover:text-text-heading"}`}
          >
            ลงทะเบียน
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleAuth}>
          {!isLogin && (
            <div>
              <label htmlFor="name" className="label-dd">ชื่อ - นามสกุล</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="กรอกชื่อของคุณ" required={!isLogin} className="input-dd" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="label-dd">อีเมล (Email)</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" required className="input-dd" />
          </div>
          <div>
            <label htmlFor="password" className="label-dd">รหัสผ่าน (Password)</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={isLogin ? undefined : 6}
                className="input-dd pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-text-muted transition-colors hover:text-text-heading"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {!isLogin && <p className="mt-1.5 text-xs text-text-muted">รหัสผ่านอย่างน้อย 6 ตัวอักษร</p>}
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-base">
            {isLoading ? "กำลังประมวลผล..." : (isLogin ? "เข้าสู่ระบบ" : "สร้างบัญชีใหม่")}
          </button>

          {!isLogin && (
            <p className="text-center text-xs leading-relaxed text-text-muted">
              การสมัครสมาชิกถือว่าคุณยอมรับ{" "}
              <Link href="/privacy" className="font-medium text-yellow-hover underline-offset-2 hover:underline">
                นโยบายความเป็นส่วนตัว
              </Link>{" "}
              ของเรา
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
