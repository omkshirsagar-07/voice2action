"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getResponseErrorMessage, readJsonResponse } from "@/lib/http";

let formConfig = {
  signup: {
    title: "Create your account",
    description: "Save your name, email, and password to start voting on local issues.",
    endpoint: "/api/auth/signup",
    submitLabel: "Create account",
    successRedirect: "/",
  },
  signin: {
    title: "Sign in",
    description: "Use your account to vote once per issue and track your participation.",
    endpoint: "/api/auth/signin",
    submitLabel: "Sign in",
    successRedirect: "/",
  },
  forgot: {
    title: "Reset your password",
    description: "Enter your email and set a new password for your account.",
    endpoint: "/api/auth/forgot-password",
    submitLabel: "Update password",
    successRedirect: "/sign-in",
  },
};

function AuthFooter({ mode }) {
  if (mode === "signup") {
    return (
      <p className="text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-blue-600 hover:text-blue-700">
          Sign in
        </Link>
      </p>
    );
  }

  if (mode === "signin") {
    return (
      <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/forgot-password" className="font-semibold text-blue-600 hover:text-blue-700">
          Forgot password?
        </Link>
        <p>
          No account yet?{" "}
          <Link href="/sign-up" className="font-semibold text-blue-600 hover:text-blue-700">
            Sign up
          </Link>
        </p>
      </div>
    );
  }

  return (
    <p className="text-sm text-slate-500">
      Remembered it?{" "}
      <Link href="/sign-in" className="font-semibold text-blue-600 hover:text-blue-700">
        Back to sign in
      </Link>
    </p>
  );
}

export default function AuthForm({ mode }) {
  let config = formConfig[mode];
  let router = useRouter();
  let [isSubmitting, setIsSubmitting] = useState(false);
  let [error, setError] = useState("");
  let [success, setSuccess] = useState("");
  let [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      let payloadBody =
        mode === "signin"
          ? {
              email: form.email,
              password: form.password,
            }
          : mode === "forgot"
            ? {
                email: form.email,
                password: form.password,
                confirmPassword: form.confirmPassword,
              }
          : {
              name: form.name,
              email: form.email,
              password: form.password,
              confirmPassword: form.confirmPassword,
            };

      let response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadBody),
      });
      let payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(getResponseErrorMessage(response, payload, "Unable to continue."));
      }

      if (mode === "forgot") {
        setSuccess(payload.message || "Password updated successfully.");
        setTimeout(function redirectAfterReset() {
          router.push(config.successRedirect);
        }, 900);
      } else {
        router.push(config.successRedirect);
        router.refresh();
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">
          Voice2Action
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{config.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{config.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {mode === "signup" ? (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Name</span>
            <input
              type="text"
              value={form.name}
              onChange={function updateName(event) {
                setForm(function updateCurrentForm(currentForm) {
                  return {
                    ...currentForm,
                    name: event.target.value,
                  };
                });
              }}
              placeholder="Your full name"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={function updateEmail(event) {
              setForm(function updateCurrentForm(currentForm) {
                return {
                  ...currentForm,
                  email: event.target.value,
                };
              });
            }}
            placeholder="name@example.com"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            {mode === "forgot" ? "New password" : "Password"}
          </span>
          <input
            type="password"
            value={form.password}
            onChange={function updatePassword(event) {
              setForm(function updateCurrentForm(currentForm) {
                return {
                  ...currentForm,
                  password: event.target.value,
                };
              });
            }}
            placeholder="Minimum 8 characters"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          />
        </label>

        {mode !== "signin" ? (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Confirm password</span>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={function updateConfirmPassword(event) {
                setForm(function updateCurrentForm(currentForm) {
                  return {
                    ...currentForm,
                    confirmPassword: event.target.value,
                  };
                });
              }}
              placeholder="Retype password"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            />
          </label>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
            isSubmitting ? "cursor-not-allowed bg-slate-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isSubmitting ? "Please wait..." : config.submitLabel}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <AuthFooter mode={mode} />
      </div>
    </section>
  );
}
