import { useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { StandalonePageNavigation } from "@/components/StandalonePageNavigation";
import { api } from "@/lib/api-client";

export const AccountTokenForm = ({ mode }: { mode: "activate" | "reset" }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [tokenCaptured, setTokenCaptured] = useState(false);
  const hasCapturedToken = useRef(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActivationRecovery, setShowActivationRecovery] = useState(false);
  const navigate = useNavigate();
  const title = mode === "activate" ? "Activate your account" : "Reset your password";
  const endpoint = mode === "activate" ? "/users/activate" : "/users/password-reset/complete";

  useLayoutEffect(() => {
    if (hasCapturedToken.current) return;

    hasCapturedToken.current = true;
    setToken(searchParams.get("token"));
    setTokenCaptured(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || password.length < 12) {
      if (mode === "activate" && !token) setShowActivationRecovery(true);
      toast.error("Use a valid link and a password with at least 12 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(endpoint, { token, password });
      toast.success(mode === "activate" ? "Account activated. Please sign in." : "Password reset. Please sign in.");
      navigate("/login", { replace: true });
    } catch (error) {
      if (mode === "activate") setShowActivationRecovery(true);
      toast.error(error instanceof Error ? error.message : "Unable to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tokenCaptured) return null;

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md items-center px-4 py-5">
      <div className="w-full">
        <StandalonePageNavigation
          parentHref="/login"
          parentLabel="Sign in"
          currentLabel={title}
          backLabel="Back to sign in"
          className="mb-6"
        />
        <form className="w-full space-y-5 rounded-lg border bg-white p-6 shadow-sm" onSubmit={submit}>
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose a password with at least 12 characters.</p>
          </div>
          <label className="block text-sm font-medium" htmlFor="password">New password</label>
          <input
            id="password"
            className="h-10 w-full rounded-md border px-3"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            required
          />
          {showActivationRecovery && (
            <div
              className="rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950"
              role="alert"
            >
              <p>
                This activation link may have expired, already been used, or been
                replaced.
              </p>
              <Link
                className="mt-2 inline-flex min-h-11 items-center font-semibold text-orange-800 underline decoration-2 underline-offset-4 hover:text-orange-950 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2"
                to="/reset-password"
              >
                Request a new password link
              </Link>
            </div>
          )}
          <button className="h-10 w-full rounded-md bg-orange-600 text-white disabled:opacity-50" disabled={isSubmitting} type="submit">
            {mode === "activate" ? "Activate account" : "Reset password"}
          </button>
        </form>
      </div>
    </main>
  );
};
