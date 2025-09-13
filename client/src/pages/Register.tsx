import { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DoodleBackground from '@/components/DoodleBackground';
import { CustomButton } from '@/components/ui/button';
import ImageUpload from '@/components/ui/image-upload';
import { useAuth } from '@/hooks/useAuth';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [phone, setPhone] = useState('+91 ');
    const [qualification, setQualification] = useState('');
    const [address, setAddress] = useState('');
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { register, isLoading, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            navigate('/projects', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);


    const clearFieldError = (field: string) => {
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Name validation
        if (!name.trim()) {
            newErrors.name = 'Full name is required';
        } else if (name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters long';
        }

        // Profile image validation
        if (!profileImageUrl) {
            newErrors.profileImageUrl = 'Profile image is required';
        }

        // Email validation
        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Date of birth validation
        if (!dateOfBirth) {
            newErrors.dateOfBirth = 'Date of birth is required';
        } else {
            const birthDate = new Date(dateOfBirth);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            if (age < 18 || age > 100) {
                newErrors.dateOfBirth = 'Age must be between 18 and 100 years';
            }
        }

        // Phone validation (accept E.164 format from react-phone-number-input)
        if (!phone || phone.length < 10) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^\+\d{10,15}$/.test(phone)) {
            newErrors.phone = 'Please enter a valid phone number';
        }

        // Qualification validation
        if (!qualification.trim()) {
            newErrors.qualification = 'Qualification is required';
        } else if (qualification.trim().length < 3) {
            newErrors.qualification = 'Qualification must be at least 3 characters long';
        }

        // Address validation
        if (!address.trim()) {
            newErrors.address = 'Address is required';
        } else if (address.trim().length < 10) {
            newErrors.address = 'Address must be at least 10 characters long';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        // Remove spaces from phone number for API
        const phoneForApi = phone.replace(/\s/g, '');

        try {
            await register({
                name,
                email,
                phone: phoneForApi,
                qualification,
                address,
                dob: dateOfBirth,
                profileImageUrl
            });

            toast.success('Registration successful! Your account is pending approval.');
            // Navigate to login
            navigate('/login');
        } catch (error) {
            toast.error((error as Error)?.message || 'Registration failed. Please try again.');
        }
    };

    return (
        <div className="flex min-h-[100dvh] min-w-screen bg-background overflow-hidden relative">
            <DoodleBackground numElements={10} />

            <div className="container relative z-10 flex min-h-full min-w-full items-center justify-center px-4 py-4">
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
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <label htmlFor="name" className="text-sm font-medium">
                                        Full Name *
                                    </label>
                                    <input
                                        id="name"
                                        placeholder="John Doe"
                                        type="text"
                                        autoComplete="name"
                                        disabled={isLoading}
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            clearFieldError('name');
                                        }}
                                        className={`flex h-10 w-full rounded-md border ${errors.name ? 'border-red-300' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                                        required
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-red-600">{errors.name}</p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <ImageUpload
                                        label="Profile Image *"
                                        value={profileImageUrl}
                                        onChange={(url) => {
                                            setProfileImageUrl(url);
                                            clearFieldError('profileImageUrl');
                                        }}
                                        placeholder="Upload your profile image"
                                        disabled={isLoading}
                                        variant="rounded"
                                        className="w-full"
                                    />
                                    {errors.profileImageUrl && (
                                        <p className="text-sm text-red-600">{errors.profileImageUrl}</p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <label htmlFor="email" className="text-sm font-medium">
                                        Email *
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
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            clearFieldError('email');
                                        }}
                                        className={`flex h-10 w-full rounded-md border ${errors.email ? 'border-red-300' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                                        required
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-red-600">{errors.email}</p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <label htmlFor="dateOfBirth" className="text-sm font-medium">
                                        Date of Birth *
                                    </label>
                                    <input
                                        id="dateOfBirth"
                                        type="date"
                                        disabled={isLoading}
                                        value={dateOfBirth}
                                        onChange={(e) => {
                                            setDateOfBirth(e.target.value);
                                            clearFieldError('dateOfBirth');
                                        }}
                                        className={`flex h-10 w-full rounded-md border ${errors.dateOfBirth ? 'border-red-300' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                                        required
                                    />
                                    {errors.dateOfBirth && (
                                        <p className="text-sm text-red-600">{errors.dateOfBirth}</p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <label htmlFor="phone" className="text-sm font-medium">
                                        Phone Number *
                                    </label>
                                    <PhoneInput
                                        id="phone"
                                        international
                                        defaultCountry="IN"
                                        value={phone}
                                        onChange={(value) => {
                                            setPhone(value || '');
                                            clearFieldError('phone');
                                        }}
                                        disabled={isLoading}
                                        className={`flex h-10 w-full rounded-md border ${errors.phone ? 'border-red-300' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                                        required
                                    />
                                    {errors.phone && (
                                        <p className="text-sm text-red-600">{errors.phone}</p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <label htmlFor="qualification" className="text-sm font-medium">
                                        Qualification *
                                    </label>
                                    <input
                                        id="qualification"
                                        placeholder="Bachelor's Degree in Education"
                                        type="text"
                                        disabled={isLoading}
                                        value={qualification}
                                        onChange={(e) => {
                                            setQualification(e.target.value);
                                            clearFieldError('qualification');
                                        }}
                                        className={`flex h-10 w-full rounded-md border ${errors.qualification ? 'border-red-300' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                                        required
                                    />
                                    {errors.qualification && (
                                        <p className="text-sm text-red-600">{errors.qualification}</p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <label htmlFor="address" className="text-sm font-medium">
                                        Address *
                                    </label>
                                    <textarea
                                        id="address"
                                        placeholder="123 Main St, City, Country"
                                        disabled={isLoading}
                                        value={address}
                                        onChange={(e) => {
                                            setAddress(e.target.value);
                                            clearFieldError('address');
                                        }}
                                        className={`flex h-20 w-full rounded-md border ${errors.address ? 'border-red-300' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                                        required
                                    />
                                    {errors.address && (
                                        <p className="text-sm text-red-600">{errors.address}</p>
                                    )}
                                </div>

                                <CustomButton
                                    type="submit"
                                    isLoading={isLoading}
                                    loadingMessage="Creating account..."
                                    className="bg-orange-600 hover:bg-orange-700 text-white w-full mt-2"
                                >
                                    Register
                                </CustomButton>
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