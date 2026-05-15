import {
  createJsonErrorResponse,
  readRequestJson,
} from "@/lib/http";
import {
  getCurrentUser,
  hashPassword,
  ensureMainAdminExists,
} from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import {
  ADMIN_DEPARTMENTS,
  getDepartmentLabel,
  normalizeAdminDepartment,
} from "@/lib/issue-constants";
import AdminUser from "@/models/AdminUser";

function serializeAdmin(admin) {
  return {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
    roleType: admin.roleType,
    department: admin.department || "",
    departmentLabel:
      admin.roleType === "main"
        ? "All departments"
        : getDepartmentLabel(admin.department),
    createdBy: admin.createdBy || "",
    createdAt: admin.createdAt,
  };
}

function isMainAdmin(currentUser) {
  return currentUser?.role === "admin" && currentUser?.adminType === "main";
}

export async function GET() {
  try {
    await ensureMainAdminExists();
    let currentUser = await getCurrentUser();

    if (!isMainAdmin(currentUser)) {
      return Response.json(
        {
          message: "Only the main admin can view admin accounts.",
        },
        { status: 403 }
      );
    }

    await connectToDatabase();

    let admins = await AdminUser.find({})
      .select("name email department roleType createdBy createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({
      admins: admins.map(serializeAdmin),
    });
  } catch (error) {
    return createJsonErrorResponse(error, "Unable to load admins.");
  }
}

export async function POST(request) {
  try {
    await ensureMainAdminExists();
    let currentUser = await getCurrentUser();

    if (!isMainAdmin(currentUser)) {
      return Response.json(
        {
          message: "Only the main admin can create new admins.",
        },
        { status: 403 }
      );
    }

    await connectToDatabase();

    let body = await readRequestJson(request);
    let name = String(body?.name || "").trim();
    let email = String(body?.email || "").trim().toLowerCase();
    let password = String(body?.password || "");
    let department = normalizeAdminDepartment(body?.department);

    if (!name || !email || !password || !department) {
      return Response.json(
        {
          message: "Name, email, password, and department are required.",
        },
        { status: 400 }
      );
    }

    if (!email.includes("@")) {
      return Response.json(
        {
          message: "Please enter a valid admin email address.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        {
          message: "Admin password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    if (!ADMIN_DEPARTMENTS.includes(department)) {
      return Response.json(
        {
          message: "Please choose a valid department.",
        },
        { status: 400 }
      );
    }

    let existingAdmin = await AdminUser.findOne({ email }).select("_id").lean();

    if (existingAdmin) {
      return Response.json(
        {
          message: "An admin with this email already exists.",
        },
        { status: 409 }
      );
    }

    let admin = await AdminUser.create({
      name,
      email,
      passwordHash: hashPassword(password),
      roleType: "department",
      department,
      createdBy: currentUser.email,
    });

    return Response.json(
      {
        message: "Admin account created successfully.",
        admin: serializeAdmin(admin),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json(
        {
          message: "An admin with this email already exists.",
        },
        { status: 409 }
      );
    }

    return createJsonErrorResponse(error, "Unable to create admin.");
  }
}
