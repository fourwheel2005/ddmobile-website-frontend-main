import type { Metadata } from "next";
import { Camera, HandCoins, Zap } from "lucide-react";
import ServiceHero from "@/components/service/ServiceHero";
import ServiceRequestForm from "@/components/service/ServiceRequestForm";
import { SERVICES } from "@/lib/services";

export const metadata: Metadata = {
  title: `${SERVICES.SELL.label} iPhone / iPad รับเงินสด | DD Mobile`,
  description: "ขาย iPhone / iPad ให้ ดีดี โมบาย — แนบรูปเครื่อง 5 รูป ทีมงานประเมินราคาและติดต่อกลับทาง LINE",
};

export default function SellPage() {
  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      <ServiceHero
        badge="ประเมินราคาฟรี · รับเงินสด"
        title={SERVICES.SELL.label}
        highlight="ขาย iPhone / iPad ได้ราคาดี"
        desc="กรอกรุ่นและสภาพเครื่อง แนบรูปเครื่องอย่างน้อย 5 รูป (ด้านหน้า / ด้านหลัง / ขอบเครื่อง / หน้าจอ / จุดตำหนิ) ทีมงานประเมินราคาแล้วติดต่อกลับทาง LINE"
        points={[
          { icon: Camera, t: "แนบรูป 5 รูป", d: "ประเมินจากสภาพจริง แม่นยำ" },
          { icon: Zap, t: "ตอบไว", d: "ทีมงานตีราคาภายในวัน" },
          { icon: HandCoins, t: "รับเงินสด", d: "ตกลงราคาแล้วรับเงินทันที" },
        ]}
      />
      <section className="container-dd py-8 md:py-12">
        <div className="mx-auto max-w-3xl">
          <ServiceRequestForm initialServices={["SELL"]} />
        </div>
      </section>
    </div>
  );
}
