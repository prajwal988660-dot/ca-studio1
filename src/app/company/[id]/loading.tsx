export default function CompanyPageLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-72 bg-gray-100 rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-gray-200 rounded" />
          <div className="h-9 w-24 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Date filter skeleton */}
      <div className="flex gap-3">
        <div className="h-10 w-40 bg-gray-100 rounded" />
        <div className="h-10 w-40 bg-gray-100 rounded" />
        <div className="h-10 w-20 bg-gray-200 rounded" />
      </div>

      {/* Table skeleton */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="h-10 bg-gray-100" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex border-t border-gray-100">
            <div className="h-12 flex-1 bg-white px-4 py-3">
              <div className="h-4 w-3/4 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
