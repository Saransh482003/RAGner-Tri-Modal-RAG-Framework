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

  useEffect(() => {
    if (!isSignedIn || !user?.id) return;

    fetch(`${API_BASE}/auth/user/${encodeURIComponent(user.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const isProOrAdmin = data.tier === "pro" || data.tier === "admin_unrestricted" || data.role === "admin";
        setUsage((prev) => ({
          ...prev,
          isPro: isProOrAdmin,
          pagesUsed: data.pages_processed || prev.pagesUsed,
          questionsUsed: data.queries_made || prev.questionsUsed,
        }));
      })
      .catch((err) => console.error("Could not fetch server limits:", err));
  }, [isSignedIn, user?.id]);

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
