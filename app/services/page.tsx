import type { Metadata } from "next";
import { Suspense } from "react";
import { Banknote, CreditCard, HandCoins } from "lucide-react";
import ServiceHero from "@/components/service/ServiceHero";
import ServicesFromQuery from "@/components/service/ServicesFromQuery";
import { SERVICES } from "@/lib/services";

export const metadata: Metadata = {
  title: "เลือกบริการ ขายเครื่อง / ผ่อนเครื่อง / ผ่อนบอลลูน | DD Mobile",
  description: "เลือกบริการที่ต้องการ — ขายเครื่อง ผ่อนเครื่อง หรือผ่อนบอลลูน (บริการแลกเงิน) กรอกข้อมูลครั้งเดียว ทีมงานติดต่อกลับทาง LINE",
};

/** หน้า static — อ่าน ?s=SELL,INSTALLMENT ฝั่ง client (ไม่บังคับ render ฝั่ง server ทุก request) */
export default function ServicesPage() {
  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      <ServiceHero
        badge="กรอกครั้งเดียว · ทีมงานติดต่อกลับทาง LINE"
        title="เลือกบริการ"
        highlight="ที่คุณต้องการ"
        desc="ติ๊กเลือกบริการได้มากกว่า 1 อย่าง ระบบจะแสดงช่องข้อมูลที่ต้องกรอกตามบริการที่เลือก"
        points={[
          { icon: HandCoins, t: SERVICES.SELL.label, d: SERVICES.SELL.desc },
          { icon: CreditCard, t: SERVICES.INSTALLMENT.label, d: SERVICES.INSTALLMENT.desc },
          { icon: Banknote, t: SERVICES.BALLOON.label, d: SERVICES.BALLOON.desc },
        ]}
      />
      <section className="container-dd py-8 md:py-12">
        <div className="mx-auto max-w-3xl">
          <Suspense fallback={<div className="card-dd h-40 animate-pulse" />}>
            <ServicesFromQuery />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
