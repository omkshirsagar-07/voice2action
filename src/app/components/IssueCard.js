"use client";

import Image from "next/image";

function formatTime(value) {
  let createdAt = new Date(value).getTime();
  let hours = Math.max(1, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60)));

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function getStatusClasses(status) {
  if (status === "resolved") {
    return "bg-green-100 text-green-700";
  }

  if (status === "urgent") {
    return "bg-red-100 text-red-700";
  }

  return "bg-orange-100 text-orange-700";
}

function buildVoteDots(issueId) {
  let palette = ["bg-slate-300", "bg-blue-300", "bg-amber-300"];

  return [0, 1, 2].map(function mapDot(index) {
    return {
      id: `${issueId}-${index}`,
      color: palette[index % palette.length],
    };
  });
}

export default function IssueCard({
  issue,
  onVote,
  actionLabel = "Vote",
  muted = false,
  isVoteDisabled = false,
}) {
  let voteDots = buildVoteDots(issue.id);
  let hasValidCoordinates =
    Number.isFinite(Number(issue.lat)) &&
    Number.isFinite(Number(issue.lng)) &&
    Math.abs(Number(issue.lat)) > 0.001 &&
    Math.abs(Number(issue.lng)) > 0.001;
  let locationLabel = issue.city || "Chhatrapati Sambhajinagar";

  return (
    <article
      className={`rounded-[22px] border p-4 shadow-sm transition sm:p-5 ${
        muted
          ? "border-slate-100 bg-slate-50"
          : "border-slate-100 bg-white hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className="flex gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-28">
          {issue.image ? (
            <Image
              src={issue.image}
              alt={issue.title}
              width={1200}
              height={720}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-100 text-xs font-semibold text-slate-400">
              Image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-tight text-slate-900 sm:text-lg">
            {issue.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
            <span>{locationLabel}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{issue.category}</span>
            {hasValidCoordinates ? (
              <>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>
                  {Number(issue.lat).toFixed(3)}, {Number(issue.lng).toFixed(3)}
                </span>
              </>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{issue.description}</p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span
              className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getStatusClasses(
                issue.status
              )}`}
            >
              {issue.status}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {formatTime(issue.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {voteDots.map(function renderDot(dot) {
              return (
                <span
                  key={dot.id}
                  className={`inline-flex h-8 w-8 rounded-full border-2 border-white ${dot.color}`}
                />
              );
            })}
          </div>
          <span className="text-sm font-medium text-slate-500">+{issue.votes} votes</span>
        </div>

        {onVote ? (
          <button
            type="button"
            onClick={function handleVote() {
              onVote(issue.id);
            }}
            disabled={isVoteDisabled}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              isVoteDisabled
                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            {actionLabel}
          </button>
        ) : (
          <span className="text-sm font-semibold text-blue-600">Priority {issue.priorityScore}</span>
        )}
      </div>
    </article>
  );
}
