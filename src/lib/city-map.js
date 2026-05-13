import { normalizeCityKey } from "./location-utils";

let CITY_NAME = "Chhatrapati Sambhajinagar";
let CITY_CENTER = [19.8762, 75.3433];
let CITY_BOUNDS = [
  [19.7, 75.1],
  [20.0, 75.6],
];
let CITY_KEY = normalizeCityKey(CITY_NAME);
let CITY_LEGACY_NAMES = ["Aurangabad", "Sambhajinagar"];

function getAreaFromAddress(address) {
  if (!address) {
    return "";
  }

  return (
    address.suburb ||
    address.neighbourhood ||
    address.residential ||
    address.hamlet ||
    address.quarter ||
    address.city_district ||
    address.town ||
    address.village ||
    address.municipality ||
    address.city ||
    ""
  );
}

export function getCityMapConfig() {
  return {
    name: CITY_NAME,
    key: CITY_KEY,
    center: CITY_CENTER,
    bounds: CITY_BOUNDS,
    legacyNames: CITY_LEGACY_NAMES,
  };
}

export function isWithinCityBounds(lat, lng) {
  let southWest = CITY_BOUNDS[0];
  let northEast = CITY_BOUNDS[1];

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= southWest[0] &&
    lat <= northEast[0] &&
    lng >= southWest[1] &&
    lng <= northEast[1]
  );
}

export function clampPointToCityBounds(lat, lng) {
  let southWest = CITY_BOUNDS[0];
  let northEast = CITY_BOUNDS[1];

  return {
    lat: Math.min(Math.max(Number(lat), southWest[0]), northEast[0]),
    lng: Math.min(Math.max(Number(lng), southWest[1]), northEast[1]),
  };
}

export function getDistanceOutsideCityBounds(lat, lng) {
  let southWest = CITY_BOUNDS[0];
  let northEast = CITY_BOUNDS[1];
  let normalizedLat = Number(lat);
  let normalizedLng = Number(lng);
  let latDelta = 0;
  let lngDelta = 0;

  if (normalizedLat < southWest[0]) {
    latDelta = southWest[0] - normalizedLat;
  } else if (normalizedLat > northEast[0]) {
    latDelta = normalizedLat - northEast[0];
  }

  if (normalizedLng < southWest[1]) {
    lngDelta = southWest[1] - normalizedLng;
  } else if (normalizedLng > northEast[1]) {
    lngDelta = normalizedLng - northEast[1];
  }

  let metersPerDegreeLat = 111320;
  let metersPerDegreeLng = 111320 * Math.cos((normalizedLat * Math.PI) / 180);

  return Math.sqrt(
    Math.pow(latDelta * metersPerDegreeLat, 2) + Math.pow(lngDelta * metersPerDegreeLng, 2)
  );
}

export function isNearCityBounds(lat, lng, toleranceMeters = 0) {
  return getDistanceOutsideCityBounds(lat, lng) <= Math.max(0, Number(toleranceMeters || 0));
}

export function buildIssueAreaLabel(areaName) {
  let cleanAreaName = String(areaName || "").trim();
  return cleanAreaName || CITY_NAME;
}
