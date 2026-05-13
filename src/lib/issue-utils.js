import {
  DEFAULT_ISSUE_CATEGORY,
  ISSUE_CATEGORY_META,
  ISSUE_CATEGORIES,
  ISSUE_STATUS_META,
  normalizeIssueCategory,
  normalizeIssueStatus,
} from "./issue-constants";

let categoryKeywords = {
  "Road Damage": [
    "road",
    "pothole",
    "traffic",
    "street",
    "bridge",
    "road damage",
    "damaged road",
    "crack",
    "broken road",
    "lane",
  ],
  "Water Leakage": [
    "water",
    "pipe",
    "drain",
    "flood",
    "sewage",
    "leak",
    "leakage",
    "water shortage",
    "burst pipe",
    "overflow",
  ],
  Garbage: ["garbage", "trash", "waste", "dump", "bin", "clean", "overflowing waste"],
  "Street Light": [
    "electricity",
    "power",
    "current",
    "light",
    "wire",
    "transformer",
    "outage",
    "blackout",
    "power cut",
    "street light",
  ],
  Traffic: ["traffic", "signal", "junction", "congestion", "gridlock", "jam"],
};

let urgentKeywords = ["accident", "danger", "urgent", "emergency", "injury", "unsafe"];
let severeKeywords = ["major", "severe", "collapsed", "blocked", "overflow", "burst", "fire"];

export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectCategory(description) {
  let normalizedDescription = normalizeText(description);
  let categories = ISSUE_CATEGORIES;
  let index = 0;

  while (index < categories.length) {
    let category = categories[index];
    let words = categoryKeywords[category];
    let wordIndex = 0;

    while (wordIndex < words.length) {
      if (normalizedDescription.includes(words[wordIndex])) {
        return category;
      }

      wordIndex += 1;
    }

    index += 1;
  }

  return DEFAULT_ISSUE_CATEGORY;
}

export function getUrgencyScore(description) {
  let normalizedDescription = normalizeText(description);
  let index = 0;
  let score = 2;

  while (index < urgentKeywords.length) {
    if (normalizedDescription.includes(urgentKeywords[index])) {
      score += 4;
    }

    index += 1;
  }

  return Math.min(12, score);
}

export function getSeverityScore(description) {
  let normalizedDescription = normalizeText(description);
  let words = normalizedDescription ? normalizedDescription.split(" ") : [];
  let score = Math.min(6, Math.floor(words.length / 12));
  let index = 0;

  while (index < severeKeywords.length) {
    if (normalizedDescription.includes(severeKeywords[index])) {
      score += 2;
    }

    index += 1;
  }

  return Math.min(10, Math.max(1, score));
}

export function getTimeFactor(createdAt) {
  let createdTime = new Date(createdAt).getTime();
  let now = Date.now();
  let hoursSinceCreation = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60)));
  return Math.min(12, Math.floor(hoursSinceCreation / 6));
}

export function calculatePriorityScore(issue) {
  let votes = Number(issue.votes || 0);
  let urgency = getUrgencyScore(issue.description || "");
  let timeFactor = getTimeFactor(issue.createdAt || new Date());
  let severity = getSeverityScore(issue.description || "");
  return votes * 2 + urgency + timeFactor + severity;
}

export function getPriorityBand(issue) {
  let score = calculatePriorityScore(issue);

  if (score >= 22) {
    return "high";
  }

  if (score >= 12) {
    return "medium";
  }

  return "low";
}

export function buildAdminSummary(issues) {
  if (!issues.length) {
    return "No issues reported yet.";
  }

  let sortedIssues = issues.slice().sort(function sortIssues(firstIssue, secondIssue) {
    return calculatePriorityScore(secondIssue) - calculatePriorityScore(firstIssue);
  });
  let topIssue = sortedIssues[0];
  let areaLabel = topIssue.city || "your city";
  return `Top issue: ${topIssue.category} problem in ${areaLabel} with ${topIssue.votes} votes`;
}

export function isDuplicateIssue(input, issues) {
  let nextText = normalizeText(`${input.title} ${input.description}`);
  let index = 0;

  while (index < issues.length) {
    let current = issues[index];
    let currentText = normalizeText(`${current.title} ${current.description}`);

    if (
      currentText === nextText ||
      currentText.includes(nextText) ||
      nextText.includes(currentText)
    ) {
      return current;
    }

    index += 1;
  }

  return null;
}

export function serializeIssue(issueDocument) {
  let issue = issueDocument.toObject ? issueDocument.toObject() : issueDocument;
  let geoCoordinates = Array.isArray(issue.coordinates?.coordinates)
    ? issue.coordinates.coordinates
    : [issue.lng, issue.lat];
  let normalizedCategory = normalizeIssueCategory(issue.category);
  let normalizedStatus = normalizeIssueStatus(issue.status);
  let categoryMeta = ISSUE_CATEGORY_META[normalizedCategory];
  let statusMeta = ISSUE_STATUS_META[normalizedStatus];

  return {
    id: issue._id ? String(issue._id) : String(issue.id),
    title: issue.title,
    description: issue.description,
    category: normalizedCategory,
    lat: Number(issue.lat ?? geoCoordinates[1]),
    lng: Number(issue.lng ?? geoCoordinates[0]),
    coordinates: {
      type: "Point",
      coordinates: [Number(geoCoordinates[0]), Number(geoCoordinates[1])],
    },
    city: issue.city || "",
    cityKey: issue.cityKey || "",
    locationAccuracy: Number(issue.locationAccuracy || 0),
    image: issue.image || "",
    source: issue.source || "user-report",
    votes: issue.votes,
    priorityScore: calculatePriorityScore(issue),
    priorityBand: getPriorityBand(issue),
    status: normalizedStatus,
    categoryColor: categoryMeta.color,
    categoryAccent: categoryMeta.accent,
    categoryIcon: categoryMeta.icon,
    statusLabel: statusMeta.label,
    createdAt: issue.createdAt,
  };
}
