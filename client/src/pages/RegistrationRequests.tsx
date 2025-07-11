import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check, X, Shield, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import DoodleBackground from '@/components/DoodleBackground';

// Mock registration requests data - in a real app, this would come from an API
const mockRegistrationRequests: RegistrationRequest[] = [
    {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        dateOfBirth: '1995-03-15',
        phone: '+91 9876543210',
        qualification: 'Bachelor\'s Degree in Education',
        address: '123 Main Street, Mumbai, Maharashtra, India - 400001',
        submittedAt: '2025-01-10T10:30:00Z',
        status: 'pending'
    },
    {
        id: '2',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        dateOfBirth: '1992-07-22',
        phone: '+91 9123456789',
        qualification: 'Master\'s in Child Psychology',
        address: '456 Oak Avenue, Pune, Maharashtra, India - 411001',
        submittedAt: '2025-01-09T14:15:00Z',
        status: 'pending'
    },
    {
        id: '3',
        name: 'Raj Patel',
        email: 'raj.patel@example.com',
        dateOfBirth: '1988-11-08',
        phone: '+91 9987654321',
        qualification: 'Diploma in Elementary Education',
        address: '789 Garden Road, Ahmedabad, Gujarat, India - 380001',
        submittedAt: '2025-01-08T09:45:00Z',
        status: 'approved'
    },
    {
        id: '4',
        name: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        dateOfBirth: '1990-05-30',
        phone: '+91 9876512340',
        qualification: 'Bachelor\'s in Social Work',
        address: '321 Lake View, Bangalore, Karnataka, India - 560001',
        submittedAt: '2025-01-07T16:20:00Z',
        status: 'rejected'
    }
];

interface RegistrationRequest {
    id: string;
    name: string;
    email: string;
    dateOfBirth: string;
    phone: string;
    qualification: string;
    address: string;
    submittedAt: string;
    status: 'pending' | 'approved' | 'rejected';
}

