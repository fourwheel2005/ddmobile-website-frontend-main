"use client";
import { useEffect, useMemo, useState } from "react";
import { Clapperboard } from "lucide-react";
import { getCatalog } from "@/lib/catalog";
import { clipsForItem, loadPublicClips, type ClipCatalogItem, type ProductClip } from "@/lib/productClips";
import ClipRail from "@/components/clips/ClipRail";

/**
 * ส่วน "คลิปจากหน้าร้าน" — หน้าแรก (ทุกคลิปตามลำดับหลังบ้าน) · หน้าสินค้า (เฉพาะคลิปของเครื่อง/รุ่นนั้น)
 * ไม่มีคลิป/โหลดไม่ได้ = ไม่แสดงอะไรเลย (ไม่มีพื้นที่ว่างค้าง)
 */
export default function ProductClipsSection({ item }: { item?: Pick<ClipCatalogItem, "id" | "type" | "productName" | "condition"> }) {
  const [clips, setClips] = useState<ProductClip[]>([]);
  const [catalog, setCatalog] = useState<ClipCatalogItem[]>([]);

  useEffect(() => {
    let alive = true;
    loadPublicClips().then((c) => {
      if (!alive || c.length === 0) return;
      setClips(c);
      // ราคา/สถานะสินค้าในคลิปดึงสดจาก catalog (แคชร่วมกับหน้าอื่น — ไม่ยิงซ้ำ)
      getCatalog<ClipCatalogItem & { id: string }>().then((cat) => { if (alive) setCatalog(cat); }).catch(() => {});
    });
    return () => { alive = false; };
  }, []);

  const shown = useMemo(() => (item ? clipsForItem(clips, item) : clips), [clips, item]);
  if (shown.length === 0) return null;

  if (item) {
    return (
      <section className="mt-10" aria-labelledby="clips-heading">
        <h2 id="clips-heading" className="mb-4 flex items-center gap-2 text-lg font-bold text-text-heading md:text-xl">
          <Clapperboard size={20} className="text-yellow-hover" /> คลิปเครื่องจริงจากร้าน
        </h2>
        <ClipRail clips={shown} catalog={catalog} />
      </section>
    );
  }
  return (
    <section className="container-dd py-12 md:py-16" aria-labelledby="clips-heading">
      <div className="mb-6">
        <p className="section-label">ดูเครื่องจริงก่อนตัดสินใจ</p>
        <h2 id="clips-heading" className="text-2xl font-bold text-text-heading md:text-3xl">คลิปจากหน้าร้าน</h2>
      </div>
      <ClipRail clips={shown} catalog={catalog} />
    </section>
  );
}
