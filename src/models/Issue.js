import {
  DEFAULT_ISSUE_CATEGORY,
  DEFAULT_ISSUE_STATUS,
  ISSUE_CATEGORIES,
  ISSUE_STATUSES,
} from "@/lib/issue-constants";
import mongoose from "mongoose";

let issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      default: DEFAULT_ISSUE_CATEGORY,
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function validateCoordinates(value) {
            return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
          },
          message: "Coordinates must contain longitude and latitude values.",
        },
      },
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    cityKey: {
      type: String,
      required: true,
      index: true,
    },
    locationAccuracy: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      default: "user-report",
    },
    votes: {
      type: Number,
      default: 0,
    },
    priorityScore: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ISSUE_STATUSES,
      default: DEFAULT_ISSUE_STATUS,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

issueSchema.index({ coordinates: "2dsphere" });

issueSchema.pre("validate", function syncCoordinateFields() {
  let hasGeoJson =
    this.coordinates &&
    Array.isArray(this.coordinates.coordinates) &&
    this.coordinates.coordinates.length === 2;

  if (hasGeoJson) {
    this.lng = Number(this.coordinates.coordinates[0]);
    this.lat = Number(this.coordinates.coordinates[1]);
  } else {
    this.coordinates = {
      type: "Point",
      coordinates: [Number(this.lng), Number(this.lat)],
    };
  }
});

let Issue = mongoose.models.Issue || mongoose.model("Issue", issueSchema);

export default Issue;
