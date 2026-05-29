"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Search, Smartphone, Loader2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  capacity: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  // Debounce 0.5s
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch ตาม keyword
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const url = debouncedTerm
          ? `/products?keyword=${encodeURIComponent(debouncedTerm)}`
          : "/products";
        const response = await api.get(url);
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [debouncedTerm]);

  return (
    <div className="page-wrapper min-h-screen bg-bg-base px-4 pb-20 pt-20 text-text-body md:px-8">
      <div className="container-dd">

        {/* Header + Search */}
        <div className="mb-12 flex flex-col items-end justify-between gap-6 border-b border-border-default pb-8 md:flex-row">
          <div className="w-full">
            <p className="section-label">เช็คสต็อกแบบเรียลไทม์</p>
            <h1 className="font-display text-[clamp(2.5rem,8vw,5rem)] leading-[1.1]">
              โทรศัพท์มือถือ <span className="text-yellow">ทั้งหมด</span>
            </h1>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              placeholder="ค้นหารุ่นมือถือ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="ค้นหาสินค้า"
              className="input-dd pl-12"
            />
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-yellow">
            <Loader2 size={48} className="mb-6 animate-spin" />
            <p className="font-display uppercase tracking-widest">กำลังค้นหาสินค้า</p>
          </div>
        ) : products.length === 0 ? (
          <div className="border border-dashed border-border-default py-32 text-center">
            <Smartphone size={48} className="mx-auto mb-4 text-text-muted" />
            <h3 className="font-display text-2xl uppercase">ไม่พบสินค้าที่คุณค้นหา</h3>
            <p className="mt-2 text-sm text-text-muted">ลองเปลี่ยนคำค้นหาใหม่ หรือทักแชทสอบถามแอดมิน</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <Link href={`/products/${product.id}`} key={product.id} className="card-dd group flex flex-col p-3">
                <div className="relative mb-4 flex aspect-[4/5] items-center justify-center overflow-hidden bg-black p-4">
                  <span className="badge-dd badge-warning absolute left-3 top-3 z-10">มือ 1 ศูนย์ไทย</span>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <Smartphone size={60} className="text-white/5" />
                  )}
                </div>

                <div className="flex flex-1 flex-col px-2 pb-2">
                  <h3 className="font-display text-xl uppercase leading-tight text-white transition-colors group-hover:text-yellow">{product.name}</h3>
                  <p className="mb-4 line-clamp-1 text-xs text-text-muted">
                    ความจุ {product.capacity || "-"} · {product.description || "พร้อมส่ง"}
                  </p>

                  <div className="mt-auto flex flex-col gap-3 border-t border-border-default pt-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="font-display text-[10px] uppercase tracking-widest text-text-muted">ราคาเต็ม</p>
                        <p className="font-display text-2xl tabular-nums text-yellow">฿{product.price ? product.price.toLocaleString() : "0"}</p>
                      </div>
                      <span className="font-display text-yellow">→</span>
                    </div>
                    {product.stock > 0 ? (
                      <span className="badge-dd badge-success"><CheckCircle2 size={12} /> มีสินค้า {product.stock} เครื่อง</span>
                    ) : (
                      <span className="badge-dd badge-error"><XCircle size={12} /> สินค้าหมดชั่วคราว</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
