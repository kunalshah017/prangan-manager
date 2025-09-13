import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Users as UsersIcon, UserCheck, Crown, User as UserIcon, MapPin, Calendar, GraduationCap, Edit, Eye } from 'lucide-react';
import { useUsers } from '@/hooks/useUserQueries';
import LoadingButterfly from '@/components/LoadingButterfly';
import { ProfilePicture } from '@/components/ui';
import type { User } from '@/types/api';

const Users = () => {
    const navigate = useNavigate();
    const { data: users, isLoading, error } = useUsers();
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');
    const [centerFilter, setCenterFilter] = useState<string>('ALL');
    const [semesterFilter, setSemesterFilter] = useState<string>('ALL');

    // Define role order for sorting (Admin first, then User)
    const roleOrder = ['ADMIN', 'USER'];

    // Filter and sort users (only show approved users)
    const filteredUsers = users?.filter(user => {
        // Only show approved users
        if (user.status !== 'APPROVED') return false;

        const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;

        // Filter by center assignment
        const matchesCenter = centerFilter === 'ALL' ||
            user.roleAssignments?.some(assignment =>
                assignment.isActive && assignment.centerId === centerFilter
            );

        // Filter by semester assignment
        const matchesSemester = semesterFilter === 'ALL' ||
            user.roleAssignments?.some(assignment =>
                assignment.isActive && assignment.semesterId === semesterFilter
            );

        return matchesSearch && matchesRole && matchesCenter && matchesSemester;
    }).sort((a, b) => {
        // First sort by role (Admin first)
        const aRoleIndex = roleOrder.indexOf(a.role);
        const bRoleIndex = roleOrder.indexOf(b.role);
        if (aRoleIndex !== bRoleIndex) {
            return aRoleIndex - bRoleIndex;
        }

        // Then sort by name alphabetically
        return a.name.localeCompare(b.name);
    }) || [];

    const getStatusBadge = () => {
        // Since we only show approved users, we can simplify this
        return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                <UserCheck className="w-3 h-3 mr-1" />
                APPROVED
            </span>
        );
    };

    const getRoleBadge = (role: string) => {
        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${role === 'ADMIN'
                ? 'bg-purple-100 text-purple-800 border-purple-200'
                : 'bg-blue-100 text-blue-800 border-blue-200'
                }`}>
                {role === 'ADMIN' && <Crown className="w-3 h-3 mr-1" />}
                {role === 'USER' && <UserIcon className="w-3 h-3 mr-1" />}
                {role}
            </span>
        );
    };

    const formatRoleAssignments = (roleAssignments?: User['roleAssignments']) => {
        if (!roleAssignments || roleAssignments.length === 0) {
            return <span className="text-gray-500 text-xs sm:text-sm">No assignments</span>;
        }

        const activeAssignments = roleAssignments.filter(assignment => assignment.isActive);

        if (activeAssignments.length === 0) {
            return <span className="text-gray-500 text-xs sm:text-sm">No active assignments</span>;
        }

        return (
            <div className="space-y-2">
                {activeAssignments.slice(0, 2).map((assignment) => (
                    <div key={assignment.id} className="text-xs sm:text-sm text-gray-600 p-2 bg-orange-50 rounded-md border border-orange-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <span className="font-medium text-gray-800">{assignment.subRole.replace(/_/g, ' ')}</span>
                            {assignment.level && (
                                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium self-start sm:self-auto">
                                    {assignment.level.replace(/_/g, ' ')}
                                </span>
                            )}
                        </div>
                        {assignment.committedDays && (
                            <div className="flex items-center mt-1 text-xs text-gray-600">
                                <Calendar className="w-3 h-3 mr-1" />
                                <span>{assignment.committedDays}</span>
                            </div>
                        )}
                    </div>
                ))}
                {activeAssignments.length > 2 && (
                    <div className="text-xs text-gray-500 mt-1 font-medium">
                        +{activeAssignments.length - 2} more assignment{activeAssignments.length - 2 > 1 ? 's' : ''}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <LoadingButterfly size="md" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">Failed to load users. Please try again.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
                    <p className="text-gray-600">Manage system users and their assignments</p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <UsersIcon className="w-4 h-4" />
                    <span>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-base sm:text-sm"
                    />
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="flex flex-col space-y-2">
                        <label className="text-sm font-medium text-gray-700">Role:</label>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="ALL">All Roles</option>
                            <option value="ADMIN">Admin</option>
                            <option value="USER">User</option>
                        </select>
                    </div>

                    <div className="flex flex-col space-y-2">
                        <label className="text-sm font-medium text-gray-700">Center:</label>
                        <select
                            value={centerFilter}
                            onChange={(e) => setCenterFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="ALL">All Centers</option>
                            {/* Center options will be populated dynamically */}
                        </select>
                    </div>

                    <div className="flex flex-col space-y-2">
                        <label className="text-sm font-medium text-gray-700">Semester:</label>
                        <select
                            value={semesterFilter}
                            onChange={(e) => setSemesterFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="ALL">All Semesters</option>
                            {/* Semester options will be populated dynamically */}
                        </select>
                    </div>

                    <div className="flex flex-col justify-end">
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setRoleFilter('ALL');
                                setCenterFilter('ALL');
                                setSemesterFilter('ALL');
                            }}
                            className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Results Info */}
                {(searchQuery || roleFilter !== 'ALL' || centerFilter !== 'ALL' || semesterFilter !== 'ALL') && (
                    <div className="text-sm text-gray-600 border-t pt-3">
                        Showing <span className="font-medium">{filteredUsers.length}</span> user{filteredUsers.length !== 1 ? 's' : ''}
                        {searchQuery && <span className="block sm:inline"> matching "<span className="font-medium">{searchQuery}</span>"</span>}
                        {roleFilter !== 'ALL' && <span className="block sm:inline"> with role <span className="font-medium">{roleFilter}</span></span>}
                        {centerFilter !== 'ALL' && <span className="block sm:inline"> in selected center</span>}
                        {semesterFilter !== 'ALL' && <span className="block sm:inline"> in selected semester</span>}
                    </div>
                )}
            </div>

            {/* Users Grid */}
            {filteredUsers.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredUsers.map((user, index) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="p-4">
                                {/* Header with Profile and Status */}
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 space-y-3 sm:space-y-0">
                                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                                        <ProfilePicture
                                            imageUrl={user.profileImageUrl}
                                            name={user.name}
                                            size="w-12 h-12 sm:w-14 sm:h-14"
                                            colorScheme="orange"
                                            className="border-2 border-orange-100 flex-shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">
                                                {user.name}
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-600 truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-1 flex-shrink-0">
                                        {getStatusBadge()}
                                        {getRoleBadge(user.role)}
                                    </div>
                                </div>

                                {/* Contact Info */}
                                {user.phone && (
                                    <div className="flex items-center text-xs sm:text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded-md">
                                        <span className="font-medium mr-2">Phone:</span>
                                        <span className="break-all">{user.phone}</span>
                                    </div>
                                )}

                                {/* Role Assignments */}
                                <div className="mb-4">
                                    <div className="flex items-center mb-2">
                                        <GraduationCap className="w-4 h-4 mr-1 text-gray-400" />
                                        <span className="text-xs sm:text-sm font-medium text-gray-700">Assignments:</span>
                                    </div>
                                    <div className="pl-5">
                                        {formatRoleAssignments(user.roleAssignments)}
                                    </div>
                                </div>

                                {/* Additional Info */}
                                <div className="text-xs sm:text-sm text-gray-500 space-y-2 border-t pt-3">
                                    {user.qualification && (
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="font-medium text-gray-700 mb-1 sm:mb-0 sm:mr-2 min-w-0">Qualification:</span>
                                            <span className="text-gray-900 break-words">{user.qualification}</span>
                                        </div>
                                    )}
                                    {user.address && (
                                        <div className="flex flex-col sm:flex-row sm:items-start">
                                            <div className="flex items-center mb-1 sm:mb-0 sm:mr-2 flex-shrink-0">
                                                <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                                                <span className="font-medium text-gray-700">Address:</span>
                                            </div>
                                            <span className="text-gray-900 break-words leading-relaxed">{user.address}</span>
                                        </div>
                                    )}
                                    <div className="flex flex-col sm:flex-row sm:items-center">
                                        <span className="font-medium text-gray-700 mb-1 sm:mb-0 sm:mr-2">Joined:</span>
                                        <span className="text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="border-t pt-3 mt-3 space-y-2">
                                    <button
                                        onClick={() => navigate(`/users/${user.id}/details`)}
                                        className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Details
                                    </button>
                                    <button
                                        onClick={() => navigate(`/users/${user.id}/edit`)}
                                        className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors"
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit User
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    {searchQuery || roleFilter !== 'ALL' || centerFilter !== 'ALL' || semesterFilter !== 'ALL' ? (
                        <>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                            <p className="text-gray-600 mb-4">
                                No approved users match your search criteria. Try adjusting your filters.
                            </p>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setRoleFilter('ALL');
                                    setCenterFilter('ALL');
                                    setSemesterFilter('ALL');
                                }}
                                className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                            >
                                Clear Filters
                            </button>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No approved users found</h3>
                            <p className="text-gray-600">No approved users are currently in the system.</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default Users;