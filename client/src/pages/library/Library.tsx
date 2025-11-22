import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import { Document, Page, pdfjs } from 'react-pdf';
import { fetchPDFWithCache } from '../../lib/pdf-storage';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const Library: React.FC = () => {
    const { user } = useAuth();

    // Determine default level based on user role
    const getDefaultLevel = () => {
        // Find educator role assignment with a level
        const educatorAssignment = user?.roleAssignments?.find(
            (assignment) => assignment.isActive && assignment.subRole === 'EDUCATOR' && assignment.level
        );

        if (educatorAssignment?.level) {
            // Convert LEVEL_1 to "Level 1" format
            const levelNum = educatorAssignment.level.replace('LEVEL_', '');
            return `Level ${levelNum}`;
        }

        return 'All';
    };

    const [selectedLevel, setSelectedLevel] = useState<string>(getDefaultLevel());
    const [loadedCovers, setLoadedCovers] = useState<Record<string, boolean>>({});
    const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({});
    const pdfUrlsRef = useRef<Record<string, string>>({});

    // Memoize PDF options to prevent unnecessary reloads
    const pdfOptions = useMemo(
        () => ({
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
            cMapPacked: true,
            disableStream: false,
        }),
        []
    );

    // Load all PDFs from IndexedDB cache on component mount
    useEffect(() => {
        const loadAllPdfs = async () => {
            const urls: Record<string, string> = {};

            // Fetch all PDFs in parallel
            await Promise.all(
                books.map(async (book) => {
                    try {
                        const blobUrl = await fetchPDFWithCache(book.pdfUrl);
                        urls[book.id] = blobUrl;
                    } catch (err) {
                        console.error(`[Library] Failed to load PDF for ${book.id}:`, err);
                    }
                })
            );

            setPdfUrls(urls);
            pdfUrlsRef.current = urls;
        };

        loadAllPdfs();
    }, []); // Only run once on mount

    // Separate effect for cleanup on unmount
    useEffect(() => {
        return () => {
            // Clean up blob URLs only on component unmount
            Object.values(pdfUrlsRef.current).forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, []); // Only runs on unmount

    const handleLoadSuccess = (bookId: string) => {
        setLoadedCovers(prev => ({ ...prev, [bookId]: true }));
    };

    // Filter books by selected level
    const filteredBooks = useMemo(() => {
        if (selectedLevel === 'All') {
            return books;
        }
        return books.filter(book => book.bookInfo.level === selectedLevel);
    }, [selectedLevel]);

    // Reset loaded covers when filter changes
    useEffect(() => {
        setLoadedCovers({});
    }, [selectedLevel]);

    // Get unique levels from books
    const availableLevels = useMemo(() => {
        const levels = Array.from(new Set(books.map(book => book.bookInfo.level)));
        return ['All', ...levels.sort()];
    }, []);

    return (
        <div className="relative min-h-screen bg-orange-50/50 px-1">
            <DoodleBackground />
            <div className="relative z-10 max-w-5xl mx-auto">
                <header className="mb-4 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
                        Library
                    </h1>
                    <p className="text-gray-600 mt-2 text-sm sm:text-base">
                        Explore our collection of educational resources and books.
                    </p>

                    {/* Level Filter */}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Filter className="w-4 h-4 text-orange-600" />
                            </div>
                            <label htmlFor="level-filter" className="text-sm font-medium text-gray-900">
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
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-full border border-orange-200">
                                <span className="text-xs font-medium text-orange-700">
                                    {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
                                </span>
                            </div>
                        )}
                    </div>
                </header>

                <div className="space-y-4">
                    {filteredBooks.length === 0 ? (
                        <div className="text-center py-12">
                            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No books found for {selectedLevel}</p>
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
                                    to={`/library/${book.id}`}
                                    className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-orange-100 group"
                                >
                                    <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
                                        {/* Book Cover/Preview */}
                                        <div
                                            className="w-24 sm:w-32 md:w-40 h-32 sm:h-44 md:h-52 bg-gray-100 rounded-sm overflow-hidden flex-shrink-0 relative shadow-sm"
                                        >
                                            {pdfUrls[book.id] ? (
                                                <Document
                                                    key={`${book.id}-${pdfUrls[book.id]}`}
                                                    file={pdfUrls[book.id]}
                                                    loading={
                                                        <div className="w-full h-full flex items-center justify-center bg-orange-50">
                                                            <BookOpen className="w-8 sm:w-12 h-8 sm:h-12 text-orange-300 animate-pulse" />
                                                        </div>
                                                    }
                                                    error={
                                                        <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-300">
                                                            <BookOpen className="w-8 sm:w-12 h-8 sm:h-12" />
                                                        </div>
                                                    }
                                                    onLoadSuccess={() => handleLoadSuccess(book.id)}
                                                    options={pdfOptions}
                                                >
                                                    <Page
                                                        key={`page-${book.id}`}
                                                        pageNumber={1}
                                                        width={96}
                                                        height={128}
                                                        renderTextLayer={false}
                                                        renderAnnotationLayer={false}
                                                        className="w-full h-full"
                                                        loading={
                                                            <div className="w-full h-full flex items-center justify-center bg-orange-50">
                                                                <BookOpen className="w-8 sm:w-12 h-8 sm:h-12 text-orange-200 animate-pulse" />
                                                            </div>
                                                        }
                                                    />
                                                </Document>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-orange-50">
                                                    <BookOpen className="w-8 sm:w-12 h-8 sm:h-12 text-orange-300 animate-pulse" />
                                                </div>
                                            )}
                                            {!loadedCovers[book.id] && pdfUrls[book.id] && (
                                                <div className="absolute inset-0 bg-gradient-to-t from-orange-50 to-transparent" />
                                            )}
                                        </div>

                                        {/* Book Info */}
                                        <div className="flex-1 flex flex-col justify-between min-w-0">
                                            <div>
                                                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-0.5 sm:mb-1 group-hover:text-orange-600 transition-colors line-clamp-2">
                                                    {book.bookInfo.title}
                                                </h2>
                                                <p className="text-xs sm:text-sm text-gray-500 mb-1.5 sm:mb-2 line-clamp-1">{book.bookInfo.subtitle}</p>
                                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-600 mb-2 sm:mb-3">
                                                    <span className="bg-orange-100 text-orange-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium text-[10px] sm:text-xs">
                                                        {book.bookInfo.level}
                                                    </span>
                                                    <span className="hidden sm:inline">•</span>
                                                    <span className="text-[10px] sm:text-xs line-clamp-1">{book.bookInfo.author}</span>
                                                </div>
                                                <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-1">
                                                    {book.structure.length} sections • {book.grammarTopics.length} topics
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between mt-2 sm:mt-4">
                                                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-orange-600 font-medium group-hover:text-orange-700 transition-colors">
                                                    <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    <span>Read Book</span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
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
