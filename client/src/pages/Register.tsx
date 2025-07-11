import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import DoodleBackground from '@/components/DoodleBackground';
import { useAuthStore } from '@/stores/authStore';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [phone, setPhone] = useState('');
    const [qualification, setQualification] = useState('');
    const [address, setAddress] = useState('');
    const { register, isLoading, error, clearError } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        try {
            await register({
                name,
                email,
                phone,
                qualification,
                address,
                dob: dateOfBirth
            });

            // Navigate to login with success message
            navigate('/login', {
                state: {
                    message: 'Registration successful! Your account is pending approval.'
                }
            });
        } catch {
            // Error is handled by the auth store
        }
    };

    return (
        <div className="flex min-h-screen min-w-screen bg-background overflow-hidden relative">
            <DoodleBackground numElements={10} />

            <div className="container relative z-10 flex min-h-full min-w-full items-center justify-center px-4">
                <div className="mx-auto w-full max-w-md md:max-w-lg">
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
                            Create an account
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your details below to create your account
                        </p>
                    </div>

                    <motion.div
                        className="mt-8 grid gap-6 p-6 bg-white/80 rounded-lg border shadow-md mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        {error && (
                            <div className="bg-red-50 p-3 rounded-md border border-red-200 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <label htmlFor="name" className="text-sm font-medium">
                                        Full Name
                                    </label>
                                    <input
                                        id="name"
                                        placeholder="John Doe"
                                        type="text"
                                        autoComplete="name"
                                        disabled={isLoading}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                    />
                                </div>

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
                                    <label htmlFor="dateOfBirth" className="text-sm font-medium">
                                        Date of Birth
                                    </label>
                                    <input
                                        id="dateOfBirth"
                                        type="date"
                                        disabled={isLoading}
                                        value={dateOfBirth}
                                        onChange={(e) => setDateOfBirth(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <label htmlFor="phone" className="text-sm font-medium">
                                        Phone Number
                                    </label>
                                    <input
                                        id="phone"
                                        placeholder="+91 9876543210"
                                        type="tel"
                                        disabled={isLoading}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <label htmlFor="qualification" className="text-sm font-medium">
                                        Qualification
                                    </label>
                                    <input
                                        id="qualification"
                                        placeholder="Bachelor's Degree in Education"
                                        type="text"
                                        disabled={isLoading}
                                        value={qualification}
                                        onChange={(e) => setQualification(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <label htmlFor="address" className="text-sm font-medium">
                                        Address
                                    </label>
                                    <textarea
                                        id="address"
                                        placeholder="123 Main St, City, Country"
                                        disabled={isLoading}
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="flex h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={cn(
                                        buttonVariants({ size: "default" }),
                                        "font-medium bg-orange-600 hover:bg-orange-700 text-white w-full mt-2"
                                    )}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center justify-center">
                                            <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
                                            Creating account...
                                        </div>
                                    ) : (
                                        "Register"
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="text-center text-sm">
                            Already have an account?{" "}
                            <Link to="/login" className="font-medium text-orange-600 hover:text-orange-700">
                                Sign In
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Register; 