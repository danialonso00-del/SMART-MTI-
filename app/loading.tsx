export default function Loading() {
  return (
    <div className="space-y-5 pb-8 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded-lg" />
          <div className="h-3 w-64 bg-slate-100 rounded" />
        </div>
        <div className="h-8 w-32 bg-slate-200 rounded-xl" />
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
            <div className="h-7 w-28 bg-slate-200 rounded mb-2" />
            <div className="h-2 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
      {/* Content area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-64" />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-48" />
    </div>
  );
}
