"use client";

import dynamic from "next/dynamic";

let ReportForm = dynamic(() => import("./ReportForm"), {
  ssr: false,
});

export default function ReportFormWrapper() {
  return <ReportForm />;
}
