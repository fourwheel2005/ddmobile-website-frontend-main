"use client";
/* eslint-disable @next/next/no-img-element -- รูปที่อัปขึ้นหน้า Landing (backend) + object URL ตอนเลือกปกคลิป */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Camera, ChevronDown, Film, ImagePlus, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { compressImage } from "@/lib/imageCompress";
import { ClipError, canCompressHere, canvasToJpeg, compressClip, formatDuration, type CompressedClip } from "@/lib/videoCompress";
import type { CampaignLink, CampaignMedia, LinkType } from "@/lib/campaign";
import { isPublicPath } from "@/lib/accessGate";
import { trackUpload } from "@/lib/unsavedGuard";

/* ============================ กล่อง section ============================ */

export function SectionCard({ title, hint, empty, children, defaultOpen = false }: {
  title: string; hint?: string; empty?: boolean; children: ReactNode; defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-border-default bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 [&::-webkit-details-marker]:hidden">
        <span className="font-display font-bold text-text-heading">{title}</span>
        {empty && <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] font-semibold text-text-muted">ว่าง · ไม่แสดงบนหน้าเว็บ</span>}
        <ChevronDown size={18} className="ml-auto shrink-0 text-text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-border-default p-4">
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
        {children}
      </div>
    </details>
  );
}

export function Field({ label, hint, value, onChange, max, placeholder, multiline }: {
  label: string; hint?: string; value: string | null | undefined; onChange: (v: string) => void; max: number;
  placeholder?: string; multiline?: boolean;
}) {
  const v = value ?? "";
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline gap-2 text-sm font-semibold text-text-heading">
        {label}{hint && <span className="text-xs font-normal text-text-muted">{hint}</span>}
        <span className={`ml-auto text-[11px] font-normal tabular-nums ${v.length > max ? "text-error-text" : "text-text-muted"}`}>{v.length}/{max}</span>
      </span>
      {multiline
        ? <textarea value={v} onChange={(e) => onChange(e.target.value)} maxLength={max} rows={3} placeholder={placeholder} className="input-dd resize-y" />
        : <input value={v} onChange={(e) => onChange(e.target.value)} maxLength={max} placeholder={placeholder} className="input-dd" />}
    </label>
  );
}

/* ============================ ลิงก์ของปุ่ม ============================ */

/** หน้าในเว็บที่ลูกค้าใช้บริการเองได้ — เลือกแทนการพิมพ์ (กันพิมพ์ผิด = ลิงก์เสีย) · ป้าย "ต้องล็อกอิน" มาจากกำแพงสมาชิกจริง (accessGate) */
export const PATH_PRESETS: { value: string; label: string }[] = [
  { value: "/products", label: "สินค้าทั้งหมด" },
  { value: "/products?condition=NEW", label: "สินค้ามือ 1" },
  { value: "/products?condition=SECOND_HAND", label: "สินค้ามือ 2" },
  { value: "/services?s=INSTALLMENT", label: "ส่งคำขอผ่อนเครื่อง" },
  { value: "/installments", label: "คำนวณค่างวด / ตารางผ่อน" },
  { value: "/sell", label: "ขายเครื่อง" },
  { value: "/trade-in", label: "ผ่อนบอลลูน (แลกเงิน)" },
  { value: "/compare", label: "เปรียบเทียบเครื่อง" },
  { value: "/reviews", label: "รีวิวทั้งหมด" },
  { value: "/contact", label: "ติดต่อ / หน้าร้าน" },
];

