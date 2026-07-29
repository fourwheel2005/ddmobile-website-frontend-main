"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { AnimatePresence, motion } from "framer-motion";
import {
  Users, Search, ShieldAlert, ShieldCheck, ShieldOff, History, X,
  CheckCircle2, AlertTriangle, Loader2, MailWarning, Flag,
} from "lucide-react";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/Skeletons";
import { useEscapeKey } from "@/lib/useEscapeKey";

/**
 * จัดการลูกค้า + ระงับบัญชี + คิวเฝ้าระวังพฤติกรรมน่าสงสัย
 *
 * คู่กับ backend `/admin/accounts/**` (AdminModerationController):
 * - ระบบยกธงให้ตรวจเท่านั้น ไม่ระงับเอง — คนตัดสินคือแอดมินผ่านหน้านี้
 * - เหตุผลบังคับ 10-500 ตัวอักษร (ตรงกับราวกันตกฝั่ง server) เก็บเป็น audit และแจ้งลูกค้า
 * - ระงับมีผลทันที (token เดิมถูกตัดกลางอากาศ) · ปลดระงับได้เสมอ
 */

interface Customer {
  id: number;
  name: string | null;
  email: string;
  role: string;
  status: string; // ACTIVE | SUSPENDED
}

interface AccountFlag {
  id: number;
  userEmail: string;
  type: string;
  severity: string; // LOW | MEDIUM | HIGH
  detail: string;
  occurrences: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  resolved: boolean;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
}

interface AccountAction {
  id: number;
  userEmail: string;
  action: string; // SUSPEND | UNSUSPEND | WARN
  reason: string;
  adminEmail: string;
  createdAt: string | null;
}

/** ป้ายภาษาไทยของสัญญาณ — ต้องตรงกับ FlagType ฝั่ง backend */
const FLAG_LABEL: Record<string, string> = {
  DUPLICATE_SLIP: "สลิปซ้ำ (ถูกใช้ไปแล้ว)",
  REPEATED_SLIP_FAILURE: "แนบสลิปไม่ผ่านซ้ำ ๆ",
  REPEATED_ABANDONED_ORDER: "ปล่อยออเดอร์หมดเวลาซ้ำ ๆ",
  REPEATED_ADMIN_REJECTION: "ถูกปฏิเสธออเดอร์ซ้ำ ๆ",
};

const SEVERITY_BADGE: Record<string, { label: string; cls: string }> = {
  HIGH: { label: "สูง", cls: "badge-error" },
  MEDIUM: { label: "กลาง", cls: "badge-warning" },
  LOW: { label: "ต่ำ", cls: "badge-info" },
};

const ACTION_BADGE: Record<string, { label: string; cls: string }> = {
  SUSPEND: { label: "ระงับบัญชี", cls: "badge-error" },
  UNSUSPEND: { label: "ปลดระงับ", cls: "badge-success" },
  WARN: { label: "ส่งคำเตือน", cls: "badge-warning" },
};

const RESOLUTION_LABEL: Record<string, string> = {
  DISMISSED: "ปิดเรื่อง (ไม่พบปัญหา)",
  WARNED: "เตือนแล้ว",
  SUSPENDED: "ระงับแล้ว",
};

// ต้องตรงกับ MIN/MAX_REASON_LENGTH ฝั่ง AccountModerationService — เช็คฝั่งนี้เพื่อ UX
// (บอกก่อนกดส่ง) ส่วนของจริงบังคับซ้ำที่ server เสมอ
const REASON_MIN = 10;
const REASON_MAX = 500;

type ModerationMode = "suspend" | "unsuspend" | "warn";

