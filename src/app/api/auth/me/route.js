import { getCurrentUser } from "@/lib/auth";
import { createJsonErrorResponse } from "@/lib/http";

export async function GET() {
  try {
    let user = await getCurrentUser();

    return Response.json({
      user,
    });
  } catch (error) {
    return createJsonErrorResponse(error, "Unable to load current user.");
  }
}
