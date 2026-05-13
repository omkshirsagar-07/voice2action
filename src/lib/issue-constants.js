export let ISSUE_CATEGORY_META = {
  Garbage: {
    label: "Garbage",
    color: "#22c55e",
    accent: "#86efac",
    icon: "GB",
  },
  "Road Damage": {
    label: "Road Damage",
    color: "#f97316",
    accent: "#fdba74",
    icon: "RD",
  },
  "Water Leakage": {
    label: "Water Leakage",
    color: "#0ea5e9",
    accent: "#7dd3fc",
    icon: "WL",
  },
  "Street Light": {
    label: "Street Light",
    color: "#eab308",
    accent: "#fde047",
    icon: "SL",
  },
  Traffic: {
    label: "Traffic",
    color: "#ef4444",
    accent: "#fca5a5",
    icon: "TF",
  },
  Drainage: {
    label: "Drainage",
    color: "#0f766e",
    accent: "#2dd4bf",
    icon: "DR",
  },
  Construction: {
    label: "Construction",
    color: "#9333ea",
    accent: "#c084fc",
    icon: "CN",
  },
};

export let ISSUE_STATUS_META = {
  pending: {
    label: "Pending",
    tone: "amber",
  },
  resolved: {
    label: "Resolved",
    tone: "emerald",
  },
};

export let ISSUE_CATEGORIES = Object.keys(ISSUE_CATEGORY_META);
export let ISSUE_STATUSES = Object.keys(ISSUE_STATUS_META);
export let DEFAULT_ISSUE_CATEGORY = "Garbage";
export let DEFAULT_ISSUE_STATUS = "pending";

export function isValidIssueCategory(category) {
  return ISSUE_CATEGORIES.includes(category);
}

export function isValidIssueStatus(status) {
  return ISSUE_STATUSES.includes(status);
}

export function normalizeIssueCategory(category) {
  let normalized = String(category || "").trim();
  if (!normalized) {
    return DEFAULT_ISSUE_CATEGORY;
  }

  return normalized;
}

export function normalizeIssueStatus(status) {
  if (isValidIssueStatus(status)) {
    return status;
  }

  return DEFAULT_ISSUE_STATUS;
}
