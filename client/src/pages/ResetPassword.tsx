import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "@/lib/api-client";
import { AccountTokenForm } from "./AccountTokenForm";

const ResetRequest = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await api.post<{ message: string }>("/users/password-reset", { email });
      toast.success(response.message);
    } catch {
      toast.success("If that account exists, a password reset link has been sent.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md items-center px-4">
      <form className="w-full space-y-5 rounded-lg border bg-white p-6 shadow-sm" onSubmit={submit}>
        <div>
          <h1 className="text-xl font-semibold">Reset your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your email and we will send a reset link if an account is eligible.</p>
        </div>
        <label className="block text-sm font-medium" htmlFor="email">Email</label>
        <input id="email" className="h-10 w-full rounded-md border px-3" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} required />
        <button className="h-10 w-full rounded-md bg-orange-600 text-white disabled:opacity-50" disabled={isSubmitting} type="submit">Send reset link</button>
        <Link className="block text-center text-sm text-orange-700" to="/login">Back to sign in</Link>
      </form>
    </main>
  );
};

export default function ResetPassword() {
  return new URLSearchParams(window.location.search).has("token")
    ? <AccountTokenForm mode="reset" />
    : <ResetRequest />;
}