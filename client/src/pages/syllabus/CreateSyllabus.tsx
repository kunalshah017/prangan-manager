import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import DoodleBackground from '@/components/DoodleBackground';
import { CustomButton } from '@/components/ui/custom-button';
import { useCreateSyllabus, useCreateSyllabusTopic, useSemester } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import type { Level } from '@/types/api';

interface TopicInput {
    id: string;
    serialNumber: string;
    title: string;
    cycle?: string;
    subtopics: SubtopicInput[];
    isExpanded?: boolean;
}

interface SubtopicInput {
    id: string;
    serialNumber: string;
    title: string;
    cycle?: string;
}

const CreateSyllabus = () => {
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
    const [topics, setTopics] = useState<TopicInput[]>([]);
    const [step, setStep] = useState<1 | 2>(1);
    const [createdSyllabusId, setCreatedSyllabusId] = useState<string>('');

    const { data: semester } = useSemester(semesterId!);
    const { mutate: createSyllabus, isPending: isCreatingSyllabus } = useCreateSyllabus();
    const { mutate: createTopic, isPending: isCreatingTopic } = useCreateSyllabusTopic();

    const isPending = isCreatingSyllabus || isCreatingTopic;

    // Check if user has permission
    const hasPermission = useMemo(() => {
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

    useEffect(() => {
        if (!hasPermission) {
            navigate(`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard`);
        }
    }, [hasPermission, navigate, projectId, centerId, semesterId]);

    const handleStep1Submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Syllabus name is required');
            return;
        }

        if (!projectId || !centerId || !semesterId) {
            toast.error('Missing required context');
            return;
        }

        // Create syllabus
        createSyllabus(
            {
                projectId,
                centerId,
                semesterId,
                level,
                name: name.trim(),
                description: description.trim() || undefined,
            },
            {
                onSuccess: (createdSyllabus) => {
                    setCreatedSyllabusId(createdSyllabus.id);
                    setStep(2);
                    toast.success('Syllabus created! Now add topics (optional)');
                },
                onError: (error: unknown) => {
                    const err = error as { message?: string };
                    toast.error(err?.message || 'Failed to create syllabus');
                },
            }
        );
    };

    const handleStep2Submit = async (e: React.FormEvent) => {
        e.preventDefault();

        // If no topics, just navigate back
        if (topics.length === 0) {
            toast.success('Syllabus created successfully!');
            navigate(
                `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus`
            );
            return;
        }

        // Create topics sequentially
        await createTopicsSequentially();
    };

    const createTopicsSequentially = async () => {
        let successCount = 0;
        let failCount = 0;

        for (const [index, topic] of topics.entries()) {
            try {
                await new Promise<void>((resolve, reject) => {
                    createTopic(
                        {
                            syllabusId: createdSyllabusId,
                            serialNumber: topic.serialNumber,
                            title: topic.title,
                            cycle: topic.cycle || undefined,
                            orderIndex: index + 1,
                        },
                        {
                            onSuccess: async (createdTopic) => {
                                successCount++;

                                // Create subtopics for this topic
                                for (const [subIndex, subtopic] of topic.subtopics.entries()) {
                                    try {
                                        await new Promise<void>((subResolve, subReject) => {
                                            createTopic(
                                                {
                                                    syllabusId: createdSyllabusId,
                                                    parentId: createdTopic.id,
                                                    serialNumber: subtopic.serialNumber,
                                                    title: subtopic.title,
                                                    cycle: subtopic.cycle || undefined,
                                                    orderIndex: subIndex + 1,
                                                },
                                                {
                                                    onSuccess: () => subResolve(),
                                                    onError: () => {
                                                        failCount++;
                                                        subReject();
                                                    },
                                                }
                                            );
                                        });
                                    } catch {
                                        // Subtopic failed, continue with next
                                    }
                                }
                                resolve();
                            },
                            onError: () => {
                                failCount++;
                                reject();
                            },
                        }
                    );
                });
            } catch {
                // Topic failed, continue with next
            }
        }

        if (successCount > 0) {
            toast.success(`Created ${successCount} topic(s) successfully!`);
        }
        if (failCount > 0) {
            toast.error(`Failed to create ${failCount} topic(s)`);
        }

        navigate(
            `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus`
        );
    };

    const skipTopics = () => {
        toast.success('Syllabus created successfully!');
        navigate(
            `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus`
        );
    };

    const addTopic = () => {
        const newTopic: TopicInput = {
            id: Date.now().toString(),
            serialNumber: (topics.length + 1).toString(),
            title: '',
            cycle: '',
            subtopics: [],
            isExpanded: true,
        };
        setTopics([...topics, newTopic]);
    };

    const removeTopic = (topicId: string) => {
        const filtered = topics.filter((t) => t.id !== topicId);
        // Renumber topics
        setTopics(
            filtered.map((t, idx) => ({
                ...t,
                serialNumber: (idx + 1).toString(),
                subtopics: t.subtopics.map((s, sIdx) => ({
                    ...s,
                    serialNumber: `${idx + 1}.${sIdx + 1}`,
                })),
            }))
        );
    };

    const updateTopic = (topicId: string, field: string, value: string) => {
        setTopics(
            topics.map((t) => (t.id === topicId ? { ...t, [field]: value } : t))
        );
    };

    const toggleTopicExpand = (topicId: string) => {
        setTopics(
            topics.map((t) =>
                t.id === topicId ? { ...t, isExpanded: !t.isExpanded } : t
            )
        );
    };

    const addSubtopic = (topicId: string) => {
        setTopics(
            topics.map((t) => {
                if (t.id === topicId) {
                    const newSubtopic: SubtopicInput = {
                        id: Date.now().toString(),
                        serialNumber: `${t.serialNumber}.${t.subtopics.length + 1}`,
                        title: '',
                        cycle: t.cycle || '',
                    };
                    return { ...t, subtopics: [...t.subtopics, newSubtopic], isExpanded: true };
                }
                return t;
            })
        );
    };

    const removeSubtopic = (topicId: string, subtopicId: string) => {
        setTopics(
            topics.map((t) => {
                if (t.id === topicId) {
                    const filtered = t.subtopics.filter((s) => s.id !== subtopicId);
                    // Renumber subtopics
                    return {
                        ...t,
                        subtopics: filtered.map((s, idx) => ({
                            ...s,
                            serialNumber: `${t.serialNumber}.${idx + 1}`,
                        })),
                    };
                }
                return t;
            })
        );
    };

    const updateSubtopic = (
        topicId: string,
        subtopicId: string,
        field: string,
        value: string
    ) => {
        setTopics(
            topics.map((t) => {
                if (t.id === topicId) {
                    return {
                        ...t,
                        subtopics: t.subtopics.map((s) =>
                            s.id === subtopicId ? { ...s, [field]: value } : s
                        ),
                    };
                }
                return t;
            })
        );
    };

    const levels: { value: Level; label: string }[] = [
        { value: 'LEVEL_1', label: 'Level 1' },
        { value: 'LEVEL_2', label: 'Level 2' },
        { value: 'LEVEL_3', label: 'Level 3' },
        { value: 'LEVEL_4', label: 'Level 4' },
        { value: 'PRIMARY_A', label: 'Primary A' },
        { value: 'PRIMARY_B', label: 'Primary B' },
    ];

    return (
        <div className="flex flex-col items-center min-h-[60dvh] w-full relative p-2 sm:p-4">
            <DoodleBackground numElements={8} />

            <div className="w-full max-w-4xl bg-white/80 rounded-lg border shadow-md p-3 sm:p-6 relative z-10">
                {/* Header */}
                <div className="mb-4 sm:mb-6">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-3">
                        <div className={cn(
                            "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold",
                            step === 1 ? "bg-orange-600 text-white" : "bg-green-600 text-white"
                        )}>
                            1
                        </div>
                        <span className="text-xs sm:text-sm font-medium">Details</span>
                        <div className="flex-1 h-px bg-gray-300"></div>
                        <div className={cn(
                            "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold",
                            step === 2 ? "bg-orange-600 text-white" : "bg-gray-300 text-gray-600"
                        )}>
                            2
                        </div>
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">Topics (Optional)</span>
                        <span className="text-xs sm:text-sm font-medium sm:hidden">Topics</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold">Create Syllabus</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                        {step === 1
                            ? `Fill in the details to create a new syllabus for ${semester?.name || 'this semester'}`
                            : 'Add topics and subtopics to your syllabus (you can also add them later)'
                        }
                    </p>
                </div>                {/* Step 1: Basic Details */}
                {step === 1 && (
                    <form onSubmit={handleStep1Submit} className="space-y-4 sm:space-y-5">
                        <div>
                            <label htmlFor="level" className="block text-xs sm:text-sm font-medium mb-1.5">
                                Level <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="level"
                                value={level}
                                onChange={(e) => setLevel(e.target.value as Level)}
                                required
                                disabled={isPending}
                                className="w-full h-9 sm:h-10 rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                {levels.map((lvl) => (
                                    <option key={lvl.value} value={lvl.value}>
                                        {lvl.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-xs sm:text-sm font-medium mb-1.5">
                                Syllabus Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={isPending}
                                className="w-full h-9 sm:h-10 rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-xs sm:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="e.g., English Syllabus"
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-xs sm:text-sm font-medium mb-1.5">
                                Description
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                disabled={isPending}
                                className="w-full rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-xs sm:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                                placeholder="Brief description..."
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 justify-end pt-3 sm:pt-4">
                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus`
                                    )
                                }
                                disabled={isPending}
                                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full sm:w-auto sm:min-w-[100px]')}
                            >
                                Cancel
                            </button>
                            <CustomButton
                                type="submit"
                                isLoading={isPending}
                                loadingMessage="Creating..."
                                className="bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm w-full sm:w-auto sm:min-w-[120px]"
                            >
                                <span className="hidden sm:inline">Next: Add Topics</span>
                                <span className="sm:hidden">Next</span>
                            </CustomButton>
                        </div>
                    </form>
                )}

                {/* Step 2: Topics */}
                {step === 2 && (
                    <form onSubmit={handleStep2Submit} className="space-y-4 sm:space-y-5">
                        {/* Info Banner */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs sm:text-sm text-blue-800">
                            <p className="font-medium mb-1">💡 Topic Management Tips:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-xs">
                                <li>Click chevron to expand/collapse topics</li>
                                <li>Use + button to add subtopics</li>
                                <li>Serial numbers auto-update on deletion</li>
                            </ul>
                        </div>

                        {/* Topics List */}
                        <div className="space-y-3 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto pr-1">
                            {topics.map((topic) => (
                                <div key={topic.id} className="border rounded-lg p-2 sm:p-3 bg-gray-50">
                                    {/* Topic Header */}
                                    <div className="space-y-2">
                                        <div className="flex gap-1.5 sm:gap-2 items-start">
                                            <button
                                                type="button"
                                                onClick={() => toggleTopicExpand(topic.id)}
                                                className="p-1 hover:bg-gray-200 rounded flex-shrink-0 mt-0.5"
                                            >
                                                {topic.isExpanded ? (
                                                    <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                ) : (
                                                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                )}
                                            </button>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex gap-1.5 sm:gap-2">
                                                    <input
                                                        type="text"
                                                        value={topic.serialNumber}
                                                        onChange={(e) => updateTopic(topic.id, 'serialNumber', e.target.value)}
                                                        placeholder="#"
                                                        className="w-10 sm:w-12 px-1.5 py-1 text-xs sm:text-sm border rounded focus:ring-2 focus:ring-orange-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={topic.title}
                                                        onChange={(e) => updateTopic(topic.id, 'title', e.target.value)}
                                                        placeholder="Topic title"
                                                        className="flex-1 min-w-0 px-2 py-1 text-xs sm:text-sm border rounded focus:ring-2 focus:ring-orange-500"
                                                    />
                                                </div>
                                                <div className="flex gap-1.5 sm:gap-2">
                                                    <input
                                                        type="text"
                                                        value={topic.cycle || ''}
                                                        onChange={(e) => updateTopic(topic.id, 'cycle', e.target.value)}
                                                        placeholder="Cycle (SA-1)"
                                                        className="flex-1 px-2 py-1 text-xs sm:text-sm border rounded focus:ring-2 focus:ring-orange-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => addSubtopic(topic.id)}
                                                        className="p-1.5 sm:p-2 hover:bg-green-100 rounded text-green-600 border border-green-200 flex-shrink-0"
                                                        title="Add subtopic"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTopic(topic.id)}
                                                        className="p-1.5 sm:p-2 hover:bg-red-100 rounded text-red-600 border border-red-200 flex-shrink-0"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Subtopics */}
                                        {topic.isExpanded && topic.subtopics.length > 0 && (
                                            <div className="ml-6 sm:ml-8 space-y-2 mt-2 pt-2 border-t border-gray-200">
                                                {topic.subtopics.map((subtopic) => (
                                                    <div key={subtopic.id} className="space-y-2">
                                                        <div className="flex gap-1.5 sm:gap-2">
                                                            <input
                                                                type="text"
                                                                value={subtopic.serialNumber}
                                                                onChange={(e) =>
                                                                    updateSubtopic(topic.id, subtopic.id, 'serialNumber', e.target.value)
                                                                }
                                                                placeholder="1.1"
                                                                className="w-10 sm:w-12 px-1.5 py-1 text-xs sm:text-sm border rounded bg-white focus:ring-2 focus:ring-orange-500"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={subtopic.title}
                                                                onChange={(e) =>
                                                                    updateSubtopic(topic.id, subtopic.id, 'title', e.target.value)
                                                                }
                                                                placeholder="Subtopic title"
                                                                className="flex-1 min-w-0 px-2 py-1 text-xs sm:text-sm border rounded bg-white focus:ring-2 focus:ring-orange-500"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeSubtopic(topic.id, subtopic.id)}
                                                                className="p-1.5 hover:bg-red-100 rounded text-red-600 flex-shrink-0"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                            </button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={subtopic.cycle || ''}
                                                            onChange={(e) =>
                                                                updateSubtopic(topic.id, subtopic.id, 'cycle', e.target.value)
                                                            }
                                                            placeholder="Cycle (optional)"
                                                            className="w-full px-2 py-1 text-xs sm:text-sm border rounded bg-white focus:ring-2 focus:ring-orange-500"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Topic Button */}
                        <button
                            type="button"
                            onClick={addTopic}
                            className={cn(
                                buttonVariants({ variant: 'outline', size: 'sm' }),
                                'w-full border-dashed text-xs sm:text-sm'
                            )}
                        >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                            Add Topic
                        </button>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-2 justify-end pt-3 sm:pt-4 border-t">
                            <button
                                type="button"
                                onClick={skipTopics}
                                disabled={isPending}
                                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full sm:w-auto text-xs sm:text-sm')}
                            >
                                Skip Topics
                            </button>
                            <CustomButton
                                type="submit"
                                isLoading={isPending}
                                loadingMessage="Saving..."
                                disabled={topics.length === 0 || topics.some(t => !t.title.trim())}
                                className="bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm w-full sm:w-auto sm:min-w-[120px]"
                            >
                                Create Syllabus
                            </CustomButton>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CreateSyllabus;
