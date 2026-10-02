"use client";
import { useSearchParams } from "next/navigation";
import { parseServices } from "@/lib/services";
import ServiceRequestForm from "./ServiceRequestForm";

/** /services?s=SELL,INSTALLMENT → ติ๊กบริการไว้ให้ล่วงหน้า (ค่ามั่วถูกทิ้ง) · key ตาม query ให้ฟอร์มเริ่มใหม่เมื่อ query เปลี่ยน */
export default function ServicesFromQuery() {
  const raw = useSearchParams().get("s");
  return <ServiceRequestForm key={raw ?? ""} initialServices={parseServices(raw)} />;
}