/** ลูกค้าที่ยังไม่ล็อกอินเปิดหน้านี้ได้ไหม (ตัด ?query/#hash ก่อนเทียบ) */
export const needsLogin = (path: string) => path.startsWith("/") && !isPublicPath(path.split(/[?#]/)[0]);

const LINK_TYPES: { value: LinkType; label: string }[] = [
  { value: "LINE", label: "ทักไลน์ (พิมพ์ข้อความรอไว้)" },
  { value: "PATH", label: "หน้าในเว็บ DD Mobile" },
  { value: "PHONE", label: "โทรหาร้าน" },
  { value: "URL", label: "ลิงก์ภายนอก (https://)" },
];

export function LinkEditor({ value, onChange }: { value: CampaignLink | null; onChange: (v: CampaignLink) => void }) {
  const link = value ?? { type: "LINE" as LinkType, value: null };
  const preset = PATH_PRESETS.some((p) => p.value === link.value);
  // เลือก "พิมพ์เอง" ตอนค่ายังเป็น preset — จำ "ค่าที่เลือกตอนนั้น" (ไม่ใช่แค่ true) กันสถานะตามไปการ์ดอื่นหลังเรียง/ลบ
  const [forceCustomFor, setForceCustomFor] = useState<string | null>(null);
  const custom = link.type === "PATH" && ((forceCustomFor !== null && forceCustomFor === link.value) || (!!link.value && !preset));
  return (
    <div className="grid gap-2 rounded-xl bg-bg-subtle p-3 sm:grid-cols-[200px_1fr]">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-text-body">กดแล้วไปไหน</span>
        <select value={link.type} className="input-dd"
                onChange={(e) => {
                  const type = e.target.value as LinkType;
                  setForceCustomFor(null);
                  onChange({ type, value: type === "PATH" ? "/installments" : null });   // หน้าสาธารณะ — คนจากแอดยังไม่มีบัญชี
                }}>
          {LINK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      <div className="min-w-0">
        {link.type === "LINE" && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-text-body">ข้อความที่พิมพ์รอไว้ในแชท <span className="font-normal text-text-muted">(ระบบแนบชื่อหน้านี้ให้แอดมินรู้ว่ามาจากแอดไหน)</span></span>
            <input value={link.value ?? ""} maxLength={300} onChange={(e) => onChange({ type: "LINE", value: e.target.value })}
                   className="input-dd" placeholder="เช่น สนใจผ่อน iPhone 15 จากคลิปครับ/ค่ะ" />
          </label>
        )}
        {link.type === "PATH" && (
          <div className="space-y-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-text-body">หน้าในเว็บ</span>
              <select className="input-dd" value={custom ? "__custom" : link.value ?? "/installments"}
                      onChange={(e) => {
                        if (e.target.value === "__custom") { setForceCustomFor(link.value ?? ""); return; }
                        setForceCustomFor(null);
                        onChange({ type: "PATH", value: e.target.value });
                      }}>
                {PATH_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}{needsLogin(p.value) ? " · ต้องล็อกอิน" : ""} ({p.value})</option>)}
                <option value="__custom">หน้าอื่น / หน้าเครื่องเฉพาะ — พิมพ์เอง</option>
              </select>
            </label>
            {custom && (
              <input value={link.value ?? ""} maxLength={300} onChange={(e) => onChange({ type: "PATH", value: e.target.value })}
                     className="input-dd font-mono text-xs" placeholder="/products/xxxx — คัดลอกจากแถบที่อยู่หลัง .th" />
            )}
            {link.value && needsLogin(link.value) && (
              <p className="text-xs text-warning-text">หน้านี้สำหรับสมาชิก — ลูกค้าจากแอดที่ยังไม่มีบัญชีจะถูกพาไปสมัคร/ล็อกอินก่อน (ปุ่มทักไลน์ไม่ต้องล็อกอิน)</p>
            )}
          </div>
        )}
        {link.type === "PHONE" && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-text-body">เบอร์โทร <span className="font-normal text-text-muted">(เว้นว่าง = เบอร์ร้าน)</span></span>
            <input value={link.value ?? ""} maxLength={20} inputMode="tel" onChange={(e) => onChange({ type: "PHONE", value: e.target.value })} className="input-dd" />
          </label>
        )}
        {link.type === "URL" && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-text-body">ลิงก์ (ต้องขึ้นต้น https://)</span>
            <input value={link.value ?? ""} maxLength={500} inputMode="url" onChange={(e) => onChange({ type: "URL", value: e.target.value })}
                   className="input-dd" placeholder="https://www.facebook.com/…" />
          </label>
        )}
      </div>
    </div>
  );
}

/* ============================ รายการที่เพิ่ม/ลบ/เรียงได้ ============================ */

export function ListEditor<T>({ items, onChange, max, make, addLabel, render }: {
  items: T[]; onChange: (v: T[]) => void; max: number; make: () => T; addLabel: string;
  render: (item: T, set: (v: T) => void, index: number) => ReactNode;
}) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-border-default p-3">
          <div className="mb-2 flex items-center gap-1">
            <span className="text-xs font-bold text-text-muted">#{i + 1}</span>
            <span className="flex-1" />
            <IconBtn label="เลื่อนขึ้น" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></IconBtn>
            <IconBtn label="เลื่อนลง" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></IconBtn>
            <IconBtn label="ลบรายการนี้" danger onClick={() => onChange(items.filter((_, k) => k !== i))}><Trash2 size={14} /></IconBtn>
          </div>
          {render(item, (v) => onChange(items.map((x, k) => (k === i ? v : x))), i)}
        </div>
      ))}
      {items.length < max
        ? <button type="button" onClick={() => onChange([...items, make()])} className="btn-secondary w-full text-sm"><Plus size={15} /> {addLabel}</button>
        : <p className="text-center text-xs text-text-muted">ครบ {max} รายการแล้ว</p>}
    </div>
  );
}

