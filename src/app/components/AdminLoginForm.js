"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getResponseErrorMessage, readJsonResponse } from "@/lib/http";

export default function AdminLoginForm() {
  let router = useRouter();
  let [isSubmitting, setIsSubmitting] = useState(false);
  let [error, setError] = useState("");
  let [form, setForm] = useState({
    email: "",
    password: "",
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      let response = await fetch("/api/auth/admin/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      let payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(getResponseErrorMessage(response, payload, "Unable to sign in as admin."));
      }

      router.push("/admin");
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-lg rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">
          Department Access
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Admin Login</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Sign in with your admin email and password to open the protected admin dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Admin email</span>
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
            placeholder="omrk@gmail.com"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
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
            placeholder="Enter your department password"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
            isSubmitting ? "cursor-not-allowed bg-slate-400" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {isSubmitting ? "Checking access..." : "Sign in to dashboard"}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 text-sm text-slate-500">
        <Link href="/" className="font-semibold text-blue-600 hover:text-blue-700">
          Back to home
        </Link>
        <Link href="/sign-in" className="font-semibold text-slate-700 hover:text-slate-900">
          Citizen sign in
        </Link>
      </div>
    </section>
  );
}
