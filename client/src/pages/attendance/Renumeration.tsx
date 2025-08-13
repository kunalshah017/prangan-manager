import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import { useAttendanceRecords } from '@/hooks/useAttendanceQueries';
import type { AttendanceRecord } from '@/types/api';
import { useUsers } from '@/hooks/useUserQueries';
import type { User } from '@/types/api';
import { Copy as CopyIcon, Check as CheckIcon } from 'lucide-react';
import { useSemester } from '@/hooks/useSemesterQueries';

// Simple INR formatter
const formatINR = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const getMonthRange = (yyyyMm: string) => {
    // yyyyMm expected like "2025-08"
    const [y, m] = yyyyMm.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0)); // last day of month
    const toDateOnly = (d: Date) => d.toISOString().slice(0, 10);
    return { startDate: toDateOnly(start), endDate: toDateOnly(end) };
};

const clampRangeToSemester = (
    range: { startDate: string; endDate: string },
    sem?: { startDate?: string; endDate?: string }
) => {
    if (!sem?.startDate || !sem?.endDate) return range;
    const maxStart = new Date(
        Math.max(new Date(range.startDate + 'T00:00:00Z').getTime(), new Date(sem.startDate).getTime())
    );
    const minEnd = new Date(
        Math.min(new Date(range.endDate + 'T23:59:59Z').getTime(), new Date(sem.endDate).getTime())
    );
    const toDateOnly = (d: Date) => d.toISOString().slice(0, 10);
    return { startDate: toDateOnly(maxStart), endDate: toDateOnly(minEnd) };
};

const enumerateMonths = (semStart: string, semEnd: string) => {
    // Returns array of { value: 'YYYY-MM', label: 'MMM yyyy' }
    const start = new Date(semStart);
    const end = new Date(semEnd);
    // Normalize to first day of month UTC for start, and first day for iterating
    const iter = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const endIter = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    const months: { value: string; label: string }[] = [];
    const toValue = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const toLabel = (d: Date) => d.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    while (iter.getTime() <= endIter.getTime()) {
        months.push({ value: toValue(iter), label: toLabel(iter) });
        // advance 1 month
        iter.setUTCMonth(iter.getUTCMonth() + 1);
    }
    return months;
};

