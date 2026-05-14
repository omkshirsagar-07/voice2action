import { createJsonErrorResponse, readRequestJson } from "@/lib/http";
import connectToDatabase from "@/lib/mongodb";
import { createAuthSession, verifyPassword } from "@/lib/auth";
import User from "@/models/User";

export async function POST(request) {
  try {
    await connectToDatabase();

    let body = await readRequestJson(request);
    let email = String(body?.email || "").trim().toLowerCase();
    let password = String(body?.password || "");

    if (!email || !password) {
      return Response.json(
        {
          message: "Email and password are required.",
        },
        { status: 400 }
      );
    }

    let user = await User.findOne({ email });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return Response.json(
        {
          message: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    let safeUser = await createAuthSession(user);

    return Response.json({
      message: "Signed in successfully.",
      user: safeUser,
    });
  } catch (error) {
    return createJsonErrorResponse(error, "Unable to sign in.");
  }
}
