import crypto from "node:crypto";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export const AUTH_COOKIE_NAME = "voice2action-session";
let AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function getAuthSecret() {
  return process.env.AUTH_SECRET || "voice2action-dev-secret-change-me";
}

function encodeValue(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeValue(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value) {
  return crypto.createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function createSessionValue(payload) {
  let body = encodeValue(JSON.stringify(payload));
  let signature = signValue(body);
  return `${body}.${signature}`;
}

function readSessionValue(value) {
  if (!value || !value.includes(".")) {
    return null;
  }

  let [body, signature] = value.split(".");
  let expectedSignature = signValue(body);

  if (!signature || signature.length !== expectedSignature.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    return JSON.parse(decodeValue(body));
  } catch (_parseError) {
    return null;
  }
}

export function hashPassword(password) {
  let salt = crypto.randomBytes(16).toString("hex");
  let hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, passwordHash) {
  if (!passwordHash || !passwordHash.includes(":")) {
    return false;
  }

  let [salt, storedHash] = passwordHash.split(":");
  let candidateHash = crypto.scryptSync(password, salt, 64).toString("hex");

  if (candidateHash.length !== storedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(storedHash));
}

export function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    votedIssueIds: Array.isArray(user.votedIssueIds)
      ? user.votedIssueIds.map(function mapVoteId(issueId) {
          return String(issueId);
        })
      : [],
  };
}

export function validatePasswordRules(password) {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return "";
}

export async function createAuthSession(user) {
  let cookieStore = await cookies();
  let safeUser = sanitizeUser(user);

  cookieStore.set(AUTH_COOKIE_NAME, createSessionValue({ userId: safeUser.id }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
  });

  return safeUser;
}

export async function clearAuthSession() {
  let cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getCurrentUser() {
  let cookieStore = await cookies();
  let sessionCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  let session = readSessionValue(sessionCookie);

  if (!session?.userId) {
    return null;
  }

  await connectToDatabase();

  let user = await User.findById(session.userId)
    .select("name email votedIssueIds")
    .lean();

  return sanitizeUser(user);
}
