import { buildIssueAreaLabel, getCityMapConfig } from "./city-map";
import { sampleIssueData } from "./issue-sample-data";
import Issue from "@/models/Issue";

if (!global.issueSeedState) {
  global.issueSeedState = {
    attempted: false,
  };
}

let issueSeedState = global.issueSeedState;

function buildSeedDocument(issue) {
  let lng = Number(issue.coordinates?.[0]);
  let lat = Number(issue.coordinates?.[1]);

  return {
    title: issue.title,
    description: issue.description,
    category: issue.category,
    status: issue.status,
    image: issue.image || "",
    city: buildIssueAreaLabel(issue.city),
    cityKey: issue.cityKey,
    locationAccuracy: Number(issue.locationAccuracy || 0),
    lat,
    lng,
    coordinates: {
      type: "Point",
      coordinates: [lng, lat],
    },
    votes: Number(issue.votes || 0),
    priorityScore: Number(issue.priorityScore || 0),
    source: issue.source || "sample-seed",
    createdAt: issue.createdAt,
  };
}

export async function ensureSampleIssues() {
  if (issueSeedState.attempted) {
    return;
  }

  issueSeedState.attempted = true;

  let cityMap = getCityMapConfig();
  await Issue.deleteMany({ cityKey: cityMap.key, source: "sample-seed" });

  let seedDocuments = sampleIssueData.map(buildSeedDocument);
  if (seedDocuments.length === 0) {
    return;
  }

  await Issue.insertMany(seedDocuments, { ordered: true });
}
