"use client";

export function IssueCardSkeleton() {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex gap-4">
        <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-slate-100 sm:h-28 sm:w-28" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-2/3 animate-pulse rounded-full bg-slate-100" />
          <div className="h-4 w-1/3 animate-pulse rounded-full bg-slate-100" />
          <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function AdminRowSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <div className="space-y-3">
        <div className="h-5 w-1/3 animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-1/4 animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