export const Renumeration: React.FC = () => {
    const { projectId, centerId, semesterId } = useParams<{
        projectId: string;
        centerId: string;
        semesterId: string;
    }>();

    // Fetch semester to drive month list and ranges
    const { data: semester } = useSemester(semesterId || '');

    // Default selection: current month; if not in semester, will be clamped to first available month later
    const now = new Date();
    const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const [month, setMonth] = useState<string>(defaultMonth); // 'YYYY-MM' or 'FULL'

    // Build available months from semester dates
    const months = useMemo(() => {
        if (!semester?.startDate || !semester?.endDate) return [] as { value: string; label: string }[];
        return enumerateMonths(semester.startDate, semester.endDate);
    }, [semester?.startDate, semester?.endDate]);

    // If default month isn't within semester, set to first semester month when semester loads
    React.useEffect(() => {
        if (!months.length) return;
        if (month !== 'FULL' && !months.some((m) => m.value === month)) {
            setMonth(months[0].value);
        }
    }, [months, month]);

    // Determine the selected date range: single month clamped to semester, or full semester
    const { startDate, endDate, isFull } = useMemo(() => {
        if (month === 'FULL' && semester?.startDate && semester?.endDate) {
            const toDateOnly = (d: string) => new Date(d).toISOString().slice(0, 10);
            return {
                startDate: toDateOnly(semester.startDate),
                endDate: toDateOnly(semester.endDate),
                isFull: true,
            };
        }
        const base = getMonthRange(month);
        const clamped = clampRangeToSemester(base, semester);
        return { startDate: clamped.startDate, endDate: clamped.endDate, isFull: false };
    }, [month, semester]);

    const { data, isLoading, isError, error } = useAttendanceRecords({
        startDate,
        endDate,
        projectId,
        centerId,
        semesterId,
        page: 1,
        limit: isFull ? 10000 : 1000, // larger page size for full semester
    });

    // Hook returns { attendances, totalCount, page, totalPages }
    const attendance: AttendanceRecord[] = useMemo(
        () => data?.attendances ?? [],
        [data]
    );

    // Fetch all users to enrich rows with bank details and UPI
    const { data: allUsers = [] } = useUsers();
    const userById: Record<string, User> = useMemo(() => {
        const index: Record<string, User> = {};
        for (const u of allUsers) index[u.id] = u;
        return index;
    }, [allUsers]);

    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const toggleExpanded = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));


    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            // Optional: We can add a toast here if desired
        } catch {
            // ignore
        }
    };

    // Track copied state per user-field (key format: `${userId}:field`)
    const [copied, setCopied] = useState<Record<string, boolean>>({});
    const markCopied = (key: string) => {
        setCopied((prev) => ({ ...prev, [key]: true }));
        setTimeout(() => {
            setCopied((prev) => ({ ...prev, [key]: false }));
        }, 1500);
    };

    type Row = {
        userId: string;
        userName: string;
        present: number;
        absent: number;
        notAvailable: number;
        total: number; // remuneration in INR
    };

    const rows: Row[] = useMemo(() => {
        const map = new Map<string, Row>();
        for (const rec of attendance) {
            // Consider Educator/Center Manager only
            const subRole = rec.roleAssignment?.subRole;
            if (subRole !== 'EDUCATOR' && subRole !== 'CENTER_MANAGER') continue;

            const key = rec.userId;
            if (!map.has(key)) {
                map.set(key, {
                    userId: rec.userId,
                    userName: rec.userName || rec.user?.name || 'Unknown',
                    present: 0,
                    absent: 0,
                    notAvailable: 0,
                    total: 0,
                });
            }
            const r = map.get(key)!;
            if (rec.status === 'PRESENT') r.present += 1;
            else if (rec.status === 'ABSENT') r.absent += 1;
            else if (rec.status === 'NOT_AVAILABLE') r.notAvailable += 1;
            // holidays not counted
        }
        // Compute totals: Rs. 500 per present day
        for (const r of map.values()) {
            r.total = r.present * 500;
        }
        return Array.from(map.values()).sort((a, b) => a.userName.localeCompare(b.userName));
    }, [attendance]);

    // For full semester: build per-user, per-month remuneration
    type FullRow = {
        userId: string;
        userName: string;
        byMonth: Record<string, { present: number; amount: number }>; // key: 'YYYY-MM'
        total: number;
    };

    const monthKeys = useMemo(() => months.map((m) => m.value), [months]);

    const fullRows: FullRow[] = useMemo(() => {
        if (!isFull) return [];
        const map = new Map<string, FullRow>();
        for (const rec of attendance) {
            const subRole = rec.roleAssignment?.subRole;
            if (subRole !== 'EDUCATOR' && subRole !== 'CENTER_MANAGER') continue;
            const key = rec.userId;
            if (!map.has(key)) {
                const initByMonth: Record<string, { present: number; amount: number }> = {};
                for (const mk of monthKeys) initByMonth[mk] = { present: 0, amount: 0 };
                map.set(key, {
                    userId: rec.userId,
                    userName: rec.userName || rec.user?.name || 'Unknown',
                    byMonth: initByMonth,
                    total: 0,
                });
            }
            const r = map.get(key)!;
            const monthKey = (rec.date || '').slice(0, 7);
            if (!r.byMonth[monthKey]) r.byMonth[monthKey] = { present: 0, amount: 0 };
            if (rec.status === 'PRESENT') {
                r.byMonth[monthKey].present += 1;
                r.byMonth[monthKey].amount = r.byMonth[monthKey].present * 500;
            }
        }
        for (const r of map.values()) {
            r.total = monthKeys.reduce((sum, mk) => sum + (r.byMonth[mk]?.amount || 0), 0);
        }
        return Array.from(map.values()).sort((a, b) => a.userName.localeCompare(b.userName));
    }, [attendance, isFull, monthKeys]);

    const monthTotal = useMemo(() => rows.reduce((sum, r) => sum + r.total, 0), [rows]);

    return (
        <>
            <DoodleBackground numElements={8} />
            <div className="relative z-1 space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Educator / Center Manager Renumeration</h1>
                        <p className="text-gray-600 text-sm">Rs. 500 per present day</p>
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg border p-3">
                        <label htmlFor="month" className="block text-xs text-gray-600 mb-1">Month</label>
                        <select
                            id="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="border rounded px-2 py-1 text-sm min-w-[200px]"
                        >
                            {months.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                            <option value="FULL">Full Semester</option>
                        </select>
                    </div>
                </div>

                {/* Loading / Error */}
                {isLoading && (
                    <div className="flex items-center justify-center min-h-[200px]">
                        <LoadingButterfly size="sm" />
                    </div>
                )}
                {isError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
                        {(error as Error | undefined)?.message || 'Failed to load attendance records.'}
                    </div>
                )}

                {/* Summary */}
                {!isLoading && (!isFull ? rows.length > 0 : fullRows.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white/90 backdrop-blur-sm rounded-lg border p-3 text-center">
                            <p className="text-xs text-gray-600">People</p>
                            <p className="text-2xl font-bold text-gray-900">{!isFull ? rows.length : fullRows.length}</p>
                        </div>
                        <div className="bg-white/90 backdrop-blur-sm rounded-lg border p-3 text-center">
                            <p className="text-xs text-gray-600">Total Present Days</p>
                            <p className="text-2xl font-bold text-emerald-600">
                                {!isFull
                                    ? rows.reduce((s, r) => s + r.present, 0)
                                    : fullRows.reduce((s, r) => s + monthKeys.reduce((ss, mk) => ss + (r.byMonth[mk]?.present || 0), 0), 0)}
                            </p>
                        </div>
                        <div className="bg-white/90 backdrop-blur-sm rounded-lg border p-3 text-center">
                            <p className="text-xs text-gray-600">Total Renumeration</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {formatINR(!isFull ? monthTotal : fullRows.reduce((s, r) => s + r.total, 0))}
                            </p>
                        </div>
                    </div>
                )}

                {/* Table */}
                {!isLoading && !isFull && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg border overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr className="text-left">
                                    <th className="px-3 py-2 font-medium text-gray-700">Name</th>
                                    <th className="px-3 py-2 font-medium text-gray-700">Present</th>
                                    <th className="px-3 py-2 font-medium text-gray-700">Absent</th>
                                    <th className="px-3 py-2 font-medium text-gray-700">Not Available</th>
                                    <th className="px-3 py-2 font-medium text-gray-700">Total</th>
                                    <th className="px-3 py-2 font-medium text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>No records for this month.</td>
                                    </tr>
                                ) : (
                                    rows.map((r) => {
                                        const u = userById[r.userId];
                                        const upiId = u?.upiId || undefined;
                                        const onSendUpi = () => {
                                            if (!upiId) return;
                                            const amount = r.total.toString();
                                            const pn = encodeURIComponent(u?.name || r.userName || 'Educator');
                                            const tn = encodeURIComponent(`Prangan remuneration ${month}`);
                                            const url = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${pn}&am=${amount}&cu=INR&tn=${tn}`;
                                            window.location.href = url;
                                        };
                                        return (
                                            <React.Fragment key={r.userId}>
                                                <tr className="border-t">
                                                    <td className="px-3 py-2 text-gray-900">{r.userName}</td>
                                                    <td className="px-3 py-2 text-emerald-700 font-medium">{r.present}</td>
                                                    <td className="px-3 py-2 text-red-700">{r.absent}</td>
                                                    <td className="px-3 py-2 text-gray-600">{r.notAvailable}</td>
                                                    <td className="px-3 py-2 font-semibold text-orange-700">{formatINR(r.total)}</td>
                                                    <td className="px-3 py-2 space-x-3 whitespace-nowrap">
                                                        <button
                                                            onClick={() => toggleExpanded(r.userId)}
                                                            className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                                        >
                                                            {expanded[r.userId] ? 'Hide bank details' : 'View bank details'}
                                                        </button>
                                                        <button
                                                            onClick={onSendUpi}
                                                            disabled={!upiId || r.total <= 0}
                                                            className={`text-xs font-medium ${upiId && r.total > 0 ? 'text-emerald-600 hover:text-emerald-700' : 'text-gray-400 cursor-not-allowed'}`}
                                                            title={upiId ? 'Open UPI app' : 'No UPI ID available'}
                                                        >
                                                            Send via UPI
                                                        </button>
                                                    </td>
                                                </tr>
                                                {expanded[r.userId] && (
                                                    <tr className="bg-gray-50/60">
                                                        <td className="px-3 py-3" colSpan={6}>
                                                            <div className="grid sm:grid-cols-3 gap-3 text-xs text-gray-700">
                                                                <div className="bg-white/90 border rounded p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[11px] text-gray-500">Account Name</p>
                                                                        {(u?.bankAccountName || u?.name) && (
                                                                            <button
                                                                                onClick={() => { copyToClipboard(u?.bankAccountName || u?.name || ''); markCopied(`${r.userId}:name`); }}
                                                                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                                            >
                                                                                {copied[`${r.userId}:name`] ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                                                                {copied[`${r.userId}:name`] ? 'Copied' : 'Copy'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="font-medium">{u?.bankAccountName || u?.name || '—'}</p>
                                                                </div>
                                                                <div className="bg-white/90 border rounded p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[11px] text-gray-500">Account Number</p>
                                                                        {u?.bankAccountNumber && (
                                                                            <button
                                                                                onClick={() => { copyToClipboard(String(u?.bankAccountNumber)); markCopied(`${r.userId}:acc`); }}
                                                                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                                            >
                                                                                {copied[`${r.userId}:acc`] ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                                                                {copied[`${r.userId}:acc`] ? 'Copied' : 'Copy'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="font-medium">{u?.bankAccountNumber || '—'}</p>
                                                                </div>
                                                                <div className="bg-white/90 border rounded p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[11px] text-gray-500">IFSC</p>
                                                                        {u?.bankIfsc && (
                                                                            <button
                                                                                onClick={() => { copyToClipboard(u?.bankIfsc || ''); markCopied(`${r.userId}:ifsc`); }}
                                                                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                                            >
                                                                                {copied[`${r.userId}:ifsc`] ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                                                                {copied[`${r.userId}:ifsc`] ? 'Copied' : 'Copy'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="font-medium">{u?.bankIfsc || '—'}</p>
                                                                </div>
                                                                <div className="bg-white/90 border rounded p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[11px] text-gray-500">Bank</p>
                                                                        {u?.bankName && (
                                                                            <button
                                                                                onClick={() => { copyToClipboard(u?.bankName || ''); markCopied(`${r.userId}:bank`); }}
                                                                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                                            >
                                                                                {copied[`${r.userId}:bank`] ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                                                                {copied[`${r.userId}:bank`] ? 'Copied' : 'Copy'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="font-medium">{u?.bankName || '—'}</p>
                                                                </div>
                                                                <div className="bg-white/90 border rounded p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[11px] text-gray-500">Branch</p>
                                                                        {u?.bankBranch && (
                                                                            <button
                                                                                onClick={() => { copyToClipboard(u?.bankBranch || ''); markCopied(`${r.userId}:branch`); }}
                                                                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                                            >
                                                                                {copied[`${r.userId}:branch`] ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                                                                {copied[`${r.userId}:branch`] ? 'Copied' : 'Copy'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="font-medium">{u?.bankBranch || '—'}</p>
                                                                </div>
                                                                <div className="bg-white/90 border rounded p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[11px] text-gray-500">UPI ID</p>
                                                                        {u?.upiId && (
                                                                            <button
                                                                                onClick={() => { copyToClipboard(u?.upiId || ''); markCopied(`${r.userId}:upi`); }}
                                                                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                                            >
                                                                                {copied[`${r.userId}:upi`] ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                                                                {copied[`${r.userId}:upi`] ? 'Copied' : 'Copy'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="font-medium">{u?.upiId || '—'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-3">
                                                                {upiId && (
                                                                    <button
                                                                        onClick={onSendUpi}
                                                                        className="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline"
                                                                    >
                                                                        Send via UPI
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                {!isLoading && isFull && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg border overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr className="text-left">
                                    <th className="px-3 py-2 font-medium text-gray-700">Name</th>
                                    {months.map((m) => (
                                        <th key={m.value} className="px-3 py-2 font-medium text-gray-700">{m.label}</th>
                                    ))}
                                    <th className="px-3 py-2 font-medium text-gray-700">Semester Total</th>
                                    <th className="px-3 py-2 font-medium text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fullRows.length === 0 ? (
                                    <tr>
                                        <td className="px-3 py-6 text-center text-gray-500" colSpan={months.length + 3}>No records for this semester.</td>
                                    </tr>
                                ) : (
                                    fullRows.map((r) => {
                                        const u = userById[r.userId];
                                        return (
                                            <React.Fragment key={r.userId}>
                                                <tr className="border-t">
                                                    <td className="px-3 py-2 text-gray-900 whitespace-nowrap">{r.userName}</td>
                                                    {months.map((m) => (
                                                        <td key={m.value} className="px-3 py-2">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-gray-900">{formatINR(r.byMonth[m.value]?.amount || 0)}</span>
                                                                <span className="text-[11px] text-gray-500">{r.byMonth[m.value]?.present || 0} Present</span>
                                                            </div>
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-2 font-semibold text-orange-700 whitespace-nowrap">{formatINR(r.total)}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        <button
                                                            onClick={() => toggleExpanded(r.userId)}
                                                            className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                                        >
                                                            {expanded[r.userId] ? 'Hide bank details' : 'View bank details'}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {expanded[r.userId] && (
                                                    <tr className="bg-gray-50/60">
                                                        <td className="px-3 py-3" colSpan={months.length + 3}>
                                                            <div className="grid sm:grid-cols-3 gap-3 text-xs text-gray-700">
                                                                <div className="bg-white/90 border rounded p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[11px] text-gray-500">Account Name</p>
                                                                        {(u?.bankAccountName || u?.name) && (
                                                                            <button
                                                                                onClick={() => { copyToClipboard(u?.bankAccountName || u?.name || ''); markCopied(`${r.userId}:name`); }}
                                                                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                                            >
                                                                                {copied[`${r.userId}:name`] ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                                                                {copied[`${r.userId}:name`] ? 'Copied' : 'Copy'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="font-medium">{u?.bankAccountName || u?.name || '—'}</p>
                                                                </div>
                                                                <div className="bg-white/90 border rounded p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[11px] text-gray-500">Account Number</p>
                                                                        {u?.bankAccountNumber && (
                                                                            <button
                                                                                onClick={() => { copyToClipboard(String(u?.bankAccountNumber)); markCopied(`${r.userId}:acc`); }}
                                                                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                                            >
                                                                                {copied[`${r.userId}:acc`] ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                                                                {copied[`${r.userId}:acc`] ? 'Copied' : 'Copy'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="font-medium">{u?.bankAccountNumber || '—'}</p>
                                                                </div>
                                                                <div className="bg-white/90 border rounded p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[11px] text-gray-500">IFSC</p>
                                                                        {u?.bankIfsc && (
                                                                            <button
                                                                                onClick={() => { copyToClipboard(u?.bankIfsc || ''); markCopied(`${r.userId}:ifsc`); }}
                                                                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                                            >
                                                                                {copied[`${r.userId}:ifsc`] ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                                                                {copied[`${r.userId}:ifsc`] ? 'Copied' : 'Copy'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="font-medium">{u?.bankIfsc || '—'}</p>
                                                                </div>
                                                                <div className="bg-white/90 border rounded p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[11px] text-gray-500">Bank</p>
                                                                        {u?.bankName && (
                                                                            <button
                                                                                onClick={() => { copyToClipboard(u?.bankName || ''); markCopied(`${r.userId}:bank`); }}
                                                                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                                            >
                                                                                {copied[`${r.userId}:bank`] ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                                                                {copied[`${r.userId}:bank`] ? 'Copied' : 'Copy'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="font-medium">{u?.bankName || '—'}</p>
                                                                </div>
                                                                <div className="bg-white/90 border rounded p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[11px] text-gray-500">Branch</p>
                                                                        {u?.bankBranch && (
                                                                            <button
                                                                                onClick={() => { copyToClipboard(u?.bankBranch || ''); markCopied(`${r.userId}:branch`); }}
                                                                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                                            >
                                                                                {copied[`${r.userId}:branch`] ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                                                                {copied[`${r.userId}:branch`] ? 'Copied' : 'Copy'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="font-medium">{u?.bankBranch || '—'}</p>
                                                                </div>
                                                                <div className="bg-white/90 border rounded p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[11px] text-gray-500">UPI ID</p>
                                                                        {u?.upiId && (
                                                                            <button
                                                                                onClick={() => { copyToClipboard(u?.upiId || ''); markCopied(`${r.userId}:upi`); }}
                                                                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                                            >
                                                                                {copied[`${r.userId}:upi`] ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                                                                {copied[`${r.userId}:upi`] ? 'Copied' : 'Copy'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="font-medium">{u?.upiId || '—'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default Renumeration;
