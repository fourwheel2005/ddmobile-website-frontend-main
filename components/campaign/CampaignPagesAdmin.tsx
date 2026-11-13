"use client";
import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Info, Loader2, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { SLUG_RE, publicPath, toSlug, type AdminCampaign, type CampaignSummary } from "@/lib/campaign";
import CampaignEditor from "./CampaignEditor";

const MAX_PAGES = 200;

export function publicUrl(slug: string): string {
  return typeof window === "undefined" ? publicPath(slug) : `${window.location.origin}${publicPath(slug)}`;
}

export async function copyLink(slug: string) {
  try {
    await navigator.clipboard.writeText(publicUrl(slug));
    toast.success("คัดลอกลิงก์แล้ว — นำไปแปะในโฆษณาได้เลย");
  } catch {
    toast.error("คัดลอกไม่สำเร็จ — กดค้างที่ลิงก์แล้วคัดลอกเอง");
  }
}

/**
 * หน้า Landing ยิงแอด — 1 แอด/คลิป = 1 หน้า (/p/ชื่อ) แปะลิงก์ในโฆษณา
 * สร้าง → ได้ layout ตัวอย่างครบ → อัปคลิป/รูปรีวิว ตั้งปุ่ม → เผยแพร่ → คัดลอกลิงก์
 */
export default function CampaignPagesAdmin() {
  const [pages, setPages] = useState<CampaignSummary[] | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    api.get<CampaignSummary[]>("/admin/campaign-pages")
      .then((r) => setPages(Array.isArray(r.data) ? r.data : []))
      .catch((e) => { toast.error(getApiError(e, "โหลดรายการหน้าไม่สำเร็จ")); setPages([]); });
  }, []);
  useEffect(load, [load]);

  const slugOk = SLUG_RE.test(slug) && slug.length >= 2;

  const create = async () => {
    if (!title.trim() || !slugOk) return;
    setCreating(true);
    try {
      const res = await api.post<AdminCampaign>("/admin/campaign-pages", { title: title.trim(), slug });
      toast.success("สร้างหน้าแล้ว — มี layout ตัวอย่างให้แก้ต่อ");
      setTitle("");
      setSlug("");
      setEditing(res.data.id);
    } catch (e) {
      toast.error(getApiError(e, "สร้างหน้าไม่สำเร็จ"));
    } finally {
      setCreating(false);
    }
  };

  const remove = async (p: CampaignSummary) => {
    if (!(await confirmDialog({
      title: `ลบหน้า "${p.title}"?`,
      message: `ลิงก์ ${publicPath(p.slug)} จะใช้ไม่ได้ทันที (แอดที่แปะลิงก์นี้อยู่จะพาลูกค้าไปหน้าไม่พบ) · คลิปและรูป ${p.mediaCount} ไฟล์ถูกลบจากเซิร์ฟเวอร์`,
      confirmText: "ลบหน้า", danger: true,
    }))) return;
    try {
      await api.delete(`/admin/campaign-pages/${p.id}`);
      setPages((l) => (l ?? []).filter((x) => x.id !== p.id));
      toast.success("ลบหน้าแล้ว");
    } catch (e) {
      toast.error(getApiError(e, "ลบไม่สำเร็จ"));
    }
  };

  if (editing != null) {
    return <CampaignEditor id={editing} onClose={() => { setEditing(null); load(); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-default bg-white p-4">
        <Megaphone className="text-yellow-hover" size={20} />
        <h2 className="font-display text-xl">หน้า Landing ยิงแอด</h2>
        <span className="badge-dd badge-warning tabular-nums">{pages?.length ?? 0}/{MAX_PAGES} หน้า</span>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-border-default bg-white p-4 md:p-5">
        <p className="font-semibold text-text-heading">สร้างหน้าใหม่ (1 แอด = 1 หน้า)</p>
        <p className="mt-0.5 flex items-start gap-1 text-xs text-text-muted">
          <Info size={12} className="mt-0.5 shrink-0" />
          หน้าใหม่เป็น &quot;ร่าง&quot; พร้อม layout ตัวอย่าง (ปุ่มทักไลน์ · บริการ 6 อย่าง · รีวิวร้าน · FAQ) — แก้ข้อความ อัปคลิป/รูปรีวิว แล้วกดเผยแพร่
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-text-heading">ชื่อหน้า <span className="font-normal text-text-muted">(ลูกค้าเห็นในแท็บ/การ์ดลิงก์)</span></span>
            <input value={title} maxLength={100} onChange={(e) => {
              setTitle(e.target.value);
              if (!slug || slug === toSlug(title)) setSlug(toSlug(e.target.value));
            }} className="input-dd" placeholder="เช่น โปรผ่อน iPhone 16 ไม่ใช้บัตรเครดิต" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-text-heading">ลิงก์ <span className="font-normal text-text-muted">(a-z 0-9 - เท่านั้น)</span></span>
            <span className="flex items-center rounded-[var(--radius-md)] border border-border-default focus-within:border-yellow">
              <span className="pl-3 text-sm text-text-muted">/p/</span>
              <input value={slug} maxLength={60} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                     className="min-h-[44px] w-full bg-transparent px-1 text-sm outline-none" placeholder="iphone16-nov" />
            </span>
            {slug && !slugOk && <span className="mt-1 block text-xs text-error-text">ใช้ตัวอังกฤษพิมพ์เล็ก ตัวเลข และขีด (-) คั่นได้ ห้ามขึ้นต้น/ลงท้ายด้วยขีด</span>}
          </label>
          <button type="button" onClick={create} disabled={creating || !title.trim() || !slugOk} className="btn-primary">
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} สร้างหน้า
          </button>
        </div>
      </div>

      {pages === null ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : pages.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-default bg-white p-10 text-center text-sm text-text-muted">ยังไม่มีหน้า Landing — สร้างหน้าแรกด้านบน</p>
      ) : (
        <ul className="space-y-2">
          {pages.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-2xl border border-border-default bg-white p-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge-dd ${p.published ? "badge-success" : "badge-warning"}`}>{p.published ? "เผยแพร่อยู่" : "ร่าง"}</span>
                  <p className="font-semibold text-text-heading">{p.title}</p>
                </div>
                <p className="mt-1 font-mono text-xs text-text-body">{publicPath(p.slug)}</p>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  สื่อ {p.mediaCount} ไฟล์ · แก้ล่าสุด {new Date(p.updatedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })} โดย {p.updatedBy}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setEditing(p.id)} className="btn-primary text-sm"><Pencil size={14} /> แก้ไข</button>
                <button type="button" onClick={() => copyLink(p.slug)} disabled={!p.published} title={p.published ? "คัดลอกลิงก์" : "เผยแพร่ก่อนจึงคัดลอกลิงก์ได้"} className="btn-secondary text-sm"><Copy size={14} /> ลิงก์</button>
                {p.published && <a href={publicPath(p.slug)} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm"><ExternalLink size={14} /> เปิดดู</a>}
                <button type="button" onClick={() => remove(p)} aria-label={`ลบหน้า ${p.title}`} className="rounded-lg border border-error-border bg-error-bg p-2 text-error-text hover:bg-error-text hover:text-white"><Trash2 size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
