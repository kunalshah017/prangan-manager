import { useEffect, useState } from "react";
import {
    BadgeCheck,
    Building2,
    CalendarDays,
    CreditCard,
    GraduationCap,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Save,
    ShieldCheck,
    Users,
    X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";

import DoodleBackground from "@/components/DoodleBackground";
import LoadingButterfly from "@/components/LoadingButterfly";
import { CustomButton, ImageUpload, PersonNameFields, ProfilePicture, type PersonNameField } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateBankDetails, useUpdateMyProfile } from "@/hooks/useAuthQueries";
import { useCenter } from "@/hooks/useCenterQueries";
import { useProject } from "@/hooks/useProjectQueries";
import { useSemester } from "@/hooks/useSemesterQueries";
import { levelName } from "@/lib/levels";
import type { User } from "@/types/api";

type Assignment = NonNullable<User["roleAssignments"]>[number];

const formatLabel = (value: string) =>
    value
        .split("_")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" ");

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });

const maskAccountNumber = (value?: string | null) => {
    if (!value) return "Not added";
    return `•••• ${value.slice(-4)}`;
};

function AssignmentItem({ assignment }: { assignment: Assignment }) {
    const { data: project } = useProject(assignment.projectId || "");
    const { data: center } = useCenter(assignment.centerId || "");
    const { data: semester } = useSemester(assignment.semesterId || "");

    return (
        <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">{formatLabel(assignment.subRole)}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {[project?.name, center?.name, semester?.name].filter(Boolean).join(" · ") || "Loading scope…"}
                    </p>
                </div>
                <span className={assignment.isActive ? "text-xs font-semibold text-success" : "text-xs font-semibold text-muted-foreground"}>
                    {assignment.isActive ? "Active" : "Inactive"}
                </span>
            </div>
            {(assignment.semesterLevel || assignment.committedDays) && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {assignment.semesterLevel && <span>{levelName(assignment.semesterLevel)}</span>}
                    {assignment.committedDays && (
                        <span>{assignment.committedDays === "BOTH" ? "Saturday & Sunday" : formatLabel(assignment.committedDays)}</span>
                    )}
                </div>
            )}
        </article>
    );
}

