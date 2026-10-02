"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, EyeOff, Lock } from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import Req from "@/components/ui/Req";
import ThaiAddressAutocomplete, { type ThaiGeo } from "@/components/ThaiAddressAutocomplete";
import { addressFromLogin, toAddressPayload, type StoredUser } from "@/lib/profile";
import { COMPLETE_PROFILE_PATH, safeRedirect } from "@/lib/accessGate";
import { isProfileComplete, syncSessionCookie, writeSessionCookie } from "@/lib/session";

// เบอร์โทรไทย 9–10 หลักขึ้นต้น 0 (คั่นด้วย -/เว้นวรรคได้) — รูปแบบเดียวกับหน้า checkout และ backend
const TEL_RE = /^0\d{1,2}[-\s]?\d{3}[-\s]?\d{3,4}$/;
/** เคยมีบัญชีบนเครื่องนี้ → มาจากกำแพงสมาชิกให้เปิดแท็บ "เข้าสู่ระบบ" · ไม่เคย → เปิดแท็บ "ลงทะเบียน" */
const HAS_ACCOUNT_KEY = "dd_has_account";

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
  const [tel, setTel] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [geo, setGeo] = useState<ThaiGeo | null>(null);   // ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์ (auto-fill)
  const [addressLine, setAddressLine] = useState("");      // บ้านเลขที่/ถนน (บังคับ — สมาชิกต้องมีที่อยู่ครบ)
  const [accept, setAccept] = useState(false);              // PDPA: ยอมรับนโยบาย (บังคับ)
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fromWall = !!redirectTo;   // มาจากกำแพงสมาชิก (เปิดหน้าที่ต้องเป็นสมาชิก)

  // ตอนเปิดหน้า (defer rAF — ไม่ setState sync ใน effect):
  //  - ล็อกอินค้างอยู่แล้ว (เช่นก่อนมีกำแพง) + มาจากกำแพง → ซิงก์ cookie แล้วพากลับหน้าเดิม ไม่ต้องล็อกอินซ้ำ
  //  - มาจากกำแพงและไม่เคยมีบัญชีบนเครื่องนี้ → เปิดแท็บลงทะเบียนให้เลย
  useEffect(() => {
    const f = requestAnimationFrame(() => {
      try {
        if (localStorage.getItem("token") && localStorage.getItem("user")) {
          syncSessionCookie();
          if (redirectTo) { window.location.replace(redirectTo); return; }
        }
        if (fromWall && localStorage.getItem(HAS_ACCOUNT_KEY) !== "1") setIsLogin(false);
      } catch { /* storage ถูกบล็อก */ }
    });
    return () => cancelAnimationFrame(f);
  }, [redirectTo, fromWall]);

  /** ล็อกอิน (หรือสมัครแล้วล็อกอินให้ทันที) สำเร็จ → เก็บ session + cookie → ข้อมูลไม่ครบไปเติมก่อน → กลับหน้าเดิม */
  const completeAuth = (data: Record<string, unknown>, mail: string) => {
    const role = typeof data.role === "string" ? data.role : "ROLE_CUSTOMER";
    const user: StoredUser = {
      name: typeof data.name === "string" ? data.name : "", email: mail, role,
      tel: typeof data.tel === "string" ? data.tel : "",
      // address: null = ไม่มีที่อยู่ (sync แล้ว) — ต่างจาก undefined ของ session เก่า (ดู lib/profile.ts)
      address: addressFromLogin(data),
    };
    localStorage.setItem("token", String(data.token));
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem(HAS_ACCOUNT_KEY, "1");
    writeSessionCookie(user);
    const target = redirectTo ?? (role === "ROLE_ADMIN" ? "/admin" : role === "ROLE_EMPLOYEE" ? "/employee" : "/products");
    window.location.href = isProfileComplete(user)
      ? target
      : `${COMPLETE_PROFILE_PATH}?complete=1&redirect=${encodeURIComponent(target)}`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        const response = await api.post("/auth/login", { email, password });
        toast.success("เข้าสู่ระบบสำเร็จ!");
        completeAuth(response.data, email);   // เก็บอีเมลแบบเดิม (ตะกร้าผูกเจ้าของด้วยค่านี้)
      } else {
        if (!name || !tel || !email || !password) {
          toast.error("กรุณากรอกข้อมูลให้ครบทุกช่อง");
          setIsLoading(false);
          return;
        }
        if (!TEL_RE.test(tel.trim())) {
          toast.error("เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)");
          setIsLoading(false);
          return;
        }
        if (!geo) {
          toast.error("กรุณาเลือกตำบล / อำเภอ / จังหวัด จากช่องค้นหาที่อยู่");
          setIsLoading(false);
          return;
        }
        if (!addressLine.trim()) {
          toast.error("กรุณากรอกบ้านเลขที่ / หมู่ / ถนน");
          setIsLoading(false);
          return;
        }
        if (!accept) {
          toast.error("กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิก");
          setIsLoading(false);
          return;
        }
        const res = await api.post("/auth/register", {
          name, tel: tel.trim(), email, password, address: toAddressPayload(geo, addressLine), acceptTerms: true,
        });
        // backend สมัครแล้วล็อกอินให้ทันที (คืน token) → เข้าใช้งานต่อได้เลย ไม่ต้องกรอกรหัสซ้ำ
        if (res.data?.token) {
          toast.success("สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ 🎉");
          completeAuth(res.data, email);
          return;
        }
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

        {/* มาจากกำแพงสมาชิก — บอกเหตุผล + ประโยชน์ (ไม่ใช่แค่ฟอร์มเปล่า) */}
        {fromWall && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-yellow/50 bg-yellow/10 p-3.5 text-sm">
            <Lock size={18} className="mt-0.5 flex-shrink-0 text-yellow-hover" />
            <p className="text-text-body">
              <span className="font-bold text-text-heading">สำหรับสมาชิกเท่านั้น</span> — สมัครฟรี ไม่ถึง 1 นาที
              เพื่อดูสินค้า ราคา และแผนผ่อนทุกเครื่อง พร้อมทำรายการได้ทันที
            </p>
          </div>
        )}

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
            <>
              <div>
                <label htmlFor="name" className="label-dd">ชื่อ - นามสกุล<Req /></label>
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="กรอกชื่อของคุณ" required={!isLogin} autoComplete="name" className="input-dd" />
              </div>
              <div>
                <label htmlFor="tel" className="label-dd">เบอร์โทร<Req /></label>
                <input id="tel" type="tel" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="เช่น 0812345678" required={!isLogin} autoComplete="tel" className="input-dd" />
                <p className="mt-1.5 text-xs text-text-muted">ใช้ติดต่อเรื่องคำสั่งซื้อ + เติมให้อัตโนมัติตอนสั่งซื้อ</p>
              </div>
              <div>
                <label htmlFor="reg-geo" className="label-dd">ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์<Req /></label>
                <ThaiAddressAutocomplete inputId="reg-geo" value={geo} onChange={setGeo} />
                <p className="mt-1.5 text-xs text-text-muted">พิมพ์รหัสไปรษณีย์หรือชื่อตำบล แล้วเลือกจากรายการ — ระบบเติมที่เหลือให้</p>
              </div>
              <div>
                <label htmlFor="reg-addr" className="label-dd">บ้านเลขที่ / หมู่ / ซอย / ถนน<Req /></label>
                <input id="reg-addr" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} maxLength={255} required={!isLogin} autoComplete="street-address" placeholder="เช่น 99/1 หมู่ 2 ถ.รามคำแหง" className="input-dd" />
                <p className="mt-1.5 text-xs text-text-muted">แก้ไขภายหลังได้ที่หน้าโปรไฟล์</p>
              </div>
            </>
          )}
          <div>
            <label htmlFor="email" className="label-dd">อีเมล (Email){!isLogin && <Req />}</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" required autoComplete="email" className="input-dd" />
          </div>
          <div>
            <label htmlFor="password" className="label-dd">รหัสผ่าน (Password){!isLogin && <Req />}</label>
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
          {/* PDPA — ติ๊กยอมรับเอง (backend บันทึกเวลาที่ยอมรับ) */}
          {!isLogin && (
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-text-body">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1 h-4 w-4 flex-shrink-0 accent-yellow-hover" />
              <span>
                ยอมรับ{" "}
                <Link href="/privacy" target="_blank" className="font-medium text-yellow-hover underline-offset-2 hover:underline">นโยบายความเป็นส่วนตัว</Link>
                {" "}และยินยอมให้ร้านใช้ข้อมูลเพื่อติดต่อเรื่องบริการ<Req />
              </span>
            </label>
          )}
          <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-base">
            {isLoading ? "กำลังประมวลผล..." : (isLogin ? "เข้าสู่ระบบ" : "สร้างบัญชีใหม่")}
          </button>

        </form>
      </div>
    </div>
  );
}
