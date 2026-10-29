import React, { useMemo } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSemesterFinished } from '@/lib/workspace-display';
import { useProjects } from '@/hooks/useProjectQueries';
import { useCenters } from '@/hooks/useCenterQueries';
import { useSemesters } from '@/hooks/useSemesterQueries';
import { SemesterLevelSelect } from '@/components/levels/SemesterLevelSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RoleAssignment, Center, Semester } from '@/types/api';

interface RoleAssignmentFormProps {
    roleAssignments: RoleAssignment[];
    onChange: (roleAssignments: RoleAssignment[]) => void;
    userRole: 'USER' | 'ADMIN';
    onValidationChange?: (isValid: boolean, errors: string[]) => void;
    // A new form can wait until the first attempt to list what is missing.
    showErrors?: boolean;
}

const SUB_ROLES = [
    { value: 'EDUCATOR', label: 'Educator' },
    { value: 'CENTER_MANAGER', label: 'Centre manager' },
    { value: 'CURRICULUM_MENTOR', label: 'Curriculum mentor' },
    { value: 'TRAINING_DEVELOPMENT', label: 'Training and development' },
    { value: 'RECRUITMENT', label: 'Recruitment' },
    { value: 'GROWTH_DEVELOPMENT', label: 'Growth and development' },
    { value: 'TECH', label: 'Tech' },
] as const;

const COMMITTED_DAYS = [
    { value: 'SATURDAY', label: 'Saturdays' },
    { value: 'SUNDAY', label: 'Sundays' },
    { value: 'BOTH', label: 'Saturdays and Sundays' },
] as const;

