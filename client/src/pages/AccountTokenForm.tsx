import { useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "@/lib/api-client";

export const AccountTokenForm = ({ mode }: { mode: "activate" | "reset" }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [tokenCaptured, setTokenCaptured] = useState(false);
  const hasCapturedToken = useRef(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      toast.error("Use a valid link and a password with at least 12 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(endpoint, { token, password });
      toast.success(mode === "activate" ? "Account activated. Please sign in." : "Password reset. Please sign in.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tokenCaptured) return null;

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md items-center px-4">
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
        <button className="h-10 w-full rounded-md bg-orange-600 text-white disabled:opacity-50" disabled={isSubmitting} type="submit">
          {mode === "activate" ? "Activate account" : "Reset password"}
        </button>
        <Link className="block text-center text-sm text-orange-700" to="/login">Back to sign in</Link>
      </form>
    </main>
  );
};