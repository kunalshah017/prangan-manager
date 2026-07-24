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
import { SemesterLevelSelect } from './levels/SemesterLevelSelect';
import { levelName } from '@/lib/levels';

interface EnrollmentManagerProps {
    studentId: string;
    studentName: string;
}

interface EnrollmentFormData {
    projectId: string;
    centerId: string;
    semesterId: string;
    semesterLevelId: string;
}

const EnrollmentManager = ({ studentId, studentName }: EnrollmentManagerProps) => {
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [enrollmentToDeactivate, setEnrollmentToDeactivate] = useState<StudentEnrollment | null>(null);
    const [formData, setFormData] = useState<EnrollmentFormData>({
        projectId: '',
        centerId: '',
        semesterId: '',
        semesterLevelId: ''
    });

    // Queries
    const { data: enrollments, isLoading: loadingEnrollments } = useStudentEnrollments(studentId);
    const { data: projects } = useProjects();
    const { data: centers } = useCenters();
    const { data: semesters } = useSemestersByCenter(formData.centerId);

    // Mutations
    const createEnrollmentMutation = useCreateEnrollment();
    const updateEnrollmentMutation = useUpdateEnrollment();

    // Filter centers by selected project
    const filteredCenters = centers?.filter(c => c.projectId === formData.projectId) || [];

    const resetForm = () => {
        setFormData({
            projectId: '',
            centerId: '',
            semesterId: '',
            semesterLevelId: ''
        });
        setIsAddingNew(false);
        setEditingId(null);
    };

    const handleStartEdit = (enrollment: StudentEnrollment) => {
        setFormData({
            projectId: enrollment.projectId,
            centerId: enrollment.centerId,
            semesterId: enrollment.semesterId,
            semesterLevelId: enrollment.semesterLevelId || ''
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

        if (!formData.projectId || !formData.centerId || !formData.semesterId || !formData.semesterLevelId) {
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-xl font-semibold text-foreground">Enrollment history</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            Manage {studentName}'s enrollments across projects and centers
                        </p>
                    </div>
                    {!isAddingNew && !editingId && (
                        <CustomButton
                            onClick={handleStartAdd}
                            variant="default"
                            size="sm"
                            className="min-h-11 w-full gap-2 sm:w-auto"
                        >
                            <Plus className="w-4 h-4" />
                            Add enrollment
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
                        className="rounded-lg border border-border bg-muted/35 p-4 sm:p-5"
                    >
                        <h4 className="mb-4 text-base font-semibold text-foreground">
                            {editingId ? 'Edit enrollment' : 'New enrollment'}
                        </h4>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-foreground">
                                        Project *
                                    </label>
                                    <select
                                        value={formData.projectId}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            projectId: e.target.value,
                                            centerId: '',
                                            semesterId: '',
                                            semesterLevelId: ''
                                        }))}
                                        required
                                        className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                                    <label className="mb-2 block text-sm font-medium text-foreground">
                                        Center *
                                    </label>
                                    <select
                                        value={formData.centerId}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            centerId: e.target.value,
                                            semesterId: '',
                                            semesterLevelId: ''
                                        }))}
                                        required
                                        disabled={!formData.projectId}
                                        className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:bg-muted"
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
                                    <label className="mb-2 block text-sm font-medium text-foreground">
                                        Semester *
                                    </label>
                                    <select
                                        value={formData.semesterId}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            semesterId: e.target.value,
                                            semesterLevelId: ''
                                        }))}
                                        required
                                        disabled={!formData.centerId}
                                        className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:bg-muted"
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
                                    <SemesterLevelSelect
                                        semesterId={formData.semesterId}
                                        value={formData.semesterLevelId}
                                        onChange={(semesterLevelId) => setFormData(prev => ({
                                            ...prev,
                                            semesterLevelId
                                        }))}
                                        disabled={!formData.semesterId}
                                        required
                                        includeInactiveCurrent={!!editingId}
                                        currentLevel={enrollments?.all.find((enrollment) => enrollment.id === editingId)?.semesterLevel || undefined}
                                    />
                                </div>
                            </div>

                            {editingId && (
                                <div className="rounded-md border border-border bg-background p-3">
                                    <p className="text-sm leading-6 text-muted-foreground">
                                        <strong>Note:</strong> Updating this enrollment will not affect the active status.
                                        Use the toggle button to activate/deactivate enrollments.
                                    </p>
                                </div>
                            )}

                            {!editingId && (
                                <div className="rounded-md border border-border bg-background p-3">
                                    <p className="text-sm leading-6 text-muted-foreground">
                                        <strong>Note:</strong> Creating a new enrollment will automatically deactivate
                                        the current active enrollment. Only one enrollment can be active at a time.
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <CustomButton
                                    type="submit"
                                    variant="default"
                                    className="min-h-11 w-full sm:w-auto"
                                    isLoading={createEnrollmentMutation.isPending || updateEnrollmentMutation.isPending}
                                    loadingMessage={editingId ? 'Updating...' : 'Creating...'}
                                >
                                    {editingId ? 'Update Enrollment' : 'Create Enrollment'}
                                </CustomButton>
                                <CustomButton
                                    type="button"
                                    variant="outline"
                                    onClick={resetForm}
                                    className="min-h-11 w-full sm:w-auto"
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
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-success">
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
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
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
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
                    <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">No enrollments yet</h3>
                    <p className="mb-4 mt-2 text-sm leading-6 text-muted-foreground">
                        This student hasn't been enrolled in any project yet.
                    </p>
                    <CustomButton
                        onClick={handleStartAdd}
                        variant="default"
                        className="mx-auto min-h-11 gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add first enrollment
                    </CustomButton>
                </div>
            )}

            {/* Deactivation Warning Modal */}
            <Modal
                isOpen={!!enrollmentToDeactivate}
                onClose={() => setEnrollmentToDeactivate(null)}
                title="Deactivate enrollment?"
                closeOnBackdrop={false}
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4">
                        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                        <div className="flex-1">
                            <h4 className="mb-1 font-semibold text-foreground">Student access will change</h4>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Deactivating this enrollment will mark it as inactive. The student will no longer
                                be considered enrolled in this project/center/semester combination.
                            </p>
                        </div>
                    </div>

                    {enrollmentToDeactivate && (
                        <div className="rounded-lg border border-border bg-muted/35 p-4">
                            <h5 className="mb-2 text-sm font-semibold text-foreground">Enrollment details</h5>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                <li><strong>Project:</strong> {enrollmentToDeactivate.project?.name}</li>
                                <li><strong>Center:</strong> {enrollmentToDeactivate.center?.name}</li>
                                <li><strong>Semester:</strong> {enrollmentToDeactivate.semester?.name}</li>
                                <li><strong>Level:</strong> {levelName(enrollmentToDeactivate.semesterLevel, enrollmentToDeactivate.level)}</li>
                            </ul>
                        </div>
                    )}

                    <p className="text-sm leading-6 text-muted-foreground">
                        Are you sure you want to deactivate this enrollment? You can reactivate it later if needed.
                    </p>

                    <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
                        <CustomButton
                            onClick={() => enrollmentToDeactivate && confirmToggleActive(enrollmentToDeactivate)}
                            variant="destructive"
                            className="min-h-11 w-full sm:flex-1"
                            isLoading={updateEnrollmentMutation.isPending}
                            loadingMessage="Deactivating..."
                        >
                            Deactivate enrollment
                        </CustomButton>
                        <CustomButton
                            onClick={() => setEnrollmentToDeactivate(null)}
                            variant="outline"
                            className="min-h-11 w-full sm:flex-1"
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
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-border bg-card p-4"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        {isActive && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                                <CheckCircle className="w-3 h-3" />
                                Active
                            </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {levelName(enrollment.semesterLevel, enrollment.level)}
                        </span>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                            {enrollment.project?.name || 'Unknown Project'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {enrollment.center?.name || 'Unknown Center'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {enrollment.semester?.name || 'Unknown Semester'}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Enrolled: {formatDate(enrollment.enrolledAt)}</span>
                            {enrollment.promotedAt && (
                                <span>• Ended: {formatDate(enrollment.promotedAt)}</span>
                            )}
                        </div>
                    </div>
                </div>

                <ProtectedComponent requireAdmin>
                    <div className="flex flex-col gap-2 sm:items-end">
                        <button
                            onClick={() => onToggleActive(enrollment)}
                            disabled={isToggling}
                            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors sm:w-auto ${isActive
                                ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                                : 'border-success/30 text-success hover:bg-success/10'
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
                            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:w-auto"
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
