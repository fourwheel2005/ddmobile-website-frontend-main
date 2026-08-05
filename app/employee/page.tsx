"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { baht } from "@/lib/money";
import toast from "react-hot-toast";
import { getApiError, getApiStatus } from "@/lib/errorMessage";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { useEscapeKey } from "@/lib/useEscapeKey";
import {
  opsApi, visibleQueues, slaLabel, nextFulfillStatuses, FULFILL_LABEL, ACTION_META,
  type OpsIdentity, type WorkOrder, type Assigned, type QueueMeta,
} from "@/lib/opsApi";
import {
  Loader2, RefreshCw, AlertTriangle, ShieldCheck, X, Hand, Eye, ClipboardList,
  Clock, User, Activity, ChevronRight,
} from "lucide-react";

const ASSIGNED_TABS: { key: Assigned; label: string }[] = [
  { key: "ANY", label: "ทั้งหมด" },
  { key: "UNASSIGNED", label: "ยังไม่มีคนรับ" },
  { key: "MINE", label: "ของฉัน" },
];

const dt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export default function EmployeeWorkbench() {
  const router = useRouter();
  const [identity, setIdentity] = useState<OpsIdentity | null>(null);
  const [booting, setBooting] = useState(true);
  const [denied, setDenied] = useState(false);

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [queue, setQueue] = useState<string>("PAYMENT_REVIEW");
  const [assigned, setAssigned] = useState<Assigned>("ANY");
  const [rows, setRows] = useState<WorkOrder[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(false);

  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);          // มี action กำลังส่ง → disable ปุ่มทั้งหมด กันกดซ้ำ
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [slipHealth, setSlipHealth] = useState<{ configured: boolean; consecutiveAutoFailures: number } | null>(null);

  const queues = useMemo<QueueMeta[]>(
    () => (identity ? visibleQueues(identity.permissions, identity.role) : []),
    [identity]
  );

  // ---- boot: ตัวตน + สิทธิ์ (ORDER_VIEW ขั้นต่ำ) ----
  useEffect(() => {
    (async () => {
      if (!localStorage.getItem("user")) { router.replace("/login?redirect=/employee"); return; }
      try {
        const me = await opsApi.me();
        setIdentity(me);
        const canView = me.role === "ROLE_ADMIN" || me.permissions.includes("ORDER_VIEW");
        if (!canView) { setDenied(true); return; }
        if (me.role === "ROLE_ADMIN") {
          api.get("/admin/slip-verifier-health").then((r) => setSlipHealth(r.data)).catch(() => { /* ไม่ใช่แอดมิน/ปิดไว้ */ });
        }
      } catch (e) {
        if ([401, 403].includes(getApiStatus(e) ?? 0)) { setDenied(true); return; }
        toast.error("โหลดข้อมูลผู้ใช้ไม่สำเร็จ");
      } finally {
        setBooting(false);
      }
    })();
  }, [router]);

  // เดินนาฬิกาทุก 30 วิ ขับ SLA countdown (เบา ๆ พอ)
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const loadCounts = useCallback(() => {
    opsApi.counts().then(setCounts).catch(() => { /* badge หายไม่ critical */ });
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true); setListError(false);
    try {
      const data = await opsApi.list(queue, assigned, 0);
      setRows(data.content);
    } catch {
      setListError(true); setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [queue, assigned]);

  useEffect(() => { if (identity && !denied) { loadCounts(); loadList(); } }, [identity, denied, loadCounts, loadList]);

  // ปิด drawer แล้วคืน blob url (กัน memory leak)
  useEffect(() => () => { if (slipUrl) URL.revokeObjectURL(slipUrl); }, [slipUrl]);
  useEscapeKey(!!selected, () => closeDrawer());

  const refresh = useCallback(() => { loadCounts(); loadList(); }, [loadCounts, loadList]);

  const openDrawer = async (o: WorkOrder) => {
    setSelected(o);
    setSlipUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    if (o.allowedActions.includes("VIEW_SLIP")) {
      try {
        const blob = await opsApi.slipBlob(o.id);
        setSlipUrl(URL.createObjectURL(blob));
      } catch { /* ไม่มีสลิป/โหลดไม่ได้ — โชว์ข้อความแทน */ }
    }
  };
  const closeDrawer = () => {
    setSlipUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setSelected(null);
  };

  /** Claim ก่อน action ที่มี side effect — ถ้าคนอื่นรับแล้ว (409) โชว์ชื่อผู้รับ + refresh, คืน false */
  const ensureClaim = async (o: WorkOrder): Promise<boolean> => {
    if (o.assignedTo && identity && o.assignedTo === identity.email) return true;
    if (o.assignedTo && identity && o.assignedTo !== identity.email) {
      toast.error(`งานนี้ถูกรับโดย ${o.assignedTo} แล้ว`);
      refresh();
      return false;
    }
    try {
      const claimed = await opsApi.claim(o.id, o.version);
      setSelected(claimed);   // อัปเดต version/assignee ล่าสุด
      setRows((rs) => rs.map((r) => (r.id === claimed.id ? claimed : r)));
      return true;
    } catch (e) {
      if (getApiStatus(e) === 409) {
        toast.error(getApiError(e, "มีคนรับงานนี้ไปแล้ว กำลังรีเฟรช"));
        refresh(); closeDrawer();
        return false;
      }
      toast.error(getApiError(e, "รับงานไม่สำเร็จ"));
      return false;
    }
  };

  /** ครอบ action: claim (ถ้าต้อง) → ยืนยัน → ยิง → refresh · disable ระหว่างส่ง กันกดซ้ำ */
  const runAction = async (o: WorkOrder, opts: { claim?: boolean; confirm?: { title: string; message?: string } }, fn: () => Promise<unknown>) => {
    if (busy) return;
    if (opts.confirm && !(await confirmDialog({ ...opts.confirm, confirmText: "ยืนยัน" }))) return;
    setBusy(true);
    try {
      if (opts.claim && !(await ensureClaim(o))) return;
      await fn();
      toast.success("ทำรายการสำเร็จ");
      refresh(); closeDrawer();
    } catch (e) {
      if (getApiStatus(e) === 409) { toast.error(getApiError(e, "สถานะเปลี่ยนไปแล้ว กำลังรีเฟรช")); refresh(); closeDrawer(); }
      else toast.error(getApiError(e, "ทำรายการไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  };

  // ---- render states ----
  if (booting) return <Center><Loader2 size={40} className="animate-spin text-yellow-hover" /></Center>;
  if (denied) return (
    <Center>
      <ShieldCheck size={52} className="mb-4 text-text-disabled" />
      <h1 className="text-xl font-bold text-text-heading">ไม่มีสิทธิ์เข้าถึงหน้าทำงาน</h1>
      <p className="mt-1 text-sm text-text-muted">ต้องมีสิทธิ์ดูออเดอร์ (ORDER_VIEW) — ติดต่อหัวหน้าเพื่อขอสิทธิ์</p>
    </Center>
  );

  const reconCount = counts.RECONCILIATION ?? 0;

  return (
    <div className="min-h-screen bg-bg-base pb-10">
      <div className="container-dd py-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-text-heading"><ClipboardList size={24} className="text-yellow-hover" /> งานของฉัน</h1>
            <p className="text-sm text-text-muted">{identity?.email} · {identity?.role === "ROLE_ADMIN" ? "แอดมิน" : "พนักงาน"}</p>
          </div>
          <button onClick={refresh} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border-default bg-white px-4 text-sm font-semibold text-text-heading hover:bg-bg-subtle">
            <RefreshCw size={16} /> รีเฟรช
          </button>
        </header>

        {/* system health */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <HealthTile
            icon={<AlertTriangle size={18} />} label="งานกระทบยอด"
            value={reconCount > 0 ? `${reconCount} รายการ` : "ปกติ"} alert={reconCount > 0}
          />
          {slipHealth && (
            <HealthTile
              icon={<Activity size={18} />} label="ระบบตรวจสลิป"
              value={!slipHealth.configured ? "ยังไม่ตั้งค่า" : slipHealth.consecutiveAutoFailures >= 3 ? `ล้มเหลว ${slipHealth.consecutiveAutoFailures} ครั้งติด` : "ทำงานปกติ"}
              alert={slipHealth.configured && slipHealth.consecutiveAutoFailures >= 3}
            />
          )}
          <HealthTile icon={<ClipboardList size={18} />} label="งานค้างทั้งหมด" value={`${Object.values(counts).reduce((a, b) => a + b, 0)} รายการ`} alert={false} />
        </div>

        {/* queue chips (permission-aware) */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {queues.map((q) => (
            <button
              key={q.key}
              onClick={() => setQueue(q.key)}
              aria-pressed={queue === q.key}
              className={`inline-flex min-h-[44px] flex-shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${queue === q.key ? "border-yellow bg-yellow text-on-yellow" : "border-border-default bg-white text-text-body hover:bg-bg-subtle"}`}
            >
              {q.label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${queue === q.key ? "bg-on-yellow/20" : "bg-bg-subtle text-text-muted"}`}>{counts[q.key] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* assigned filter */}
        <div className="mb-4 inline-flex rounded-xl border border-border-default bg-bg-subtle p-1">
          {ASSIGNED_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setAssigned(t.key)}
              className={`min-h-[40px] rounded-lg px-3 text-sm font-medium transition-colors ${assigned === t.key ? "bg-white text-text-heading shadow-sm" : "text-text-muted hover:text-text-heading"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* work list */}
        {listLoading ? (
          <Center pad><Loader2 size={32} className="animate-spin text-yellow-hover" /></Center>
        ) : listError ? (
          <EmptyBox icon={<AlertTriangle size={40} />} title="โหลดคิวงานไม่สำเร็จ" hint="ลองรีเฟรชอีกครั้ง" />
        ) : rows.length === 0 ? (
          <EmptyBox icon={<ClipboardList size={40} />} title="ไม่มีงานในคิวนี้" hint="เยี่ยม! เคลียร์หมดแล้ว" />
        ) : (
          <>
            {/* มือถือ: การ์ด */}
            <div className="space-y-3 md:hidden">
              {rows.map((o) => <MobileCard key={o.id} o={o} nowMs={nowMs} onOpen={() => openDrawer(o)} me={identity?.email} />)}
            </div>
            {/* เดสก์ท็อป: ตาราง */}
            <div className="hidden overflow-x-auto rounded-2xl border border-border-default bg-white md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default text-left text-text-muted">
                    <th className="p-3 font-medium">ออเดอร์</th>
                    <th className="p-3 font-medium">ลูกค้า</th>
                    <th className="p-3 font-medium">ยอด</th>
                    <th className="p-3 font-medium">SLA</th>
                    <th className="p-3 font-medium">ผู้รับงาน</th>
                    <th className="p-3 font-medium">ความสำคัญ</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => {
                    const sla = slaLabel(o.dueAt, o.overdue, nowMs);
                    return (
                      <tr key={o.id} className="cursor-pointer border-b border-border-subtle last:border-0 hover:bg-bg-subtle" onClick={() => openDrawer(o)}
                        tabIndex={0} role="button" onKeyDown={(e) => { if (e.key === "Enter") openDrawer(o); }}>
                        <td className="p-3 font-semibold text-text-heading">#{o.id}</td>
                        <td className="p-3 text-text-body">{o.customerName} <span className="text-text-muted">{o.customerTelMasked}</span></td>
                        <td className="p-3 font-medium text-price">{baht(o.total)}</td>
                        <td className="p-3"><SlaBadge sla={sla} /></td>
                        <td className="p-3 text-text-muted">{o.assignedTo ? (o.assignedTo === identity?.email ? "ฉัน" : o.assignedTo) : "—"}</td>
                        <td className="p-3">{o.priority && o.priority !== "NORMAL" ? <span className="badge-dd badge-warning">{o.priority}</span> : <span className="text-text-muted">ปกติ</span>}</td>
                        <td className="p-3 text-right"><ChevronRight size={16} className="text-text-disabled" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* detail drawer */}
      {selected && (
        <Drawer o={selected} me={identity?.email} slipUrl={slipUrl} nowMs={nowMs} busy={busy}
          onClose={closeDrawer}
          onConfirm={() => runAction(selected, { claim: true, confirm: { title: `ยืนยันคำสั่งซื้อ #${selected.id}?`, message: `ยอด ${baht(selected.total)} — จะตัดสต็อกและออกบิลจริง` } }, () => opsApi.confirm(selected.id))}
          onReject={() => runAction(selected, { claim: true, confirm: { title: `ปฏิเสธคำสั่งซื้อ #${selected.id}?`, message: "สินค้าที่จองไว้จะถูกปล่อยคืน" } }, () => opsApi.reject(selected.id))}
          onFulfill={(status, partner, tracking) => runAction(selected, { claim: true }, () => opsApi.fulfillment(selected.id, status, partner, tracking))}
          onResolve={(bill) => runAction(selected, { claim: true, confirm: { title: `ปิดงานกระทบยอด #${selected.id}?`, message: bill ? `ยืนยันด้วยเลขบิล ${bill}` : "ไม่พบบิล — คืนสถานะให้ยืนยันใหม่" } }, () => opsApi.resolve(selected.id, bill))}
          onRefund={(amount, reason) => runAction(selected, { claim: true, confirm: { title: `ขอคืนเงิน #${selected.id}?`, message: `${amount != null ? baht(amount) : "เต็มจำนวน"} — เข้าคิวรออนุมัติ (ไม่แตะเงินทันที)` } }, () => opsApi.refundRequest(selected.id, amount, reason))}
        />
      )}
    </div>
  );
}

/* ---------- ชิ้นส่วนย่อย ---------- */

function Center({ children, pad }: { children: React.ReactNode; pad?: boolean }) {
  return <div className={`flex ${pad ? "py-20" : "min-h-screen"} flex-col items-center justify-center bg-bg-base px-4 text-center`}>{children}</div>;
}
function EmptyBox({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-default bg-bg-subtle py-20 text-center">
      <div className="mx-auto mb-3 text-text-disabled">{icon}</div>
      <h3 className="text-lg font-bold text-text-heading">{title}</h3>
      <p className="mt-1 text-sm text-text-muted">{hint}</p>
    </div>
  );
}
function HealthTile({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: string; alert: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${alert ? "border-error-border bg-error-bg" : "border-border-default bg-white"}`}>
      <span className={alert ? "text-error-text" : "text-text-muted"}>{icon}</span>
      <div><p className="text-xs text-text-muted">{label}</p><p className={`text-sm font-bold ${alert ? "text-error-text" : "text-text-heading"}`}>{value}</p></div>
    </div>
  );
}
function SlaBadge({ sla }: { sla: ReturnType<typeof slaLabel> }) {
  const cls = sla.level === "overdue" ? "badge-error" : sla.level === "soon" ? "badge-warning" : sla.level === "ok" ? "badge-success" : "bg-bg-subtle text-text-muted";
  return <span className={`badge-dd ${cls}`}><Clock size={11} /> {sla.text}</span>;
}
function MobileCard({ o, nowMs, onOpen, me }: { o: WorkOrder; nowMs: number; onOpen: () => void; me?: string }) {
  const sla = slaLabel(o.dueAt, o.overdue, nowMs);
  return (
    <button onClick={onOpen} className="w-full rounded-2xl border border-border-default bg-white p-4 text-left transition-colors hover:bg-bg-subtle">
      <div className="flex items-center justify-between">
        <span className="font-bold text-text-heading">#{o.id}</span>
        <SlaBadge sla={sla} />
      </div>
      <p className="mt-1 text-sm text-text-body">{o.customerName} <span className="text-text-muted">{o.customerTelMasked}</span></p>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-semibold text-price">{baht(o.total)}</span>
        <span className="flex items-center gap-1 text-xs text-text-muted"><User size={12} /> {o.assignedTo ? (o.assignedTo === me ? "ฉัน" : o.assignedTo) : "ยังไม่มีคนรับ"}</span>
      </div>
    </button>
  );
}

function Drawer({
  o, me, slipUrl, nowMs, busy, onClose, onConfirm, onReject, onFulfill, onResolve, onRefund,
}: {
  o: WorkOrder; me?: string; slipUrl: string | null; nowMs: number; busy: boolean;
  onClose: () => void; onConfirm: () => void; onReject: () => void;
  onFulfill: (status: string, partner?: string, tracking?: string) => void;
  onResolve: (bill: string) => void; onRefund: (amount: number | null, reason: string) => void;
}) {
  const [form, setForm] = useState<null | "fulfill" | "refund" | "resolve">(null);
  const [fStatus, setFStatus] = useState("");
  const [partner, setPartner] = useState("");
  const [tracking, setTracking] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [bill, setBill] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); }, []);

  const sla = slaLabel(o.dueAt, o.overdue, nowMs);
  const nexts = nextFulfillStatuses(o.status, o.delivery);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`รายละเอียดออเดอร์ ${o.id}`}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border-default p-4">
          <h2 className="text-lg font-bold text-text-heading">ออเดอร์ #{o.id}</h2>
          <button ref={closeRef} onClick={onClose} aria-label="ปิด" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-bg-subtle"><X size={20} /></button>
        </div>

        <div className="flex-1 space-y-4 p-4">
          {/* หลักฐาน + ข้อมูล */}
          <dl className="space-y-2 text-sm">
            <Row k="สถานะ" v={o.status} />
            <Row k="ลูกค้า" v={`${o.customerName} · ${o.customerTelMasked}`} />
            <Row k="ยอด" v={<span className="font-bold text-price">{baht(o.total)}</span>} />
            <Row k="ชำระ/รับของ" v={`${o.paymentMethod} · ${o.delivery ? "จัดส่ง" : "รับที่ร้าน"}`} />
            <Row k="สร้างเมื่อ" v={dt(o.createdAt)} />
            <Row k="SLA" v={<SlaBadge sla={sla} />} />
            <Row k="ผู้รับงาน" v={o.assignedTo ? (o.assignedTo === me ? "ฉัน" : o.assignedTo) : "ยังไม่มีคนรับ"} />
          </dl>

          {o.allowedActions.includes("VIEW_SLIP") && (
            <div>
              <p className="mb-1 text-sm font-semibold text-text-heading">สลิปการโอน</p>
              {slipUrl ? (
                // blob เท่านั้น — ไม่เปิด URL สาธารณะ (S14 visual verification)
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slipUrl} alt="สลิปการโอนเงิน" className="w-full rounded-xl border border-border-default" />
              ) : (
                <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-text-muted">ยังไม่มีสลิป หรือกำลังโหลด…</p>
              )}
            </div>
          )}
        </div>

        {/* action panel — เฉพาะ allowedActions จาก server */}
        <div className="sticky bottom-0 space-y-2 border-t border-border-default bg-white p-4">
          {form === "fulfill" ? (
            <div className="space-y-2">
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="input-dd min-h-[44px] w-full text-sm">
                <option value="">— เลือกสถานะถัดไป —</option>
                {nexts.map((s) => <option key={s} value={s}>{FULFILL_LABEL[s] ?? s}</option>)}
              </select>
              {fStatus === "SHIPPED" && (
                <>
                  <input value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="ขนส่ง (เช่น Kerry, ไปรษณีย์)" className="input-dd min-h-[44px] w-full text-sm" />
                  <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="เลขพัสดุ *" className="input-dd min-h-[44px] w-full text-sm" />
                </>
              )}
              <div className="flex gap-2">
                <button disabled={busy || !fStatus || (fStatus === "SHIPPED" && !tracking.trim())} onClick={() => onFulfill(fStatus, partner || undefined, tracking || undefined)} className="btn-primary min-h-[44px] flex-1 disabled:opacity-50">บันทึก</button>
                <button onClick={() => setForm(null)} className="btn-secondary min-h-[44px]">ยกเลิก</button>
              </div>
            </div>
          ) : form === "refund" ? (
            <div className="space-y-2">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="ยอดคืน (เว้นว่าง = เต็มจำนวน)" className="input-dd min-h-[44px] w-full text-sm" />
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เหตุผลการคืนเงิน *" className="input-dd min-h-[44px] w-full text-sm" />
              <div className="flex gap-2">
                <button disabled={busy || !reason.trim()} onClick={() => onRefund(amount.trim() ? Number(amount) : null, reason.trim())} className="btn-primary min-h-[44px] flex-1 disabled:opacity-50">ส่งคำขอ</button>
                <button onClick={() => setForm(null)} className="btn-secondary min-h-[44px]">ยกเลิก</button>
              </div>
            </div>
          ) : form === "resolve" ? (
            <div className="space-y-2">
              <input value={bill} onChange={(e) => setBill(e.target.value)} placeholder="เลขบิลใน Stock (เว้นว่าง = ไม่พบบิล)" className="input-dd min-h-[44px] w-full text-sm" />
              <div className="flex gap-2">
                <button disabled={busy} onClick={() => onResolve(bill.trim())} className="btn-primary min-h-[44px] flex-1 disabled:opacity-50">ปิดงาน</button>
                <button onClick={() => setForm(null)} className="btn-secondary min-h-[44px]">ยกเลิก</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {o.allowedActions.filter((a) => a !== "VIEW_SLIP").map((a) => {
                const meta = ACTION_META[a];
                if (!meta) return null;
                const onClick =
                  a === "CONFIRM" ? onConfirm : a === "REJECT" ? onReject
                  : meta.form ? () => setForm(meta.form!) : () => {};
                return (
                  <button key={a} disabled={busy} onClick={onClick}
                    className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold disabled:opacity-50 ${meta.danger ? "bg-error-bg text-error-text hover:bg-error-border/30" : "bg-yellow text-on-yellow hover:bg-yellow-hover"}`}>
                    {busy && <Loader2 size={14} className="animate-spin" />} {meta.label}
                  </button>
                );
              })}
              {o.allowedActions.filter((a) => a !== "VIEW_SLIP").length === 0 && (
                <p className="col-span-2 flex items-center gap-1.5 text-xs text-text-muted"><Eye size={13} /> ดูอย่างเดียว — ไม่มี action ที่คุณทำได้ในสถานะ/สิทธิ์นี้</p>
              )}
            </div>
          )}
          {!o.assignedTo && !form && (
            <p className="flex items-center gap-1.5 text-[11px] text-text-muted"><Hand size={12} /> ระบบจะ “รับงาน” ให้อัตโนมัติเมื่อคุณกดทำรายการ</p>
          )}
        </div>
      </div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><dt className="text-text-muted">{k}</dt><dd className="text-right font-medium text-text-heading">{v}</dd></div>;
}
