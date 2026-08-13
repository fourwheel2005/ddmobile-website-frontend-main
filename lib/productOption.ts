export interface ProductVariantOption {
  variantId: string;
  color: string | null;
  storage: string | null;
}

/** เลือกสี/ความจุจาก short-link ของเครื่อง; URL ปกติที่ไม่มี variant ยังคงเลือกตัวแรกเหมือนเดิม. */
export function initialProductOption<T extends ProductVariantOption>(
  options: T[],
  requestedVariantId: string | null,
): T | null {
  if (requestedVariantId) {
    const exact = options.find((option) => option.variantId === requestedVariantId);
    if (exact) return exact;
  }
  return options[0] ?? null;
}
