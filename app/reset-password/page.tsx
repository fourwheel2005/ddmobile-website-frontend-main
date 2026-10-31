"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, KeyRound, LinkIcon } from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { clearSession } from "@/lib/session";
import { LINK_PROBLEM, MIN_PASSWORD_LENGTH, passwordProblem, tokenFromHash, type ResetLinkStatus } from "@/lib/passwordReset";

type Phase =
  | { kind: "checking" }
  | { kind: "form"; email: string }
  | { kind: "problem"; status: Exclude<ResetLinkStatus, "VALID"> }
  | { kind: "done" };

/**
 * ตั้งรหัสผ่านใหม่จากลิงก์ในอีเมล (/reset-password#token=…)
 * อ่าน token จาก # แล้วลบออกจาก URL ทันที (ไม่ค้างในประวัติ/บุ๊กมาร์ก) → ตรวจลิงก์ → ฟอร์มรหัสใหม่
 * สำเร็จ = backend ออกจากระบบทุกเครื่อง → ล้าง session บนเครื่องนี้ด้วย แล้วให้ล็อกอินด้วยรหัสใหม่
 */
export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let run = 0;   // ลำดับการตรวจล่าสุด — ผลของลิงก์ก่อนหน้าที่ตอบช้าห้ามทับลิงก์ใหม่
    const load = async () => {
      const t = tokenFromHash(window.location.hash);
      if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
      const mine = ++run;
      setPassword(""); setConfirm(""); setError(null);
      if (!t) { setToken(null); setPhase({ kind: "problem", status: "INVALID" }); return; }
      setToken(t);
      setPhase({ kind: "checking" });
      try {
        const res = await api.post("/auth/password/check", { token: t });
        if (mine !== run) return;
        const status = String(res.data?.status ?? "INVALID") as ResetLinkStatus;
        setPhase(status === "VALID"
          ? { kind: "form", email: String(res.data?.email ?? "") }
          : { kind: "problem", status: status === "EXPIRED" || status === "USED" ? status : "INVALID" });
      } catch {
        if (mine === run) setPhase({ kind: "problem", status: "INVALID" });
      }
    };
    void load();
    // วางลิงก์ใหม่ในแท็บเดิม = เปลี่ยนแค่ #token (เบราว์เซอร์ไม่โหลดหน้าใหม่) → ตรวจลิงก์ใหม่เอง
    const onHash = () => { if (window.location.hash) void load(); };
    window.addEventListener("hashchange", onHash);
    return () => { run++; window.removeEventListener("hashchange", onHash); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !token) return;
    const problem = passwordProblem(password, confirm);
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/password/reset", { token, password });
      clearSession();   // ทุก session ถูกเพิกถอนแล้ว — ล้างของเครื่องนี้ให้ตรงกัน
      setPhase({ kind: "done" });
    } catch (err) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === "EXPIRED" || code === "USED" || code === "INVALID") setPhase({ kind: "problem", status: code });
      else setError(getApiError(err, "ตั้งรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setBusy(false);
    }
  };

  const hint = password && [...password].length < MIN_PASSWORD_LENGTH
    ? `อีก ${MIN_PASSWORD_LENGTH - [...password].length} ตัวอักษร`
    : confirm && password !== confirm ? "รหัสผ่านทั้งสองช่องยังไม่ตรงกัน" : null;

  return (
    <div className="page-wrapper flex min-h-[100dvh] items-center justify-center bg-bg-subtle px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-white p-6 shadow-card sm:p-8">
        <div className="mb-7 flex justify-center">
          <Link href="/" className="logo-dd text-2xl">DD<span className="text-yellow-hover">MOBILE</span></Link>
        </div>

        {phase.kind === "checking" && (
          <p className="py-10 text-center text-sm text-text-muted" aria-live="polite">กำลังตรวจสอบลิงก์...</p>
        )}

        {phase.kind === "form" && (
          <>
            <div className="mb-6 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow/15">
                <KeyRound size={22} className="text-yellow-hover" />
              </span>
              <h1 className="text-xl font-bold text-text-heading">ตั้งรหัสผ่านใหม่</h1>
              {phase.email && <p className="mt-1.5 text-sm text-text-muted">สำหรับบัญชี <span className="font-semibold text-text-heading">{phase.email}</span></p>}
            </div>
            <form className="space-y-4" onSubmit={submit} noValidate>
              <div>
                <label htmlFor="rp-new" className="label-dd">รหัสผ่านใหม่</label>
                <div className="relative">
                  <input
                    id="rp-new" type={show ? "text" : "password"} autoComplete="new-password" autoFocus
                    value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder={`อย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`} className="input-dd pr-11"
                    aria-describedby="rp-hint"
                  />
                  <button
                    type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-text-muted transition-colors hover:text-text-heading"
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="rp-confirm" className="label-dd">ยืนยันรหัสผ่านใหม่</label>
                <input
                  id="rp-confirm" type={show ? "text" : "password"} autoComplete="new-password"
                  value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(null); }}
                  placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง" className="input-dd"
                />
              </div>
              <p id="rp-hint" role={error ? "alert" : undefined} className={`text-sm ${error ? "font-medium text-error-text" : "text-text-muted"}`}>
                {error ?? hint ?? "ตั้งรหัสใหม่แล้ว ระบบจะออกจากระบบทุกเครื่องเพื่อความปลอดภัย"}
              </p>
              <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-base">
                {busy ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
              </button>
            </form>
          </>
        )}

        {phase.kind === "problem" && (
          <div className="text-center" role="alert">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-error-bg">
              <LinkIcon size={22} className="text-error-text" />
            </span>
            <h1 className="text-xl font-bold text-text-heading">ใช้ลิงก์นี้ไม่ได้</h1>
            <p className="mt-2 text-sm text-text-body">{LINK_PROBLEM[phase.status]} — ขอลิงก์ใหม่ได้เลย</p>
            <Link href="/forgot-password" className="btn-primary mt-6 w-full py-3 text-base">ขอลิงก์ใหม่</Link>
            <Link href="/login" className="mt-4 inline-block text-sm font-medium text-text-muted hover:text-text-heading hover:underline">กลับไปหน้าเข้าสู่ระบบ</Link>
          </div>
        )}

        {phase.kind === "done" && (
          <div className="text-center" aria-live="polite">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg">
              <CheckCircle2 size={22} className="text-success-text" />
            </span>
            <h1 className="text-xl font-bold text-text-heading">ตั้งรหัสผ่านใหม่เรียบร้อย</h1>
            <p className="mt-2 text-sm text-text-body">ระบบออกจากระบบทุกเครื่องแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่</p>
            <Link href="/login" className="btn-primary mt-6 w-full py-3 text-base">เข้าสู่ระบบ</Link>
          </div>
        )}
      </div>
    </div>
  );
}
