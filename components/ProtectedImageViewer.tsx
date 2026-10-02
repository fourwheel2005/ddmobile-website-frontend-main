"use client";
/* eslint-disable @next/next/no-img-element -- รูปจาก blob: URL ที่ดึงด้วย token แอดมิน (next/image ใช้ไม่ได้) */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import api from "@/lib/api";
import { useEscapeKey } from "@/lib/useEscapeKey";

export interface ProtectedImage { path: string; label: string; }

/**
 * ดูรูปที่ต้องล็อกอินแอดมิน (รูปเครื่องลูกค้า / บัตรประชาชน) — <img src> ส่ง Authorization header ไม่ได้
 * จึงดึงเป็น blob ผ่าน api (แนบ token) แล้วแสดงด้วย object URL
 * โหลด "ตอนเปิดดู" เท่านั้น (คิวงานไม่ดึงรูปทุกแถว) · ปิดแล้วคืนหน่วยความจำ (revoke) ทันที
 */
export default function ProtectedImageViewer({ title, images, onClose }: {
  title: string;
  images: ProtectedImage[];
  onClose: () => void;
}) {
  const [urls, setUrls] = useState<(string | null | "error")[]>(() => images.map(() => null));
  const [active, setActive] = useState(0);
  useEscapeKey(true, onClose);

  useEffect(() => {
    let alive = true;
    const created: string[] = [];
    // ดึงพร้อมกัน (สูงสุด 10 รูป — ขนาดหลังบีบ ~300KB) · รูปไหนพังแสดง error เฉพาะรูปนั้น
    images.forEach((img, i) => {
      api.get(img.path, { responseType: "blob" })
        .then((r) => {
          const u = URL.createObjectURL(r.data as Blob);
          created.push(u);
          if (!alive) { URL.revokeObjectURL(u); return; }
          setUrls((prev) => prev.map((x, j) => (j === i ? u : x)));
        })
        .catch(() => { if (alive) setUrls((prev) => prev.map((x, j) => (j === i ? "error" : x))); });
    });
    return () => { alive = false; created.forEach((u) => URL.revokeObjectURL(u)); };
  }, [images]);

  const cur = urls[active];

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="relative my-auto w-full max-w-3xl rounded-2xl bg-white p-4 sm:p-5" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="ปิด" className="modal-close"><X size={20} /></button>
        <p className="mb-3 pr-12 font-bold text-text-heading">{title} · {images[active]?.label}</p>
        <div className="flex h-[60dvh] items-center justify-center overflow-hidden rounded-xl bg-bg-subtle">
          {cur === null ? <Loader2 className="animate-spin text-text-muted" />
            : cur === "error" ? <p className="text-sm text-error-text">โหลดรูปไม่สำเร็จ (อาจถูกลบตามระยะเก็บรักษาแล้ว)</p>
            : <img src={cur} alt={images[active]?.label} className="max-h-full max-w-full object-contain" />}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => {
              const u = urls[i];
              return (
                <button key={img.path} type="button" onClick={() => setActive(i)} aria-label={img.label}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 ${i === active ? "border-yellow" : "border-transparent"}`}>
                  {u && u !== "error" ? <img src={u} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-bg-subtle"><Loader2 size={14} className={u === "error" ? "hidden" : "animate-spin text-text-muted"} /></span>}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 text-[9px] text-white">{img.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
