import { clearAuthSession } from "@/lib/auth";
import { createJsonErrorResponse } from "@/lib/http";

export async function POST() {
  try {
    await clearAuthSession();

    return Response.json({
      message: "Signed out successfully.",
    });
  } catch (error) {
    return createJsonErrorResponse(error, "Unable to sign out.");
  }
}
