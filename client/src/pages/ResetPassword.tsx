import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicFormShell } from "@/components/PublicFormShell";
import { api } from "@/lib/api-client";
import { publicInputClass, publicSubmitClass } from "@/lib/public-form-styles";
import { AccountTokenForm } from "./AccountTokenForm";

const ResetRequest = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post<{ message: string }>("/users/password-reset", { email });
    } catch {
      // The reply is the same either way, so nobody can probe which emails exist.
    } finally {
      setIsSubmitting(false);
      setSentTo(email.trim());
    }
  };

  if (sentTo) {
    return (
      <PublicFormShell
        title="Check your email"
        description={
          <>
            If <span className="font-medium text-foreground">{sentTo}</span> has an account, a reset link is on its way. It can take a few minutes; check spam too.
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <MailCheck className="h-10 w-10 text-primary" aria-hidden="true" />
          <Link to="/login" className={publicSubmitClass}>
            Back to sign in
          </Link>
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="min-h-11 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Use a different email
          </button>
        </div>
      </PublicFormShell>
    );
  }

  return (
    <PublicFormShell
      title="Reset your password"
      description="Enter your account email and we'll send you a reset link."
    >
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="email">Email</label>
          <input
            id="email"
            className={publicInputClass}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <button className={publicSubmitClass} disabled={isSubmitting} type="submit">
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </PublicFormShell>
  );
};

export default function ResetPassword() {
  return new URLSearchParams(window.location.search).has("token")
    ? <AccountTokenForm mode="reset" />
    : <ResetRequest />;
}
