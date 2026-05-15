"use client";

import { ISSUE_CATEGORIES, ISSUE_STATUS_META, ISSUE_STATUSES } from "@/lib/issue-constants";

export default function FilterPanel({
  category,
  status,
  search,
  showHeatmap,
  onCategoryChange,
  onStatusChange,
  onSearchChange,
  onToggleHeatmap,
  totalCount,
  visibleCount,
}) {
  return (
    <section className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center">
      <label className="block min-w-0 flex-1">
        <span className="sr-only">Search issues</span>
        <input
          value={search}
          onChange={function handleSearchChange(event) {
            onSearchChange(event.target.value);
          }}
          placeholder="Search location..."
          className="h-12 sm:h-14 w-full rounded-[18px] sm:rounded-[22px] border border-white/70 bg-white/92 px-4 sm:px-5 text-xs sm:text-sm font-semibold text-slate-700 outline-none shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur-xl transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-500"
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-1 sm:gap-2 rounded-[18px] sm:rounded-[22px] border border-white/70 bg-white/92 px-2 sm:px-3 py-1.5 sm:py-2 shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <label className="block">
            <span className="sr-only">Filter by category</span>
            <select
              value={category}
              onChange={function handleCategoryChange(event) {
                onCategoryChange(event.target.value);
              }}
              className="max-w-[7rem] sm:max-w-[9.5rem] appearance-none bg-transparent pr-1 text-xs sm:text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="All">All</option>
              {ISSUE_CATEGORIES.map(function renderCategory(option) {
                return (
                  <option key={option} value={option}>
                    {option}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="block border-l border-slate-200 pl-1 sm:pl-2">
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={function handleStatusChange(event) {
                onStatusChange(event.target.value);
              }}
              className="max-w-[6rem] sm:max-w-[8rem] appearance-none bg-transparent pr-1 text-xs sm:text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="All">All</option>
              {ISSUE_STATUSES.map(function renderStatus(option) {
                return (
                  <option key={option} value={option}>
                    {ISSUE_STATUS_META[option].label}
                  </option>
                );
              })}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={onToggleHeatmap}
          className={`inline-flex h-12 sm:h-14 items-center justify-center rounded-[18px] sm:rounded-[22px] px-3 sm:px-5 text-xs sm:text-sm font-semibold shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur-xl transition flex-1 sm:flex-none ${
            showHeatmap
              ? "bg-blue-600 text-white"
              : "border border-white/70 bg-white/92 text-slate-700"
          }`}
        >
          <span className="hidden sm:inline">{showHeatmap ? "Heatmap On" : "Heatmap Off"}</span>
          <span className="sm:hidden">{showHeatmap ? "Heat On" : "Heat Off"}</span>
        </button>

        <div className="hidden rounded-[18px] sm:rounded-[22px] border border-white/70 bg-white/92 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-slate-600 shadow-[0_18px_45px_rgba(15,23,42,0.10)] sm:block lg:block">
          {visibleCount} of {totalCount}
        </div>
      </div>
    </section>
  );
}
