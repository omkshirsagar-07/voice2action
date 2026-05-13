"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AppShell from "./AppShell";
import IssueCard from "./IssueCard";
import { IssueCardSkeleton } from "./LoadingSkeleton";
import Map from "./Map";
import ToastStack from "./ToastStack";
import { resolveBrowserLocation } from "@/lib/browser-location";
import { getResponseErrorMessage, readJsonResponse } from "@/lib/http";

function buildStats(issues) {
  let pendingIssues = issues.filter(function filterPending(issue) {
    return issue.status === "pending";
  });
  let resolvedIssues = issues.filter(function filterResolved(issue) {
    return issue.status === "resolved";
  });
  let totalVotes = issues.reduce(function countVotes(total, issue) {
    return total + issue.votes;
  }, 0);

  return [
    { label: "Open issues", value: pendingIssues.length },
    { label: "Resolved", value: resolvedIssues.length },
    { label: "Votes cast", value: totalVotes },
  ];
}

function buildHotspots(issues) {
  let grouped = {};
  let index = 0;

  while (index < issues.length) {
    let issue = issues[index];

    if (!grouped[issue.category]) {
      grouped[issue.category] = 0;
    }

    grouped[issue.category] += issue.priorityScore;
    index += 1;
  }

  return Object.entries(grouped)
    .map(function mapHotspot(entry) {
      return {
        name: entry[0],
        score: entry[1],
      };
    })
    .sort(function sortHotspots(firstEntry, secondEntry) {
      return secondEntry.score - firstEntry.score;
    });
}

function buildToast(id, title, message) {
  return {
    id,
    title,
    message,
  };
}

function getLocationTone(location) {
  if (!location) {
    return "bg-slate-100 text-slate-500";
  }

  return location.isApproximate ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600";
}