export function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
            className={`rounded-lg border p-1.5 disabled:opacity-30 ${danger ? "border-error-border bg-error-bg text-error-text hover:bg-error-text hover:text-white" : "border-border-default bg-white text-text-body hover:bg-bg-subtle"}`}>
      {children}
    </button>
  );
}

/* ============================ อัปโหลดสื่อ ============================ */

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

/** อัปรูปทีละใบตามลำดับ (กันเซิร์ฟเวอร์ย่อรูปพร้อมกันหลายใบ) — คืนรายการที่สำเร็จ */
export async function uploadImages(pageId: number, files: File[], onProgress: (done: number, total: number) => void): Promise<CampaignMedia[]> {
  const out: CampaignMedia[] = [];
  let done = 0;
  for (const f of files) {
    try {
      // HEIC/ไฟล์ไม่มี type (บางเครื่อง) → บังคับแปลง JPEG (เซิร์ฟเวอร์รับแค่ JPG/PNG/WEBP) · แปลงไม่ได้ = ส่งไฟล์เดิม แล้วเซิร์ฟเวอร์แจ้งชัด
      const small = await compressImage(f, { maxDim: 2000, forceJpeg: !f.type || /\.(heic|heif)$/i.test(f.name) });
      const fd = new FormData();
      fd.append("file", small, small.name || "image.jpg");
      const res = await api.post<CampaignMedia>(`/admin/campaign-pages/${pageId}/media/image`, fd);
      out.push(res.data);
    } catch (e) {
      toast.error(`${f.name}: ${getApiError(e, "อัปรูปไม่สำเร็จ")}`);
    }
    onProgress(++done, files.length);
  }
  return out;
}

