import mongoose from "mongoose";

let userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    votedIssueIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("validate", function normalizeUserFields() {
  this.name = String(this.name || "").trim();
  this.email = String(this.email || "").trim().toLowerCase();
  this.votedIssueIds = Array.from(
    new Set(
      (this.votedIssueIds || []).map(function mapVoteId(issueId) {
        return String(issueId || "").trim();
      }).filter(Boolean)
    )
  );
});

let User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
