/** Skeleton สำหรับ grid สินค้า — ใช้ระหว่างโหลด (perceived performance) */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-dd flex flex-col overflow-hidden !p-0">
          <div className="skeleton aspect-square w-full" />
          <div className="space-y-2.5 p-4">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton mt-3 h-6 w-2/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton แถวตาราง (แอดมิน) — แทน spinner เดี่ยว ให้เห็นโครงระหว่างโหลด */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={`skeleton h-4 rounded ${j === 0 ? "w-24 flex-none" : "flex-1"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton การ์ดสถิติ (แอดมิน) */
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-dd">
          <div className="skeleton h-11 w-11 rounded-xl" />
          <div className="skeleton mt-4 h-3 w-24 rounded" />
          <div className="skeleton mt-2 h-8 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}
