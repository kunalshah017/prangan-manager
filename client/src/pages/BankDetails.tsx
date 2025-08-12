import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateBankDetails } from '@/hooks/useAuthQueries';
import { AppVersion } from '@/components/AppVersion';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { CustomButton } from '@/components/ui/custom-button';
import { toast } from 'react-hot-toast';

// Lazy import QR decode/generate utilities without adding heavy deps to bundle size aggressively
// We'll attempt to use a lightweight dynamic import for qrcode for generation; for decoding, we'll use a canvas approach
type QRDecodeResult = { text: string } | null;

async function decodeQrFromImage(file: File): Promise<QRDecodeResult> {
    // Use a dynamic import of jsQR if available; fallback to null
    try {
        const jsQR = (await import('jsqr')).default as (
            data: Uint8ClampedArray,
            width: number,
            height: number
        ) => { data: string } | null;
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
            return { text: code.data as string };
        }
        return null;
    } catch (e) {
        console.error('QR decode failed', e);
        return null;
    }
}

async function generateQrDataUrl(text: string): Promise<string> {
    // Use qrcode library to generate data URL
    const QRCode = (await import('qrcode')).default as {
        toDataURL: (text: string, opts?: { margin?: number; scale?: number }) => Promise<string>;
    };
    return QRCode.toDataURL(text, { margin: 1, scale: 4 });
}

