// ไฟล์: lib/errorMessage.ts
// แปลง error จาก axios เป็นข้อความภาษาไทยที่ลูกค้าเข้าใจง่าย — ไม่หลุดศัพท์เทคนิค
//
// ลำดับการเลือกข้อความ:
//   1) เชื่อมต่อไม่ได้ (ไม่มี response / ERR_NETWORK) → บอกให้ตรวจอินเทอร์เน็ต
//   2) ข้อความที่ backend ส่งมา (รองรับทั้ง field "message" และ "error")
//   3) ข้อความมาตรฐานตาม HTTP status
//   4) fallback ที่ผู้เรียกกำหนด

type ApiErrorBody = { message?: unknown; error?: unknown };

type HttpErrorLike = {
  code?: string;
  response?: { status?: number; data?: ApiErrorBody };
};

function asHttpError(err: unknown): HttpErrorLike | undefined {
  return err && typeof err === "object" ? err as HttpErrorLike : undefined;
}

/** HTTP status ที่ backend ตอบกลับมา โดยไม่บังคับให้ผู้เรียก cast `any` */
export function getApiStatus(err: unknown): number | undefined {
  return asHttpError(err)?.response?.status;
}

export function getApiError(err: unknown, fallback: string): string {
  const ax = asHttpError(err);

  // 1) ติดต่อเซิร์ฟเวอร์ไม่ได้เลย
  if (!ax?.response || ax.code === "ERR_NETWORK") {
    return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง";
  }

  // 2) ข้อความจาก backend (validation / business error)
  const data = ax.response.data;
  const backendMsg = data?.message ?? data?.error;
  if (typeof backendMsg === "string" && backendMsg.trim()) {
    return backendMsg.trim();
  }

  // 3) ตาม HTTP status
  const status = ax.response.status ?? 0;
  if (status === 401 || status === 403) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
  if (status === 404) return "ไม่พบข้อมูลที่ต้องการ";
  if (status === 413) return "ไฟล์มีขนาดใหญ่เกินไป กรุณาเลือกไฟล์ที่เล็กลง";
  if (status === 429) return "ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง";
  if (status >= 500) return "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งในภายหลัง";

  // 4) fallback
  return fallback;
}