export default function Profile() {
    const { user, isLoading } = useAuth();
    const location = useLocation();
    const updateProfile = useUpdateMyProfile();
    const updateBank = useUpdateBankDetails();
    const [editingProfile, setEditingProfile] = useState(false);
    const [editingPayment, setEditingPayment] = useState(false);
    const [isFetchingIfsc, setIsFetchingIfsc] = useState(false);
    const [ifscMessage, setIfscMessage] = useState<string | null>(null);
    const [canEditBankDetails, setCanEditBankDetails] = useState(true);
    const [profile, setProfile] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        phone: "",
        qualification: "",
        address: "",
        dob: "",
        profileImageUrl: "",
    });
    const [payment, setPayment] = useState({
        bankAccountNumber: "",
        confirmBankAccountNumber: "",
        bankAccountName: "",
        bankIfsc: "",
        bankName: "",
        bankBranch: "",
        upiId: "",
    });

    const resetForms = (currentUser: User) => {
        setProfile({
            firstName: currentUser.firstName ?? "",
            middleName: currentUser.middleName ?? "",
            lastName: currentUser.lastName ?? "",
            email: currentUser.email ?? "",
            phone: currentUser.phone ?? "",
            qualification: currentUser.qualification ?? "",
            address: currentUser.address ?? "",
            dob: currentUser.dob ? new Date(currentUser.dob).toISOString().slice(0, 10) : "",
            profileImageUrl: currentUser.profileImageUrl ?? "",
        });
        setPayment({
            bankAccountNumber: currentUser.bankAccountNumber ?? "",
            confirmBankAccountNumber: currentUser.bankAccountNumber ?? "",
            bankAccountName: currentUser.bankAccountName ?? "",
            bankIfsc: currentUser.bankIfsc ?? "",
            bankName: currentUser.bankName ?? "",
            bankBranch: currentUser.bankBranch ?? "",
            upiId: currentUser.upiId ?? "",
        });
    };

    useEffect(() => {
        if (user) resetForms(user);
    }, [user]);

    useEffect(() => {
        if (!user || location.hash !== "#payment") return;

        const frame = window.requestAnimationFrame(() => {
            document.getElementById("payment")?.scrollIntoView({ block: "start" });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [location.hash, user]);

    useEffect(() => {
        const ifsc = payment.bankIfsc.trim().toUpperCase();
        if (!editingPayment || !ifsc) {
            setIfscMessage(null);
            return;
        }
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
            setIfscMessage("Enter a valid IFSC to look up bank details.");
            return;
        }

        let cancelled = false;
        const timeout = window.setTimeout(async () => {
            setIsFetchingIfsc(true);
            try {
                const response = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(ifsc)}`);
                if (!response.ok) throw new Error("IFSC lookup failed");
                const data = (await response.json()) as { BANK?: string; BRANCH?: string };
                if (cancelled) return;
                setPayment((current) => ({ ...current, bankName: data.BANK ?? "", bankBranch: data.BRANCH ?? "" }));
                setCanEditBankDetails(!(data.BANK || data.BRANCH));
                setIfscMessage(data.BANK || data.BRANCH ? "Bank and branch filled from the IFSC." : "Enter bank and branch manually.");
            } catch {
                if (!cancelled) {
                    setCanEditBankDetails(true);
                    setIfscMessage("Bank lookup unavailable. Enter bank and branch manually.");
                }
            } finally {
                if (!cancelled) setIsFetchingIfsc(false);
            }
        }, 400);

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
        };
    }, [editingPayment, payment.bankIfsc]);

    if (isLoading || !user) {
        return <div className="flex min-h-[60dvh] items-center justify-center"><LoadingButterfly size="md" /></div>;
    }

    const cancelProfile = () => {
        resetForms(user);
        setEditingProfile(false);
    };

    const cancelPayment = () => {
        resetForms(user);
        setEditingPayment(false);
        setIfscMessage(null);
    };

    const saveProfile = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!profile.firstName.trim() || !profile.email.trim()) {
            toast.error("First name and email are required.");
            return;
        }
        try {
            await updateProfile.mutateAsync({
                ...profile,
                firstName: profile.firstName.trim(),
                middleName: profile.middleName.trim() || null,
                lastName: profile.lastName.trim() || null,
                dob: profile.dob || null,
                profileImageUrl: profile.profileImageUrl || null,
            });
            setEditingProfile(false);
            toast.success("Profile saved.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save profile.");
        }
    };

    const updateProfileName = (field: PersonNameField, value: string) => {
        setProfile((current) => ({ ...current, [field]: value }));
    };

    const updatePayment = (field: keyof typeof payment, value: string) => {
        if (field === "bankIfsc") {
            setPayment((current) => ({ ...current, bankIfsc: value.toUpperCase(), bankName: "", bankBranch: "" }));
            setCanEditBankDetails(true);
            setIfscMessage(null);
            return;
        }
        setPayment((current) => ({ ...current, [field]: value }));
    };

    const savePayment = async (event: React.FormEvent) => {
        event.preventDefault();
        if (payment.bankAccountNumber !== payment.confirmBankAccountNumber) {
            toast.error("Account numbers do not match.");
            return;
        }
        if (payment.bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(payment.bankIfsc.trim())) {
            toast.error("Enter a valid IFSC code.");
            return;
        }
        try {
            await updateBank.mutateAsync({
                bankAccountNumber: payment.bankAccountNumber || undefined,
                bankAccountName: payment.bankAccountName || undefined,
                bankIfsc: payment.bankIfsc || undefined,
                bankName: payment.bankName || undefined,
                bankBranch: payment.bankBranch || undefined,
                upiId: payment.upiId || undefined,
            });
            setEditingPayment(false);
            toast.success("Payment details saved.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save payment details.");
        }
    };

    return (
        <div className="relative w-full">
            <DoodleBackground animated={false} numElements={6} />
            <div className="relative z-10 mx-auto w-full max-w-6xl space-y-7 pb-8">
                <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <ProfilePicture imageUrl={user.profileImageUrl} name={user.name} size="lg" colorScheme="orange" />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-2xl font-semibold text-foreground sm:text-3xl">{user.name}</h1>
                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{user.role}</span>
                                <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">{user.status}</span>
                            </div>
                            <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
                        </div>
                    </div>
                    {!editingProfile && (
                        <button type="button" onClick={() => setEditingProfile(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto">
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            Edit profile
                        </button>
                    )}
                </header>

                <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
                    <div className="space-y-8 lg:col-span-8">
                        <section aria-labelledby="personal-title" className="border-b border-border pb-8">
                            <div className="mb-5 flex items-center justify-between gap-4">
                                <h2 id="personal-title" className="text-xl font-semibold text-foreground">Personal details</h2>
                                {editingProfile && <CancelButton onClick={cancelProfile} />}
                            </div>

                            {editingProfile ? (
                                <form onSubmit={saveProfile} className="space-y-5">
                                    <div className="grid gap-5 sm:grid-cols-[9rem_1fr]">
                                        <ImageUpload label="Profile image" value={profile.profileImageUrl} onChange={(profileImageUrl) => setProfile((current) => ({ ...current, profileImageUrl }))} onRemove={() => setProfile((current) => ({ ...current, profileImageUrl: "" }))} variant="rounded" />
                                        <div className="grid gap-4">
                                            <PersonNameFields
                                                idPrefix="profile"
                                                firstName={profile.firstName}
                                                middleName={profile.middleName}
                                                lastName={profile.lastName}
                                                onChange={updateProfileName}
                                                disabled={updateProfile.isPending}
                                            />
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                {([[
                                                    "email", "Email", "email",
                                                ], ["phone", "Phone", "tel"], ["qualification", "Qualification", "text"], ["dob", "Date of birth", "date"]] as const).map(([field, label, type]) => (
                                                    <label key={field} className="grid gap-1.5 text-sm font-medium text-foreground">
                                                        {label}
                                                        <input type={type} value={profile[field]} onChange={(event) => setProfile((current) => ({ ...current, [field]: event.target.value }))} className="min-h-11 rounded-md border border-input bg-background px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                                    </label>
                                                ))}
                                                <label className="grid gap-1.5 text-sm font-medium text-foreground sm:col-span-2">
                                                    Address
                                                    <textarea value={profile.address} onChange={(event) => setProfile((current) => ({ ...current, address: event.target.value }))} className="min-h-24 rounded-md border border-input bg-background p-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end"><CustomButton type="submit" isLoading={updateProfile.isPending}><Save className="mr-2 h-4 w-4" />Save profile</CustomButton></div>
                                </form>
                            ) : (
                                <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                                    <ProfileField icon={Mail} label="Email" value={user.email} />
                                    <ProfileField icon={Phone} label="Phone" value={user.phone || "Not added"} />
                                    <ProfileField icon={GraduationCap} label="Qualification" value={user.qualification || "Not added"} />
                                    <ProfileField icon={CalendarDays} label="Date of birth" value={user.dob ? formatDate(user.dob) : "Not added"} />
                                    <ProfileField icon={MapPin} label="Address" value={user.address || "Not added"} wide />
                                </dl>
                            )}
                        </section>

                        <section id="payment" aria-labelledby="payment-title" className="scroll-mt-24 border-b border-border pb-8">
                            <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 id="payment-title" className="text-xl font-semibold text-foreground">Payment details</h2>
                                    <p className="mt-1 text-sm text-muted-foreground">Used for approved reimbursements and remuneration.</p>
                                </div>
                                {!editingPayment ? (
                                    <button type="button" onClick={() => setEditingPayment(true)} className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"><Pencil className="h-4 w-4" aria-hidden="true" />Edit payment</button>
                                ) : <CancelButton onClick={cancelPayment} className="w-full justify-center sm:w-auto" />}
                            </div>

                            {editingPayment ? (
                                <form onSubmit={savePayment} className="space-y-5">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {([[
                                            "bankAccountNumber", "Account number", "password",
                                        ], ["confirmBankAccountNumber", "Confirm account number", "text"], ["bankAccountName", "Name on account", "text"], ["bankIfsc", "IFSC code", "text"], ["bankName", "Bank name", "text"], ["bankBranch", "Branch", "text"], ["upiId", "UPI ID", "text"]] as const).map(([field, label, type]) => (
                                            <label key={field} className="grid gap-1.5 text-sm font-medium text-foreground">
                                                {label}
                                                <input type={type} value={payment[field]} disabled={(field === "bankName" || field === "bankBranch") && !canEditBankDetails} onChange={(event) => updatePayment(field, event.target.value)} className="min-h-11 rounded-md border border-input bg-background px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:bg-muted" />
                                            </label>
                                        ))}
                                    </div>
                                    {(isFetchingIfsc || ifscMessage) && <p className="text-sm text-muted-foreground">{isFetchingIfsc ? "Looking up bank details…" : ifscMessage}</p>}
                                    <div className="flex justify-end"><CustomButton type="submit" isLoading={updateBank.isPending}><Save className="mr-2 h-4 w-4" />Save payment details</CustomButton></div>
                                </form>
                            ) : (
                                <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                                    <ProfileField icon={CreditCard} label="Account number" value={maskAccountNumber(user.bankAccountNumber)} />
                                    <ProfileField icon={BadgeCheck} label="Name on account" value={user.bankAccountName || "Not added"} />
                                    <ProfileField icon={ShieldCheck} label="IFSC" value={user.bankIfsc || "Not added"} />
                                    <ProfileField icon={Building2} label="Bank and branch" value={[user.bankName, user.bankBranch].filter(Boolean).join(" · ") || "Not added"} />
                                    <ProfileField icon={CreditCard} label="UPI ID" value={user.upiId || "Not added"} wide />
                                </dl>
                            )}
                        </section>
                    </div>

                    <aside className="space-y-8 lg:col-span-4">
                        {user.roleAssignments && user.roleAssignments.length > 0 && (
                            <section aria-labelledby="assignments-title">
                                <div className="mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" /><h2 id="assignments-title" className="text-lg font-semibold text-foreground">Role assignments</h2></div>
                                <div className="space-y-3">{user.roleAssignments.map((assignment) => <AssignmentItem key={assignment.id} assignment={assignment} />)}</div>
                            </section>
                        )}

                        <section aria-labelledby="account-title" className="border-t border-border pt-6">
                            <h2 id="account-title" className="text-lg font-semibold text-foreground">Account</h2>
                            <dl className="mt-4 grid grid-cols-2 gap-4">
                                <ProfileField icon={CalendarDays} label="Member since" value={formatDate(user.createdAt)} />
                                <ProfileField icon={CalendarDays} label="Last updated" value={formatDate(user.updatedAt)} />
                            </dl>
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
}

function CancelButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
    return <button type="button" onClick={onClick} className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}><X className="h-4 w-4" aria-hidden="true" />Cancel</button>;
}

function ProfileField({ icon: Icon, label, value, wide = false }: { icon: typeof Mail; label: string; value: string; wide?: boolean }) {
    return (
        <div className={wide ? "flex items-start gap-3 sm:col-span-2" : "flex items-start gap-3"}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0"><dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm text-foreground">{value}</dd></div>
        </div>
    );
}
