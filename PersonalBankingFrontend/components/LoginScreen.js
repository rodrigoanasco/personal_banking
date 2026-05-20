"use client";

import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { login } from "@/lib/api";

export function LoginScreen({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login({ email, password });
      onLoggedIn(user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-mark">
          <LockKeyhole size={24} aria-hidden="true" />
        </div>
        <h1>Personal Banking Tracker</h1>
        <p>Sign in to view your accounts, transactions, and rules.</p>

        <label>
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button className="button primary" type="submit" disabled={loading}>
          <span>{loading ? "Signing in" : "Sign in"}</span>
        </button>

        {error ? <p className="inline-error">{error}</p> : null}
      </form>
    </main>
  );
}
