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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const url = debouncedTerm ? `/products?keyword=${encodeURIComponent(debouncedTerm)}` : "/products";
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
    <div className="page-wrapper min-h-screen bg-bg-base">
      <div className="container-dd py-8 md:py-12">

        {/* Header + Search */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="section-label">เช็คสต็อกแบบเรียลไทม์</p>
            <h1 className="text-2xl font-bold text-text-heading md:text-4xl">
              โทรศัพท์มือถือทั้งหมด
            </h1>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              placeholder="ค้นหารุ่นมือถือที่ต้องการ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="ค้นหาสินค้า"
              className="input-dd pl-11"
            />
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-muted">
            <Loader2 size={40} className="mb-4 animate-spin text-yellow-hover" />
            <p>กำลังค้นหาสินค้า...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-default bg-bg-subtle py-24 text-center">
            <Smartphone size={44} className="mx-auto mb-3 text-text-disabled" />
            <h3 className="text-lg font-bold text-text-heading">ไม่พบสินค้าที่คุณค้นหา</h3>
            <p className="mt-1 text-sm text-text-muted">ลองเปลี่ยนคำค้นหาใหม่ หรือทักแชทสอบถามแอดมิน</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <Link href={`/products/${product.id}`} key={product.id} className="card-dd group flex flex-col overflow-hidden !p-0">
                <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-bg-subtle p-4">
                  <span className="badge-dd badge-warning absolute left-3 top-3 z-10">มือ 1 ศูนย์ไทย</span>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <Smartphone size={52} className="text-text-disabled" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold text-text-heading group-hover:text-yellow-hover">{product.name}</h3>
                  <p className="mt-1 line-clamp-1 text-xs text-text-muted">
                    {product.capacity || "-"} · {product.description || "พร้อมส่ง"}
                  </p>
                  <div className="mt-auto pt-3">
                    <p className="text-xs text-text-muted">ราคาเต็ม</p>
                    <p className="mb-2 text-lg font-bold text-price">฿{product.price ? product.price.toLocaleString() : "0"}</p>
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
