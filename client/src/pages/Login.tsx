import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import { useAuth } from '@/hooks/useAuth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, loginError, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/projects', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login({ email, password });
      // Navigate to projects page on successful login
      navigate('/projects');
    } catch {
      // Error is handled by the useAuth hook
    }
  };

  return (
    <div className="min-h-screen min-w-screen bg-background overflow-hidden relative">
      <DoodleBackground numElements={10} />

      <div className="container relative z-10 flex min-h-screen min-w-full items-center justify-center px-4 py-16">
        <div className="mx-auto w-full max-w-md flex flex-col items-center">
          <div className="flex flex-col items-center space-y-4 text-center">
            <Link to="/" className="inline-block mb-2">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <img
                  src="/images/logo/prangan-logo-light-mode.png"
                  alt="Prangan Logo"
                  className="h-16"
                />
              </motion.div>
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email below to sign in to your account
            </p>
          </div>

          <motion.div
            className="mt-8 grid gap-6 p-6 bg-white/80 rounded-lg border shadow-md w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {loginError && (
              <div className="bg-red-50 p-3 rounded-md border border-red-200 text-red-700 text-sm">
                {loginError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
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
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-sm text-orange-600 hover:text-orange-700">
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    id="password"
                    placeholder="••••••••"
                    type="password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    buttonVariants({ size: "default" }),
                    "font-medium bg-orange-600 hover:bg-orange-700 text-white w-full"
                  )}
                >
                  {isLoading ? (
                    <LoadingButterfly size="sm" message="Signing in..." />
                  ) : (
                    "Sign In"
                  )}
                </button>
              </div>
            </form>

            <div className="text-center text-sm">
              Don't have an account?{" "}
              <Link to="/register" className="font-medium text-orange-600 hover:text-orange-700">
                Register
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login; 