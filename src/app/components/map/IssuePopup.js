"use client";

import Image from "next/image";
import { ISSUE_STATUS_META } from "@/lib/issue-constants";

function formatIssueTime(createdAt) {
  if (!createdAt) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

export default function IssuePopup({ issue }) {
  let statusMeta = ISSUE_STATUS_META[issue.status] || ISSUE_STATUS_META.pending;

  return (
    <div className="w-[250px] space-y-3 text-slate-900 dark:text-white">
      {issue.image ? (
        <div className="overflow-hidden rounded-2xl border border-white/40">
          <Image
            src={issue.image}
            alt={issue.title}
            width={500}
            height={260}
            className="h-32 w-full object-cover"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold leading-tight">{issue.title}</p>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-300">
              {issue.city || "Chhatrapati Sambhajinagar"}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
              statusMeta.tone === "emerald"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {statusMeta.label}
          </span>
        </div>

        <p className="text-sm leading-6 text-slate-600 dark:text-slate-200">{issue.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-600 dark:text-slate-200">
        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-400">
            Category
          </p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{issue.category}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-400">
            Votes
          </p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{issue.votes}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-800/70 dark:text-slate-200">
        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-400">
          Reported
        </p>
        <p className="mt-1">{formatIssueTime(issue.createdAt)}</p>
      </div>
    </div>
  );
}
