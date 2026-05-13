"use client";

import dynamic from "next/dynamic";

let MapExperience = dynamic(() => import("./MapExperience"), {
  ssr: false,
});

export default function MapExperienceWrapper() {
  return <MapExperience />;
}
