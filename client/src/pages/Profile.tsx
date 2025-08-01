import React from 'react';
import { motion } from 'framer-motion';
import { User, Phone, MapPin, GraduationCap, Calendar, Badge, Building, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProject } from '@/hooks/useProjectQueries';
import { useCenter } from '@/hooks/useCenterQueries';
import { useSemester } from '@/hooks/useSemesterQueries';
import { ProfilePicture } from '@/components/ui';
import LoadingButterfly from '@/components/LoadingButterfly';
import DoodleBackground from '@/components/DoodleBackground';
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

const Profile: React.FC = () => {
    const { user, isLoading } = useAuth();

    // Component to display role assignment with fetched names
    const RoleAssignmentCard: React.FC<{ assignment: NonNullable<NonNullable<typeof user>['roleAssignments']>[0]; index: number }> = ({ assignment, index }) => {
        const { data: project } = useProject(assignment.projectId || '');
        const { data: center } = useCenter(assignment.centerId || '');
        const { data: semester } = useSemester(assignment.semesterId || '');

        return (
            <motion.div
                key={assignment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
                className={cn(
                    "p-3 sm:p-4 md:p-6 rounded-lg border-2 transition-all duration-200",
                    assignment.isActive
                        ? "bg-green-50 border-green-200 shadow-sm"
                        : "bg-gray-50 border-gray-200 opacity-60"
                )}
            >
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200 w-fit">
                            <Building className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            {getSubRoleDisplay(assignment.subRole)}
                        </span>
                        <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium w-fit",
                            assignment.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                        )}>
                            {assignment.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                        {assignment.level && (
                            <div className="flex flex-col sm:flex-row">
                                <span className="font-medium text-gray-900 sm:w-32">Level:</span>
                                <span className="text-gray-600">{getLevelDisplay(assignment.level)}</span>
                            </div>
                        )}
                        {assignment.committedDays && (
                            <div className="flex flex-col sm:flex-row">
                                <span className="font-medium text-gray-900 sm:w-32">Days:</span>
                                <span className="text-gray-600">
                                    {assignment.committedDays === 'BOTH' ? 'Sat & Sun' : assignment.committedDays}
                                </span>
                            </div>
                        )}
                        {project && (
                            <div className="flex flex-col sm:flex-row">
                                <span className="font-medium text-gray-900 sm:w-32">Project:</span>
                                <span className="text-gray-600">{project.name}</span>
                            </div>
                        )}
                        {center && (
                            <div className="flex flex-col sm:flex-row">
                                <span className="font-medium text-gray-900 sm:w-32">Center:</span>
                                <span className="text-gray-600">{center.name}</span>
                            </div>
                        )}
                        {semester && (
                            <div className="flex flex-col sm:flex-row">
                                <span className="font-medium text-gray-900 sm:w-32">Semester:</span>
                                <span className="text-gray-600">{semester.name}</span>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-[100dvh] w-full bg-background overflow-hidden relative flex items-center justify-center">
                <DoodleBackground numElements={10} />
                <div className="relative z-10">
                    <LoadingButterfly size="md" />
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">No User Data</h2>
                    <p className="text-gray-600">Unable to load user profile information.</p>
                </div>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'REJECTED':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'USER':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getSubRoleDisplay = (subRole: string) => {
        return subRole.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };

    const getLevelDisplay = (level?: string) => {
        if (!level) return '';
        if (level.startsWith('LEVEL_')) {
            return `Level ${level.replace('LEVEL_', '')}`;
        }
        return level.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-orange-50 to-amber-50 py-4 sm:py-6 md:py-8">
            <DoodleBackground numElements={8} />

            <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
                {/* Breadcrumb Navigation */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-4 sm:mb-6"
                >
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/projects" className="text-xs sm:text-sm">Projects</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-xs sm:text-sm">Profile</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/50 overflow-hidden"
                >
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12 text-white">
                        <div className="flex flex-col items-center space-y-4">
                            <ProfilePicture
                                imageUrl={user.profileImageUrl}
                                name={user.name}
                                size="lg"
                                className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 text-lg sm:text-xl md:text-2xl border-4 border-white/30"
                            />
                            <div className="text-center w-full">
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">{user.name}</h1>
                                <p className="text-orange-100 text-sm sm:text-base md:text-lg mb-4 break-all">{user.email}</p>
                                <div className="flex flex-col items-center space-y-2">
                                    <span className={cn("inline-flex items-center px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-medium border", getRoleColor(user.role))}>
                                        <Badge className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                        {user.role}
                                    </span>
                                    <span className={cn("inline-flex items-center px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-medium border", getStatusColor(user.status))}>
                                        {user.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                        {/* Personal Information */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                                <User className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-orange-600" />
                                Personal Information
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                                {user.phone && (
                                    <div className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                                        <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs sm:text-sm font-medium text-gray-900">Phone</p>
                                            <p className="text-xs sm:text-sm text-gray-600 break-all">{user.phone}</p>
                                        </div>
                                    </div>
                                )}
                                {user.qualification && (
                                    <div className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                                        <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs sm:text-sm font-medium text-gray-900">Qualification</p>
                                            <p className="text-xs sm:text-sm text-gray-600">{user.qualification}</p>
                                        </div>
                                    </div>
                                )}
                                {user.dob && (
                                    <div className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs sm:text-sm font-medium text-gray-900">Date of Birth</p>
                                            <p className="text-xs sm:text-sm text-gray-600">{formatDate(user.dob)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {user.address && (
                                <div className="mt-4 sm:mt-6 flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-xs sm:text-sm font-medium text-gray-900">Address</p>
                                        <p className="text-xs sm:text-sm text-gray-600">{user.address}</p>
                                    </div>
                                </div>
                            )}
                        </motion.section>

                        {/* Role Assignments */}
                        {user.roleAssignments && user.roleAssignments.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                                    <Users className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-orange-600" />
                                    Role Assignments
                                </h2>
                                <div className="space-y-3 sm:space-y-4">
                                    {user.roleAssignments.map((assignment, index) => (
                                        <RoleAssignmentCard
                                            key={assignment.id}
                                            assignment={assignment}
                                            index={index}
                                        />
                                    ))}
                                </div>
                            </motion.section>
                        )}

                        {/* Account Information */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-orange-600" />
                                Account Information
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                                <div className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-xs sm:text-sm font-medium text-gray-900">Member Since</p>
                                        <p className="text-xs sm:text-sm text-gray-600">{formatDate(user.createdAt)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-xs sm:text-sm font-medium text-gray-900">Last Updated</p>
                                        <p className="text-xs sm:text-sm text-gray-600">{formatDate(user.updatedAt)}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.section>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Profile;
