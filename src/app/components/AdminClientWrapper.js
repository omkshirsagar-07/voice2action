"use client";

import dynamic from "next/dynamic";

let AdminClient = dynamic(() => import("./AdminClient"), {
  ssr: false,
});

export default function AdminClientWrapper() {
  return <AdminClient />;
}
