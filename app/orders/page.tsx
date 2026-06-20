"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Loader2, Package, ChevronRight } from "lucide-react";
import { statusOf } from "@/lib/orderStatus";

interface OrderItem { productName: string; conditionLabel: string; quantity: number; }
interface Order {
  id: number; total: number; status: string; paymentMethod: string;
  createdAt: string; items: OrderItem[];
}

const money = (v: number) => "฿" + Number(v).toLocaleString();

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { router.replace("/login?redirect=/orders"); return; }
    api.get("/orders")
      .then((res) => setOrders(res.data))
      .catch((err) => { if ([401, 403].includes(err?.response?.status)) router.replace("/login?redirect=/orders"); })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-bg-base text-yellow-hover"><Loader2 size={40} className="animate-spin" /></div>;
  }

  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      <div className="container-dd py-8 md:py-12">
        <h1 className="mb-6 text-2xl font-bold text-text-heading md:text-3xl">คำสั่งซื้อของฉัน</h1>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-default bg-bg-subtle py-20 text-center">
            <Package size={48} className="mx-auto mb-3 text-text-disabled" />
            <h3 className="text-lg font-bold text-text-heading">ยังไม่มีคำสั่งซื้อ</h3>
            <Link href="/products" className="btn-primary mt-5 inline-flex">เริ่มเลือกซื้อ</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const s = statusOf(o.status);
              const Icon = s.icon;
              return (
                <Link key={o.id} href={`/orders/${o.id}`} className="card-dd flex items-center gap-4 transition-shadow hover:shadow-[var(--shadow-hover)]">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-bg-subtle text-yellow-hover"><Package size={22} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-text-heading">ออเดอร์ #{o.id}</p>
                      <span className={`badge-dd ${s.cls}`}><Icon size={12} /> {s.label}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-text-muted">
                      {o.items.map((i) => `${i.productName} x${i.quantity}`).join(", ")}
                    </p>
                    <p className="text-xs text-text-disabled">{new Date(o.createdAt).toLocaleString("th-TH")}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="font-bold text-price">{money(o.total)}</span>
                    <ChevronRight size={18} className="text-text-muted" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
