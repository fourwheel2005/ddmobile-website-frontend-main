"use client";
import { BatteryMedium, ShieldCheck, Camera, Info } from "lucide-react";
import { gradeDescription } from "@/lib/gradeInfo";

/**
 * กล่อง "ความมั่นใจก่อนซื้อ" สำหรับเครื่องมือสอง (S13/UX-03)
 *
 * กติกาสำคัญ: โชว์เฉพาะข้อมูลจริงจาก Stock · field ที่ Stock ไม่ได้ส่งมา → "ยังไม่ได้ระบุ"
 * ห้ามใช้ default ที่ดูเหมือนตรวจแล้ว (เช่น "ผ่านการตรวจสอบ", "แบตพร้อมใช้") — โกหกลูกค้า
 */
export interface ConfidenceData {
  grade?: string | null;
  batteryHealth?: number | null;
  batteryCheckedAt?: string | null;
  warrantyExpire?: string | null;
  photoCount?: number | null;
  stockState?: string | null;
  inspection?: { screen?: string | null; body?: string | null; camera?: string | null; faceId?: string | null } | null;
  accessories?: string | null;
  defectNotes?: string | null;
}

const UNSPECIFIED = "ยังไม่ได้ระบุ";

function dateTh(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

/** แถวข้อมูล — value ว่าง → แสดง "ยังไม่ได้ระบุ" สีจาง (ไม่เดา/ไม่ default หลอก) */
function Field({ label, value }: { label: string; value: React.ReactNode | null | undefined }) {
  const empty = value == null || value === "";
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className={`col-span-2 ${empty ? "text-text-disabled" : "font-medium text-text-heading"}`}>
        {empty ? UNSPECIFIED : value}
      </dd>
    </div>
  );
}

export default function ProductConfidence({ data }: { data: ConfidenceData }) {
  const gradeDesc = gradeDescription(data.grade);
  const battery = data.batteryHealth;
  const insp = data.inspection ?? {};
  const anyUnspecified =
    !data.grade || battery == null || !data.warrantyExpire ||
    !insp.screen || !insp.body || !insp.camera || !insp.faceId ||
    !data.accessories || !data.defectNotes;

  return (
    <section aria-labelledby="confidence-title" className="rounded-2xl border border-border-default bg-white p-4">
      <h2 id="confidence-title" className="mb-3 flex items-center gap-2 font-bold text-text-heading">
        <ShieldCheck size={18} className="text-success-text" /> ข้อมูลสภาพเครื่อง (มือสอง)
      </h2>

      {/* แบตเตอรี่ — % จริง + เวลาที่ตรวจ (Stock ยังไม่ส่งเวลา → ยังไม่ได้ระบุ) */}
      {battery != null && (
        <div className="mb-3 rounded-xl border border-border-default bg-bg-subtle p-3.5">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-text-heading"><BatteryMedium size={16} className="text-success-text" /> สุขภาพแบตเตอรี่</span>
            <span className="font-bold text-text-heading">{battery}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-border-default">
            <div
              className={`h-full rounded-full ${battery >= 85 ? "bg-success-text" : battery >= 75 ? "bg-yellow" : "bg-error-text"}`}
              style={{ width: `${Math.min(100, Math.max(0, battery))}%` }}
              role="progressbar" aria-valuenow={battery} aria-valuemin={0} aria-valuemax={100} aria-label="สุขภาพแบตเตอรี่"
            />
          </div>
          <p className="mt-1.5 text-xs text-text-muted">
            ตรวจเมื่อ: <span className={data.batteryCheckedAt ? "text-text-body" : "text-text-disabled"}>{dateTh(data.batteryCheckedAt) ?? UNSPECIFIED}</span>
          </p>
        </div>
      )}

      <dl className="divide-y divide-border-subtle">
        <Field label="เกรดสภาพ" value={data.grade ? <span className="badge-dd badge-info">เกรด {data.grade}{gradeDesc ? ` · ${gradeDesc}` : ""}</span> : null} />
        <Field label="ประกัน" value={dateTh(data.warrantyExpire)} />
        <Field label="รูปจริงของสินค้า" value={data.photoCount != null && data.photoCount > 0 ? `${data.photoCount} รูป` : null} />
        <Field label="สถานะสต็อก" value={data.stockState === "SOLD" ? "ขายแล้ว" : data.stockState === "AVAILABLE" ? "พร้อมขาย" : null} />

        {/* checklist ตรวจสภาพ — Stock ยังไม่ส่ง → ยังไม่ได้ระบุ (ไม่ fabricate) */}
        <Field label="หน้าจอ" value={insp.screen} />
        <Field label="ตัวเครื่อง/บอดี้" value={insp.body} />
        <Field label="กล้อง" value={insp.camera} />
        <Field label="Face ID / สแกนนิ้ว" value={insp.faceId} />

        <Field label="อุปกรณ์ที่ให้มา" value={data.accessories} />
        <Field label="ตำหนิ/หมายเหตุ" value={data.defectNotes} />
      </dl>

      {anyUnspecified && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-bg-subtle px-3 py-2 text-xs text-text-muted">
          <Info size={14} className="mt-0.5 flex-shrink-0" />
          รายการที่ขึ้นว่า “{UNSPECIFIED}” คือร้านยังไม่ได้บันทึกผลตรวจลงระบบ — สอบถามแอดมินทางไลน์เพื่อขอรายละเอียด/รูปเพิ่มก่อนตัดสินใจได้เลย
        </p>
      )}
      {data.photoCount != null && data.photoCount > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-text-muted"><Camera size={12} /> รูปทั้งหมดเป็นรูปถ่ายจากเครื่องจริงที่ร้านบันทึกไว้</p>
      )}
    </section>
  );
}
