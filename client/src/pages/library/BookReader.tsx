import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, List, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { books, type Book } from '../../data/books';
import { cn } from '../../lib/utils';
import { Document, Page, pdfjs } from 'react-pdf';
import { fetchPDFWithCache } from '../../lib/pdf-storage';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BookReader: React.FC = () => {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    const [book, setBook] = useState<Book | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string>('');
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [isIndexOpen, setIsIndexOpen] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Record<number, HTMLDivElement>>({});
    const indexListRef = useRef<HTMLDivElement>(null);
    const activeItemRef = useRef<HTMLButtonElement>(null);

    // PDF offset from book data
    const PDF_OFFSET = book?.pdfOffset || 0;

    // Memoize PDF options to prevent unnecessary reloads
    const pdfOptions = useMemo(() => ({
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
        verbosity: 0,
        disableAutoFetch: false, // Allow fetching pages as needed
        disableStream: false, // Enable streaming for better performance
        useWorkerFetch: true, // Use worker for fetching
        isEvalSupported: false, // Disable eval for security
    }), []);

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
            // Load PDF from IndexedDB cache
            fetchPDFWithCache(foundBook.pdfUrl)
                .then((blobUrl) => {
                    setPdfUrl(blobUrl);
                })
                .catch((err) => {
                    console.error('[BookReader] Failed to load PDF:', err);
                    // Fallback to direct URL
                    setPdfUrl(foundBook.pdfUrl);
                });
        } else {
            navigate('/library');
        }

    }, [bookId, navigate]);

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (pdfUrl && pdfUrl.startsWith('blob:')) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        // Subtract the offset pages from total
        setNumPages(numPages - PDF_OFFSET);
    };

    const handleSectionClick = (pageStart: number) => {
        setCurrentPage(pageStart);
        setIsIndexOpen(false);

        // Scroll to the page
        setTimeout(() => {
            const pageElement = pageRefs.current[pageStart];
            if (pageElement) {
                pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
            handleSectionClick(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < numPages) {
            setCurrentPage(currentPage + 1);
            handleSectionClick(currentPage + 1);
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
                    onClick={() => navigate('/library')}
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
                    const scrollTop = e.currentTarget.scrollTop;
                    const pages = Object.entries(pageRefs.current);

                    for (let i = pages.length - 1; i >= 0; i--) {
                        const [pageNum, element] = pages[i];
                        if (element && element.offsetTop <= scrollTop + 200) {
                            setCurrentPage(Number(pageNum));
                            break;
                        }
                    }
                }}
            >
                <div className="flex flex-col items-center gap-6 pb-20 min-h-full px-2 sm:px-4">
                    {pdfUrl ? (
                        <Document
                            key={pdfUrl}
                            file={pdfUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            options={pdfOptions}
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
                            {Array.from(new Array(numPages), (_el, index) => {
                                const bookPageNum = index + 1;
                                const pdfPageNum = bookPageNum + PDF_OFFSET;
                                return (
                                    <div
                                        key={`page_${bookPageNum}`}
                                        ref={(el) => {
                                            if (el) pageRefs.current[bookPageNum] = el;
                                        }}
                                        className="bg-white shadow-lg rounded-lg overflow-hidden w-full max-w-[800px] mb-6"
                                    >
                                        <Page
                                            pageNumber={pdfPageNum}
                                            width={getPageWidth()}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                            renderMode="canvas"
                                            loading={null}
                                            className="w-full"
                                        />
                                    </div>
                                );
                            })}
                        </Document>
                    ) : (
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-gray-600">Loading book...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Navigation Bar */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between z-20 shrink-0">
                <button
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
                            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[75vh] flex flex-col"
                        >
                            {/* Sheet Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 rounded-t-2xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-6 bg-orange-600 rounded-full" />
                                    <h2 className="font-bold text-gray-900 text-lg">Table of Contents</h2>
                                </div>
                                <button
                                    onClick={() => setIsIndexOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Drag Handle */}
                            <div className="absolute top-2 left-1/2 -translate-x-1/2">
                                <div className="w-12 h-1 bg-gray-300 rounded-full" />
                            </div>

                            {/* Index List */}
                            <div ref={indexListRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                                {book.structure.map((item, index) => (
                                    <button
                                        key={item.id}
                                        ref={activeSection?.id === item.id ? activeItemRef : null}
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
                                                {item.pageStart}
                                            </span>
                                            {activeSection?.id === item.id && (
                                                <ChevronRight className="w-4 h-4 text-orange-600 animate-pulse" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BookReader;
