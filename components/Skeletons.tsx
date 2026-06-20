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
