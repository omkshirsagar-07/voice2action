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

export let ADMIN_DEPARTMENT_META = {
  garbage: {
    label: "Garbage",
    categories: ["Garbage"],
  },
  water: {
    label: "Water",
    categories: ["Water Leakage"],
  },
  roads: {
    label: "Roads",
    categories: ["Road Damage"],
  },
  electricity: {
    label: "Electricity",
    categories: ["Street Light"],
  },
  traffic: {
    label: "Traffic",
    categories: ["Traffic"],
  },
  drainage: {
    label: "Drainage",
    categories: ["Drainage"],
  },
  construction: {
    label: "Construction",
    categories: ["Construction"],
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
export let ADMIN_DEPARTMENTS = Object.keys(ADMIN_DEPARTMENT_META);
export let DEFAULT_ISSUE_CATEGORY = "Garbage";
export let DEFAULT_ISSUE_STATUS = "pending";
export let DEFAULT_ADMIN_DEPARTMENT = "garbage";

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

export function normalizeAdminDepartment(department) {
  let normalizedDepartment = String(department || "").trim().toLowerCase();

  if (ADMIN_DEPARTMENTS.includes(normalizedDepartment)) {
    return normalizedDepartment;
  }

  return DEFAULT_ADMIN_DEPARTMENT;
}

export function getDepartmentCategories(department) {
  let normalizedDepartment = normalizeAdminDepartment(department);
  return ADMIN_DEPARTMENT_META[normalizedDepartment]?.categories || [];
}

export function getDepartmentLabel(department) {
  let normalizedDepartment = normalizeAdminDepartment(department);
  return ADMIN_DEPARTMENT_META[normalizedDepartment]?.label || ADMIN_DEPARTMENT_META[DEFAULT_ADMIN_DEPARTMENT].label;
}
