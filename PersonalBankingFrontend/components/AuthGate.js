"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, logout } from "@/lib/api";
import { AppShell } from "./AppShell";
import { LoadingBlock } from "./Feedback";
import { LoginScreen } from "./LoginScreen";

export function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    setCheckingSession(true);

    try {
      setUser(await getCurrentUser());
    } catch {
      setUser(null);
    } finally {
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  }

  if (checkingSession) {
    return (
      <main className="auth-page">
        <LoadingBlock label="Checking session" />
      </main>
    );
  }

  if (!user) {
    return <LoginScreen onLoggedIn={setUser} />;
  }

  return (
    <AppShell user={user} onLogout={handleLogout}>
      {children}
    </AppShell>
  );
}
