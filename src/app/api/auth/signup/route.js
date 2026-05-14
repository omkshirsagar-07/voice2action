import { createJsonErrorResponse, readRequestJson } from "@/lib/http";
import connectToDatabase from "@/lib/mongodb";
import {
  createAuthSession,
  hashPassword,
  validatePasswordRules,
} from "@/lib/auth";
import User from "@/models/User";

export async function POST(request) {
  try {
    await connectToDatabase();

    let body = await readRequestJson(request);
    let name = String(body?.name || "").trim();
    let email = String(body?.email || "").trim().toLowerCase();
    let password = String(body?.password || "");
    let confirmPassword = String(body?.confirmPassword || "");

    if (!name || !email || !password || !confirmPassword) {
      return Response.json(
        {
          message: "Name, email, password, and confirm password are required.",
        },
        { status: 400 }
      );
    }

    if (!email.includes("@")) {
      return Response.json(
        {
          message: "Please enter a valid email address.",
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

    let existingUser = await User.findOne({ email }).select("_id").lean();

    if (existingUser) {
      return Response.json(
        {
          message: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    let user = await User.create({
      name,
      email,
      passwordHash: hashPassword(password),
    });

    let safeUser = await createAuthSession(user);

    return Response.json(
      {
        message: "Account created successfully.",
        user: safeUser,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json(
        {
          message: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    return createJsonErrorResponse(error, "Unable to create account.");
  }
}
