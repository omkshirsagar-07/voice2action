"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AppShell from "./AppShell";
import Map from "./Map";
import { AdminRowSkeleton } from "./LoadingSkeleton";
import ToastStack from "./ToastStack";
import { buildAdminSummary } from "@/lib/issue-utils";
import { ADMIN_DEPARTMENT_META, getDepartmentLabel } from "@/lib/issue-constants";
import { getResponseErrorMessage, readJsonResponse } from "@/lib/http";

async function fetchWithTimeout(input, init = {}, timeoutMs = 7000) {
  let controller = new AbortController();
  let timeoutId = window.setTimeout(function abortRequest() {
    controller.abort(new Error("Request timed out."));
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function requestDepartmentIssues(department) {
  let query = department ? `?department=${encodeURIComponent(department)}` : "";
  let response = await fetchWithTimeout(`/api/issues${query}`, {
    cache: "no-store",
  });
  let payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getResponseErrorMessage(response, payload, "Unable to load dashboard data."));
  }

  return (payload.issues || []).sort(function sortIssues(firstIssue, secondIssue) {
    return secondIssue.priorityScore - firstIssue.priorityScore;
  });
}

async function requestAdmins() {
  let response = await fetchWithTimeout("/api/admins", {
    cache: "no-store",
  });
  let payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getResponseErrorMessage(response, payload, "Unable to load admins."));
  }

  return payload.admins || [];
}

