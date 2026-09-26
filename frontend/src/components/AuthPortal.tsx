import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "../services/supabase";
import { apiFetch } from "../services/api";

interface AuthPortalProps {
  mode: "auth" | "onboarding";
  onBack?: () => void;
  onDemo?: () => void;
  onReady: () => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  mode,
  onBack,
  onDemo,
  onReady,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage("Check your email to confirm your account, then sign in.");
          setIsSignUp(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
      onReady();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleOnboarding = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/auth/bootstrap", {
        method: "POST",
        body: JSON.stringify({ clinicName, fullName }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.detail || "Clinic setup failed.");
      }
      onReady();
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Clinic setup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-stone-50 px-6 py-12 text-ink">
      <div className="mx-auto max-w-md">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-10 inline-flex items-center gap-2 text-sm font-bold text-ink/60 hover:text-ink"
          >
            <ArrowLeft size={16} />
            Back to Kizuna
          </button>
        )}

        <div className="mb-10 flex items-center gap-3">
          <img src="/logo.png" alt="" className="size-11 object-contain" />
          <span className="text-2xl font-black">Kizuna</span>
        </div>

        <section className="rounded-3xl border border-ink/10 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black text-balance">
            {mode === "onboarding"
              ? "Create your clinic workspace"
              : isSignUp
                ? "Start your clinic account"
                : "Welcome back"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">
            {mode === "onboarding"
              ? "Your patients, campaigns, settings, and WhatsApp conversations will be isolated inside this workspace."
              : "Sign in to your private Kizuna clinic workspace."}
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={mode === "onboarding" ? handleOnboarding : handleAuth}
          >
            {(mode === "onboarding" || isSignUp) && (
              <label className="block">
                <span className="mb-2 block text-sm font-bold">Your name</span>
                <span className="relative block">
                  <Building2 className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/35" />
                  <input
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="h-12 w-full rounded-xl border border-ink/15 bg-stone-50 pl-11 pr-4 outline-none focus:ring-2 focus:ring-marine"
                    placeholder="Dr. Ada Okafor"
                  />
                </span>
              </label>
            )}

            {mode === "onboarding" && (
              <label className="block">
                <span className="mb-2 block text-sm font-bold">Clinic name</span>
                <input
                  required
                  value={clinicName}
                  onChange={(event) => setClinicName(event.target.value)}
                  className="h-12 w-full rounded-xl border border-ink/15 bg-stone-50 px-4 outline-none focus:ring-2 focus:ring-marine"
                  placeholder="Harmony Veterinary Clinic"
                />
              </label>
            )}

            {mode === "auth" && (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold">Email</span>
                  <span className="relative block">
                    <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/35" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 w-full rounded-xl border border-ink/15 bg-stone-50 pl-11 pr-4 outline-none focus:ring-2 focus:ring-marine"
                      placeholder="you@clinic.com"
                    />
                  </span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold">Password</span>
                  <span className="relative block">
                    <LockKeyhole className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/35" />
                    <input
                      required
                      minLength={8}
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-12 w-full rounded-xl border border-ink/15 bg-stone-50 pl-11 pr-4 outline-none focus:ring-2 focus:ring-marine"
                      placeholder="At least 8 characters"
                    />
                  </span>
                </label>
              </>
            )}

            {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
            {message && <p className="text-sm font-semibold text-evergreen">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading
                ? "Please wait..."
                : mode === "onboarding"
                  ? "Create workspace"
                  : isSignUp
                    ? "Create account"
                    : "Sign in"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          {mode === "auth" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp((current) => !current);
                  setError("");
                  setMessage("");
                }}
                className="mt-6 w-full text-sm font-bold text-marine"
              >
                {isSignUp ? "Already have an account? Sign in" : "New to Kizuna? Create an account"}
              </button>
              {onDemo && (
                <div className="mt-6 border-t border-ink/10 pt-6">
                  <button
                    type="button"
                    onClick={onDemo}
                    className="flex h-12 w-full items-center justify-center rounded-xl border border-ink/15 bg-stone-50 font-bold text-ink hover:bg-stone-100"
                  >
                    Explore demo workspace
                  </button>
                  <p className="mt-2 text-center text-xs leading-5 text-ink/45">
                    Uses sample clinic data. No real messages are sent.
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
};
