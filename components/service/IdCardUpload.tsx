"use client";
/* eslint-disable @next/next/no-img-element -- พรีวิว blob: URL ของรูปในเครื่องลูกค้า */
import { useRef, useState } from "react";
import { IdCard, Loader2, Lock, RefreshCw, X } from "lucide-react";
import toast from "react-hot-toast";
import { prepareImage } from "./imagePrep";

/**
 * แนบรูปบัตรประชาชน (บังคับก่อนส่งคำขอผ่อน)
 * ไฟล์ส่งไปเก็บในระบบร้านแบบส่วนตัว — ไม่ส่งรูปบัตรเข้าแชท LINE · ลบอัตโนมัติตามระยะเก็บรักษา
 */
export interface PickedImage { file: File; url: string; }

/** URL พรีวิวอยู่คู่กับไฟล์ — เปลี่ยน/ลบแล้วคืนหน่วยความจำของ URL เก่าทันที · ผู้ใช้ component คืนตอน unmount */
export default function IdCardUpload({ value, onChange, error }: {
  value: PickedImage | null;
  onChange: (v: PickedImage | null) => void;
  error?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      // บัตรต้องอ่านตัวอักษรออก → ด้านยาว 1800px (ใหญ่กว่ารูปเครื่องเล็กน้อย)
      const res = await prepareImage(f, 1800);
      if ("error" in res) { toast.error(res.error); return; }
      if (value) URL.revokeObjectURL(value.url);
      onChange({ file: res.file, url: URL.createObjectURL(res.file) });
    } finally {
      setBusy(false);
    }
  };

  const open = () => { if (inputRef.current) { inputRef.current.value = ""; inputRef.current.click(); } };

  return (
    <div>
      <div className="mb-3 flex items-start gap-2 rounded-xl border border-info-border bg-info-bg p-3 text-xs text-info-text">
        <Lock size={15} className="mt-0.5 flex-shrink-0" />
        <p>
          <span className="font-bold">ใช้สำหรับตรวจสอบข้อมูลและพิจารณาการผ่อนเท่านั้น</span> — รูปบัตรเก็บในระบบของร้านแบบปลอดภัย
          ดูได้เฉพาะเจ้าหน้าที่ ไม่ส่งเข้าแชท และลบอัตโนมัติเมื่อพ้นระยะเวลาที่จำเป็น
        </p>
      </div>

      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-success-border bg-success-bg/50 p-3">
          <img src={value.url} alt="บัตรประชาชนที่แนบ" className="h-20 w-32 flex-shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-text-heading">แนบบัตรประชาชนแล้ว</p>
            <p className="text-xs text-text-muted">ตรวจให้แน่ใจว่าตัวอักษรอ่านออกชัด</p>
            <div className="mt-1.5 flex gap-3">
              <button type="button" onClick={open} disabled={busy} className="inline-flex min-h-0 items-center gap-1 text-xs font-semibold text-yellow-text hover:text-text-heading">
                <RefreshCw size={12} /> เปลี่ยนรูป
              </button>
              <button type="button" onClick={() => { URL.revokeObjectURL(value.url); onChange(null); }} className="inline-flex min-h-0 items-center gap-1 text-xs font-semibold text-error-text">
                <X size={12} /> ลบ
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={open} disabled={busy}
          className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-6 text-center transition-colors hover:border-yellow hover:bg-yellow/5 ${error ? "border-error-border" : "border-yellow/60"}`}>
          {busy ? <Loader2 size={26} className="animate-spin text-text-muted" /> : <IdCard size={26} className="text-yellow-hover" />}
          <span className="text-sm font-bold text-text-heading">แนบรูปบัตรประชาชน (ด้านหน้า) <span className="text-error-text">*</span></span>
          <span className="text-xs text-text-muted">ถ่ายให้เห็นทั้งใบ ไม่มีแสงสะท้อน ตัวอักษรอ่านออก</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

/** ช่องยินยอม (PDPA) — ใช้คู่กับการแนบบัตรประชาชนทุกที่ */
export function IdCardConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-text-body">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 flex-shrink-0 accent-yellow-hover" />
      <span>
        ยินยอมให้ ดีดี โมบาย ใช้ข้อมูลและรูปบัตรประชาชนเพื่อ<span className="font-semibold text-text-heading">ตรวจสอบข้อมูลและพิจารณาการผ่อน</span>
        {" "}ตาม<a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-yellow-text underline-offset-2 hover:underline">นโยบายความเป็นส่วนตัว</a>
        <span className="text-error-text"> *</span>
      </span>
    </label>
  );
}
