"use client";

import dynamic from "next/dynamic";

let HomeClient = dynamic(() => import("./HomeClient"), {
  ssr: false,
});

export default function HomeClientWrapper() {
  return <HomeClient />;
}
