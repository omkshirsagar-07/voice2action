"use client";

import Image from "next/image";
import Link from "next/link";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AppShell from "./AppShell";
import ToastStack from "./ToastStack";
import MapView from "./map/MapView";
import FilterPanel from "./map/FilterPanel";
import AddIssueModal from "./map/AddIssueModal";
import { getCityMapConfig, isWithinCityBounds } from "@/lib/city-map";
import { resolveBrowserLocation } from "@/lib/browser-location";
import { ISSUE_STATUS_META } from "@/lib/issue-constants";
import { getResponseErrorMessage, readJsonResponse } from "@/lib/http";

function buildToast(id, title, message) {
  return {
    id,
    title,
    message,
  };
}

function formatRelativeTime(value) {
  if (!value) {
    return "Just now";
  }

  let createdAt = new Date(value).getTime();
  let hours = Math.max(1, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60)));

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function buildVoteDots(issueId) {
  let palette = ["bg-slate-300", "bg-blue-300", "bg-emerald-300"];

  return [0, 1, 2].map(function mapDot(index) {
    return {
      id: `${issueId}-${index}`,
      color: palette[index % palette.length],
    };
  });
}

function StatusLegend({ issues }) {
  let counts = issues.reduce(
    function countStatuses(currentCounts, issue) {
      currentCounts[issue.status] = (currentCounts[issue.status] || 0) + 1;
      return currentCounts;
    },
    {
      pending: 0,
      resolved: 0,
    }
  );

  let items = [
    { key: "pending", label: "Pending", tone: "bg-blue-500" },
    { key: "resolved", label: "Resolved", tone: "bg-emerald-500" },
  ];

  return (
    <div className="rounded-[26px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl">
      <p className="text-lg font-bold text-slate-900">Status Legend</p>
      <div className="mt-4 space-y-3">
        {items.map(function renderItem(item) {
          return (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-600"
            >
              <div className="flex items-center gap-3">
                <span className={`h-3.5 w-3.5 rounded-full ${item.tone}`} />
                <span>{item.label}</span>
              </div>
              <span className="text-slate-400">{counts[item.key] || 0}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IssueDetailsPanel({ issue, isVoteDisabled, onVote, onRefresh }) {
  if (!issue) {
    return (
      <aside className="flex h-full min-h-[18rem] flex-col border-t border-slate-200 bg-white lg:min-h-screen lg:border-l lg:border-t-0">
        <div className="border-b border-slate-200 px-6 py-6">
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Issue Details</h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Click on a marker to view details
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="max-w-sm rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
            <p className="text-base font-semibold text-slate-700">No issue selected</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Pick any marker on the map to inspect its image, vote count, status, and location.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Refresh map data
            </button>
          </div>
        </div>
      </aside>
    );
  }

  let statusMeta = ISSUE_STATUS_META[issue.status] || ISSUE_STATUS_META.pending;
  let voteDots = buildVoteDots(issue.id);
  let statusClass =
    statusMeta.tone === "emerald"
      ? "bg-emerald-50 text-emerald-600"
      : "bg-blue-50 text-blue-600";

  return (
    <aside className="flex h-full flex-col border-t border-slate-200 bg-white lg:min-h-screen lg:border-l lg:border-t-0">
      <div className="border-b border-slate-200 px-6 py-6">
        <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Issue Details</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Live marker context and quick action
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <article className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="flex gap-4">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[20px] bg-slate-100">
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
                  No image
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-[31px] font-bold leading-[1.05] tracking-tight text-slate-900">
                {issue.title}
              </h3>
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-500">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="11" r="2.5" />
                </svg>
                <span>{issue.city || "Chhatrapati Sambhajinagar"}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] ${statusClass}`}
            >
              {statusMeta.label}
            </span>
            <span className="text-sm font-medium text-slate-400">
              {formatRelativeTime(issue.createdAt)}
            </span>
          </div>

          <p className="mt-4 text-sm leading-7 text-slate-600">{issue.description}</p>

          <div className="mt-5 flex items-center justify-between gap-3 rounded-[22px] bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {voteDots.map(function renderDot(dot) {
                  return (
                    <span
                      key={dot.id}
                      className={`inline-flex h-9 w-9 rounded-full border-2 border-white ${dot.color}`}
                    />
                  );
                })}
              </div>
              <span className="text-sm font-semibold text-slate-500">+{issue.votes} votes</span>
            </div>

            <button
              type="button"
              onClick={function handleVoteClick() {
                onVote(issue.id);
              }}
              disabled={isVoteDisabled}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isVoteDisabled
                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m7 11 5-7 5 7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 4v16" strokeLinecap="round" />
              </svg>
              <span>{isVoteDisabled ? "Voted" : "Vote"}</span>
            </button>
          </div>
        </article>
      </div>
    </aside>
  );
}

export default function MapExperienceClient() {
  let cityMap = getCityMapConfig();
  let [issues, setIssues] = useState([]);
  let [isLoading, setIsLoading] = useState(true);
  let [isSubmitting, setIsSubmitting] = useState(false);
  let [error, setError] = useState("");
  let [search, setSearch] = useState("");
  let [category, setCategory] = useState("All");
  let [status, setStatus] = useState("All");
  let [showHeatmap, setShowHeatmap] = useState(true);
  let [selectedPoint, setSelectedPoint] = useState(null);
  let [selectedIssueId, setSelectedIssueId] = useState(null);
  let [currentLocation, setCurrentLocation] = useState(null);
  let [locationMessage, setLocationMessage] = useState(
    `Centered on ${cityMap.name}, Maharashtra`
  );
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
  let deferredSearch = useDeferredValue(search);

  function dismissToast(toastId) {
    setToasts(function removeToast(currentToasts) {
      return currentToasts.filter(function filterToast(toast) {
        return toast.id !== toastId;
      });
    });
  }

  function pushToast(title, message) {
    toastCounterRef.current += 1;
    let toastId = `map-toast-${toastCounterRef.current}`;

    setToasts(function addToast(currentToasts) {
      return currentToasts.concat(buildToast(toastId, title, message));
    });

    window.setTimeout(function removeToastLater() {
      dismissToast(toastId);
    }, 2800);
  }

  let fetchIssues = useCallback(
    async function fetchIssues(shouldStaySilent = false) {
      try {
        if (!shouldStaySilent) {
          setIsLoading(true);
        }

        let response = await fetch("/api/issues", {
          cache: "no-store",
        });
        let payload = await readJsonResponse(response);

        if (!response.ok) {
          throw new Error(getResponseErrorMessage(response, payload, "Unable to load map issues."));
        }

        setIssues(payload.issues || []);
        setError("");
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        if (!shouldStaySilent) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(function loadInitialData() {
    let isActive = true;

    async function hydratePage() {
      await fetchIssues();

      try {
        let location = await resolveBrowserLocation();

        if (!isActive) {
          return;
        }

        setCurrentLocation(location);
        setLocationMessage(
          location.note ? `Live location ready near ${location.label}. ${location.note}` : `Live location ready near ${location.label}.`
        );
      } catch (locationError) {
        if (!isActive) {
          return;
        }

        setLocationMessage(locationError.message);
      }
    }

    hydratePage();

    return function cleanupPage() {
      isActive = false;
    };
  }, [fetchIssues]);

  useEffect(
    function pollFreshIssues() {
      let pollId = window.setInterval(function refreshIssues() {
        if (document.visibilityState !== "visible") {
          return;
        }

        fetchIssues(true);
      }, 20000);

      return function cleanupPoll() {
        window.clearInterval(pollId);
      };
    },
    [fetchIssues]
  );

  let filteredIssues = useMemo(
    function buildFilteredIssues() {
      let normalizedSearch = deferredSearch.trim().toLowerCase();

      return issues.filter(function filterIssue(issue) {
        let matchesCategory = category === "All" || issue.category === category;
        let matchesStatus = status === "All" || issue.status === status;
        let matchesSearch =
          !normalizedSearch ||
          issue.title.toLowerCase().includes(normalizedSearch) ||
          issue.description.toLowerCase().includes(normalizedSearch) ||
          (issue.city || "").toLowerCase().includes(normalizedSearch);

        return matchesCategory && matchesStatus && matchesSearch;
      });
    },
    [issues, category, status, deferredSearch]
  );

  let selectedIssue = useMemo(
    function buildSelectedIssue() {
      if (!filteredIssues.length) {
        return null;
      }

      let matchedIssue = filteredIssues.find(function findSelectedIssue(issue) {
        return issue.id === selectedIssueId;
      });

      return matchedIssue || filteredIssues[0];
    },
    [filteredIssues, selectedIssueId]
  );

  async function handleLocateMe() {
    try {
      let location = await resolveBrowserLocation();
      setCurrentLocation(location);
      setSelectedPoint({
        lat: location.lat,
        lng: location.lng,
      });
      setLocationMessage(
        location.note
          ? `Map moved to your current position near ${location.label}. ${location.note}`
          : `Map moved to your current position near ${location.label}.`
      );
      pushToast("Location found", "Centered the map on your current position.");
    } catch (locationError) {
      setLocationMessage(locationError.message);
      pushToast("Location unavailable", locationError.message);
    }
  }

  async function handleCreateIssue(form) {
    if (!selectedPoint || !isWithinCityBounds(selectedPoint.lat, selectedPoint.lng)) {
      pushToast("Invalid point", `Please choose a point inside ${cityMap.name}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      let response = await fetch("/api/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          lat: selectedPoint.lat,
          lng: selectedPoint.lng,
          coordinates: {
            type: "Point",
            coordinates: [selectedPoint.lng, selectedPoint.lat],
          },
          city: currentLocation?.area || cityMap.name,
          cityKey: cityMap.key,
          locationAccuracy: currentLocation?.accuracy || 0,
        }),
      });
      let payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(getResponseErrorMessage(response, payload, "Unable to create issue."));
      }

      setIssues(function addNewIssue(currentIssues) {
        return [payload.issue].concat(currentIssues);
      });
      setSelectedIssueId(payload.issue.id);
      setSelectedPoint(null);
      pushToast("Issue added", "The new city issue marker is now live on the map.");
    } catch (submitError) {
      setError(submitError.message);
      pushToast("Submission failed", submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

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
      setSelectedIssueId(issueId);
      pushToast("Vote added", "This issue has been upvoted.");
    } catch (voteError) {
      setError(voteError.message);
    }
  }

  return (
    <AppShell>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <main className="min-h-screen bg-[#f6f7fb]">
        <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="relative min-h-[calc(100vh-5rem)] lg:min-h-screen">
            {error ? (
              <div className="absolute left-6 right-6 top-24 z-[650] rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-lg">
                {error}
              </div>
            ) : null}

            <div className="absolute left-6 right-6 top-6 z-[600]">
              <FilterPanel
                category={category}
                status={status}
                search={search}
                showHeatmap={showHeatmap}
                onCategoryChange={function changeCategory(nextValue) {
                  startTransition(function deferCategoryChange() {
                    setCategory(nextValue);
                  });
                }}
                onStatusChange={function changeStatus(nextValue) {
                  startTransition(function deferStatusChange() {
                    setStatus(nextValue);
                  });
                }}
                onSearchChange={function changeSearch(nextValue) {
                  startTransition(function deferSearchChange() {
                    setSearch(nextValue);
                  });
                }}
                onToggleHeatmap={function toggleHeatmap() {
                  setShowHeatmap(function invertCurrentValue(currentValue) {
                    return !currentValue;
                  });
                }}
                totalCount={issues.length}
                visibleCount={filteredIssues.length}
              />
            </div>

            <div className="absolute left-6 top-24 z-[600] hidden max-w-xs rounded-[24px] border border-white/70 bg-white/88 px-4 py-3 text-sm font-medium text-slate-600 shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur-xl xl:block">
              {locationMessage}
            </div>

            <div className="absolute right-6 top-24 z-[600] flex flex-col gap-3">
              <button
                type="button"
                onClick={handleLocateMe}
                className="inline-flex h-14 items-center justify-center rounded-[22px] bg-white/92 px-4 text-sm font-semibold text-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur-xl transition hover:bg-white"
              >
                Locate Me
              </button>
              <Link
                href="/report"
                className="inline-flex h-14 items-center justify-center rounded-[22px] bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(37,99,235,0.28)] transition hover:bg-blue-700"
              >
                Report Issue
              </Link>
            </div>

            <div className="absolute bottom-6 left-6 z-[600] max-w-[15rem]">
              <StatusLegend issues={filteredIssues} />
            </div>

            {isLoading ? (
              <div className="flex h-full min-h-[calc(100vh-5rem)] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_38%),linear-gradient(180deg,_#f8fafc,_#eef2ff)] text-sm font-semibold text-slate-500 lg:min-h-screen">
                Loading interactive city map...
              </div>
            ) : (
              <MapView
                issues={filteredIssues}
                currentLocation={currentLocation}
                selectedPoint={selectedPoint}
                selectedIssueId={selectedIssue?.id}
                allowIssueCreation={true}
                onIssueSelect={function handleIssueSelect(issue) {
                  setSelectedIssueId(issue.id);
                }}
                onMapSelect={function handleMapSelect(nextPoint) {
                  if (!isWithinCityBounds(nextPoint.lat, nextPoint.lng)) {
                    pushToast("Outside boundary", `Please pick a point inside ${cityMap.name}.`);
                    return;
                  }

                  setSelectedPoint(nextPoint);
                }}
                showHeatmap={showHeatmap}
                className="h-[calc(100vh-5rem)] rounded-none border-0 bg-transparent lg:h-screen"
              />
            )}

            {selectedPoint ? (
              <div className="absolute bottom-6 left-1/2 z-[600] -translate-x-1/2 rounded-full bg-slate-950/85 px-4 py-3 text-sm font-semibold text-white shadow-2xl backdrop-blur">
                New report pin placed. Finish it in the form below.
              </div>
            ) : null}
          </section>

          <IssueDetailsPanel
            issue={selectedIssue}
            isVoteDisabled={selectedIssue ? votedIssueIds.includes(selectedIssue.id) : false}
            onVote={handleVote}
            onRefresh={function refreshMapData() {
              fetchIssues();
              pushToast("Refreshing", "Fetching the latest civic issue markers.");
            }}
          />
        </div>

        <AddIssueModal
          key={selectedPoint ? `${selectedPoint.lat}-${selectedPoint.lng}` : "closed"}
          isOpen={Boolean(selectedPoint)}
          selectedPoint={selectedPoint}
          isSubmitting={isSubmitting}
          onClose={function closeModal() {
            setSelectedPoint(null);
          }}
          onSubmit={handleCreateIssue}
        />
      </main>
    </AppShell>
  );
}