export function ImageUploadButton({ pageId, multiple, maxFiles, label, onUploaded }: {
  pageId: number; multiple?: boolean; maxFiles?: number; label: string; onUploaded: (m: CampaignMedia[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const pick = async (list: FileList | null) => {
    const picked = Array.from(list ?? []).filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
    if (picked.length === 0) return;
    // อัปเท่าที่ยังมีช่อง — เกินแล้วไฟล์จะขึ้นเซิร์ฟเวอร์ฟรี ๆ (กินโควตา 80 ไฟล์/หน้า) แต่ไม่ได้ใส่ในหน้า
    const files = maxFiles != null ? picked.slice(0, Math.max(0, maxFiles)) : picked;
    if (files.length < picked.length) toast(`เหลือที่ว่าง ${files.length} ช่อง — อัปเฉพาะ ${files.length} รูปแรก`, { icon: "ℹ️" });
    if (files.length === 0) return;
    setProgress({ done: 0, total: files.length });
    const ok = await trackUpload(uploadImages(pageId, files, (done, total) => setProgress({ done, total })));
    setProgress(null);
    if (ok.length) {
      toast.success(`อัปรูปแล้ว ${ok.length} รูป — อย่าลืมกดบันทึก`);
      onUploaded(ok);
    }
  };
  return (
    <>
      <button type="button" disabled={!!progress} onClick={() => input.current?.click()} className="btn-secondary w-full text-sm">
        {progress ? <><Loader2 size={15} className="animate-spin" /> กำลังอัป {progress.done}/{progress.total}</> : <><ImagePlus size={15} /> {label}</>}
      </button>
      <input ref={input} type="file" accept="image/*" multiple={multiple} className="hidden"
             onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
    </>
  );
}

/** ช่องรูปเดียว (รูปบริการ/รูปส่วนบนสุด): โชว์รูปที่เลือก + เปลี่ยน/เอาออก + เลือกจากรูปที่อัปไว้ในหน้านี้ */
export function MediaSlot({ pageId, media, value, onChange, allowVideo, onUploaded }: {
  pageId: number; media: CampaignMedia[]; value: number | null; onChange: (id: number | null) => void;
  allowVideo?: boolean; onUploaded: (m: CampaignMedia) => void;
}) {
  const current = value != null ? media.find((m) => m.id === value) : undefined;
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const choices = media.filter((m) => allowVideo || m.kind === "IMAGE");

  return (
    <div className="space-y-2">
      {current ? (
        <div className="flex items-center gap-3 rounded-xl border border-border-default p-2">
          <img src={current.kind === "VIDEO" ? current.posterUrl ?? "" : current.url} alt="" className="h-20 w-14 shrink-0 rounded-lg bg-text-heading object-cover" />
          <div className="min-w-0 flex-1 text-xs text-text-muted">
            <p className="font-semibold text-text-heading">{current.kind === "VIDEO" ? "คลิป" : "รูป"} #{current.id}</p>
            <p>{current.width}×{current.height}{current.durationMs != null ? ` · ${formatDuration(current.durationMs)}` : ""} · {mb(current.sizeBytes)}</p>
          </div>
          <IconBtn label="เอาออก" onClick={() => onChange(null)}><X size={14} /></IconBtn>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border-default p-3 text-center text-xs text-text-muted">ยังไม่ได้เลือก{allowVideo ? "คลิป/รูป" : "รูป"}</p>
      )}
      <div className={`grid gap-2 ${allowVideo ? "sm:grid-cols-2" : ""}`}>
        {allowVideo && (
          <>
            <button type="button" onClick={() => {
              if (!canCompressHere()) { toast.error("เบราว์เซอร์นี้ย่อคลิปไม่ได้ — ใช้ Chrome หรือ Safari เวอร์ชันล่าสุด"); return; }
              // ตรวจโควตาก่อนเสียเวลาย่อคลิปหลายนาที (ตรงกับเพดานฝั่งเซิร์ฟเวอร์)
              if (media.filter((m) => m.kind === "VIDEO").length >= 4) { toast.error("หน้าหนึ่งมีคลิปได้สูงสุด 4 คลิป — ลบคลิปที่ไม่ใช้ใน \"ไฟล์ทั้งหมดในหน้านี้\" ก่อน"); return; }
              if (media.length >= 80) { toast.error("หน้านี้มีไฟล์ครบ 80 ไฟล์แล้ว — ลบไฟล์ที่ไม่ใช้ก่อน"); return; }
              videoInput.current?.click();
            }} className="btn-secondary text-sm"><Film size={15} /> อัปคลิป</button>
            <input ref={videoInput} type="file" accept="video/*,.mov,.mp4,.m4v" className="hidden"
                   onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideoFile(f); e.target.value = ""; }} />
          </>
        )}
        <ImageUploadButton pageId={pageId} label="อัปรูป" onUploaded={(list) => { list.forEach(onUploaded); if (list[0]) onChange(list[0].id); }} />
      </div>
      {choices.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-semibold text-text-body">หรือเลือกจากไฟล์ที่อัปไว้ในหน้านี้ ({choices.length})</summary>
          <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-6">
            {choices.map((m) => (
              <button key={m.id} type="button" onClick={() => onChange(m.id)} aria-pressed={m.id === value}
                      className={`relative aspect-[3/4] overflow-hidden rounded-lg border-2 ${m.id === value ? "border-yellow" : "border-transparent"}`}>
                <img src={m.kind === "VIDEO" ? m.posterUrl ?? "" : m.url} alt={`ไฟล์ #${m.id}`} loading="lazy" className="h-full w-full bg-bg-subtle object-cover" />
                {m.kind === "VIDEO" && <Film size={12} className="absolute left-1 top-1 text-white drop-shadow" />}
              </button>
            ))}
          </div>
        </details>
      )}
      {videoFile && (
        <VideoUploadModal pageId={pageId} file={videoFile} onClose={() => setVideoFile(null)}
                          onUploaded={(m) => { onUploaded(m); onChange(m.id); setVideoFile(null); }} />
      )}
    </div>
  );
}

