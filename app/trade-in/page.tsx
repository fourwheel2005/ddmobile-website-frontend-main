import type { Metadata } from "next";
import { Banknote, Clock, ShieldCheck } from "lucide-react";
import ServiceHero from "@/components/service/ServiceHero";
import ServiceRequestForm from "@/components/service/ServiceRequestForm";
import { SERVICES } from "@/lib/services";

// URL เดิม /trade-in คงไว้ (ลิงก์/QR/โฆษณาเดิมไม่พัง) — ชื่อบริการใหม่ "ผ่อนบอลลูน (บริการแลกเงิน)"
export const metadata: Metadata = {
  title: `${SERVICES.BALLOON.label} | DD Mobile`,
  description: "นำ iPhone / iPad มาแลกเงินสด แล้วผ่อนใช้เครื่องเดิมต่อได้ — ประเมินราคาฟรี ได้เงินไวภายในวันเดียว",
};

export default function BalloonPage() {
  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      <ServiceHero
        badge="ประเมินราคาฟรี · ไม่มีค่าใช้จ่าย"
        title={SERVICES.BALLOON.label}
        highlight="เปลี่ยนเป็นเงินสดได้ทันที"
        desc="นำ iPhone / iPad ของคุณมาแลกเงินสด แล้วผ่อนใช้เครื่องเดิมต่อได้ — กรอกสภาพเครื่องด้านล่าง ทีมงานตีราคาจริงและติดต่อกลับทาง LINE"
        points={[
          { icon: Clock, t: "ได้เงินไว", d: "ประเมิน + ตีราคาภายในวันเดียว" },
          { icon: ShieldCheck, t: "ไม่ใช่การจำนำ", d: "ได้เครื่องกลับไปใช้ต่อ" },
          { icon: Banknote, t: "วงเงินสูง", d: "ตีราคาตามรุ่นและสภาพจริง" },
        ]}
      />
      <section className="container-dd py-8 md:py-12">
        <div className="mx-auto max-w-3xl">
          <ServiceRequestForm initialServices={["BALLOON"]} />
        </div>
      </section>
    </div>
  );
}