export default function HomeClient() {
  let [issues, setIssues] = useState([]);
  let [isLoading, setIsLoading] = useState(true);
  let [error, setError] = useState("");
  let [searchTerm, setSearchTerm] = useState("");
  let [activeCategory, setActiveCategory] = useState("All");
  let [activeStatus, setActiveStatus] = useState("All");
  let [mapPriorityFilter, setMapPriorityFilter] = useState("All");
  let [mapCategoryFilter, setMapCategoryFilter] = useState("All");
  let [viewerLocation, setViewerLocation] = useState(null);
  let [locationStatus, setLocationStatus] = useState("Detecting your city...");
  let [votedIssueIds, setVotedIssueIds] = useState(function getStoredVotes() {
    if (typeof window === "undefined") {
      return [];
    }

    let storedVotes = window.localStorage.getItem("voice2action-votes");

    if (!storedVotes) {
      return [];
    }

    try {
      let parsedVotes = JSON.parse(storedVotes);
      return Array.isArray(parsedVotes) ? parsedVotes : [];
    } catch (_storageError) {
      return [];
    }
  });
  let [toasts, setToasts] = useState([]);
  let toastCounterRef = useRef(0);

  function pushToast(title, message) {
    toastCounterRef.current += 1;
    let toastId = `toast-${toastCounterRef.current}`;

    setToasts(function appendToast(currentToasts) {
      return currentToasts.concat(buildToast(toastId, title, message));
    });

    window.setTimeout(function removeLater() {
      dismissToast(toastId);
    }, 2600);
  }

  function dismissToast(toastId) {
    setToasts(function removeToast(currentToasts) {
      return currentToasts.filter(function filterToast(toast) {
        return toast.id !== toastId;
      });
    });
  }

  async function requestIssues(cityKey) {
    let query = cityKey ? `?city=${encodeURIComponent(cityKey)}` : "";
    let response = await fetch(`/api/issues${query}`, {
      cache: "no-store",
    });
    let payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(getResponseErrorMessage(response, payload, "Unable to load issues."));
    }

    return {
      issues: payload.issues || [],
      meta: payload.meta || {},
    };
  }

  function updateLocationStatus(location, meta) {
    if (!location) {
      setLocationStatus("Showing all issues until your city can be confirmed.");
      return;
    }

    if (meta?.usedFallback) {
      setLocationStatus(
        `No saved issues are tagged for ${location.label} yet, so showing all existing issues for now.`
      );
      return;
    }

    setLocationStatus(`Showing issues reported in ${location.label}.`);
  }

  async function loadIssues(cityKey = viewerLocation?.cityKey, shouldToast = false) {
    try {
      setIsLoading(true);
      setError("");

      let payload = await requestIssues(cityKey);
      setIssues(payload.issues);
      updateLocationStatus(viewerLocation, payload.meta);

      if (shouldToast) {
        pushToast("Refreshed", "Issue list updated.");
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(function fetchIssues() {
    let isActive = true;

    async function hydrateIssues() {
      try {
        let location = null;

        try {
          location = await resolveBrowserLocation();
        } catch (locationError) {
          if (isActive) {
            setLocationStatus(locationError.message);
          }
        }

        let payload = await requestIssues(location?.cityKey);

        if (!isActive) {
          return;
        }

        setViewerLocation(location);
        updateLocationStatus(location, payload.meta);
        setIssues(payload.issues);
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

    return function cleanupIssues() {
      isActive = false;
    };
  }, []);

  useEffect(
    function startPolling() {
      let pollId = window.setInterval(function pollIssues() {
        if (document.visibilityState !== "visible") {
          return;
        }

        requestIssues(viewerLocation?.cityKey)
          .then(function applyPayload(payload) {
            setIssues(payload.issues);
            updateLocationStatus(viewerLocation, payload.meta);
          })
          .catch(function ignorePollingError() {
            return null;
          });
      }, 12000);

      return function cleanupPoll() {
        window.clearInterval(pollId);
      };
    },
    [viewerLocation]
  );

  async function handleVote(issueId) {
    if (votedIssueIds.includes(issueId)) {
      pushToast("Already voted", "You already voted for this issue.");
      return;
    }

    try {
      let response = await fetch(`/api/issues/${issueId}/vote`, {
        method: "POST",
      });
      let payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(getResponseErrorMessage(response, payload, "Unable to register vote."));
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

      setVotedIssueIds(function updateVotes(currentVotes) {
        let nextVotes = currentVotes.concat(issueId);
        window.localStorage.setItem("voice2action-votes", JSON.stringify(nextVotes));
        return nextVotes;
      });
      pushToast("Vote added", "Vote added.");
    } catch (voteError) {
      setError(voteError.message);
    }
  }

  let stats = buildStats(issues);
  let hotspots = buildHotspots(issues);
  let categories = ["All"].concat(
    Array.from(
      new Set(
        issues.map(function mapCategory(issue) {
          return issue.category;
        })
      )
    )
  );
  let statuses = ["All", "pending", "resolved"];
  let filteredIssues = issues.filter(function filterIssues(issue) {
    let matchesCategory = activeCategory === "All" || issue.category === activeCategory;
    let matchesStatus = activeStatus === "All" || issue.status === activeStatus;
    let searchValue = searchTerm.toLowerCase().trim();
    let matchesSearch =
      !searchValue ||
      issue.title.toLowerCase().includes(searchValue) ||
      issue.description.toLowerCase().includes(searchValue);

    return matchesCategory && matchesStatus && matchesSearch;
  });
  let mapIssues = filteredIssues.filter(function filterMapIssue(issue) {
    let matchesPriority =
      mapPriorityFilter === "All" || issue.priorityBand === mapPriorityFilter.toLowerCase();
    let matchesCategory = mapCategoryFilter === "All" || issue.category === mapCategoryFilter;
    return matchesPriority && matchesCategory;
  });

  return (
    <AppShell showMobileHeader={false}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <main className="h-full bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_45%,#f8fafc_100%)]">
        <div className="px-4 pt-4 sm:px-8">
          <div className="rounded-[28px] border border-white/70 bg-white/92 px-5 py-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:rounded-3xl sm:px-8 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Current Location
                </p>
                <div className="flex items-center gap-2 text-[28px] font-bold text-slate-900 sm:text-xl">
                  <span className="inline-flex h-3.5 w-3.5 rounded-full bg-blue-600" />
                  {viewerLocation?.label || "Locating your city"}
                </div>
                <p className="mt-2 text-sm font-medium text-slate-500">{locationStatus}</p>
                {viewerLocation ? (
                  <span
                    className={`mt-3 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${getLocationTone(
                      viewerLocation
                    )}`}
                  >
                    {viewerLocation.isApproximate ? "Approximate GPS" : "Reliable GPS"}
                  </span>
                ) : null}
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-500 shadow-sm">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={function updateSearch(event) {
                    setSearchTerm(event.target.value);
                  }}
                  placeholder="Search issues..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 lg:flex lg:w-auto">
                <select
                  value={activeStatus}
                  onChange={function changeStatus(event) {
                    setActiveStatus(event.target.value);
                  }}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                >
                  {statuses.map(function renderStatus(status) {
                    return (
                      <option key={status} value={status}>
                        {status === "All" ? "All Status" : status}
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  onClick={function refreshIssues() {
                    loadIssues(viewerLocation?.cityKey, true);
                  }}
                  className="flex h-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 px-4 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={async function locateAgain() {
                    try {
                      let location = await resolveBrowserLocation();
                      setViewerLocation(location);
                      setLocationStatus(
                        location.isApproximate
                          ? `Location refreshed near ${location.label}. GPS is still approximate, so map adjustment may help.`
                          : `Location refreshed near ${location.label}.`
                      );
                      loadIssues(location.cityKey, true);
                    } catch (locationError) {
                      setLocationStatus(locationError.message);
                    }
                  }}
                  className="flex h-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Locate Me
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-8 sm:py-6">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="mb-4 flex min-w-max gap-3">
              {categories.map(function renderCategory(category) {
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={function activateCategory() {
                      setActiveCategory(category);
                    }}
                    className={`rounded-2xl px-5 py-3 text-sm font-semibold transition-all ${
                      activeCategory === category
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <section>
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-900">Trending Issues</h2>
                <Link
                  href="/admin"
                  className="text-sm font-bold text-blue-600 transition hover:text-blue-700"
                >
                  See all
                </Link>
              </div>

              {error ? (
                <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              {isLoading ? (
                <div className="grid gap-4 sm:gap-5">
                  <IssueCardSkeleton />
                  <IssueCardSkeleton />
                  <IssueCardSkeleton />
                </div>
              ) : null}

              {!isLoading && !issues.length ? (
                <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900">No issues reported yet</h3>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Be the first to report a local issue in your area.
                  </p>
                </div>
              ) : null}

              {!isLoading && issues.length > 0 && !filteredIssues.length ? (
                <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900">No issues found</h3>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Try another search or filter combination.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:gap-5">
                {filteredIssues.map(function renderIssue(issue) {
                  return (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      onVote={handleVote}
                      actionLabel={votedIssueIds.includes(issue.id) ? "Voted" : "Vote"}
                      isVoteDisabled={votedIssueIds.includes(issue.id)}
                    />
                  );
                })}
              </div>
            </section>

            <aside className="hidden space-y-6 xl:block">
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Live Issue Map</h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {mapIssues.length} visible points
                      {viewerLocation?.city ? ` in ${viewerLocation.city}` : " across the map"}.
                    </p>
                  </div>
                  <Link
                    href="/map"
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    Open Full Map
                  </Link>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {["All", "High", "Medium", "Low"].map(function renderPriorityFilter(option) {
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={function selectPriorityFilter() {
                          setMapPriorityFilter(option);
                        }}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          mapPriorityFilter === option
                            ? "bg-blue-600 text-white"
                            : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {option === "All" ? "All Priority" : `Show ${option}`}
                      </button>
                    );
                  })}

                  <select
                    value={mapCategoryFilter}
                    onChange={function changeMapCategory(event) {
                      setMapCategoryFilter(event.target.value);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-blue-600"
                  >
                    <option value="All">All Categories</option>
                    {categories
                      .filter(function filterCategory(category) {
                        return category !== "All";
                      })
                      .map(function renderMapCategory(category) {
                        return (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <Map issues={mapIssues} currentLocation={viewerLocation} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1">
                {stats.map(function renderStat(stat) {
                  return (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
                        {stat.label}
                      </p>
                      <p className="mt-3 text-3xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">Category Pressure</h3>
                <div className="mt-5 space-y-4">
                  {hotspots.map(function renderHotspot(hotspot) {
                    let width = Math.max(20, hotspot.score * 5);

                    return (
                      <div key={hotspot.name}>
                        <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600">
                          <span>{hotspot.name}</span>
                          <span>{hotspot.score}</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100">
                          <div
                            className="h-3 rounded-full bg-blue-600"
                            style={{ width: `${Math.min(100, width)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
