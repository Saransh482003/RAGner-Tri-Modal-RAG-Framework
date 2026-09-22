import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/config/api";
import { MAX_TOTAL_PAGES, PRO_MAX_TOTAL_PAGES, MAX_QUESTIONS } from "./limits";

const STORAGE_KEY = "ragner_usage_v1";

const defaultState = {
  questionsUsed: 0,
  pagesUsed: 0,
  isPro: false,
};

function loadState() {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

export function useUsageTracker() {
  const { user, isSignedIn } = useUser();
  const [usage, setUsage] = useState(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUsage(loadState());
    setHydrated(true);
  }, []);

  // Sync the user AND get the admin/pro status in a single request!
  useEffect(() => {
    if (!isSignedIn || !user?.id) return;

    fetch(`${API_BASE}/auth/sync-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        name: user.fullName || user.firstName || "Developer",
        provider: user.externalAccounts?.[0]?.provider || "google",
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.user) return;
        
        const userData = data.user;
        // If the DB says you are an admin, instantly unlock everything
        const isProOrAdmin = userData.tier === "pro" || userData.tier === "admin_unrestricted" || userData.role === "admin";
        
        setUsage((prev) => ({
          ...prev,
          isPro: isProOrAdmin,
          pagesUsed: userData.pages_processed || prev.pagesUsed,
          questionsUsed: userData.queries_made || prev.questionsUsed,
        }));
      })
      .catch((err) => console.error("Could not sync user limits:", err));
  }, [isSignedIn, user]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  }, [usage, hydrated]);

  const incrementQuestions = useCallback(() => {
    setUsage((prev) => ({ ...prev, questionsUsed: prev.questionsUsed + 1 }));
  }, []);

  const addPages = useCallback((count) => {
    setUsage((prev) => ({ ...prev, pagesUsed: prev.pagesUsed + count }));
  }, []);

  const simulateUpgrade = useCallback(() => {
    setUsage((prev) => ({ ...prev, isPro: true }));
  }, []);

  const pageCap = usage.isPro ? PRO_MAX_TOTAL_PAGES : MAX_TOTAL_PAGES;
  const questionsLocked = !usage.isPro && usage.questionsUsed >= MAX_QUESTIONS;
  const pagesRemaining = Math.max(0, pageCap - usage.pagesUsed);

  return {
    ...usage,
    pageCap,
    questionsLocked,
    pagesRemaining,
    incrementQuestions,
    addPages,
    simulateUpgrade,
  };
}