"use client";

import { useState } from "react";
import { ISSUE_CATEGORIES } from "@/lib/issue-constants";

let emptyForm = {
  title: "",
  description: "",
  category: "Garbage",
  image: "",
};

export default function AddIssueModal({
  isOpen,
  selectedPoint,
  isSubmitting,
  onClose,
  onSubmit,
}) {
  let [form, setForm] = useState(emptyForm);

  if (!isOpen || !selectedPoint) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-end justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-xl rounded-[32px] border border-white/40 bg-white/90 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              New Civic Report
            </p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Add issue at selected location
            </h3>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-300">
              {selectedPoint.lat.toFixed(5)}, {selectedPoint.lng.toFixed(5)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-200"
          >
            Close
          </button>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={function handleSubmit(event) {
            event.preventDefault();
            onSubmit(form);
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Title
              </span>
              <input
                value={form.title}
                onChange={function updateTitle(event) {
                  setForm(function updateCurrentForm(currentForm) {
                    return {
                      ...currentForm,
                      title: event.target.value,
                    };
                  });
                }}
                required
                placeholder="Describe the issue in a few words"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Category
              </span>
              <select
                value={form.category}
                onChange={function updateCategory(event) {
                  setForm(function updateCurrentForm(currentForm) {
                    return {
                      ...currentForm,
                      category: event.target.value,
                    };
                  });
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
              >
                {ISSUE_CATEGORIES.map(function renderCategory(category) {
                  return (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Image URL
              </span>
              <input
                value={form.image}
                onChange={function updateImage(event) {
                  setForm(function updateCurrentForm(currentForm) {
                    return {
                      ...currentForm,
                      image: event.target.value,
                    };
                  });
                }}
                placeholder="Required public image URL"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={function updateDescription(event) {
                setForm(function updateCurrentForm(currentForm) {
                  return {
                    ...currentForm,
                    description: event.target.value,
                  };
                });
              }}
              required
              rows={5}
              placeholder="Provide enough detail for the city team to understand the issue."
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
