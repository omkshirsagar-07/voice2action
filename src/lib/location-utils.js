export function normalizeCityKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractCityName(address) {
  if (!address) {
    return "";
  }

  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    ""
  );
}

export function buildLocationLabel(city, state) {
  if (city && state) {
    return `${city}, ${state}`;
  }

  return city || state || "your area";
}
