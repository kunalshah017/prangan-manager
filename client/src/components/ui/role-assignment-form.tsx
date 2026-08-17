import React, { useMemo } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import { useProjects } from '@/hooks/useProjectQueries';
import { useCenters } from '@/hooks/useCenterQueries';
import { useSemesters } from '@/hooks/useSemesterQueries';
import { SemesterLevelSelect } from '@/components/levels/SemesterLevelSelect';
import type { RoleAssignment, Center, Semester } from '@/types/api';

interface RoleAssignmentFormProps {
    roleAssignments: RoleAssignment[];
    onChange: (roleAssignments: RoleAssignment[]) => void;
    userRole: 'USER' | 'ADMIN';
    onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

const SUB_ROLES = [
    { value: 'TRAINING_DEVELOPMENT', label: 'Training & Development' },
    { value: 'RECRUITMENT', label: 'Recruitment' },
    { value: 'GROWTH_DEVELOPMENT', label: 'Growth & Development' },
    { value: 'CURRICULUM_MENTOR', label: 'Curriculum Mentor' },
    { value: 'TECH', label: 'Tech' },
    { value: 'CENTER_MANAGER', label: 'Center Manager' },
    { value: 'EDUCATOR', label: 'Educator' },
] as const;

const COMMITTED_DAYS = [
    { value: 'SATURDAY', label: 'Saturday' },
    { value: 'SUNDAY', label: 'Sunday' },
    { value: 'BOTH', label: 'Both Saturday & Sunday' },
] as const;

const RoleAssignmentForm: React.FC<RoleAssignmentFormProps> = ({
    roleAssignments,
    onChange,
    userRole,
    onValidationChange,
}) => {
    const { data: projects = [] } = useProjects();

    // Fetch all centers
    const { data: allCenters = [] } = useCenters();

    // Fetch all semesters at once
    const { data: allSemesters = [] } = useSemesters();

    // Create mappings that make data available for all projects/centers
    const centersByProject = useMemo(() => {
        const result: Record<string, Center[]> = {};

        projects.forEach(project => {
            result[project.id] = allCenters.filter(center => center.projectId === project.id);
        });

        return result;
    }, [allCenters, projects]);

    // Build semester mappings from all semesters
    const semestersByCenter = useMemo(() => {
        const result: Record<string, Semester[]> = {};

        allCenters.forEach(center => {
            result[center.id] = allSemesters.filter(s => s.centerId === center.id);
        });

        return result;
    }, [allCenters, allSemesters]);

    // Duplicate validation and mandatory field validation logic
    const validateRoleAssignments = useMemo(() => {
        const errors: string[] = [];
        const duplicates: number[] = [];

        // Check mandatory fields and duplicates
        for (let i = 0; i < roleAssignments.length; i++) {
            const assignment = roleAssignments[i];
            const roleLabel = SUB_ROLES.find(r => r.value === assignment.subRole)?.label || assignment.subRole;

            // Check mandatory fields
            if (!assignment.subRole) {
                errors.push(`Role assignment ${i + 1}: Sub-role is required`);
            }

            if (!assignment.projectId) {
                errors.push(`Role assignment ${i + 1} (${roleLabel}): Project is required`);
            }

            if (!assignment.centerId) {
                errors.push(`Role assignment ${i + 1} (${roleLabel}): Center is required`);
            }

            if (!assignment.semesterId) {
                errors.push(`Role assignment ${i + 1} (${roleLabel}): Semester is required`);
            }

            // Check for exact duplicates
            for (let j = i + 1; j < roleAssignments.length; j++) {
                const assignment2 = roleAssignments[j];

                // Check if all fields match (considering undefined as empty string)
                const isDuplicate =
                    assignment.subRole === assignment2.subRole &&
                    (assignment.projectId || '') === (assignment2.projectId || '') &&
                    (assignment.centerId || '') === (assignment2.centerId || '') &&
                    (assignment.semesterId || '') === (assignment2.semesterId || '') &&
                    (assignment.semesterLevelId || '') === (assignment2.semesterLevelId || '') &&
                    (assignment.committedDays || '') === (assignment2.committedDays || '');

                if (isDuplicate) {
                    if (!duplicates.includes(i)) duplicates.push(i);
                    if (!duplicates.includes(j)) duplicates.push(j);

                    const projectLabel = projects.find(p => p.id === assignment.projectId)?.name || 'No project';
                    const centerLabel = allCenters.find(c => c.id === assignment.centerId)?.name || 'No center';

                    errors.push(`Duplicate role assignment found: ${roleLabel} in ${projectLabel} - ${centerLabel}`);
                }
            }
        }

        const isValid = errors.length === 0;

        return { isValid, errors, duplicates };
    }, [roleAssignments, projects, allCenters]);

    // Call the validation callback when validation changes
    React.useEffect(() => {
        if (onValidationChange) {
            onValidationChange(validateRoleAssignments.isValid, validateRoleAssignments.errors);
        }
    }, [validateRoleAssignments.isValid, validateRoleAssignments.errors, onValidationChange]);

    const addRoleAssignment = () => {
        const newAssignment: RoleAssignment = {
            subRole: 'TRAINING_DEVELOPMENT',
        };
        onChange([...roleAssignments, newAssignment]);
    };

    const removeRoleAssignment = (index: number) => {
        const updated = roleAssignments.filter((_, i) => i !== index);
        onChange(updated);
    };

    const updateRoleAssignment = (index: number, field: keyof RoleAssignment, value: string | undefined) => {
        const updated = [...roleAssignments];
        const assignment = { ...updated[index] };

        // Handle cascading updates
        if (field === 'subRole') {
            assignment.subRole = value as RoleAssignment['subRole'];
            // Clear incompatible fields
            if (value !== 'EDUCATOR') {
                delete assignment.semesterLevelId;
                delete assignment.semesterLevel;
            }
            if (value !== 'CENTER_MANAGER' && value !== 'EDUCATOR') {
                delete assignment.committedDays;
            }
        } else if (field === 'projectId') {
            assignment.projectId = value;

            // Clear center and semester if project changes (unless they're empty)
            if (assignment.centerId || assignment.semesterId) {
                // Check if the current center belongs to the new project
                if (value && assignment.centerId) {
                    const center = allCenters.find(c => c.id === assignment.centerId);
                    if (center && center.projectId !== value) {
                        // Center doesn't belong to new project, clear it and semester
                        delete assignment.centerId;
                        delete assignment.semesterId;
                        delete assignment.semesterLevelId;
                        delete assignment.semesterLevel;
                    }
                } else if (!value) {
                    // Project cleared, clear everything
                    delete assignment.centerId;
                    delete assignment.semesterId;
                    delete assignment.semesterLevelId;
                    delete assignment.semesterLevel;
                }
            }
        } else if (field === 'centerId') {
            assignment.centerId = value;

            // Only auto-assign project if it's not already set
            if (value && !assignment.projectId) {
                const center = allCenters.find(c => c.id === value);
                if (center && center.projectId) {
                    assignment.projectId = center.projectId;
                }
            }

            // Only clear semester if it doesn't belong to this center
            if (value && assignment.semesterId) {
                const semester = allSemesters.find(s => s.id === assignment.semesterId);
                if (semester && semester.centerId !== value) {
                    delete assignment.semesterId;
                    delete assignment.semesterLevelId;
                    delete assignment.semesterLevel;
                }
            } else if (!value) {
                // Clear semester if center is cleared
                delete assignment.semesterId;
                delete assignment.semesterLevelId;
                delete assignment.semesterLevel;
            }
        } else if (field === 'semesterId') {
            assignment.semesterId = value;
            delete assignment.semesterLevelId;
            delete assignment.semesterLevel;

            // Only auto-assign center and project if they're not already set
            if (value) {
                const semester = allSemesters.find(s => s.id === value);
                if (semester) {
                    // Only set center if empty or if current center doesn't match
                    if (!assignment.centerId) {
                        assignment.centerId = semester.centerId;
                    }

                    // Only set project if empty
                    if (!assignment.projectId) {
                        const center = allCenters.find(c => c.id === semester.centerId);
                        if (center && center.projectId) {
                            assignment.projectId = center.projectId;
                        }
                    }
                }
            }
        } else if (field === 'semesterLevelId') {
            assignment.semesterLevelId = value;
        } else if (field === 'committedDays') {
            assignment.committedDays = value as RoleAssignment['committedDays'];
        }

        updated[index] = assignment;
        onChange(updated);
    };

    if (userRole === 'ADMIN') {
        return (
            <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-blue-800">
                        Admin users don't require role assignments. They have full access to all features.
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                    Role Assignments
                </label>
                <button
                    type="button"
                    onClick={addRoleAssignment}
                    className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        "text-orange-600 border-orange-200 hover:bg-orange-50"
                    )}
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Role
                </button>
            </div>

            {/* Validation Errors */}
            {!validateRoleAssignments.isValid && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-medium text-red-800">Duplicate Role Assignments Found</h4>
                            <ul className="mt-2 text-sm text-red-700 space-y-1">
                                {validateRoleAssignments.errors.map((error, index) => (
                                    <li key={index}>• {error}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {roleAssignments.length === 0 && (
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-600">No role assignments yet. Click "Add Role" to get started.</p>
                </div>
            )}

            {roleAssignments.map((assignment, index) => {
                const isDuplicate = validateRoleAssignments.duplicates.includes(index);

                return (
                    <div
                        key={index}
                        className={cn(
                            "bg-white border rounded-lg p-4 space-y-4",
                            isDuplicate && "border-red-300 bg-red-50"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <h4 className={cn(
                                "text-sm font-medium",
                                isDuplicate ? "text-red-700" : "text-gray-700"
                            )}>
                                Role Assignment #{index + 1}
                                {isDuplicate && <span className="ml-2 text-red-600">(Duplicate)</span>}
                            </h4>
                            <button
                                type="button"
                                onClick={() => removeRoleAssignment(index)}
                                className="text-red-600 hover:text-red-700 p-1"
                                title="Remove role assignment"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Sub Role */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sub Role <span className="ml-1 text-destructive" aria-hidden="true">*</span>
                                </label>
                                <select
                                    value={assignment.subRole}
                                    onChange={(e) => updateRoleAssignment(index, 'subRole', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    aria-label="Sub Role"
                                >
                                    {SUB_ROLES.map((role) => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Project */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Project
                                </label>
                                <select
                                    value={assignment.projectId || ''}
                                    onChange={(e) => updateRoleAssignment(index, 'projectId', e.target.value || undefined)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    aria-label="Project"
                                >
                                    <option value="">Select a project</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Center */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Center
                                </label>
                                <select
                                    value={assignment.centerId || ''}
                                    onChange={(e) => updateRoleAssignment(index, 'centerId', e.target.value || undefined)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    disabled={!assignment.projectId}
                                    aria-label="Center"
                                >
                                    <option value="">Select a center</option>
                                    {assignment.projectId && centersByProject[assignment.projectId]?.map((center) => (
                                        <option key={center.id} value={center.id}>
                                            {center.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Semester */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Semester
                                </label>
                                <select
                                    value={assignment.semesterId || ''}
                                    onChange={(e) => updateRoleAssignment(index, 'semesterId', e.target.value || undefined)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    disabled={!assignment.centerId}
                                    aria-label="Semester"
                                >
                                    <option value="">Select a semester</option>
                                    {assignment.centerId && semestersByCenter[assignment.centerId]?.map((semester) => (
                                        <option key={semester.id} value={semester.id}>
                                            {semester.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Level - Only for Educator */}
                            {assignment.subRole === 'EDUCATOR' && (
                                <div>
                                    <SemesterLevelSelect
                                        semesterId={assignment.semesterId || ''}
                                        value={assignment.semesterLevelId || ''}
                                        onChange={(value) => updateRoleAssignment(index, 'semesterLevelId', value || undefined)}
                                        disabled={!assignment.semesterId}
                                        includeInactiveCurrent
                                        currentLevel={assignment.semesterLevel || undefined}
                                    />
                                </div>
                            )}

                            {/* Committed Days - Only for Center Manager and Educator */}
                            {(assignment.subRole === 'CENTER_MANAGER' || assignment.subRole === 'EDUCATOR') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Committed Days
                                    </label>
                                    <select
                                        value={assignment.committedDays || ''}
                                        onChange={(e) => updateRoleAssignment(index, 'committedDays', e.target.value || undefined)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        aria-label="Committed Days"
                                    >
                                        <option value="">Select committed days</option>
                                        {COMMITTED_DAYS.map((day) => (
                                            <option key={day.value} value={day.value}>
                                                {day.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Add Role Button at the End */}
            {roleAssignments.length > 0 && (
                <div className="flex justify-center pt-2">
                    <button
                        type="button"
                        onClick={addRoleAssignment}
                        className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                            "text-orange-600 border-orange-200 hover:bg-orange-50"
                        )}
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Another Role
                    </button>
                </div>
            )}
        </div>
    );
};

export default RoleAssignmentForm;
