import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, UserCheck, UserX, TrendingUp, Award, Filter, Edit, X } from 'lucide-react';
import DoodleBackground from '@/components/DoodleBackground';
import { CustomButton } from '@/components/ui/custom-button';
import {
    useExam,
    useStudentScores,
    useUpdateStudentScore,
    useBulkCreateStudentScores,
    useExamStatistics,
} from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useStudentAttendanceRecords } from '@/hooks/useStudentAttendanceQueries';
import toast from 'react-hot-toast';
import type { StudentExamScore } from '@/types/exam';
import type { StudentAttendanceRecord } from '@/types/api';

interface ScoreEntry {
    studentId: string;
    enrollmentId: string;
    studentName: string;
    studentLevel: string;
    listeningScore: number;
    speakingScore: number;
    readingScore: number;
    writingScore: number;
    isAbsent: boolean;
    existingScoreId?: string;
}

interface EditModalState {
    isOpen: boolean;
    entry: ScoreEntry | null;
    originalIndex: number;
}

type Level = 'ALL' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'PRIMARY_A' | 'PRIMARY_B';

export default function ExamScores() {
    const navigate = useNavigate();
    const { projectId, centerId, semesterId, examId } = useParams<{
        projectId: string;
        centerId: string;
        semesterId: string;
        examId: string;
    }>();
    const { user } = useAuth();

    const { data: exam, isLoading: loadingExam } = useExam(examId!);
    const { data: existingScores, isLoading: loadingScores } = useStudentScores({ examId });
    const { data: stats } = useExamStatistics(examId!);

    const examDateStr = exam ? new Date(exam.examDate).toISOString().split('T')[0] : '';
    const { data: attendanceData } = useStudentAttendanceRecords({
        date: examDateStr,
        projectId: exam?.projectId,
        centerId: exam?.centerId,
        semesterId: exam?.semesterId,
    });

    const updateScoreMutation = useUpdateStudentScore();
    const bulkCreateMutation = useBulkCreateStudentScores();

    const [scoreEntries, setScoreEntries] = useState<ScoreEntry[]>([]);
    const [showStats, setShowStats] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<Level>('ALL');
    const [showAbsentStudents, setShowAbsentStudents] = useState(true);
    const [marksUpdatePending, setMarksUpdatePending] = useState(false);
    const [editModal, setEditModal] = useState<EditModalState>({
        isOpen: false,
        entry: null,
        originalIndex: -1,
    });
    const [tempScores, setTempScores] = useState<ScoreEntry | null>(null);

    // Check if user can edit scores (ADMIN and CENTER_MANAGER only)
    const canEditScores = useMemo(() => {
        if (!user || !exam) return false;
        if (user.role === 'ADMIN') return true;

        return user.roleAssignments?.some(
            (assignment) =>
                assignment.subRole === 'CENTER_MANAGER' &&
                assignment.isActive &&
                assignment.projectId === exam.projectId &&
                assignment.centerId === exam.centerId &&
                assignment.semesterId === exam.semesterId
        );
    }, [user, exam]);

    useEffect(() => {
        if (exam && attendanceData?.attendance && existingScores) {
            // Include all students (both PRESENT and ABSENT)
            const allStudents = attendanceData.attendance;

            const entries: ScoreEntry[] = allStudents.map((record: StudentAttendanceRecord) => {
                const student = record.student;
                const enrollment = record.enrollment;
                const existingScore = existingScores.find(
                    (s: StudentExamScore) => s.studentId === student?.id
                );

                // Sync isAbsent from attendance status
                const isAbsent = record.status === 'ABSENT' || record.status === 'HOLIDAY';

                return {
                    studentId: student?.id || '',
                    enrollmentId: record.enrollmentId,
                    studentName: student?.name || 'Unknown',
                    studentLevel: enrollment?.level || 'LEVEL_1',
                    listeningScore: existingScore?.listeningScore || 0,
                    speakingScore: existingScore?.speakingScore || 0,
                    readingScore: existingScore?.readingScore || 0,
                    writingScore: existingScore?.writingScore || 0,
                    isAbsent: isAbsent, // Synced from attendance data
                    existingScoreId: existingScore?.id,
                };
            });

            setScoreEntries(entries);
        }
    }, [exam, attendanceData, existingScores]);

    const filteredEntries = useMemo(() => {
        let filtered = scoreEntries;

        // Filter by level
        if (selectedLevel !== 'ALL') {
            filtered = filtered.filter((entry) => entry.studentLevel === selectedLevel);
        }

        // Filter by attendance status
        if (!showAbsentStudents) {
            filtered = filtered.filter((entry) => !entry.isAbsent);
        }

        // Filter by marks update pending
        if (marksUpdatePending) {
            filtered = filtered.filter((entry) => !entry.existingScoreId);
        }

        return filtered;
    }, [scoreEntries, selectedLevel, showAbsentStudents, marksUpdatePending]);

    const availableLevels = useMemo(() => {
        const levels = new Set(scoreEntries.map((entry) => entry.studentLevel));
        return ['ALL', ...Array.from(levels).sort()] as Level[];
    }, [scoreEntries]);

    const calculateTotal = (entry: ScoreEntry) => {
        if (entry.isAbsent) return 0;
        return entry.listeningScore + entry.speakingScore + entry.readingScore + entry.writingScore;
    };

    const openEditModal = (entry: ScoreEntry) => {
        const realIndex = scoreEntries.findIndex((e) => e.studentId === entry.studentId);
        setTempScores({ ...entry });
        setEditModal({ isOpen: true, entry: { ...entry }, originalIndex: realIndex });
    };

    const closeEditModal = () => {
        setEditModal({ isOpen: false, entry: null, originalIndex: -1 });
        setTempScores(null);
    };

    const handleScoreChange = (field: keyof ScoreEntry, value: number | boolean) => {
        if (!tempScores) return;
        // Prevent changing isAbsent as it's synced from attendance
        if (field === 'isAbsent') return;

        const updated = { ...tempScores, [field]: value };
        setTempScores(updated);
    };

    const handleSaveScore = async () => {
        if (!tempScores || !exam || editModal.originalIndex === -1) return;

        // Validate scores
        if (!tempScores.isAbsent) {
            if (
                tempScores.listeningScore < 0 || tempScores.listeningScore > exam.listeningMaxMarks ||
                tempScores.speakingScore < 0 || tempScores.speakingScore > exam.speakingMaxMarks ||
                tempScores.readingScore < 0 || tempScores.readingScore > exam.readingMaxMarks ||
                tempScores.writingScore < 0 || tempScores.writingScore > exam.writingMaxMarks
            ) {
                toast.error('Invalid scores. Please check the marks.');
                return;
            }
        }

        try {
            if (tempScores.existingScoreId) {
                await updateScoreMutation.mutateAsync({
                    scoreId: tempScores.existingScoreId.toString(),
                    data: {
                        listeningScore: tempScores.listeningScore,
                        speakingScore: tempScores.speakingScore,
                        readingScore: tempScores.readingScore,
                        writingScore: tempScores.writingScore,
                        isAbsent: tempScores.isAbsent,
                    },
                });
            } else {
                await bulkCreateMutation.mutateAsync({
                    examId: examId!,
                    scores: [{
                        studentId: tempScores.studentId.toString(),
                        enrollmentId: tempScores.enrollmentId.toString(),
                        listeningScore: tempScores.listeningScore,
                        speakingScore: tempScores.speakingScore,
                        readingScore: tempScores.readingScore,
                        writingScore: tempScores.writingScore,
                        isAbsent: tempScores.isAbsent,
                    }],
                });
            }

            const updated = [...scoreEntries];
            updated[editModal.originalIndex] = tempScores;
            setScoreEntries(updated);
            toast.success('Score saved successfully!');
            closeEditModal();
        } catch {
            toast.error('Failed to save score. Please try again.');
        }
    };

    if (loadingExam || loadingScores) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading exam scores...</p>
                </div>
            </div>
        );
    }

    if (!exam) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Exam Not Found</h2>
                    <CustomButton onClick={() => navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`)}>Back to Exams</CustomButton>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative bg-gradient-to-br from-orange-50 via-white to-orange-50">
            <DoodleBackground />

            <div className="relative z-10 p-3 sm:p-4 lg:p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <button
                        onClick={() => navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`)}
                        className="text-orange-600 hover:text-orange-700 mb-3 flex items-center gap-2 group"
                    >
                        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="text-sm sm:text-base">Back to Exams</span>
                    </button>

                    <div className="mb-4">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-1">
                            {exam.name}
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-600">
                            {new Date(exam.examDate).toLocaleDateString()} • {exam.level.replace('_', ' ')}
                        </p>
                        {!canEditScores && (
                            <p className="text-xs text-amber-600 mt-1 font-medium">
                                👁️ View Only - Only Admin and Center Managers can edit scores
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                        <CustomButton
                            variant="outline"
                            onClick={() => setShowStats(!showStats)}
                            className="flex items-center gap-2 text-sm"
                        >
                            <TrendingUp className="w-4 h-4" />
                            <span className="hidden sm:inline">{showStats ? 'Hide' : 'Show'} Stats</span>
                            <span className="sm:hidden">Stats</span>
                        </CustomButton>
                        <CustomButton
                            variant="outline"
                            onClick={() => setShowAbsentStudents(!showAbsentStudents)}
                            className="flex items-center gap-2 text-sm"
                        >
                            {showAbsentStudents ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                            <span>{showAbsentStudents ? 'Hide Absent Students' : 'Show Absent Students'}</span>
                        </CustomButton>
                        <CustomButton
                            variant={marksUpdatePending ? 'default' : 'outline'}
                            onClick={() => setMarksUpdatePending(!marksUpdatePending)}
                            className="flex items-center gap-2 text-sm"
                        >
                            <Edit className="w-4 h-4" />
                            <span className="hidden sm:inline">Marks Update Pending</span>
                            <span className="sm:hidden">Marks Update Pending</span>
                        </CustomButton>
                    </div>

                    {/* Statistics Panel */}
                    {showStats && stats && (
                        <div className="mb-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-3 sm:p-4 border border-orange-100">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                                Exam Statistics
                            </h2>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                                    <p className="text-xs text-gray-600 mb-1">Listening</p>
                                    <p className="text-lg sm:text-xl font-bold text-blue-700">
                                        {stats.averageScores.listening.toFixed(1)}
                                    </p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                                    <p className="text-xs text-gray-600 mb-1">Speaking</p>
                                    <p className="text-lg sm:text-xl font-bold text-green-700">
                                        {stats.averageScores.speaking.toFixed(1)}
                                    </p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                                    <p className="text-xs text-gray-600 mb-1">Reading</p>
                                    <p className="text-lg sm:text-xl font-bold text-purple-700">
                                        {stats.averageScores.reading.toFixed(1)}
                                    </p>
                                </div>
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3">
                                    <p className="text-xs text-gray-600 mb-1">Writing</p>
                                    <p className="text-lg sm:text-xl font-bold text-orange-700">
                                        {stats.averageScores.writing.toFixed(1)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Level Filter */}
                    {availableLevels.length > 1 && (
                        <div className="mb-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-orange-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Filter className="w-4 h-4 text-gray-600" />
                                <label className="text-sm font-medium text-gray-700">Filter by Level:</label>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {availableLevels.map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setSelectedLevel(level)}
                                        className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${selectedLevel === level
                                            ? 'bg-orange-500 text-white shadow-md'
                                            : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-300'
                                            }`}
                                    >
                                        {level === 'ALL' ? 'All' : level.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Student Cards - Mobile Friendly */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {filteredEntries.map((entry) => (
                            <div
                                key={entry.studentId}
                                className={`bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-orange-100 p-4 transition-all hover:shadow-xl ${entry.isAbsent ? 'opacity-60' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                                            {entry.studentName}
                                        </h3>
                                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
                                            {entry.studentLevel.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {entry.isAbsent ? (
                                            <>
                                                <UserX className="w-5 h-5 text-red-500" />
                                                <span className="text-xs font-medium text-red-600">Absent</span>
                                            </>
                                        ) : (
                                            <>
                                                <UserCheck className="w-5 h-5 text-green-500" />
                                                <span className="text-xs font-medium text-green-600">Present</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 mb-3">
                                    <div className="flex justify-between items-center text-xs sm:text-sm">
                                        <span className="text-gray-600">Listening:</span>
                                        <span className="font-semibold text-blue-600">
                                            {entry.listeningScore}/{exam.listeningMaxMarks}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs sm:text-sm">
                                        <span className="text-gray-600">Speaking:</span>
                                        <span className="font-semibold text-green-600">
                                            {entry.speakingScore}/{exam.speakingMaxMarks}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs sm:text-sm">
                                        <span className="text-gray-600">Reading:</span>
                                        <span className="font-semibold text-purple-600">
                                            {entry.readingScore}/{exam.readingMaxMarks}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs sm:text-sm">
                                        <span className="text-gray-600">Writing:</span>
                                        <span className="font-semibold text-orange-600">
                                            {entry.writingScore}/{exam.writingMaxMarks}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500">Total Score</p>
                                        <p className="text-lg font-bold text-orange-600">
                                            {calculateTotal(entry)}/
                                            {exam.listeningMaxMarks + exam.speakingMaxMarks + exam.readingMaxMarks + exam.writingMaxMarks}
                                        </p>
                                    </div>
                                    {canEditScores && (
                                        <button
                                            onClick={() => openEditModal(entry)}
                                            className="px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all text-sm font-medium flex items-center gap-1"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                            Edit
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredEntries.length === 0 && (
                        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
                            <p className="text-gray-500 text-sm sm:text-base">
                                {marksUpdatePending
                                    ? 'No students with pending marks updates.'
                                    : selectedLevel === 'ALL'
                                        ? 'No students found for this exam date.'
                                        : `No ${selectedLevel.replace('_', ' ')} students found for this exam date.`}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Score Modal */}
            {editModal.isOpen && tempScores && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 flex items-center justify-between sm:rounded-t-2xl rounded-t-2xl">
                            <h3 className="text-lg font-semibold">Edit Score - {tempScores.studentName}</h3>
                            <button
                                onClick={closeEditModal}
                                className="p-1 hover:bg-white/20 rounded-lg transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Attendance Status Display */}
                            {tempScores.isAbsent && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                    <UserX className="w-5 h-5 text-red-600" />
                                    <div>
                                        <p className="text-sm font-medium text-red-800">Student marked as Absent</p>
                                        <p className="text-xs text-red-600">Attendance synced from attendance records</p>
                                    </div>
                                </div>
                            )}

                            {/* Score Inputs */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Listening (Max: {exam.listeningMaxMarks})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={exam.listeningMaxMarks}
                                        step="0.5"
                                        value={tempScores.listeningScore}
                                        onChange={(e) => handleScoreChange('listeningScore', parseFloat(e.target.value) || 0)}
                                        disabled={tempScores.isAbsent}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Speaking (Max: {exam.speakingMaxMarks})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={exam.speakingMaxMarks}
                                        step="0.5"
                                        value={tempScores.speakingScore}
                                        onChange={(e) => handleScoreChange('speakingScore', parseFloat(e.target.value) || 0)}
                                        disabled={tempScores.isAbsent}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reading (Max: {exam.readingMaxMarks})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={exam.readingMaxMarks}
                                        step="0.5"
                                        value={tempScores.readingScore}
                                        onChange={(e) => handleScoreChange('readingScore', parseFloat(e.target.value) || 0)}
                                        disabled={tempScores.isAbsent}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Writing (Max: {exam.writingMaxMarks})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={exam.writingMaxMarks}
                                        step="0.5"
                                        value={tempScores.writingScore}
                                        onChange={(e) => handleScoreChange('writingScore', parseFloat(e.target.value) || 0)}
                                        disabled={tempScores.isAbsent}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            {/* Total Display */}
                            <div className="bg-orange-50 rounded-xl p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Total Score:</span>
                                    <span className="text-2xl font-bold text-orange-600">
                                        {calculateTotal(tempScores)}/
                                        {exam.listeningMaxMarks + exam.speakingMaxMarks + exam.readingMaxMarks + exam.writingMaxMarks}
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={closeEditModal}
                                    className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                                >
                                    Cancel
                                </button>
                                <CustomButton
                                    onClick={handleSaveScore}
                                    isLoading={updateScoreMutation.isPending || bulkCreateMutation.isPending}
                                    loadingMessage="Saving..."
                                    className="flex-1 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Save
                                </CustomButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
