import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar as CalendarIcon } from 'lucide-react';
import DoodleBackground from '@/components/DoodleBackground';
import { CustomButton } from '@/components/ui/custom-button';
import { useExam, useUpdateExam } from '@/hooks';
import toast from 'react-hot-toast';
import type { Level, ExamCycle } from '@/types/exam';

export default function EditExam() {
    const navigate = useNavigate();
    const { projectId, centerId, semesterId, examId } = useParams<{
        projectId: string;
        centerId: string;
        semesterId: string;
        examId: string;
    }>();

    const { data: exam, isLoading: loadingExam } = useExam(examId!);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        level: '' as Level | '',
        cycle: '' as ExamCycle | '',
        examDate: '',
        listeningMaxMarks: 0,
        speakingMaxMarks: 0,
        readingMaxMarks: 0,
        writingMaxMarks: 0,
    });

    useEffect(() => {
        if (exam) {
            setFormData({
                name: exam.name,
                description: exam.description || '',
                level: exam.level as Level,
                cycle: exam.cycle as ExamCycle,
                examDate: new Date(exam.examDate).toISOString().split('T')[0],
                listeningMaxMarks: exam.listeningMaxMarks,
                speakingMaxMarks: exam.speakingMaxMarks,
                readingMaxMarks: exam.readingMaxMarks,
                writingMaxMarks: exam.writingMaxMarks,
            });
        }
    }, [exam]);

    const updateExamMutation = useUpdateExam();

    // Check permissions - temporarily allow all authenticated users
    const canEdit = true; // TODO: Implement proper role checking

    if (!canEdit) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        Access Denied
                    </h2>
                    <p className="text-gray-600 mb-6">
                        You don't have permission to edit exams. Please contact an administrator.
                    </p>
                    <CustomButton onClick={() => navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`)}>
                        Back to Exams
                    </CustomButton>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (
            !formData.name ||
            !formData.level ||
            !formData.cycle ||
            !formData.examDate ||
            formData.listeningMaxMarks <= 0 ||
            formData.speakingMaxMarks <= 0 ||
            formData.readingMaxMarks <= 0 ||
            formData.writingMaxMarks <= 0
        ) {
            toast.error('Please fill all required fields with valid values');
            return;
        }

        if (!isWeekend(formData.examDate)) {
            toast.error('Exam date must be a weekend (Saturday or Sunday)');
            return;
        }

        try {
            await updateExamMutation.mutateAsync({
                examId: examId!,
                data: {
                    name: formData.name,
                    description: formData.description || undefined,
                    level: formData.level as Level,
                    cycle: formData.cycle as ExamCycle,
                    examDate: new Date(formData.examDate).toISOString(),
                    listeningMaxMarks: formData.listeningMaxMarks,
                    speakingMaxMarks: formData.speakingMaxMarks,
                    readingMaxMarks: formData.readingMaxMarks,
                    writingMaxMarks: formData.writingMaxMarks,
                },
            });

            toast.success('Exam updated successfully!');
            navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to update exam';
            toast.error(message);
        }
    };

    const totalMarks =
        formData.listeningMaxMarks +
        formData.speakingMaxMarks +
        formData.readingMaxMarks +
        formData.writingMaxMarks;

    // Check if date is a weekend (Saturday or Sunday)
    const isWeekend = (dateString: string) => {
        if (!dateString) return false;
        const date = new Date(dateString);
        const day = date.getDay();
        return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
    };

    if (loadingExam) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading exam details...</p>
                </div>
            </div>
        );
    }

    if (!exam) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        Exam Not Found
                    </h2>
                    <p className="text-gray-600 mb-6">
                        The exam you're looking for doesn't exist or has been removed.
                    </p>
                    <CustomButton onClick={() => navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`)}>
                        Back to Exams
                    </CustomButton>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative bg-gradient-to-br from-orange-50 via-white to-orange-50">
            <DoodleBackground />

            <div className="relative z-10 p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-6 sm:mb-8">
                        <button
                            onClick={() => navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`)}
                            className="text-orange-600 hover:text-orange-700 mb-4 flex items-center gap-2 group transition-all duration-200"
                        >
                            <svg
                                className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                            <span>Back to Exams</span>
                        </button>

                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
                            Edit Exam
                        </h1>
                        <p className="text-sm sm:text-base text-gray-600">
                            Update exam details and LSRW marks configuration
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information Card */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-orange-100">
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">
                                Basic Information
                            </h2>

                            <div className="space-y-4 sm:space-y-6">
                                {/* Exam Name */}
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                        Exam Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                                        placeholder="e.g., Monthly Assessment - January"
                                        required
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, description: e.target.value })
                                        }
                                        rows={3}
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 resize-none"
                                        placeholder="Additional details about the exam..."
                                    />
                                </div>

                                {/* Level and Date Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                                    {/* Level */}
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                            Level *
                                        </label>
                                        <select
                                            value={formData.level}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    level: e.target.value as Level,
                                                })
                                            }
                                            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                                            required
                                        >
                                            <option value="">Select Level</option>
                                            <option value="PRIMARY_A">Primary A</option>
                                            <option value="PRIMARY_B">Primary B</option>
                                            <option value="LEVEL_1">Level 1</option>
                                            <option value="LEVEL_2">Level 2</option>
                                            <option value="LEVEL_3">Level 3</option>
                                            <option value="LEVEL_4">Level 4</option>
                                        </select>
                                    </div>

                                    {/* Exam Cycle */}
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                            Exam Cycle *
                                        </label>
                                        <select
                                            value={formData.cycle}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    cycle: e.target.value as ExamCycle,
                                                })
                                            }
                                            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                                            required
                                        >
                                            <option value="">Select Cycle</option>
                                            <option value="PRE_ASSESSMENT">Pre-Assessment</option>
                                            <option value="SA_1">SA-1</option>
                                            <option value="SA_2">SA-2</option>
                                            <option value="SA_3">SA-3</option>
                                        </select>
                                    </div>

                                    {/* Exam Date */}
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                            Exam Date *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={formData.examDate}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, examDate: e.target.value })
                                                }
                                                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 text-xs sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                                                required
                                            />
                                            <CalendarIcon className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Only weekends (Saturday/Sunday) are allowed
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* LSRW Marks Configuration Card */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-orange-100">
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">
                                LSRW Marks Configuration
                            </h2>

                            <div className="space-y-4 sm:space-y-6">
                                {/* LSRW Marks Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    {/* Listening */}
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                            Listening Max Marks *
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={formData.listeningMaxMarks}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    listeningMaxMarks: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                                            placeholder="25"
                                            required
                                        />
                                    </div>

                                    {/* Speaking */}
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                            Speaking Max Marks *
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={formData.speakingMaxMarks}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    speakingMaxMarks: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                                            placeholder="25"
                                            required
                                        />
                                    </div>

                                    {/* Reading */}
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                            Reading Max Marks *
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={formData.readingMaxMarks}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    readingMaxMarks: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                                            placeholder="25"
                                            required
                                        />
                                    </div>

                                    {/* Writing */}
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                                            Writing Max Marks *
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={formData.writingMaxMarks}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    writingMaxMarks: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                                            placeholder="25"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Total Marks Display */}
                                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 sm:p-4 border border-orange-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs sm:text-sm font-medium text-gray-700">
                                            Total Marks:
                                        </span>
                                        <span className="text-base sm:text-xl font-bold text-orange-600">
                                            {totalMarks}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <CustomButton
                                type="button"
                                variant="outline"
                                onClick={() => navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`)}
                                className="w-full sm:w-auto order-2 sm:order-1"
                            >
                                Cancel
                            </CustomButton>
                            <CustomButton
                                type="submit"
                                isLoading={updateExamMutation.isPending}
                                loadingMessage="Updating exam..."
                                className="w-full sm:flex-1 order-1 sm:order-2"
                            >
                                Update Exam
                            </CustomButton>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
