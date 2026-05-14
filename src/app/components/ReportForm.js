"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AppShell from "./AppShell";
import IssueLocationPicker from "./IssueLocationPicker";
import ToastStack from "./ToastStack";
import { ISSUE_CATEGORIES } from "@/lib/issue-constants";
import { getCityMapConfig } from "@/lib/city-map";
import { resolveBrowserLocation, watchBrowserLocation } from "@/lib/browser-location";
import { getResponseErrorMessage, readJsonResponse } from "@/lib/http";

let CUSTOM_CATEGORY_OPTION = "__custom__";

function readFileAsDataUrl(file) {
  return new Promise(function resolveFile(resolve, reject) {
    let reader = new FileReader();

    reader.onload = function handleLoad(event) {
      resolve(String(event.target?.result || ""));
    };

    reader.onerror = function handleError() {
      reject(new Error("Unable to read image file."));
    };

    reader.readAsDataURL(file);
  });
}

export default function ReportForm() {
  let cityMap = getCityMapConfig();
  let router = useRouter();
  let [form, setForm] = useState({
    title: "",
    description: "",
    category: ISSUE_CATEGORIES[0] || "Garbage",
    customCategory: "",
    image: "",
    lat: "",
    lng: "",
    city: "",
    cityKey: "",
    locationAccuracy: 0,
  });
  let [error, setError] = useState("");
  let [success, setSuccess] = useState("");
  let [isSubmitting, setIsSubmitting] = useState(false);
  let [isLocating, setIsLocating] = useState(false);
  let [locationMode, setLocationMode] = useState("gps");
  let [toasts, setToasts] = useState([]);
  let toastCounterRef = useRef(0);
  let locationModeRef = useRef("gps");
  let hasReliableGps = Number(form.locationAccuracy || 0) > 0 && Number(form.locationAccuracy || 0) <= 3000;

  function dismissToast(toastId) {
    setToasts(function removeToast(currentToasts) {
      return currentToasts.filter(function filterToast(toast) {
        return toast.id !== toastId;
      });
    });
  }

  function pushToast(title, message) {
    toastCounterRef.current += 1;
    let toastId = `toast-${toastCounterRef.current}`;

    setToasts(function addToast(currentToasts) {
      return currentToasts.concat([
        {
          id: toastId,
          title,
          message,
        },
      ]);
    });

    window.setTimeout(function removeToast() {
      dismissToast(toastId);
    }, 2600);
  }

  async function captureLocation() {
    try {
      setIsLocating(true);
      setError("");

      let location = await resolveBrowserLocation();

      setForm(function updateForm(currentForm) {
        return {
          ...currentForm,
          lat: String(location.lat),
          lng: String(location.lng),
          city: location.area || location.city,
          cityKey: location.cityKey,
          locationAccuracy: location.accuracy,
        };
      });
      locationModeRef.current = "gps";
      setLocationMode("gps");
    } catch (locationError) {
      setError(locationError.message);
    } finally {
      setIsLocating(false);
    }
  }

  useEffect(function hydrateLocation() {
    let timeoutId = window.setTimeout(function scheduleLocation() {
      captureLocation();
    }, 0);
    let stopWatching = watchBrowserLocation(
      function applyWatchLocation(location) {
        setForm(function updateFromWatcher(currentForm) {
          let currentAccuracy = Number(currentForm.locationAccuracy || 0);
          let nextAccuracy = Number(location.accuracy || 0);
          let shouldReplace =
            locationModeRef.current !== "manual" &&
            (!currentForm.lat || !currentAccuracy || (nextAccuracy > 0 && nextAccuracy < currentAccuracy));

          if (!shouldReplace) {
            return currentForm;
          }

          return {
            ...currentForm,
            lat: String(location.lat),
            lng: String(location.lng),
            city: location.area || location.city,
            cityKey: location.cityKey,
            locationAccuracy: nextAccuracy,
          };
        });
      },
      function ignoreWatchError() {
        return null;
      }
    );

    return function cleanupLocation() {
      window.clearTimeout(timeoutId);
      stopWatching();
    };
  }, []);

  function updateField(event) {
    let field = event.target.name;
    let value = event.target.value;

    setForm(function applyField(currentForm) {
      return {
        ...currentForm,
        [field]: value,
      };
    });
  }

  function handleManualLocationSelect(location) {
    setError("");
    locationModeRef.current = "manual";
    setLocationMode("manual");
    setForm(function applyManualLocation(currentForm) {
      return {
        ...currentForm,
        lat: String(location.lat),
        lng: String(location.lng),
        city: location.city,
        cityKey: location.cityKey,
        locationAccuracy: location.locationAccuracy,
      };
    });
  }

  async function handleImageChange(event) {
    let file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      let image = await readFileAsDataUrl(file);
      setForm(function applyImage(currentForm) {
        return {
          ...currentForm,
          image,
        };
      });
    } catch (imageError) {
      setError(imageError.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");
      setSuccess("");

      let category =
        form.category === CUSTOM_CATEGORY_OPTION
          ? String(form.customCategory || "").trim()
          : String(form.category || "").trim();

      if (!category) {
        throw new Error("Please choose a category or enter a custom type.");
      }

      if (!form.image) {
        throw new Error("Please upload a photo before submitting.");
      }

      let response = await fetch("/api/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category,
          image: form.image,
          lat: Number(form.lat),
          lng: Number(form.lng),
          city: form.city,
          cityKey: form.cityKey,
          locationAccuracy: form.locationAccuracy,
        }),
      });
      let payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(getResponseErrorMessage(response, payload, "Unable to submit issue."));
      }

      setSuccess(payload.message || "Issue submitted successfully.");
      pushToast("Success", "Issue reported successfully.");
      setForm({
        title: "",
        description: "",
        category: form.category,
        customCategory: form.customCategory,
        image: "",
        lat: form.lat,
        lng: form.lng,
        city: form.city,
        cityKey: form.cityKey,
        locationAccuracy: form.locationAccuracy,
      });

      window.setTimeout(function redirectToHome() {
        router.push("/");
      }, 1200);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_45%,#f8fafc_100%)]">
        <div className="border-b border-slate-200/70 bg-white/90 px-4 py-5 shadow-sm backdrop-blur sm:px-8 sm:py-6">
          <div className="mx-auto flex max-w-6xl items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Back
            </Link>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Citizen Reporting
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Report an Issue
              </h1>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 sm:px-8">
          <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-2">
            <section className="space-y-6">
              <div className="rounded-3xl border border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] transition hover:shadow-[0_28px_70px_rgba(15,23,42,0.10)]">
                <label className="mb-4 block text-base font-bold text-slate-900">
                  Photo Evidence
                </label>
                <label className="flex h-80 cursor-pointer flex-col items-center justify-center gap-4 rounded-[28px] border-2 border-dashed border-blue-300 bg-[linear-gradient(180deg,#f7fbff_0%,#eef4ff_100%)] px-6 text-center transition hover:border-blue-400 hover:bg-slate-100">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600 shadow-[0_18px_40px_rgba(37,99,235,0.18)]">
                    Upload
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">
                      Click to upload or drag and drop
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-400">
                      Required. JPG, PNG up to 10MB
                    </p>
                  </div>
                  <span className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white">
                    Choose File
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required
                    className="hidden"
                  />
                </label>
              </div>

              {form.image ? (
                <div className="rounded-3xl border border-white/70 bg-white/92 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] transition hover:shadow-[0_28px_70px_rgba(15,23,42,0.10)]">
                  <Image
                    src={form.image}
                    alt="Issue preview"
                    width={1200}
                    height={520}
                    unoptimized
                    className="h-56 w-full rounded-2xl object-cover"
                  />
                </div>
              ) : null}
            </section>

            <section className="space-y-6">
              <form
                onSubmit={handleSubmit}
                className="rounded-3xl border border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
              >
                <div className="space-y-5">
                  <div>
                    <label className="mb-3 block text-base font-bold text-slate-900">
                      Issue Title
                    </label>
                    <input
                      name="title"
                      value={form.title}
                      onChange={updateField}
                      placeholder="e.g. Broken street light on 5th Ave"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-3 block text-base font-bold text-slate-900">
                      Category
                    </label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={updateField}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                      required
                    >
                      {ISSUE_CATEGORIES.map(function renderCategory(category) {
                        return (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        );
                      })}
                      <option value={CUSTOM_CATEGORY_OPTION}>Custom type</option>
                    </select>
                  </div>
                  {form.category === CUSTOM_CATEGORY_OPTION ? (
                    <div>
                      <label className="mb-3 block text-base font-bold text-slate-900">
                        Custom category
                      </label>
                      <input
                        name="customCategory"
                        value={form.customCategory}
                        onChange={updateField}
                        placeholder="Enter a custom issue type"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                        required
                      />
                    </div>
                  ) : null}

                  <div>
                    <label className="mb-3 block text-base font-bold text-slate-900">
                      Location
                    </label>
                    <div className="rounded-[26px] border border-blue-100 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-5 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <p className="font-semibold text-slate-800">
                            {form.city
                              ? `${form.city} - ${form.lat}, ${form.lng}`
                              : `Waiting for a location inside ${cityMap.name}`}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${
                                hasReliableGps
                                  ? "bg-emerald-50 text-emerald-600"
                                  : form.locationAccuracy
                                    ? "bg-amber-50 text-amber-600"
                                    : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {hasReliableGps
                                ? "Reliable GPS"
                                : form.locationAccuracy
                                  ? "Low Confidence"
                                  : "No GPS Lock"}
                            </span>
                            {form.locationAccuracy ? (
                              <span className="text-sm font-medium text-slate-500">
                                Accuracy about {form.locationAccuracy} meters
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-slate-500">
                                Use Detect Again or place the pin manually
                              </span>
                            )}
                          </div>
                          {!hasReliableGps && form.locationAccuracy ? (
                            <p className="text-sm font-medium text-amber-700">
                              This GPS fix is weak. Please drag the marker or click the map for a better report location.
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={function detectAgain() {
                            locationModeRef.current = "gps";
                            setLocationMode("gps");
                            captureLocation();
                          }}
                          disabled={isLocating}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-blue-600 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isLocating ? "Detecting..." : "Detect Again"}
                        </button>
                      </div>
                    </div>
                    <IssueLocationPicker
                      value={form}
                      onSelect={handleManualLocationSelect}
                      onError={setError}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label>
                      <span className="mb-3 block text-base font-bold text-slate-900">
                        Latitude
                      </span>
                      <input
                        name="lat"
                        value={form.lat}
                        onChange={updateField}
                        readOnly
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                        required
                      />
                    </label>

                    <label>
                      <span className="mb-3 block text-base font-bold text-slate-900">
                        Longitude
                      </span>
                      <input
                        name="lng"
                        value={form.lng}
                        onChange={updateField}
                        readOnly
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                        required
                      />
                    </label>
                  </div>

                  <div>
                    <label className="mb-3 block text-base font-bold text-slate-900">
                      Detailed Description
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={updateField}
                      rows={6}
                      placeholder="Provide more details about the issue to help authorities respond faster..."
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                      required
                    />
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {error}
                    </div>
                  ) : null}

                  {success ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {success}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSubmitting || isLocating || !form.cityKey || !form.image}
                    className="w-full rounded-2xl bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Submitting Report..." : "Submit Report"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
