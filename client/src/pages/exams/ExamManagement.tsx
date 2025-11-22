import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Edit, ClipboardList, BarChart3, Calendar, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import Modal from '@/components/ui/modal';
import { CustomButton } from '@/components/ui/custom-button';
import { useExams, useDeleteExam } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import type { Exam } from '@/types/exam';
import toast from 'react-hot-toast';

const getCycleDisplay = (cycle: string): string => {
    const cycleMap: Record<string, string> = {
        SA_1: 'SA-1',
        SA_2: 'SA-2',
        SA_3: 'SA-3',
    };
    return cycleMap[cycle] || cycle;
};

const ExamManagement = () => {
    const { projectId, centerId, semesterId } = useParams<{
        projectId: string;
        centerId: string;
        semesterId: string;
    }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{
        isOpen: boolean;
        examId: string;
        examName: string;
        isActive: boolean;
        deleteType: 'soft' | 'hard' | null;
    } | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
    const [selectedCycle, setSelectedCycle] = useState<string>('ALL');

    // Check if user has permission to create/edit exams (ADMIN and CURRICULUM_MENTOR only)
    const hasManagePermission = useMemo(() => {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;

        return user.roleAssignments?.some(
            assignment =>
                assignment.subRole === 'CURRICULUM_MENTOR' &&
                assignment.isActive &&
                assignment.projectId === projectId &&
                assignment.centerId === centerId &&
                assignment.semesterId === semesterId
        );
    }, [user, projectId, centerId, semesterId]);

    // Check if user is ADMIN for delete permission
    const isAdmin = useMemo(() => {
        return user?.role === 'ADMIN';
    }, [user]);

    // Determine if user is ONLY an educator
    const isOnlyEducator = useMemo(() => {
        if (!user) return false;
        if (user.role === 'ADMIN') return false;

        const relevantAssignments = user.roleAssignments?.filter(
            assignment =>
                assignment.isActive &&
                assignment.projectId === projectId &&
                assignment.centerId === centerId &&
                assignment.semesterId === semesterId
        );

        const hasPrivilegedRole = relevantAssignments?.some(
            assignment =>
                assignment.subRole === 'CENTER_MANAGER' ||
                assignment.subRole === 'CURRICULUM_MENTOR'
        );

        if (hasPrivilegedRole) return false;

        const isEducator = relevantAssignments?.some(
            assignment => assignment.subRole === 'EDUCATOR'
        );

        return isEducator;
    }, [user, projectId, centerId, semesterId]);

    // Get educator's assigned level
    const educatorLevel = useMemo(() => {
        if (!isOnlyEducator || !user) return null;

        const educatorAssignment = user.roleAssignments?.find(
            assignment =>
                assignment.subRole === 'EDUCATOR' &&
                assignment.isActive &&
                assignment.projectId === projectId &&
                assignment.centerId === centerId &&
                assignment.semesterId === semesterId
        );

        return educatorAssignment?.level || null;
    }, [isOnlyEducator, user, projectId, centerId, semesterId]);

    // Fetch exams for this context (show inactive exams to admin)
    const { data: exams = [], isLoading } = useExams({
        projectId,
        centerId,
        semesterId,
        ...(!isAdmin && { isActive: true }), // Show all exams to admin, only active to others
        ...(isOnlyEducator && educatorLevel && { level: educatorLevel }),
    });

    const { mutate: deleteExam, isPending: isDeleting } = useDeleteExam();

    // Filter exams based on selected level and cycle
    const filteredExams = useMemo(() => {
        let filtered = exams;

        if (selectedLevel !== 'ALL') {
            filtered = filtered.filter((exam: Exam) => exam.level === selectedLevel);
        }

        if (selectedCycle !== 'ALL') {
            filtered = filtered.filter((exam: Exam) => exam.cycle === selectedCycle);
        }

        return filtered;
    }, [exams, selectedLevel, selectedCycle]);

    // Get available levels and cycles from exams
    const availableLevels = useMemo(() => {
        const levels = new Set(exams.map((exam: Exam) => exam.level));
        return ['ALL', ...Array.from(levels).sort()];
    }, [exams]);

    const availableCycles = useMemo(() => {
        const cycles = new Set(exams.map((exam: Exam) => exam.cycle));
        return ['ALL', ...Array.from(cycles).sort()];
    }, [exams]);

    const handleDelete = (id: string, name: string, isActive: boolean) => {
        setConfirmDelete({
            isOpen: true,
            examId: id,
            examName: name,
            isActive,
            deleteType: null,
        });
    };

    const confirmDeleteAction = (hardDelete: boolean) => {
        if (!confirmDelete) return;

        const { examId } = confirmDelete;
        setDeleteId(examId);

        deleteExam(
            { examId, hard: hardDelete },
            {
                onSuccess: () => {
                    toast.success(hardDelete ? 'Exam permanently deleted' : 'Exam deactivated successfully');
                    setDeleteId(null);
                    setConfirmDelete(null);
                },
                onError: (error: unknown) => {
                    const err = error as { message?: string };
                    toast.error(err?.message || 'Failed to delete exam');
                    setDeleteId(null);
                    setConfirmDelete(null);
                },
            }
        );
    };

    const handleViewScores = (examId: string) => {
        navigate(
            `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams/${examId}/scores`
        );
    };

    const handleEdit = (examId: string) => {
        navigate(
            `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams/${examId}/edit`
        );
    };

    const getLevelDisplay = (level: string) => {
        const levelMap: Record<string, string> = {
            LEVEL_1: 'Level 1',
            LEVEL_2: 'Level 2',
            LEVEL_3: 'Level 3',
            LEVEL_4: 'Level 4',
            PRIMARY_A: 'Primary A',
            PRIMARY_B: 'Primary B',
        };
        return levelMap[level] || level;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60dvh]">
                <LoadingButterfly size="md" />
            </div>
        );
    }

    return (
        <div className="w-full relative p-2 sm:p-0">
            <DoodleBackground numElements={10} />

            {/* Header */}
            <div className="mb-4 sm:mb-6 relative z-10">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
                    <div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Exam Management</h1>
                        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                            {isOnlyEducator && educatorLevel
                                ? `View and manage ${getLevelDisplay(educatorLevel)} exams`
                                : 'Create and manage exams for different levels'}
                        </p>
                    </div>
                    {hasManagePermission && (
                        <CustomButton
                            onClick={() =>
                                navigate(
                                    `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams/create`
                                )
                            }
                            className="bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm w-full sm:w-auto"
                        >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                            Create Exam
                        </CustomButton>
                    )}
                </div>
            </div>

            {/* Filters */}
            {exams.length > 0 && (
                <div className="mb-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-3 sm:p-4 border border-orange-100 relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter className="w-4 h-4 text-gray-600" />
                        <h3 className="text-sm font-medium text-gray-700">Filter Exams</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Level Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                Level
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {availableLevels.map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setSelectedLevel(level)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedLevel === level
                                            ? 'bg-orange-500 text-white shadow-md'
                                            : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-300'
                                            }`}
                                    >
                                        {level === 'ALL' ? 'All Levels' : getLevelDisplay(level)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cycle Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                Exam Cycle
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {availableCycles.map((cycle) => (
                                    <button
                                        key={cycle}
                                        onClick={() => setSelectedCycle(cycle)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCycle === cycle
                                            ? 'bg-blue-500 text-white shadow-md'
                                            : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-300'
                                            }`}
                                    >
                                        {cycle === 'ALL' ? 'All Cycles' : getCycleDisplay(cycle)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Exams Grid */}
            <div className="relative z-10">
                {filteredExams.length === 0 && exams.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/80 rounded-lg border shadow-sm p-6 sm:p-12 text-center"
                    >
                        <ClipboardList className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                        <h3 className="text-lg sm:text-xl font-semibold mb-2">No Matching Exams</h3>
                        <p className="text-muted-foreground text-xs sm:text-sm mb-4">
                            No exams found for the selected filters. Try adjusting your filter criteria.
                        </p>
                        <div className="flex gap-2 justify-center">
                            <CustomButton
                                onClick={() => {
                                    setSelectedLevel('ALL');
                                    setSelectedCycle('ALL');
                                }}
                                variant="outline"
                                className="text-xs sm:text-sm"
                            >
                                Clear Filters
                            </CustomButton>
                        </div>
                    </motion.div>
                ) : exams.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/80 rounded-lg border shadow-sm p-6 sm:p-12 text-center"
                    >
                        <ClipboardList className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                        <h3 className="text-lg sm:text-xl font-semibold mb-2">No Exams Yet</h3>
                        <p className="text-muted-foreground text-xs sm:text-sm mb-4 sm:mb-6">
                            {isOnlyEducator && educatorLevel
                                ? `No exams found for ${getLevelDisplay(educatorLevel)}`
                                : 'Create your first exam to start tracking student performance'}
                        </p>
                        {hasManagePermission && (
                            <CustomButton
                                onClick={() =>
                                    navigate(
                                        `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams/create`
                                    )
                                }
                                className="bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm"
                            >
                                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                                Create First Exam
                            </CustomButton>
                        )}
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {filteredExams.map((exam: Exam, index: number) => (
                            <motion.div
                                key={exam.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white/80 rounded-lg border shadow-sm p-3 sm:p-5 hover:shadow-md transition-shadow"
                            >
                                <div className="flex justify-between items-start mb-2 sm:mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm sm:text-base md:text-lg mb-1.5 truncate">
                                            {exam.name}
                                        </h3>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-orange-100 text-orange-800">
                                                {getLevelDisplay(exam.level)}
                                            </span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800">
                                                {getCycleDisplay(exam.cycle)}
                                            </span>
                                            {!exam.isActive && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gray-200 text-gray-700">
                                                    Inactive
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(exam.examDate)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {exam.description && (
                                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
                                        {exam.description}
                                    </p>
                                )}

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-2 mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-md">
                                    <div>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total Marks</p>
                                        <p className="text-base sm:text-lg font-semibold">
                                            {exam.totalMaxMarks}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground">Scores Entered</p>
                                        <p className="text-base sm:text-lg font-semibold text-green-600">
                                            {exam._count?.studentScores || 0}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1.5 sm:gap-2">
                                    <button
                                        onClick={() => handleViewScores(exam.id)}
                                        className={cn(
                                            buttonVariants({ variant: 'default', size: 'sm' }),
                                            'flex-1 bg-orange-600 hover:bg-orange-700 text-xs h-8 sm:h-9'
                                        )}
                                    >
                                        <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                        <span className="hidden sm:inline">View Scores</span>
                                        <span className="sm:hidden">Scores</span>
                                    </button>
                                    {hasManagePermission && (
                                        <>
                                            <button
                                                onClick={() => handleEdit(exam.id)}
                                                className={cn(
                                                    buttonVariants({ variant: 'outline', size: 'sm' }),
                                                    'h-8 sm:h-9 px-2 sm:px-3'
                                                )}
                                                title="Edit"
                                            >
                                                <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleDelete(exam.id, exam.name, exam.isActive)}
                                                    disabled={isDeleting && deleteId === exam.id}
                                                    className={cn(
                                                        buttonVariants({ variant: 'outline', size: 'sm' }),
                                                        'text-red-600 hover:text-red-700 hover:bg-red-50 h-8 sm:h-9 px-2 sm:px-3'
                                                    )}
                                                    title="Delete"
                                                >
                                                    {isDeleting && deleteId === exam.id ? (
                                                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    )}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <Modal
                    isOpen={confirmDelete.isOpen}
                    onClose={() => setConfirmDelete(null)}
                    title="Delete Exam"
                    className="max-w-md"
                >
                    <div className="space-y-4">
                        <p className="text-sm text-gray-700">
                            What would you like to do with <strong>{confirmDelete.examName}</strong>?
                        </p>

                        {!confirmDelete.deleteType ? (
                            <>
                                <div className="space-y-3">
                                    {confirmDelete.isActive && (
                                        <button
                                            onClick={() => setConfirmDelete({ ...confirmDelete, deleteType: 'soft' })}
                                            className="w-full p-4 border-2 border-orange-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-gray-900 mb-1">Make Inactive</h4>
                                                    <p className="text-xs text-gray-600">Hide the exam but keep all data. Can be reactivated later.</p>
                                                </div>
                                            </div>
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setConfirmDelete({ ...confirmDelete, deleteType: 'hard' })}
                                        className="w-full p-4 border-2 border-red-200 rounded-lg hover:border-red-400 hover:bg-red-50 transition-all text-left"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                                <Trash2 className="w-5 h-5 text-red-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-gray-900 mb-1">Delete Permanently</h4>
                                                <p className="text-xs text-gray-600">Remove all exam data including student scores. This cannot be undone.</p>
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                <div className="flex justify-end">
                                    <CustomButton
                                        onClick={() => setConfirmDelete(null)}
                                        variant="outline"
                                        className="text-sm"
                                    >
                                        Cancel
                                    </CustomButton>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={`border rounded-lg p-3 ${confirmDelete.deleteType === 'hard'
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-orange-50 border-orange-200'
                                    }`}>
                                    <p className={`text-sm ${confirmDelete.deleteType === 'hard'
                                        ? 'text-red-800'
                                        : 'text-orange-800'
                                        }`}>
                                        <strong>Warning:</strong> {confirmDelete.deleteType === 'hard'
                                            ? 'This will permanently delete the exam and all student scores. This action cannot be undone.'
                                            : 'This will make the exam inactive and hide it from the exam list. You can reactivate it later from the admin panel.'}
                                    </p>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <CustomButton
                                        onClick={() => setConfirmDelete({ ...confirmDelete, deleteType: null })}
                                        variant="outline"
                                        className="text-sm"
                                        disabled={isDeleting}
                                    >
                                        Back
                                    </CustomButton>
                                    <CustomButton
                                        onClick={() => confirmDeleteAction(confirmDelete.deleteType === 'hard')}
                                        isLoading={isDeleting}
                                        loadingMessage={confirmDelete.deleteType === 'hard' ? 'Deleting...' : 'Deactivating...'}
                                        className={`text-sm ${confirmDelete.deleteType === 'hard'
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-orange-600 hover:bg-orange-700'
                                            } text-white`}
                                    >
                                        {confirmDelete.deleteType === 'hard' ? 'Delete Permanently' : 'Make Inactive'}
                                    </CustomButton>
                                </div>
                            </>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ExamManagement;
