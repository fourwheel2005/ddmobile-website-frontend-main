"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, MailCheck, MessageCircle } from "lucide-react";
import api from "@/lib/api";
import { getApiError, getApiStatus } from "@/lib/errorMessage";
import { lineChatUrl } from "@/lib/contact";
import { ACCOUNT_HELP_MESSAGE } from "@/lib/passwordReset";

/** ส่งอีกครั้งได้หลังกี่วินาที (backend จำกัด 3 ครั้ง/ชม./บัญชีอีกชั้น) */
const RESEND_COOLDOWN = 60;

/**
 * ลืมรหัสผ่าน — กรอกอีเมลที่ใช้สมัคร → ระบบส่งลิงก์ตั้งรหัสใหม่ (ใช้ครั้งเดียว 30 นาที)
 * ข้อความตอบกลับเหมือนกันทุกกรณี (มี/ไม่มีบัญชี) — ไม่บอกคนนอกว่าอีเมลไหนเป็นสมาชิก
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const send = async (target: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post("/auth/password/forgot", { email: target.trim() });
      setMessage(String(res.data?.message ?? ""));
      setSentTo(target.trim());
      setCooldown(RESEND_COOLDOWN);
    } catch (e) {
      setError(getApiStatus(e) === 429
        ? "ขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่"
        : getApiError(e, "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-wrapper flex min-h-[100dvh] items-center justify-center bg-bg-subtle px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-white p-6 shadow-card sm:p-8">
        <div className="mb-7 flex justify-center">
          <Link href="/" className="logo-dd text-2xl">DD<span className="text-yellow-hover">MOBILE</span></Link>
        </div>

        {sentTo === null ? (
          <>
            <div className="mb-6 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow/15">
                <KeyRound size={22} className="text-yellow-hover" />
              </span>
              <h1 className="text-xl font-bold text-text-heading">ลืมรหัสผ่าน</h1>
              <p className="mt-1.5 text-sm text-text-muted">กรอกอีเมลที่ใช้สมัครสมาชิก เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้</p>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); if (!busy) void send(email); }}
            >
              <div>
                <label htmlFor="fp-email" className="label-dd">อีเมลที่ใช้สมัคร</label>
                <input
                  id="fp-email" type="email" required autoComplete="email" autoFocus
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com" maxLength={150} className="input-dd"
                  aria-describedby={error ? "fp-error" : undefined}
                />
              </div>
              {error && <p id="fp-error" role="alert" className="text-sm font-medium text-error-text">{error}</p>}
              <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-base">
                {busy ? "กำลังส่ง..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center" aria-live="polite">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg">
              <MailCheck size={22} className="text-success-text" />
            </span>
            <h1 className="text-xl font-bold text-text-heading">เช็กอีเมลของคุณ</h1>
            <p className="mt-2 text-sm text-text-body">{message}</p>
            <p className="mt-1 break-all text-sm font-semibold text-text-heading">{sentTo}</p>

            <ul className="mt-5 space-y-1.5 rounded-xl bg-bg-subtle p-4 text-left text-sm text-text-body">
              <li>• ลิงก์ใช้ได้ครั้งเดียว ภายใน 30 นาที</li>
              <li>• ไม่เห็นอีเมล? ดูในโฟลเดอร์ <b>สแปม</b> หรือ <b>โปรโมชัน</b></li>
              <li>• ขอลิงก์ใหม่ = ลิงก์เก่าใช้ไม่ได้ ให้กดจากอีเมลล่าสุด</li>
            </ul>

            {error && <p role="alert" className="mt-3 text-sm font-medium text-error-text">{error}</p>}
            <button
              type="button"
              onClick={() => void send(sentTo)}
              disabled={busy || cooldown > 0}
              className="btn-secondary mt-5 w-full py-3 text-sm"
            >
              {cooldown > 0 ? `ส่งอีกครั้งได้ใน ${cooldown} วินาที` : busy ? "กำลังส่ง..." : "ยังไม่ได้รับ — ส่งอีกครั้ง"}
            </button>
            <button type="button" onClick={() => { setSentTo(null); setError(null); }} className="mt-3 text-sm font-medium text-text-muted underline-offset-2 hover:text-text-heading hover:underline">
              ใช้อีเมลอื่น
            </button>
          </div>
        )}

        <div className="mt-7 border-t border-border-subtle pt-5 text-center text-sm text-text-muted">
          <p>
            จำอีเมลที่สมัครไม่ได้ หรือเข้าอีเมลไม่ได้?{" "}
            <a
              href={lineChatUrl(ACCOUNT_HELP_MESSAGE)}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-success-text hover:underline"
            >
              <MessageCircle size={14} /> ทักแอดมินทาง LINE
            </a>
          </p>
          <Link href="/login" className="mt-4 inline-flex items-center gap-1.5 font-medium text-text-heading hover:underline">
            <ArrowLeft size={15} /> กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