const BankDetails: React.FC = () => {
    const { user, isLoading } = useAuth();
    const updateMutation = useUpdateBankDetails();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        bankAccountNumber: '',
        confirmBankAccountNumber: '',
        bankAccountName: '',
        bankIfsc: '',
        bankName: '',
        bankBranch: '',
    });

    // Control bank name/branch inputs; default disabled until IFSC fetch succeeds or fails
    const [isFetchingIfsc, setIsFetchingIfsc] = useState(false);
    const [bankInputsDisabled, setBankInputsDisabled] = useState(true);
    const [ifscInfoMessage, setIfscInfoMessage] = useState<string | null>(null);
    const [lastFetchedIfsc, setLastFetchedIfsc] = useState<string | null>(null);
    const [upiSupported, setUpiSupported] = useState<boolean>(false);
    const [upiId, setUpiId] = useState<string>('');
    const [qrPreview, setQrPreview] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (user) {
            setForm((prev) => ({
                ...prev,
                bankAccountNumber: user.bankAccountNumber || '',
                confirmBankAccountNumber: user.bankAccountNumber || '',
                bankAccountName: user.bankAccountName || '',
                bankIfsc: user.bankIfsc || '',
                bankName: user.bankName || '',
                bankBranch: user.bankBranch || '',
            }));
            setUpiId(user.upiId || '');
            if (user.upiId) {
                // Pre-generate preview
                generateQrDataUrl(`upi://pay?pa=${encodeURIComponent(user.upiId)}`).then(setQrPreview).catch(() => setQrPreview(''));
            }
            // If user already has bank details, keep inputs disabled
            const hasBankData = !!(user.bankName || user.bankBranch);
            setBankInputsDisabled(hasBankData ? true : true);
            setIfscInfoMessage(hasBankData ? 'Bank details loaded from profile' : null);
        }
    }, [user]);

    const isValidIFSC = useMemo(() =>
        form.bankIfsc ? /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(form.bankIfsc.trim()) : true
        , [form.bankIfsc]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Normalize IFSC to uppercase as user types
        if (name === 'bankIfsc') {
            const upper = value.toUpperCase();
            // Reset bank fields when IFSC changes to avoid stale values
            setForm((prev) => ({
                ...prev,
                bankIfsc: upper,
                bankName: '',
                bankBranch: '',
            }));
            setIfscInfoMessage(null);
            setLastFetchedIfsc(null);
            setBankInputsDisabled(true);
            // Allow effect to handle fetching when valid
            return;
        }
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // Fetch bank details from Razorpay IFSC API as soon as IFSC becomes valid (debounced)
    useEffect(() => {
        const ifsc = form.bankIfsc.trim().toUpperCase();
        if (!ifsc) {
            setIfscInfoMessage(null);
            return;
        }
        const pattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!pattern.test(ifsc)) {
            setIfscInfoMessage('Enter a valid IFSC to fetch bank details');
            // Keep inputs disabled until we have a valid IFSC or explicit failure
            setBankInputsDisabled(true);
            return;
        }
        // Avoid re-fetching for the same IFSC
        if (lastFetchedIfsc === ifsc) return;

        const handle = setTimeout(async () => {
            setIsFetchingIfsc(true);
            setIfscInfoMessage(null);
            try {
                const res = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(ifsc)}`);
                setLastFetchedIfsc(ifsc);
                if (!res.ok) {
                    setIfscInfoMessage('Could not fetch details for this IFSC. Please enter bank and branch manually.');
                    setBankInputsDisabled(false);
                    return;
                }
                type IfscResponse = { BANK?: string; BRANCH?: string; UPI?: boolean };
                const data: IfscResponse = await res.json();
                const bank = data?.BANK ?? '';
                const branch = data?.BRANCH ?? '';
                if (bank || branch) {
                    setForm((prev) => ({ ...prev, bankName: bank, bankBranch: branch }));
                    setIfscInfoMessage('Bank details auto-filled from IFSC');
                    setBankInputsDisabled(true);
                } else {
                    setIfscInfoMessage('No bank info in response. Please enter manually.');
                    setBankInputsDisabled(false);
                }
                setUpiSupported(!!data?.UPI);
            } catch {
                setIfscInfoMessage('Network error fetching IFSC info. Please enter manually.');
                setBankInputsDisabled(false);
            } finally {
                setIsFetchingIfsc(false);
            }
        }, 400); // debounce

        return () => clearTimeout(handle);
    }, [form.bankIfsc, lastFetchedIfsc]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.bankAccountNumber && form.bankAccountNumber !== form.confirmBankAccountNumber) {
            toast.error('Account number and confirmation do not match');
            return;
        }
        if (form.bankIfsc && !isValidIFSC) {
            toast.error('Invalid IFSC code');
            return;
        }
        try {
            await updateMutation.mutateAsync({
                bankAccountNumber: form.bankAccountNumber || undefined,
                bankAccountName: form.bankAccountName || undefined,
                bankIfsc: form.bankIfsc ? form.bankIfsc.toUpperCase() : undefined,
                bankName: form.bankName || undefined,
                bankBranch: form.bankBranch || undefined,
                upiId: upiId || undefined,
            });
            toast.success('Bank details saved');
            navigate('/profile');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save';
            toast.error(message);
        }
    };

    const onQrUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const result = await decodeQrFromImage(file);
        if (!result || !result.text) {
            toast.error('Could not read QR. Try a clearer image.');
            return;
        }
        // Expect UPI QR: upi://pay?...&pa=<upiId>
        const text = result.text.trim();
        let extracted = '';
        try {
            if (text.startsWith('upi://')) {
                const url = new URL(text);
                extracted = url.searchParams.get('pa') || '';
            } else {
                // fallback basic parse
                const match = /(?:^|[?&])pa=([^&]+)/.exec(text);
                extracted = match ? decodeURIComponent(match[1]) : '';
            }
        } catch {
            extracted = '';
        }
        if (!extracted) {
            toast.error('QR does not contain a UPI ID (pa).');
            return;
        }
        setUpiId(extracted);
        const dataUrl = await generateQrDataUrl(`upi://pay?pa=${encodeURIComponent(extracted)}`);
        setQrPreview(dataUrl);
        toast.success('UPI ID extracted from QR');
    };

    if (isLoading) {
        return (
            <div className="min-h-[100dvh] w-full bg-background overflow-hidden relative flex items-center justify-center">
                <DoodleBackground numElements={10} />
                <div className="relative z-10">
                    <LoadingButterfly size="md" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-orange-50 to-amber-50 py-4 sm:py-6 md:py-8">
            <DoodleBackground numElements={8} />
            <div className="relative z-10 max-w-3xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
                <div className="mb-4 sm:mb-6">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/projects" className="text-xs sm:text-sm">Projects</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/profile" className="text-xs sm:text-sm">Profile</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-xs sm:text-sm">Bank Details</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                    <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
                        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Bank Details</h1>
                        <p className="text-sm text-gray-600 mb-6">
                            Please provide your correct bank details, so that renumation can be processed smoothly!
                        </p>
                        <form onSubmit={onSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="bankAccountNumber" className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                                    <input className="w-full border rounded-md px-3 py-2" name="bankAccountNumber" id="bankAccountNumber" value={form.bankAccountNumber} onChange={onChange} placeholder="Enter account number" />
                                </div>
                                <div>
                                    <label htmlFor="confirmBankAccountNumber" className="block text-sm font-medium text-gray-700 mb-1">Confirm Account Number</label>
                                    <input className="w-full border rounded-md px-3 py-2" name="confirmBankAccountNumber" id="confirmBankAccountNumber" value={form.confirmBankAccountNumber} onChange={onChange} placeholder="Re-enter account number" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="bankAccountName" className="block text-sm font-medium text-gray-700 mb-1">Name on Account</label>
                                    <input className="w-full border rounded-md px-3 py-2" name="bankAccountName" id="bankAccountName" value={form.bankAccountName} onChange={onChange} placeholder="As per bank records" />
                                </div>
                                <div>
                                    <label htmlFor="bankIfsc" className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                                    <input
                                        className="w-full border rounded-md px-3 py-2"
                                        name="bankIfsc"
                                        id="bankIfsc"
                                        value={form.bankIfsc}
                                        onChange={onChange}
                                        placeholder="e.g., HDFC0001234"
                                    />
                                    {isFetchingIfsc && (
                                        <p className="text-xs text-orange-600 mt-1">Fetching bank details…</p>
                                    )}
                                    {form.bankIfsc && !isValidIFSC && (
                                        <p className="text-xs text-red-600 mt-1">Invalid IFSC format</p>
                                    )}
                                    {ifscInfoMessage && isValidIFSC && !isFetchingIfsc && (
                                        <p className="text-xs text-gray-600 mt-1">{ifscInfoMessage}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                                    <input
                                        className="w-full border rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-600"
                                        name="bankName"
                                        id="bankName"
                                        value={form.bankName}
                                        onChange={onChange}
                                        placeholder="e.g., HDFC Bank"
                                        disabled={bankInputsDisabled}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="bankBranch" className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                    <input
                                        className="w-full border rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-600"
                                        name="bankBranch"
                                        id="bankBranch"
                                        value={form.bankBranch}
                                        onChange={onChange}
                                        placeholder="e.g., Andheri West"
                                        disabled={bankInputsDisabled}
                                    />
                                </div>
                            </div>

                            {(upiSupported || !!upiId) && (
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">UPI QR</label>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={onQrUploadChange}
                                            className="hidden"
                                        />
                                        <div className="flex flex-wrap gap-3 items-center">
                                            <CustomButton type="button" onClick={() => fileInputRef.current?.click()}>
                                                {upiId ? 'Re-upload UPI QR' : 'Upload UPI QR'}
                                            </CustomButton>
                                            {upiId && (
                                                <span className="text-sm text-gray-700">UPI ID: <span className="font-medium">{upiId}</span></span>
                                            )}
                                        </div>
                                        {upiId && (
                                            <div className="mt-3">
                                                {qrPreview && (
                                                    <img src={qrPreview} alt="UPI QR preview" className="w-40 h-40 border rounded" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <CustomButton type="submit" isLoading={updateMutation.isPending}>Save</CustomButton>
                            </div>
                        </form>

                        <div className="border-t border-gray-200 mt-6 pt-4">
                            <AppVersion />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BankDetails;
