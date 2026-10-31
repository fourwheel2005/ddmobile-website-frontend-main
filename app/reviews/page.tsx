import type { Metadata } from "next";
import StoreReviews from "@/components/reviews/StoreReviews";

export const metadata: Metadata = {
  title: "รีวิวจากลูกค้าจริง | DD Mobile",
  description: "คะแนนและรีวิวจากลูกค้าที่ซื้อจริงกับ DD Mobile ทั้งหน้าร้าน เว็บไซต์ และโซเชียล — แสดงทุกระดับคะแนนตามจริง",
};

/** หน้ารีวิวทั้งร้าน (สาธารณะ) */
export default function ReviewsPage() {
  return (
    <div className="page-wrapper min-h-screen bg-bg-subtle">
      <div className="container-dd max-w-5xl py-8 md:py-12">
        <div className="mb-6 text-center">
          <p className="section-label justify-center">รีวิวจากลูกค้าจริง</p>
          <h1 className="text-2xl font-bold text-text-heading md:text-3xl">ลูกค้าพูดถึง DD Mobile อย่างไร</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-text-muted">
            ทุกรีวิวมาจากผู้ซื้อจริง ทั้งหน้าร้าน เว็บไซต์ และโซเชียลของร้าน — เราแสดงทุกระดับคะแนนตามจริง
          </p>
        </div>
        <StoreReviews />
      </div>
    </div>
  );
}
