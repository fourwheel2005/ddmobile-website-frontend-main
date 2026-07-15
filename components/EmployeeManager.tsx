"use client";
import { useEffect, useState } from "react";
import { Loader2, Save, Trash2, UserPlus, ShieldCheck, IdCard } from "lucide-react";
import toast from "react-hot-toast";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { TableSkeleton } from "@/components/Skeletons";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  employeeCode: string | null;
  position: string | null;
}

const ROLE_LABEL: Record<string, string> = { ROLE_ADMIN: "แอดมิน", ROLE_EMPLOYEE: "พนักงาน" };

export default function EmployeeManager() {
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const empty = { name: "", email: "", password: "", employeeCode: "", position: "", role: "ROLE_EMPLOYEE" };
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/employees");
      setList(Array.isArray(r.data) ? r.data : []);
    } catch {
      toast.error("โหลดรายชื่อไม่สำเร็จ");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("กรอกชื่อ อีเมล และรหัสผ่านให้ครบ"); return;
    }
    if (form.password.length < 6) { toast.error("รหัสผ่านอย่างน้อย 6 ตัว"); return; }
    setSaving(true);
    try {
      await api.post("/admin/employees", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        employeeCode: form.employeeCode.trim() || null,
        position: form.position.trim() || null,
        role: form.role,
      });
      toast.success("เพิ่มบัญชีพนักงานแล้ว");
      setForm(empty);
      load();
    } catch (e) {
      toast.error(getApiError(e, "เพิ่มไม่สำเร็จ"));
    } finally { setSaving(false); }
  };

  const del = async (emp: Employee) => {
    if (!(await confirmDialog({ title: `ลบบัญชี "${emp.name}"?`, message: emp.email, confirmText: "ลบบัญชี", danger: true }))) return;
    try { await api.delete(`/admin/employees/${emp.id}`); toast.success("ลบแล้ว"); load(); }
    catch (e) { toast.error(getApiError(e, "ลบไม่สำเร็จ")); }
  };

  return (
    <div className="space-y-6">
      {/* ฟอร์มเพิ่มพนักงาน */}
      <div className="rounded-2xl border border-border-default bg-white p-5">
        <h3 className="mb-1 flex items-center gap-2 font-bold text-text-heading">
          <UserPlus size={18} className="text-yellow-hover" /> เพิ่มบัญชีพนักงาน / แอดมิน
        </h3>
        <p className="mb-4 text-xs text-text-muted">เฉพาะแอดมินเท่านั้นที่เพิ่มได้ · รหัสผ่านถูกเข้ารหัสก่อนเก็บ</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text-muted">ชื่อ-นามสกุล *</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-dd" placeholder="เช่น สมชาย ใจดี" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text-muted">ตำแหน่ง</span>
            <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="input-dd" placeholder="เช่น พนักงานขาย / ผู้จัดการสาขา" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text-muted">อีเมล (ใช้เข้าระบบ) *</span>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-dd" placeholder="staff@ddmobile.com" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text-muted">รหัสพนักงาน</span>
            <input value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} className="input-dd" placeholder="เช่น EMP-001" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text-muted">รหัสผ่าน * (อย่างน้อย 6 ตัว)</span>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-dd" placeholder="••••••••" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text-muted">สิทธิ์</span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-dd">
              <option value="ROLE_EMPLOYEE">พนักงาน (ROLE_EMPLOYEE)</option>
              <option value="ROLE_ADMIN">แอดมิน (ROLE_ADMIN)</option>
            </select>
          </label>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary mt-5 disabled:opacity-50">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} เพิ่มบัญชี
        </button>
      </div>

      {/* รายชื่อ */}
      <div className="overflow-x-auto rounded-2xl border border-border-default bg-white">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
          <table className="table-dd">
            <thead><tr><th>ชื่อ</th><th>รหัสพนักงาน</th><th>ตำแหน่ง</th><th>อีเมล</th><th>สิทธิ์</th><th></th></tr></thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-text-muted">ยังไม่มีบัญชีพนักงาน</td></tr>
              ) : list.map((e) => (
                <tr key={e.id}>
                  <td className="font-medium text-text-heading">{e.name}</td>
                  <td className="font-mono text-xs">{e.employeeCode || "-"}</td>
                  <td>{e.position || "-"}</td>
                  <td className="text-xs text-text-muted">{e.email}</td>
                  <td>
                    <span className={`badge-dd ${e.role === "ROLE_ADMIN" ? "badge-warning" : "badge-info"}`}>
                      {e.role === "ROLE_ADMIN" ? <ShieldCheck size={12} /> : <IdCard size={12} />} {ROLE_LABEL[e.role] || e.role}
                    </span>
                  </td>
                  <td className="text-right">
                    <button onClick={() => del(e)} aria-label={`ลบบัญชี ${e.name}`} className="rounded-lg p-2 text-error-text transition-colors hover:bg-error-bg"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
