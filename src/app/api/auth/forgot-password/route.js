import { createJsonErrorResponse, readRequestJson } from "@/lib/http";
import connectToDatabase from "@/lib/mongodb";
import { hashPassword, validatePasswordRules } from "@/lib/auth";
import User from "@/models/User";

export async function POST(request) {
  try {
    await connectToDatabase();

    let body = await readRequestJson(request);
    let email = String(body?.email || "").trim().toLowerCase();
    let password = String(body?.password || "");
    let confirmPassword = String(body?.confirmPassword || "");

    if (!email || !password || !confirmPassword) {
      return Response.json(
        {
          message: "Email, new password, and confirm password are required.",
        },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return Response.json(
        {
          message: "Password and confirm password must match.",
        },
        { status: 400 }
      );
    }

    let passwordError = validatePasswordRules(password);

    if (passwordError) {
      return Response.json(
        {
          message: passwordError,
        },
        { status: 400 }
      );
    }

    let user = await User.findOne({ email });

    if (!user) {
      return Response.json(
        {
          message: "No account found with this email.",
        },
        { status: 404 }
      );
    }

    user.passwordHash = hashPassword(password);
    await user.save();

    return Response.json({
      message: "Password updated successfully.",
    });
  } catch (error) {
    return createJsonErrorResponse(error, "Unable to reset password.");
  }
}
