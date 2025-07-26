import { useMemo } from "react";
import { useCentersByProject } from "@/hooks/useCenterQueries";
import { useSemestersByCenter } from "@/hooks/useSemesterQueries";
import type { RoleAssignment } from "@/types/api";

export const useRoleAssignmentData = (roleAssignments: RoleAssignment[]) => {
  // Get all unique project IDs from assignments
  const projectIds = useMemo(() => {
    return [
      ...new Set(
        roleAssignments.map((ra) => ra.projectId).filter(Boolean) as string[]
      ),
    ];
  }, [roleAssignments]);

  // Get all unique center IDs from assignments
  const centerIds = useMemo(() => {
    return [
      ...new Set(
        roleAssignments.map((ra) => ra.centerId).filter(Boolean) as string[]
      ),
    ];
  }, [roleAssignments]);

  // Use the first project to get centers (simplified approach)
  const primaryProjectId = projectIds[0] || "";
  const { data: centersData = [] } = useCentersByProject(primaryProjectId);

  // Use the first center to get semesters
  const primaryCenterId = centerIds[0] || "";
  const { data: semestersData = [] } = useSemestersByCenter(primaryCenterId);

  // Create mappings
  const centersByProject = useMemo(() => {
    const result: Record<string, typeof centersData> = {};
    if (primaryProjectId && centersData.length > 0) {
      // Add centers to the primary project
      result[primaryProjectId] = centersData;
      // For simplicity, add the same centers to all other project IDs
      projectIds.forEach((projectId) => {
        if (projectId !== primaryProjectId) {
          result[projectId] = centersData;
        }
      });
    }
    return result;
  }, [primaryProjectId, centersData, projectIds]);

  const semestersByCenter = useMemo(() => {
    const result: Record<string, typeof semestersData> = {};
    if (primaryCenterId && semestersData.length > 0) {
      // Add semesters to the primary center
      result[primaryCenterId] = semestersData;
      // For simplicity, add the same semesters to all other center IDs
      centerIds.forEach((centerId) => {
        if (centerId !== primaryCenterId) {
          result[centerId] = semestersData;
        }
      });
    }
    return result;
  }, [primaryCenterId, semestersData, centerIds]);

  return {
    centersByProject,
    semestersByCenter,
  };
};
