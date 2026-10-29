import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CircleAlert, Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import DoodleBackground from '@/components/DoodleBackground';
import { StandalonePageNavigation } from '@/components/StandalonePageNavigation';
import { CustomButton } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { readLoginPrefill } from '@/lib/login-params';
import { ThemedLogo } from "@/components/ThemedLogo";

const Login = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Prefill email from approval links.
  useEffect(() => {
    const { email: emailParam } = readLoginPrefill(searchParams);

    if (emailParam) {
      setEmail(emailParam);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('email');

      navigate(
        { search: newSearchParams.toString() },
        { replace: true }
      );
    }
  }, [searchParams, navigate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/projects', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    try {
      await login({ email, password });
      toast.success('Welcome!');
      // Navigate to projects page on successful login
      navigate('/projects');
    } catch (error) {
      setLoginError((error as Error)?.message || "Sign in didn't work. Try again.");
    }
  };

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-5 sm:px-6 sm:py-8">
      <DoodleBackground numElements={10} />
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col justify-center">
        <StandalonePageNavigation
          parentHref="/"
          parentLabel="Welcome"
          currentLabel="Sign in"
          backLabel="Back to welcome"
          className="mb-8"
        />
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <div className="flex flex-col items-start space-y-5">
            <Link to="/" className="flex items-center gap-3">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <ThemedLogo className="h-12" />
              </motion.div>
              <span className="border-l border-primary/30 pl-3 text-sm font-medium text-muted-foreground">Prangan Manager workspace</span>
            </Link>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Use your approved account email to continue.</p>
            </div>
          </div>
          <motion.div
            className="mt-8 grid gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                {loginError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm leading-6 text-foreground"
                  >
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                    <p>{loginError}</p>
                  </div>
                )}
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="email"
                    placeholder="name@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-md border border-input bg-card px-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    <Link to="/reset-password" className="text-sm text-primary hover:text-primary">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      disabled={isLoading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 w-full rounded-md border border-input bg-card px-3 pr-12 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex h-12 w-12 items-center justify-center text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={isLoading}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <CustomButton
                  type="submit"
                  isLoading={isLoading}
                  loadingMessage="Signing in..."
                  className="h-12 w-full bg-orange-600 text-base text-white hover:bg-orange-700"
                >
                  <LogIn className="mr-2 h-5 w-5" /> Sign in
                </CustomButton>
              </div>
            </form>

            <div className="text-center text-sm">
              Don't have an account?{" "}
              <Link to="/register" className="font-medium text-primary hover:text-primary">
                Register
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
};

export default Login;
