import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { Plus, Edit, Trash2, User, Calendar, Phone, GraduationCap, MessageCircle } from 'lucide-react';
import { useStudentsBySemester, useDeleteStudent } from '@/hooks/useStudentQueries';
import { useAuth } from '@/hooks/useAuth';
import LoadingButterfly from '@/components/LoadingButterfly';
import { CustomButton } from '@/components/ui/button';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { ProfilePicture } from '@/components/ui';
import type { Student } from '@/types/api';

const Students = () => {
    const { user } = useAuth();
    const { projectId, centerId, semesterId } = useParams();
    const { data: students, isLoading, error } = useStudentsBySemester(semesterId!);
    const deleteStudentMutation = useDeleteStudent();
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

    const isAdmin = user?.role === 'ADMIN';

    // Build the base URL for student routes
    const baseStudentUrl = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/students`;

    const handleDeleteStudent = async () => {
        if (!studentToDelete) return;

        try {
            await deleteStudentMutation.mutateAsync(studentToDelete.id);
            setStudentToDelete(null);
        } catch (error) {
            console.error('Error deleting student:', error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getLevelDisplay = (level: string) => {
        const levelMap: Record<string, string> = {
            'LEVEL_1': 'Level 1',
            'LEVEL_2': 'Level 2',
            'LEVEL_3': 'Level 3',
            'LEVEL_4': 'Level 4',
            'PRIMARY_A': 'Primary A',
            'PRIMARY_B': 'Primary B'
        };
        return levelMap[level] || level;
    };

    const handlePhoneCall = (phoneNumber: string) => {
        window.open(`tel:${phoneNumber}`, '_self');
    };

    const handleWhatsApp = (phoneNumber: string) => {
        // Format phone number for WhatsApp (remove spaces, dashes, etc.)
        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
        // Add country code if not present (assuming India +91)
        const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+91${cleanNumber}`;
        window.open(`https://wa.me/${formattedNumber.replace('+', '')}`, '_blank');
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <LoadingButterfly size="md" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">Failed to load students. Please try again.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Students</h1>
                    <p className="text-gray-600">Manage student information and records</p>
                </div>
                {isAdmin && (
                    <Link to={`${baseStudentUrl}/new`}>
                        <CustomButton className="bg-orange-600 hover:bg-orange-700 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Student
                        </CustomButton>
                    </Link>
                )}
            </div>

            {/* Students Grid */}
            {students && students.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {students.map((student, index) => (
                        <motion.div
                            key={student.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="p-6">
                                {/* Profile Image and Name */}
                                <div className="flex items-start space-x-4 mb-4">
                                    <ProfilePicture
                                        imageUrl={student.profileImageUrl}
                                        name={student.name}
                                        size="w-16 h-16"
                                        colorScheme="orange"
                                        className="border-2 border-orange-100"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-medium text-gray-900 truncate">
                                            {student.name}
                                        </h3>
                                        <div className="flex items-center mt-1">
                                            <GraduationCap className="w-4 h-4 text-gray-400 mr-1" />
                                            <span className="text-sm text-gray-600">
                                                {student.level ? getLevelDisplay(student.level) : 'No Level Assigned'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Student Details */}
                                <div className="space-y-2 mb-4">
                                    {student.dob && (
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Calendar className="w-4 h-4 mr-2" />
                                            <span>Born: {formatDate(student.dob)}</span>
                                        </div>
                                    )}
                                    {/* Phone Numbers */}
                                    {(student.phoneNumber || student.whatsappNumber || student.alternateNumber) && (
                                        <div className="space-y-2">
                                            {student.phoneNumber && (
                                            <div className="flex items-center justify-between text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <Phone className="w-4 h-4 mr-2" />
                                                    <span>Phone: {student.phoneNumber}</span>
                                                </div>
                                                <div className="flex space-x-1">
                                                    <button
                                                        onClick={() => student.phoneNumber && handlePhoneCall(student.phoneNumber)}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                        title="Call this number"
                                                    >
                                                        <Phone className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => student.phoneNumber && handleWhatsApp(student.phoneNumber)}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                        title="WhatsApp this number"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {student.whatsappNumber && (
                                            <div className="flex items-center justify-between text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <MessageCircle className="w-4 h-4 mr-2" />
                                                    <span>WhatsApp: {student.whatsappNumber}</span>
                                                </div>
                                                <div className="flex space-x-1">
                                                    <button
                                                        onClick={() => student.whatsappNumber && handlePhoneCall(student.whatsappNumber)}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                        title="Call this number"
                                                    >
                                                        <Phone className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => student.whatsappNumber && handleWhatsApp(student.whatsappNumber)}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                        title="WhatsApp this number"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {student.alternateNumber && (
                                            <div className="flex items-center justify-between text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <Phone className="w-4 h-4 mr-2" />
                                                    <span>Alt: {student.alternateNumber}</span>
                                                </div>
                                                <div className="flex space-x-1">
                                                    <button
                                                        onClick={() => student.alternateNumber && handlePhoneCall(student.alternateNumber)}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                        title="Call this number"
                                                    >
                                                        <Phone className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => student.alternateNumber && handleWhatsApp(student.alternateNumber)}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                        title="WhatsApp this number"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        </div>
                                    )}
                                    {student.schoolName && (
                                        <div className="flex items-center text-sm text-gray-600">
                                            <GraduationCap className="w-4 h-4 mr-2" />
                                            <span>School: {student.schoolName}</span>
                                        </div>
                                    )}
                                    {(student.fatherName || student.motherName) && (
                                        <div className="text-sm text-gray-600">
                                            <div className="flex items-center">
                                                <User className="w-4 h-4 mr-2" />
                                                <span>Family:</span>
                                            </div>
                                            <div className="ml-6 space-y-1">
                                                {student.fatherName && (
                                                    <div>Father: {student.fatherName}</div>
                                                )}
                                                {student.motherName && (
                                                    <div>Mother: {student.motherName}</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {isAdmin && (
                                    <div className="flex space-x-2 pt-4 border-t border-gray-100">
                                        <Link
                                            to={`${baseStudentUrl}/${student.id}/edit`}
                                            className="flex-1"
                                        >
                                            <CustomButton
                                                variant="outline"
                                                className="w-full text-sm"
                                            >
                                                <Edit className="w-4 h-4 mr-1" />
                                                Edit
                                            </CustomButton>
                                        </Link>
                                        <CustomButton
                                            variant="outline"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => setStudentToDelete(student)}
                                            disabled={deleteStudentMutation.isPending}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </CustomButton>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                    <p className="text-gray-600 mb-4">Get started by adding your first student.</p>
                    {isAdmin && (
                        <Link to={`${baseStudentUrl}/new`}>
                            <CustomButton className="bg-orange-600 hover:bg-orange-700 text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Student
                            </CustomButton>
                        </Link>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!studentToDelete}
                onClose={() => setStudentToDelete(null)}
                onConfirm={handleDeleteStudent}
                title="Delete Student"
                message={`Are you sure you want to delete "${studentToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                isLoading={deleteStudentMutation.isPending}
            />
        </div>
    );
};

export default Students;
