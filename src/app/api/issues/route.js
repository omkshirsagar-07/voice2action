import connectToDatabase from "@/lib/mongodb";
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
  ISSUE_CATEGORIES,
  ISSUE_STATUSES,
  normalizeIssueCategory,
  normalizeIssueStatus,
} from "@/lib/issue-constants";

import { normalizeCityKey } from "@/lib/location-utils";
import { reverseGeocodeWithProvider } from "@/lib/reverse-geocode";

import Issue from "@/models/Issue";

export async function GET(request) {
  try {
    await connectToDatabase();

    let { searchParams } = new URL(request.url);

    let requestedCity =
      searchParams.get("city") ||
      searchParams.get("cityKey");

    let requestedCategory =
      searchParams.get("category");

    let requestedStatus =
      searchParams.get("status");

    let requestedSearch = String(
      searchParams.get("search") || ""
    ).trim();

    let cityKey = normalizeCityKey(requestedCity);

    let query = cityKey ? { cityKey } : {};

    if (
      requestedCategory &&
      ISSUE_CATEGORIES.includes(requestedCategory)
    ) {
      query.category = requestedCategory;
    }

    if (
      requestedStatus &&
      ISSUE_STATUSES.includes(requestedStatus)
    ) {
      query.status = requestedStatus;
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

    let issues = await Issue.find(query)
      .sort({
        priorityScore: -1,
        createdAt: -1,
      })
      .lean();

    let serializedIssues = issues.map(function mapIssue(issue) {
      return serializeIssue(issue);
    });

    return Response.json({
      issues: serializedIssues,
    });
  } catch (error) {
    console.error("GET /api/issues ERROR:", error);

    return Response.json(
      {
        message:
          error.message || "Unable to load issues.",
      },
      {
        status: 500,
      }
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

    let image = String(body.image || "");

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