const RegistrationRequests = () => {
    const [requests, setRequests] = useState<RegistrationRequest[]>(mockRegistrationRequests);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [adminToggles, setAdminToggles] = useState<Set<string>>(new Set());

    const toggleRowExpansion = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const handleApprove = (id: string) => {
        setRequests(requests.map(req =>
            req.id === id ? { ...req, status: 'approved' as const } : req
        ));
    };

    const handleReject = (id: string) => {
        setRequests(requests.map(req =>
            req.id === id ? { ...req, status: 'rejected' as const } : req
        ));
    };

    const toggleAdmin = (id: string) => {
        const newAdminToggles = new Set(adminToggles);
        if (newAdminToggles.has(id)) {
            newAdminToggles.delete(id);
        } else {
            newAdminToggles.add(id);
        }
        setAdminToggles(newAdminToggles);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const pendingRequests = requests.filter(req => req.status === 'pending');

    return (
        <div className="flex flex-col space-y-6 w-full relative">
            <DoodleBackground numElements={10} />

            <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Registration Requests</h1>
                        <p className="text-muted-foreground mt-1">
                            Review and manage volunteer registration requests
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0 flex gap-2">
                        <div className="bg-white/80 rounded-lg px-3 py-2 border text-sm">
                            <span className="font-medium">{pendingRequests.length}</span> pending
                        </div>
                    </div>
                </div>

                {/* Pending Requests */}
                {pendingRequests.length > 0 ? (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 text-orange-700">Pending Requests</h2>

                        {/* Mobile View */}
                        <div className="block md:hidden space-y-4">
                            {pendingRequests.map((request) => (
                                <div key={request.id} className="bg-white/80 rounded-lg border shadow-sm p-4">
                                    <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => toggleRowExpansion(request.id)}
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{request.name}</div>
                                            <div className="text-sm text-gray-500">{request.email}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {formatDate(request.submittedAt)}
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            {expandedRows.has(request.id) ? (
                                                <ChevronDown className="h-5 w-5 text-gray-400" />
                                            ) : (
                                                <ChevronRight className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                    </div>

                                    {expandedRows.has(request.id) && (
                                        <div className="mt-4 pt-4 border-t space-y-3">
                                            <div className="grid grid-cols-1 gap-3 text-sm">
                                                <div>
                                                    <span className="font-medium text-gray-700">Phone:</span>
                                                    <span className="ml-2 text-gray-900">{request.phone}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Date of Birth:</span>
                                                    <span className="ml-2 text-gray-900">
                                                        {new Date(request.dateOfBirth).toLocaleDateString('en-IN')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Qualification:</span>
                                                    <span className="ml-2 text-gray-900">{request.qualification}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Address:</span>
                                                    <span className="ml-2 text-gray-900">{request.address}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 pt-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApprove(request.id)}
                                                        className={cn(
                                                            buttonVariants({ size: 'sm' }),
                                                            'bg-green-600 hover:bg-green-700 text-white flex-1 h-9'
                                                        )}
                                                    >
                                                        <Check className="h-3 w-3 mr-2" />
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(request.id)}
                                                        className={cn(
                                                            buttonVariants({ variant: 'outline', size: 'sm' }),
                                                            'text-red-600 border-red-200 hover:bg-red-50 flex-1 h-9'
                                                        )}
                                                    >
                                                        <X className="h-3 w-3 mr-2" />
                                                        Reject
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => toggleAdmin(request.id)}
                                                    className={cn(
                                                        'flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors w-full',
                                                        adminToggles.has(request.id)
                                                            ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                                                    )}
                                                >
                                                    {adminToggles.has(request.id) ? (
                                                        <><ShieldCheck className="h-4 w-4" />Admin</>
                                                    ) : (
                                                        <><Shield className="h-4 w-4" />User</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop View */}
                        <div className="hidden md:block bg-white/80 rounded-lg border shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Applicant
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Submitted
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Admin
                                            </th>
                                            <th className="w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {pendingRequests.map((request) => (
                                            <React.Fragment key={request.id}>
                                                <tr
                                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                                    onClick={() => toggleRowExpansion(request.id)}
                                                >
                                                    <td className="px-4 py-4">
                                                        <div>
                                                            <div className="font-medium text-gray-900">{request.name}</div>
                                                            <div className="text-sm text-gray-500">{request.email}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-500">
                                                        {formatDate(request.submittedAt)}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => handleApprove(request.id)}
                                                                className={cn(
                                                                    buttonVariants({ size: 'sm' }),
                                                                    'bg-green-600 hover:bg-green-700 text-white h-8 px-3'
                                                                )}
                                                            >
                                                                <Check className="h-3 w-3 mr-1" />
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(request.id)}
                                                                className={cn(
                                                                    buttonVariants({ variant: 'outline', size: 'sm' }),
                                                                    'text-red-600 border-red-200 hover:bg-red-50 h-8 px-3'
                                                                )}
                                                            >
                                                                <X className="h-3 w-3 mr-1" />
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => toggleAdmin(request.id)}
                                                            className={cn(
                                                                'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors',
                                                                adminToggles.has(request.id)
                                                                    ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                                                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                                                            )}
                                                        >
                                                            {adminToggles.has(request.id) ? (
                                                                <><ShieldCheck className="h-3 w-3" /> Admin</>
                                                            ) : (
                                                                <><Shield className="h-3 w-3" /> User</>
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {expandedRows.has(request.id) ? (
                                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                                        )}
                                                    </td>
                                                </tr>
                                                {expandedRows.has(request.id) && (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-4 bg-gray-50">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                                <div>
                                                                    <span className="font-medium text-gray-700">Phone:</span>
                                                                    <span className="ml-2 text-gray-900">{request.phone}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="font-medium text-gray-700">Date of Birth:</span>
                                                                    <span className="ml-2 text-gray-900">
                                                                        {new Date(request.dateOfBirth).toLocaleDateString('en-IN')}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="font-medium text-gray-700">Qualification:</span>
                                                                    <span className="ml-2 text-gray-900">{request.qualification}</span>
                                                                </div>
                                                                <div className="md:col-span-2">
                                                                    <span className="font-medium text-gray-700">Address:</span>
                                                                    <span className="ml-2 text-gray-900">{request.address}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/80 rounded-lg border shadow-sm p-12 text-center">
                        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="font-medium text-lg text-gray-900 mb-2">No registration requests</h3>
                        <p className="text-gray-500">
                            When users submit registration forms, they will appear here for review.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegistrationRequests;
