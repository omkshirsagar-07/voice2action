"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AppShell from "./AppShell";
import { AdminRowSkeleton } from "./LoadingSkeleton";
import ToastStack from "./ToastStack";
import { buildAdminSummary } from "@/lib/issue-utils";
import { getResponseErrorMessage, readJsonResponse } from "@/lib/http";

export default function AdminClient() {
  let [issues, setIssues] = useState([]);
  let [isLoading, setIsLoading] = useState(true);
  let [error, setError] = useState("");
  let [activeStatus, setActiveStatus] = useState("All");
  let [toasts, setToasts] = useState([]);
  let toastCounterRef = useRef(0);

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

  async function requestIssues() {
    let response = await fetch("/api/issues", {
      cache: "no-store",
    });
    let payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(getResponseErrorMessage(response, payload, "Unable to load admin data."));
    }

    return (payload.issues || []).sort(function sortIssues(firstIssue, secondIssue) {
      return secondIssue.priorityScore - firstIssue.priorityScore;
    });
  }

  async function loadIssues(shouldToast = false) {
    try {
      setIsLoading(true);
      setError("");

      let sortedIssues = await requestIssues();
      setIssues(sortedIssues);

      if (shouldToast) {
        pushToast("Refreshed", "Admin dashboard updated.");
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(function fetchAdminIssues() {
    let isActive = true;

    async function hydrateAdminIssues() {
      try {
        let sortedIssues = await requestIssues();

        if (!isActive) {
          return;
        }

        setIssues(sortedIssues);
        setError("");
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(loadError.message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    hydrateAdminIssues();

    return function cleanupAdminIssues() {
      isActive = false;
    };
  }, []);

  useEffect(function startPolling() {
    let pollId = window.setInterval(function pollIssues() {
      if (document.visibilityState !== "visible") {
        return;
      }

      requestIssues()
        .then(function applyIssues(sortedIssues) {
          setIssues(sortedIssues);
        })
        .catch(function ignorePollingError() {
          return null;
        });
    }, 12000);

    return function cleanupPoll() {
      window.clearInterval(pollId);
    };
  }, []);

  async function handleResolve(issueId) {
    try {
      let response = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "resolved",
        }),
      });
      let payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(getResponseErrorMessage(response, payload, "Unable to resolve issue."));
      }

      setIssues(function updateIssues(currentIssues) {
        return currentIssues
          .map(function mapIssue(issue) {
            return issue.id === issueId ? payload.issue : issue;
          })
          .sort(function sortIssues(firstIssue, secondIssue) {
            return secondIssue.priorityScore - firstIssue.priorityScore;
          });
      });
      pushToast("Issue updated", "Issue marked as resolved.");
    } catch (resolveError) {
      setError(resolveError.message);
    }
  }

  let pendingCount = issues.filter(function countPending(issue) {
    return issue.status === "pending";
  }).length;
  let resolvedCount = issues.filter(function countResolved(issue) {
    return issue.status === "resolved";
  }).length;
  let totalVotes = issues.reduce(function sumVotes(total, issue) {
    return total + issue.votes;
  }, 0);
  let filteredIssues = issues.filter(function filterIssues(issue) {
    return activeStatus === "All" || issue.status === activeStatus;
  });
  let summary = buildAdminSummary(issues);
  let stats = [
    { label: "Total Issues", value: issues.length, tone: "bg-blue-100/50 text-blue-600" },
    { label: "Pending", value: pendingCount, tone: "bg-orange-100/50 text-orange-600" },
    { label: "Resolved", value: resolvedCount, tone: "bg-green-100/50 text-green-600" },
    { label: "Total Votes", value: totalVotes, tone: "bg-purple-100/50 text-purple-600" },
  ];

  return (
    <AppShell>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_45%,#f8fafc_100%)]">
        <section className="px-4 py-8 sm:px-8">
          <div className="rounded-[32px] border border-white/70 bg-white/92 px-6 py-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <Link
              href="/"
              className="inline-flex rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Back to citizen view
            </Link>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
            <p className="mt-2 font-medium text-slate-500">
              Manage and monitor city operations and citizen reports.
            </p>
            <p className="mt-4 max-w-3xl rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm font-medium text-blue-700">
              {summary}
            </p>
          </div>
        </section>

        <div className="px-4 py-8 sm:px-8">
          <div className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {stats.map(function renderStat(stat) {
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-bold ${stat.tone}`}
                    >
                      {stat.label.slice(0, 1)}
                    </div>
                    <span className="text-sm font-semibold text-green-500">+Live</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                  <div className="mt-1 text-sm font-bold uppercase tracking-[0.12em] text-slate-400">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>

          {error ? (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Manage Reports</h2>
              <div className="flex flex-wrap gap-2">
                <select
                  value={activeStatus}
                  onChange={function updateStatus(event) {
                    setActiveStatus(event.target.value);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 outline-none transition focus:border-blue-600"
                >
                  <option value="All">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button
                  type="button"
                  onClick={function refreshIssues() {
                    loadIssues(true);
                  }}
                  className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                >
                  Refresh
                </button>
                <Link
                  href="/report"
                  className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  New Report
                </Link>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <AdminRowSkeleton />
                <AdminRowSkeleton />
                <AdminRowSkeleton />
              </div>
            ) : null}

            {!isLoading && !issues.length ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center">
                <h3 className="text-lg font-bold text-slate-900">No issues reported yet</h3>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  New citizen reports will appear here automatically.
                </p>
              </div>
            ) : null}

            {!isLoading && issues.length > 0 && !filteredIssues.length ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center">
                <h3 className="text-lg font-bold text-slate-900">No issues found</h3>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Try another status filter.
                </p>
              </div>
            ) : null}

            <div className="space-y-4">
              {filteredIssues.map(function renderIssue(issue) {
                return (
                  <div
                    key={issue.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-start gap-3">
                          <h3 className="flex-1 text-lg font-bold leading-snug text-slate-900">
                            {issue.title}
                          </h3>
                          <span
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] ${
                              issue.status === "resolved"
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {issue.status}
                          </span>
                        </div>
                        <p className="mb-3 text-sm font-medium text-slate-500">
                          {issue.category} - {issue.city || "Unknown area"} - {issue.priorityBand}
                        </p>
                        <p className="text-sm text-slate-600">{issue.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
                        <span>
                          <strong className="text-slate-900">{issue.votes}</strong> votes
                        </span>
                        <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                        <span>
                          Priority <strong className="text-slate-900">{issue.priorityScore}</strong>
                        </span>
                      </div>

                      <div className="flex gap-2">
                        {issue.status !== "resolved" ? (
                          <button
                            type="button"
                            onClick={function resolveIssue() {
                              handleResolve(issue.id);
                            }}
                            className="rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-600"
                          >
                            Mark Resolved
                          </button>
                        ) : (
                          <span className="rounded-xl bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                            Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
