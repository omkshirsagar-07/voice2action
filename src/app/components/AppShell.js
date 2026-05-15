"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LoginPromptModal from "./LoginPromptModal";

let navigationItems = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/map", label: "Map View", icon: "map" },
  { href: "/report", label: "Report Issue", icon: "plus" },
];

function NavigationIcon({ icon, tone = "default" }) {
  let className =
    tone === "inverse"
      ? "text-white"
      : tone === "active"
        ? "text-blue-600"
        : "text-slate-400";

  if (icon === "home") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 10.5 12 4l7 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-3v6H6a1 1 0 0 1-1-1v-9.5Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "map") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 4v14M15 6v14" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

function NavigationLink({ href, icon, label, pathname }) {
  let isActive = pathname === href;
  let isReport = href === "/report";
  let iconTone = isActive ? "active" : isReport ? "inverse" : "default";

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
        isActive
          ? "bg-blue-50 text-blue-600"
          : isReport
            ? "bg-blue-600 text-white shadow-[0_14px_35px_rgba(37,99,235,0.28)] hover:bg-blue-700"
            : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <NavigationIcon icon={icon} tone={iconTone} />
      <span>{label}</span>
    </Link>
  );
}

export default function AppShell({
  children,
  title = "Voice2Action",
  subtitle = "Admin Portal",
  showMobileHeader = true,
}) {
  let pathname = usePathname();
  let [currentUser, setCurrentUser] = useState(null);
  let [isAuthReady, setIsAuthReady] = useState(false);
  let [isSigningOut, setIsSigningOut] = useState(false);
  let [hasDismissedLoginPrompt, setHasDismissedLoginPrompt] = useState(function getDismissedLoginPromptState() {
    if (typeof window === "undefined") {
      return false;
    }

    return Boolean(window.sessionStorage.getItem("voice2action-login-prompt-dismissed"));
  });

  useEffect(function loadCurrentUser() {
    let isActive = true;

    fetch("/api/auth/me", {
      cache: "no-store",
    })
      .then(async function parseResponse(response) {
        let payload = await response.json().catch(function ignoreParseError() {
          return {};
        });

        if (!isActive) {
          return;
        }

        setCurrentUser(payload.user || null);
        setIsAuthReady(true);
      })
      .catch(function ignoreAuthError() {
        if (isActive) {
          setCurrentUser(null);
          setIsAuthReady(true);
        }
      });

    return function cleanupUserRequest() {
      isActive = false;
    };
  }, [pathname]);

  async function handleLogout() {
    try {
      setIsSigningOut(true);
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      let nextPath = currentUser?.role === "admin" ? "/admin/login" : "/sign-in";
      setCurrentUser(null);
      window.location.href = nextPath;
    }
  }

  function handleCloseLoginPrompt() {
    setHasDismissedLoginPrompt(true);

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("voice2action-login-prompt-dismissed", "true");
    }
  }

  function handleSignedIn(user) {
    setCurrentUser(user);
    setHasDismissedLoginPrompt(false);

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("voice2action-login-prompt-dismissed");
    }
  }

  let showLoginPrompt = isAuthReady && !currentUser && !hasDismissedLoginPrompt;

  return (
    <div className="min-h-screen bg-[#f6f7fb] lg:flex">
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={handleCloseLoginPrompt}
        onSignedIn={handleSignedIn}
      />

      <aside className="hidden w-[244px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 shadow-[0_16px_34px_rgba(37,99,235,0.34)]">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 9h16M6 9V7.5A1.5 1.5 0 0 1 7.5 6h9A1.5 1.5 0 0 1 18 7.5V9M5 9v8.5A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5V9M9 13h6M9 16h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">{title}</h1>
              <p className="text-xs font-medium text-slate-500">{subtitle}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-3 p-4">
          {navigationItems.map(function renderItem(item) {
            return (
              <NavigationLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                pathname={pathname}
              />
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          {currentUser ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  {currentUser.role === "admin" ? "Admin session" : "Signed in"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{currentUser.name}</p>
                <p className="text-xs text-slate-500">
                  {currentUser.role === "admin"
                    ? `${currentUser.departmentLabel} department`
                    : currentUser.email}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isSigningOut}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M10 17 5 12l5-5M5 12h10M15 5h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{isSigningOut ? "Signing out..." : "Logout"}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Link
                href="/sign-in"
                className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(37,99,235,0.24)] transition hover:bg-blue-700"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1">
        {showMobileHeader ? (
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Local Issue Voting Platform
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">{title}</p>
              </div>
              <Link
                href={currentUser ? "/report" : "/sign-in"}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                {currentUser ? "Report" : "Sign in"}
              </Link>
            </div>
          </header>
        ) : null}

        <div className="pb-24 lg:pb-0">{children}</div>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-5 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] lg:hidden">
          <div className="flex items-end justify-between">
            <Link
              href="/"
              className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
                pathname === "/" ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-md ${
                  pathname === "/" ? "bg-blue-600" : "bg-slate-300"
                }`}
              />
              Home
            </Link>

            <Link
              href="/map"
              className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
                pathname === "/map" ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-md ${
                  pathname === "/map" ? "bg-blue-600" : "bg-slate-300"
                }`}
              />
              Map
            </Link>

            <Link
              href={currentUser ? "/report" : "/sign-in"}
              className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl font-semibold text-white shadow-lg shadow-blue-600/35"
            >
              +
            </Link>

            <div className="flex flex-col items-center gap-1 text-[11px] font-medium text-slate-400">
              <span className="h-5 w-5 rounded-md bg-slate-300" />
              Alerts
            </div>

            <div className="flex flex-col items-center gap-1 text-[11px] font-medium text-slate-400">
              <span className="h-5 w-5 rounded-md bg-slate-300" />
              Profile
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
