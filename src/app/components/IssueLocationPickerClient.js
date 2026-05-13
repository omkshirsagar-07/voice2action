"use client";

import { useEffect, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  Rectangle,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { getCityMapConfig, isWithinCityBounds } from "@/lib/city-map";
import { getResponseErrorMessage, readJsonResponse } from "@/lib/http";

let selectedLocationIcon = L.divIcon({
  className: "",
  html: '<div style="width:20px;height:20px;border-radius:999px;border:4px solid white;box-shadow:0 8px 18px rgba(15,23,42,0.26);background:#2563eb;"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -8],
});

function MapViewportController() {
  let map = useMap();
  let cityMap = getCityMapConfig();

  useEffect(
    function keepCityViewStable() {
      map.setMaxBounds(cityMap.bounds);
      map.fitBounds(cityMap.bounds, {
        padding: [10, 10],
      });
    },
    [map, cityMap.bounds]
  );

  return null;
}

function SelectedLocationViewport({ selectedPosition }) {
  let map = useMap();

  useEffect(
    function syncSelectedPosition() {
      if (!selectedPosition) {
        return;
      }

      map.flyTo(selectedPosition, Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.6,
      });
    },
    [map, selectedPosition]
  );

  return null;
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click: function handleMapClick(event) {
      onPick(event.latlng);
    },
  });

  return null;
}

export default function IssueLocationPickerClient({ value, onSelect, onError }) {
  let cityMap = getCityMapConfig();
  let [isResolving, setIsResolving] = useState(false);
  let selectedPosition =
    Number.isFinite(Number(value?.lat)) && Number.isFinite(Number(value?.lng))
      ? [Number(value.lat), Number(value.lng)]
      : null;

  async function handlePick(latlng) {
    let lat = Number(latlng.lat);
    let lng = Number(latlng.lng);

    if (!isWithinCityBounds(lat, lng)) {
      onError(`Please click inside ${cityMap.name}.`);
      return;
    }

    try {
      setIsResolving(true);
      let params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
      });
      let response = await fetch(`/api/location/reverse?${params.toString()}`, {
        cache: "no-store",
      });
      let payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          getResponseErrorMessage(response, payload, "Unable to identify the selected location.")
        );
      }

      let locationDetails = payload.location;

      onSelect({
        lat,
        lng,
        city: locationDetails.area,
        cityKey: locationDetails.cityKey,
        label: locationDetails.label,
        locationAccuracy: 0,
      });
    } catch (locationError) {
      onError(locationError.message);
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer
        center={cityMap.center}
        zoom={12}
        minZoom={11}
        maxZoom={18}
        maxBounds={cityMap.bounds}
        maxBoundsViscosity={1}
        scrollWheelZoom={false}
        className="h-[260px] w-full"
      >
        <MapViewportController />
        <SelectedLocationViewport selectedPosition={selectedPosition} />
        <MapClickHandler onPick={handlePick} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Rectangle
          bounds={cityMap.bounds}
          pathOptions={{
            color: "#2563eb",
            weight: 2,
            fillOpacity: 0.04,
          }}
        />

        {selectedPosition ? (
          <Marker
            position={selectedPosition}
            icon={selectedLocationIcon}
            draggable={true}
            eventHandlers={{
              dragend: function handleDragEnd(event) {
                handlePick(event.target.getLatLng());
              },
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-900">Selected issue location</p>
                <p className="text-slate-600">{value.city || cityMap.name}</p>
                <p className="text-slate-600">
                  {Number(value.lat).toFixed(5)}, {Number(value.lng).toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        ) : null}

        {value.locationAccuracy ? (
          <Circle
            center={selectedPosition}
            radius={Math.max(20, Number(value.locationAccuracy))}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#60a5fa",
              fillOpacity: 0.12,
              weight: 1,
            }}
          />
        ) : null}
      </MapContainer>

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
        {isResolving
          ? "Checking the clicked location..."
          : `If GPS fails, click inside ${cityMap.name}. You can also drag the blue marker to fine-tune the issue spot.`}
      </div>
    </div>
  );
}
