"use client";
/* eslint-disable @next/next/no-img-element -- รูปจาก backend (ย่อแล้ว) */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Building2, ExternalLink, Eye, EyeOff, ImagePlus, Info, Loader2, MapPinned, Save, Trash2, Users, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { compressImage } from "@/lib/imageCompress";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { CATEGORY_META, emptyGallery, type PhotoCategory, type StoreGallery, type StorePhoto, type StoreProfile } from "@/lib/storeGallery";

const TABS: { key: PhotoCategory; icon: LucideIcon }[] = [
  { key: "STORE", icon: Building2 },
  { key: "TEAM", icon: Users },
  { key: "TECHNICIAN", icon: Wrench },
  { key: "DIRECTIONS", icon: MapPinned },
];

/**
 * รูปหน้าร้าน / ทีมงาน / ช่าง / เส้นทางมาร้าน — แสดงที่หน้า "เกี่ยวกับเรา" (/contact) + หน้าแรก
 * อัปหลายรูปพร้อมกันได้ (ลากวาง/เลือกไฟล์) · แก้ชื่อ/คำอธิบายในการ์ด (บันทึกเมื่อออกจากช่อง) · เลื่อนลำดับ · ซ่อน · ลบ
 */
export default function StoreGalleryAdmin() {
  const [gallery, setGallery] = useState<StoreGallery>(emptyGallery());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<PhotoCategory>("STORE");

  const load = useCallback(() => {
    api.get<StoreGallery>("/admin/store-gallery")
      .then((r) => setGallery({ profile: r.data.profile, photos: { ...emptyGallery().photos, ...r.data.photos } }))
      .catch(() => toast.error("โหลดรูปไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const setPhotos = (cat: PhotoCategory, fn: (l: StorePhoto[]) => StorePhoto[]) =>
    setGallery((g) => ({ ...g, photos: { ...g.photos, [cat]: fn(g.photos[cat]) } }));

  const meta = CATEGORY_META[tab];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-default bg-white p-3">
        <div className="grid flex-1 grid-cols-2 gap-1 rounded-xl bg-bg-subtle p-1 sm:grid-cols-4 lg:max-w-2xl">
          {TABS.map(({ key, icon: Icon }) => (
            <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={tab === key}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${tab === key ? "bg-white text-text-heading shadow-sm" : "text-text-muted hover:text-text-heading"}`}>
              <Icon size={15} className={tab === key ? "text-yellow-hover" : ""} /> {CATEGORY_META[key].label}
              <span className="rounded-full bg-bg-subtle px-1.5 text-[11px] tabular-nums text-text-muted">{gallery.photos[key].length}</span>
            </button>
          ))}
        </div>
        <a href={`/contact#${meta.anchor}`} target="_blank" rel="noopener noreferrer" className="btn-ghost ml-auto text-sm"><ExternalLink size={14} /> ดูบนเว็บ</a>
      </div>

      {tab === "DIRECTIONS" && <ProfileForm key={JSON.stringify(gallery.profile)} profile={gallery.profile} onSaved={(p) => setGallery((g) => ({ ...g, profile: p }))} />}

      <Uploader category={tab} onUploaded={(p) => setPhotos(tab, (l) => [...l, p])} />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}</div>
      ) : gallery.photos[tab].length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-default bg-white p-10 text-center text-sm text-text-muted">
          ยังไม่มีรูป{meta.label} — ส่วนนี้จะยังไม่แสดงบนหน้าเว็บจนกว่าจะอัปรูปแรก
        </p>
      ) : (
        <PhotoGrid category={tab} photos={gallery.photos[tab]} onChange={(l) => setPhotos(tab, () => l)} onReload={load} />
      )}
    </div>
  );
}

function Uploader({ category, onUploaded }: { category: PhotoCategory; onUploaded: (p: StorePhoto) => void }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const meta = CATEGORY_META[category];

  const upload = async (files: FileList | File[] | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setProgress({ done: 0, total: list.length });
    let ok = 0;
    for (const [i, f] of list.entries()) {
      try {
        // บังคับแปลงเป็น JPEG ที่เบราว์เซอร์ — รูปมือถือหมุนตรงตาม EXIF ก่อนส่ง (เซิร์ฟเวอร์ตัด EXIF ทิ้ง)
        const file = await compressImage(f, { forceJpeg: true, maxDim: 2000 });
        const fd = new FormData();
        fd.append("category", category);
        fd.append("file", file);
        const res = await api.post<StorePhoto>("/admin/store-gallery/photos", fd);
        onUploaded(res.data);
        ok++;
      } catch (e) {
        toast.error(`${f.name}: ${getApiError(e, "อัปโหลดไม่สำเร็จ")}`);
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    if (ok) toast.success(`อัปโหลด ${ok} รูปแล้ว — ใส่ชื่อ/คำอธิบายใต้รูปได้เลย`);
  };

  return (
    <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
         onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
         className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors md:flex-row md:text-left ${drag ? "border-yellow bg-bg-tinted" : "border-border-default bg-white"}`}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-muted text-yellow-text"><ImagePlus size={22} /></span>
      <div className="flex-1">
        <p className="font-semibold text-text-heading">เพิ่มรูป{meta.label}</p>
        <p className="mt-0.5 flex items-start justify-center gap-1 text-xs text-text-muted md:justify-start"><Info size={12} className="mt-0.5 shrink-0" /> {meta.hint}</p>
      </div>
      <button type="button" onClick={() => input.current?.click()} disabled={!!progress} className="btn-primary shrink-0">
        {progress ? <><Loader2 size={16} className="animate-spin" /> {progress.done}/{progress.total}</> : <><ImagePlus size={16} /> เลือกรูป (หลายรูปได้)</>}
      </button>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

function PhotoGrid({ category, photos, onChange, onReload }: {
  category: PhotoCategory; photos: StorePhoto[]; onChange: (l: StorePhoto[]) => void; onReload: () => void;
}) {
  const meta = CATEGORY_META[category];

  const patch = async (p: StorePhoto, body: Partial<Pick<StorePhoto, "title" | "subtitle" | "visible">>) => {
    try {
      const res = await api.patch<StorePhoto>(`/admin/store-gallery/photos/${p.id}`, body);
      onChange(photos.map((x) => (x.id === p.id ? res.data : x)));
      return true;
    } catch (e) {
      toast.error(getApiError(e, "บันทึกไม่สำเร็จ"));
      return false;
    }
  };

  const move = async (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    try {
      await api.post("/admin/store-gallery/photos/reorder", { category, ids: next.map((p) => p.id) });
    } catch (e) {
      toast.error(getApiError(e, "เรียงลำดับไม่สำเร็จ"));
      onReload();
    }
  };

  const remove = async (p: StorePhoto) => {
    if (!(await confirmDialog({ title: "ลบรูปนี้?", message: p.title ?? "รูปจะหายจากหน้าเว็บทันที (ถ้าแค่อยากซ่อนชั่วคราว ใช้ปุ่มตาแทน)", confirmText: "ลบรูป", danger: true }))) return;
    try {
      await api.delete(`/admin/store-gallery/photos/${p.id}`);
      onChange(photos.filter((x) => x.id !== p.id));
      toast.success("ลบรูปแล้ว");
    } catch (e) { toast.error(getApiError(e, "ลบไม่สำเร็จ")); }
  };

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {photos.map((p, i) => (
        <li key={p.id} className={`overflow-hidden rounded-2xl border bg-white ${p.visible ? "border-border-default" : "border-dashed border-border-default opacity-70"}`}>
          <div className={`relative ${meta.aspect} bg-bg-subtle`}>
            <img src={p.url} alt={p.title ?? ""} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-yellow px-2 text-sm font-bold text-text-heading shadow">
              {i + 1}
            </span>
            {!p.visible && <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">ซ่อนอยู่</span>}
            {i === 0 && category === "STORE" && <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-text-heading">รูปใหญ่บนเว็บ</span>}
          </div>
          <div className="space-y-2 p-3">
            <CaptionInput value={p.title} placeholder={meta.titlePh} maxLength={80} onSave={(v) => patch(p, { title: v })} />
            <CaptionInput value={p.subtitle} placeholder={meta.subtitlePh} maxLength={200} onSave={(v) => patch(p, { subtitle: v })} small />
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <IconBtn label="เลื่อนไปก่อนหน้า" onClick={() => move(i, -1)} disabled={i === 0}><ArrowLeft size={15} /></IconBtn>
              <IconBtn label="เลื่อนไปถัดไป" onClick={() => move(i, 1)} disabled={i === photos.length - 1}><ArrowRight size={15} /></IconBtn>
              <IconBtn label={p.visible ? "ซ่อนจากหน้าเว็บ" : "แสดงบนหน้าเว็บ"} onClick={() => patch(p, { visible: !p.visible })}>
                {p.visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </IconBtn>
              <IconBtn label="ลบรูป" onClick={() => remove(p)} danger><Trash2 size={15} /></IconBtn>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
            className={`flex h-9 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${danger ? "border-error-border bg-error-bg text-error-text hover:bg-error-text hover:text-white" : "border-border-default bg-white text-text-heading hover:border-yellow hover:bg-bg-tinted"}`}>
      {children}
    </button>
  );
}

/** ช่องข้อความที่บันทึกเองเมื่อออกจากช่อง/กด Enter (ไม่เปลี่ยน = ไม่ยิง) */
function CaptionInput({ value, placeholder, maxLength, onSave, small }: {
  value: string | null; placeholder: string; maxLength: number; onSave: (v: string) => Promise<boolean>; small?: boolean;
}) {
  const [text, setText] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const commit = async () => {
    if (text.trim() === (value ?? "")) return;
    setSaving(true);
    if (!(await onSave(text.trim()))) setText(value ?? "");
    setSaving(false);
  };
  return (
    <div className="relative">
      <input value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} maxLength={maxLength} placeholder={placeholder}
             onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
             className={`input-dd pr-8 ${small ? "min-h-0 py-2 text-xs" : "font-semibold"}`} />
      {saving && <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-text-muted" />}
    </div>
  );
}

function ProfileForm({ profile, onSaved }: { profile: StoreProfile; onSaved: (p: StoreProfile) => void }) {
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const field = (k: keyof StoreProfile) => ({
    value: form[k] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put<StoreProfile>("/admin/store-gallery/profile", form);
      onSaved(res.data);
      toast.success("บันทึกข้อมูลการเดินทางแล้ว");
    } catch (err) { toast.error(getApiError(err, "บันทึกไม่สำเร็จ")); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={save} className="rounded-2xl border border-border-default bg-white p-5">
      <div className="flex items-center gap-2"><MapPinned size={18} className="text-yellow-hover" /><h3 className="font-display text-lg">ข้อมูลการเดินทาง</h3></div>
      <p className="mt-0.5 text-xs text-text-muted">แสดงเหนือรูปเส้นทางบนหน้าเว็บ · ช่องไหนว่างจะไม่แสดง</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-text-muted">ที่อยู่ร้าน</span>
          <textarea rows={2} maxLength={300} className="input-dd resize-none" placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด" {...field("address")} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-text-muted">จุดสังเกต</span>
          <input maxLength={200} className="input-dd" placeholder="เช่น ตรงข้าม 7-Eleven ข้างธนาคารกรุงเทพ" {...field("landmark")} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-text-muted">เวลาเปิดร้าน</span>
          <input maxLength={120} className="input-dd" placeholder="เช่น ทุกวัน 10:00–20:00" {...field("hours")} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-text-muted">ลิงก์ Google Maps</span>
          <input maxLength={500} inputMode="url" className="input-dd" placeholder="https://maps.app.goo.gl/…" {...field("mapsUrl")} />
          <span className="mt-1 block text-[11px] text-text-muted">เปิด Google Maps → ปักหมุดร้าน → แชร์ → คัดลอกลิงก์</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-text-muted">ที่จอดรถ</span>
          <input maxLength={200} className="input-dd" placeholder="เช่น จอดหน้าร้านได้ 3 คัน" {...field("parking")} />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก</> : <><Save size={16} /> บันทึก</>}
        </button>
      </div>
    </form>
  );
}
