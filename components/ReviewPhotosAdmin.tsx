"use client";
/* eslint-disable @next/next/no-img-element -- รูปรีวิวจาก backend (ย่อแล้ว) */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, ExternalLink, Eye, EyeOff, ImagePlus, Info, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError, getApiStatus } from "@/lib/errorMessage";
import { compressImage } from "@/lib/imageCompress";
import { trackUpload } from "@/lib/unsavedGuard";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { MARQUEE_MIN_PHOTOS, MAX_CAPTION, type AdminReviewPhoto, type AdminReviewPhotoList } from "@/lib/reviewPhotos";

/**
 * หลังบ้าน → รูปรีวิว: พนักงานอัปรูปลูกค้ารับเครื่อง/แคปรีวิว → แถบรูปเลื่อนวนหน้าแรก + แกลเลอรีหน้า /reviews
 * อัปหลายรูปพร้อมกัน (ย่อเป็น JPEG ที่เบราว์เซอร์ก่อนส่ง) · คำบรรยาย · เลื่อนลำดับ · ซ่อน/แสดง · ลบ
 */
export default function ReviewPhotosAdmin() {
  const [list, setList] = useState<AdminReviewPhotoList | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<AdminReviewPhotoList>("/admin/review-photos");
      setList(res.data);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const photos = list?.photos ?? [];
  const max = list?.maxPhotos ?? 60;
  const shown = photos.filter((p) => p.visible).length;
  const free = Math.max(0, max - photos.length);

  const replace = (p: AdminReviewPhoto) =>
    setList((l) => (l ? { ...l, photos: l.photos.map((x) => (x.id === p.id ? p : x)) } : l));

  const upload = async (files: FileList | null) => {
    const picked = Array.from(files ?? []).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (picked.length === 0) return;
    const batch = picked.slice(0, free);
    if (batch.length === 0) { toast.error(`มีรูปครบ ${max} รูปแล้ว — ลบรูปเก่าก่อน`); return; }
    if (picked.length > free) toast(`ใส่ได้อีก ${free} รูป — อัปเฉพาะ ${free} รูปแรก`, { icon: "ℹ️" });
    setProgress({ done: 0, total: batch.length });
    let ok = 0;
    // อัปทีละรูปตามลำดับที่เลือก — รูปแรกที่เลือกอยู่หน้าสุดของแถบ (แต่ละรูปใหม่ขึ้นหน้าสุด จึงอัปจากท้ายไปหัว)
    for (const [i, f] of [...batch].reverse().entries()) {
      try {
        const file = await compressImage(f, { forceJpeg: true, maxDim: 2000 });
        const fd = new FormData();
        fd.append("file", file);
        const res = await trackUpload(api.post<AdminReviewPhoto>("/admin/review-photos", fd));
        setList((l) => (l ? { ...l, photos: [res.data, ...l.photos] } : l));
        ok++;
      } catch (e) {
        toast.error(`${f.name}: ${getApiError(e, "อัปโหลดไม่สำเร็จ")}`);
        if (getApiStatus(e) === 400 && /ครบ/.test(getApiError(e, ""))) break;
      }
      setProgress({ done: i + 1, total: batch.length });
    }
    setProgress(null);
    if (ok > 0) toast.success(`เพิ่ม ${ok} รูปแล้ว — ขึ้นหน้าเว็บทันที`);
  };

  const patch = async (p: AdminReviewPhoto, body: { caption?: string; visible?: boolean }, done?: string) => {
    setBusy(p.id);
    try {
      const res = await api.put<AdminReviewPhoto>(`/admin/review-photos/${p.id}`, body);
      replace(res.data);
      if (done) toast.success(done);
      return true;
    } catch (e) {
      toast.error(getApiError(e, "บันทึกไม่สำเร็จ"));
      if (getApiStatus(e) === 404) load();
      return false;
    } finally {
      setBusy(null);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    [next[index], next[to]] = [next[to], next[index]];
    const before = list;
    setList((l) => (l ? { ...l, photos: next } : l));
    try {
      await api.post("/admin/review-photos/reorder", { ids: next.map((p) => p.id) });
    } catch (e) {
      setList(before);
      toast.error(getApiError(e, "เรียงลำดับไม่สำเร็จ"));
      if (getApiStatus(e) === 409) load();
    }
  };

  const remove = async (p: AdminReviewPhoto) => {
    const ok = await confirmDialog({
      title: "ลบรูปนี้?", message: "รูปจะหายจากหน้าเว็บทันทีและกู้คืนไม่ได้ (ถ้าแค่ไม่อยากโชว์ ใช้ \"ซ่อน\" แทน)",
      confirmText: "ลบรูป", danger: true,
    });
    if (!ok) return;
    setBusy(p.id);
    try {
      await api.delete(`/admin/review-photos/${p.id}`);
      setList((l) => (l ? { ...l, photos: l.photos.filter((x) => x.id !== p.id) } : l));
      toast.success("ลบรูปแล้ว");
    } catch (e) {
      toast.error(getApiError(e, "ลบไม่สำเร็จ"));
      if (getApiStatus(e) === 404) load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border-default bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Camera size={20} className="text-yellow-hover" />
        <h2 className="font-display text-xl">รูปรีวิว</h2>
        <span className="badge-dd badge-warning tabular-nums">แสดง {shown} · ทั้งหมด {photos.length}/{max}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <a href="/reviews#photos" target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">ดูหน้าเว็บ <ExternalLink size={14} /></a>
          <button type="button" onClick={() => input.current?.click()} disabled={!!progress || list === null || free === 0} className="btn-primary">
            {progress ? <><Loader2 size={16} className="animate-spin" /> กำลังอัป {progress.done}/{progress.total}</> : <><ImagePlus size={16} /> เพิ่มรูป</>}
          </button>
          <input ref={input} type="file" accept="image/*,.heic,.heif" multiple className="hidden"
                 onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </div>
      </div>

      <p className="flex items-start gap-1.5 rounded-xl bg-bg-tinted px-3 py-2.5 text-xs leading-relaxed text-text-body">
        <Info size={14} className="mt-0.5 shrink-0 text-yellow-text" />
        <span>
          รูปลูกค้ารับเครื่อง / แคปรีวิว → <b>แถบรูปเลื่อนวนหน้าแรก</b> และแกลเลอรีหน้า /reviews ·
          เลือกได้หลายรูปพร้อมกัน (แนวตั้ง/แนวนอนได้ ระบบย่อให้) · รูปใหม่ขึ้นหน้าสุด เลื่อนลำดับด้วยลูกศร ·
          ต้องมีอย่างน้อย {MARQUEE_MIN_PHOTOS} รูปแถบถึงจะเลื่อนเอง · <b>ขออนุญาตลูกค้าก่อน และเบลอเลขบัตร/เบอร์/ข้อมูลส่วนตัวทุกครั้ง</b>
        </span>
      </p>

      {list === null ? (
        failed ? (
          <div className="rounded-xl border border-border-default p-6 text-center text-sm text-text-muted">
            โหลดรูปไม่สำเร็จ <button type="button" onClick={load} className="ml-2 font-semibold text-text-heading underline">ลองใหม่</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton aspect-square rounded-xl" />)}</div>
        )
      ) : photos.length === 0 ? (
        <button type="button" onClick={() => input.current?.click()} disabled={!!progress}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-default p-8 text-sm text-text-muted transition-colors hover:border-yellow hover:text-text-heading">
          <ImagePlus size={24} /> ยังไม่มีรูปรีวิว — กดเพื่อเลือกรูป (เลือกหลายรูปได้)
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {photos.map((p, i) => (
            // key รวมคำบรรยาย: ค่าจาก server เปลี่ยน (บันทึกแล้ว/โหลดใหม่) → ช่องเริ่มจากค่าใหม่
            <PhotoCard key={`${p.id}:${p.caption ?? ""}`} photo={p} index={i} last={i === photos.length - 1} busy={busy === p.id}
                       onMove={(dir) => move(i, dir)}
                       onToggle={() => patch(p, { visible: !p.visible }, p.visible ? "ซ่อนจากเว็บแล้ว" : "แสดงบนเว็บแล้ว")}
                       onCaption={(caption) => patch(p, { caption }, "บันทึกคำบรรยายแล้ว")}
                       onRemove={() => remove(p)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PhotoCard({ photo: p, index, last, busy, onMove, onToggle, onCaption, onRemove }: {
  photo: AdminReviewPhoto; index: number; last: boolean; busy: boolean;
  onMove: (dir: -1 | 1) => void; onToggle: () => void; onCaption: (c: string) => Promise<boolean>; onRemove: () => void;
}) {
  const [caption, setCaption] = useState(p.caption ?? "");
  const saved = p.caption ?? "";
  const dirty = caption.trim() !== saved;

  const save = async () => {
    if (!dirty || busy) return;
    if (!(await onCaption(caption.trim()))) setCaption(saved);
  };

  return (
    <li className={`flex flex-col overflow-hidden rounded-xl border bg-white ${p.visible ? "border-border-default" : "border-dashed border-border-default"}`}>
      <a href={p.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-square bg-bg-subtle">
        <img src={p.url} alt={p.caption ?? "รูปรีวิว"} loading="lazy" className={`h-full w-full object-cover ${p.visible ? "" : "opacity-50"}`} />
        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">#{index + 1}</span>
        {!p.visible && <span className="absolute right-1.5 top-1.5 badge-dd badge-warning">ซ่อนอยู่</span>}
      </a>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <input value={caption} maxLength={MAX_CAPTION} placeholder="คำบรรยาย (ไม่บังคับ)" aria-label={`คำบรรยายรูป #${index + 1}`}
               onChange={(e) => setCaption(e.target.value)} onBlur={save}
               onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } if (e.key === "Escape") setCaption(saved); }}
               className={`w-full rounded-lg border px-2 py-1.5 text-xs ${dirty ? "border-yellow" : "border-border-default"}`} />
        <div className="mt-auto flex items-center gap-1">
          <Btn label="เลื่อนไปก่อน" disabled={index === 0} onClick={() => onMove(-1)}><ArrowLeft size={14} /></Btn>
          <Btn label="เลื่อนไปหลัง" disabled={last} onClick={() => onMove(1)}><ArrowRight size={14} /></Btn>
          <span className="flex-1" />
          <Btn label={p.visible ? "ซ่อนจากเว็บ" : "แสดงบนเว็บ"} disabled={busy} onClick={onToggle}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : p.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </Btn>
          <Btn label="ลบรูป" danger disabled={busy} onClick={onRemove}><Trash2 size={14} /></Btn>
        </div>
      </div>
    </li>
  );
}

function Btn({ label, onClick, disabled, danger, children }: {
  label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-white transition-colors disabled:opacity-40 ${danger ? "text-error-text hover:bg-error-bg" : "text-text-body hover:bg-bg-subtle"}`}>
      {children}
    </button>
  );
}
