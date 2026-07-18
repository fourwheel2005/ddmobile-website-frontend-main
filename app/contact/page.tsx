"use client";
import {
  CheckCircle2, MessageCircle, Phone,
  Target, Users, RefreshCw, Lightbulb, Heart, Clock, TrendingUp, Banknote
} from "lucide-react";

export default function ContactPage() {
  return (
    <div className="page-wrapper min-h-screen bg-bg-base">

      {/* 1. HERO */}
      <section className="bg-bg-subtle">
        <div className="container-dd py-12 md:py-16">
          <p className="section-label">เกี่ยวกับเรา</p>
          <h1 className="text-3xl font-bold text-text-heading md:text-5xl">
            จุดเริ่มต้นของ <span className="text-yellow-hover">ดีดี โมบาย</span>
          </h1>
          <p className="mt-4 text-lg font-medium text-text-muted">&ldquo;เพื่อนที่คอยช่วยเหลือคุณ ให้มีชีวิตที่ดีขึ้น&rdquo;</p>

          <div className="card-dd mt-8">
            <p className="leading-loose text-text-body">
              ใครหลายๆ คนอยากมีไอโฟนสักเครื่อง เป็นเหมือนมือถือในฝัน ที่จะมาคอยจัดการเรื่องต่างๆ ให้ง่ายขึ้น ใช้ชีวิตง่ายขึ้น มีคุณภาพชีวิตที่ดีขึ้น แต่เวลาที่เราอยากได้ไอโฟน การซื้อด้วยเงินสดนั้นไม่ง่ายเลย การผ่อนเองก็เป็นเรื่องยุ่งยากหากเราไม่มีบัตรเครดิต ทำให้คนที่ไม่มีบัตรหรือติดบูโรไม่สามารถผ่อนไอโฟนได้ง่าย เราเข้าใจเรื่องนี้ดี
            </p>
            <h3 className="mt-5 text-xl font-bold leading-snug text-yellow-hover md:text-2xl">
              &ldquo;เพราะเราเห็นโอกาสว่า เราสามารถช่วยให้คนทุกคนจับต้องสิ่งที่ฝันได้&rdquo;
            </h3>
          </div>
        </div>
      </section>

      {/* 2. SERVICES */}
      <section className="container-dd py-12 md:py-16">
        <p className="section-label">ดีดี โมบาย ทำอะไร?</p>
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl bg-yellow p-8">
            <Banknote className="pointer-events-none absolute -bottom-4 -right-4 h-28 w-28 text-text-heading/10" />
            <h3 className="text-2xl font-bold text-text-heading md:text-3xl">ไอโฟนแลกเงิน</h3>
            <ul className="mt-5 space-y-3">
              {["ได้เงินไว วงเงินสูง ภายใน 1 วัน", "ได้เครื่องกลับไปใช้ ไม่ต้องมีคนค้ำ", "ไม่ใช่การจำนำ"].map((text, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl bg-white/60 p-3 text-sm font-medium text-text-heading">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-text-heading" /> {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="card-dd">
            <h3 className="card-title text-2xl md:text-3xl">ผ่อนไอโฟน ไอแพด</h3>
            <ul className="mt-5 space-y-3">
              {["ผ่อนง่าย ไม่ต้องมีบัตรเครดิต", "ใช้แค่บัตรประชาชนใบเดียว", "อนุมัติไวภายใน 1 วัน"].map((text, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl bg-bg-subtle p-3 text-sm font-medium text-text-body">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-yellow-hover" /> {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 3. CORE VALUES */}
      <section className="bg-bg-subtle py-12 md:py-16">
        <div className="container-dd">
          <p className="section-label">ค่านิยมองค์กร (U-FRIEND)</p>
          <h2 className="text-xl font-bold text-text-muted md:text-2xl">&ldquo;มุ่งมั่นที่จะพัฒนาคุณภาพชีวิตของผู้คนให้ได้มากที่สุด&rdquo;</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {coreValues.map((value, idx) => (
              <div key={idx} className="card-dd">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow text-text-heading">{value.icon}</div>
                <h3 className="text-lg font-bold text-text-heading">
                  <span className="text-yellow-hover">{value.letter}</span>{value.title}
                </h3>
                <p className="mt-1 text-sm text-text-muted">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CONTACT CTA */}
      <section className="container-dd py-12 md:py-16">
        <div className="rounded-3xl bg-yellow p-8 text-center md:p-14">
          <h2 className="text-2xl font-bold text-text-heading md:text-4xl">ติดตามและติดต่อเรา</h2>
          <p className="mt-3 font-medium text-text-heading/70">ไวเลย ง่าย ไว ชัวร์ จบที่ ดีดี โมบาย!</p>

          <div className="mx-auto mt-7 grid max-w-3xl grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { icon: <MessageCircle className="h-6 w-6" />, label: "LINE Official", sub: "ไอโฟนผ่อนง่าย", href: "https://lin.ee/rewiz9b" },
              { icon: <Users className="h-6 w-6" />, label: "Facebook Page", sub: "ไอโฟนผ่อนง่ายสำรอง", href: "https://www.facebook.com/iphoneeasyinstallment" },
              { icon: <Phone className="h-6 w-6" />, label: "เบอร์โทรศัพท์", sub: "088-818-8385", href: "tel:0888188385" },
            ].map((c, i) => (
              <a key={i} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 rounded-2xl bg-white p-6 text-center transition-transform hover:-translate-y-0.5">
                <div className="rounded-full bg-text-heading p-3 text-yellow">{c.icon}</div>
                <span className="font-bold text-text-heading">{c.label}</span>
                <span className="text-sm text-text-muted">{c.sub}</span>
              </a>
            ))}
          </div>

          <a href="https://lin.ee/rewiz9b" target="_blank" rel="noopener noreferrer"
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-text-heading px-8 py-3.5 font-semibold text-white transition-transform hover:-translate-y-0.5">
            <MessageCircle className="h-5 w-5" /> ทักแชทแอดมินทันที
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
