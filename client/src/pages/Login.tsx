import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import DoodleBackground from '@/components/DoodleBackground';
import { CustomButton } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { readLoginPrefill } from '@/lib/login-params';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login({ email, password });
      toast.success('Welcome!');
      // Navigate to projects page on successful login
      navigate('/projects');
    } catch (error) {
      toast.error((error as Error)?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <main className="min-h-[100dvh] bg-orange-50/60 px-4 py-5 sm:px-6 sm:py-8">
      <DoodleBackground numElements={10} />
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col justify-center">
        <Link to="/" className="mb-8 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-orange-800 hover:text-orange-950">
          <ArrowLeft className="h-4 w-4" /> Back to welcome
        </Link>
        <section className="border border-orange-100 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col items-start space-y-5">
            <Link to="/" className="flex items-center gap-3">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <img
                  src="/images/logo/prangan-logo-light-mode.png"
                  alt="Prangan Logo"
                  className="h-12"
                />
              </motion.div>
              <span className="border-l border-orange-200 pl-3 text-sm font-medium text-gray-600">Prangan Manager workspace</span>
            </Link>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Sign in</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">Use your approved account email to continue.</p>
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
                    className="h-12 w-full rounded-md border border-input bg-white px-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    <Link to="/reset-password" className="text-sm text-orange-600 hover:text-orange-700">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      disabled={isLoading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 w-full rounded-md border border-input bg-white px-3 pr-12 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex h-12 w-12 items-center justify-center text-gray-500 hover:text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
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
              <Link to="/register" className="font-medium text-orange-600 hover:text-orange-700">
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