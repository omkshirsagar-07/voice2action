import connectToDatabase from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import {
  calculatePriorityScore,
  detectCategory,
  normalizeText,
  isDuplicateIssue,
  serializeIssue,
} from "@/lib/issue-utils";

import {
  buildIssueAreaLabel,
  getCityMapConfig,
  isWithinCityBounds,
} from "@/lib/city-map";

import {
  getDepartmentCategories,
  ISSUE_CATEGORIES,
  ISSUE_STATUSES,
  normalizeAdminDepartment,
  normalizeIssueCategory,
  normalizeIssueStatus,
} from "@/lib/issue-constants";

import { sampleIssueData } from "@/lib/issue-sample-data";
import { normalizeCityKey } from "@/lib/location-utils";
import { reverseGeocodeWithProvider } from "@/lib/reverse-geocode";

import Issue from "@/models/Issue";

function buildIssueQueryFilters(searchParams) {
  let requestedCity = searchParams.get("city") || searchParams.get("cityKey");
  let requestedCategory = searchParams.get("category");
  let requestedStatus = searchParams.get("status");
  let requestedDepartment = String(searchParams.get("department") || "").trim().toLowerCase();
  let requestedSearch = String(searchParams.get("search") || "").trim();
  let cityKey = normalizeCityKey(requestedCity);
  let query = cityKey ? { cityKey } : {};

  if (requestedCategory && ISSUE_CATEGORIES.includes(requestedCategory)) {
    query.category = requestedCategory;
  }

  if (requestedStatus && ISSUE_STATUSES.includes(requestedStatus)) {
    query.status = requestedStatus;
  }

  if (requestedDepartment) {
    let departmentCategories = getDepartmentCategories(requestedDepartment);

    if (departmentCategories.length) {
      query.category = {
        $in: departmentCategories,
      };
    }
  }

  if (requestedSearch) {
    query.$or = [
      {
        title: {
          $regex: requestedSearch,
          $options: "i",
        },
      },
      {
        description: {
          $regex: requestedSearch,
          $options: "i",
        },
      },
      {
        city: {
          $regex: requestedSearch,
          $options: "i",
        },
      },
    ];
  }

  return {
    cityKey,
    query,
    requestedDepartment,
    requestedSearch,
  };
}

function doesSampleIssueMatchQuery(issue, query, requestedSearch) {
  if (query.cityKey && issue.cityKey !== query.cityKey) {
    return false;
  }

  if (query.category) {
    if (typeof query.category === "string" && issue.category !== query.category) {
      return false;
    }

    if (Array.isArray(query.category.$in) && !query.category.$in.includes(issue.category)) {
      return false;
    }
  }

  if (query.status && issue.status !== query.status) {
    return false;
  }

  if (!requestedSearch) {
    return true;
  }

  let searchValue = requestedSearch.toLowerCase();

  return [issue.title, issue.description, issue.city].some(function hasMatch(value) {
    return String(value || "").toLowerCase().includes(searchValue);
  });
}

function sortIssuesByPriority(issues) {
  return issues.slice().sort(function sortIssues(firstIssue, secondIssue) {
    let priorityDifference = Number(secondIssue.priorityScore || 0) - Number(firstIssue.priorityScore || 0);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return new Date(secondIssue.createdAt).getTime() - new Date(firstIssue.createdAt).getTime();
  });
}

function buildSampleIssuesResponse(query, requestedSearch) {
  let filteredIssues = sampleIssueData.filter(function filterSampleIssue(issue) {
    return doesSampleIssueMatchQuery(issue, query, requestedSearch);
  });

  return sortIssuesByPriority(filteredIssues).map(function mapSampleIssue(issue, index) {
    return serializeIssue({
      ...issue,
      id: `sample-${index + 1}`,
    });
  });
}

