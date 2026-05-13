"use client";

import dynamic from "next/dynamic";

let DynamicMapExperienceClient = dynamic(() => import("./MapExperienceClient"), {
  ssr: false,
  loading: function LoadingMapExperience() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm font-semibold text-slate-500">
        Loading smart city map...
      </div>
    );
  },
});

export default function MapExperience() {
  return <DynamicMapExperienceClient />;
}
