"use client";
import {
  CheckCircle2, MessageCircle, FileSignature, ShoppingBag, UserCheck, FileText
} from "lucide-react";
import Link from "next/link";

export default function InstallmentsPage() {
  return (
    <div className="page-wrapper min-h-screen bg-bg-base px-4 pb-20 pt-20 text-text-body md:px-8">

      {/* 1. HEADER */}
      <section className="container-dd py-12 md:py-16">
        <span className="badge-dd badge-warning">อาชีพไหนก็ผ่อนได้</span>
        <h1 className="mt-6 font-display text-[clamp(2.5rem,9vw,6rem)] leading-[1.1]">
          อยากได้ไอโฟน แต่ไม่มีบัตรเครดิต <span className="text-yellow">ทำไงดี?</span>
        </h1>
        <p className="mt-6 max-w-2xl text-text-muted">
          ที่ ดีดี โมบาย เราเปิดโอกาสให้ทุกคนเป็นเจ้าของ iPhone ได้ง่ายๆ ดาวน์ถูก ผ่อนสบาย อนุมัติไว ไม่ต้องมีคนค้ำประกัน
        </p>
        <div className="panel-dd mt-8 inline-flex items-baseline gap-3">
          <span className="text-sm text-text-muted">ผ่อนเริ่มต้นเพียง</span>
          <span className="font-display text-4xl tabular-nums text-yellow">1,570.-</span>
          <span className="text-sm text-text-muted">/เดือน</span>
        </div>
      </section>

      {/* 2. BENEFITS */}
      <section className="container-dd border-t border-border-default py-12">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {benefits.map((benefit, idx) => (
            <div key={idx} className="card-dd flex items-center gap-4">
              <CheckCircle2 size={24} className="flex-shrink-0 text-yellow" />
              <p className="font-semibold text-text-body">{benefit}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section className="container-dd border-t border-border-default py-16">
        <p className="section-label">3 ขั้นตอนง่ายๆ รับเครื่องชัวร์</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((step, idx) => (
            <div key={idx} data-index={String(idx + 1).padStart(2, "0")} className="card-dd">
              <div className="mb-6 flex h-16 w-16 items-center justify-center bg-bg-tinted text-yellow">{step.icon}</div>
              <h3 className="card-title">{step.title}</h3>
              <p className="text-sm text-text-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. REQUIREMENTS */}
      <section className="container-dd border-t border-border-default py-16">
        <p className="section-label">รายละเอียด สิ่งที่ต้องเตรียม</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="card-dd">
            <div className="mb-6 flex items-center gap-4">
              <div className="bg-yellow p-3 text-black"><UserCheck size={28} /></div>
              <h3 className="card-title mb-0">คุณสมบัติ</h3>
            </div>
            <ul className="space-y-3">
              {["นักศึกษา อายุ 18 ปีขึ้นไป", "บุคคลธรรมดา อายุ 20 - 60 ปี", "มีบัตรประชาชนสัญชาติไทย", "พนักงานประจำ / อาชีพอิสระ / ธุรกิจส่วนตัว"].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-yellow" />
                  <span className="text-text-body">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card-dd">
            <div className="mb-6 flex items-center gap-4">
              <div className="bg-yellow p-3 text-black"><FileText size={28} /></div>
              <h3 className="card-title mb-0">เอกสารที่ต้องเตรียม</h3>
            </div>
            <ul className="space-y-3">
              {["บัตรประชาชนตัวจริง", "สลิปเงินเดือน หรือ เอกสารแสดงรายได้", "ทะเบียนนักศึกษา หรือ บัตรนักศึกษาตัวจริง (สำหรับนักศึกษา)"].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-yellow" />
                  <span className="text-text-body">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 5. CTA */}
      <section className="container-dd border-t border-border-default py-12">
        <div className="bg-yellow p-8 text-black md:p-12">
          <h2 className="text-black font-display text-[clamp(2rem,6vw,4rem)] leading-[1.1]">พร้อมแล้วใช่ไหม?</h2>
          <p className="mt-3 text-sm font-medium text-black/70">ทักแชทหาแอดมิน เพื่อประเมินสิทธิ์เบื้องต้นได้เลย ไม่มีค่าใช้จ่าย</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="https://lin.ee/Zsq9ja0" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-black px-8 py-4 font-display uppercase tracking-widest text-yellow shadow-[3px_3px_0_#997700] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px]">
              <MessageCircle size={20} /> ทักแชทแอดมิน (LINE) →
            </a>
            <Link href="/products" className="inline-flex items-center justify-center border border-black/30 bg-black/10 px-8 py-4 font-display uppercase tracking-widest text-black transition-colors hover:bg-black/20">
              ดูสินค้าน่าสนใจ →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const benefits = [
  "ใช้บัตรประชาชนใบเดียวในการทำเรื่อง",
  "ดาวน์ถูก ผ่อนสบาย จ่ายเงินผ่านแอปได้",
  "เครื่องแท้มือ 1 รับประกันศูนย์ไทย",
  "มีหน้าร้านชัดเจน ปลอดภัย ไว้ใจได้"
];

const steps = [
  { icon: <MessageCircle size={32} />, title: "ทักแชทหาแอดมิน", desc: "แจ้งรุ่นที่สนใจ สอบถามเงื่อนไข และส่งเอกสารเบื้องต้นผ่านแชทได้เลย" },
  { icon: <FileSignature size={32} />, title: "ลงทะเบียน", desc: "กรอกข้อมูลยืนยันตัวตนง่ายๆ ทราบผลอนุมัติไวภายใน 1 วัน" },
  { icon: <ShoppingBag size={32} />, title: "นัดรับเครื่อง", desc: "รับเครื่องที่หน้าร้าน หรือจัดส่งด่วนถึงบ้าน พร้อมแกะกล่องเช็คเครื่อง" }
];
