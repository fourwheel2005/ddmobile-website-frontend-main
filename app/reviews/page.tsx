import type { Metadata } from "next";
import { BadgeCheck, Facebook } from "lucide-react";
import StoreReviews from "@/components/reviews/StoreReviews";
import SocialReviewsWall from "@/components/reviews/SocialReviewsWall";

export const metadata: Metadata = {
  title: "รีวิวจากลูกค้าจริง | DD Mobile",
  description: "รีวิวจากลูกค้า DD Mobile บนเพจ Facebook ของร้าน และคะแนนจากผู้ซื้อจริงทั้งหน้าร้าน เว็บไซต์ และโซเชียล — แสดงตามจริง",
};

/** หน้ารีวิวทั้งร้าน (สาธารณะ): รีวิวจากเพจ Facebook (ข้อความ) → รีวิวผู้ซื้อจริงพร้อมดาว */
export default function ReviewsPage() {
  return (
    <div className="page-wrapper min-h-screen bg-bg-subtle">
      <div className="container-dd max-w-5xl py-8 md:py-12">
        <div className="mb-8 text-center">
          <p className="section-label justify-center">รีวิวจากลูกค้าจริง</p>
          <h1 className="text-2xl font-bold text-text-heading md:text-3xl">ลูกค้าพูดถึง DD Mobile อย่างไร</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-text-muted">
            ข้อความจากรีวิวบนเพจ Facebook ของร้าน และคะแนนจากผู้ซื้อจริงทั้งหน้าร้าน เว็บไซต์ และโซเชียล — แสดงตามจริง
          </p>
          <nav aria-label="ไปยังส่วนรีวิว" className="mt-4 flex flex-wrap justify-center gap-2">
            <a href="#facebook" className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-white px-4 py-2 text-sm font-semibold text-text-heading hover:border-yellow">
              <Facebook size={15} className="text-[#1877F2]" aria-hidden /> รีวิวจากเพจ Facebook
            </a>
            <a href="#verified" className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-white px-4 py-2 text-sm font-semibold text-text-heading hover:border-yellow">
              <BadgeCheck size={15} className="text-success-text" aria-hidden /> คะแนนจากผู้ซื้อจริง
            </a>
          </nav>
        </div>

        <SocialReviewsWall />

        <section id="verified" aria-labelledby="verified-title" className="mt-12 scroll-mt-24">
          <h2 id="verified-title" className="mb-4 flex items-center gap-2 text-xl font-bold text-text-heading md:text-2xl">
            <BadgeCheck size={24} className="text-success-text" aria-hidden /> คะแนนจากผู้ซื้อจริง
          </h2>
          <StoreReviews />
        </section>
      </div>
    </div>
  );
}