export default function AdminClient({ adminUser }) {
  let department = adminUser?.department || "";
  let isMainAdmin = Boolean(adminUser?.isMainAdmin);
  let departmentLabel = adminUser?.departmentLabel || (department ? getDepartmentLabel(department) : "All departments");
  let [issues, setIssues] = useState([]);
  let [admins, setAdmins] = useState([]);
  let [isLoading, setIsLoading] = useState(true);
  let [isAdminLoading, setIsAdminLoading] = useState(isMainAdmin);
  let [error, setError] = useState("");
  let [adminError, setAdminError] = useState("");
  let [activeView, setActiveView] = useState("all");
  let [toasts, setToasts] = useState([]);
  let [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
    department: Object.keys(ADMIN_DEPARTMENT_META)[0] || "garbage",
  });
  let [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
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

  async function loadIssues(shouldToast = false) {
    try {
      setIsLoading(true);
      setError("");

      let sortedIssues = await requestDepartmentIssues(department);
      setIssues(sortedIssues);

      if (shouldToast) {
        pushToast("Refreshed", `${departmentLabel} dashboard updated.`);
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAdmins(shouldToast = false) {
    if (!isMainAdmin) {
      return;
    }

    try {
      setIsAdminLoading(true);
      setAdminError("");
      let nextAdmins = await requestAdmins();
      setAdmins(nextAdmins);

      if (shouldToast) {
        pushToast("Admin list updated", "The admin directory has been refreshed.");
      }
    } catch (loadError) {
      setAdminError(loadError.message);
    } finally {
      setIsAdminLoading(false);
    }
  }

  useEffect(
    function fetchDepartmentIssues() {
      let isActive = true;

      async function hydrateIssues() {
        try {
          let sortedIssues = await requestDepartmentIssues(department);

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

      hydrateIssues();

      return function cleanupDepartmentIssues() {
        isActive = false;
      };
    },
    [department]
  );

  useEffect(
    function fetchAdmins() {
      if (!isMainAdmin) {
        return;
      }

      let isActive = true;

      requestAdmins()
        .then(function applyAdmins(nextAdmins) {
          if (!isActive) {
            return;
          }

          setAdmins(nextAdmins);
          setAdminError("");
        })
        .catch(function handleAdminLoadError(loadError) {
          if (!isActive) {
            return;
          }

          setAdminError(loadError.message);
        })
        .finally(function finalizeAdminLoad() {
          if (isActive) {
            setIsAdminLoading(false);
          }
        });

      return function cleanupAdmins() {
        isActive = false;
      };
    },
    [isMainAdmin]
  );

  useEffect(
    function startPolling() {
      let pollId = window.setInterval(function pollIssues() {
        if (document.visibilityState !== "visible") {
          return;
        }

        requestDepartmentIssues(department)
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
    },
    [department]
  );

  async function handleCreateAdmin(event) {
    event.preventDefault();

    try {
      setIsCreatingAdmin(true);
      setAdminError("");

      let response = await fetch("/api/admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newAdmin),
      });
      let payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(getResponseErrorMessage(response, payload, "Unable to create admin."));
      }

      setAdmins(function updateAdmins(currentAdmins) {
        return [payload.admin, ...currentAdmins];
      });
      setNewAdmin({
        name: "",
        email: "",
        password: "",
        department: Object.keys(ADMIN_DEPARTMENT_META)[0] || "garbage",
      });
      pushToast("Admin created", "New department admin saved to MongoDB.");
    } catch (createError) {
      setAdminError(createError.message);
    } finally {
      setIsCreatingAdmin(false);
    }
  }

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
  let visibleIssues = issues.filter(function filterIssues(issue) {
    if (activeView === "resolved") {
      return issue.status === "resolved";
    }

    return true;
  });
  let visibleSummary = buildAdminSummary(visibleIssues.length ? visibleIssues : issues);
  let totalVotes = visibleIssues.reduce(function sumVotes(total, issue) {
    return total + issue.votes;
  }, 0);
  let stats = [
    { label: "Department Issues", value: issues.length, tone: "bg-sky-100/60 text-sky-700" },
    { label: "Pending", value: pendingCount, tone: "bg-amber-100/60 text-amber-700" },
    { label: "Resolved", value: resolvedCount, tone: "bg-emerald-100/60 text-emerald-700" },
    { label: "Visible Votes", value: totalVotes, tone: "bg-violet-100/60 text-violet-700" },
  ];
  let viewButtons = [
    {
      id: "all",
      label: "All Issues",
      count: issues.length,
    },
    {
      id: "resolved",
      label: "Resolved",
      count: resolvedCount,
    },
  ];

  return (
    <AppShell title="Voice2Action" subtitle={`${departmentLabel} dashboard`}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <main className="min-h-screen bg-[linear-gradient(180deg,#f3faf7_0%,#edf7ff_45%,#f8fafc_100%)]">
        <section className="px-4 py-8 sm:px-8">
          <div className="rounded-[32px] border border-white/70 bg-white/92 px-6 py-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">
                  Department Control Panel
                </p>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                <p className="mt-2 max-w-2xl font-medium text-slate-500">
                  {isMainAdmin
                    ? `${adminUser?.name} can review all city issues and create department admins.`
                    : `${adminUser?.name} can review only the ${departmentLabel.toLowerCase()} department issues from across the city.`}
                </p>
                <p className="mt-4 max-w-3xl rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-800">
                  {visibleSummary}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/login"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Switch admin
                </Link>
                <button
                  type="button"
                  onClick={function refreshIssues() {
                    loadIssues(true);
                  }}
                  className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  Refresh
                </button>
                {isMainAdmin ? (
                  <button
                    type="button"
                    onClick={function refreshAdmins() {
                      loadAdmins(true);
                    }}
                    className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Refresh admins
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="px-4 pb-8 sm:px-8">
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
                    <span className="text-sm font-semibold text-emerald-500">Dept</span>
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

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {isMainAdmin ? "City issue queue" : `${departmentLabel} issue queue`}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Toggle between all department reports and only the resolved records.
                  </p>
                </div>

                <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  {viewButtons.map(function renderViewButton(button) {
                    let isActive = activeView === button.id;

                    return (
                      <button
                        key={button.id}
                        type="button"
                        onClick={function selectView() {
                          setActiveView(button.id);
                        }}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {button.label} ({button.count})
                      </button>
                    );
                  })}
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
                  <h3 className="text-lg font-bold text-slate-900">No department issues yet</h3>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    New reports for {departmentLabel.toLowerCase()} will appear here automatically.
                  </p>
                </div>
              ) : null}

              {!isLoading && issues.length > 0 && !visibleIssues.length ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center">
                  <h3 className="text-lg font-bold text-slate-900">No resolved issues yet</h3>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Resolve a department report and it will appear in this tab.
                  </p>
                </div>
              ) : null}

              <div className="space-y-4">
                {visibleIssues.map(function renderIssue(issue) {
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
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
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
                              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-600"
                            >
                              Mark Resolved
                            </button>
                          ) : (
                            <span className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
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

            <aside className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  {isMainAdmin ? "City issue map" : "City issue map"}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {isMainAdmin
                    ? "Each point shows an issue reported anywhere in the city."
                    : `Each point shows a ${departmentLabel.toLowerCase()} report inside the city.`}
                </p>
              </div>

              <Map issues={visibleIssues} currentLocation={null} className="h-[360px]" />

              {isMainAdmin ? (
                <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Create admin</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Only the main admin can create department admin accounts.
                    </p>
                  </div>

                  <form onSubmit={handleCreateAdmin} className="space-y-3">
                    <input
                      type="text"
                      value={newAdmin.name}
                      onChange={function updateAdminName(event) {
                        setNewAdmin(function updateCurrentAdmin(currentAdmin) {
                          return {
                            ...currentAdmin,
                            name: event.target.value,
                          };
                        });
                      }}
                      placeholder="Admin name"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-600"
                    />
                    <input
                      type="email"
                      value={newAdmin.email}
                      onChange={function updateAdminEmail(event) {
                        setNewAdmin(function updateCurrentAdmin(currentAdmin) {
                          return {
                            ...currentAdmin,
                            email: event.target.value,
                          };
                        });
                      }}
                      placeholder="department-admin@example.com"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-600"
                    />
                    <input
                      type="password"
                      value={newAdmin.password}
                      onChange={function updateAdminPassword(event) {
                        setNewAdmin(function updateCurrentAdmin(currentAdmin) {
                          return {
                            ...currentAdmin,
                            password: event.target.value,
                          };
                        });
                      }}
                      placeholder="Set admin password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-600"
                    />
                    <select
                      value={newAdmin.department}
                      onChange={function updateAdminDepartment(event) {
                        setNewAdmin(function updateCurrentAdmin(currentAdmin) {
                          return {
                            ...currentAdmin,
                            department: event.target.value,
                          };
                        });
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-600"
                    >
                      {Object.entries(ADMIN_DEPARTMENT_META).map(function renderDepartmentOption(
                        [value, meta]
                      ) {
                        return (
                          <option key={value} value={value}>
                            {meta.label}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      type="submit"
                      disabled={isCreatingAdmin}
                      className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
                        isCreatingAdmin
                          ? "cursor-not-allowed bg-slate-400"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {isCreatingAdmin ? "Creating admin..." : "Create admin"}
                    </button>
                  </form>

                  {adminError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {adminError}
                    </div>
                  ) : null}

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900">Saved admins</h3>
                      {isAdminLoading ? (
                        <span className="text-sm font-medium text-slate-500">Loading...</span>
                      ) : (
                        <span className="text-sm font-medium text-slate-500">{admins.length} accounts</span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {admins.map(function renderAdmin(admin) {
                        return (
                          <div
                            key={admin.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                          >
                            <p className="text-sm font-semibold text-slate-900">{admin.name}</p>
                            <p className="text-sm text-slate-600">{admin.email}</p>
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                              {admin.roleType === "main" ? "Main admin" : admin.departmentLabel}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