/** ย่อคลิปในเบราว์เซอร์ (MP4 H.264 ≤ 720p) → เลือกภาพปก → อัป */
function VideoUploadModal({ pageId, file, onClose, onUploaded }: {
  pageId: number; file: File; onClose: () => void; onUploaded: (m: CampaignMedia) => void;
}) {
  const [compressed, setCompressed] = useState<CompressedClip | null>(null);
  const [poster, setPoster] = useState<File | null>(null);
  const [step, setStep] = useState<"compress" | "ready" | "upload">("compress");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const videoEl = useRef<HTMLVideoElement>(null);

  const videoUrl = useMemo(() => (compressed ? URL.createObjectURL(compressed.video) : null), [compressed]);
  const posterUrl = useMemo(() => (poster ? URL.createObjectURL(poster) : null), [poster]);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  useEffect(() => () => { if (posterUrl) URL.revokeObjectURL(posterUrl); }, [posterUrl]);

  useEffect(() => {
    const ctl = new AbortController();
    compressClip(file, { onProgress: setProgress, signal: ctl.signal })
      .then((c) => { setCompressed(c); setPoster(c.poster); setStep("ready"); })
      .catch((e) => {
        if (ctl.signal.aborted) return;
        console.error("compress clip", e);
        setError(e instanceof ClipError ? e.message : "ย่อคลิปไม่สำเร็จ — ลองใช้ Chrome หรือ Safari เวอร์ชันล่าสุด หรือบันทึกคลิปใหม่จากมือถือ");
      });
    return () => ctl.abort();
  }, [file]);

  const grabPoster = async () => {
    const v = videoEl.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    try {
      setPoster(await canvasToJpeg(canvas, "poster.jpg"));
      toast.success(`ตั้งภาพปกที่วินาที ${formatDuration(v.currentTime * 1000)} แล้ว`);
    } catch {
      toast.error("จับภาพปกไม่สำเร็จ");
    }
  };

  const upload = async () => {
    if (!compressed || !poster) return;
    setStep("upload");
    setProgress(0);
    const fd = new FormData();
    fd.append("video", compressed.video, "clip.mp4");
    fd.append("poster", poster, "poster.jpg");
    try {
      const res = await trackUpload(api.post<CampaignMedia>(`/admin/campaign-pages/${pageId}/media/video`, fd, {
        onUploadProgress: (e) => setProgress(e.total ? e.loaded / e.total : 0),
      }));
      toast.success("อัปคลิปแล้ว — อย่าลืมกดบันทึก");
      onUploaded(res.data);
    } catch (e) {
      toast.error(getApiError(e, "อัปคลิปไม่สำเร็จ"));
      setStep("ready");
    }
  };

  const close = () => { if (step !== "upload") onClose(); };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="อัปคลิป" onClick={step === "ready" ? close : undefined}>
      <div className="modal-dd w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={close} disabled={step === "upload"} className="modal-close" aria-label="ปิด"><X size={20} /></button>
        <h2 className="card-title">อัปคลิปขึ้นหน้า Landing</h2>
        {error ? (
          <div className="mt-4 rounded-xl border border-error-border bg-error-bg p-4 text-sm text-error-text">
            <p className="font-semibold">{error}</p>
            <button type="button" onClick={onClose} className="btn-secondary mt-3">ปิด</button>
          </div>
        ) : step === "compress" ? (
          <div className="mt-6 space-y-3 py-6 text-center">
            <Loader2 size={28} className="mx-auto animate-spin text-yellow-hover" />
            <p className="font-semibold text-text-heading">กำลังย่อคลิปให้เล่นได้ทุกเครื่อง… {Math.round(progress * 100)}%</p>
            <div className="mx-auto h-2 max-w-sm overflow-hidden rounded-full bg-bg-subtle"><div className="h-full bg-yellow transition-[width]" style={{ width: `${progress * 100}%` }} /></div>
            <p className="text-xs text-text-muted">{file.name} · {mb(file.size)} · อย่าปิดหน้านี้ระหว่างย่อ</p>
            <button type="button" onClick={onClose} className="btn-ghost text-sm">ยกเลิก</button>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,260px)_1fr]">
            <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-text-heading">
              {videoUrl && <video ref={videoEl} src={videoUrl} poster={posterUrl ?? undefined} controls playsInline className="h-full w-full object-contain" />}
            </div>
            <div className="space-y-3">
              <button type="button" onClick={grabPoster} disabled={step === "upload"} className="btn-secondary w-full text-sm"><Camera size={15} /> ใช้ภาพตอนนี้เป็นปก</button>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                {posterUrl && <img src={posterUrl} alt="ภาพปก" className="h-16 w-10 rounded object-cover" />}
                <span>ภาพปก = สิ่งแรกที่ลูกค้าเห็นก่อนกดเล่น และใช้เป็นรูปการ์ดตอนแชร์ลิงก์ · เลื่อนคลิปไปเฟรมที่ชอบแล้วกดปุ่มด้านบน
                  {compressed && <><br />{formatDuration(compressed.durationSec * 1000)} · {compressed.width}×{compressed.height} · {mb(compressed.video.size)}</>}</span>
              </div>
              {step === "upload" && (
                <div>
                  <p className="mb-1 text-xs text-text-muted">กำลังอัปโหลด {Math.round(progress * 100)}%</p>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-subtle"><div className="h-full bg-yellow transition-[width]" style={{ width: `${progress * 100}%` }} /></div>
                </div>
              )}
              <div className="flex justify-end gap-2 border-t border-border-default pt-4">
                <button type="button" onClick={close} disabled={step === "upload"} className="btn-ghost">ยกเลิก</button>
                <button type="button" onClick={upload} disabled={step === "upload"} className="btn-primary">
                  {step === "upload" ? <><Loader2 size={16} className="animate-spin" /> กำลังอัป</> : <><Upload size={16} /> อัปคลิป</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
