import { Navigate, Link, useParams } from "react-router-dom";
import { Pencil } from "lucide-react";

import { DetailList, UserProfileView } from "@/components/users/UserProfileView";
import { ErrorState, ListPageSkeleton } from "@/components/workspace/PageState";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUserQueries";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { formatCalendarDate, formatMoment } from "@/lib/dates";

// The admin's view of a user: the same page everyone sees as their profile,
// read-only, with editing handed to Edit user. Bank details arrive masked.
const UserDetails = () => {
    const { userId = "" } = useParams<{ userId: string }>();
    const { user: currentUser } = useAuth();
    const isOwnRecord = currentUser?.id === userId;
    const { data: user, isLoading, error, refetch } = useUser(userId, { enabled: !isOwnRecord });

    // Nobody has two versions of their own page.
    if (isOwnRecord) return <Navigate to="/profile" replace />;

    if (isLoading) {
        return <WorkspacePage><ListPageSkeleton label="Loading user" rows={4} /></WorkspacePage>;
    }
    if (error || !user) {
        return (
            <WorkspacePage>
                <ErrorState
                    title="User could not be loaded"
                    description="The account may no longer exist, or the request could not be completed."
                    onRetry={() => void refetch()}
                    backHref="/users"
                    backLabel="Back to users"
                />
            </WorkspacePage>
        );
    }

    const bank = user.bankSummary;
    const about = (
        <DetailList items={[
            { label: "Phone", value: user.phone || "Not added" },
            { label: "Qualification", value: user.qualification || "Not added" },
            { label: "Date of birth", value: user.dob ? formatCalendarDate(user.dob) : "Not added" },
            { label: "Member since", value: formatMoment(user.createdAt, { dateStyle: "medium" }) },
            { label: "Address", value: user.address || "Not added", wide: true },
        ]} />
    );
    const payments = (
        <div className="space-y-2">
            <DetailList items={[
                { label: "Account number", value: bank?.accountLast4 ? `•••• ${bank.accountLast4}` : "Not added" },
                { label: "IFSC", value: bank?.bankIfsc || "Not added" },
                { label: "Bank", value: bank?.bankName || "Not added" },
                { label: "UPI ID", value: bank?.hasUpi ? "Added" : "Not added" },
            ]} />
            <p className="text-sm text-muted-foreground">Full details are shown only where payments are made.</p>
        </div>
    );

    return (
        <UserProfileView
            user={user}
            isSelf={false}
            title={user.name}
            about={about}
            payments={payments}
            headerAction={
                <Link
                    to={`/users/${user.id}/edit`}
                    className={cn(buttonVariants({ variant: "outline" }), "min-h-11 shrink-0 gap-2")}
                >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Edit user</span>
                    <span className="sm:hidden">Edit</span>
                </Link>
            }
        />
    );
};

export default UserDetails;
