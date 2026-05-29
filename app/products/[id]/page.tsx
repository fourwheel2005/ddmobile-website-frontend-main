"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  Smartphone, Loader2, ShieldCheck, CheckCircle2, XCircle,
  MessageCircle, FileSignature
} from "lucide-react";
import toast from "react-hot-toast";

interface Product {
  id: number;
  name: string;
  capacity: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  images?: string[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await api.get(`/products/${params.id}`);
        setProduct(response.data);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("ไม่พบข้อมูลสินค้านี้");
      } finally {
        setIsLoading(false);
      }
    };
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const calculateInstallment = (price: number) => {
    return Math.ceil(price / 10).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base text-yellow">
        <Loader2 size={48} className="animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-4 text-text-body">
        <Smartphone size={64} className="mb-6 text-text-muted" />
        <h1 className="font-display text-4xl uppercase">ไม่พบสินค้านี้</h1>
        <p className="mb-8 mt-2 text-sm text-text-muted">สินค้าอาจถูกลบ หรือ URL ไม่ถูกต้อง</p>
        <button onClick={() => router.back()} className="btn-ghost">← ย้อนกลับ</button>
      </div>
    );
  }

  const gallery = (product.images && product.images.length > 0)
    ? product.images
    : (product.imageUrl ? [product.imageUrl] : []);

  return (
    <div className="page-wrapper min-h-screen bg-bg-base px-4 pb-20 pt-20 text-text-body md:px-8">
      <div className="container-dd">

        <button onClick={() => router.back()} className="nav-link mb-8">← ย้อนกลับไปหน้าสินค้า</button>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[45%_55%]">

          {/* gallery */}
          <div>
            <div className="relative flex items-center justify-center border border-border-default bg-bg-surface p-8 md:p-12">
              <span className="badge-dd badge-warning absolute left-6 top-6 z-20">มือ 1 ศูนย์ไทย</span>
              {gallery.length > 0 ? (
                <img src={gallery[activeImg] ?? gallery[0]} alt={product.name} width={400} height={400} className="relative z-10 w-full max-w-sm object-contain" />
              ) : (
                <Smartphone size={150} className="text-white/5" />
              )}
            </div>

            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {gallery.map((src, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImg(idx)}
                    aria-label={`ดูรูปที่ ${idx + 1}`}
                    className={`flex aspect-square items-center justify-center border bg-bg-surface p-1 transition-colors ${idx === activeImg ? "border-yellow" : "border-border-default hover:border-text-muted"}`}
                  >
                    <img src={src} alt={`${product.name} มุมที่ ${idx + 1}`} className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* info */}
          <div className="flex flex-col justify-center">
            <h1 className="font-display text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.1]">{product.name}</h1>

            <div className="my-6">
              {product.stock > 0 ? (
                <span className="badge-dd badge-success"><CheckCircle2 size={14} /> มีสินค้าพร้อมส่ง (เหลือ {product.stock} เครื่อง)</span>
              ) : (
                <span className="badge-dd badge-error"><XCircle size={14} /> สินค้าหมดชั่วคราว</span>
              )}
            </div>

            <div className="border border-border-default bg-bg-surface p-6">
              <p className="font-display text-xs uppercase tracking-widest text-text-muted">ราคาเครื่องเปล่า</p>
              <div className="font-display text-5xl tabular-nums text-yellow">฿{product.price ? product.price.toLocaleString() : "0"}</div>
              <div className="mt-4 flex items-center gap-4 border-t border-border-default pt-4 text-sm">
                <span className="text-text-muted">ผ่อนเริ่มต้นเพียง</span>
                <span className="font-display text-lg tabular-nums text-white">฿{calculateInstallment(product.price)} / เดือน</span>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <p className="section-label">รายละเอียดสเปค</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-text-muted">ความจุ</span>
                <span className="col-span-2 font-semibold text-white">{product.capacity || "ไม่ระบุ"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-text-muted">จุดเด่น</span>
                <span className="col-span-2 whitespace-pre-line text-text-body">{product.description || "เครื่องใหม่แกะกล่อง ประกันศูนย์เต็ม 1 ปี"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-text-muted">การรับประกัน</span>
                <span className="col-span-2 flex items-center gap-2 text-success-text"><ShieldCheck size={16} /> ประกันศูนย์ Apple 1 ปี</span>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <button
                disabled={product.stock <= 0}
                className="btn-primary flex-1"
                onClick={() => {
                  toast("กำลังพาท่านไปหน้าฟอร์มผ่อนสินค้า...", { icon: "🚀" });
                }}
              >
                <FileSignature size={20} /> {product.stock > 0 ? "ยื่นเรื่องผ่อนรุ่นนี้ →" : "สินค้าหมด"}
              </button>
              <a href="https://lin.ee/Zsq9ja0" target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1">
                <MessageCircle size={20} /> สอบถามแอดมิน →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
