import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, CheckCircle, XCircle, Calendar, AlertTriangle } from 'lucide-react';
import { CustomButton } from './ui/custom-button';
import { useStudentEnrollments, useCreateEnrollment, useUpdateEnrollment } from '@/hooks/useStudentQueries';
import { useProjects } from '@/hooks/useProjectQueries';
import { useCenters } from '@/hooks/useCenterQueries';
import { useSemestersByCenter } from '@/hooks/useSemesterQueries';
import LoadingButterfly from './LoadingButterfly';
import Modal from './ui/modal';
import type { StudentEnrollment } from '@/types/api';
import ProtectedComponent from './ProtectedComponent';

interface EnrollmentManagerProps {
    studentId: string;
    studentName: string;
}

interface EnrollmentFormData {
    projectId: string;
    centerId: string;
    semesterId: string;
    level: StudentEnrollment['level'];
}

const EnrollmentManager = ({ studentId, studentName }: EnrollmentManagerProps) => {
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [enrollmentToDeactivate, setEnrollmentToDeactivate] = useState<StudentEnrollment | null>(null);
    const [formData, setFormData] = useState<EnrollmentFormData>({
        projectId: '',
        centerId: '',
        semesterId: '',
        level: 'LEVEL_1'
    });

    // Queries
    const { data: enrollments, isLoading: loadingEnrollments } = useStudentEnrollments(studentId);
    const { data: projects } = useProjects();
    const { data: centers } = useCenters();
    const { data: semesters } = useSemestersByCenter(formData.centerId);

    // Mutations
    const createEnrollmentMutation = useCreateEnrollment();
    const updateEnrollmentMutation = useUpdateEnrollment();

    const levelOptions = [
        { value: 'LEVEL_1', label: 'Level 1' },
        { value: 'LEVEL_2', label: 'Level 2' },
        { value: 'LEVEL_3', label: 'Level 3' },
        { value: 'LEVEL_4', label: 'Level 4' },
        { value: 'PRIMARY_A', label: 'Primary A' },
        { value: 'PRIMARY_B', label: 'Primary B' }
    ];

    // Filter centers by selected project
    const filteredCenters = centers?.filter(c => c.projectId === formData.projectId) || [];

    const resetForm = () => {
        setFormData({
            projectId: '',
            centerId: '',
            semesterId: '',
            level: 'LEVEL_1'
        });
        setIsAddingNew(false);
        setEditingId(null);
    };

    const handleStartEdit = (enrollment: StudentEnrollment) => {
        setFormData({
            projectId: enrollment.projectId,
            centerId: enrollment.centerId,
            semesterId: enrollment.semesterId,
            level: enrollment.level
        });
        setEditingId(enrollment.id);
        setIsAddingNew(false);
    };

    const handleStartAdd = () => {
        resetForm();
        setIsAddingNew(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.projectId || !formData.centerId || !formData.semesterId) {
            return;
        }

        try {
            if (editingId) {
                await updateEnrollmentMutation.mutateAsync({
                    enrollmentId: editingId,
                    studentId,
                    ...formData
                });
            } else {
                await createEnrollmentMutation.mutateAsync({
                    studentId,
                    ...formData
                });
            }
            resetForm();
        } catch (error) {
            console.error('Error saving enrollment:', error);
        }
    };

    const handleToggleActive = (enrollment: StudentEnrollment) => {
        // If deactivating, show warning modal
        if (enrollment.isActive) {
            setEnrollmentToDeactivate(enrollment);
        } else {
            // If activating, proceed directly
            confirmToggleActive(enrollment);
        }
    };

    const confirmToggleActive = async (enrollment: StudentEnrollment) => {
        try {
            await updateEnrollmentMutation.mutateAsync({
                enrollmentId: enrollment.id,
                studentId,
                isActive: !enrollment.isActive
            });
            setEnrollmentToDeactivate(null);
        } catch (error) {
            console.error('Error toggling enrollment status:', error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loadingEnrollments) {
        return (
            <div className="flex justify-center items-center py-8">
                <LoadingButterfly size="md" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ProtectedComponent requireAdmin>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Enrollment History</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Manage {studentName}'s enrollments across projects and centers
                        </p>
                    </div>
                    {!isAddingNew && !editingId && (
                        <CustomButton
                            onClick={handleStartAdd}
                            variant="default"
                            size="sm"
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            <Plus className="w-4 h-4" />
                            Add Enrollment
                        </CustomButton>
                    )}
                </div>
            </ProtectedComponent>


            {/* Add/Edit Form */}
            <AnimatePresence>
                {(isAddingNew || editingId) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-orange-50 border border-orange-200 rounded-lg p-4"
                    >
                        <h4 className="text-sm font-medium text-orange-900 mb-4">
                            {editingId ? 'Edit Enrollment' : 'New Enrollment'}
                        </h4>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Project *
                                    </label>
                                    <select
                                        value={formData.projectId}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            projectId: e.target.value,
                                            centerId: '',
                                            semesterId: ''
                                        }))}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        <option value="">Select Project</option>
                                        {projects?.map(project => (
                                            <option key={project.id} value={project.id}>
                                                {project.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Center *
                                    </label>
                                    <select
                                        value={formData.centerId}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            centerId: e.target.value,
                                            semesterId: ''
                                        }))}
                                        required
                                        disabled={!formData.projectId}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
                                    >
                                        <option value="">Select Center</option>
                                        {filteredCenters.map(center => (
                                            <option key={center.id} value={center.id}>
                                                {center.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Semester *
                                    </label>
                                    <select
                                        value={formData.semesterId}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            semesterId: e.target.value
                                        }))}
                                        required
                                        disabled={!formData.centerId}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
                                    >
                                        <option value="">Select Semester</option>
                                        {semesters?.map(semester => (
                                            <option key={semester.id} value={semester.id}>
                                                {semester.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Level *
                                    </label>
                                    <select
                                        value={formData.level}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            level: e.target.value as StudentEnrollment['level']
                                        }))}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        {levelOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {editingId && (
                                <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
                                    <p className="text-sm text-orange-800">
                                        <strong>Note:</strong> Updating this enrollment will not affect the active status.
                                        Use the toggle button to activate/deactivate enrollments.
                                    </p>
                                </div>
                            )}

                            {!editingId && (
                                <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
                                    <p className="text-sm text-orange-800">
                                        <strong>Note:</strong> Creating a new enrollment will automatically deactivate
                                        the current active enrollment. Only one enrollment can be active at a time.
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <CustomButton
                                    type="submit"
                                    variant="default"
                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                    isLoading={createEnrollmentMutation.isPending || updateEnrollmentMutation.isPending}
                                    loadingMessage={editingId ? 'Updating...' : 'Creating...'}
                                >
                                    {editingId ? 'Update Enrollment' : 'Create Enrollment'}
                                </CustomButton>
                                <CustomButton
                                    type="button"
                                    variant="outline"
                                    onClick={resetForm}
                                >
                                    Cancel
                                </CustomButton>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active Enrollments */}
            {enrollments && enrollments.active.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Active Enrollment
                    </h4>
                    <div className="space-y-3">
                        {enrollments.active.map(enrollment => (
                            <EnrollmentCard
                                key={enrollment.id}
                                enrollment={enrollment}
                                onEdit={handleStartEdit}
                                onToggleActive={handleToggleActive}
                                isActive={true}
                                formatDate={formatDate}
                                isToggling={updateEnrollmentMutation.isPending}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Inactive Enrollments */}
            {enrollments && enrollments.inactive.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Past Enrollments ({enrollments.inactive.length})
                    </h4>
                    <div className="space-y-3">
                        {enrollments.inactive.map(enrollment => (
                            <EnrollmentCard
                                key={enrollment.id}
                                enrollment={enrollment}
                                onEdit={handleStartEdit}
                                onToggleActive={handleToggleActive}
                                isActive={false}
                                formatDate={formatDate}
                                isToggling={updateEnrollmentMutation.isPending}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {enrollments && enrollments.all.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Enrollments Yet</h3>
                    <p className="text-gray-600 mb-4">
                        This student hasn't been enrolled in any project yet.
                    </p>
                    <CustomButton
                        onClick={handleStartAdd}
                        variant="default"
                        className="flex items-center gap-2 mx-auto bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        <Plus className="w-4 h-4" />
                        Add First Enrollment
                    </CustomButton>
                </div>
            )}

            {/* Deactivation Warning Modal */}
            <Modal
                isOpen={!!enrollmentToDeactivate}
                onClose={() => setEnrollmentToDeactivate(null)}
                title="Deactivate Enrollment?"
                closeOnBackdrop={false}
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h4 className="font-medium text-orange-900 mb-1">Important Notice</h4>
                            <p className="text-sm text-orange-800">
                                Deactivating this enrollment will mark it as inactive. The student will no longer
                                be considered enrolled in this project/center/semester combination.
                            </p>
                        </div>
                    </div>

                    {enrollmentToDeactivate && (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Enrollment Details:</h5>
                            <ul className="space-y-1 text-sm text-gray-600">
                                <li><strong>Project:</strong> {enrollmentToDeactivate.project?.name}</li>
                                <li><strong>Center:</strong> {enrollmentToDeactivate.center?.name}</li>
                                <li><strong>Semester:</strong> {enrollmentToDeactivate.semester?.name}</li>
                                <li><strong>Level:</strong> {enrollmentToDeactivate.level.replace('_', ' ')}</li>
                            </ul>
                        </div>
                    )}

                    <p className="text-sm text-gray-600">
                        Are you sure you want to deactivate this enrollment? You can reactivate it later if needed.
                    </p>

                    <div className="flex gap-3 pt-4">
                        <CustomButton
                            onClick={() => enrollmentToDeactivate && confirmToggleActive(enrollmentToDeactivate)}
                            variant="destructive"
                            className="flex-1"
                            isLoading={updateEnrollmentMutation.isPending}
                            loadingMessage="Deactivating..."
                        >
                            Yes, Deactivate
                        </CustomButton>
                        <CustomButton
                            onClick={() => setEnrollmentToDeactivate(null)}
                            variant="outline"
                            className="flex-1"
                            disabled={updateEnrollmentMutation.isPending}
                        >
                            Cancel
                        </CustomButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

interface EnrollmentCardProps {
    enrollment: StudentEnrollment;
    onEdit: (enrollment: StudentEnrollment) => void;
    onToggleActive: (enrollment: StudentEnrollment) => void;
    isActive: boolean;
    formatDate: (date: string) => string;
    isToggling: boolean;
}

const EnrollmentCard = ({
    enrollment,
    onEdit,
    onToggleActive,
    isActive,
    formatDate,
    isToggling
}: EnrollmentCardProps) => {
    const getLevelLabel = (level: string) => {
        const labels: Record<string, string> = {
            LEVEL_1: 'Level 1',
            LEVEL_2: 'Level 2',
            LEVEL_3: 'Level 3',
            LEVEL_4: 'Level 4',
            PRIMARY_A: 'Primary A',
            PRIMARY_B: 'Primary B'
        };
        return labels[level] || level;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`border rounded-lg p-4 ${isActive
                ? 'bg-green-50 border-green-200'
                : 'bg-white border-gray-200'
                }`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        {isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3" />
                                Active
                            </span>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {getLevelLabel(enrollment.level)}
                        </span>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">
                            {enrollment.project?.name || 'Unknown Project'}
                        </p>
                        <p className="text-sm text-gray-600">
                            {enrollment.center?.name || 'Unknown Center'}
                        </p>
                        <p className="text-sm text-gray-600">
                            {enrollment.semester?.name || 'Unknown Semester'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                            <Calendar className="w-3 h-3" />
                            <span>Enrolled: {formatDate(enrollment.enrolledAt)}</span>
                            {enrollment.promotedAt && (
                                <span>• Ended: {formatDate(enrollment.promotedAt)}</span>
                            )}
                        </div>
                    </div>
                </div>

                <ProtectedComponent requireAdmin>
                    <div className="flex flex-col items-end space-y-2">
                        <button
                            onClick={() => onToggleActive(enrollment)}
                            disabled={isToggling}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${isActive
                                ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
                                }`}
                        >
                            {isActive ? (
                                <>
                                    <XCircle className="w-4 h-4" />
                                    <span>Deactivate</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Activate</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => onEdit(enrollment)}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 text-sm font-medium border border-gray-200"
                        >
                            <Edit2 className="w-4 h-4" />
                            <span>Edit</span>
                        </button>
                    </div>
                </ProtectedComponent>
            </div>
        </motion.div>
    );
};

export default EnrollmentManager;
