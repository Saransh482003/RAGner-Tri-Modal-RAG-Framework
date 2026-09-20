import { useState, useEffect, useCallback } from "react";
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
  const [usage, setUsage] = useState(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUsage(loadState());
    setHydrated(true);
  }, []);

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

  // SIMULATED CHECKOUT -- replace with a real Stripe Checkout redirect + webhook
  // that flips this flag server-side once payment is confirmed.
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
