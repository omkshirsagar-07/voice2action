import mongoose from "mongoose";
import { normalizeAdminDepartment } from "@/lib/issue-constants";

let adminUserSchema = new mongoose.Schema(
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
    department: {
      type: String,
      default: "",
      trim: true,
    },
    roleType: {
      type: String,
      enum: ["main", "department"],
      default: "department",
    },
    createdBy: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

adminUserSchema.pre("validate", function normalizeAdminUserFields() {
  this.name = String(this.name || "").trim();
  this.email = String(this.email || "").trim().toLowerCase();
  this.createdBy = String(this.createdBy || "").trim().toLowerCase();

  if (this.roleType === "department") {
    this.department = normalizeAdminDepartment(this.department);
  } else {
    this.department = "";
  }
});

let AdminUser = mongoose.models.AdminUser || mongoose.model("AdminUser", adminUserSchema);

export default AdminUser;
