"use client";
import {
  CheckCircle2, MessageCircle, Phone,
  Target, Users, RefreshCw, Lightbulb, Heart, Clock, TrendingUp, Smartphone, Banknote
} from "lucide-react";

export default function ContactPage() {
  return (
    <div className="page-wrapper min-h-screen bg-bg-base px-4 pb-20 pt-20 text-text-body md:px-8">

      {/* 1. HERO */}
      <section className="container-dd py-12 md:py-20">
        <p className="section-label">เกี่ยวกับเรา</p>
        <h1 className="font-display text-[clamp(2.5rem,9vw,6rem)] leading-[1.1]">
          จุดเริ่มต้นของ <span className="text-yellow">ดีดี โมบาย</span>
        </h1>
        <p className="mt-6 font-display text-xl uppercase tracking-wider text-text-muted">
          "เพื่อนที่คอยช่วยเหลือคุณ ให้มีชีวิตที่ดีขึ้น"
        </p>

        <div className="panel-dd mt-10">
          <p className="leading-loose text-text-body">
            ใครหลายๆ คนอยากมีไอโฟนสักเครื่อง เป็นเหมือนมือถือในฝัน ที่จะมาคอยจัดการเรื่องต่างๆ ให้ง่ายขึ้น ใช้ชีวิตง่ายขึ้น มีคุณภาพชีวิตที่ดีขึ้น แต่เวลาที่เราอยากได้ไอโฟน การซื้อด้วยเงินสดนั้นไม่ง่ายเลย การผ่อนเองก็เป็นเรื่องยุ่งยากหากเราไม่มีบัตรเครดิต ทำให้คนที่ไม่มีบัตรหรือติดบูโรไม่สามารถผ่อนไอโฟนได้ง่าย เราเข้าใจเรื่องนี้ดี
          </p>
          <h3 className="mt-6 font-display text-2xl leading-snug text-yellow md:text-3xl">
            "เพราะเราเห็นโอกาสว่า เราสามารถช่วยให้คนทุกคนจับต้องสิ่งที่ฝันได้"
          </h3>
        </div>
      </section>

      {/* 2. SERVICES */}
      <section className="container-dd border-t border-border-default py-16">
        <p className="section-label">ดีดี โมบาย ทำอะไร?</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative overflow-hidden bg-yellow p-8 text-black md:p-10">
            <Banknote className="pointer-events-none absolute -bottom-4 -right-4 h-28 w-28 text-black/10" />
            <h3 className="text-black font-display text-3xl md:text-4xl">ไอโฟนแลกเงิน</h3>
            <ul className="mt-6 space-y-3">
              {["ได้เงินไว วงเงินสูง ภายใน 1 วัน", "ได้เครื่องกลับไปใช้ ไม่ต้องมีคนค้ำ", "ไม่ใช่การจำนำ"].map((text, i) => (
                <li key={i} className="flex items-center gap-3 border border-black/15 bg-black/5 p-3 text-sm font-semibold">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-black" /> {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="card-dd p-8 md:p-10">
            <Smartphone className="pointer-events-none absolute -bottom-4 -right-4 h-28 w-28 text-white/5" />
            <h3 className="card-title text-3xl md:text-4xl">ผ่อนไอโฟน ไอแพด</h3>
            <ul className="mt-6 space-y-3">
              {["ผ่อนง่าย ไม่ต้องมีบัตรเครดิต", "ใช้แค่บัตรประชาชนใบเดียว", "อนุมัติไวภายใน 1 วัน"].map((text, i) => (
                <li key={i} className="flex items-center gap-3 border border-border-default bg-bg-tinted p-3 text-sm font-semibold">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-yellow" /> {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 3. CORE VALUES */}
      <section className="container-dd border-t border-border-default py-16">
        <p className="section-label">ค่านิยมองค์กร (U-FRIEND)</p>
        <h2 className="font-display text-[clamp(1.5rem,5vw,3rem)] leading-[1.1] text-text-muted">
          "มุ่งมั่นที่จะพัฒนาคุณภาพชีวิตของผู้คนให้ได้มากที่สุด"
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {coreValues.map((value, idx) => (
            <div key={idx} className="card-dd">
              <div className="mb-4 flex h-12 w-12 items-center justify-center bg-yellow text-black">{value.icon}</div>
              <h3 className="font-display text-xl">
                <span className="text-2xl text-yellow">{value.letter}</span>{value.title}
              </h3>
              <p className="mt-1 text-sm text-text-muted">{value.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. CONTACT CTA */}
      <section className="container-dd border-t border-border-default py-16">
        <div className="bg-yellow p-8 text-black md:p-16">
          <h2 className="text-black font-display text-[clamp(2rem,6vw,4rem)] leading-[1.1]">ติดตามและติดต่อเรา</h2>
          <p className="mt-3 font-display uppercase tracking-wider text-black/70">ไวเลย ง่าย ไว ชัวร์ จบที่ ดีดี โมบาย!</p>

          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { icon: <MessageCircle className="h-6 w-6" />, label: "LINE Official", sub: "@ddmobile" },
              { icon: <Users className="h-6 w-6" />, label: "Facebook Page", sub: "ดีดี โมบาย ผ่อนมือถือ" },
              { icon: <Phone className="h-6 w-6" />, label: "เบอร์โทรศัพท์", sub: "080-XXX-XXXX" },
            ].map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-2 border border-black/15 bg-black/5 p-6 text-center">
                <div className="bg-black p-3 text-yellow">{c.icon}</div>
                <span className="font-display uppercase">{c.label}</span>
                <span className="text-sm opacity-70">{c.sub}</span>
              </div>
            ))}
          </div>

          <a href="https://lin.ee/Zsq9ja0" target="_blank" rel="noopener noreferrer"
            className="mt-8 inline-flex w-full items-center justify-center gap-2 bg-black px-8 py-4 font-display uppercase tracking-widest text-yellow shadow-[3px_3px_0_#997700] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] sm:w-auto">
            <MessageCircle className="h-5 w-5" /> ทักแชทแอดมินทันที →
          </a>
        </div>
      </section>
    </div>
  );
}

const coreValues = [
  { letter: "U", title: "nique", desc: "สนับสนุนความพิเศษของแต่ละคน", icon: <Users size={24} /> },
  { letter: "F", title: "lexibility", desc: "พร้อมรับความเปลี่ยนแปลง", icon: <RefreshCw size={24} /> },
  { letter: "R", title: "esult Oriented", desc: "มุ่งเน้นผลลัพธ์เพื่อความสำเร็จ", icon: <Target size={24} /> },
  { letter: "I", title: "nnovative", desc: "มีความริเริ่มปรับปรุงเปลี่ยนแปลงใหม่", icon: <Lightbulb size={24} /> },
  { letter: "E", title: "nergetic & Ethic", desc: "กระตือรือร้นและมีคุณธรรม", icon: <Heart size={24} /> },
  { letter: "N", title: "ow", desc: "ลงมือทำทันที", icon: <Clock size={24} /> },
  { letter: "D", title: "evelop Yourself", desc: "พัฒนาตัวเองอย่างต่อเนื่อง", icon: <TrendingUp size={24} /> }
];
