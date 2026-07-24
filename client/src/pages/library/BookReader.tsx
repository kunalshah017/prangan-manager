import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, List, X, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { books, type Book } from '../../data/books';
import { cn } from '../../lib/utils';
import { Document, Page, pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const PAGE_WINDOW_RADIUS = 2;
const PDF_OPTIONS = {
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    verbosity: 0,
    disableAutoFetch: false,
    disableStream: false,
    useWorkerFetch: true,
    isEvalSupported: false,
};

const BookReader: React.FC = () => {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    const [book, setBook] = useState<Book | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [isIndexOpen, setIsIndexOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Record<number, HTMLDivElement>>({});
    const indexListRef = useRef<HTMLDivElement>(null);
    const activeItemRef = useRef<HTMLButtonElement>(null);

    // PDF offset from book data
    const PDF_OFFSET = book?.pdfOffset || 0;

    // Calculate viewport width for responsive scaling
    const getPageWidth = useCallback(() => {
        if (!containerRef.current) return 600; // Default fallback
        const containerWidth = containerRef.current.clientWidth;
        const padding = containerWidth < 640 ? 16 : 32; // Mobile vs Desktop padding
        return Math.min(containerWidth - padding, 800); // Cap at 800px for desktop
    }, []);

    useEffect(() => {
        const foundBook = books.find(b => b.id === bookId);
        if (foundBook) {
            setBook(foundBook);
        } else {
            navigate('/library');
        }

    }, [bookId, navigate]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        // Subtract the offset pages from total
        setNumPages(numPages - PDF_OFFSET);
    };

    const jumpToPage = useCallback((pageNumber: number) => {
        const boundedPage = Math.min(Math.max(pageNumber, 1), numPages);
        setCurrentPage(boundedPage);

        requestAnimationFrame(() => {
            pageRefs.current[boundedPage]?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });
    }, [numPages]);

    const handleSectionClick = (pageStart: number) => {
        jumpToPage(pageStart);
        setIsIndexOpen(false);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            jumpToPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < numPages) {
            jumpToPage(currentPage + 1);
        }
    };

    // Track which section is currently active based on scroll position
    const getCurrentSection = useCallback(() => {
        if (!book) return null;

        // Find the section that matches current page
        for (let i = book.structure.length - 1; i >= 0; i--) {
            if (currentPage >= book.structure[i].pageStart) {
                return book.structure[i];
            }
        }
        return book.structure[0];
    }, [book, currentPage]);

    const activeSection = getCurrentSection();

    const allPageNumbers = useMemo(
        () => Array.from({ length: numPages }, (_, index) => index + 1),
        [numPages],
    );

    const visiblePageNumbers = useMemo(() => {
        const start = Math.max(1, currentPage - PAGE_WINDOW_RADIUS);
        const end = Math.min(numPages, currentPage + PAGE_WINDOW_RADIUS);
        return new Set(
            Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index),
        );
    }, [currentPage, numPages]);

    // Filter structure based on search query
    const filteredStructure = useMemo(() => {
        if (!book) return [];
        if (!searchQuery.trim()) return book.structure;

        const query = searchQuery.toLowerCase();
        return book.structure.filter(item =>
            item.title.toLowerCase().includes(query) ||
            (item.theme && item.theme.toLowerCase().includes(query))
        );
    }, [book, searchQuery]);

    // Reset search when index closes
    useEffect(() => {
        if (!isIndexOpen) {
            setSearchQuery('');
        }
    }, [isIndexOpen]);

    // Scroll to active item when index opens
    useEffect(() => {
        if (isIndexOpen && activeItemRef.current) {
            // Small delay to ensure the sheet is fully rendered
            setTimeout(() => {
                activeItemRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }, 100);
        }
    }, [isIndexOpen]);

    if (!book) return null;

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-20 shrink-0">
                <button
                    aria-label="Back to Library"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate('/library', { replace: true });
                    }}
                    className="p-2 hover:bg-orange-100 rounded-full text-orange-700 transition-colors -ml-2"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="font-bold text-gray-800 truncate mx-4 text-sm sm:text-base flex-1 text-center">
                    {book.bookInfo.title}
                </h1>
                <div className="w-9" /> {/* Spacer for centering */}
            </header>

            {/* PDF Viewer Container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto bg-gray-200 py-6 relative"
                onScroll={(e) => {
                    // Update current page based on scroll position
                    const viewerTop = e.currentTarget.getBoundingClientRect().top;
                    const readingLine = viewerTop + Math.min(240, e.currentTarget.clientHeight * 0.35);
                    let nearestPage = currentPage;
                    let nearestDistance = Number.POSITIVE_INFINITY;

                    for (const [pageNum, element] of Object.entries(pageRefs.current)) {
                        if (!element?.isConnected) continue;
                        const rect = element.getBoundingClientRect();
                        if (rect.top <= readingLine && rect.bottom > readingLine) {
                            nearestPage = Number(pageNum);
                            break;
                        }
                        const distance = Math.abs(rect.top - readingLine);
                        if (distance < nearestDistance) {
                            nearestDistance = distance;
                            nearestPage = Number(pageNum);
                        }
                    }

                    if (nearestPage !== currentPage) setCurrentPage(nearestPage);
                }}
            >
                <div className="flex flex-col items-center gap-6 pb-20 min-h-full px-2 sm:px-4">
                    <Document
                            file={book.pdfUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            options={PDF_OPTIONS}
                            className="flex w-full flex-col items-center gap-6"
                            loading={
                                <div className="flex items-center justify-center min-h-[400px]">
                                    <div className="text-center">
                                        <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-gray-600">Loading book...</p>
                                    </div>
                                </div>
                            }
                            error={
                                <div className="flex items-center justify-center min-h-[400px]">
                                    <div className="text-center">
                                        <p className="text-red-600">Failed to load PDF</p>
                                    </div>
                                </div>
                            }
                        >
                            {allPageNumbers.map((bookPageNum) => {
                                const pdfPageNum = bookPageNum + PDF_OFFSET;
                                return (
                                    <div
                                        key={`page_${bookPageNum}`}
                                        ref={(el) => {
                                            if (el) pageRefs.current[bookPageNum] = el;
                                            else delete pageRefs.current[bookPageNum];
                                        }}
                                        data-book-page={bookPageNum}
                                        className="aspect-[581/782] w-full max-w-[800px] overflow-hidden rounded-lg bg-white shadow-lg"
                                    >
                                        {visiblePageNumbers.has(bookPageNum) && (
                                            <Page
                                                pageNumber={pdfPageNum}
                                                width={getPageWidth()}
                                                renderTextLayer={false}
                                                renderAnnotationLayer={false}
                                                renderMode="canvas"
                                                loading={null}
                                                className="w-full"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </Document>
                </div>
            </div>

            {/* Bottom Navigation Bar */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between z-20 shrink-0">
                <button
                    aria-label="Previous page"
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1}
                    className={cn(
                        "p-2 rounded-lg transition-colors",
                        currentPage <= 1
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-700 hover:bg-gray-100"
                    )}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center gap-1">
                    {activeSection && (
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">
                            {activeSection.title}
                        </span>
                    )}
                    <span className="text-sm text-gray-600">
                        Page {currentPage} of {numPages}
                    </span>
                </div>

                <button
                    aria-label="Next page"
                    onClick={handleNextPage}
                    disabled={currentPage >= numPages}
                    className={cn(
                        "p-2 rounded-lg transition-colors",
                        currentPage >= numPages
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-700 hover:bg-gray-100"
                    )}
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Floating Index Button */}
            <button
                aria-label="Open table of contents"
                onClick={() => setIsIndexOpen(true)}
                className="fixed bottom-20 right-4 sm:right-6 bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-full shadow-lg transition-all z-30 flex items-center gap-2"
            >
                <List className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">Index</span>
            </button>

            {/* Bottom Sheet Index */}
            <AnimatePresence>
                {isIndexOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/50 z-40"
                            onClick={() => setIsIndexOpen(false)}
                        />

                        {/* Bottom Sheet */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl h-[75vh] flex flex-col"
                        >
                            {/* Sheet Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 rounded-t-2xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-6 bg-orange-600 rounded-full" />
                                    <h2 className="font-bold text-gray-900 text-lg">Table of Contents</h2>
                                </div>
                                <button
                                    aria-label="Close table of contents"
                                    onClick={() => setIsIndexOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Search Bar */}
                            <div className="px-4 pt-3 pb-2 bg-white border-b border-gray-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search topics..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                        >
                                            <X className="w-3 h-3 text-gray-500" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Drag Handle */}
                            <div className="absolute top-2 left-1/2 -translate-x-1/2">
                                <div className="w-12 h-1 bg-gray-300 rounded-full" />
                            </div>

                            {/* Index List */}
                            <div ref={indexListRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                                <AnimatePresence mode="wait">
                                    {filteredStructure.length === 0 ? (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex flex-col items-center justify-center py-12 text-center"
                                        >
                                            <Search className="w-12 h-12 text-gray-300 mb-3" />
                                            <p className="text-gray-500 font-medium">No topics found</p>
                                            <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="results"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-2"
                                        >
                                            {filteredStructure.map((item, index) => (
                                                <motion.button
                                                    key={item.id}
                                                    ref={activeSection?.id === item.id ? activeItemRef : null}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.03, duration: 0.2 }}
                                                    onClick={() => handleSectionClick(item.pageStart)}
                                                    className={cn(
                                                        "w-full text-left px-4 py-3 rounded-lg transition-all flex items-start gap-3 group",
                                                        activeSection?.id === item.id
                                                            ? "bg-orange-100 text-orange-800 font-medium shadow-sm"
                                                            : "text-gray-700 hover:bg-gray-50"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-xs shrink-0 font-semibold",
                                                            activeSection?.id === item.id
                                                                ? "bg-orange-200 text-orange-900"
                                                                : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                                                        )}
                                                    >
                                                        {index + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="block font-medium">{item.title}</span>
                                                        {item.theme && (
                                                            <span className="text-xs text-gray-500 block mt-1">
                                                                {item.theme}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span
                                                            className={cn(
                                                                "text-xs font-medium px-2 py-1 rounded",
                                                                activeSection?.id === item.id
                                                                    ? "bg-orange-200 text-orange-900"
                                                                    : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                                                            )}
                                                        >
                                                            Page: {' '}
                                                            {item.pageStart}
                                                        </span>
                                                        {activeSection?.id === item.id && (
                                                            <ChevronRight className="w-4 h-4 text-orange-600 animate-pulse" />
                                                        )}
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BookReader;
