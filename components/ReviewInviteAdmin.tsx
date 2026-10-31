"use client";
import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Ban, CheckCircle2, Copy, Eye, Link2, Loader2, MessageCircle, MousePointerClick, QrCode, Send, Share2, Star, X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { TableSkeleton } from "@/components/Skeletons";
import StatCard from "@/components/ui/StatCard";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { INVITE_CHANNELS, channelLabel, inviteMessage, lineShareUrl, type InviteRow, type InviteStatus } from "@/lib/reviews";

const STATUS: Record<InviteStatus, { label: string; cls: string }> = {
  PENDING: { label: "ยังไม่เปิด", cls: "badge-dd" },
  OPENED: { label: "เปิดแล้ว · รอรีวิว", cls: "badge-dd badge-info" },
  USED: { label: "รีวิวแล้ว", cls: "badge-dd badge-success" },
  EXPIRED: { label: "หมดอายุ", cls: "badge-dd badge-warning" },
  REVOKED: { label: "ยกเลิกแล้ว", cls: "badge-dd badge-error" },
};

const dt = (s: string | null) => (s ? new Date(s).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error("คัดลอกไม่ได้ — กดค้างที่ข้อความเพื่อคัดลอกเอง");
  }
}

/**
 * ลิงก์ขอรีวิว — ให้ลูกค้าที่ซื้อนอกเว็บ (หน้าร้าน/Facebook/LINE/TikTok/IG) รีวิวร้านได้
 * สร้างลิงก์ (ชื่อ + สินค้า + ช่องทาง) → ป๊อปอัพแชร์: QR ให้สแกนที่หน้าร้าน · คัดลอกข้อความ · ส่งทาง LINE
 * 1 ลิงก์ = 1 รีวิว · หมดอายุ 30 วัน · ยกเลิกได้ถ้ายังไม่รีวิว
 */
