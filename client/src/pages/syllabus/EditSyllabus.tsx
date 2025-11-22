import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import Modal from '@/components/ui/modal';
import { CustomButton } from '@/components/ui/custom-button';
import {
    useSyllabus,
    useUpdateSyllabus,
    useSyllabusTopics,
    useCreateSyllabusTopic,
    useUpdateSyllabusTopic,
    useDeleteSyllabusTopic,
} from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import type { SyllabusTopic } from '@/types/api';

interface TopicEdit {
    id: string;
    syllabusTopicId?: string; // Existing topic ID (if editing)
    serialNumber: string;
    title: string;
    cycle?: string;
    subtopics: SubtopicEdit[];
    isExpanded?: boolean;
    isNew?: boolean;
    isDeleted?: boolean;
    isModified?: boolean;
}

interface SubtopicEdit {
    id: string;
    syllabusTopicId?: string; // Existing subtopic ID
    serialNumber: string;
    title: string;
    cycle?: string;
    isNew?: boolean;
    isDeleted?: boolean;
    isModified?: boolean;
}

const EditSyllabus = () => {
    const { projectId, centerId, semesterId, syllabusId } = useParams<{
        projectId: string;
        centerId: string;
        semesterId: string;
        syllabusId: string;
    }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Check if user has permission (ADMIN or CURRICULUM_MENTOR)
    const hasEditPermission = useMemo(() => {
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

    // Fetch syllabus data
    const { data: syllabus, isLoading: isFetchingData } = useSyllabus(syllabusId || '', {
        includeStats: false,
        includeTopics: false,
    });

    // Fetch topics
    const { data: existingTopics, isLoading: isLoadingTopics } = useSyllabusTopics({
        syllabusId: syllabusId || '',
        includeSubtopics: true,
    });

    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    const [topics, setTopics] = useState<TopicEdit[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{
        isOpen: boolean;
        type: 'topic' | 'subtopic';
        topicId: string;
        subtopicId?: string;
        title: string;
        hasSubtopics?: boolean;
        subtopicCount?: number;
    } | null>(null);

    // Populate form when data loads
    useEffect(() => {
        if (syllabus) {
            setFormData({
                name: syllabus.name,
                description: syllabus.description || '',
            });
        }
    }, [syllabus]);

    // Populate topics when loaded
    useEffect(() => {
        if (existingTopics && existingTopics.length > 0) {
            const parentTopics = existingTopics.filter((t: SyllabusTopic) => !t.parentId);
            const topicsWithSubtopics: TopicEdit[] = parentTopics.map((topic: SyllabusTopic) => {
                const subtopicsData = existingTopics.filter((t: SyllabusTopic) => t.parentId === topic.id);
                return {
                    id: `existing-${topic.id}`,
                    syllabusTopicId: topic.id,
                    serialNumber: topic.serialNumber,
                    title: topic.title,
                    cycle: topic.cycle || '',
                    isExpanded: false,
                    subtopics: subtopicsData.map((sub: SyllabusTopic) => ({
                        id: `existing-sub-${sub.id}`,
                        syllabusTopicId: sub.id,
                        serialNumber: sub.serialNumber,
                        title: sub.title,
                        cycle: sub.cycle || '',
                    })),
                };
            });
            setTopics(topicsWithSubtopics);
        }
    }, [existingTopics]);

    const { mutate: updateSyllabus, isPending: isUpdatingSyllabus } = useUpdateSyllabus();
    const { mutate: createTopic, isPending: isCreatingTopic } = useCreateSyllabusTopic();
    const { mutate: updateTopic, isPending: isUpdatingTopic } = useUpdateSyllabusTopic();
    const { mutate: deleteTopic, isPending: isDeletingTopic } = useDeleteSyllabusTopic();

    const isPending = isUpdatingSyllabus || isCreatingTopic || isUpdatingTopic || isDeletingTopic;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Syllabus name is required');
            return;
        }

        if (!syllabusId) {
            toast.error('Syllabus ID is missing');
            return;
        }

        // Step 1: Update syllabus details
        await new Promise<void>((resolve, reject) => {
            updateSyllabus(
                {
                    id: syllabusId,
                    data: {
                        name: formData.name.trim(),
                        description: formData.description.trim() || undefined,
                    },
                },
                {
                    onSuccess: () => resolve(),
                    onError: (error: unknown) => {
                        const err = error as { message?: string };
                        toast.error(err?.message || 'Failed to update syllabus');
                        reject();
                    },
                }
            );
        });

        // Step 2: Handle topic changes if any
        if (hasChanges) {
            await handleTopicChanges();
        } else {
            toast.success('Syllabus updated successfully');
            navigate(
                `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus`
            );
        }
    };

    const handleTopicChanges = async () => {
        let successCount = 0;
        let failCount = 0;

        // 1. Delete marked topics
        const topicsToDelete = topics.filter((t) => t.isDeleted && t.syllabusTopicId);
        for (const topic of topicsToDelete) {
            try {
                await new Promise<void>((resolve, reject) => {
                    deleteTopic(topic.syllabusTopicId!, {
                        onSuccess: () => {
                            successCount++;
                            resolve();
                        },
                        onError: () => {
                            failCount++;
                            reject();
                        },
                    });
                });
            } catch {
                // Continue with next
            }
        }

        // 2. Update modified topics
        const topicsToUpdate = topics.filter((t) => t.isModified && !t.isDeleted && t.syllabusTopicId);
        for (const topic of topicsToUpdate) {
            try {
                await new Promise<void>((resolve, reject) => {
                    updateTopic(
                        {
                            id: topic.syllabusTopicId!,
                            data: {
                                serialNumber: topic.serialNumber,
                                title: topic.title,
                                cycle: topic.cycle || undefined,
                            },
                        },
                        {
                            onSuccess: () => {
                                successCount++;
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
                // Continue with next
            }
        }

        // 3. Create new topics and their subtopics
        const topicsToCreate = topics.filter((t) => t.isNew && !t.isDeleted);
        for (const [index, topic] of topicsToCreate.entries()) {
            try {
                const createdTopic = await new Promise<{ id: string }>((resolve, reject) => {
                    createTopic(
                        {
                            syllabusId: syllabusId!,
                            serialNumber: topic.serialNumber,
                            title: topic.title,
                            cycle: topic.cycle || undefined,
                            orderIndex: index + 1,
                        },
                        {
                            onSuccess: (data) => {
                                successCount++;
                                resolve(data);
                            },
                            onError: () => {
                                failCount++;
                                reject();
                            },
                        }
                    );
                });

                // Create subtopics for this new topic
                for (const [subIndex, subtopic] of topic.subtopics.entries()) {
                    if (!subtopic.isDeleted) {
                        try {
                            await new Promise<void>((resolve, reject) => {
                                createTopic(
                                    {
                                        syllabusId: syllabusId!,
                                        parentId: createdTopic.id,
                                        serialNumber: subtopic.serialNumber,
                                        title: subtopic.title,
                                        cycle: subtopic.cycle || undefined,
                                        orderIndex: subIndex + 1,
                                    },
                                    {
                                        onSuccess: () => resolve(),
                                        onError: () => {
                                            failCount++;
                                            reject();
                                        },
                                    }
                                );
                            });
                        } catch {
                            // Continue with next subtopic
                        }
                    }
                }
            } catch {
                // Continue with next topic
            }
        }

        // 4. Handle subtopics of existing topics
        for (const topic of topics.filter((t) => !t.isNew && !t.isDeleted && t.syllabusTopicId)) {
            // Delete marked subtopics
            const subtopicsToDelete = topic.subtopics.filter((s) => s.isDeleted && s.syllabusTopicId);
            for (const subtopic of subtopicsToDelete) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        deleteTopic(subtopic.syllabusTopicId!, {
                            onSuccess: () => {
                                successCount++;
                                resolve();
                            },
                            onError: () => {
                                failCount++;
                                reject();
                            },
                        });
                    });
                } catch {
                    // Continue
                }
            }

            // Update modified subtopics
            const subtopicsToUpdate = topic.subtopics.filter((s) => s.isModified && !s.isDeleted && s.syllabusTopicId);
            for (const subtopic of subtopicsToUpdate) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        updateTopic(
                            {
                                id: subtopic.syllabusTopicId!,
                                data: {
                                    serialNumber: subtopic.serialNumber,
                                    title: subtopic.title,
                                    cycle: subtopic.cycle || undefined,
                                },
                            },
                            {
                                onSuccess: () => {
                                    successCount++;
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
                    // Continue
                }
            }

            // Create new subtopics
            const subtopicsToCreate = topic.subtopics.filter((s) => s.isNew && !s.isDeleted);
            for (const [subIndex, subtopic] of subtopicsToCreate.entries()) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        createTopic(
                            {
                                syllabusId: syllabusId!,
                                parentId: topic.syllabusTopicId!,
                                serialNumber: subtopic.serialNumber,
                                title: subtopic.title,
                                cycle: subtopic.cycle || undefined,
                                orderIndex: subIndex + 1,
                            },
                            {
                                onSuccess: () => resolve(),
                                onError: () => {
                                    failCount++;
                                    reject();
                                },
                            }
                        );
                    });
                } catch {
                    // Continue
                }
            }
        }

        if (successCount > 0) {
            toast.success(`Syllabus and ${successCount} topic(s) updated successfully!`);
        }
        if (failCount > 0) {
            toast.error(`Failed to update ${failCount} topic(s)`);
        }

        navigate(
            `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus`
        );
    };

    // Topic management functions
    const addTopic = () => {
        const newTopic: TopicEdit = {
            id: `new-${Date.now()}`,
            serialNumber: (topics.filter((t) => !t.isDeleted).length + 1).toString(),
            title: '',
            cycle: '',
            subtopics: [],
            isExpanded: true,
            isNew: true,
        };
        setTopics([...topics, newTopic]);
        setHasChanges(true);
    };

    const removeTopic = (topicId: string) => {
        const topic = topics.find((t) => t.id === topicId);
        if (!topic) return;

        const subtopicCount = topic.subtopics.filter((s) => !s.isDeleted).length;

        setConfirmDelete({
            isOpen: true,
            type: 'topic',
            topicId,
            title: topic.title,
            hasSubtopics: subtopicCount > 0,
            subtopicCount,
        });
    };

    const confirmRemoveTopic = () => {
        if (!confirmDelete || confirmDelete.type !== 'topic') return;

        const { topicId } = confirmDelete;
        const topic = topics.find((t) => t.id === topicId);

        if (topic?.syllabusTopicId) {
            // Mark existing topic as deleted
            setTopics(
                topics.map((t) =>
                    t.id === topicId ? { ...t, isDeleted: true } : t
                )
            );
        } else {
            // Remove new topic completely
            setTopics(topics.filter((t) => t.id !== topicId));
        }
        setHasChanges(true);
        setConfirmDelete(null);
    };

    const updateTopicField = (topicId: string, field: string, value: string) => {
        setTopics(
            topics.map((t) => {
                if (t.id === topicId) {
                    return { ...t, [field]: value, isModified: !t.isNew };
                }
                return t;
            })
        );
        setHasChanges(true);
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
                    const newSubtopic: SubtopicEdit = {
                        id: `new-sub-${Date.now()}`,
                        serialNumber: `${t.serialNumber}.${t.subtopics.filter((s) => !s.isDeleted).length + 1}`,
                        title: '',
                        cycle: t.cycle || '',
                        isNew: true,
                    };
                    return {
                        ...t,
                        subtopics: [...t.subtopics, newSubtopic],
                        isExpanded: true,
                    };
                }
                return t;
            })
        );
        setHasChanges(true);
    };

    const removeSubtopic = (topicId: string, subtopicId: string) => {
        const topic = topics.find((t) => t.id === topicId);
        const subtopic = topic?.subtopics.find((s) => s.id === subtopicId);
        if (!subtopic) return;

        setConfirmDelete({
            isOpen: true,
            type: 'subtopic',
            topicId,
            subtopicId,
            title: subtopic.title,
        });
    };

    const confirmRemoveSubtopic = () => {
        if (!confirmDelete || confirmDelete.type !== 'subtopic' || !confirmDelete.subtopicId) return;

        const { topicId, subtopicId } = confirmDelete;

        setTopics(
            topics.map((t) => {
                if (t.id === topicId) {
                    const subtopic = t.subtopics.find((s) => s.id === subtopicId);
                    if (subtopic?.syllabusTopicId) {
                        // Mark existing subtopic as deleted
                        return {
                            ...t,
                            subtopics: t.subtopics.map((s) =>
                                s.id === subtopicId ? { ...s, isDeleted: true } : s
                            ),
                        };
                    } else {
                        // Remove new subtopic completely
                        return {
                            ...t,
                            subtopics: t.subtopics.filter((s) => s.id !== subtopicId),
                        };
                    }
                }
                return t;
            })
        );
        setHasChanges(true);
        setConfirmDelete(null);
    };

    const updateSubtopicField = (
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
                        subtopics: t.subtopics.map((s) => {
                            if (s.id === subtopicId) {
                                return { ...s, [field]: value, isModified: !s.isNew };
                            }
                            return s;
                        }),
                    };
                }
                return t;
            })
        );
        setHasChanges(true);
    };

    const handleCancel = () => {
        navigate(
            `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus`
        );
    };

    if (isFetchingData || isLoadingTopics) {
        return (
            <div className="flex items-center justify-center min-h-[60dvh]">
                <LoadingButterfly size="md" />
            </div>
        );
    }

    if (!hasEditPermission) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60dvh] relative">
                <DoodleBackground numElements={8} />
                <div className="bg-white/80 rounded-lg border shadow-md p-8 max-w-md text-center relative z-10">
                    <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground mb-4">
                        You need to be an Admin or Curriculum Mentor to edit syllabi.
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        className={cn(buttonVariants({ variant: 'default' }))}
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!syllabus) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60dvh] relative">
                <DoodleBackground numElements={8} />
                <div className="bg-white/80 rounded-lg border shadow-md p-8 max-w-md text-center relative z-10">
                    <h2 className="text-xl font-semibold mb-2">Syllabus Not Found</h2>
                    <p className="text-muted-foreground mb-4">
                        The syllabus you're trying to edit doesn't exist.
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        className={cn(buttonVariants({ variant: 'default' }))}
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full relative p-2 sm:p-0">
            <DoodleBackground numElements={10} />

            {/* Header */}
            <div className="mb-4 sm:mb-6 relative z-10">
                <button
                    onClick={handleCancel}
                    className={cn(
                        buttonVariants({ variant: 'ghost', size: 'sm' }),
                        'mb-3 -ml-2 text-xs sm:text-sm'
                    )}
                >
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Back to Syllabus Management</span>
                    <span className="sm:hidden">Back</span>
                </button>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Edit Syllabus</h1>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                    Update syllabus information for {getLevelDisplay(syllabus.level)}
                </p>
            </div>

            {/* Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 rounded-lg border shadow-sm p-3 sm:p-6 max-w-2xl relative z-10"
            >
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    {/* Level Display (Read-only) */}
                    <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-xs sm:text-sm font-medium">Level</label>
                        <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 rounded-md text-xs sm:text-sm">
                            {getLevelDisplay(syllabus.level)}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Level cannot be changed after creation
                        </p>
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="name" className="text-xs sm:text-sm font-medium">
                            Syllabus Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="name"
                            type="text"
                            placeholder="e.g., English SA-1 Syllabus"
                            value={formData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            required
                            disabled={isPending}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="description" className="text-xs sm:text-sm font-medium">
                            Description
                        </label>
                        <textarea
                            id="description"
                            placeholder="Brief description of this syllabus"
                            value={formData.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                            rows={3}
                            disabled={isPending}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 resize-none"
                        />
                    </div>

                    {/* Topics Management */}
                    <div className="space-y-3 pt-3 sm:pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base sm:text-lg font-semibold">Topics & Subtopics</h3>
                            <span className="text-xs sm:text-sm text-muted-foreground">
                                {topics.filter((t) => !t.isDeleted).length} topic(s)
                            </span>
                        </div>

                        {/* Info Banner */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 text-xs text-blue-800">
                            <p className="font-medium mb-1">💡 Quick Tips:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-[10px] sm:text-xs">
                                <li>Click chevron to expand topics</li>
                                <li>Changes save when you click "Save Changes"</li>
                                <li>Deleted items marked but not removed until save</li>
                            </ul>
                        </div>

                        {/* Topics List */}
                        <div className="space-y-3 max-h-[45vh] sm:max-h-[50vh] overflow-y-auto pr-1">
                            {topics
                                .filter((t) => !t.isDeleted)
                                .map((topic) => (
                                    <div key={topic.id} className="border rounded-lg p-2 sm:p-3 bg-gray-50">
                                        {/* Topic Header */}
                                        <div className="space-y-2">
                                            <div className="flex gap-1.5 sm:gap-2 items-start">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleTopicExpand(topic.id)}
                                                    className="p-1 hover:bg-gray-200 rounded flex-shrink-0 mt-0.5"
                                                    disabled={isPending}
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
                                                            onChange={(e) =>
                                                                updateTopicField(topic.id, 'serialNumber', e.target.value)
                                                            }
                                                            placeholder="#"
                                                            disabled={isPending}
                                                            className="w-10 sm:w-12 px-1.5 py-1 text-xs sm:text-sm border rounded disabled:bg-gray-100 focus:ring-2 focus:ring-orange-500"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={topic.title}
                                                            onChange={(e) =>
                                                                updateTopicField(topic.id, 'title', e.target.value)
                                                            }
                                                            placeholder="Topic title"
                                                            disabled={isPending}
                                                            className="flex-1 min-w-0 px-2 py-1 text-xs sm:text-sm border rounded disabled:bg-gray-100 focus:ring-2 focus:ring-orange-500"
                                                        />
                                                    </div>
                                                    <div className="flex gap-1.5 sm:gap-2">
                                                        <input
                                                            type="text"
                                                            value={topic.cycle || ''}
                                                            onChange={(e) =>
                                                                updateTopicField(topic.id, 'cycle', e.target.value)
                                                            }
                                                            placeholder="Cycle (SA-1)"
                                                            disabled={isPending}
                                                            className="flex-1 px-2 py-1 text-xs sm:text-sm border rounded disabled:bg-gray-100 focus:ring-2 focus:ring-orange-500"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => addSubtopic(topic.id)}
                                                            disabled={isPending}
                                                            className="p-1.5 sm:p-2 hover:bg-green-100 rounded text-green-600 border border-green-200 disabled:opacity-50 flex-shrink-0"
                                                            title="Add subtopic"
                                                        >
                                                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTopic(topic.id)}
                                                            disabled={isPending}
                                                            className="p-1.5 sm:p-2 hover:bg-red-100 rounded text-red-600 border border-red-200 disabled:opacity-50 flex-shrink-0"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Subtopics */}
                                            {topic.isExpanded &&
                                                topic.subtopics.filter((s) => !s.isDeleted).length > 0 && (
                                                    <div className="ml-6 sm:ml-8 space-y-2 mt-2 pt-2 border-t border-gray-200">
                                                        {topic.subtopics
                                                            .filter((s) => !s.isDeleted)
                                                            .map((subtopic) => (
                                                                <div key={subtopic.id} className="space-y-2">
                                                                    <div className="flex gap-1.5 sm:gap-2">
                                                                        <input
                                                                            type="text"
                                                                            value={subtopic.serialNumber}
                                                                            onChange={(e) =>
                                                                                updateSubtopicField(
                                                                                    topic.id,
                                                                                    subtopic.id,
                                                                                    'serialNumber',
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            placeholder="1.1"
                                                                            disabled={isPending}
                                                                            className="w-10 sm:w-12 px-1.5 py-1 text-xs sm:text-sm border rounded bg-white disabled:bg-gray-100 focus:ring-2 focus:ring-orange-500"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            value={subtopic.title}
                                                                            onChange={(e) =>
                                                                                updateSubtopicField(
                                                                                    topic.id,
                                                                                    subtopic.id,
                                                                                    'title',
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            placeholder="Subtopic title"
                                                                            disabled={isPending}
                                                                            className="flex-1 min-w-0 px-2 py-1 text-xs sm:text-sm border rounded bg-white disabled:bg-gray-100 focus:ring-2 focus:ring-orange-500"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                removeSubtopic(topic.id, subtopic.id)
                                                                            }
                                                                            disabled={isPending}
                                                                            className="p-1.5 hover:bg-red-100 rounded text-red-600 disabled:opacity-50 flex-shrink-0"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                                        </button>
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        value={subtopic.cycle || ''}
                                                                        onChange={(e) =>
                                                                            updateSubtopicField(
                                                                                topic.id,
                                                                                subtopic.id,
                                                                                'cycle',
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        placeholder="Cycle (optional)"
                                                                        disabled={isPending}
                                                                        className="w-full px-2 py-1 text-xs sm:text-sm border rounded bg-white disabled:bg-gray-100 focus:ring-2 focus:ring-orange-500"
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
                            disabled={isPending}
                            className={cn(
                                buttonVariants({ variant: 'outline', size: 'sm' }),
                                'w-full border-dashed disabled:opacity-50 text-xs sm:text-sm'
                            )}
                        >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                            Add Topic
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
                        <CustomButton
                            type="submit"
                            isLoading={isPending}
                            loadingMessage="Saving..."
                            className="bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm w-full sm:w-auto"
                        >
                            Save Changes
                        </CustomButton>
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isPending}
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full sm:w-auto text-xs sm:text-sm')}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </motion.div>

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <Modal
                    isOpen={confirmDelete.isOpen}
                    onClose={() => setConfirmDelete(null)}
                    title={`Confirm Delete ${confirmDelete.type === 'topic' ? 'Topic' : 'Subtopic'}`}
                    className="max-w-md"
                >
                    <div className="space-y-4">
                        <p className="text-sm text-gray-700">
                            Are you sure you want to delete{' '}
                            {confirmDelete.type === 'topic' ? 'the topic' : 'the subtopic'}{' '}
                            <strong>{confirmDelete.title}</strong>?
                        </p>

                        {confirmDelete.type === 'topic' && confirmDelete.hasSubtopics && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <p className="text-sm text-orange-800">
                                    <strong>Note:</strong> This topic has {confirmDelete.subtopicCount} subtopic(s).
                                    All subtopics will also be deleted.
                                </p>
                            </div>
                        )}

                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-800">
                                <strong>Warning:</strong> This action cannot be undone{confirmDelete.type === 'topic' && ' and all related progress data will be removed'}.
                            </p>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <CustomButton
                                onClick={() => setConfirmDelete(null)}
                                variant="outline"
                                className="text-sm"
                            >
                                Cancel
                            </CustomButton>
                            <CustomButton
                                onClick={confirmDelete.type === 'topic' ? confirmRemoveTopic : confirmRemoveSubtopic}
                                className="bg-red-600 hover:bg-red-700 text-white text-sm"
                            >
                                Delete
                            </CustomButton>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// Helper function to display level names
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

export default EditSyllabus;
