"use client";

import dynamic from "next/dynamic";

let DynamicIssueLocationPickerClient = dynamic(() => import("./IssueLocationPickerClient"), {
  ssr: false,
  loading: function LoadingIssueLocationPicker() {
    return (
      <div className="mt-4 flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
        Loading location map...
      </div>
    );
  },
});

export default function IssueLocationPicker(props) {
  return <DynamicIssueLocationPickerClient {...props} />;
}
