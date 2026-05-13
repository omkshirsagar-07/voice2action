"use client";

import MapView from "./map/MapView";

export default function MapClient({ issues, currentLocation }) {
  return (
    <MapView
      issues={issues}
      currentLocation={currentLocation}
      showHeatmap={false}
      className="h-full min-h-[320px]"
    />
  );
}
