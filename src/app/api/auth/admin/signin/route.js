import { authenticateAdmin, createAdminAuthSession } from "@/lib/auth";
import { createJsonErrorResponse, readRequestJson } from "@/lib/http";

export async function POST(request) {
  try {
    let body = await readRequestJson(request);
    let email = String(body?.email || "").trim().toLowerCase();
    let password = String(body?.password || "");

    if (!email || !password) {
      return Response.json(
        {
          message: "Admin email and password are required.",
        },
        { status: 400 }
      );
    }

    let admin = await authenticateAdmin(email, password);

    if (!admin) {
      return Response.json(
        {
          message: "Invalid admin email or password.",
        },
        { status: 401 }
      );
    }

    let safeAdmin = await createAdminAuthSession(admin);

    return Response.json({
      message: "Admin signed in successfully.",
      user: safeAdmin,
    });
  } catch (error) {
    return createJsonErrorResponse(error, "Unable to sign in as admin.");
  }
}
