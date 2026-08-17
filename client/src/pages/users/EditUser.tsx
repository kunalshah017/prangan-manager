import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Save,
    User,
    GraduationCap,
    AlertCircle
} from 'lucide-react';
import { useUser, useUpdateUser } from '@/hooks/useUserQueries';
import { ProfilePicture, CustomButton, PersonNameFields, RoleAssignmentForm, type PersonNameField } from '@/components/ui';
import LoadingButterfly from '@/components/LoadingButterfly';
import type { RoleAssignment } from '@/types/api';

const EditUser = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { data: user, isLoading, error } = useUser(userId!);
    const updateUserMutation = useUpdateUser();

    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        phone: '',
        qualification: '',
        address: '',
        role: 'USER' as 'USER' | 'ADMIN',
        dob: ''
    });

    // Role assignments state
    const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
    const [assignmentErrors, setAssignmentErrors] = useState<string[]>([]);
    const [isAssignmentValid, setIsAssignmentValid] = useState(true);

    // Form validation
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Populate form data when user is loaded
    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || '',
                middleName: user.middleName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                phone: user.phone || '',
                qualification: user.qualification || '',
                address: user.address || '',
                role: user.role || 'USER',
                dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : ''
            });

            // Convert user role assignments to form format
            if (user.roleAssignments) {
                setRoleAssignments(user.roleAssignments.map((assignment) => ({
                    subRole: assignment.subRole,
                    projectId: assignment.projectId || '',
                    centerId: assignment.centerId || '',
                    semesterId: assignment.semesterId || '',
                    semesterLevelId: assignment.semesterLevelId,
                    semesterLevel: assignment.semesterLevel,
                    committedDays: assignment.committedDays
                })));
            }
        }
    }, [user]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0 && isAssignmentValid;
    };

    const handleNameChange = (field: PersonNameField, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'role' && value === 'ADMIN') {
            setRoleAssignments([]);
        }
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            await updateUserMutation.mutateAsync({
                userId: userId!,
                userData: {
                    ...formData,
                    firstName: formData.firstName.trim(),
                    middleName: formData.middleName.trim() || null,
                    lastName: formData.lastName.trim() || null,
                    dob: formData.dob ? new Date(formData.dob).toISOString() : null
                },
                roleAssignments: formData.role === 'ADMIN' ? [] : roleAssignments.map((assignment) => ({
                    subRole: assignment.subRole,
                    projectId: assignment.projectId,
                    centerId: assignment.centerId,
                    semesterId: assignment.semesterId,
                    semesterLevelId: assignment.semesterLevelId ?? undefined,
                    committedDays: assignment.committedDays,
                }))
            });

            navigate('/users');
        } catch (error) {
            console.error('Error updating user:', error);
        }
    };

    const handleRoleAssignmentValidation = (isValid: boolean, errors: string[]) => {
        setIsAssignmentValid(isValid);
        setAssignmentErrors(errors);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <LoadingButterfly size="md" />
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <p className="text-red-700">Failed to load user details. Please try again.</p>
                </div>
                <button
                    onClick={() => navigate('/users')}
                    className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Users
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Edit User</h1>
                    <p className="text-gray-600">Update user details and role assignments</p>
                </div>
                <div className="flex items-center space-x-3">
                    <ProfilePicture
                        imageUrl={user.profileImageUrl}
                        name={user.name}
                        size="w-12 h-12"
                        colorScheme="orange"
                        className="border-2 border-orange-100"
                    />
                    <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-600">{user.email}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm"
                >
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center">
                            <User className="w-5 h-5 text-gray-400 mr-2" />
                            <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <PersonNameFields
                                idPrefix="edit-user"
                                firstName={formData.firstName}
                                middleName={formData.middleName}
                                lastName={formData.lastName}
                                onChange={handleNameChange}
                                errors={{ firstName: errors.firstName }}
                                disabled={updateUserMutation.isPending}
                                className="md:col-span-2"
                            />

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address <span className="ml-1 text-destructive" aria-hidden="true">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${errors.email ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="Enter email address"
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                                )}
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                                    placeholder="Enter phone number"
                                />
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    System Role
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => handleInputChange('role', e.target.value as 'USER' | 'ADMIN')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                                >
                                    <option value="USER">User</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>

                            {/* Date of Birth */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date of Birth
                                </label>
                                <input
                                    type="date"
                                    value={formData.dob}
                                    onChange={(e) => handleInputChange('dob', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                                />
                            </div>

                            {/* Qualification */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Qualification
                                </label>
                                <input
                                    type="text"
                                    value={formData.qualification}
                                    onChange={(e) => handleInputChange('qualification', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                                    placeholder="Enter qualification"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Address
                            </label>
                            <textarea
                                value={formData.address}
                                onChange={(e) => handleInputChange('address', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                                placeholder="Enter full address"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Role Assignments */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm"
                >
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center">
                            <GraduationCap className="w-5 h-5 text-gray-400 mr-2" />
                            <h2 className="text-lg font-medium text-gray-900">Role Assignments</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        <RoleAssignmentForm
                            roleAssignments={roleAssignments}
                            onChange={setRoleAssignments}
                            userRole={formData.role}
                            onValidationChange={handleRoleAssignmentValidation}
                        />
                        {assignmentErrors.length > 0 && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                <div className="flex items-start">
                                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-red-800">Role Assignment Errors:</h4>
                                        <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                                            {assignmentErrors.map((error, index) => (
                                                <li key={index}>{error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={() => navigate('/users')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <CustomButton
                        type="submit"
                        isLoading={updateUserMutation.isPending}
                        loadingMessage="Updating..."
                        className="px-6 py-2"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Update User
                    </CustomButton>
                </div>
            </form>
        </div>
    );
};

export default EditUser;