export default function ReviewInviteAdmin() {
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [channel, setChannel] = useState<string>("STORE");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState<InviteRow | null>(null);

  const load = useCallback(() => {
    api.get<InviteRow[]>("/admin/review-invites")
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("โหลดลิงก์รีวิวไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("กรอกชื่อลูกค้า"); return; }
    setCreating(true);
    try {
      const res = await api.post<InviteRow>("/admin/review-invites", {
        customerName: name.trim(), productName: product.trim() || null, channel, note: note.trim() || null,
      });
      setRows((prev) => [res.data, ...prev]);
      setSharing(res.data);
      setName(""); setProduct(""); setNote("");
    } catch (err) {
      toast.error(getApiError(err, "สร้างลิงก์ไม่สำเร็จ"));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (r: InviteRow) => {
    if (!(await confirmDialog({ title: "ยกเลิกลิงก์นี้?", message: `${r.customerName} · ลูกค้าจะเปิดลิงก์แล้วรีวิวไม่ได้`, confirmText: "ยกเลิกลิงก์", danger: true }))) return;
    try {
      await api.post(`/admin/review-invites/${r.id}/revoke`);
      toast.success("ยกเลิกลิงก์แล้ว");
      load();
    } catch (err) { toast.error(getApiError(err, "ยกเลิกไม่สำเร็จ")); }
  };

  const sent = rows.length;
  const opened = rows.filter((r) => r.status === "OPENED" || r.status === "USED").length;
  const reviewed = rows.filter((r) => r.status === "USED").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Send} label="ลิงก์ที่สร้าง" value={sent} unit="ลิงก์" />
        <StatCard icon={MousePointerClick} label="ลูกค้าเปิดแล้ว" value={opened} unit={sent ? `(${Math.round((opened / sent) * 100)}%)` : ""} iconClass="text-info-text" />
        <StatCard icon={Star} label="ได้รีวิวแล้ว" value={reviewed} unit={sent ? `(${Math.round((reviewed / sent) * 100)}%)` : ""} iconClass="text-success-text" />
      </div>

      {/* สร้างลิงก์ */}
      <form onSubmit={create} className="rounded-2xl border border-border-default bg-white p-5">
        <div className="flex items-center gap-2">
          <Link2 size={18} className="text-yellow-hover" />
          <h3 className="font-display text-lg">สร้างลิงก์ขอรีวิว</h3>
        </div>
        <p className="mt-0.5 text-xs text-text-muted">สำหรับลูกค้าที่ซื้อนอกเว็บ — ลูกค้าเปิดลิงก์แล้วรีวิวได้เลยไม่ต้องสมัครสมาชิก · 1 ลิงก์ใช้ได้ 1 ครั้ง ภายใน 30 วัน</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-text-muted">ชื่อลูกค้า *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="เช่น สมชาย" className="input-dd" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-text-muted">สินค้าที่ซื้อ</span>
            <input value={product} onChange={(e) => setProduct(e.target.value)} maxLength={120} placeholder="เช่น iPhone 15 Pro 256GB" className="input-dd" />
          </label>
        </div>

        <fieldset className="mt-3">
          <legend className="mb-1 text-xs font-semibold text-text-muted">ซื้อผ่านช่องทาง *</legend>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
            {INVITE_CHANNELS.map((c) => (
              <button key={c.code} type="button" onClick={() => setChannel(c.code)} aria-pressed={channel === c.code}
                      className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition-colors ${channel === c.code ? "border-yellow bg-yellow-muted text-text-heading" : "border-border-default bg-white text-text-body hover:border-yellow"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-text-muted">โน้ตภายใน (ลูกค้าไม่เห็น)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="เช่น บิลเลขที่ / ผ่อน 12 เดือน" className="input-dd" />
        </label>

        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? <><Loader2 size={16} className="animate-spin" /> กำลังสร้าง</> : <><Link2 size={16} /> สร้างลิงก์ + แชร์</>}
          </button>
        </div>
      </form>

      {/* รายการลิงก์ */}
      <div className="overflow-hidden rounded-2xl border border-border-default bg-white">
        {loading ? <TableSkeleton rows={5} cols={5} /> : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="table-dd">
              <thead><tr><th>ลูกค้า</th><th>ช่องทาง</th><th>สถานะ</th><th>สร้างเมื่อ</th><th className="text-right">จัดการ</th></tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-text-muted">ยังไม่มีลิงก์ขอรีวิว — สร้างลิงก์แรกด้านบนได้เลย</td></tr>
                ) : rows.map((r) => {
                  const live = r.status === "PENDING" || r.status === "OPENED";
                  return (
                    <tr key={r.id}>
                      <td>
                        <p className="font-semibold text-text-heading">{r.customerName}</p>
                        <p className="max-w-[220px] truncate text-xs text-text-muted">{r.productName ?? "—"}{r.note ? ` · ${r.note}` : ""}</p>
                      </td>
                      <td className="text-sm">{channelLabel(r.channel)}</td>
                      <td>
                        <span className={STATUS[r.status].cls}>{STATUS[r.status].label}</span>
                        {r.status === "USED" && r.rating != null && (
                          <p className="mt-1 flex items-center gap-0.5 text-xs font-semibold text-text-heading">
                            {r.rating} <Star size={11} className="fill-yellow text-yellow" />
                          </p>
                        )}
                      </td>
                      <td className="text-xs text-text-muted">{dt(r.createdAt)}<br />โดย {r.createdBy.split("@")[0]}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          {live && (
                            <>
                              <button type="button" onClick={() => setSharing(r)} aria-label="แชร์ลิงก์" title="แชร์ / QR"
                                      className="rounded-lg border border-border-default bg-white p-1.5 text-text-heading hover:border-yellow hover:bg-bg-tinted"><Share2 size={14} /></button>
                              <button type="button" onClick={() => copy(r.url, "คัดลอกลิงก์แล้ว")} aria-label="คัดลอกลิงก์" title="คัดลอกลิงก์"
                                      className="rounded-lg border border-border-default bg-white p-1.5 text-text-heading hover:border-yellow hover:bg-bg-tinted"><Copy size={14} /></button>
                              <button type="button" onClick={() => revoke(r)} aria-label="ยกเลิกลิงก์" title="ยกเลิกลิงก์"
                                      className="rounded-lg border border-error-border bg-error-bg p-1.5 text-error-text hover:bg-error-text hover:text-white"><Ban size={14} /></button>
                            </>
                          )}
                          {r.status === "USED" && <CheckCircle2 size={18} className="text-success-text" aria-label="รีวิวแล้ว" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {sharing && <SharePopup invite={sharing} onClose={() => setSharing(null)} />}
    </div>
  );
}

/** ป๊อปอัพแชร์ลิงก์ — QR กลาง · ลิงก์ · ข้อความพร้อมส่ง · ปุ่ม 3 ช่องเท่ากัน */
function SharePopup({ invite, onClose }: { invite: InviteRow; onClose: () => void }) {
  const [showQr, setShowQr] = useState(invite.channel === "STORE");
  const message = inviteMessage(invite.customerName, invite.productName, invite.url);
  useEscapeKey(true, onClose);

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ text: message }); } catch { /* ผู้ใช้ปิดหน้าแชร์ */ }
    } else {
      copy(message, "คัดลอกข้อความแล้ว");
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={onClose}>
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-[28px] bg-white shadow-[0_32px_80px_rgba(16,24,40,0.28)]"
           onClick={(e) => e.stopPropagation()} style={{ animation: "modal-in 200ms ease" }}>
        <div className="bg-yellow px-6 pb-5 pt-6 text-center">
          <button type="button" onClick={onClose} aria-label="ปิด"
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-text-heading hover:bg-white"><X size={18} /></button>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-success-text"><CheckCircle2 size={26} /></span>
          <h2 id="share-title" className="mt-2 font-display text-xl font-bold text-text-heading">ลิงก์รีวิวของคุณ{invite.customerName.split(/\s+/)[0]}</h2>
          <p className="text-xs text-on-yellow/70">{channelLabel(invite.channel)}{invite.productName ? ` · ${invite.productName}` : ""}</p>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* QR (หน้าร้าน: ให้ลูกค้าสแกนจากจอ) */}
          <div className="flex flex-col items-center">
            {showQr ? (
              <div className="rounded-2xl border border-border-default bg-white p-3">
                <QRCodeSVG value={invite.url} size={176} level="M" marginSize={1} />
              </div>
            ) : (
              <button type="button" onClick={() => setShowQr(true)} className="btn-ghost text-sm"><QrCode size={16} /> แสดง QR ให้ลูกค้าสแกน</button>
            )}
            {showQr && <p className="mt-1.5 text-[11px] text-text-muted">ให้ลูกค้าสแกนด้วยกล้องมือถือ</p>}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-subtle p-1.5 pl-3">
            <p className="min-w-0 flex-1 truncate font-mono text-xs text-text-body">{invite.url}</p>
            <button type="button" onClick={() => copy(invite.url, "คัดลอกลิงก์แล้ว")} className="btn-ghost min-h-0 shrink-0 px-3 py-1.5 text-xs"><Copy size={13} /> คัดลอก</button>
          </div>

          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-text-muted"><Eye size={12} /> ข้อความที่จะส่ง</p>
            <p className="max-h-32 overflow-auto whitespace-pre-line rounded-xl bg-bg-tinted p-3 text-xs leading-relaxed text-text-body">{message}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => copy(message, "คัดลอกข้อความแล้ว — วางในแชทลูกค้าได้เลย")}
                    className="flex flex-col items-center gap-1 rounded-2xl border border-border-default bg-white px-2 py-3 text-xs font-semibold text-text-heading transition-colors hover:border-yellow hover:bg-bg-tinted">
              <Copy size={18} /> คัดลอกข้อความ
            </button>
            <a href={lineShareUrl(message)} target="_blank" rel="noopener noreferrer"
               className="flex flex-col items-center gap-1 rounded-2xl bg-line px-2 py-3 text-xs font-semibold text-white transition-opacity hover:opacity-90">
              <MessageCircle size={18} /> ส่งทาง LINE
            </a>
            <button type="button" onClick={nativeShare}
                    className="flex flex-col items-center gap-1 rounded-2xl border border-border-default bg-white px-2 py-3 text-xs font-semibold text-text-heading transition-colors hover:border-yellow hover:bg-bg-tinted">
              <Share2 size={18} /> แชร์อื่น ๆ
            </button>
          </div>
          <p className="text-center text-[11px] leading-relaxed text-text-muted">
            Facebook / Instagram / TikTok: กด “คัดลอกข้อความ” แล้ววางในแชทลูกค้า
          </p>
        </div>
      </div>
    </div>
  );
}
