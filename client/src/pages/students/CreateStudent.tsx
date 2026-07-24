import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
    StudentFormLayout,
    type StudentFormValues,
} from "@/components/students/StudentFormLayout";
import type { PersonNameField } from "@/components/ui/person-name-fields";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";
import { useCreateStudent } from "@/hooks/useStudentQueries";
const emptyValues: StudentFormValues = {
    firstName: "",
    middleName: "",
    lastName: "",
    profileImageUrl: "",
    dob: "",
    phoneNumber: "",
    whatsappNumber: "",
    alternateNumber: "",
    fatherName: "",
    motherName: "",
    address: "",
    schoolName: "",
    fatherOccupation: "",
    motherOccupation: "",
    familyIncome: "",
    futureProfession: "",
};

export default function CreateStudent() {
    const navigate = useNavigate();
    const { projectId = "", centerId = "", semesterId = "" } = useParams();
    const createStudent = useCreateStudent();
    const [values, setValues] = useState<StudentFormValues>(emptyValues);
    const [semesterLevelId, setSemesterLevelId] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const studentsUrl = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/students`;

    const updateField = (field: keyof StudentFormValues, value: string) => {
        setValues((current) => ({ ...current, [field]: value }));
        if (errors[field]) setErrors((current) => ({ ...current, [field]: "" }));
    };

    const updateName = (field: PersonNameField, value: string) => updateField(field, value);

    const validate = () => {
        const nextErrors: Record<string, string> = {};
        if (!values.firstName.trim()) nextErrors.firstName = "First name is required";
        if (!semesterLevelId) nextErrors.level = "Level is required";
        for (const field of ["phoneNumber", "whatsappNumber", "alternateNumber"] as const) {
            const value = values[field];
            if (value && !/^\+\d{10,15}$/.test(value)) nextErrors[field] = "Enter a valid phone number";
        }
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validate()) return;

        const optional = (value?: string) => value?.trim() || undefined;
        await createStudent.mutateAsync({
            firstName: values.firstName.trim(),
            middleName: values.middleName?.trim() || null,
            lastName: values.lastName?.trim() || null,
            profileImageUrl: optional(values.profileImageUrl),
            dob: optional(values.dob),
            phoneNumber: optional(values.phoneNumber),
            whatsappNumber: optional(values.whatsappNumber),
            alternateNumber: optional(values.alternateNumber),
            fatherName: optional(values.fatherName),
            motherName: optional(values.motherName),
            address: optional(values.address),
            schoolName: optional(values.schoolName),
            fatherOccupation: optional(values.fatherOccupation),
            motherOccupation: optional(values.motherOccupation),
            familyIncome: optional(values.familyIncome),
            futureProfession: optional(values.futureProfession),
            enrollment: { projectId, centerId, semesterId, semesterLevelId },
        });
        navigate(studentsUrl);
    };

    return (
        <WorkspacePage>
            <StudentFormLayout
                mode="create"
                values={values}
                semesterId={semesterId}
                semesterLevelId={semesterLevelId}
                errors={errors}
                isPending={createStudent.isPending}
                error={createStudent.error instanceof Error ? createStudent.error.message : undefined}
                onChange={updateField}
                onNameChange={updateName}
                onSemesterLevelChange={setSemesterLevelId}
                onSubmit={handleSubmit}
                onCancel={() => navigate(studentsUrl)}
            />
        </WorkspacePage>
    );
}
