import { useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { PublicFormShell } from "@/components/PublicFormShell";
import { api } from "@/lib/api-client";
import { publicInputClass, publicSubmitClass } from "@/lib/public-form-styles";

export const AccountTokenForm = ({ mode }: { mode: "activate" | "reset" }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [tokenCaptured, setTokenCaptured] = useState(false);
  const hasCapturedToken = useRef(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showActivationRecovery, setShowActivationRecovery] = useState(false);
  const navigate = useNavigate();
  const title =
    mode === "activate" ? "Activate your account" : "Reset your password";
  const endpoint =
    mode === "activate" ? "/users/activate" : "/users/password-reset/complete";

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
      toast.error(
        "Use a valid link and a password with at least 12 characters.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(endpoint, { token, password });
      toast.success(
        mode === "activate"
          ? "Account activated. Please sign in."
          : "Password reset. Please sign in.",
      );
      navigate("/login", { replace: true });
    } catch (error) {
      if (mode === "activate") setShowActivationRecovery(true);
      toast.error(
        error instanceof Error ? error.message : "Unable to update password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tokenCaptured) return null;

  const remaining = Math.max(0, 12 - password.length);

  return (
    <PublicFormShell
      title={title}
      description="Choose a password with at least 12 characters."
    >
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="password">
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              className={`${publicInputClass} pr-12`}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={12}
              aria-describedby="password-hint"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
          <p
            id="password-hint"
            aria-live="polite"
            className="text-sm text-muted-foreground"
          >
            {remaining > 0
              ? `${remaining} more ${remaining === 1 ? "character" : "characters"} needed`
              : "Length looks good"}
          </p>
        </div>
        {showActivationRecovery && (
          <div
            className="rounded-md border border-primary/30 bg-accent p-4 text-sm text-foreground"
            role="alert"
          >
            <p>
              This activation link may have expired, already been used, or been
              replaced.
            </p>
            <Link
              className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline decoration-2 underline-offset-4 hover:text-primary/80 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              to="/reset-password"
            >
              Request a new password link
            </Link>
          </div>
        )}
        <button
          className={publicSubmitClass}
          disabled={isSubmitting}
          type="submit"
        >
          {mode === "activate" ? "Activate account" : "Reset password"}
        </button>
      </form>
    </PublicFormShell>
  );
};
