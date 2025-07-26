import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import DoodleBackground from '@/components/DoodleBackground';
import { CustomButton } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const Login = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Check for URL parameters and prefill inputs
  useEffect(() => {
    const emailParam = searchParams.get('email');
    const passwordParam = searchParams.get('password');

    if (emailParam) {
      setEmail(emailParam);
    }
    if (passwordParam) {
      setPassword(passwordParam);
      // Show password when prefilled from URL
      setShowPassword(true);
    }

    // Clear URL parameters after prefilling for security
    if (emailParam || passwordParam) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('email');
      newSearchParams.delete('password');

      // Replace the current URL without the sensitive parameters
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
    <div className="min-h-[100dvh] min-w-screen bg-background overflow-hidden relative">
      <DoodleBackground numElements={10} />

      <div className="container relative z-10 flex min-h-[100dvh] min-w-full items-center justify-center px-4 py-16">
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
                    {/* <Link to="/forgot-password" className="text-sm text-orange-600 hover:text-orange-700">
                      Forgot password?
                    </Link> */}
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
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center justify-center w-10 h-10 text-gray-500 hover:text-gray-700 focus:outline-none"
                      disabled={isLoading}
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
                  className="bg-orange-600 hover:bg-orange-700 text-white w-full"
                >
                  Sign In
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
        </div>
      </div>
    </div>
  );
};

export default Login; 