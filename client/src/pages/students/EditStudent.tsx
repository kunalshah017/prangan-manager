import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import EnrollmentManager from "@/components/EnrollmentManager";
import {
    StudentFormLayout,
    type StudentFormValues,
} from "@/components/students/StudentFormLayout";
import type { PersonNameField } from "@/components/ui/person-name-fields";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";
import { useStudent, useUpdateStudent } from "@/hooks/useStudentQueries";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

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

export default function EditStudent() {
    const navigate = useNavigate();
    const { id = "", projectId = "", centerId = "", semesterId = "" } = useParams();
    const studentQuery = useStudent(id);
    const updateStudent = useUpdateStudent();
    const [values, setValues] = useState<StudentFormValues>(emptyValues);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const studentsUrl = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/students`;

    useEffect(() => {
        const student = studentQuery.data;
        if (!student) return;
        setValues({
            firstName: student.firstName || "",
            middleName: student.middleName || "",
            lastName: student.lastName || "",
            profileImageUrl: student.profileImageUrl || "",
            dob: student.dob?.split("T")[0] || "",
            phoneNumber: student.phoneNumber || "",
            whatsappNumber: student.whatsappNumber || "",
            alternateNumber: student.alternateNumber || "",
            fatherName: student.fatherName || "",
            motherName: student.motherName || "",
            address: student.address || "",
            schoolName: student.schoolName || "",
            fatherOccupation: student.fatherOccupation || "",
            motherOccupation: student.motherOccupation || "",
            familyIncome: student.familyIncome || "",
            futureProfession: student.futureProfession || "",
        });
    }, [studentQuery.data]);

    const updateField = (field: keyof StudentFormValues, value: string) => {
        setValues((current) => ({ ...current, [field]: value }));
        if (errors[field]) setErrors((current) => ({ ...current, [field]: "" }));
    };

    const updateName = (field: PersonNameField, value: string) => updateField(field, value);

    const validate = () => {
        const nextErrors: Record<string, string> = {};
        if (!values.firstName?.trim()) nextErrors.firstName = "First name is required";
        for (const field of ["phoneNumber", "whatsappNumber", "alternateNumber"] as const) {
            const value = values[field];
            if (value && !/^\+\d{10,15}$/.test(value)) nextErrors[field] = "Enter a valid phone number";
        }
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!id || !validate()) return;

        await updateStudent.mutateAsync({
            id,
            firstName: values.firstName?.trim(),
            middleName: values.middleName?.trim() || null,
            lastName: values.lastName?.trim() || null,
            profileImageUrl: values.profileImageUrl || "",
            dob: values.dob || "",
            phoneNumber: values.phoneNumber || "",
            whatsappNumber: values.whatsappNumber || "",
            alternateNumber: values.alternateNumber || "",
            fatherName: values.fatherName || "",
            motherName: values.motherName || "",
            address: values.address || "",
            schoolName: values.schoolName || "",
            fatherOccupation: values.fatherOccupation || "",
            motherOccupation: values.motherOccupation || "",
            familyIncome: values.familyIncome || "",
            futureProfession: values.futureProfession || "",
        });
        navigate(studentsUrl);
    };

    if (studentQuery.isLoading) return <StudentFormSkeleton />;

    if (studentQuery.error || !studentQuery.data) {
        return (
            <div className="mx-auto flex min-h-[55dvh] w-full max-w-2xl items-center justify-center px-4" aria-live="polite">
                <div className="w-full rounded-lg border border-border bg-card p-6 text-center shadow-sm sm:p-8">
                    <RefreshCw className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
                    <h1 className="mt-4 text-2xl font-semibold text-foreground">Student could not be loaded</h1>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">The record may no longer exist, or the request could not be completed.</p>
                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link to={studentsUrl} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 gap-2")}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to students</Link>
                        <button type="button" onClick={() => void studentQuery.refetch()} className={cn(buttonVariants(), "min-h-11 gap-2")}><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <WorkspacePage className="space-y-8">
            <StudentFormLayout
                mode="edit"
                values={values}
                errors={errors}
                isPending={updateStudent.isPending}
                studentName={studentQuery.data.name}
                error={updateStudent.error instanceof Error ? updateStudent.error.message : undefined}
                onChange={updateField}
                onNameChange={updateName}
                onSubmit={handleSubmit}
                onCancel={() => navigate(studentsUrl)}
            />
            <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="enrollment-history-title">
                <h2 id="enrollment-history-title" className="sr-only">Enrollment history</h2>
                <EnrollmentManager studentId={id} studentName={studentQuery.data.name} />
            </section>
        </WorkspacePage>
    );
}

function StudentFormSkeleton() {
    return (
        <div className="mx-auto w-full max-w-6xl animate-pulse py-4 motion-reduce:animate-none" aria-live="polite" aria-busy="true">
            <div className="mb-8 space-y-3 border-b border-border pb-6"><div className="h-10 w-56 rounded bg-muted" /><div className="h-5 w-96 max-w-full rounded bg-muted" /></div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="space-y-5"><div className="h-72 rounded-lg border border-border bg-card" /><div className="h-64 rounded-lg border border-border bg-card" /></div><div className="h-80 rounded-lg border border-border bg-card" /></div>
            <span className="sr-only">Loading student</span>
        </div>
    );
}
