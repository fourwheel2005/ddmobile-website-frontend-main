"use client";
import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import {
  buildServiceMessage, buildSubmitFormData, galleryUrl, newSubmissionKey, validateServiceRequest,
  type ServiceRequestState, type SubmitResult,
} from "@/lib/serviceRequest";
import { needsDevice } from "@/lib/services";

/**
 * shareFiles = รูปเครื่องชุดเดียวกับที่อัปโหลด (ไม่รวมบัตรประชาชน) ให้ลูกค้าแชร์เข้าแชท LINE ต่อ
 * shareLabels = ชื่อช่องของแต่ละรูป (ด้านหน้า/ด้านหลัง/…) เรียงตรงกัน
 */
export interface SubmitDone { res: SubmitResult; message: string; shareFiles: File[]; shareLabels: string[]; previews: string[]; }

/**
 * ส่งฟอร์มเลือกบริการ: ตรวจ → อัปโหลด (มี progress) → คืนเลขอ้างอิง + ข้อความ LINE
 *
 * - กันกดซ้ำแบบ synchronous (lock ref) ก่อน React re-render ปิดปุ่มทัน
 * - submissionKey เดิมใช้ซ้ำเมื่อ "ลองใหม่" หลัง error (server คืนคำขอเดิมถ้าครั้งก่อนบันทึกไปแล้ว)
 *   ผู้เรียกต้อง resetKey() เมื่อข้อมูลในฟอร์มเปลี่ยน (= ความตั้งใจใหม่)
 * - ไม่เปิด LINE อัตโนมัติหลัง await: เบราว์เซอร์มือถือบล็อก popup ที่ไม่ได้มาจากการกดโดยตรง
 *   → ให้ลูกค้ากดปุ่ม LINE ในหน้าสำเร็จ (ลิงก์ <a> ธรรมดา ไม่โดนบล็อก)
 */
export function useServiceSubmit() {
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState<SubmitDone | null>(null);
  const key = useRef<string | null>(null);
  const lock = useRef(false);

  const resetKey = useCallback(() => { key.current = null; }, []);

  const submit = useCallback(async (state: ServiceRequestState, estimatedPrice: number | null) => {
    if (lock.current) return;
    const err = validateServiceRequest(state);
    if (err) { toast.error(err); return; }
    lock.current = true;
    setProgress(0);
    try {
      key.current ??= newSubmissionKey();
      const { data } = await api.post<SubmitResult>("/service-requests", buildSubmitFormData(state, key.current, estimatedPrice), {
        onUploadProgress: (e) => { if (e.total) setProgress(Math.min(99, Math.round((e.loaded / e.total) * 100))); },
      });
      const message = buildServiceMessage(state, data, estimatedPrice, galleryUrl(window.location.origin, data.galleryToken));
      const device = needsDevice(state.services);
      setDone({
        res: data, message,
        shareFiles: device ? state.photos.map((p) => p.file) : [],
        shareLabels: device ? state.photos.map((p) => p.slot) : [],
        previews: device ? state.photos.map((p) => p.url) : [],   // blob URL เดิมของฟอร์ม (คืนตอนออกจากหน้า)
      });
      key.current = null;   // ส่งสำเร็จ → ครั้งหน้าคือคำขอใหม่
      navigator.clipboard?.writeText(message).catch(() => { /* มีปุ่มคัดลอกในหน้าสำเร็จ */ });
    } catch (e) {
      toast.error(getApiError(e, "ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      lock.current = false;
      setProgress(null);
    }
  }, []);

  return { submit, progress, done, reset: () => setDone(null), resetKey };
}
