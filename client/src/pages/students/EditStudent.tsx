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
    const { id, projectId, centerId, semesterId } = useParams<{ id: string; projectId: string; centerId: string; semesterId: string }>();
    const { data: student, isLoading, error } = useStudent(id!);
    const updateStudentMutation = useUpdateStudent();

    // Build the students URL for navigation
    const studentsUrl = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/students`;

    const [formData, setFormData] = useState<UpdateStudentRequest>({
        name: '',
        profileImageUrl: '',
        dob: '',
        phoneNumber: '+91 ',
        whatsappNumber: '+91 ',
        alternateNumber: '+91 ',
        fatherName: '',
        motherName: '',
        address: '',
        schoolName: '',
        fatherOccupation: '',
        motherOccupation: '',
        familyIncome: '',
        enrollment: {
            level: 'LEVEL_1'
        }
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Phone number formatting functions
    const handlePhoneChange = (field: 'phoneNumber' | 'whatsappNumber' | 'alternateNumber', value: string) => {
        // Always ensure +91 prefix is maintained
        if (!value.startsWith('+91 ')) {
            setFormData(prev => ({ ...prev, [field]: '+91 ' }));
            return;
        }

        // Extract only the digits after +91
        const phoneNumber = value.slice(4); // Remove "+91 " prefix
        const digitsOnly = phoneNumber.replace(/\D/g, ''); // Only keep digits

        // Limit to 10 digits (Indian mobile number length)
        if (digitsOnly.length <= 10) {
            // Format as: +91 XXXXX XXXXX (5+5 digits)
            let formattedNumber = digitsOnly;
            if (digitsOnly.length > 5) {
                formattedNumber = digitsOnly.slice(0, 5) + ' ' + digitsOnly.slice(5);
            }
            setFormData(prev => ({ ...prev, [field]: '+91 ' + formattedNumber }));
        }

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const input = e.target as HTMLInputElement;
        const cursorPosition = input.selectionStart || 0;

        // Prevent deletion of +91 prefix
        if ((e.key === 'Backspace' || e.key === 'Delete') && cursorPosition <= 4) {
            e.preventDefault();
        }

        // Move cursor after +91 if user tries to place it before
        if (cursorPosition < 4) {
            setTimeout(() => {
                input.setSelectionRange(4, 4);
            }, 0);
        }
    };

    const handlePhoneFocus = (e: React.FocusEvent<HTMLInputElement>, field: 'phoneNumber' | 'whatsappNumber' | 'alternateNumber') => {
        const input = e.target;
        const currentValue = formData[field];
        // Move cursor to end of +91 prefix if phone is empty or cursor is before prefix
        if (currentValue === '+91 ' || input.selectionStart! < 4) {
            setTimeout(() => {
                input.setSelectionRange(4, 4);
            }, 0);
        }
    };

    const levelOptions = [
        { value: 'LEVEL_1', label: 'Level 1' },
        { value: 'LEVEL_2', label: 'Level 2' },
        { value: 'LEVEL_3', label: 'Level 3' },
        { value: 'LEVEL_4', label: 'Level 4' },
        { value: 'PRIMARY_A', label: 'Primary A' },
        { value: 'PRIMARY_B', label: 'Primary B' }
    ];

    const familyIncomeOptions = [
        { value: '', label: 'Select Income Range' },
        { value: '0-25000', label: '₹0 - ₹25,000' },
        { value: '25000-50000', label: '₹25,000 - ₹50,000' },
        { value: '50000-75000', label: '₹50,000 - ₹75,000' },
        { value: '75000-100000', label: '₹75,000 - ₹1,00,000' },
        { value: '100000+', label: '₹1,00,000+' }
    ];

    // Populate form when student data loads
    useEffect(() => {
        if (student) {
            setFormData({
                name: student.name || '',
                profileImageUrl: student.profileImageUrl || '',
                dob: student.dob ? student.dob.split('T')[0] : '',
                phoneNumber: student.phoneNumber || '+91 ',
                whatsappNumber: student.whatsappNumber || '+91 ',
                alternateNumber: student.alternateNumber || '+91 ',
                fatherName: student.fatherName || '',
                motherName: student.motherName || '',
                address: student.address || '',
                schoolName: student.schoolName || '',
                fatherOccupation: student.fatherOccupation || '',
                motherOccupation: student.motherOccupation || '',
                familyIncome: student.familyIncome || '',
                enrollment: {
                    level: student.level || 'LEVEL_1'
                }
            });
        }
    }, [student]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name?.trim()) {
            newErrors.name = 'Student name is required';
        }

        if (!formData.enrollment?.level) {
            newErrors.level = 'Level is required';
        }

        if (formData.phoneNumber && formData.phoneNumber !== '+91 ' && !/^\+91\s\d{5}\s?\d{0,5}$/.test(formData.phoneNumber)) {
            newErrors.phoneNumber = 'Please enter a valid Indian phone number';
        }

        if (formData.whatsappNumber && formData.whatsappNumber !== '+91 ' && !/^\+91\s\d{5}\s?\d{0,5}$/.test(formData.whatsappNumber)) {
            newErrors.whatsappNumber = 'Please enter a valid Indian WhatsApp number';
        }

        if (formData.alternateNumber && formData.alternateNumber !== '+91 ' && !/^\+91\s\d{5}\s?\d{0,5}$/.test(formData.alternateNumber)) {
            newErrors.alternateNumber = 'Please enter a valid Indian alternate number';
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
            // Clean the form data - remove empty strings and only send changed fields, format phone numbers for API
            const cleanedData: UpdateStudentRequest & { id: string } = {
                id,
                ...(formData.name && { name: formData.name }),
                ...(formData.profileImageUrl !== undefined && { profileImageUrl: formData.profileImageUrl }),
                ...(formData.dob && { dob: formData.dob }),
                ...(formData.phoneNumber && formData.phoneNumber !== '+91 ' && {
                    phoneNumber: formData.phoneNumber.replace(/\s/g, '')
                }),
                ...(formData.whatsappNumber && formData.whatsappNumber !== '+91 ' && {
                    whatsappNumber: formData.whatsappNumber.replace(/\s/g, '')
                }),
                ...(formData.alternateNumber && formData.alternateNumber !== '+91 ' && {
                    alternateNumber: formData.alternateNumber.replace(/\s/g, '')
                }),
                // Family details
                ...(formData.fatherName !== undefined && { fatherName: formData.fatherName }),
                ...(formData.motherName !== undefined && { motherName: formData.motherName }),
                ...(formData.address !== undefined && { address: formData.address }),
                ...(formData.schoolName !== undefined && { schoolName: formData.schoolName }),
                ...(formData.fatherOccupation !== undefined && { fatherOccupation: formData.fatherOccupation }),
                ...(formData.motherOccupation !== undefined && { motherOccupation: formData.motherOccupation }),
                ...(formData.familyIncome !== undefined && { familyIncome: formData.familyIncome }),
                // Include enrollment data if level is being updated
                ...(formData.enrollment && {
                    enrollment: {
                        centerId: centerId!,
                        semesterId: semesterId!,
                        projectId: projectId!,
                        level: formData.enrollment.level
                    }
                })
            };

            await updateStudentMutation.mutateAsync(cleanedData);
            navigate(studentsUrl);
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

    const handleLevelChange = (level: string) => {
        setFormData(prev => ({
            ...prev,
            enrollment: {
                ...prev.enrollment,
                level: level as "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "LEVEL_4" | "PRIMARY_A" | "PRIMARY_B"
            }
        }));
        // Clear error when user changes level
        if (errors.level) {
            setErrors(prev => ({ ...prev, level: '' }));
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
                    onClick={() => navigate(studentsUrl)}
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
                                    value={formData.enrollment?.level || 'LEVEL_1'}
                                    onChange={(e) => handleLevelChange(e.target.value)}
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
                                    onChange={(e) => handlePhoneChange('phoneNumber', e.target.value)}
                                    onKeyDown={handlePhoneKeyDown}
                                    onFocus={(e) => handlePhoneFocus(e, 'phoneNumber')}
                                    disabled={updateStudentMutation.isPending}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.phoneNumber ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="+91 98765 43210"
                                    minLength={15}
                                    maxLength={15}
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
                                    onChange={(e) => handlePhoneChange('whatsappNumber', e.target.value)}
                                    onKeyDown={handlePhoneKeyDown}
                                    onFocus={(e) => handlePhoneFocus(e, 'whatsappNumber')}
                                    disabled={updateStudentMutation.isPending}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.whatsappNumber ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="+91 98765 43210"
                                    minLength={15}
                                    maxLength={15}
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
                                    onChange={(e) => handlePhoneChange('alternateNumber', e.target.value)}
                                    onKeyDown={handlePhoneKeyDown}
                                    onFocus={(e) => handlePhoneFocus(e, 'alternateNumber')}
                                    disabled={updateStudentMutation.isPending}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.alternateNumber ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="+91 98765 43210"
                                    minLength={15}
                                    maxLength={15}
                                />
                                {errors.alternateNumber && (
                                    <p className="mt-1 text-sm text-red-600">{errors.alternateNumber}</p>
                                )}
                            </div>
                        </div>

                        {/* Family Information Section */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Family Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Father's Name */}
                                <div>
                                    <label htmlFor="fatherName" className="block text-sm font-medium text-gray-700 mb-2">
                                        Father's Name
                                    </label>
                                    <input
                                        type="text"
                                        id="fatherName"
                                        value={formData.fatherName || ''}
                                        onChange={(e) => handleInputChange('fatherName', e.target.value)}
                                        disabled={updateStudentMutation.isPending}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Enter father's full name"
                                    />
                                </div>

                                {/* Mother's Name */}
                                <div>
                                    <label htmlFor="motherName" className="block text-sm font-medium text-gray-700 mb-2">
                                        Mother's Name
                                    </label>
                                    <input
                                        type="text"
                                        id="motherName"
                                        value={formData.motherName || ''}
                                        onChange={(e) => handleInputChange('motherName', e.target.value)}
                                        disabled={updateStudentMutation.isPending}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Enter mother's full name"
                                    />
                                </div>

                                {/* Father's Occupation */}
                                <div>
                                    <label htmlFor="fatherOccupation" className="block text-sm font-medium text-gray-700 mb-2">
                                        Father's Occupation
                                    </label>
                                    <input
                                        type="text"
                                        id="fatherOccupation"
                                        value={formData.fatherOccupation || ''}
                                        onChange={(e) => handleInputChange('fatherOccupation', e.target.value)}
                                        disabled={updateStudentMutation.isPending}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Enter father's profession"
                                    />
                                </div>

                                {/* Mother's Occupation */}
                                <div>
                                    <label htmlFor="motherOccupation" className="block text-sm font-medium text-gray-700 mb-2">
                                        Mother's Occupation
                                    </label>
                                    <input
                                        type="text"
                                        id="motherOccupation"
                                        value={formData.motherOccupation || ''}
                                        onChange={(e) => handleInputChange('motherOccupation', e.target.value)}
                                        disabled={updateStudentMutation.isPending}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Enter mother's profession"
                                    />
                                </div>

                                {/* School Name */}
                                <div>
                                    <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-2">
                                        School Name
                                    </label>
                                    <input
                                        type="text"
                                        id="schoolName"
                                        value={formData.schoolName || ''}
                                        onChange={(e) => handleInputChange('schoolName', e.target.value)}
                                        disabled={updateStudentMutation.isPending}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Enter school name"
                                    />
                                </div>

                                {/* Family Income */}
                                <div>
                                    <label htmlFor="familyIncome" className="block text-sm font-medium text-gray-700 mb-2">
                                        Family Income Range
                                    </label>
                                    <select
                                        id="familyIncome"
                                        value={formData.familyIncome || ''}
                                        onChange={(e) => handleInputChange('familyIncome', e.target.value)}
                                        disabled={updateStudentMutation.isPending}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        {familyIncomeOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Address */}
                                <div className="md:col-span-2">
                                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                                        Address
                                    </label>
                                    <textarea
                                        id="address"
                                        value={formData.address || ''}
                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                        disabled={updateStudentMutation.isPending}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Enter complete residential address"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex space-x-4 pt-6 border-t border-gray-200">
                            <CustomButton
                                type="button"
                                variant="outline"
                                onClick={() => navigate(studentsUrl)}
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
