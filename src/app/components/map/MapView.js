"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet-defaulticon-compatibility";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import HeatmapLayer from "./HeatmapLayer";
import IssueMarker from "./IssueMarker";
import { getCityMapConfig, isWithinCityBounds } from "@/lib/city-map";

let selectionIcon = L.divIcon({
  className: "issue-map-selection",
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:#2563eb;box-shadow:0 18px 48px rgba(37,99,235,0.35);border:3px solid rgba(255,255,255,0.95);">
      <div style="width:8px;height:8px;border-radius:999px;background:white;"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function createClusterIcon(cluster) {
  let childCount = cluster.getChildCount();
  let size = childCount > 20 ? 60 : childCount > 8 ? 52 : 44;
  let gradient = childCount > 20 ? "#ef4444,#f97316" : childCount > 8 ? "#0ea5e9,#2563eb" : "#22c55e,#16a34a";

  return L.divIcon({
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:999px;background:linear-gradient(135deg, ${gradient});border:4px solid rgba(255,255,255,0.9);box-shadow:0 24px 60px rgba(15,23,42,0.22);">
        <span style="color:white;font-weight:800;font-size:14px;">${childCount}</span>
      </div>
    `,
    className: "issue-cluster-marker",
    iconSize: [size, size],
  });
}

function MapViewportController({ issues, currentLocation, focusPoint }) {
  let map = useMap();
  let cityMap = getCityMapConfig();

  useEffect(
    function syncVisibleBounds() {
      map.setMaxBounds(cityMap.bounds);
      let positions = issues.map(function mapIssue(issue) {
        return [issue.lat, issue.lng];
      });

      if (currentLocation && isWithinCityBounds(currentLocation.lat, currentLocation.lng)) {
        positions.push([currentLocation.lat, currentLocation.lng]);
      }

      if (focusPoint && isWithinCityBounds(focusPoint.lat, focusPoint.lng)) {
        map.flyTo([focusPoint.lat, focusPoint.lng], Math.max(map.getZoom(), 15), {
          duration: 0.8,
        });
        return;
      }

      if (positions.length) {
        map.fitBounds(positions, {
          padding: [36, 36],
          maxZoom: 15,
        });
        return;
      }

      map.fitBounds(cityMap.bounds, { padding: [24, 24] });
    },
    [map, issues, currentLocation, focusPoint, cityMap.bounds]
  );

  return null;
}

function MapClickHandler({ allowIssueCreation, onMapSelect }) {
  useMapEvents({
    click: function handleMapClick(event) {
      if (!allowIssueCreation || !onMapSelect) {
        return;
      }

      onMapSelect({
        lat: Number(event.latlng.lat),
        lng: Number(event.latlng.lng),
      });
    },
  });

  return null;
}

export default function MapView({
  issues,
  currentLocation,
  selectedPoint,
  selectedIssueId,
  allowIssueCreation = false,
  onIssueSelect,
  onMapSelect,
  showHeatmap = true,
  className = "h-[620px]",
}) {
  let cityMap = getCityMapConfig();
  let mapIssues = useMemo(
    function buildMapIssues() {
      return issues.filter(function filterIssue(issue) {
        return isWithinCityBounds(Number(issue.lat), Number(issue.lng));
      });
    },
    [issues]
  );
  let heatPoints = useMemo(
    function buildHeatPoints() {
      return mapIssues.map(function mapIssue(issue) {
        return [issue.lat, issue.lng, Math.max(0.35, issue.priorityScore / 32)];
      });
    },
    [mapIssues]
  );

  return (
    <div className={`overflow-hidden rounded-[32px] border border-white/40 bg-white/40 backdrop-blur-xl ${className}`}>
      <MapContainer
        center={cityMap.center}
        zoom={13}
        minZoom={11}
        maxZoom={18}
        maxBounds={cityMap.bounds}
        maxBoundsViscosity={1}
        zoomControl={false}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <MapViewportController
          issues={mapIssues}
          currentLocation={currentLocation}
          focusPoint={selectedPoint}
        />
        <MapClickHandler allowIssueCreation={allowIssueCreation} onMapSelect={onMapSelect} />
        <ZoomControl position="bottomright" />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <HeatmapLayer points={heatPoints} visible={showHeatmap} />

        {currentLocation ? (
          <Circle
            center={[currentLocation.lat, currentLocation.lng]}
            radius={Math.max(35, Number(currentLocation.accuracy || currentLocation.locationAccuracy || 0))}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#60a5fa",
              fillOpacity: 0.18,
              weight: 2,
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-900">Your location</p>
                <p className="text-slate-600">{currentLocation.label || currentLocation.city}</p>
              </div>
            </Popup>
          </Circle>
        ) : null}

        {selectedPoint ? (
          <Marker position={[selectedPoint.lat, selectedPoint.lng]} icon={selectionIcon}>
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-900">Selected report point</p>
                <p className="text-slate-600">
                  {selectedPoint.lat.toFixed(5)}, {selectedPoint.lng.toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        ) : null}

        <MarkerClusterGroup
          chunkedLoading
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          maxClusterRadius={50}
          iconCreateFunction={createClusterIcon}
        >
          {mapIssues.map(function renderIssue(issue) {
            return (
              <IssueMarker
                key={issue.id}
                issue={issue}
                isSelected={issue.id === selectedIssueId}
                onSelect={onIssueSelect}
              />
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
