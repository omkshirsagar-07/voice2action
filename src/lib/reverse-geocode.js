import { buildIssueAreaLabel, getCityMapConfig, isWithinCityBounds } from "./city-map";
import { readJsonResponse } from "./http";

let REVERSE_GEOCODE_TTL = 1000 * 60 * 60;

if (!global.reverseGeocodeCache) {
  global.reverseGeocodeCache = new Map();
}

let reverseGeocodeCache = global.reverseGeocodeCache;

function getCacheKey(lat, lng) {
  return `${Number(lat).toFixed(5)}:${Number(lng).toFixed(5)}`;
}

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
    address.borough ||
    address.town ||
    address.village ||
    address.municipality ||
    address.city ||
    ""
  );
}

function getCachedValue(cacheKey) {
  let cachedEntry = reverseGeocodeCache.get(cacheKey);

  if (!cachedEntry) {
    return null;
  }

  if (Date.now() - cachedEntry.timestamp > REVERSE_GEOCODE_TTL) {
    reverseGeocodeCache.delete(cacheKey);
    return null;
  }

  return cachedEntry.value;
}

function setCachedValue(cacheKey, value) {
  reverseGeocodeCache.set(cacheKey, {
    timestamp: Date.now(),
    value,
  });
}

export async function reverseGeocodeWithProvider(lat, lng) {
  let cityMap = getCityMapConfig();
  let cacheKey = getCacheKey(lat, lng);
  let cachedValue = getCachedValue(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  if (!isWithinCityBounds(lat, lng)) {
    throw new Error(`Please choose a location inside ${cityMap.name}.`);
  }

  let params = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    zoom: "18",
    addressdetails: "1",
    layer: "address",
    email: "voice2action@example.com",
  });
  let response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
      "User-Agent": "Voice2Action/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to identify the selected location.");
  }

  let payload = await readJsonResponse(response);
  let address = payload.address || {};
  let area = buildIssueAreaLabel(getAreaFromAddress(address));
  let value = {
    area,
    city: cityMap.name,
    cityKey: cityMap.key,
    label: area && area !== cityMap.name ? `${area}, ${cityMap.name}` : cityMap.name,
    displayName: String(payload.display_name || "").trim(),
    address,
  };

  setCachedValue(cacheKey, value);

  return value;
}
