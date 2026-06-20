"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  Smartphone, Loader2, ShieldCheck, CheckCircle2, XCircle,
  MessageCircle, FileSignature, ArrowLeft
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
    if (params.id) fetchProduct();
  }, [params.id]);

  const calculateInstallment = (price: number) => Math.ceil(price / 10).toLocaleString();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base text-yellow-hover">
        <Loader2 size={44} className="animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-4 text-center">
        <Smartphone size={56} className="mb-5 text-text-disabled" />
        <h1 className="text-2xl font-bold text-text-heading">ไม่พบสินค้านี้</h1>
        <p className="mb-7 mt-2 text-sm text-text-muted">สินค้าอาจถูกลบ หรือ URL ไม่ถูกต้อง</p>
        <button onClick={() => router.back()} className="btn-ghost"><ArrowLeft size={16} /> ย้อนกลับ</button>
      </div>
    );
  }

  const gallery = (product.images && product.images.length > 0)
    ? product.images
    : (product.imageUrl ? [product.imageUrl] : []);

  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      <div className="container-dd py-8 md:py-12">

        <button onClick={() => router.back()} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-heading">
          <ArrowLeft size={18} /> ย้อนกลับไปหน้าสินค้า
        </button>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* gallery */}
          <div>
            <div className="relative flex aspect-square items-center justify-center rounded-2xl border border-border-default bg-white p-8">
              <span className="badge-dd badge-warning absolute left-5 top-5 z-10">มือ 1 ศูนย์ไทย</span>
              {gallery.length > 0 ? (
                <img src={gallery[activeImg] ?? gallery[0]} alt={product.name} width={420} height={420} className="h-full w-full max-w-sm object-contain" />
              ) : (
                <Smartphone size={120} className="text-text-disabled" />
              )}
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {gallery.map((src, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImg(idx)}
                    aria-label={`ดูรูปที่ ${idx + 1}`}
                    className={`flex aspect-square items-center justify-center rounded-xl border bg-white p-1 transition-colors ${idx === activeImg ? "border-yellow ring-2 ring-yellow/30" : "border-border-default hover:border-text-muted"}`}
                  >
                    <img src={src} alt={`${product.name} มุมที่ ${idx + 1}`} className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* info */}
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold leading-tight text-text-heading md:text-3xl">{product.name}</h1>

            <div className="my-5">
              {product.stock > 0 ? (
                <span className="badge-dd badge-success"><CheckCircle2 size={14} /> มีสินค้าพร้อมส่ง (เหลือ {product.stock} เครื่อง)</span>
              ) : (
                <span className="badge-dd badge-error"><XCircle size={14} /> สินค้าหมดชั่วคราว</span>
              )}
            </div>

            <div className="rounded-2xl border border-border-default bg-bg-subtle p-5">
              <p className="text-sm text-text-muted">ราคาเครื่องเปล่า</p>
              <div className="text-3xl font-bold text-price md:text-4xl">฿{product.price ? product.price.toLocaleString() : "0"}</div>
              <div className="mt-4 flex items-center gap-3 border-t border-border-default pt-4 text-sm">
                <span className="text-text-muted">ผ่อนเริ่มต้นเพียง</span>
                <span className="text-lg font-bold text-text-heading">฿{calculateInstallment(product.price)} / เดือน</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="font-bold text-text-heading">รายละเอียดสเปค</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-text-muted">ความจุ</span>
                <span className="col-span-2 font-medium text-text-heading">{product.capacity || "ไม่ระบุ"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-text-muted">จุดเด่น</span>
                <span className="col-span-2 whitespace-pre-line text-text-body">{product.description || "เครื่องใหม่แกะกล่อง ประกันศูนย์เต็ม 1 ปี"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-text-muted">การรับประกัน</span>
                <span className="col-span-2 flex items-center gap-2 font-medium text-success-text"><ShieldCheck size={16} /> ประกันศูนย์ Apple 1 ปี</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                disabled={product.stock <= 0}
                className="btn-primary flex-1 py-3.5 text-base"
                onClick={() => toast("กำลังพาท่านไปหน้าฟอร์มผ่อนสินค้า...", { icon: "🚀" })}
              >
                <FileSignature size={20} /> {product.stock > 0 ? "ยื่นเรื่องผ่อนรุ่นนี้" : "สินค้าหมด"}
              </button>
              <a href="https://lin.ee/Zsq9ja0" target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 py-3.5 text-base">
                <MessageCircle size={20} /> สอบถามแอดมิน
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
