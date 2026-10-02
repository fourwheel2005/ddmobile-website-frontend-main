"use client";
/* eslint-disable @next/next/no-img-element -- พรีวิว blob: URL ของรูปในเครื่องลูกค้า (next/image ใช้กับ blob ไม่ได้) */
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Camera, ImagePlus, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import {
  MAX_PHOTOS, MIN_SELL_PHOTOS, PHOTO_SLOTS, missingRequiredSlots,
  type PhotoItem, type PhotoSlot,
} from "@/lib/serviceRequest";
import { newPhotoId, prepareImage } from "./imagePrep";

/**
 * อัปโหลดรูปเครื่อง — ช่องแนะนำ ด้านหน้า / ด้านหลัง / ขอบเครื่อง / หน้าจอ / จุดตำหนิ + รูปเพิ่มเติม
 * {@code requireMin} (ขายเครื่อง) = ต้องครบ 4 ช่องบังคับ และรวม ≥ 5 รูป · ผ่อนบอลลูน = ไม่บังคับ
 * รูปถูกย่อ/บีบทีละรูป (ไม่ถอดรหัสพร้อมกันหลายรูป — มือถือเครื่องเล็กแรมไม่พอ/ค้าง)
 */
export default function PhotoUploader({ photos, setPhotos, requireMin }: {
  photos: PhotoItem[];
  setPhotos: Dispatch<SetStateAction<PhotoItem[]>>;
  requireMin: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const target = useRef<PhotoSlot>("EXTRA");
  const [busy, setBusy] = useState<PhotoSlot | null>(null);
  // จำนวนรูปล่าสุดระหว่างวนเตรียมรูปหลายไฟล์ (หลัง await แต่ละรอบ React commit แล้ว effect นี้อัปเดตให้)
  const latest = useRef(photos);
  useEffect(() => { latest.current = photos; }, [photos]);

  const open = (slot: PhotoSlot) => {
    if (busy) return;
    target.current = slot;
    if (inputRef.current) {
      inputRef.current.multiple = slot === "EXTRA";
      inputRef.current.value = "";   // เลือกรูปเดิมซ้ำได้
      inputRef.current.click();
    }
  };

  const onPick = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    const slot = target.current;
    setBusy(slot);
    try {
      for (const raw of files) {
        // นับจากรูปล่าสุดทุกรอบ (ไม่ใช้ค่าตอนเริ่ม — กันเกินเพดานตอนเลือกหลายรูป) · updater ด้านล่างกันซ้ำอีกชั้น
        if (slot === "EXTRA" && latest.current.length >= MAX_PHOTOS) { toast.error(`แนบรูปได้สูงสุด ${MAX_PHOTOS} รูป`); break; }
        const res = await prepareImage(raw);
        if ("error" in res) { toast.error(res.error); continue; }
        const item: PhotoItem = { id: newPhotoId(), slot, file: res.file, url: URL.createObjectURL(res.file) };
        setPhotos((prev) => {
          if (slot === "EXTRA") {
            if (prev.length >= MAX_PHOTOS) { URL.revokeObjectURL(item.url); return prev; }
            return [...prev, item];
          }
          // ช่องเฉพาะ = 1 รูป → แทนที่ของเดิม
          const old = prev.find((p) => p.slot === slot);
          if (old) URL.revokeObjectURL(old.url);
          return [...prev.filter((p) => p.slot !== slot), item];
        });
        if (slot !== "EXTRA") break;
      }
    } finally {
      setBusy(null);
    }
  };

  const remove = (id: string) => setPhotos((prev) => {
    const gone = prev.find((p) => p.id === id);
    if (gone) URL.revokeObjectURL(gone.url);
    return prev.filter((p) => p.id !== id);
  });

  const missing = missingRequiredSlots(photos);
  const count = photos.length;
  const enough = missing.length === 0 && count >= MIN_SELL_PHOTOS;
  const extras = photos.filter((p) => p.slot === "EXTRA");

  return (
    <div>
      {requireMin && (
        <div className={`mb-3 flex items-start gap-2 rounded-xl border p-3 text-sm ${enough ? "border-success-border bg-success-bg text-success-text" : "border-yellow/50 bg-yellow/10 text-text-heading"}`}>
          {enough ? <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-yellow-hover" />}
          <p>
            <span className="font-bold">ต้องแนบรูปเครื่องอย่างน้อย {MIN_SELL_PHOTOS} รูป</span> — แนบแล้ว{" "}
            <span className="font-bold">{count}/{MIN_SELL_PHOTOS}</span> รูป
            <span className="block text-xs opacity-80">ช่องที่มี * ต้องมีครบ · รูปชัดช่วยให้ประเมินราคาได้แม่นขึ้น</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
        {PHOTO_SLOTS.map((m) => {
          const p = photos.find((x) => x.slot === m.slot);
          return (
            <SlotTile key={m.slot} label={m.label} hint={m.hint} required={requireMin && m.required}
              photo={p} loading={busy === m.slot} onPick={() => open(m.slot)} onRemove={p ? () => remove(p.id) : undefined} />
          );
        })}
      </div>

      {/* รูปเพิ่มเติม (ตำหนิหลายจุด / มุมอื่น) */}
      <div className="mt-3 flex flex-wrap gap-2.5">
        {extras.map((p) => (
          <div key={p.id} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border-default">
            <img src={p.url} alt="รูปเพิ่มเติม" className="h-full w-full object-cover" />
            <RemoveButton onClick={() => remove(p.id)} />
          </div>
        ))}
        {count < MAX_PHOTOS && (
          <button type="button" onClick={() => open("EXTRA")} disabled={!!busy}
            className="flex h-20 min-w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border-default px-3 text-xs font-semibold text-text-muted transition-colors hover:border-yellow hover:text-text-heading disabled:opacity-60">
            {busy === "EXTRA" ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
            รูปเพิ่มเติม
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-text-muted">สูงสุด {MAX_PHOTOS} รูป · JPG / PNG · ระบบย่อรูปให้อัตโนมัติก่อนส่ง</p>

      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => onPick(e.target.files)} />
    </div>
  );
}

function SlotTile({ label, hint, required, photo, loading, onPick, onRemove }: {
  label: string; hint: string; required: boolean; photo?: PhotoItem; loading: boolean;
  onPick: () => void; onRemove?: () => void;
}) {
  return (
    <div className="relative">
      <button type="button" onClick={onPick} disabled={loading} aria-label={photo ? `เปลี่ยนรูป${label}` : `แนบรูป${label}`}
        className={`flex aspect-square w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 text-center transition-colors ${
          photo ? "border-success-border" : required ? "border-dashed border-yellow/70 bg-yellow/5 hover:bg-yellow/10" : "border-dashed border-border-default hover:border-yellow"
        }`}>
        {photo ? (
          <img src={photo.url} alt={label} className="h-full w-full object-cover" />
        ) : loading ? (
          <Loader2 size={22} className="animate-spin text-text-muted" />
        ) : (
          <>
            <Camera size={22} className="text-yellow-hover" />
            <span className="px-1 text-xs font-bold text-text-heading">{label}{required && <span className="text-error-text"> *</span>}</span>
            <span className="px-1 text-[10px] leading-tight text-text-muted">{hint}</span>
          </>
        )}
      </button>
      {photo && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">{label}</span>
      )}
      {onRemove && <RemoveButton onClick={onRemove} />}
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="ลบรูป"
      className="absolute right-1 top-1 flex h-6 w-6 min-h-0 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
      <X size={14} />
    </button>
  );
}
