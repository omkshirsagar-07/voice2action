"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import "leaflet.heat";
import L from "leaflet";

export default function HeatmapLayer({ points, visible }) {
  let map = useMap();

  useEffect(
    function syncHeatLayer() {
      if (!visible || !points.length) {
        return;
      }

      // Leaflet.heat attaches the plugin to the global Leaflet instance.
      let layer = L.heatLayer(points, {
        radius: 28,
        blur: 20,
        maxZoom: 17,
        minOpacity: 0.28,
        gradient: {
          0.2: "#38bdf8",
          0.45: "#22c55e",
          0.7: "#f97316",
          1.0: "#ef4444",
        },
      });

      layer.addTo(map);

      return function cleanupHeatLayer() {
        map.removeLayer(layer);
      };
    },
    [map, points, visible]
  );

  return null;
}
