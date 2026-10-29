import React, { useState, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, ChevronRight, Filter } from 'lucide-react';
import { books } from '../../data/books';
import { useAuth } from '@/hooks/useAuth';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import DoodleBackground from '../../components/DoodleBackground';
import { motion } from 'framer-motion';
import { clearLegacyPdfCache } from '../../lib/pdf-storage';
import { filterBooksBySemesterLevels, getAvailableLibraryLevels, getDefaultLibraryLevel } from '../../lib/library';
import { useSemesterLevels } from '@/hooks/useAcademicLevelQueries';
import type { Book } from '../../data/books';
import { PageTitle } from "@/components/navigation/PageTitle";

const BookCover = ({ book }: { book: Book }) => {
    return (
        <div className="aspect-[323/438] w-24 shrink-0 overflow-hidden rounded-sm border border-border bg-card shadow-sm sm:w-32 md:w-40">
            <img
                src={book.coverUrl}
                alt={`${book.bookInfo.title} cover`}
                loading="lazy"
                decoding="async"
                width={323}
                height={438}
                className="h-full w-full object-contain"
            />
        </div>
    );
};

const Library: React.FC = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const params = useParams();
    const semesterId = params.semesterId || searchParams.get("semesterId") || "";
    const semesterLibraryHref = params.semesterId
        ? `/projects/${params.projectId}/centers/${params.centerId}/semesters/${params.semesterId}/dashboard/library`
        : null;
    const semesterLevelsQuery = useSemesterLevels(semesterId, {
        enabled: Boolean(semesterId),
    });

    React.useEffect(() => clearLegacyPdfCache(), []);

    const [selectedLevel, setSelectedLevel] = useState<string>(() => getDefaultLibraryLevel(user));
    const scopedBooks = useMemo(
        () =>
            semesterId
                ? filterBooksBySemesterLevels(books, semesterLevelsQuery.data || [])
                : books,
        [semesterId, semesterLevelsQuery.data],
    );

    React.useEffect(() => {
        if (
            semesterId &&
            semesterLevelsQuery.data &&
            selectedLevel !== 'All' &&
            !scopedBooks.some((book) => book.bookInfo.level === selectedLevel)
        ) {
            setSelectedLevel('All');
        }
    }, [scopedBooks, selectedLevel, semesterId, semesterLevelsQuery.data]);

    // Filter books by selected level
    const filteredBooks = useMemo(() => {
        if (selectedLevel === 'All') {
            return scopedBooks;
        }
        return scopedBooks.filter(book => book.bookInfo.level === selectedLevel);
    }, [scopedBooks, selectedLevel]);

    // Get unique levels from books
    const availableLevels = useMemo(
        () =>
            getAvailableLibraryLevels(
                scopedBooks,
                semesterId ? semesterLevelsQuery.data : undefined,
            ),
        [scopedBooks, semesterId, semesterLevelsQuery.data],
    );

    return (
        <div className="relative min-h-screen px-1">
            <DoodleBackground />
            <div className="relative z-10 max-w-5xl mx-auto">
                <header className="mb-4 sm:mb-8">
                    <PageTitle title="Library" />

                    {/* Level Filter */}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Filter className="w-4 h-4 text-primary" />
                            </div>
                            <label htmlFor="level-filter" className="text-sm font-medium text-foreground">
                                Filter by Level:
                            </label>
                        </div>
                        <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableLevels.map((level) => (
                                    <SelectItem key={level} value={level}>
                                        {level}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedLevel !== 'All' && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent rounded-full border border-primary/30">
                                <span className="text-xs font-medium text-primary">
                                    {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
                                </span>
                            </div>
                        )}
                    </div>
                </header>

                <div className="space-y-4">
                    {semesterId && semesterLevelsQuery.isLoading ? (
                        <div className="py-12 text-center text-muted-foreground">Loading semester library…</div>
                    ) : semesterId && semesterLevelsQuery.isError ? (
                        <div role="alert" className="py-12 text-center text-red-700">
                            This semester’s library could not be loaded.
                        </div>
                    ) : filteredBooks.length === 0 ? (
                        <div className="text-center py-12">
                            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-muted-foreground text-lg">No books found for {selectedLevel}</p>
                        </div>
                    ) : (
                        filteredBooks.map((book, index) => (
                            <motion.div
                                key={book.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                                <Link
                                    to={
                                        semesterLibraryHref
                                            ? `${semesterLibraryHref}/${book.id}`
                                            : {
                                                  pathname: `/library/${book.id}`,
                                                  search: semesterId ? `?semesterId=${encodeURIComponent(semesterId)}` : '',
                                              }
                                    }
                                    className="block bg-card rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-orange-100 group"
                                >
                                    <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
                                        {/* Book Cover/Preview */}
                                        <BookCover book={book} />

                                        {/* Book Info */}
                                        <div className="flex-1 flex flex-col justify-between min-w-0">
                                            <div>
                                                <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-0.5 sm:mb-1 group-hover:text-primary transition-colors line-clamp-2">
                                                    {book.bookInfo.title}
                                                </h2>
                                                <p className="text-xs sm:text-sm text-muted-foreground mb-1.5 sm:mb-2 line-clamp-1">{book.bookInfo.subtitle}</p>
                                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground mb-2 sm:mb-3">
                                                    <span className="bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium text-[10px] sm:text-xs">
                                                        {book.bookInfo.level}
                                                    </span>
                                                    <span className="hidden sm:inline">•</span>
                                                    <span className="text-[10px] sm:text-xs line-clamp-1">{book.bookInfo.author}</span>
                                                </div>
                                                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                                                    {book.structure.length} sections • {book.grammarTopics.length} topics
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between mt-2 sm:mt-4">
                                                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-primary font-medium group-hover:text-primary transition-colors">
                                                    <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    <span>Read Book</span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Library;