const MODE_TEXT: Record<ModerationMode, { title: string; verb: string; placeholder: string; danger: boolean }> = {
  suspend: {
    title: "ระงับบัญชีลูกค้า",
    verb: "ยืนยันระงับบัญชี",
    placeholder: "เหตุผลที่ระงับ เช่น แนบสลิปปลอมซ้ำหลายครั้งหลังได้รับคำเตือนแล้ว",
    danger: true,
  },
  unsuspend: {
    title: "ปลดระงับบัญชี",
    verb: "ยืนยันปลดระงับ",
    placeholder: "เหตุผลที่ปลด เช่น ตรวจสอบแล้วเป็นความเข้าใจผิด ลูกค้าติดต่อชี้แจงแล้ว",
    danger: false,
  },
  warn: {
    title: "ส่งคำเตือนถึงลูกค้า",
    verb: "ส่งคำเตือน",
    placeholder: "ข้อความเตือนที่ลูกค้าจะได้รับ เช่น กรุณาแนบสลิปของตัวเองเท่านั้น หากพบซ้ำจะระงับบัญชี",
    danger: false,
  },
};

function fmtDate(s: string | null): string {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function CustomerModeration({ onFlagCount }: { onFlagCount?: (n: number) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [flags, setFlags] = useState<AccountFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // โมดัลสั่งการ (ระงับ/ปลด/เตือน) + เหตุผล
  const [modal, setModal] = useState<{ mode: ModerationMode; email: string } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  // โมดัลประวัติ (ธง + การกระทำของแอดมิน)
  const [historyOf, setHistoryOf] = useState<string | null>(null);
  const [history, setHistory] = useState<{ flags: AccountFlag[]; actions: AccountAction[] } | null>(null);

  useEscapeKey(modal !== null, () => setModal(null));
  useEscapeKey(historyOf !== null, () => setHistoryOf(null));

  const refresh = useCallback(async () => {
    try {
      const [custRes, flagRes] = await Promise.all([
        api.get<Customer[]>("/admin/customers"),
        api.get<AccountFlag[]>("/admin/accounts/flags"),
      ]);
      setCustomers(custRes.data);
      setFlags(flagRes.data);
      onFlagCount?.(flagRes.data.length);
    } catch (error: unknown) {
      toast.error(getApiError(error, "โหลดข้อมูลลูกค้าไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }, [onFlagCount]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(c =>
      c.email.toLowerCase().includes(query) || (c.name ?? "").toLowerCase().includes(query));
  }, [customers, q]);

  const suspendedCount = useMemo(() => customers.filter(c => c.status === "SUSPENDED").length, [customers]);

  /** เปิดโมดัลสั่งการ — ล้างเหตุผลเดิมทุกครั้ง กันเหตุผลของคนก่อนติดไปคนถัดไป */
  const openModal = (mode: ModerationMode, email: string) => {
    setReason("");
    setModal({ mode, email });
  };

  const submitModeration = async () => {
    if (!modal) return;
    const clean = reason.trim();
    if (clean.length < REASON_MIN) {
      toast.error(`กรุณาระบุเหตุผลอย่างน้อย ${REASON_MIN} ตัวอักษร`);
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ message: string }>(`/admin/accounts/${modal.mode}`, {
        userEmail: modal.email,
        reason: clean,
      });
      toast.success(res.data.message || "ดำเนินการแล้ว");
      setModal(null);
      await refresh();
    } catch (error: unknown) {
      toast.error(getApiError(error, "ดำเนินการไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  };

  const dismissFlag = async (id: number) => {
    try {
      await api.post(`/admin/accounts/flags/${id}/dismiss`);
      toast.success("ปิดรายการแล้ว (ไม่พบปัญหา)");
      await refresh();
    } catch (error: unknown) {
      toast.error(getApiError(error, "ปิดรายการไม่สำเร็จ"));
    }
  };

  const openHistory = async (email: string) => {
    setHistoryOf(email);
    setHistory(null);
    try {
      const res = await api.get<{ flags: AccountFlag[]; actions: AccountAction[] }>(
        `/admin/accounts/${encodeURIComponent(email)}/history`);
      setHistory(res.data);
    } catch (error: unknown) {
      toast.error(getApiError(error, "โหลดประวัติไม่สำเร็จ"));
      setHistoryOf(null);
    }
  };

  const statusOf = (email: string) => customers.find(c => c.email === email)?.status;

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">

      {/* ============ คิวเฝ้าระวัง — สัญญาณที่ระบบตรวจพบ รอแอดมินตัดสิน ============ */}
      <div className="overflow-hidden rounded-2xl border border-border-default bg-white">
        <div className="flex items-center justify-between border-b border-border-default bg-bg-surface p-4">
          <h2 className="flex items-center gap-2 font-display text-xl">
            <Flag className="text-yellow" size={20} /> คิวเฝ้าระวัง (รอตรวจสอบ)
          </h2>
          <span className={`badge-dd ${flags.length > 0 ? "badge-error" : "badge-success"}`}>
            {flags.length > 0 ? `${flags.length} รายการ` : "ไม่มีรายการค้าง"}
          </span>
        </div>
        {flags.length === 0 ? (
          <p className="p-8 text-center text-sm text-text-muted">
            ไม่มีสัญญาณผิดปกติที่รอตรวจ — ระบบจะยกธงอัตโนมัติเมื่อพบ เช่น สลิปซ้ำ / แนบสลิปไม่ผ่านหลายครั้ง
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dd">
              <thead>
                <tr><th>ลูกค้า</th><th>สัญญาณ</th><th>ระดับ</th><th>รายละเอียด</th><th>พบล่าสุด</th><th className="text-right">การจัดการ</th></tr>
              </thead>
              <tbody>
                {flags.map((f) => {
                  const sev = SEVERITY_BADGE[f.severity] ?? SEVERITY_BADGE.LOW;
                  const suspended = statusOf(f.userEmail) === "SUSPENDED";
                  return (
                    <tr key={f.id} className="group">
                      <td>
                        <button onClick={() => openHistory(f.userEmail)} className="font-semibold text-text-heading underline-offset-2 hover:underline" title="ดูประวัติทั้งหมด">
                          {f.userEmail}
                        </button>
                      </td>
                      <td className="whitespace-nowrap">{FLAG_LABEL[f.type] ?? f.type}{f.occurrences > 1 && <span className="ml-1.5 rounded-full bg-bg-tinted px-2 py-0.5 text-[11px] font-bold">×{f.occurrences}</span>}</td>
                      <td><span className={`badge-dd ${sev.cls}`}>{sev.label}</span></td>
                      <td className="max-w-72 text-xs text-text-muted">{f.detail}</td>
                      <td className="whitespace-nowrap text-xs text-text-muted">{fmtDate(f.lastSeenAt)}</td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => dismissFlag(f.id)} className="btn-ghost !min-h-0 !px-2.5 !py-1.5 !text-xs" title="ตรวจแล้วไม่พบปัญหา — ปิดเรื่องโดยไม่ลงโทษ">
                            <CheckCircle2 size={14} /> ไม่พบปัญหา
                          </button>
                          <button onClick={() => openModal("warn", f.userEmail)} className="btn-secondary !min-h-0 !px-2.5 !py-1.5 !text-xs" title="ส่งคำเตือนถึงลูกค้า (ขั้นก่อนระงับ)">
                            <MailWarning size={14} /> เตือน
                          </button>
                          {suspended ? (
                            <button onClick={() => openModal("unsuspend", f.userEmail)} className="btn-secondary !min-h-0 !px-2.5 !py-1.5 !text-xs">
                              <ShieldCheck size={14} /> ปลดระงับ
                            </button>
                          ) : (
                            <button onClick={() => openModal("suspend", f.userEmail)} className="inline-flex items-center gap-1 rounded-lg border border-error-text/40 px-2.5 py-1.5 text-xs font-semibold text-error-text transition-colors hover:bg-error-bg" title="ระงับบัญชี — มีผลทันที">
                              <ShieldOff size={14} /> ระงับ
                            </button>
                          )}
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

      {/* ============ รายชื่อลูกค้า + สถานะจริง + ปุ่มจัดการ ============ */}
      <div className="overflow-hidden rounded-2xl border border-border-default bg-white">
        <div className="flex items-center justify-between border-b border-border-default bg-bg-surface p-4">
          <h2 className="flex items-center gap-2 font-display text-xl"><Users className="text-yellow" size={20} /> รายชื่อลูกค้าทั้งหมด</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาอีเมล / ชื่อ..." aria-label="ค้นหาลูกค้า" className="input-dd min-h-0 w-48 py-2 pl-9 text-sm" />
            </div>
            {suspendedCount > 0 && <span className="badge-dd badge-error"><ShieldOff size={12} /> ถูกระงับ {suspendedCount}</span>}
            <span className="badge-dd badge-warning">{filtered.length} คน</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-dd">
            <thead>
              <tr><th>รหัสลูกค้า</th><th>บัญชี (Email)</th><th>สถานะบัญชี</th><th className="text-right">การจัดการ</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-text-muted">ไม่พบลูกค้าที่ค้นหา</td></tr>
              ) : (
                filtered.map((c) => {
                  const suspended = c.status === "SUSPENDED";
                  return (
                    <tr key={c.id} className="group">
                      <td className="text-text-muted">CUST-{c.id.toString().padStart(4, "0")}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full font-display text-base font-bold uppercase ${suspended ? "bg-error-bg text-error-text" : "bg-bg-tinted text-yellow-text"}`}>
                            {c.email.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-text-heading">{c.email}</p>
                            {c.name && <p className="text-xs text-text-muted">{c.name}</p>}
                          </div>
                        </div>
                      </td>
                      <td>
                        {suspended ? (
                          <span className="badge-dd badge-error"><ShieldOff size={12} /> ถูกระงับ</span>
                        ) : (
                          <span className="badge-dd badge-success"><CheckCircle2 size={12} /> ปกติ (Active)</span>
                        )}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => openHistory(c.email)} className="btn-ghost !min-h-0 !px-2.5 !py-1.5 !text-xs" title="ประวัติสัญญาณ + การจัดการ">
                            <History size={14} /> ประวัติ
                          </button>
                          {suspended ? (
                            <button onClick={() => openModal("unsuspend", c.email)} className="btn-secondary !min-h-0 !px-2.5 !py-1.5 !text-xs">
                              <ShieldCheck size={14} /> ปลดระงับ
                            </button>
                          ) : (
                            <>
                              <button onClick={() => openModal("warn", c.email)} className="btn-secondary !min-h-0 !px-2.5 !py-1.5 !text-xs" title="ส่งคำเตือน (ขั้นก่อนระงับ)">
                                <MailWarning size={14} /> เตือน
                              </button>
                              <button onClick={() => openModal("suspend", c.email)} className="inline-flex items-center gap-1 rounded-lg border border-error-text/40 px-2.5 py-1.5 text-xs font-semibold text-error-text transition-colors hover:bg-error-bg" title="ระงับบัญชี — ล็อกอินไม่ได้และ token เดิมใช้ไม่ได้ทันที">
                                <ShieldOff size={14} /> ระงับ
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ โมดัลสั่งการ: เหตุผลบังคับ (ตรงกับราวกันตกฝั่ง server) ============ */}
      <AnimatePresence>
        {modal && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={MODE_TEXT[modal.mode].title} onClick={() => !busy && setModal(null)}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="modal-dd" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setModal(null)} className="modal-close" aria-label="ปิด"><X size={20} /></button>
              <h2 className="card-title flex items-center gap-2">
                {modal.mode === "suspend" && <ShieldOff size={20} className="text-error-text" />}
                {modal.mode === "unsuspend" && <ShieldCheck size={20} className="text-success-text" />}
                {modal.mode === "warn" && <MailWarning size={20} className="text-warning-text" />}
                {MODE_TEXT[modal.mode].title}
              </h2>
              <p className="mt-1 text-sm text-text-muted">บัญชี: <span className="font-semibold text-text-heading">{modal.email}</span></p>

              {modal.mode === "suspend" && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-error-bg p-3 text-xs text-error-text">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>มีผลทันที: ลูกค้าจะล็อกอินไม่ได้ และ session ที่ค้างอยู่จะถูกตัดกลางอากาศ · ระบบจะแจ้งเหตุผลนี้ให้ลูกค้าทราบ</span>
                </div>
              )}

              <div className="mt-4">
                <label htmlFor="mod-reason" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {modal.mode === "warn" ? "ข้อความเตือน *" : "เหตุผล *"} ({REASON_MIN}-{REASON_MAX} ตัวอักษร — ลูกค้าจะเห็นข้อความนี้)
                </label>
                <textarea
                  id="mod-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={REASON_MAX}
                  rows={3}
                  autoFocus
                  className="input-dd resize-none"
                  placeholder={MODE_TEXT[modal.mode].placeholder}
                />
                <p className={`mt-1 text-right text-[11px] ${reason.trim().length < REASON_MIN ? "text-text-muted" : "text-success-text"}`}>
                  {reason.trim().length}/{REASON_MAX}
                </p>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setModal(null)} disabled={busy} className="btn-ghost">ยกเลิก</button>
                <button
                  onClick={submitModeration}
                  disabled={busy || reason.trim().length < REASON_MIN}
                  className={MODE_TEXT[modal.mode].danger ? "inline-flex items-center gap-2 rounded-full bg-error-text px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0" : "btn-primary"}
                >
                  {busy ? <><Loader2 size={16} className="animate-spin" /> กำลังดำเนินการ</> : MODE_TEXT[modal.mode].verb}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============ โมดัลประวัติ: ธงทั้งหมด + การกระทำของแอดมิน (audit) ============ */}
      <AnimatePresence>
        {historyOf && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="ประวัติบัญชี" onClick={() => setHistoryOf(null)}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="modal-dd !max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setHistoryOf(null)} className="modal-close" aria-label="ปิด"><X size={20} /></button>
              <h2 className="card-title flex items-center gap-2"><History size={20} className="text-yellow" /> ประวัติบัญชี</h2>
              <p className="mt-1 text-sm text-text-muted">{historyOf}</p>

              {!history ? (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-text-muted"><Loader2 size={16} className="animate-spin" /> กำลังโหลด...</div>
              ) : (
                <div className="mt-4 max-h-[60vh] space-y-5 overflow-y-auto pr-1">
                  <section>
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-text-heading"><ShieldAlert size={15} className="text-warning-text" /> การจัดการโดยแอดมิน ({history.actions.length})</h3>
                    {history.actions.length === 0 ? (
                      <p className="text-xs text-text-muted">ยังไม่เคยถูกจัดการ</p>
                    ) : (
                      <ul className="space-y-2">
                        {history.actions.map((a) => {
                          const badge = ACTION_BADGE[a.action] ?? { label: a.action, cls: "badge-info" };
                          return (
                            <li key={a.id} className="rounded-lg border border-border-default bg-bg-subtle p-3 text-xs">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`badge-dd ${badge.cls}`}>{badge.label}</span>
                                <span className="text-text-muted">{fmtDate(a.createdAt)} · โดย {a.adminEmail}</span>
                              </div>
                              <p className="mt-1.5 text-text-heading">{a.reason}</p>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-text-heading"><Flag size={15} className="text-warning-text" /> สัญญาณเฝ้าระวัง ({history.flags.length})</h3>
                    {history.flags.length === 0 ? (
                      <p className="text-xs text-text-muted">ไม่เคยมีสัญญาณผิดปกติ</p>
                    ) : (
                      <ul className="space-y-2">
                        {history.flags.map((f) => {
                          const sev = SEVERITY_BADGE[f.severity] ?? SEVERITY_BADGE.LOW;
                          return (
                            <li key={f.id} className="rounded-lg border border-border-default bg-bg-subtle p-3 text-xs">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`badge-dd ${sev.cls}`}>{sev.label}</span>
                                <span className="font-semibold text-text-heading">{FLAG_LABEL[f.type] ?? f.type}</span>
                                {f.occurrences > 1 && <span className="rounded-full bg-bg-tinted px-2 py-0.5 text-[11px] font-bold">×{f.occurrences}</span>}
                                <span className="text-text-muted">พบล่าสุด {fmtDate(f.lastSeenAt)}</span>
                              </div>
                              <p className="mt-1.5 text-text-muted">{f.detail}</p>
                              {f.resolved && (
                                <p className="mt-1 text-success-text">
                                  ✓ {RESOLUTION_LABEL[f.resolution ?? ""] ?? f.resolution} · {fmtDate(f.resolvedAt)} โดย {f.resolvedBy}
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
