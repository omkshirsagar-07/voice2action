"use client";

import dynamic from "next/dynamic";

let DynamicMapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: function LoadingMap() {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-white/60 bg-white/70 text-sm text-slate-500 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        Loading civic map...
      </div>
    );
  },
});

export default function Map({
  issues,
  currentLocation,
  className = "h-full min-h-[320px]",
  showHeatmap = false,
}) {
  return (
    <DynamicMapClient
      issues={issues}
      currentLocation={currentLocation}
      className={className}
      showHeatmap={showHeatmap}
    />
  );
}
