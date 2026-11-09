"use client";
/* eslint-disable @next/next/no-img-element -- รูปปก/รูปสินค้าจาก backend และ object URL ของคลิปที่เพิ่งย่อ */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Camera, Check, Clapperboard, ExternalLink, Eye, EyeOff, Film, Info, Loader2, Pencil, Search, Smartphone, Trash2, Upload, X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { getCatalog } from "@/lib/catalog";
import { baht } from "@/lib/money";
import { norm } from "@/lib/productSearch";
import { compareModelNames } from "@/lib/modelOrder";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { CLIP_MAX_SECONDS, ClipError, canCompressHere, canvasToJpeg, compressClip, formatDuration, type CompressedClip } from "@/lib/videoCompress";
import type { ClipProduct, ProductClip } from "@/lib/productClips";

const MAX_CLIPS = 60;
const MAX_PRODUCTS = 6;
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

type Editor = { mode: "create"; file: File } | { mode: "edit"; clip: ProductClip };

/**
 * คลิปสินค้า (shoppable video) — แสดงหน้าแรก + หน้าสินค้าที่ผูกไว้
 * เพิ่มคลิป: เลือกไฟล์ → เบราว์เซอร์ย่อเป็น MP4 720p → เลือกภาพปก → ใส่หัวข้อ + เลือกสินค้าจากคลัง → อัปโหลด
 */
