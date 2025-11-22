import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ChevronDown, Clock, CheckCircle2, PlayCircle, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import Modal from '@/components/ui/modal';
import { CustomButton } from '@/components/ui/custom-button';
import {
    useSyllabus,
    useSyllabusTopics,
    useUpdateTopicStatus,
} from '@/hooks';
import type { SyllabusTopic, SyllabusTopicStatus } from '@/types/api';
import toast from 'react-hot-toast';

const SyllabusProgress = () => {
    const { syllabusId } = useParams<{
        projectId: string;
        centerId: string;
        semesterId: string;
        syllabusId: string;
    }>();
    const navigate = useNavigate();

    const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
    const [statusFilter, setStatusFilter] = useState<SyllabusTopicStatus | 'ALL'>('ALL');
    const [cycleFilter, setCycleFilter] = useState<string>('ALL');
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        topicId: string;
        topicTitle: string;
        newStatus: SyllabusTopicStatus;
        subtopicCount: number;
    } | null>(null);

    // Fetch syllabus and topics
    const { data: syllabus, isLoading: syllabusLoading } = useSyllabus(syllabusId!, {
        includeStats: true,
    });

    const { data: topics = [], isLoading: topicsLoading } = useSyllabusTopics({
        syllabusId: syllabusId!,
        includeSubtopics: false,
    });

    const { mutate: updateStatus, isPending: isUpdating } = useUpdateTopicStatus();

    const isLoading = syllabusLoading || topicsLoading;

    // Get unique cycles
    const cycles = useMemo(() => {
        const cycleSet = new Set<string>();
        topics.forEach((topic) => {
            if (topic.cycle) cycleSet.add(topic.cycle);
        });
        return Array.from(cycleSet).sort();
    }, [topics]);

    // Filter topics
    const filteredTopics = useMemo(() => {
        return topics.filter((topic) => {
            if (!topic.parentId) {
                // Root topics only
                if (statusFilter !== 'ALL' && topic.status !== statusFilter) return false;
                if (cycleFilter !== 'ALL' && topic.cycle !== cycleFilter) return false;
                return true;
            }
            return false;
        });
    }, [topics, statusFilter, cycleFilter]);

    // Get filtered subtopics for a parent (applies status and cycle filters)
    const getFilteredSubtopics = (parentId: string): SyllabusTopic[] => {
        return topics.filter((t) => {
            if (t.parentId !== parentId) return false;
            // Apply status filter
            if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
            // Apply cycle filter
            if (cycleFilter !== 'ALL' && t.cycle !== cycleFilter) return false;
            return true;
        }).sort((a, b) => a.orderIndex - b.orderIndex);
    };

    // Get subtopics for a parent
    const getSubtopics = (parentId: string): SyllabusTopic[] => {
        return topics.filter((t) => t.parentId === parentId).sort((a, b) => a.orderIndex - b.orderIndex);
    };

    const toggleExpand = (topicId: string) => {
        setExpandedTopics((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(topicId)) {
                newSet.delete(topicId);
            } else {
                newSet.add(topicId);
            }
            return newSet;
        });
    };

    const handleStatusChange = async (topicId: string, newStatus: SyllabusTopicStatus, topicTitle: string) => {
        const topic = topics.find(t => t.id === topicId);
        const subtopics = getSubtopics(topicId);

        if (subtopics.length > 0) {
            // Parent topic with subtopics - show confirmation modal
            setConfirmModal({
                isOpen: true,
                topicId,
                topicTitle,
                newStatus,
                subtopicCount: subtopics.length,
            });
        } else if (topic?.parentId) {
            // This is a subtopic - update it and then check parent status
            try {
                await new Promise<void>((resolve, reject) => {
                    updateStatus(
                        { id: topicId, data: { status: newStatus } },
                        {
                            onSuccess: () => resolve(),
                            onError: (error) => reject(error),
                        }
                    );
                });

                // After updating subtopic, check and update parent status
                // Pass the updated status to ensure we use fresh data
                await updateParentStatusBasedOnSubtopics(topic.parentId, topicId, newStatus);
                toast.success('Status updated successfully');
            } catch (error) {
                const err = error as { message?: string };
                toast.error(err?.message || 'Failed to update status');
            }
        } else {
            // Parent topic without subtopics
            updateTopicStatus(topicId, newStatus);
        }
    };

    const updateParentStatusBasedOnSubtopics = async (
        parentId: string,
        updatedSubtopicId: string,
        updatedStatus: SyllabusTopicStatus
    ) => {
        const allSubtopics = getSubtopics(parentId);

        if (allSubtopics.length === 0) return;

        // Create a simulated updated list with the new status for the changed subtopic
        const subtopicsWithUpdate = allSubtopics.map(st =>
            st.id === updatedSubtopicId ? { ...st, status: updatedStatus } : st
        );

        // Determine the new parent status based on subtopic statuses
        const hasOngoing = subtopicsWithUpdate.some(st => st.status === 'ONGOING');
        const allCompleted = subtopicsWithUpdate.every(st => st.status === 'COMPLETED');
        const allPending = subtopicsWithUpdate.every(st => st.status === 'PENDING');

        let newParentStatus: SyllabusTopicStatus;

        if (hasOngoing) {
            // If any subtopic is ongoing, parent should be ongoing
            newParentStatus = 'ONGOING';
        } else if (allCompleted) {
            // If all subtopics are completed, parent should be completed
            newParentStatus = 'COMPLETED';
        } else if (allPending) {
            // If all subtopics are pending, parent should be pending
            newParentStatus = 'PENDING';
        } else {
            // Mixed state (some pending, some completed, no ongoing)
            // This means work has started but not all are complete - set to ONGOING
            newParentStatus = 'ONGOING';
        }

        const parent = topics.find(t => t.id === parentId);

        // Only update if status actually changed
        if (parent && parent.status !== newParentStatus) {
            await new Promise<void>((resolve, reject) => {
                updateStatus(
                    { id: parentId, data: { status: newParentStatus } },
                    {
                        onSuccess: () => resolve(),
                        onError: (error) => reject(error),
                    }
                );
            });
        }
    };

    const updateTopicStatus = (topicId: string, newStatus: SyllabusTopicStatus) => {
        updateStatus(
            {
                id: topicId,
                data: { status: newStatus },
            },
            {
                onSuccess: () => {
                    toast.success('Status updated successfully');
                    setConfirmModal(null);
                },
                onError: (error: unknown) => {
                    const err = error as { message?: string };
                    toast.error(err?.message || 'Failed to update status');
                    setConfirmModal(null);
                },
            }
        );
    };

    const handleConfirmStatusChange = async () => {
        if (!confirmModal) return;

        const { topicId, newStatus } = confirmModal;
        const subtopics = getSubtopics(topicId);

        try {
            // Update parent topic first
            await new Promise<void>((resolve, reject) => {
                updateStatus(
                    { id: topicId, data: { status: newStatus } },
                    {
                        onSuccess: () => resolve(),
                        onError: (error) => reject(error),
                    }
                );
            });

            // Update all subtopics to match parent
            for (const subtopic of subtopics) {
                await new Promise<void>((resolve, reject) => {
                    updateStatus(
                        { id: subtopic.id, data: { status: newStatus } },
                        {
                            onSuccess: () => resolve(),
                            onError: (error) => reject(error),
                        }
                    );
                });
            }

            toast.success(`Updated topic and ${subtopics.length} subtopic(s)`);
            setConfirmModal(null);
        } catch (error) {
            const err = error as { message?: string };
            toast.error(err?.message || 'Failed to update status');
            setConfirmModal(null);
        }
    };

    const getStatusIcon = (status: SyllabusTopicStatus) => {
        switch (status) {
            case 'PENDING':
                return <Clock className="w-4 h-4 text-gray-500" />;
            case 'ONGOING':
                return <PlayCircle className="w-4 h-4 text-blue-500" />;
            case 'COMPLETED':
                return <CheckCircle2 className="w-4 h-4 text-green-500" />;
        }
    };

    const getStatusColor = (status: SyllabusTopicStatus) => {
        switch (status) {
            case 'PENDING':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'ONGOING':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'COMPLETED':
                return 'bg-green-100 text-green-700 border-green-200';
        }
    };

    const renderTopic = (topic: SyllabusTopic, depth: number = 0) => {
        const subtopics = getSubtopics(topic.id);
        const filteredSubtopics = getFilteredSubtopics(topic.id);
        const hasSubtopics = subtopics.length > 0;
        const hasFilteredSubtopics = filteredSubtopics.length > 0;
        const isExpanded = expandedTopics.has(topic.id);

        return (
            <div key={topic.id} className="mb-2">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                        'bg-white rounded-lg border p-3 sm:p-4 hover:shadow-sm transition-all',
                        depth > 0 && 'ml-4 sm:ml-6 border-l-2 border-l-orange-200'
                    )}
                >
                    <div className="flex items-start gap-2 sm:gap-3">
                        {/* Remove expand button from here since it's now in the subtopics section */}

                        <div className="flex-1 min-w-0">
                            {/* Header Row: Title and Status */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                                {/* Title Section */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className="text-xs sm:text-sm font-mono text-muted-foreground font-semibold flex-shrink-0">
                                            {topic.serialNumber}
                                        </span>
                                        {topic.cycle && (
                                            <span className="text-xs sm:text-sm px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md font-medium flex-shrink-0">
                                                {topic.cycle}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-sm sm:text-base md:text-lg break-words leading-snug">
                                        {topic.title}
                                    </h4>
                                    {/* Last Updated Info */}
                                    {topic.recentProgress && topic.recentProgress.length > 0 && (
                                        <div className="mt-1.5 text-[10px] sm:text-xs text-gray-500">
                                            Updated by <span className="font-medium text-gray-700">{topic.recentProgress[0].updatedByUser.name}</span>
                                            {topic.status === 'ONGOING' && (() => {
                                                // Count only Saturday and Sunday days
                                                const startDate = new Date(topic.recentProgress[0].createdAt);
                                                const currentDate = new Date();
                                                let weekendDayCount = 0;

                                                for (let d = new Date(startDate); d <= currentDate; d.setDate(d.getDate() + 1)) {
                                                    const day = d.getDay();
                                                    if (day === 0 || day === 6) weekendDayCount++;
                                                }

                                                // Only show as delayed (red) if topic has NO subtopics
                                                const isDelayed = weekendDayCount > 6 && !hasSubtopics;

                                                return weekendDayCount > 0 ? (
                                                    <span className={cn(
                                                        "ml-1 font-medium",
                                                        isDelayed ? "text-red-600" : "text-blue-600"
                                                    )}>
                                                        • Ongoing for {weekendDayCount} day{weekendDayCount > 1 ? 's' : ''}
                                                    </span>
                                                ) : null;
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Current Status Badge - Top Right */}
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">Current Status</span>
                                    <span className={cn(
                                        'inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-semibold whitespace-nowrap',
                                        getStatusColor(topic.status)
                                    )}>
                                        {getStatusIcon(topic.status)}
                                        <span className="capitalize">{topic.status.toLowerCase()}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons Row */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-gray-600">Change to:</span>
                                {topic.status !== 'PENDING' && (
                                    <button
                                        onClick={() => handleStatusChange(topic.id, 'PENDING', topic.title)}
                                        disabled={isUpdating}
                                        className="h-7 sm:h-8 px-2 sm:px-3 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-[11px] sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-1.5 disabled:opacity-50"
                                    >
                                        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
                                        <span>Pending</span>
                                    </button>
                                )}
                                {topic.status !== 'ONGOING' && (
                                    <button
                                        onClick={() => handleStatusChange(topic.id, 'ONGOING', topic.title)}
                                        disabled={isUpdating}
                                        className="h-7 sm:h-8 px-2 sm:px-3 rounded-md border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-1.5 disabled:opacity-50"
                                    >
                                        <PlayCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                        <span>Ongoing</span>
                                    </button>
                                )}
                                {topic.status !== 'COMPLETED' && (
                                    <button
                                        onClick={() => handleStatusChange(topic.id, 'COMPLETED', topic.title)}
                                        disabled={isUpdating}
                                        className="h-7 sm:h-8 px-2 sm:px-3 rounded-md border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 text-[11px] sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-1.5 disabled:opacity-50"
                                    >
                                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                        <span>Complete</span>
                                    </button>
                                )}
                            </div>

                            {/* Subtopics List - Always visible when present */}
                            {hasSubtopics && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-semibold text-gray-600">
                                            Subtopics ({filteredSubtopics.length}{hasFilteredSubtopics && filteredSubtopics.length !== subtopics.length ? ` of ${subtopics.length}` : ''})
                                        </span>
                                        {hasFilteredSubtopics && (
                                            <button
                                                onClick={() => toggleExpand(topic.id)}
                                                className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                        <span>Hide</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                        <span>Show</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Subtopics - Collapsible section */}
                <AnimatePresence>
                    {isExpanded && hasFilteredSubtopics && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-2 ml-0 sm:ml-4 space-y-2">
                                {filteredSubtopics.map((subtopic) => (
                                    <motion.div
                                        key={subtopic.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-gradient-to-r from-orange-50/50 to-transparent rounded-lg border border-orange-200/50 p-2.5 sm:p-3"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] sm:text-xs font-mono text-muted-foreground font-semibold">
                                                        {subtopic.serialNumber}
                                                    </span>
                                                    {subtopic.cycle && (
                                                        <span className="text-[10px] sm:text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
                                                            {subtopic.cycle}
                                                        </span>
                                                    )}
                                                </div>
                                                <h5 className="font-semibold text-xs sm:text-sm break-words leading-snug">
                                                    {subtopic.title}
                                                </h5>
                                                {/* Last Updated Info for Subtopic */}
                                                {subtopic.recentProgress && subtopic.recentProgress.length > 0 && (
                                                    <div className="mt-1 text-[9px] sm:text-[10px] text-gray-500">
                                                        Updated by <span className="font-medium text-gray-700">{subtopic.recentProgress[0].updatedByUser.name}</span>
                                                        {subtopic.status === 'ONGOING' && (() => {
                                                            // Count only Saturday and Sunday days
                                                            const startDate = new Date(subtopic.recentProgress[0].createdAt);
                                                            const currentDate = new Date();
                                                            let weekendDayCount = 0;

                                                            for (let d = new Date(startDate); d <= currentDate; d.setDate(d.getDate() + 1)) {
                                                                const day = d.getDay();
                                                                if (day === 0 || day === 6) weekendDayCount++;
                                                            }

                                                            const isDelayed = weekendDayCount > 6;

                                                            return weekendDayCount > 0 ? (
                                                                <span className={cn(
                                                                    "ml-1 font-medium",
                                                                    isDelayed ? "text-red-600" : "text-blue-600"
                                                                )}>
                                                                    • Ongoing for {weekendDayCount} day{weekendDayCount > 1 ? 's' : ''}
                                                                </span>
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                                <span className="text-[8px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wide">Status</span>
                                                <span className={cn(
                                                    'inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] sm:text-xs font-semibold whitespace-nowrap',
                                                    getStatusColor(subtopic.status)
                                                )}>
                                                    {getStatusIcon(subtopic.status)}
                                                    <span className="capitalize">{subtopic.status.toLowerCase()}</span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[9px] sm:text-[10px] font-medium text-gray-600">Change to:</span>
                                            {subtopic.status !== 'PENDING' && (
                                                <button
                                                    onClick={() => handleStatusChange(subtopic.id, 'PENDING', subtopic.title)}
                                                    disabled={isUpdating}
                                                    className="h-6 sm:h-7 px-2 rounded border border-gray-300 bg-white hover:bg-gray-50 text-[10px] sm:text-xs font-medium transition-all flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-500" />
                                                    <span>Pending</span>
                                                </button>
                                            )}
                                            {subtopic.status !== 'ONGOING' && (
                                                <button
                                                    onClick={() => handleStatusChange(subtopic.id, 'ONGOING', subtopic.title)}
                                                    disabled={isUpdating}
                                                    className="h-6 sm:h-7 px-2 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] sm:text-xs font-medium transition-all flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    <PlayCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                    <span>Ongoing</span>
                                                </button>
                                            )}
                                            {subtopic.status !== 'COMPLETED' && (
                                                <button
                                                    onClick={() => handleStatusChange(subtopic.id, 'COMPLETED', subtopic.title)}
                                                    disabled={isUpdating}
                                                    className="h-6 sm:h-7 px-2 rounded border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] sm:text-xs font-medium transition-all flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                    <span>Complete</span>
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60dvh]">
                <LoadingButterfly size="md" />
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
                        The syllabus you're looking for doesn't exist.
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

    const completionPercentage =
        syllabus.stats && syllabus.stats.totalTopics > 0
            ? Math.round((syllabus.stats.completedTopics / syllabus.stats.totalTopics) * 100)
            : 0;

    return (
        <div className="w-full relative pb-6 sm:pb-8 p-2 sm:p-0">
            <DoodleBackground numElements={10} />

            {/* Header */}
            <div className="mb-4 sm:mb-6 relative z-10">
                <button
                    onClick={() => navigate(-1)}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-3 sm:mb-4 -ml-2 text-xs sm:text-sm')}
                >
                    ← Back
                </button>

                <div className="bg-white/80 rounded-lg border shadow-sm p-3 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 mb-3 sm:mb-4">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 break-words">{syllabus.name}</h1>
                            {syllabus.description && (
                                <p className="text-muted-foreground text-xs sm:text-sm break-words">{syllabus.description}</p>
                            )}
                        </div>
                        <span className="px-2 sm:px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 self-start">
                            {syllabus.level.replace('_', ' ')}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    {syllabus.stats && (
                        <div>
                            <div className="flex justify-between text-xs sm:text-sm mb-2">
                                <span className="font-medium">Overall Progress</span>
                                <span className="text-muted-foreground">{completionPercentage}%</span>
                            </div>
                            <div className="w-full h-2 sm:h-3 bg-gray-200 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${completionPercentage}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-orange-500 to-orange-600"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-3 sm:mt-4">
                                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-center gap-1 text-gray-600 mb-0.5 sm:mb-1">
                                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="text-[10px] sm:text-xs font-medium">Pending</span>
                                    </div>
                                    <p className="text-lg sm:text-2xl font-bold">{syllabus.stats.pendingTopics}</p>
                                </div>
                                <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                                    <div className="flex items-center justify-center gap-1 text-blue-600 mb-0.5 sm:mb-1">
                                        <PlayCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="text-[10px] sm:text-xs font-medium">Ongoing</span>
                                    </div>
                                    <p className="text-lg sm:text-2xl font-bold text-blue-600">
                                        {syllabus.stats.ongoingTopics}
                                    </p>
                                </div>
                                <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                                    <div className="flex items-center justify-center gap-1 text-green-600 mb-0.5 sm:mb-1">
                                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="text-[10px] sm:text-xs font-medium">Completed</span>
                                    </div>
                                    <p className="text-lg sm:text-2xl font-bold text-green-600">
                                        {syllabus.stats.completedTopics}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="space-y-3 mb-4 sm:mb-6 relative z-10">
                {/* Status Filter */}
                <div>
                    <label className="block text-xs sm:text-sm font-medium mb-2">Filter by Status</label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setStatusFilter('ALL')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all border',
                                statusFilter === 'ALL'
                                    ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            )}
                        >
                            All Statuses
                        </button>
                        <button
                            onClick={() => setStatusFilter('PENDING')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all border flex items-center gap-1.5',
                                statusFilter === 'PENDING'
                                    ? 'bg-gray-500 text-white border-gray-500 shadow-md'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            )}
                        >
                            <Clock className="w-3.5 h-3.5" />
                            Pending
                        </button>
                        <button
                            onClick={() => setStatusFilter('ONGOING')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all border flex items-center gap-1.5',
                                statusFilter === 'ONGOING'
                                    ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            )}
                        >
                            <PlayCircle className="w-3.5 h-3.5" />
                            Ongoing
                        </button>
                        <button
                            onClick={() => setStatusFilter('COMPLETED')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all border flex items-center gap-1.5',
                                statusFilter === 'COMPLETED'
                                    ? 'bg-green-500 text-white border-green-500 shadow-md'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            )}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Completed
                        </button>
                    </div>
                </div>

                {/* Cycle Filter */}
                {cycles.length > 0 && (
                    <div>
                        <label className="block text-xs sm:text-sm font-medium mb-2">Filter by Cycle</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setCycleFilter('ALL')}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all border',
                                    cycleFilter === 'ALL'
                                        ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                )}
                            >
                                All Cycles
                            </button>
                            {cycles.map((cycle) => (
                                <button
                                    key={cycle}
                                    onClick={() => setCycleFilter(cycle)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all border',
                                        cycleFilter === cycle
                                            ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    )}
                                >
                                    {cycle}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Topics List */}
            <div className="relative z-10">
                {filteredTopics.length === 0 ? (
                    <div className="bg-white/80 rounded-lg border shadow-sm p-6 sm:p-12 text-center">
                        <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                        <h3 className="text-base sm:text-xl font-semibold mb-2">No Topics Found</h3>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                            {statusFilter !== 'ALL' || cycleFilter !== 'ALL'
                                ? 'Try adjusting your filters'
                                : 'No topics have been added to this syllabus yet'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredTopics.map((topic) => renderTopic(topic))}
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <Modal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal(null)}
                    title="Confirm Status Change"
                    className="max-w-md"
                >
                    <div className="space-y-4">
                        <p className="text-sm text-gray-700">
                            You are about to change the status of <strong>{confirmModal.topicTitle}</strong> to{' '}
                            <strong>{confirmModal.newStatus.toLowerCase()}</strong>.
                        </p>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <p className="text-sm text-orange-800">
                                <strong>Note:</strong> This topic has {confirmModal.subtopicCount} subtopic(s).
                                All subtopics will also be updated to <strong>{confirmModal.newStatus.toLowerCase()}</strong>.
                            </p>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <CustomButton
                                onClick={() => setConfirmModal(null)}
                                variant="outline"
                                className="text-sm"
                            >
                                Cancel
                            </CustomButton>
                            <CustomButton
                                onClick={handleConfirmStatusChange}
                                isLoading={isUpdating}
                                loadingMessage="Updating..."
                                className="bg-orange-600 hover:bg-orange-700 text-white text-sm"
                            >
                                Confirm
                            </CustomButton>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default SyllabusProgress;
