"use client";

import {
  clampPointToCityBounds,
  getCityMapConfig,
  isNearCityBounds,
  isWithinCityBounds,
} from "./city-map";
import { getResponseErrorMessage, readJsonResponse } from "./http";

let LAST_LOCATION_STORAGE_KEY = "voice2action-last-location";
let MAX_RELIABLE_ACCURACY_METERS = 3000;
let MAX_WATCH_ACCURACY_METERS = 2000;

async function fetchLocationDetails(lat, lng) {
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

  return payload.location;
}

function getCurrentPosition(options) {
  return new Promise(function resolvePosition(resolve, reject) {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function getLocationOptions() {
  return [
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 1000 * 60 * 5,
    },
  ];
}

async function getBestCurrentPosition() {
  let attempts = getLocationOptions();
  let index = 0;
  let lastError = null;

  while (index < attempts.length) {
    try {
      return await getCurrentPosition(attempts[index]);
    } catch (error) {
      lastError = error;
    }

    index += 1;
  }

  throw lastError || new Error("Unable to determine your current location.");
}

function getReverseGeocodeFallback(lat, lng) {
  let cityMap = getCityMapConfig();

  return {
    area: cityMap.name,
    city: cityMap.name,
    cityKey: cityMap.key,
    label: cityMap.name,
  };
}

async function fetchLocationDetailsWithFallback(lat, lng) {
  try {
    return await fetchLocationDetails(lat, lng);
  } catch (_error) {
    return getReverseGeocodeFallback(lat, lng);
  }
}

function readCachedBrowserLocation() {
  if (typeof window === "undefined") {
    return null;
  }

  let cachedValue = window.localStorage.getItem(LAST_LOCATION_STORAGE_KEY);

  if (!cachedValue) {
    return null;
  }

  try {
    let parsedValue = JSON.parse(cachedValue);

    if (!Number.isFinite(Number(parsedValue.lat)) || !Number.isFinite(Number(parsedValue.lng))) {
      return null;
    }

    return parsedValue;
  } catch (_error) {
    return null;
  }
}

function storeBrowserLocation(location) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LAST_LOCATION_STORAGE_KEY, JSON.stringify(location));
}

function normalizeBrowserPosition(position) {
  let lat = Number(position.coords.latitude);
  let lng = Number(position.coords.longitude);
  let accuracy = Math.round(Number(position.coords.accuracy || 0));
  let toleranceMeters = Math.max(accuracy, 150);
  let isWithinBounds = isWithinCityBounds(lat, lng);
  let isNearBounds = isNearCityBounds(lat, lng, toleranceMeters);
  let adjustedPoint = isWithinBounds ? { lat, lng } : clampPointToCityBounds(lat, lng);

  return {
    originalLat: lat,
    originalLng: lng,
    lat: adjustedPoint.lat,
    lng: adjustedPoint.lng,
    accuracy,
    isWithinBounds,
    isNearBounds,
    wasAdjusted: !isWithinBounds && isNearBounds,
  };
}

function isAccuracyReliable(accuracy, threshold = MAX_RELIABLE_ACCURACY_METERS) {
  return Number.isFinite(Number(accuracy)) && Number(accuracy) > 0 && Number(accuracy) <= threshold;
}

function buildResolvedBrowserLocation(position, locationDetails, overrides = {}) {
  let cityMap = getCityMapConfig();
  let normalizedPosition = normalizeBrowserPosition(position);

  return {
    lat: normalizedPosition.lat,
    lng: normalizedPosition.lng,
    accuracy: normalizedPosition.accuracy,
    city: cityMap.name,
    area: locationDetails.area,
    cityKey: cityMap.key,
    label: locationDetails.label,
    detectionMode: overrides.detectionMode || (normalizedPosition.wasAdjusted ? "adjusted-gps" : "gps"),
    isApproximate:
      Boolean(overrides.isApproximate) ||
      normalizedPosition.wasAdjusted ||
      normalizedPosition.accuracy > 120,
    originalLat: normalizedPosition.originalLat,
    originalLng: normalizedPosition.originalLng,
    note: overrides.note || "",
  };
}

export async function resolveBrowserLocation() {
  let cityMap = getCityMapConfig();
  let cachedLocation = readCachedBrowserLocation();
  let position = await getBestCurrentPosition();
  let normalizedPosition = normalizeBrowserPosition(position);

  if (!isAccuracyReliable(normalizedPosition.accuracy)) {
    if (cachedLocation && isWithinCityBounds(Number(cachedLocation.lat), Number(cachedLocation.lng))) {
      return {
        ...cachedLocation,
        detectionMode: "cached",
        isApproximate: true,
        note: "GPS signal is weak right now, so the last reliable in-city location is being used.",
      };
    }

    throw new Error(
      `GPS accuracy is too low (${Math.max(1, normalizedPosition.accuracy)}m). Move closer to a window or use the map to pick your location.`
    );
  }

  if (!normalizedPosition.isWithinBounds && !normalizedPosition.isNearBounds) {
    if (cachedLocation && isWithinCityBounds(Number(cachedLocation.lat), Number(cachedLocation.lng))) {
      return {
        ...cachedLocation,
        detectionMode: "cached",
        isApproximate: true,
        note: `GPS is currently outside ${cityMap.name}, so the last good in-city location is being used.`,
      };
    }

    throw new Error(`GPS found a point outside ${cityMap.name}. Use the map to pick a spot here.`);
  }

  let locationDetails = await fetchLocationDetailsWithFallback(
    normalizedPosition.lat,
    normalizedPosition.lng
  );
  let resolvedLocation = buildResolvedBrowserLocation(position, locationDetails, {
    note: normalizedPosition.wasAdjusted
      ? `GPS was slightly outside ${cityMap.name}, so the location was aligned to the nearest in-city point.`
      : "",
  });

  storeBrowserLocation(resolvedLocation);

  return resolvedLocation;
}

export function watchBrowserLocation(onUpdate, onError) {
  if (!navigator.geolocation) {
    if (onError) {
      onError(new Error("Geolocation is not supported on this device."));
    }

    return function noop() {
      return null;
    };
  }

  let watchId = navigator.geolocation.watchPosition(
    function handlePosition(position) {
      let normalizedPosition = normalizeBrowserPosition(position);

      if (!isAccuracyReliable(normalizedPosition.accuracy, MAX_WATCH_ACCURACY_METERS)) {
        return;
      }

      if (!normalizedPosition.isWithinBounds && !normalizedPosition.isNearBounds) {
        return;
      }

      fetchLocationDetailsWithFallback(normalizedPosition.lat, normalizedPosition.lng)
        .then(function applyLocationDetails(locationDetails) {
          let resolvedLocation = buildResolvedBrowserLocation(position, locationDetails, {
            note: normalizedPosition.wasAdjusted
              ? `GPS was refined near the city edge and aligned to the nearest in-city point.`
              : "",
          });

          storeBrowserLocation(resolvedLocation);
          onUpdate(resolvedLocation);
        })
        .catch(function handleLocationError(error) {
          if (onError) {
            onError(error);
          }
        });
    },
    function handleWatchError(error) {
      if (onError) {
        onError(error);
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000 * 30,
    }
  );

  return function stopWatching() {
    navigator.geolocation.clearWatch(watchId);
  };
}