export async function GET(request) {
  let { searchParams } = new URL(request.url);
  let { cityKey, query, requestedDepartment, requestedSearch } = buildIssueQueryFilters(searchParams);
  let currentUser = await getCurrentUser();

  if (currentUser?.role === "admin" && currentUser.adminType !== "main" && !requestedDepartment) {
    query.category = {
      $in: getDepartmentCategories(currentUser.department),
    };
  }

  if (requestedDepartment) {
    let normalizedDepartment = normalizeAdminDepartment(requestedDepartment);

    if (currentUser?.role !== "admin") {
      return Response.json(
        {
          message: "Admin access is required for department issue feeds.",
        },
        { status: 403 }
      );
    }

    if (
      currentUser.adminType !== "main" &&
      normalizeAdminDepartment(currentUser.department) !== normalizedDepartment
    ) {
      return Response.json(
        {
          message: "You can only view issues assigned to your own department.",
        },
        { status: 403 }
      );
    }
  }

  try {
    await connectToDatabase();
    let issues = await Issue.find(query)
      .sort({
        priorityScore: -1,
        createdAt: -1,
      })
      .lean();

    let usedFallback = false;

    if (cityKey && issues.length === 0) {
      usedFallback = true;
      issues = await Issue.find({})
        .sort({
          priorityScore: -1,
          createdAt: -1,
        })
        .lean();
    }

    let serializedIssues = issues.map(function mapIssue(issue) {
      return serializeIssue(issue);
    });

    return Response.json({
      issues: serializedIssues,
      meta: {
        usedFallback,
        source: "database",
      },
    });
  } catch (error) {
    console.error("GET /api/issues ERROR:", error);

    return Response.json(
      {
        issues: buildSampleIssuesResponse(query, requestedSearch),
        meta: {
          usedFallback: true,
          source: "sample-data",
          message: error.message || "Unable to load issues.",
        },
      },
      { status: 200 }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();

    let cityMap = getCityMapConfig();

    let body = await request.json();

    console.log("Incoming body:", body);

    if (!body) {
      return Response.json(
        {
          message:
            "A valid JSON request body is required.",
        },
        {
          status: 400,
        }
      );
    }

    let title = String(body.title || "").trim();

    let description = String(
      body.description || ""
    ).trim();

    let suppliedCategory = String(
      body.category || ""
    ).trim();

    let image = String(body.image || "").trim();

    let lat = Number(body.lat);

    let lng = Number(body.lng);

    let city = buildIssueAreaLabel(body.city);

    let cityKey = normalizeCityKey(
      body.cityKey || cityMap.key
    );

    let locationAccuracy = Number(
      body.locationAccuracy || 0
    );

    // VALIDATIONS

    if (!title) {
      return Response.json(
        {
          message: "Title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!description) {
      return Response.json(
        {
          message: "Description is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!image) {
      return Response.json(
        {
          message: "Photo is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return Response.json(
        {
          message: "Invalid coordinates.",
        },
        {
          status: 400,
        }
      );
    }

    if (!cityKey) {
      return Response.json(
        {
          message: "City key missing.",
        },
        {
          status: 400,
        }
      );
    }

    // Prevent huge base64 payloads

    if (image.length > 5000000) {
      return Response.json(
        {
          message:
            "Image too large. Please upload smaller image.",
        },
        {
          status: 400,
        }
      );
    }

    // Check bounds

    if (!isWithinCityBounds(lat, lng)) {
      return Response.json(
        {
          message: `Issue location must be inside ${cityMap.name}.`,
        },
        {
          status: 400,
        }
      );
    }

    // Normalize city key

    cityKey = cityMap.key;

    // Reverse geocoding safe wrapper

    let locationDetails = null;

    try {
      locationDetails =
        await reverseGeocodeWithProvider(
          lat,
          lng
        );
    } catch (reverseError) {
      console.error(
        "Reverse geocode failed:",
        reverseError
      );
    }

    city = buildIssueAreaLabel(
      city ||
        locationDetails?.area ||
        cityMap.name
    );

    // Duplicate detection

    let existingIssues = await Issue.find({
      status: "pending",
    })
      .select("title description")
      .lean();

    let duplicateIssue = isDuplicateIssue(
      {
        title,
        description: `${description} ${normalizeText(
          city
        )}`.trim(),
      },
      existingIssues
    );

    if (duplicateIssue) {
      return Response.json(
        {
          message:
            "A similar issue already exists.",
          duplicateId: String(
            duplicateIssue._id
          ),
        },
        {
          status: 409,
        }
      );
    }

    // Category detection

    let category = suppliedCategory
      ? normalizeIssueCategory(
          suppliedCategory
        )
      : detectCategory(description);

    // CREATE ISSUE

    let issue;
    try {
      issue = await Issue.create({
        title,
        description,
        category,
        lat,
        lng,

        coordinates: {
          type: "Point",
          coordinates: [lng, lat],
        },

        city,
        cityKey,

        locationAccuracy:
          Number.isNaN(locationAccuracy)
            ? 0
            : locationAccuracy,

        image,

        votes: 0,

        status: normalizeIssueStatus(
          body.status
        ),

        source: String(
          body.source || "user-report"
        ),

        priorityScore: 0,
      });
    } catch (createError) {
      console.error(
        "Issue creation failed:",
        createError
      );

      return Response.json(
        {
          message:
            createError.message ||
            "Unable to create issue.",
        },
        {
          status: 400,
        }
      );
    }

    // Priority score

    try {
      issue.priorityScore =
        calculatePriorityScore(issue);

      await issue.save();
    } catch (saveError) {
      console.error(
        "Issue save failed:",
        saveError
      );

      return Response.json(
        {
          message:
            saveError.message ||
            "Unable to save issue.",
        },
        {
          status: 400,
        }
      );
    }

    console.log("Issue created:", issue._id);

    return Response.json(
      {
        message:
          "Issue submitted successfully.",

        issue: serializeIssue(issue),
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/issues ERROR:",
      error
    );

    return Response.json(
      {
        message:
          error.message ||
          "Unable to submit issue.",

        stack:
          process.env.NODE_ENV ===
          "development"
            ? error.stack
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}
