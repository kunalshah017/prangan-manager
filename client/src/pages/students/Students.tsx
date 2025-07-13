import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, User, Calendar, Phone, GraduationCap } from 'lucide-react';
import { useStudents, useDeleteStudent } from '@/hooks/useStudentQueries';
import { useAuth } from '@/hooks/useAuth';
import LoadingButterfly from '@/components/LoadingButterfly';
import { CustomButton } from '@/components/ui/button';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import type { Student } from '@/types/api';

const Students = () => {
    const { user } = useAuth();
    const { data: students, isLoading, error } = useStudents();
    const deleteStudentMutation = useDeleteStudent();
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

    const isAdmin = user?.role === 'ADMIN';

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
                    <Link to="new">
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
                                    <div className="flex-shrink-0">
                                        {student.profileImageUrl ? (
                                            <img
                                                src={student.profileImageUrl}
                                                alt={student.name}
                                                className="w-16 h-16 rounded-full object-cover border-2 border-orange-100"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                                                <User className="w-8 h-8 text-orange-600" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-medium text-gray-900 truncate">
                                            {student.name}
                                        </h3>
                                        <div className="flex items-center mt-1">
                                            <GraduationCap className="w-4 h-4 text-gray-400 mr-1" />
                                            <span className="text-sm text-gray-600">
                                                {getLevelDisplay(student.level)}
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
                                    {student.phoneNumber && (
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Phone className="w-4 h-4 mr-2" />
                                            <span>{student.phoneNumber}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {isAdmin && (
                                    <div className="flex space-x-2 pt-4 border-t border-gray-100">
                                        <Link
                                            to={`${student.id}/edit`}
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
                        <Link to="new">
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
