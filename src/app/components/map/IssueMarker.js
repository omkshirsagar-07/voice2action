"use client";

import { memo } from "react";
import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import IssuePopup from "./IssuePopup";
import { ISSUE_CATEGORY_META } from "@/lib/issue-constants";

let markerIconCache = new Map();

function createIssueMarkerIcon(category, isSelected) {
  let iconKey = `${category}-${isSelected ? "selected" : "default"}`;

  if (markerIconCache.has(iconKey)) {
    return markerIconCache.get(iconKey);
  }

  let categoryMeta = ISSUE_CATEGORY_META[category] || ISSUE_CATEGORY_META.Garbage;
  let size = isSelected ? 54 : 44;
  let borderSize = isSelected ? 3 : 2;
  let shadow = isSelected
    ? "0 26px 54px rgba(15,23,42,0.32)"
    : "0 18px 42px rgba(15,23,42,0.22)";
  let iconLabel = categoryMeta.icon || String(category || "?").slice(0, 2).toUpperCase();
  let icon = L.divIcon({
    className: "issue-map-marker",
    html: `
      <div style="position:relative;width:${size}px;height:${size + 10}px;display:flex;align-items:flex-end;justify-content:center;">
        <div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg, ${categoryMeta.color}, ${categoryMeta.accent});box-shadow:${shadow};border:${borderSize}px solid rgba(255,255,255,0.98);display:flex;align-items:center;justify-content:center;">
          <span style="font-size:${isSelected ? 14 : 12}px;font-weight:900;letter-spacing:0.12em;color:white;">${iconLabel}</span>
          ${isSelected ? '<div style="position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 8px rgba(255,255,255,0.12);"></div>' : ""}
        </div>
        <div style="position:absolute;bottom:0;left:50%;transform:translate(-50%,50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid ${categoryMeta.color};"></div>
      </div>
    `,
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 2],
    popupAnchor: [0, -(size / 2 + 10)],
  });

  markerIconCache.set(iconKey, icon);
  return icon;
}

function IssueMarkerComponent({ issue, isSelected = false, onSelect }) {
  return (
    <Marker
      position={[issue.lat, issue.lng]}
      icon={createIssueMarkerIcon(issue.category, isSelected)}
      eventHandlers={
        onSelect
          ? {
              click: function handleClick() {
                onSelect(issue);
              },
            }
          : undefined
      }
    >
      <Popup>
        <IssuePopup issue={issue} />
      </Popup>
    </Marker>
  );
}

let IssueMarker = memo(IssueMarkerComponent);

export default IssueMarker;
