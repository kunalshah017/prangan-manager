import { useEffect, useState } from "react";
import { Pencil, Save } from "lucide-react";
import toast from "react-hot-toast";

import LoadingButterfly from "@/components/LoadingButterfly";
import { CustomButton, ImageUpload } from "@/components/ui";
import { Input } from "@/components/ui/form-controls";
import { PersonDetailsFields } from "@/components/users/PersonDetailsFields";
import { DetailList, UserProfileView } from "@/components/users/UserProfileView";
import { FormField } from "@/components/workspace/FormParts";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateBankDetails, useUpdateMyProfile } from "@/hooks/useAuthQueries";
import type { User } from "@/types/api";
import { formatCalendarDate } from "@/lib/dates";

const maskAccountNumber = (value?: string | null) => {
    if (!value) return "Not added";
    return `•••• ${value.slice(-4)}`;
};

export default function Profile() {
    const { user, isLoading } = useAuth();
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
            dob: currentUser.dob ? currentUser.dob.slice(0, 10) : "",
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

    const editButton = (label: string, onClick: () => void) => (
        <button type="button" onClick={onClick} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-input px-3 text-sm font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {label}
        </button>
    );
    const formButtons = (onCancel: () => void, isPending: boolean, label: string) => (
        <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="inline-flex min-h-12 items-center rounded-md px-5 text-base font-medium text-muted-foreground hover:bg-accent">Cancel</button>
            <CustomButton type="submit" isLoading={isPending} className="min-h-12 flex-1 text-base sm:flex-none"><Save className="mr-2 h-4 w-4" aria-hidden="true" />{label}</CustomButton>
        </div>
    );

    const about = editingProfile ? (
        <form onSubmit={saveProfile} className="space-y-5 rounded-xl border border-border bg-card p-4">
            <ImageUpload label="Profile photo" value={profile.profileImageUrl} onChange={(profileImageUrl) => setProfile((current) => ({ ...current, profileImageUrl }))} onRemove={() => setProfile((current) => ({ ...current, profileImageUrl: "" }))} variant="rounded" />
            <PersonDetailsFields
                idPrefix="profile"
                values={profile}
                onChange={(field, value) => setProfile((current) => ({ ...current, [field]: value }))}
                disabled={updateProfile.isPending}
                emailReadOnly={user.role !== "ADMIN"}
            />
            {formButtons(cancelProfile, updateProfile.isPending, "Save details")}
        </form>
    ) : (
        <div>
            {editButton("Edit details", () => setEditingProfile(true))}
            <DetailList items={[
                { label: "Phone", value: user.phone || "Not added" },
                { label: "Qualification", value: user.qualification || "Not added" },
                { label: "Date of birth", value: user.dob ? formatCalendarDate(user.dob) : "Not added" },
                { label: "Address", value: user.address || "Not added", wide: true },
            ]} />
        </div>
    );

    const payments = editingPayment ? (
        <form onSubmit={savePayment} className="space-y-5 rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Used to pay your remuneration and approved reimbursements.</p>
            <div className="grid gap-4 sm:grid-cols-2">
                {([["bankAccountNumber", "Account number", "password"], ["confirmBankAccountNumber", "Confirm account number", "text"], ["bankAccountName", "Name on account", "text"], ["bankIfsc", "IFSC code", "text"], ["bankName", "Bank name", "text"], ["bankBranch", "Branch", "text"], ["upiId", "UPI ID", "text"]] as const).map(([field, label, type]) => (
                    <FormField key={field} htmlFor={`payment-${field}`} label={label}>
                        <Input id={`payment-${field}`} type={type} value={payment[field]} disabled={(field === "bankName" || field === "bankBranch") && !canEditBankDetails} onChange={(event) => updatePayment(field, event.target.value)} />
                    </FormField>
                ))}
            </div>
            {(isFetchingIfsc || ifscMessage) && <p className="text-sm text-muted-foreground" aria-live="polite">{isFetchingIfsc ? "Looking up bank details…" : ifscMessage}</p>}
            {formButtons(cancelPayment, updateBank.isPending, "Save payment details")}
        </form>
    ) : (
        <div>
            {editButton("Edit payment details", () => setEditingPayment(true))}
            <DetailList items={[
                { label: "Account number", value: maskAccountNumber(user.bankAccountNumber) },
                { label: "Name on account", value: user.bankAccountName || "Not added" },
                { label: "IFSC", value: user.bankIfsc || "Not added" },
                { label: "Bank and branch", value: [user.bankName, user.bankBranch].filter(Boolean).join(", ") || "Not added" },
                { label: "UPI ID", value: user.upiId || "Not added", wide: true },
            ]} />
        </div>
    );

    return <UserProfileView user={user} isSelf title="Profile" about={about} payments={payments} />;
}
