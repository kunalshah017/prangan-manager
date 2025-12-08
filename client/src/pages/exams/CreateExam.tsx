import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar as CalendarIcon } from 'lucide-react';
import DoodleBackground from '@/components/DoodleBackground';
import { CustomButton } from '@/components/ui/custom-button';
import { useCreateExam, useSemester } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import type { Level, ExamCycle } from '@/types/exam';

const CreateExam = () => {
    const { projectId, centerId, semesterId } = useParams<{
        projectId: string;
        centerId: string;
        semesterId: string;
    }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [level, setLevel] = useState<Level>('LEVEL_1');
    const [cycle, setCycle] = useState<ExamCycle>('SA_1');
    const [examDate, setExamDate] = useState('');
    const [listeningMaxMarks, setListeningMaxMarks] = useState<number>(25);
    const [speakingMaxMarks, setSpeakingMaxMarks] = useState<number>(25);
    const [readingMaxMarks, setReadingMaxMarks] = useState<number>(25);
    const [writingMaxMarks, setWritingMaxMarks] = useState<number>(25);

    const { data: semester } = useSemester(semesterId!);
    const { mutate: createExam, isPending } = useCreateExam();

    // Check if user has permission
    const hasPermission = useMemo(() => {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;

        return user.roleAssignments?.some(
            assignment =>
                (assignment.subRole === 'CURRICULUM_MENTOR' || assignment.subRole === 'CENTER_MANAGER') &&
                assignment.isActive &&
                assignment.projectId === projectId &&
                assignment.centerId === centerId &&
                assignment.semesterId === semesterId
        );
    }, [user, projectId, centerId, semesterId]);

    useEffect(() => {
        if (!hasPermission) {
            navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard`);
        }
    }, [hasPermission, navigate, projectId, centerId, semesterId]);

    const totalMaxMarks = listeningMaxMarks + speakingMaxMarks + readingMaxMarks + writingMaxMarks;

    // Check if date is a weekend (Saturday or Sunday)
    const isWeekend = (dateString: string) => {
        if (!dateString) return false;
        const date = new Date(dateString);
        const day = date.getDay();
        return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Exam name is required');
            return;
        }

        if (!examDate) {
            toast.error('Exam date is required');
            return;
        }

        if (!isWeekend(examDate)) {
            toast.error('Exam date must be a weekend (Saturday or Sunday)');
            return;
        }

        if (!projectId || !centerId || !semesterId) {
            toast.error('Missing required context');
            return;
        }

        createExam(
            {
                projectId,
                centerId,
                semesterId,
                level,
                cycle,
                name: name.trim(),
                description: description.trim() || undefined,
                examDate,
                listeningMaxMarks,
                speakingMaxMarks,
                readingMaxMarks,
                writingMaxMarks,
            },
            {
                onSuccess: () => {
                    toast.success('Exam created successfully!');
                    navigate(
                        `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`
                    );
                },
                onError: (error: unknown) => {
                    const err = error as { message?: string };
                    toast.error(err?.message || 'Failed to create exam');
                },
            }
        );
    };

    const handleCancel = () => {
        navigate(
            `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/exams`
        );
    };

    if (!hasPermission) {
        return null;
    }

    return (
        <div className="w-full relative p-2 sm:p-4">
            <DoodleBackground numElements={8} />

            <div className="max-w-3xl mx-auto relative z-10">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">Create Exam</h1>
                    <p className="text-muted-foreground text-sm">
                        Create a new exam for {semester?.name || 'this semester'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white/80 rounded-lg border shadow-sm p-4 sm:p-6 space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Basic Information</h2>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                                Exam Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="e.g., SA-1 English Exam"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium mb-1.5">
                                Description
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Brief description of the exam..."
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="level" className="block text-sm font-medium mb-1.5">
                                    Level <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="level"
                                    value={level}
                                    onChange={(e) => setLevel(e.target.value as Level)}
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                >
                                    <option value="PRIMARY_A">Primary A</option>
                                    <option value="PRIMARY_B">Primary B</option>
                                    <option value="LEVEL_1">Level 1</option>
                                    <option value="LEVEL_2">Level 2</option>
                                    <option value="LEVEL_3">Level 3</option>
                                    <option value="LEVEL_4">Level 4</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="cycle" className="block text-sm font-medium mb-1.5">
                                    Exam Cycle <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="cycle"
                                    value={cycle}
                                    onChange={(e) => setCycle(e.target.value as ExamCycle)}
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                >
                                    <option value="PRE_ASSESSMENT">Pre-Assessment</option>
                                    <option value="SA_1">SA-1</option>
                                    <option value="SA_2">SA-2</option>
                                    <option value="SA_3">SA-3</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="examDate" className="block text-sm font-medium mb-1.5">
                                    Exam Date <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        id="examDate"
                                        value={examDate}
                                        onChange={(e) => setExamDate(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        required
                                    />
                                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Only weekends (Saturday/Sunday) are allowed
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* LSRW Marks Configuration */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">LSRW Maximum Marks</h2>
                        <p className="text-sm text-muted-foreground">
                            Set the maximum marks for each skill category
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="listening" className="block text-sm font-medium mb-1.5">
                                    Listening <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="listening"
                                    value={listeningMaxMarks}
                                    onChange={(e) => setListeningMaxMarks(Number(e.target.value))}
                                    min="0"
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="speaking" className="block text-sm font-medium mb-1.5">
                                    Speaking <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="speaking"
                                    value={speakingMaxMarks}
                                    onChange={(e) => setSpeakingMaxMarks(Number(e.target.value))}
                                    min="0"
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="reading" className="block text-sm font-medium mb-1.5">
                                    Reading <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="reading"
                                    value={readingMaxMarks}
                                    onChange={(e) => setReadingMaxMarks(Number(e.target.value))}
                                    min="0"
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="writing" className="block text-sm font-medium mb-1.5">
                                    Writing <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="writing"
                                    value={writingMaxMarks}
                                    onChange={(e) => setWritingMaxMarks(Number(e.target.value))}
                                    min="0"
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* Total Marks Display */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Total Maximum Marks:</span>
                                <span className="text-2xl font-bold text-orange-700">{totalMaxMarks}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <CustomButton
                            type="button"
                            onClick={handleCancel}
                            variant="outline"
                            className="flex-1"
                            disabled={isPending}
                        >
                            Cancel
                        </CustomButton>
                        <CustomButton
                            type="submit"
                            isLoading={isPending}
                            loadingMessage="Creating..."
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            Create Exam
                        </CustomButton>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateExam;
