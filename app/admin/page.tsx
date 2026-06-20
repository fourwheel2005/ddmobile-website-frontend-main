"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, Smartphone, ClipboardList, Users, Settings,
  LogOut, Bell, Search, Clock, CheckCircle2, XCircle, Loader2,
  Plus, X, Trash2, UploadCloud, Edit, AlertTriangle, Warehouse
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import StockInventory from "@/components/StockInventory";
import CountUp from "@/components/CountUp";

interface InstallmentApp {
  id: number;
  customerName: string;
  customerTel: string;
  productName: string;
  applicationDate: string;
  status: string;
}

interface DashboardStats {
  pendingRequests: number;
  approvedThisMonth: number;
  stockCount: number;
  estimatedRevenue: string;
}

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

interface Customer {
  id: number;
  email: string;
  role: string;
}

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState("ภาพรวมระบบ");
  const [applications, setApplications] = useState<InstallmentApp[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", capacity: "", description: "", price: "", stock: "0" });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<number | null>(null);
  const [editProduct, setEditProduct] = useState({ name: "", capacity: "", description: "", price: "", stock: "0" });
  const [editCurrentImages, setEditCurrentImages] = useState<string[]>([]);
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const openEditModal = (product: Product) => {
    setEditProductId(product.id);
    setEditProduct({
      name: product.name,
      capacity: product.capacity || "",
      description: product.description || "",
      price: product.price.toString(),
      stock: product.stock?.toString() || "0"
    });
    const current = (product.images && product.images.length > 0)
      ? product.images
      : (product.imageUrl ? [product.imageUrl] : []);
    setEditCurrentImages(current);
    setEditImageFiles([]);
    setEditImagePreviews([]);
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProductId) return;
    setIsUpdating(true);

    try {
      const formData = new FormData();
      formData.append("name", editProduct.name);
      formData.append("description", editProduct.description);
      formData.append("capacity", editProduct.capacity);
      formData.append("price", editProduct.price);
      formData.append("stock", editProduct.stock);

      // ถ้าเลือกรูปใหม่ = แทนที่แกลเลอรีทั้งหมด
      editImageFiles.forEach((f) => formData.append("files", f));

      const response = await api.put(`/products/${editProductId}`, formData);

      toast.success("อัปเดตข้อมูลสินค้าสำเร็จ!");
      setProducts(products.map(p => p.id === editProductId ? response.data : p));
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Update Product Error:", error);
      toast.error("เกิดข้อผิดพลาดในการอัปเดตสินค้า");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        window.location.href = "/login";
        return false;
      }

      const user = JSON.parse(userStr);
      if (user.role !== "ROLE_ADMIN") {
        toast.error("คุณไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแลระบบ!");
        window.location.href = "/";
        return false;
      }

      setIsAuthorized(true);
      return true;
    };

    const fetchData = async () => {
      try {
        const [statsRes, appsRes, productsRes, customersRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/applications"),
          api.get("/products"),
          api.get("/admin/customers")
        ]);

        setStatsData(statsRes.data);
        setApplications(appsRes.data);
        setProducts(productsRes.data);
        setCustomers(customersRes.data);
      } catch (error: any) {
        console.error("Fetch Data Error:", error);
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          toast.error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (checkAuth()) {
      fetchData();
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  // เลือกได้หลายรูป (สะสมต่อท้าย) — รูปแรก = ปก
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setImageFiles((prev) => [...prev, ...files]);
      setImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    }
    e.target.value = ""; // เคลียร์เพื่อเลือกไฟล์เดิมซ้ำได้
  };

  const removeImage = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imageFiles.length === 0) {
      toast.error("กรุณาอัปโหลดรูปภาพสินค้าอย่างน้อย 1 รูปครับ");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", newProduct.name);
      formData.append("description", newProduct.description);
      formData.append("capacity", newProduct.capacity);
      formData.append("price", newProduct.price);
      formData.append("stock", newProduct.stock);
      imageFiles.forEach((f) => formData.append("files", f));

      const response = await api.post("/products", formData);

      toast.success("เพิ่มสินค้าใหม่สำเร็จ!");
      setProducts([...products, response.data]);
      setIsAddModalOpen(false);
      setNewProduct({ name: "", capacity: "", description: "", price: "", stock: "0" });
      setImageFiles([]);
      setImagePreviews([]);
    } catch (error) {
      console.error("Add Product Error:", error);
      toast.error("เกิดข้อผิดพลาดในการเพิ่มสินค้า");
    } finally {
      setIsSubmitting(false);
    }
  };

  // จัดการรูปฝั่งแก้ไข
  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setEditImageFiles((prev) => [...prev, ...files]);
      setEditImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    }
    e.target.value = "";
  };

  const removeEditImage = (idx: number) => {
    setEditImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setEditImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm("คุณต้องการลบสินค้านี้ใช่หรือไม่? (ลบรูปภาพและข้อมูลใน Database ด้วย)")) {
      try {
        await api.delete(`/products/${id}`);
        setProducts(products.filter(p => p.id !== id));
        toast.success("ลบสินค้าสำเร็จ!");
      } catch (error) {
        console.error("Delete Product Error:", error);
        toast.error("ไม่สามารถลบสินค้าได้");
      }
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-base text-yellow">
        <Loader2 size={48} className="animate-spin" />
      </div>
    );
  }

  const totalProducts = products.length;
  const inStockProducts = products.filter(p => p.stock > 0).length;
  const outOfStockProducts = products.filter(p => p.stock <= 0).length;
  const totalCustomers = customers.length;

  const lowStockProducts = products.filter(p => p.stock <= 2).sort((a, b) => a.stock - b.stock);

  const statsUI = [
    { title: "สินค้าทั้งหมด", value: totalProducts, growth: "รายการ", icon: Smartphone, color: "text-yellow" },
    { title: "สินค้าพร้อมขาย", value: inStockProducts, growth: "มีสต็อก", icon: CheckCircle2, color: "text-success-text" },
    { title: "สินค้าหมดสต็อก", value: outOfStockProducts, growth: "ต้องเติมของ", icon: XCircle, color: "text-error-text" },
    { title: "สมาชิกลูกค้า", value: totalCustomers, growth: "ผู้ใช้งาน", icon: Users, color: "text-info-text" },
  ];

  return (
    <div className="relative flex h-screen overflow-hidden bg-bg-base text-text-body">

      {/* --- SIDEBAR --- */}
      <aside className="flex w-64 flex-col border-r border-border-default bg-bg-surface">
        <div className="flex h-16 items-center border-b border-border-default px-6">
          <Link href="/" className="logo-dd text-2xl">
            DD<span className="text-text-heading">ADMIN</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          <p className="section-label mb-4 px-3">เมนูหลัก</p>
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveMenu(item.name)}
              className={`flex w-full items-center gap-3 px-4 py-3 font-display text-sm uppercase tracking-wider transition-colors ${
                activeMenu === item.name ? "bg-yellow text-black" : "text-text-muted hover:bg-bg-tinted hover:text-text-heading"
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="border-t border-border-default p-3">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 font-display text-sm uppercase tracking-wider text-error-text transition-colors hover:bg-error-bg">
            <LogOut size={18} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* --- MAIN --- */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-border-default bg-bg-subtle px-6">
          <div>
            <h1 className="font-display text-2xl">{activeMenu}</h1>
            <p className="text-xs text-text-muted">ระบบหลังบ้านเชื่อมต่อ API เรียบร้อยแล้ว</p>
          </div>

          <div className="flex items-center gap-4">
            {activeMenu === "จัดการสินค้า" && (
              <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
                <Plus size={16} /> เพิ่มสินค้าใหม่
              </button>
            )}
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input type="text" placeholder="ค้นหา..." aria-label="ค้นหา" className="input-dd w-56 pl-11" />
            </div>
            <button aria-label="การแจ้งเตือน" className="relative p-2 text-text-muted hover:text-yellow">
              <Bell size={22} />
              <span className="absolute right-1 top-1 h-2 w-2 bg-error-text" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center text-yellow">
              <Loader2 size={48} className="mb-4 animate-spin" />
              <p className="font-display uppercase tracking-widest">กำลังโหลดข้อมูล</p>
            </div>
          ) : (
            <>
              {/* ภาพรวมระบบ */}
              {activeMenu === "ภาพรวมระบบ" && (
                <div className="stagger-children">
                  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                    {statsUI.map((stat, idx) => (
                      <div key={idx} className="card-dd">
                        <div className="mb-4 flex items-start justify-between">
                          <div className={`flex h-11 w-11 items-center justify-center bg-bg-tinted ${stat.color}`}>
                            <stat.icon size={22} />
                          </div>
                          <span className="badge-dd badge-warning">{stat.growth}</span>
                        </div>
                        <p className="text-xs text-text-muted">{stat.title}</p>
                        <CountUp value={stat.value} className="block font-display text-4xl tabular-nums text-text-heading" />
                      </div>
                    ))}
                  </div>

                  <div className="border border-border-default">
                    <div className="flex items-center gap-2 border-b border-border-default bg-bg-surface p-4">
                      <AlertTriangle className="text-yellow" size={20} />
                      <h2 className="font-display text-xl">แจ้งเตือนสินค้าใกล้หมด (Low Stock Alert)</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="table-dd">
                        <thead>
                          <tr>
                            <th>รูป</th><th>ชื่อสินค้า / ความจุ</th><th className="text-center">จำนวนคงเหลือ</th><th className="text-right">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lowStockProducts.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center font-display uppercase tracking-widest text-text-muted">สินค้าทุกรุ่นมีสต็อกเพียงพอ</td></tr>
                          ) : (
                            lowStockProducts.map((product) => (
                              <tr key={product.id}>
                                <td className="w-20">
                                  <div className="flex h-12 w-12 items-center justify-center border border-border-default bg-bg-subtle p-1">
                                    <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain" />
                                  </div>
                                </td>
                                <td>
                                  <p className="font-semibold text-text-heading">{product.name}</p>
                                  <p className="text-xs text-text-muted">{product.capacity || "ไม่ระบุความจุ"}</p>
                                </td>
                                <td className="text-center">
                                  <span className={`badge-dd ${product.stock === 0 ? "badge-error" : "badge-warning"}`}>{product.stock} เครื่อง</span>
                                </td>
                                <td className="text-right">
                                  <button onClick={() => { setActiveMenu("จัดการสินค้า"); openEditModal(product); }} className="btn-ghost">อัปเดตสต็อก →</button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* คำขอผ่อนสินค้า */}
              {activeMenu === "คำขอผ่อนสินค้า" && (
                <div className="border border-border-default">
                  <div className="border-b border-border-default bg-bg-surface p-4">
                    <h2 className="font-display text-xl">คำขอผ่อนสินค้าล่าสุด (ยื่นผ่านระบบ)</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table-dd">
                      <thead>
                        <tr><th>ลูกค้า</th><th>รุ่นสินค้า</th><th>วันที่ยื่นเรื่อง</th><th>สถานะ</th><th className="text-right">จัดการ</th></tr>
                      </thead>
                      <tbody>
                        {applications.length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-center font-display uppercase tracking-widest text-text-muted">ยังไม่มีข้อมูลคำขอผ่อนสินค้าผ่านระบบเว็บ</td></tr>
                        ) : (
                          applications.map((app) => (
                            <tr key={app.id}>
                              <td><p className="font-semibold text-text-heading">{app.customerName}</p><p className="text-xs text-text-muted">{app.customerTel}</p></td>
                              <td><span className="badge-dd badge-info">{app.productName}</span></td>
                              <td className="text-text-muted">{app.applicationDate}</td>
                              <td>
                                <span className={`badge-dd ${app.status === "รออนุมัติ" ? "badge-warning" : app.status === "อนุมัติแล้ว" ? "badge-success" : "badge-error"}`}>
                                  {app.status === "รออนุมัติ" ? <Clock size={12} /> : app.status === "อนุมัติแล้ว" ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {app.status}
                                </span>
                              </td>
                              <td className="text-right"><button className="btn-ghost">ตรวจสอบ →</button></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* จัดการสินค้า */}
              {activeMenu === "จัดการสินค้า" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {products.length === 0 ? (
                    <div className="col-span-full border border-dashed border-border-default p-12 text-center">
                      <Smartphone size={48} className="mx-auto mb-4 text-text-muted" />
                      <h3 className="font-display text-xl uppercase">ยังไม่มีสินค้าในระบบ</h3>
                      <button onClick={() => setIsAddModalOpen(true)} className="btn-primary mt-4">เพิ่มสินค้าชิ้นแรก →</button>
                    </div>
                  ) : (
                    products.map(product => (
                      <div key={product.id} className="card-dd group relative">
                        <div className="absolute right-4 top-4 z-10 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => openEditModal(product)} aria-label="แก้ไขสินค้า" className="border border-info-border bg-info-bg p-2 text-info-text transition-colors hover:bg-info-text hover:text-black"><Edit size={16} /></button>
                          <button onClick={() => handleDeleteProduct(product.id)} aria-label="ลบสินค้า" className="border border-error-border bg-error-bg p-2 text-error-text transition-colors hover:bg-error-text hover:text-black"><Trash2 size={16} /></button>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex h-24 w-24 items-center justify-center border border-border-default bg-bg-subtle p-2">
                            <img src={product.imageUrl || "https://via.placeholder.com/150"} alt={product.name} loading="lazy" className="h-full w-full object-contain" />
                          </div>
                          <div>
                            <h3 className="font-display text-lg uppercase leading-tight text-text-heading">{product.name}</h3>
                            <p className="font-display text-2xl tabular-nums text-yellow">฿{product.price?.toLocaleString()}</p>
                            <div className="mt-1 flex gap-2">
                              <span className="badge-dd badge-info">{product.capacity || "ไม่มีระบุ"}</span>
                              <span className={`badge-dd ${product.stock > 0 ? "badge-success" : "badge-error"}`}>คงเหลือ: {product.stock || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* จัดการลูกค้า */}
              {activeMenu === "จัดการลูกค้า" && (
                <div className="border border-border-default">
                  <div className="flex items-center justify-between border-b border-border-default bg-bg-surface p-4">
                    <h2 className="flex items-center gap-2 font-display text-xl"><Users className="text-yellow" size={20} /> รายชื่อลูกค้าทั้งหมด</h2>
                    <span className="badge-dd badge-warning">จำนวนลูกค้า: {customers.length} คน</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table-dd">
                      <thead>
                        <tr><th>รหัสลูกค้า</th><th>บัญชี (Email)</th><th>ระดับสิทธิ์</th><th>สถานะบัญชี</th><th className="text-right">จัดการ</th></tr>
                      </thead>
                      <tbody>
                        {customers.length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-center font-display uppercase tracking-widest text-text-muted">ยังไม่มีข้อมูลลูกค้าในระบบ</td></tr>
                        ) : (
                          customers.map((customer) => (
                            <tr key={customer.id} className="group">
                              <td className="text-text-muted">CUST-{customer.id.toString().padStart(4, "0")}</td>
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center bg-bg-tinted font-display uppercase text-yellow">{customer.email.charAt(0)}</div>
                                  <p className="font-semibold text-text-heading">{customer.email}</p>
                                </div>
                              </td>
                              <td><span className="badge-dd badge-info">ลูกค้าทั่วไป</span></td>
                              <td><span className="badge-dd badge-success"><CheckCircle2 size={12} /> ปกติ (Active)</span></td>
                              <td className="text-right"><button className="btn-ghost opacity-0 group-hover:opacity-100">ดูประวัติ →</button></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* คลังสินค้า (ดึงจากระบบ Stock) */}
              {activeMenu === "คลังสินค้า" && <StockInventory />}
            </>
          )}
        </div>
      </main>

      {/* MODAL: เพิ่มสินค้า */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="modal-backdrop">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="modal-dd max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsAddModalOpen(false)} className="modal-close"><X size={20} /></button>
              <h2 className="card-title flex items-center gap-2"><Plus size={22} className="text-yellow" /> เพิ่มสินค้าใหม่</h2>

              <form onSubmit={handleAddProduct} className="mt-6 space-y-5">
                <div>
                  <label className="label-dd">ชื่อรุ่นสินค้า *</label>
                  <input required type="text" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="เช่น iPhone 16 Pro Max" className="input-dd" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="label-dd">ราคา (บาท) *</label>
                    <input required type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} placeholder="48900" className="input-dd" />
                  </div>
                  <div>
                    <label className="label-dd">จำนวน (สต็อก) *</label>
                    <input required type="number" min="0" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} className="input-dd" />
                  </div>
                  <div>
                    <label className="label-dd">ความจุ</label>
                    <input type="text" value={newProduct.capacity} onChange={e => setNewProduct({ ...newProduct, capacity: e.target.value })} placeholder="256GB" className="input-dd" />
                  </div>
                </div>
                <div>
                  <label className="label-dd">รูปภาพสินค้า * (เลือกได้หลายรูป — รูปแรกคือปก)</label>
                  <div className="relative">
                    <input type="file" accept="image/*" multiple onChange={handleImageChange} aria-label="อัปโหลดรูปภาพสินค้า" className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
                    <div className="flex flex-col items-center justify-center border border-dashed border-border-default bg-bg-subtle p-6">
                      <UploadCloud size={28} className="mb-3 text-text-muted" />
                      <p className="text-sm text-text-body">คลิกหรือลากไฟล์รูปภาพมาวางที่นี่ (เลือกหลายรูปได้)</p>
                      <p className="text-xs text-text-muted">รองรับ JPG, PNG, WEBP</p>
                    </div>
                  </div>
                  {imagePreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {imagePreviews.map((src, idx) => (
                        <div key={idx} className="relative aspect-square border border-border-default bg-bg-subtle">
                          <img src={src} alt={`รูป ${idx + 1}`} className="h-full w-full object-contain p-1" />
                          {idx === 0 && <span className="absolute left-0 top-0 bg-yellow px-1 font-display text-[10px] uppercase text-black">ปก</span>}
                          <button type="button" onClick={() => removeImage(idx)} aria-label={`ลบรูป ${idx + 1}`} className="absolute right-0 top-0 bg-error-bg p-1 text-error-text transition-colors hover:bg-error-text hover:text-black">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="label-dd">รายละเอียดเพิ่มเติม (สี, สเปค)</label>
                  <textarea rows={2} value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="เช่น สี Natural Titanium..." className="input-dd resize-none" />
                </div>
                <div className="flex gap-3 border-t border-border-default pt-4">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-ghost flex-1">ยกเลิก</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูลสินค้า →"}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: แก้ไขสินค้า */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="modal-backdrop">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="modal-dd max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsEditModalOpen(false)} className="modal-close"><X size={20} /></button>
              <h2 className="card-title flex items-center gap-2"><Edit size={22} className="text-info-text" /> แก้ไขข้อมูลสินค้า</h2>

              <form onSubmit={handleUpdateProduct} className="mt-6 space-y-5">
                <div>
                  <label className="label-dd">ชื่อรุ่นสินค้า *</label>
                  <input required type="text" value={editProduct.name} onChange={e => setEditProduct({ ...editProduct, name: e.target.value })} className="input-dd" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="label-dd">ราคา (บาท) *</label>
                    <input required type="number" value={editProduct.price} onChange={e => setEditProduct({ ...editProduct, price: e.target.value })} className="input-dd" />
                  </div>
                  <div>
                    <label className="label-dd">จำนวน (สต็อก) *</label>
                    <input required type="number" min="0" value={editProduct.stock} onChange={e => setEditProduct({ ...editProduct, stock: e.target.value })} className="input-dd" />
                  </div>
                  <div>
                    <label className="label-dd">ความจุ</label>
                    <input type="text" value={editProduct.capacity} onChange={e => setEditProduct({ ...editProduct, capacity: e.target.value })} className="input-dd" />
                  </div>
                </div>
                <div>
                  <label className="label-dd">รูปภาพสินค้า</label>

                  {editCurrentImages.length > 0 && editImagePreviews.length === 0 && (
                    <div className="mb-3">
                      <p className="mb-2 text-xs text-text-muted">รูปปัจจุบัน ({editCurrentImages.length} รูป)</p>
                      <div className="grid grid-cols-4 gap-2">
                        {editCurrentImages.map((src, idx) => (
                          <div key={idx} className="relative aspect-square border border-border-default bg-bg-subtle">
                            <img src={src} alt={`รูปปัจจุบัน ${idx + 1}`} className="h-full w-full object-contain p-1" />
                            {idx === 0 && <span className="absolute left-0 top-0 bg-yellow px-1 font-display text-[10px] uppercase text-black">ปก</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <input type="file" accept="image/*" multiple aria-label="อัปโหลดรูปภาพใหม่" onChange={handleEditImageChange} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
                    <div className="flex flex-col items-center justify-center border border-dashed border-border-default bg-bg-subtle p-6">
                      <UploadCloud size={28} className="mb-2 text-text-muted" />
                      <p className="text-sm text-text-body">อัปโหลดรูปใหม่ (เลือกหลายรูปได้)</p>
                      <p className="text-xs text-warning-text">⚠ การอัปโหลดใหม่จะแทนที่รูปเดิมทั้งหมด</p>
                    </div>
                  </div>

                  {editImagePreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {editImagePreviews.map((src, idx) => (
                        <div key={idx} className="relative aspect-square border border-info-border bg-bg-subtle">
                          <img src={src} alt={`รูปใหม่ ${idx + 1}`} className="h-full w-full object-contain p-1" />
                          {idx === 0 && <span className="absolute left-0 top-0 bg-info-text px-1 font-display text-[10px] uppercase text-black">ปก</span>}
                          <button type="button" onClick={() => removeEditImage(idx)} aria-label={`ลบรูป ${idx + 1}`} className="absolute right-0 top-0 bg-error-bg p-1 text-error-text transition-colors hover:bg-error-text hover:text-black">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="label-dd">รายละเอียดเพิ่มเติม</label>
                  <textarea rows={2} value={editProduct.description} onChange={e => setEditProduct({ ...editProduct, description: e.target.value })} className="input-dd resize-none" />
                </div>
                <div className="flex gap-3 border-t border-border-default pt-4">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-ghost flex-1">ยกเลิก</button>
                  <button type="submit" disabled={isUpdating} className="flex-1 border border-info-border bg-info-bg px-6 py-3 font-display uppercase tracking-widest text-info-text transition-colors hover:bg-info-text hover:text-black disabled:opacity-30">{isUpdating ? "กำลังอัปเดต..." : "บันทึกการเปลี่ยนแปลง →"}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const menuItems = [
  { name: "ภาพรวมระบบ", icon: LayoutDashboard },
  { name: "จัดการสินค้า", icon: Smartphone },
  { name: "คลังสินค้า", icon: Warehouse },
  { name: "คำขอผ่อนสินค้า", icon: ClipboardList },
  { name: "จัดการลูกค้า", icon: Users },
  { name: "ตั้งค่าระบบ", icon: Settings },
];
