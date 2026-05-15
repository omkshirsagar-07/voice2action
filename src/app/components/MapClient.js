"use client";

import MapView from "./map/MapView";

export default function MapClient({ issues, currentLocation, className = "h-full min-h-[320px]", showHeatmap = false }) {
  return (
    <MapView
      issues={issues}
      currentLocation={currentLocation}
      showHeatmap={showHeatmap}
      className={className}
    />
  );
}
