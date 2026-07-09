"use client";
import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, HelpCircle } from "lucide-react";

interface ConfirmOpts {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** true = ปุ่มยืนยันสีแดง (ลบ/ปฏิเสธ) */
  danger?: boolean;
}

/**
 * Confirm dialog สวย ๆ แทน window.confirm() (dialog ดิบของ OS)
 * ใช้: if (!(await confirmDialog({ title: "ลบรายการนี้?" }))) return;
 * รองรับ Esc = ยกเลิก · autofocus ปุ่มยืนยัน · ใช้ modal-backdrop/modal-dd ระบบเดิม
 */
export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const close = (ok: boolean) => {
      root.unmount();
      host.remove();
      resolve(ok);
    };
    root.render(<ConfirmView opts={opts} onClose={close} />);
  });
}

function ConfirmView({ opts, onClose }: { opts: ConfirmOpts; onClose: (ok: boolean) => void }) {
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={opts.title} onClick={() => onClose(false)}>
      <div className="modal-dd max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${opts.danger ? "bg-error-bg text-error-text" : "bg-yellow-muted text-yellow-hover"}`}>
            {opts.danger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
          </div>
          <div className="min-w-0 pt-1">
            <h3 className="font-bold text-text-heading">{opts.title}</h3>
            {opts.message && <p className="mt-1 text-sm text-text-muted">{opts.message}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => onClose(false)} className="btn-ghost">{opts.cancelText ?? "ยกเลิก"}</button>
          <button
            ref={okRef}
            onClick={() => onClose(true)}
            className={opts.danger
              ? "inline-flex items-center gap-2 rounded-full bg-error-text px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              : "btn-primary"}
          >
            {opts.confirmText ?? "ยืนยัน"}
          </button>
        </div>
      </div>
    </div>
  );
}
