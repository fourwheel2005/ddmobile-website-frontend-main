"use client";
import { useEffect, useState } from "react";
import { Copy, ExternalLink, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getApiError } from "@/lib/errorMessage";
import { loadLineStatus, OA_CHAT_HOME, oaChatUrl, onLineStatus, parseChatAccountId, saveChatAccount, type LineStatus } from "@/lib/lineChat";

/** ปุ่มเปิดห้องแชทของลูกค้าใน LINE OA Manager · ยังไม่ผูก LINE = ไปหน้ารวมแชท + บอกเหตุผล */
export function LineChatButton({ lineUserId }: { lineUserId: string | null | undefined }) {
  const status = useLineStatus();
  const linked = !!lineUserId;
  return (
    <a href={oaChatUrl(status, lineUserId)} target="_blank" rel="noopener noreferrer"
       title={linked ? "เปิดห้องแชทของลูกค้าคนนี้ใน LINE OA Manager — เห็นข้อความทั้งหมดและตอบได้ทันที" : "ลูกค้ายังไม่ได้ทักแชทพร้อมเลขอ้างอิง — เปิดหน้ารวมแชทของร้านแล้วค้นชื่อ LINE"}
       className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-opacity hover:opacity-90 ${linked ? "bg-line text-white" : "border border-border-default bg-white text-text-muted"}`}>
      <MessageCircle size={13} /> {linked ? "เปิดแชทลูกค้า" : "แชท OA (ลูกค้ายังไม่ทัก)"}
    </a>
  );
}

/**
 * ชื่อ LINE + LINE userId ของลูกค้า (ผูกเมื่อลูกค้าทักแชทพร้อมเลขอ้างอิง)
 * LINE ไม่เปิดให้ระบบอ่าน "LINE ID" ที่ผู้ใช้ตั้งเอง (@xxx) — userId (U…) คือรหัสประจำตัวลูกค้าในแชทร้าน
 */
export function LineIdentity({ lineUserId, lineDisplayName }: { lineUserId: string | null | undefined; lineDisplayName?: string | null }) {
  if (!lineUserId) return <p className="mt-0.5 text-xs text-text-muted">LINE: ลูกค้ายังไม่ได้ทักแชทพร้อมเลขอ้างอิง</p>;
  const copy = () => navigator.clipboard?.writeText(lineUserId).then(() => toast.success("คัดลอก LINE userId แล้ว"), () => toast.error("คัดลอกไม่สำเร็จ"));
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-text-muted">
      <MessageCircle size={12} className="text-line" />
      <span>ชื่อ LINE:</span> <b className="text-text-heading">{lineDisplayName ?? "—"}</b>
      <span aria-hidden>·</span>
      <span title="รหัสลูกค้าใน LINE ของร้าน (LINE ไม่เปิดให้ระบบอ่าน LINE ID ที่ลูกค้าตั้งเอง)">LINE userId:</span>
      <code className="rounded bg-bg-subtle px-1 font-mono text-[11px] text-text-body">{lineUserId}</code>
      <button type="button" onClick={copy} aria-label="คัดลอก LINE userId" className="rounded p-0.5 hover:bg-bg-subtle"><Copy size={12} /></button>
    </p>
  );
}

export function useLineStatus(): LineStatus | null {
  const [status, setStatus] = useState<LineStatus | null>(null);
  useEffect(() => {
    let alive = true;
    loadLineStatus().then((st) => { if (alive) setStatus(st); });
    const off = onLineStatus(setStatus);   // แก้ ID บัญชีแล้ว ปุ่มทุกแถวเปลี่ยนตามทันที
    return () => { alive = false; off(); };
  }, []);
  return status;
}

const shortId = (id: string) => `${id.slice(0, 7)}…${id.slice(-4)}`;

/**
 * บัญชี LINE OA ที่ปุ่ม "เปิดแชทลูกค้า" พาไป (chat.line.biz) — LINE ไม่มี API ให้ดึง ID นี้ จึงให้แอดมินวางลิงก์แชทเอง
 * ยังไม่ตั้ง = แถบเตือน + ช่องวางลิงก์ · ตั้งแล้ว = บรรทัดสั้น ๆ + ปุ่มทดสอบ/เปลี่ยน
 */
export function LineChatAccountSetting() {
  const status = useLineStatus();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (!status) return null;
  const acct = status.chatAccountId ?? null;
  const open = editing || !acct;

  const save = async () => {
    const id = parseChatAccountId(value);
    if (!id) { setError("วางลิงก์จากแถบที่อยู่ของ chat.line.biz เช่น https://chat.line.biz/U…/chat/U…"); return; }
    setSaving(true);
    try {
      await saveChatAccount(id);
      toast.success("บันทึกบัญชีแชท LINE OA แล้ว — ปุ่มเปิดแชทลูกค้าใช้ได้ทันที รวมการ์ดเก่าในกลุ่ม LINE");
      setEditing(false); setValue(""); setError(null);
    } catch (e) {
      setError(getApiError(e, "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง"));
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
        <MessageCircle size={13} className="text-line" />
        <span>ปุ่มเปิดแชทลูกค้า → LINE OA บัญชี <code className="rounded bg-bg-subtle px-1 font-mono text-[11px] text-text-body" title={acct}>{shortId(acct)}</code>
          {status.chatAccountSource === "ENV" ? " (ค่าจากเซิร์ฟเวอร์)" : ""}</span>
        <a href={OA_CHAT_HOME + acct} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-text-heading hover:underline">
          ทดสอบเปิด <ExternalLink size={11} />
        </a>
        <button type="button" onClick={() => setEditing(true)} className="font-semibold text-text-heading hover:underline">เปลี่ยน</button>
      </p>
    );
  }

  return (
    <div role={acct ? undefined : "alert"} className={`mb-4 rounded-2xl border p-4 text-sm text-text-body ${acct ? "border-border-default bg-white" : "border-warning-border bg-warning-bg"}`}>
      <p className={`font-bold ${acct ? "text-text-heading" : "text-warning-text"}`}>
        {acct ? "เปลี่ยนบัญชีแชท LINE OA" : "⚠️ ยังไม่ได้ตั้งบัญชีแชท LINE OA — ปุ่ม “เปิดแชทลูกค้า” จะไปไม่ถึงห้องแชทของลูกค้า"}
      </p>
      <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-xs text-text-muted">
        <li>เปิด <a href={OA_CHAT_HOME} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-heading underline">chat.line.biz</a> (ล็อกอินบัญชีที่ดูแล OA ของร้าน)</li>
        <li>กดเข้าห้องแชทลูกค้าคนไหนก็ได้ แล้วคัดลอกลิงก์จากแถบที่อยู่ด้านบน</li>
        <li>วางที่ช่องนี้แล้วกดบันทึก — ใช้ได้ทันทีกับทุกปุ่ม รวมการ์ดที่ส่งเข้ากลุ่ม LINE ไปแล้ว</li>
      </ol>
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input value={value} onChange={(e) => { setValue(e.target.value); setError(null); }} maxLength={500}
               placeholder="https://chat.line.biz/U…/chat/U…" aria-label="ลิงก์ห้องแชทจาก chat.line.biz"
               aria-invalid={!!error} className="input-dd min-w-0 flex-1 font-mono text-xs" />
        <div className="flex gap-2">
          <button type="submit" disabled={saving || !value.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">{saving ? "กำลังบันทึก…" : "บันทึก"}</button>
          {acct && <button type="button" onClick={() => { setEditing(false); setValue(""); setError(null); }} className="rounded-full border border-border-default px-4 py-2 text-sm">ยกเลิก</button>}
        </div>
      </form>
      {error && <p role="alert" className="mt-1.5 text-xs text-error-text">{error}</p>}
    </div>
  );
}

/** แถบเตือนเมื่อแชท 1:1 ของ OA ปิดอยู่ — ปิด = ข้อความลูกค้าไม่ขึ้นใน OA Manager แอดมินตอบไม่ได้ */
export function LineChatOffBanner() {
  const status = useLineStatus();
  if (status?.chatMode !== "bot") return null;
  return (
    <div role="alert" className="mb-4 rounded-2xl border border-error-border bg-error-bg p-4 text-sm text-text-body">
      <p className="font-bold text-error-text">⚠️ แชทของ LINE OA ปิดอยู่ — ข้อความลูกค้าจะไม่ขึ้นในแชท แอดมินตอบไม่ได้</p>
      <p className="mt-1">เปิดที่ <b>LINE Official Account Manager › ตั้งค่า › การตอบกลับ</b> → เปิด <b>แชท</b> และเปิด <b>Webhook</b> ไว้ทั้งคู่ (ปิด &ldquo;ข้อความตอบกลับอัตโนมัติ&rdquo; เพื่อไม่ให้ตอบซ้ำกับระบบ)</p>
    </div>
  );
}