export default function ProductClipsAdmin() {
  const [clips, setClips] = useState<ProductClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api.get<ProductClip[]>("/admin/product-clips")
      .then((r) => setClips(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("โหลดคลิปไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const pick = (files: FileList | null) => {
    const f = Array.from(files ?? []).find((x) => x.type.startsWith("video/") || /\.(mov|mp4|m4v|webm)$/i.test(x.name));
    if (!f) { toast.error("เลือกไฟล์คลิปวิดีโอ (.mp4 / .mov)"); return; }
    if (clips.length >= MAX_CLIPS) { toast.error(`มีคลิปครบ ${MAX_CLIPS} คลิปแล้ว — ลบคลิปเก่าก่อน`); return; }
    if (!canCompressHere()) { toast.error("เบราว์เซอร์นี้ย่อคลิปไม่ได้ — ใช้ Chrome หรือ Safari เวอร์ชันล่าสุด"); return; }
    setEditor({ mode: "create", file: f });
  };

  const patch = async (c: ProductClip, body: Partial<Pick<ProductClip, "title" | "visible" | "products">>) => {
    try {
      const res = await api.patch<ProductClip>(`/admin/product-clips/${c.id}`, body);
      setClips((l) => l.map((x) => (x.id === c.id ? res.data : x)));
      return true;
    } catch (e) {
      toast.error(getApiError(e, "บันทึกไม่สำเร็จ"));
      return false;
    }
  };

  const move = async (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= clips.length) return;
    const next = [...clips];
    [next[i], next[j]] = [next[j], next[i]];
    setClips(next);
    try {
      await api.post("/admin/product-clips/reorder", { ids: next.map((c) => c.id) });
    } catch (e) {
      toast.error(getApiError(e, "เรียงลำดับไม่สำเร็จ"));
      load();
    }
  };

  const remove = async (c: ProductClip) => {
    if (!(await confirmDialog({ title: "ลบคลิปนี้?", message: `${c.title ?? "คลิปไม่มีหัวข้อ"} · ไฟล์คลิปและรูปปกจะถูกลบจากเซิร์ฟเวอร์`, confirmText: "ลบคลิป", danger: true }))) return;
    try {
      await api.delete(`/admin/product-clips/${c.id}`);
      setClips((l) => l.filter((x) => x.id !== c.id));
      toast.success("ลบคลิปแล้ว");
    } catch (e) {
      toast.error(getApiError(e, "ลบไม่สำเร็จ"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-default bg-white p-4">
        <Clapperboard className="text-yellow-hover" size={20} />
        <h2 className="font-display text-xl">คลิปสินค้า</h2>
        <span className="badge-dd badge-warning tabular-nums">{clips.length}/{MAX_CLIPS} คลิป</span>
        <a href="/" target="_blank" rel="noopener noreferrer" className="btn-ghost ml-auto text-sm"><ExternalLink size={14} /> ดูบนเว็บ</a>
      </div>

      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
           onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files); }}
           className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors md:flex-row md:text-left ${drag ? "border-yellow bg-bg-tinted" : "border-border-default bg-white"}`}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-muted text-yellow-text"><Film size={22} /></span>
        <div className="flex-1">
          <p className="font-semibold text-text-heading">เพิ่มคลิปที่ร้านถ่ายเอง</p>
          <p className="mt-0.5 flex items-start justify-center gap-1 text-xs text-text-muted md:justify-start">
            <Info size={12} className="mt-0.5 shrink-0" />
            ถ่ายแนวตั้ง ยาวไม่เกิน {CLIP_MAX_SECONDS / 60} นาที · ไฟล์จาก iPhone ได้เลย ระบบย่อเป็น 720p ให้ (ใช้ Chrome/Safari) · แสดงหน้าแรก + หน้าสินค้าที่เลือก
          </p>
        </div>
        <button type="button" onClick={() => input.current?.click()} className="btn-primary shrink-0"><Upload size={16} /> เลือกคลิป</button>
        <input ref={input} type="file" accept="video/*,.mov,.mp4,.m4v" className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton aspect-[9/16] rounded-2xl" />)}</div>
      ) : clips.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-default bg-white p-10 text-center text-sm text-text-muted">
          ยังไม่มีคลิป — ส่วน &quot;คลิปจากหน้าร้าน&quot; จะยังไม่แสดงบนหน้าเว็บจนกว่าจะเพิ่มคลิปแรก
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {clips.map((c, i) => (
            <ClipAdminCard key={c.id} clip={c} first={i === 0} last={i === clips.length - 1}
                           onMove={(d) => move(i, d)} onToggle={() => patch(c, { visible: !c.visible })}
                           onEdit={() => setEditor({ mode: "edit", clip: c })} onDelete={() => remove(c)} />
          ))}
        </div>
      )}

      {editor && (
        <ClipEditor editor={editor} onClose={() => setEditor(null)}
                    onSaved={(c) => {
                      setClips((l) => (l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c : x)) : [...l, c]));
                      setEditor(null);
                    }} />
      )}
    </div>
  );
}

function ClipAdminCard({ clip, first, last, onMove, onToggle, onEdit, onDelete }: {
  clip: ProductClip; first: boolean; last: boolean; onMove: (d: -1 | 1) => void; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [play, setPlay] = useState(false);
  return (
    <div className={`overflow-hidden rounded-2xl border bg-white ${clip.visible ? "border-border-default" : "border-dashed border-border-default opacity-70"}`}>
      <div className="relative aspect-[9/16] bg-text-heading">
        {play
          ? <video src={clip.videoUrl} poster={clip.posterUrl} controls autoPlay playsInline className="h-full w-full object-contain" />
          : (
            <button type="button" onClick={() => setPlay(true)} className="block h-full w-full" aria-label="เล่นคลิป">
              <img src={clip.posterUrl} alt="" className="h-full w-full object-cover" />
            </button>
          )}
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
          {formatDuration(clip.durationMs)} · {mb(clip.sizeBytes)}
        </span>
        {!clip.visible && <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-text-muted">ซ่อนอยู่</span>}
      </div>
      <div className="space-y-2 p-3">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-text-heading">{clip.title ?? <span className="font-normal text-text-muted">ไม่มีหัวข้อ</span>}</p>
        {clip.products.length > 0
          ? <ul className="space-y-0.5 text-[11px] text-text-muted">{clip.products.map((p, i) => <li key={i} className="line-clamp-1">• {p.productName}{p.storage ? ` ${p.storage}` : ""}{p.sku ? ` · ${p.sku}` : ""}</li>)}</ul>
          : <p className="text-[11px] text-warning-text">ยังไม่ได้ผูกสินค้า (ไม่ขึ้นในหน้าสินค้า)</p>}
        <div className="flex items-center gap-1 pt-1">
          <IconBtn label="เลื่อนไปก่อน" disabled={first} onClick={() => onMove(-1)}><ArrowLeft size={14} /></IconBtn>
          <IconBtn label="เลื่อนไปหลัง" disabled={last} onClick={() => onMove(1)}><ArrowRight size={14} /></IconBtn>
          <span className="flex-1" />
          <IconBtn label={clip.visible ? "ซ่อนจากหน้าเว็บ" : "แสดงบนหน้าเว็บ"} onClick={onToggle}>{clip.visible ? <Eye size={14} /> : <EyeOff size={14} />}</IconBtn>
          <IconBtn label="แก้หัวข้อ/สินค้า" onClick={onEdit}><Pencil size={14} /></IconBtn>
          <IconBtn label="ลบคลิป" danger onClick={onDelete}><Trash2 size={14} /></IconBtn>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
            className={`rounded-lg border p-1.5 disabled:opacity-30 ${danger ? "border-error-border bg-error-bg text-error-text hover:bg-error-text hover:text-white" : "border-border-default bg-white text-text-body hover:bg-bg-subtle"}`}>
      {children}
    </button>
  );
}

/* ============================ เพิ่ม/แก้คลิป ============================ */

function ClipEditor({ editor, onClose, onSaved }: { editor: Editor; onClose: () => void; onSaved: (c: ProductClip) => void }) {
  const editing = editor.mode === "edit" ? editor.clip : null;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [products, setProducts] = useState<ClipProduct[]>(editing?.products ?? []);
  const [compressed, setCompressed] = useState<CompressedClip | null>(null);
  const [poster, setPoster] = useState<File | null>(null);
  const [step, setStep] = useState<"compress" | "ready" | "upload">(editing ? "ready" : "compress");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const abort = useRef<AbortController | null>(null);

  const videoUrl = useMemo(() => (compressed ? URL.createObjectURL(compressed.video) : editing?.videoUrl ?? null), [compressed, editing]);
  const posterUrl = useMemo(() => (poster ? URL.createObjectURL(poster) : editing?.posterUrl ?? null), [poster, editing]);
  useEffect(() => () => { if (compressed && videoUrl) URL.revokeObjectURL(videoUrl); }, [compressed, videoUrl]);
  useEffect(() => () => { if (poster && posterUrl) URL.revokeObjectURL(posterUrl); }, [poster, posterUrl]);

  // เปิดมา (เพิ่มคลิป) → เริ่มย่อทันที
  useEffect(() => {
    if (editor.mode !== "create") return;
    const ctl = new AbortController();
    abort.current = ctl;
    compressClip(editor.file, { onProgress: setProgress, signal: ctl.signal })
      .then((c) => { setCompressed(c); setPoster(c.poster); setStep("ready"); })
      .catch((e) => {
        if (ctl.signal.aborted) return;
        console.error("compress clip", e);
        setError(e instanceof ClipError ? e.message : "ย่อคลิปไม่สำเร็จ — ลองใช้ Chrome หรือ Safari เวอร์ชันล่าสุด หรือบันทึกคลิปใหม่จากมือถือ");
      });
    return () => ctl.abort();
  }, [editor]);

  const close = () => {
    if (step === "upload") return;
    abort.current?.abort();
    onClose();
  };

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

  const save = async () => {
    const data = { title: title.trim() || null, products };
    if (editing) {
      setStep("upload");
      try {
        const res = await api.patch<ProductClip>(`/admin/product-clips/${editing.id}`, { ...data, title: title.trim() });
        toast.success("บันทึกแล้ว");
        onSaved(res.data);
      } catch (e) {
        toast.error(getApiError(e, "บันทึกไม่สำเร็จ"));
        setStep("ready");
      }
      return;
    }
    if (!compressed || !poster) return;
    setStep("upload");
    setProgress(0);
    const fd = new FormData();
    fd.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }));
    fd.append("video", compressed.video, "clip.mp4");
    fd.append("poster", poster, "poster.jpg");
    try {
      const res = await api.post<ProductClip>("/admin/product-clips", fd, {
        onUploadProgress: (e) => setProgress(e.total ? e.loaded / e.total : 0),
      });
      toast.success(products.length ? "เพิ่มคลิปแล้ว — ขึ้นหน้าแรกและหน้าสินค้าที่เลือกทันที" : "เพิ่มคลิปแล้ว — ขึ้นหน้าแรกทันที");
      onSaved(res.data);
    } catch (e) {
      toast.error(getApiError(e, "อัปโหลดคลิปไม่สำเร็จ"));
      setStep("ready");
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={editing ? "แก้คลิป" : "เพิ่มคลิป"} onClick={close}>
      <div className="modal-dd w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={close} disabled={step === "upload"} className="modal-close" aria-label="ปิด"><X size={20} /></button>
        <h2 className="card-title">{editing ? "แก้หัวข้อ / สินค้าในคลิป" : "เพิ่มคลิปสินค้า"}</h2>

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
            <p className="text-xs text-text-muted">{editor.mode === "create" && `${editor.file.name} · ${mb(editor.file.size)}`} · อย่าปิดหน้านี้ระหว่างย่อ</p>
            <button type="button" onClick={close} className="btn-ghost text-sm">ยกเลิก</button>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,260px)_1fr]">
            <div className="space-y-2">
              <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-text-heading">
                {videoUrl && <video ref={videoEl} src={videoUrl} poster={posterUrl ?? undefined} controls playsInline className="h-full w-full object-contain" />}
              </div>
              {compressed ? (
                <>
                  <button type="button" onClick={grabPoster} className="btn-secondary w-full text-sm"><Camera size={15} /> ใช้ภาพตอนนี้เป็นปก</button>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    {posterUrl && <img src={posterUrl} alt="ภาพปก" className="h-14 w-8 rounded object-cover" />}
                    <span>ภาพปก · เลื่อนคลิปไปเฟรมที่ชอบแล้วกดปุ่มด้านบน<br />{formatDuration(compressed.durationSec * 1000)} · {compressed.width}×{compressed.height} · {mb(compressed.video.size)}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-text-muted">แก้ได้เฉพาะหัวข้อและสินค้า — ถ้าจะเปลี่ยนคลิป/ภาพปก ให้ลบแล้วเพิ่มใหม่</p>
              )}
            </div>

            <div className="min-w-0 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-text-heading">หัวข้อคลิป <span className="font-normal text-text-muted">(ไม่ใส่ก็ได้)</span></span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="input-dd" placeholder="เช่น iPhone 14 Pro สีม่วง สภาพนางฟ้า แบต 100%" />
                <span className="mt-1 block text-right text-[11px] tabular-nums text-text-muted">{title.length}/80</span>
              </label>
              <ProductPicker value={products} onChange={setProducts} />
              {step === "upload" && !editing && (
                <div>
                  <p className="mb-1 text-xs text-text-muted">กำลังอัปโหลด {Math.round(progress * 100)}%</p>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-subtle"><div className="h-full bg-yellow transition-[width]" style={{ width: `${progress * 100}%` }} /></div>
                </div>
              )}
              <div className="flex justify-end gap-2 border-t border-border-default pt-4">
                <button type="button" onClick={close} disabled={step === "upload"} className="btn-ghost">ยกเลิก</button>
                <button type="button" onClick={save} disabled={step === "upload"} className="btn-primary">
                  {step === "upload" ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก</> : editing ? <><Check size={16} /> บันทึก</> : <><Upload size={16} /> อัปโหลดคลิป</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================ เลือกสินค้าจากคลัง ============================ */

interface CatalogLite {
  id: string; type: string; productName: string; brand?: string; condition: string; conditionLabel: string;
  color: string | null; storage: string | null; sku: string | null; minPrice: number | null; imageUrl: string | null;
  sold?: boolean; stockState?: string | null;
  options?: { variantId: string; color: string | null; storage: string | null; price: number | null; quantity: number; imageUrl: string | null }[] | null;
}

interface PickRow { key: string; product: ClipProduct; imageUrl: string | null; price: number | null; note: string | null; haystack: string; brand?: string }

const rowKey = (p: Pick<ClipProduct, "catalogId" | "variantId" | "productName">) => `${p.catalogId ?? ""}|${p.variantId ?? ""}|${p.catalogId ? "" : p.productName}`;

/** catalog → แถวที่เลือกได้: มือ 2 = รายเครื่อง · มือ 1 = รายสี/ความจุ · ไม่เอาเครื่องที่ขายแล้ว */
function pickRows(items: CatalogLite[]): PickRow[] {
  const rows: PickRow[] = [];
  for (const it of items) {
    if (it.sold) continue;
    const reservedNote = it.stockState === "RESERVED" || it.stockState === "DEPOSITED" ? "มีคนจองแล้ว" : null;
    const opts = it.type === "MODEL" ? it.options ?? [] : [];
    if (opts.length > 0) {
      for (const o of opts) {
        const product: ClipProduct = { catalogId: it.id, variantId: o.variantId, productName: it.productName, color: o.color, storage: o.storage, conditionLabel: it.conditionLabel, sku: it.sku };
        rows.push({ key: rowKey(product), product, imageUrl: o.imageUrl ?? it.imageUrl, price: o.price, note: o.quantity > 0 ? null : "หมด", brand: it.brand,
          haystack: norm([it.productName, o.color, o.storage, it.conditionLabel, it.sku].join(" ")) });
      }
    } else {
      const product: ClipProduct = { catalogId: it.id, variantId: null, productName: it.productName, color: it.color, storage: it.storage, conditionLabel: it.conditionLabel, sku: it.sku };
      rows.push({ key: rowKey(product), product, imageUrl: it.imageUrl, price: it.minPrice, note: reservedNote, brand: it.brand,
        haystack: norm([it.productName, it.color, it.storage, it.conditionLabel, it.sku].join(" ")) });
    }
  }
  return rows.sort((a, b) => compareModelNames({ productName: a.product.productName, brand: a.brand }, { productName: b.product.productName, brand: b.brand })
    || (a.price ?? Infinity) - (b.price ?? Infinity));
}

function ProductPicker({ value, onChange }: { value: ClipProduct[]; onChange: (v: ClipProduct[]) => void }) {
  const [rows, setRows] = useState<PickRow[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    getCatalog<CatalogLite>({ force: true }).then((c) => setRows(pickRows(c))).catch(() => setRows([]));
  }, []);

  const chosen = new Set(value.map(rowKey));
  const tokens = norm(q).split(" ").filter(Boolean);
  const results = (rows ?? []).filter((r) => tokens.every((t) => r.haystack.includes(t))).slice(0, 40);
  const toggle = (p: ClipProduct) => {
    const k = rowKey(p);
    if (chosen.has(k)) onChange(value.filter((v) => rowKey(v) !== k));
    else if (value.length >= MAX_PRODUCTS) toast.error(`ผูกสินค้าได้สูงสุด ${MAX_PRODUCTS} ชิ้นต่อคลิป`);
    else onChange([...value, p]);
  };

  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-text-heading">สินค้าในคลิป <span className="font-normal text-text-muted">({value.length}/{MAX_PRODUCTS}) · ลูกค้ากดจากคลิปไปหน้าเครื่องได้เลย</span></p>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((p) => (
            <span key={rowKey(p)} className="inline-flex items-center gap-1 rounded-full border border-yellow bg-yellow-muted px-2.5 py-1 text-xs font-semibold text-text-heading">
              {p.productName}{p.color ? ` · ${p.color}` : ""}{p.storage ? ` · ${p.storage}` : ""}{p.sku ? ` · ${p.sku}` : ""}
              <button type="button" onClick={() => toggle(p)} aria-label={`เอา ${p.productName} ออก`} className="rounded-full p-0.5 hover:bg-white"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} className="input-dd pl-9" placeholder="ค้นหารุ่น / สี / ความจุ / รหัส DD…" aria-label="ค้นหาสินค้า" />
      </div>
      <ul className="mt-2 max-h-72 divide-y divide-border-default overflow-y-auto rounded-xl border border-border-default">
        {rows === null ? (
          <li className="flex items-center justify-center gap-2 p-6 text-sm text-text-muted"><Loader2 size={16} className="animate-spin" /> กำลังโหลดสินค้าในคลัง</li>
        ) : results.length === 0 ? (
          <li className="p-6 text-center text-sm text-text-muted">ไม่พบสินค้าที่ตรงกับ &quot;{q}&quot;</li>
        ) : results.map((r) => {
          const on = chosen.has(r.key);
          return (
            <li key={r.key}>
              <button type="button" onClick={() => toggle(r.product)} aria-pressed={on}
                      className={`flex w-full items-center gap-3 p-2 text-left ${on ? "bg-yellow-muted" : "hover:bg-bg-subtle"}`}>
                {r.imageUrl
                  ? <img src={r.imageUrl} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg bg-bg-subtle object-contain" />
                  : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-text-disabled"><Smartphone size={18} /></span>}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-sm font-semibold text-text-heading">{r.product.productName}</span>
                  <span className="line-clamp-1 text-xs text-text-muted">
                    {[r.product.color, r.product.storage, r.product.conditionLabel, r.product.sku].filter(Boolean).join(" · ")}
                    {r.note && <span className="ml-1 font-semibold text-warning-text">· {r.note}</span>}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-text-heading">{r.price != null ? baht(r.price) : ""}</span>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${on ? "border-yellow bg-yellow text-text-heading" : "border-border-default"}`}>{on && <Check size={14} />}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