const RoleAssignmentForm: React.FC<RoleAssignmentFormProps> = ({
    roleAssignments,
    onChange,
    userRole,
    onValidationChange,
    showErrors = true,
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
                errors.push(`Assignment ${i + 1}: choose a role.`);
            }

            if (!assignment.projectId) {
                errors.push(`Assignment ${i + 1} (${roleLabel}): choose a project.`);
            }

            if (!assignment.centerId) {
                errors.push(`Assignment ${i + 1} (${roleLabel}): choose a centre.`);
            }

            if (!assignment.semesterId) {
                errors.push(`Assignment ${i + 1} (${roleLabel}): choose a semester.`);
            }

            if (
                assignment.subRole === 'EDUCATOR' &&
                assignment.semesterId &&
                !assignment.semesterLevelId
            ) {
                errors.push(`Assignment ${i + 1} (${roleLabel}): choose a level.`);
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

                    const projectLabel = projects.find(p => p.id === assignment.projectId)?.name || 'no project';
                    const centerLabel = allCenters.find(c => c.id === assignment.centerId)?.name || 'no centre';

                    errors.push(`${roleLabel} at ${centerLabel} (${projectLabel}) is listed twice.`);
                }
            }
        }

        // Matches the server: one educator level per centre and semester.
        const levelByPlace = new Map<string, { index: number; level: string }>();
        roleAssignments.forEach((assignment, index) => {
            if (assignment.subRole !== 'EDUCATOR' || !assignment.centerId || !assignment.semesterId) return;
            const place = `${assignment.centerId}|${assignment.semesterId}`;
            const level = assignment.semesterLevelId ?? '';
            const first = levelByPlace.get(place);
            if (!first) {
                levelByPlace.set(place, { index, level });
                return;
            }
            if (first.level === level) return;
            for (const clash of [first.index, index]) if (!duplicates.includes(clash)) duplicates.push(clash);
            const centerLabel = allCenters.find(c => c.id === assignment.centerId)?.name || 'this centre';
            errors.push(`Assignments ${first.index + 1} and ${index + 1}: an educator teaches one level per semester at ${centerLabel}. Keep one.`);
        });

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
            subRole: 'EDUCATOR',
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
        return <p className="text-sm text-muted-foreground">Administrators work across everything, so they need no assignments.</p>;
    }

    return (
        <div className="space-y-3">
            {showErrors && !validateRoleAssignments.isValid && (
                <div id="assignment-errors" className="scroll-mt-24 rounded-lg border border-destructive/30 bg-destructive/5 p-3" role="alert">
                    <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        Fix these to continue
                    </p>
                    <ul className="mt-1.5 space-y-1 pl-6 text-sm text-destructive">
                        {validateRoleAssignments.errors.map((error) => <li key={error}>{error}</li>)}
                    </ul>
                </div>
            )}

            {roleAssignments.length === 0 && (
                <p className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">No assignments yet.</p>
            )}

            {roleAssignments.map((assignment, index) => {
                const isDuplicate = validateRoleAssignments.duplicates.includes(index);
                const fieldId = (name: string) => `assignment-${index}-${name}`;

                return (
                    <fieldset
                        key={index}
                        className={cn('space-y-3 rounded-lg border p-3', isDuplicate ? 'border-destructive/50 bg-destructive/5' : 'border-border')}
                    >
                        <legend className="sr-only">Assignment {index + 1}</legend>
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-base font-semibold text-foreground" aria-hidden="true">
                                Assignment {index + 1}
                                {isDuplicate && <span className="ml-2 text-sm font-normal text-destructive">Conflict</span>}
                            </p>
                            <button
                                type="button"
                                onClick={() => removeRoleAssignment(index)}
                                aria-label={`Remove assignment ${index + 1}`}
                                className="-mr-1 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <ChoiceField
                                id={fieldId('role')}
                                label="Role"
                                value={assignment.subRole}
                                onChange={(value) => updateRoleAssignment(index, 'subRole', value)}
                                options={SUB_ROLES.map((role) => ({ value: role.value, label: role.label }))}
                            />
                            <ChoiceField
                                id={fieldId('project')}
                                label="Project"
                                placeholder="Choose a project"
                                value={assignment.projectId}
                                onChange={(value) => updateRoleAssignment(index, 'projectId', value)}
                                options={projects.map((project) => ({ value: project.id, label: project.name }))}
                            />
                            <ChoiceField
                                id={fieldId('centre')}
                                label="Centre"
                                placeholder={assignment.projectId ? 'Choose a centre' : 'Choose a project first'}
                                value={assignment.centerId}
                                disabled={!assignment.projectId}
                                onChange={(value) => updateRoleAssignment(index, 'centerId', value)}
                                options={(assignment.projectId ? centersByProject[assignment.projectId] ?? [] : []).map((center) => ({ value: center.id, label: center.name }))}
                            />
                            <ChoiceField
                                id={fieldId('semester')}
                                label="Semester"
                                placeholder={assignment.centerId ? 'Choose a semester' : 'Choose a centre first'}
                                value={assignment.semesterId}
                                disabled={!assignment.centerId}
                                onChange={(value) => updateRoleAssignment(index, 'semesterId', value)}
                                options={(assignment.centerId ? semestersByCenter[assignment.centerId] ?? [] : [])
                                    .filter((semester) => semester.id === assignment.semesterId || !isSemesterFinished(semester))
                                    .map((semester) => ({ value: semester.id, label: semester.name }))}
                            />
                            {assignment.subRole === 'EDUCATOR' && (
                                <SemesterLevelSelect
                                    id={fieldId('level')}
                                    semesterId={assignment.semesterId || ''}
                                    value={assignment.semesterLevelId || ''}
                                    onChange={(value) => updateRoleAssignment(index, 'semesterLevelId', value || undefined)}
                                    disabled={!assignment.semesterId}
                                    required
                                    includeInactiveCurrent
                                    currentLevel={assignment.semesterLevel || undefined}
                                />
                            )}
                            {(assignment.subRole === 'CENTER_MANAGER' || assignment.subRole === 'EDUCATOR') && (
                                <ChoiceField
                                    id={fieldId('days')}
                                    label="Days"
                                    placeholder="Choose days"
                                    value={assignment.committedDays}
                                    onChange={(value) => updateRoleAssignment(index, 'committedDays', value)}
                                    options={COMMITTED_DAYS.map((day) => ({ value: day.value, label: day.label }))}
                                />
                            )}
                        </div>
                    </fieldset>
                );
            })}

            <button
                type="button"
                onClick={addRoleAssignment}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 text-base font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <Plus className="h-5 w-5" aria-hidden="true" />
                {roleAssignments.length === 0 ? 'Add assignment' : 'Add another assignment'}
            </button>
        </div>
    );
};

// A labelled shared Select. Radix reserves the empty string for "nothing
// chosen", which is what an unset field shows.
function ChoiceField({
    id,
    label,
    value,
    onChange,
    options,
    placeholder,
    disabled = false,
}: {
    id: string;
    label: string;
    value?: string | null;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-sm font-semibold text-foreground">{label}</label>
            <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger id={id}><SelectValue placeholder={placeholder} /></SelectTrigger>
                <SelectContent>
                    {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    );
}

export default RoleAssignmentForm;
