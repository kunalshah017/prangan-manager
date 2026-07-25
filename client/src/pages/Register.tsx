import { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DoodleBackground from '@/components/DoodleBackground';
import { StandalonePageNavigation } from '@/components/StandalonePageNavigation';
import { CustomButton } from '@/components/ui/button';
import ImageUpload from '@/components/ui/image-upload';
import { PersonNameFields, type PersonNameField } from '@/components/ui/person-name-fields';
import { useAuth } from '@/hooks/useAuth';

const Register = () => {
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
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

        if (!firstName.trim()) {
            newErrors.firstName = 'First name is required';
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
                firstName: firstName.trim(),
                middleName: middleName.trim() || null,
                lastName: lastName.trim() || null,
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

    const handleNameChange = (field: PersonNameField, value: string) => {
        if (field === 'firstName') setFirstName(value);
        if (field === 'middleName') setMiddleName(value);
        if (field === 'lastName') setLastName(value);
        clearFieldError(field);
    };

    return (
        <main className="min-h-[100dvh] bg-orange-50/60 px-4 py-5 sm:px-6 sm:py-8">
            <DoodleBackground numElements={10} />
            <div className="relative z-10 mx-auto w-full max-w-2xl">
                <StandalonePageNavigation
                    parentHref="/"
                    parentLabel="Welcome"
                    currentLabel="Register"
                    backLabel="Back to welcome"
                    className="mb-6"
                />
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
                            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Register for Prangan</h1>
                            <p className="mt-2 text-sm leading-6 text-gray-600">Share your details to request access to the workspace.</p>
                        </div>
                    </div>

                    <motion.div
                        className="mt-8 grid gap-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <PersonNameFields
                                    idPrefix="registration"
                                    firstName={firstName}
                                    middleName={middleName}
                                    lastName={lastName}
                                    onChange={handleNameChange}
                                    errors={{ firstName: errors.firstName }}
                                    disabled={isLoading}
                                    className="sm:col-span-2"
                                />

                                <div className="grid gap-2 sm:col-span-2">
                                    <ImageUpload
                                        label="Profile Image"
                                        required
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
                                        <p className="text-sm text-red-600" role="alert">{errors.profileImageUrl}</p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <label htmlFor="email" className="text-sm font-medium">
                                        Email <span className="ml-1 text-destructive" aria-hidden="true">*</span>
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
                                        className={`h-12 w-full rounded-md border ${errors.email ? 'border-red-500' : 'border-input'} bg-white px-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                                        required
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-red-600" role="alert">{errors.email}</p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <label htmlFor="dateOfBirth" className="text-sm font-medium">
                                        Date of Birth <span className="ml-1 text-destructive" aria-hidden="true">*</span>
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
                                        className={`h-12 w-full rounded-md border ${errors.dateOfBirth ? 'border-red-500' : 'border-input'} bg-white px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                                        required
                                    />
                                    {errors.dateOfBirth && (
                                        <p className="text-sm text-red-600" role="alert">{errors.dateOfBirth}</p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <label htmlFor="phone" className="text-sm font-medium">
                                        Phone Number <span className="ml-1 text-destructive" aria-hidden="true">*</span>
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
                                        className={`flex h-12 w-full rounded-md border ${errors.phone ? 'border-red-500' : 'border-input'} bg-white px-3 text-base focus-within:ring-2 focus-within:ring-orange-500 focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                                        required
                                    />
                                    {errors.phone && (
                                        <p className="text-sm text-red-600" role="alert">{errors.phone}</p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <label htmlFor="qualification" className="text-sm font-medium">
                                        Qualification <span className="ml-1 text-destructive" aria-hidden="true">*</span>
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
                                        className={`h-12 w-full rounded-md border ${errors.qualification ? 'border-red-500' : 'border-input'} bg-white px-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                                        required
                                    />
                                    {errors.qualification && (
                                        <p className="text-sm text-red-600" role="alert">{errors.qualification}</p>
                                    )}
                                </div>

                                <div className="grid gap-2 sm:col-span-2">
                                    <label htmlFor="address" className="text-sm font-medium">
                                        Address <span className="ml-1 text-destructive" aria-hidden="true">*</span>
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
                                        className={`min-h-28 w-full rounded-md border ${errors.address ? 'border-red-500' : 'border-input'} bg-white px-3 py-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                                        required
                                    />
                                    {errors.address && (
                                        <p className="text-sm text-red-600" role="alert">{errors.address}</p>
                                    )}
                                </div>

                                <CustomButton
                                    type="submit"
                                    isLoading={isLoading}
                                    loadingMessage="Creating account..."
                                    className="h-12 w-full bg-orange-600 text-base text-white hover:bg-orange-700 sm:col-span-2"
                                >
                                    <UserPlus className="mr-2 h-5 w-5" /> Submit registration
                                </CustomButton>
                            </div>
                        </form>

                        <div className="flex items-center gap-2 border-t border-orange-100 pt-5 text-sm text-gray-600">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-orange-600" />
                            Already have an account?{" "}
                            <Link to="/login" className="font-medium text-orange-600 hover:text-orange-700">
                                Sign In
                            </Link>
                        </div>
                    </motion.div>
                </section>
            </div>
        </main>
    );
};

export default Register;
