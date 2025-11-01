import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { Plus, Edit, User, Calendar, Phone, GraduationCap, MessageCircle, Search, AlertCircle } from 'lucide-react';
import { useStudentsBySemester } from '@/hooks/useStudentQueries';
import LoadingButterfly from '@/components/LoadingButterfly';
import { CustomButton } from '@/components/ui/custom-button';
import { ProfilePicture } from '@/components/ui';
import ProtectedComponent from '@/components/ProtectedComponent';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import type { Student } from '@/types/api';

type TabType = 'active' | 'pending';

const Students = () => {
    const { projectId, centerId, semesterId } = useParams();
    const { data: students, isLoading, error } = useStudentsBySemester(semesterId!);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeTab, setActiveTab] = useState<TabType>('active');

    // Build the base URL for student routes
    const baseStudentUrl = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/students`;

    // Categorize students - identify those with pending details
    const pendingStudents = useMemo(() => {
        // Helper function to check if a field is pending/empty
        const isPendingField = (value: string | undefined | null): boolean => {
            return !value || value.trim() === '';
        };

        // Helper function to get pending details for a student
        const getPendingDetails = (student: Student): string[] => {
            const pending: string[] = [];

            if (isPendingField(student.profileImageUrl)) pending.push('Profile Image');
            if (isPendingField(student.dob)) pending.push('Date of Birth');
            if (isPendingField(student.phoneNumber)) pending.push('Phone Number');
            if (isPendingField(student.address)) pending.push('Address');
            if (isPendingField(student.schoolName)) pending.push('School Name');
            if (isPendingField(student.fatherName)) pending.push('Father Name');
            if (isPendingField(student.motherName)) pending.push('Mother Name');
            if (isPendingField(student.fatherOccupation)) pending.push('Father Occupation');
            if (isPendingField(student.motherOccupation)) pending.push('Mother Occupation');
            if (isPendingField(student.familyIncome)) pending.push('Family Income');
            if (isPendingField(student.futureProfession)) pending.push('Future Profession');

            return pending;
        };

        if (!students) return [];

        // Only return students with pending details
        return students.filter(student => {
            const pendingDetails = getPendingDetails(student);
            return pendingDetails.length > 0;
        });
    }, [students]);

    // Apply search filter and sorting based on active tab
    const filteredStudents = useMemo(() => {
        const levelOrder = ['PRIMARY_A', 'PRIMARY_B', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'];
        const studentsToFilter = activeTab === 'active' ? (students || []) : pendingStudents;

        return studentsToFilter
            .filter((student: Student) =>
                student.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a: Student, b: Student) => {
                // First sort by level order
                const aLevelIndex = levelOrder.indexOf(a.level || '');
                const bLevelIndex = levelOrder.indexOf(b.level || '');

                // If levels are different, sort by level order
                if (aLevelIndex !== bLevelIndex) {
                    // Handle cases where level is not in our predefined order (put them at the end)
                    if (aLevelIndex === -1) return 1;
                    if (bLevelIndex === -1) return -1;
                    return aLevelIndex - bLevelIndex;
                }

                // If levels are the same, sort by name alphabetically
                return a.name.localeCompare(b.name);
            });
    }, [activeTab, students, pendingStudents, searchQuery]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getLevelDisplay = (level: string) => {
        const levelMap: Record<string, string> = {
            'LEVEL_1': 'Level 1',
            'LEVEL_2': 'Level 2',
            'LEVEL_3': 'Level 3',
            'LEVEL_4': 'Level 4',
            'PRIMARY_A': 'Primary A',
            'PRIMARY_B': 'Primary B'
        };
        return levelMap[level] || level;
    };

    const handlePhoneCall = (phoneNumber: string) => {
        window.open(`tel:${phoneNumber}`, '_self');
    };

    const handleWhatsApp = (phoneNumber: string) => {
        // Format phone number for WhatsApp (remove spaces, dashes, etc.)
        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
        // Add country code if not present (assuming India +91)
        const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+91${cleanNumber}`;
        window.open(`https://wa.me/${formattedNumber.replace('+', '')}`, '_blank');
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
                <p className="text-red-700">Failed to load students. Please try again.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Students</h1>
                    <p className="text-gray-600">Manage student information and records</p>
                </div>
                <ProtectedComponent allowedSubRoles={['CENTER_MANAGER']} >
                    <Link to={`${baseStudentUrl}/new`}>
                        <CustomButton className="bg-orange-600 hover:bg-orange-700 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Student
                        </CustomButton>
                    </Link>
                </ProtectedComponent>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'active'
                            ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        All Students
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                            {students?.length || 0}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'pending'
                            ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        Pending Details
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
                            {pendingStudents.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search students by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    />
                </div>
                {searchQuery && (
                    <div className="mt-2 text-sm text-gray-600">
                        Found {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                        {filteredStudents.length > 0 && ` matching "${searchQuery}"`}
                    </div>
                )}
            </div>

            {/* Students Grid or Pending Details List */}
            {filteredStudents.length > 0 ? (
                activeTab === 'pending' ? (
                    // Pending Details View - Compact List
                    <div className="space-y-3">
                        {filteredStudents.map((student: Student, index: number) => {
                            const getPendingDetailsForStudent = (s: Student): string[] => {
                                const pending: string[] = [];
                                const isPending = (value: string | undefined | null) => !value || value.trim() === '';

                                if (isPending(s.profileImageUrl)) pending.push('Profile Image');
                                if (isPending(s.dob)) pending.push('DOB');
                                if (isPending(s.phoneNumber)) pending.push('Phone');
                                if (isPending(s.address)) pending.push('Address');
                                if (isPending(s.schoolName)) pending.push('School');
                                if (isPending(s.fatherName)) pending.push('Father Name');
                                if (isPending(s.motherName)) pending.push('Mother Name');
                                if (isPending(s.fatherOccupation)) pending.push('Father Occ.');
                                if (isPending(s.motherOccupation)) pending.push('Mother Occ.');
                                if (isPending(s.familyIncome)) pending.push('Family Income');
                                if (isPending(s.futureProfession)) pending.push('Future Profession');

                                return pending;
                            };

                            const pendingDetails = getPendingDetailsForStudent(student);

                            return (
                                <motion.div
                                    key={student.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                    className="bg-white rounded-lg border border-orange-200 p-4 hover:shadow-md transition-shadow"
                                >
                                    {/* Mobile Layout */}
                                    <div className="flex flex-col gap-4 md:hidden">
                                        {/* Student Info */}
                                        <div className="flex items-center gap-3">
                                            <ProfilePicture
                                                imageUrl={student.profileImageUrl}
                                                name={student.name}
                                                size="w-12 h-12"
                                                colorScheme="orange"
                                                className="border-2 border-orange-100 flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-base font-medium text-gray-900 truncate">
                                                    {student.name}
                                                </h3>
                                                {student.level && (
                                                    <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                                        <GraduationCap className="w-3 h-3 mr-1" />
                                                        {getLevelDisplay(student.level)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Pending Details */}
                                        <div className="flex flex-wrap gap-1">
                                            {pendingDetails.map((detail, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded"
                                                >
                                                    <AlertCircle className="w-3 h-3 mr-1" />
                                                    {detail}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Edit Button */}
                                        <ProtectedComponent allowedSubRoles={['CENTER_MANAGER']}>
                                            <Link
                                                to={`${baseStudentUrl}/${student.id}/edit`}
                                            >
                                                <CustomButton
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                                                >
                                                    <Edit className="w-4 h-4 mr-1" />
                                                    Edit Student Details
                                                </CustomButton>
                                            </Link>
                                        </ProtectedComponent>
                                    </div>

                                    {/* Desktop Layout */}
                                    <div className="hidden md:flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <ProfilePicture
                                                imageUrl={student.profileImageUrl}
                                                name={student.name}
                                                size="w-12 h-12"
                                                colorScheme="orange"
                                                className="border-2 border-orange-100 flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-base font-medium text-gray-900 truncate">
                                                    {student.name}
                                                </h3>
                                                {student.level && (
                                                    <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                                        <GraduationCap className="w-3 h-3 mr-1" />
                                                        {getLevelDisplay(student.level)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-wrap gap-1 max-w-md">
                                                {pendingDetails.map((detail, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded"
                                                    >
                                                        <AlertCircle className="w-3 h-3 mr-1" />
                                                        {detail}
                                                    </span>
                                                ))}
                                            </div>

                                            <ProtectedComponent allowedSubRoles={['CENTER_MANAGER']}>
                                                <Link
                                                    to={`${baseStudentUrl}/${student.id}/edit`}
                                                    className="flex-shrink-0"
                                                >
                                                    <CustomButton
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                                                    >
                                                        <Edit className="w-3 h-3 mr-1" />
                                                        Edit
                                                    </CustomButton>
                                                </Link>
                                            </ProtectedComponent>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    // Active Students View - Card Grid
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredStudents.map((student, index) => (
                            <motion.div
                                key={student.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="p-6">
                                    {/* Profile Image and Name */}
                                    <div className="flex items-start space-x-4 mb-4">
                                        <ProfilePicture
                                            imageUrl={student.profileImageUrl}
                                            name={student.name}
                                            size="w-16 h-16"
                                            colorScheme="orange"
                                            className="border-2 border-orange-100"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-medium text-gray-900 truncate">
                                                {student.name}
                                            </h3>
                                            {student.futureProfession && (
                                                <div className="text-sm font-semibold text-orange-600 mt-0.5">
                                                    Future: {student.futureProfession}
                                                </div>
                                            )}
                                            <div className="flex items-center mt-1">
                                                <GraduationCap className="w-4 h-4 text-gray-400 mr-1" />
                                                <span className="text-sm text-gray-600">
                                                    {student.level ? getLevelDisplay(student.level) : 'No Level Assigned'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Student Details */}
                                    <div className="space-y-2 mb-4">
                                        {student.dob && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Calendar className="w-4 h-4 mr-2" />
                                                <span>Born: {formatDate(student.dob)}</span>
                                            </div>
                                        )}
                                        {/* Phone Numbers */}
                                        {(student.phoneNumber || student.whatsappNumber || student.alternateNumber) && (
                                            <div className="space-y-2">
                                                {student.phoneNumber && (
                                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                                        <div className="flex items-center">
                                                            <Phone className="w-4 h-4 mr-2" />
                                                            <span>Phone: {student.phoneNumber}</span>
                                                        </div>
                                                        <div className="flex space-x-1">
                                                            <button
                                                                onClick={() => student.phoneNumber && handlePhoneCall(student.phoneNumber)}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                                title="Call this number"
                                                            >
                                                                <Phone className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => student.phoneNumber && handleWhatsApp(student.phoneNumber)}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                                title="WhatsApp this number"
                                                            >
                                                                <WhatsAppIcon size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                {student.whatsappNumber && (
                                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                                        <div className="flex items-center">
                                                            <MessageCircle className="w-4 h-4 mr-2" />
                                                            <span>WhatsApp: {student.whatsappNumber}</span>
                                                        </div>
                                                        <div className="flex space-x-1">
                                                            <button
                                                                onClick={() => student.whatsappNumber && handlePhoneCall(student.whatsappNumber)}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                                title="Call this number"
                                                            >
                                                                <Phone className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => student.whatsappNumber && handleWhatsApp(student.whatsappNumber)}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                                title="WhatsApp this number"
                                                            >
                                                                <WhatsAppIcon size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                {student.alternateNumber && (
                                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                                        <div className="flex items-center">
                                                            <Phone className="w-4 h-4 mr-2" />
                                                            <span>Alt: {student.alternateNumber}</span>
                                                        </div>
                                                        <div className="flex space-x-1">
                                                            <button
                                                                onClick={() => student.alternateNumber && handlePhoneCall(student.alternateNumber)}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                                title="Call this number"
                                                            >
                                                                <Phone className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => student.alternateNumber && handleWhatsApp(student.alternateNumber)}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                                title="WhatsApp this number"
                                                            >
                                                                <WhatsAppIcon size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {student.schoolName && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <GraduationCap className="w-4 h-4 mr-2" />
                                                <span>School: {student.schoolName}</span>
                                            </div>
                                        )}
                                        {(student.fatherName || student.motherName) && (
                                            <div className="text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <User className="w-4 h-4 mr-2" />
                                                    <span>Family:</span>
                                                </div>
                                                <div className="ml-6 space-y-1">
                                                    {student.fatherName && (
                                                        <div>Father: {student.fatherName}</div>
                                                    )}
                                                    {student.motherName && (
                                                        <div>Mother: {student.motherName}</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex space-x-2 pt-4 border-t border-gray-100">
                                        <ProtectedComponent allowedSubRoles={['CENTER_MANAGER']}>
                                            <Link
                                                to={`${baseStudentUrl}/${student.id}/edit`}
                                                className="flex-1"
                                            >
                                                <CustomButton
                                                    variant="outline"
                                                    className="w-full text-sm"
                                                >
                                                    <Edit className="w-4 h-4 mr-1" />
                                                    Edit Student
                                                </CustomButton>
                                            </Link>
                                        </ProtectedComponent>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )
            ) : (
                <div className="text-center py-12">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    {searchQuery ? (
                        <>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                            <p className="text-gray-600 mb-4">
                                No students match your search for "{searchQuery}". Try a different search term.
                            </p>
                            <CustomButton
                                variant="outline"
                                onClick={() => setSearchQuery('')}
                                className="mb-4"
                            >
                                Clear Search
                            </CustomButton>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                            <p className="text-gray-600 mb-4">Get started by adding your first student.</p>
                        </>
                    )}
                    <ProtectedComponent allowedSubRoles={['CENTER_MANAGER']}>
                        <Link to={`${baseStudentUrl}/new`}>
                            <CustomButton className="bg-orange-600 hover:bg-orange-700 text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Student
                            </CustomButton>
                        </Link>
                    </ProtectedComponent>
                </div>
            )}
        </div>
    );
};

export default Students;
