import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/config/api";
import { MAX_TOTAL_PAGES, PRO_MAX_TOTAL_PAGES, MAX_QUESTIONS } from "./limits";

const defaultState = {
  questionsUsed: 0,
  pagesUsed: 0,
  isPro: false,
};

export function useUsageTracker() {
  const { user, isSignedIn } = useUser();
  const [usage, setUsage] = useState(defaultState);

  // The backend is authoritative for quota use, including anonymous IP usage.
  useEffect(() => {
    const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
    const request = isSignedIn && user?.id
      ? fetch(`${API_BASE}/auth/sync-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            email,
            name: user.fullName || user.firstName || "Developer",
            provider: user.externalAccounts?.[0]?.provider || "google",
          }),
        })
      : fetch(`${API_BASE}/usage`);

    request
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;

        const userData = data.user;
        const isProOrAdmin = userData && (
          userData.tier === "pro" ||
          userData.tier === "admin_unrestricted" ||
          userData.role === "admin"
        );
        
        setUsage((prev) => ({
          ...prev,
          isPro: Boolean(isProOrAdmin),
          pagesUsed: userData ? userData.pages_processed ?? 0 : data.pages_processed ?? 0,
          questionsUsed: userData ? userData.queries_made ?? 0 : data.queries_made ?? 0,
        }));
      })
      .catch((err) => console.error("Could not sync usage limits:", err));
  }, [isSignedIn, user]);

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