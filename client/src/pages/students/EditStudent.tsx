import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStudent, useUpdateStudent } from '@/hooks/useStudentQueries';
import { CustomButton } from '@/components/ui/button';
import ImageUpload from '@/components/ui/image-upload';
import LoadingButterfly from '@/components/LoadingButterfly';
import type { UpdateStudentRequest } from '@/types/api';

const EditStudent = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { data: student, isLoading, error } = useStudent(id!);
    const updateStudentMutation = useUpdateStudent();

    const [formData, setFormData] = useState<UpdateStudentRequest>({
        name: '',
        profileImageUrl: '',
        dob: '',
        phoneNumber: '',
        whatsappNumber: '',
        alternateNumber: '',
        level: 'LEVEL_1'
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const levelOptions = [
        { value: 'LEVEL_1', label: 'Level 1' },
        { value: 'LEVEL_2', label: 'Level 2' },
        { value: 'LEVEL_3', label: 'Level 3' },
        { value: 'LEVEL_4', label: 'Level 4' },
        { value: 'PRIMARY_A', label: 'Primary A' },
        { value: 'PRIMARY_B', label: 'Primary B' }
    ];

    // Populate form when student data loads
    useEffect(() => {
        if (student) {
            setFormData({
                name: student.name || '',
                profileImageUrl: student.profileImageUrl || '',
                dob: student.dob ? student.dob.split('T')[0] : '',
                phoneNumber: student.phoneNumber || '',
                whatsappNumber: student.whatsappNumber || '',
                alternateNumber: student.alternateNumber || '',
                level: student.level
            });
        }
    }, [student]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name?.trim()) {
            newErrors.name = 'Student name is required';
        }

        if (!formData.level) {
            newErrors.level = 'Level is required';
        }

        if (formData.phoneNumber && !/^\+?[\d\s-()]+$/.test(formData.phoneNumber)) {
            newErrors.phoneNumber = 'Please enter a valid phone number';
        }

        if (formData.whatsappNumber && !/^\+?[\d\s-()]+$/.test(formData.whatsappNumber)) {
            newErrors.whatsappNumber = 'Please enter a valid WhatsApp number';
        }

        if (formData.alternateNumber && !/^\+?[\d\s-()]+$/.test(formData.alternateNumber)) {
            newErrors.alternateNumber = 'Please enter a valid alternate number';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || !id) {
            return;
        }

        try {
            // Clean the form data - remove empty strings and only send changed fields
            const cleanedData: UpdateStudentRequest & { id: string } = {
                id,
                ...(formData.name && { name: formData.name }),
                ...(formData.level && { level: formData.level }),
                ...(formData.profileImageUrl !== undefined && { profileImageUrl: formData.profileImageUrl }),
                ...(formData.dob && { dob: formData.dob }),
                ...(formData.phoneNumber && { phoneNumber: formData.phoneNumber }),
                ...(formData.whatsappNumber && { whatsappNumber: formData.whatsappNumber }),
                ...(formData.alternateNumber && { alternateNumber: formData.alternateNumber }),
            };

            await updateStudentMutation.mutateAsync(cleanedData);
            navigate('/students');
        } catch (error) {
            console.error('Error updating student:', error);
        }
    };

    const handleInputChange = (field: keyof UpdateStudentRequest, value: string | undefined) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <LoadingButterfly size="md" />
            </div>
        );
    }

    if (error || !student) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">Failed to load student. Please try again.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={() => navigate('/students')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Go back to students list"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Edit Student</h1>
                    <p className="text-sm text-gray-600 mt-1">Update {student.name}'s information</p>
                </div>
            </div>

            {/* Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-lg border border-gray-200 shadow-sm"
            >
                <div className="p-6">
                    {updateStudentMutation.error && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-700">
                                {updateStudentMutation.error instanceof Error
                                    ? updateStudentMutation.error.message
                                    : 'Failed to update student. Please try again.'}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Profile Image */}
                        <div>
                            <ImageUpload
                                label="Profile Image"
                                value={formData.profileImageUrl || ''}
                                onChange={(url) => handleInputChange('profileImageUrl', url)}
                                placeholder="Upload student's profile image"
                                disabled={updateStudentMutation.isPending}
                                variant="rounded"
                            />
                        </div>

                        {/* Basic Information */}
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                    Student Name *
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    value={formData.name || ''}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    disabled={updateStudentMutation.isPending}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.name ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="Enter student's full name"
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
                                    Level *
                                </label>
                                <select
                                    id="level"
                                    value={formData.level || ''}
                                    onChange={(e) => handleInputChange('level', e.target.value as UpdateStudentRequest['level'])}
                                    disabled={updateStudentMutation.isPending}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.level ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                >
                                    {levelOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.level && (
                                    <p className="mt-1 text-sm text-red-600">{errors.level}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-2">
                                    Date of Birth
                                </label>
                                <input
                                    type="date"
                                    id="dob"
                                    value={formData.dob || ''}
                                    onChange={(e) => handleInputChange('dob', e.target.value)}
                                    disabled={updateStudentMutation.isPending}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    id="phoneNumber"
                                    value={formData.phoneNumber || ''}
                                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                                    disabled={updateStudentMutation.isPending}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.phoneNumber ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="+1 (555) 123-4567"
                                />
                                {errors.phoneNumber && (
                                    <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                    WhatsApp Number
                                </label>
                                <input
                                    type="tel"
                                    id="whatsappNumber"
                                    value={formData.whatsappNumber || ''}
                                    onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                                    disabled={updateStudentMutation.isPending}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.whatsappNumber ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="+1 (555) 123-4567"
                                />
                                {errors.whatsappNumber && (
                                    <p className="mt-1 text-sm text-red-600">{errors.whatsappNumber}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="alternateNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                    Alternate Number
                                </label>
                                <input
                                    type="tel"
                                    id="alternateNumber"
                                    value={formData.alternateNumber || ''}
                                    onChange={(e) => handleInputChange('alternateNumber', e.target.value)}
                                    disabled={updateStudentMutation.isPending}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.alternateNumber ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="+1 (555) 123-4567"
                                />
                                {errors.alternateNumber && (
                                    <p className="mt-1 text-sm text-red-600">{errors.alternateNumber}</p>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex space-x-4 pt-6 border-t border-gray-200">
                            <CustomButton
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/students')}
                                disabled={updateStudentMutation.isPending}
                            >
                                Cancel
                            </CustomButton>
                            <CustomButton
                                type="submit"
                                isLoading={updateStudentMutation.isPending}
                                loadingMessage="Updating student..."
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                Update Student
                            </CustomButton>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default EditStudent;
