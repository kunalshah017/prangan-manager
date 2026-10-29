import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, List, X, ChevronRight, ChevronLeft, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { books, type Book, type BookStructureItem } from '../../data/books';
import {
    readLastReadPage,
    writeLastReadPage,
} from '../../lib/book-progress';
import { cn } from '../../lib/utils';
import { useSemester } from '@/hooks/useSemesterQueries';
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

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
// Sharp enough when zoomed, while keeping canvases within mobile memory limits.
const PAGE_PIXEL_RATIO = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2);

const clampZoom = (value: number) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));

const touchDistance = (touches: TouchList) =>
    Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
    );

const flattenBookStructure = (
    items: BookStructureItem[],
): BookStructureItem[] =>
    items.flatMap((item) => [
        item,
        ...flattenBookStructure(item.children ?? []),
    ]);

const matchesContentsSearch = (
    item: BookStructureItem,
    query: string,
): boolean =>
    item.title.toLowerCase().includes(query) ||
    Boolean(item.theme?.toLowerCase().includes(query));

const ContentsButton = ({
    item,
    label,
    active,
    nested = false,
    onClick,
    itemRef,
}: {
    item: BookStructureItem;
    label: React.ReactNode;
    active: boolean;
    nested?: boolean;
    onClick: () => void;
    itemRef?: React.Ref<HTMLButtonElement>;
}) => (
    <motion.button
        ref={itemRef}
        onClick={onClick}
        className={cn(
            "flex min-h-11 w-full items-start gap-3 rounded-lg px-4 py-3 text-left transition-all group",
            nested && "ml-4 w-[calc(100%-1rem)] border-l-2 border-orange-100",
            active
                ? "bg-primary/10 text-primary font-medium shadow-sm"
                : nested
                  ? "text-foreground hover:bg-accent/60"
                  : "bg-muted text-foreground hover:bg-muted",
        )}
    >
        <span
            className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                active
                    ? "bg-orange-200 text-orange-900"
                    : nested
                      ? "bg-card text-muted-foreground ring-1 ring-gray-200 group-hover:bg-primary/10"
                      : "bg-primary/10 text-primary",
            )}
        >
            {label}
        </span>
        <span className="min-w-0 flex-1">
            <span className={cn("block font-medium", !nested && "font-semibold")}>
                {item.title}
            </span>
            {item.theme && (
                <span className="mt-1 block text-xs text-muted-foreground">
                    {item.theme}
                </span>
            )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
            <span
                className={cn(
                    "rounded px-2 py-1 text-xs font-medium",
                    active
                        ? "bg-orange-200 text-orange-900"
                        : "bg-card text-muted-foreground ring-1 ring-gray-200",
                )}
            >
                Page: {item.pageStart}
            </span>
            {active && (
                <ChevronRight className="h-4 w-4 animate-pulse text-primary" />
            )}
        </span>
    </motion.button>
);

const BookReader: React.FC = () => {
    const { bookId, projectId, centerId, semesterId } = useParams<{
        bookId: string;
        projectId?: string;
        centerId?: string;
        semesterId?: string;
    }>();
    const navigate = useNavigate();
    const location = useLocation();
    // Opened from a semester: go back to that semester's library.
    const semesterDashboardHref = semesterId
        ? `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard`
        : null;
    const libraryHref = semesterDashboardHref
        ? `${semesterDashboardHref}/library`
        : `/library${location.search}`;
    const semesterQuery = useSemester(semesterId ?? '');
    const [book, setBook] = useState<Book | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [isIndexOpen, setIsIndexOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Record<number, HTMLDivElement>>({});
    const indexListRef = useRef<HTMLDivElement>(null);
    const activeItemRef = useRef<HTMLButtonElement>(null);
    const pendingInitialPageRef = useRef<number | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const zoomRef = useRef(1);
    // Scroll offset to apply once the pages have been laid out at a new zoom.
    const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);

    // PDF offset from book data
    const PDF_OFFSET = book?.pdfOffset || 0;

    // Page width at 100%: the viewer's width less padding, capped for desktop.
    const [baseWidth, setBaseWidth] = useState(0);
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const measure = () => {
            const containerWidth = container.clientWidth;
            const padding = containerWidth < 640 ? 16 : 32;
            setBaseWidth(Math.min(containerWidth - padding, 800));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(container);
        return () => observer.disconnect();
    }, [book]);

    // Zoom keeping the content point under (clientX, clientY) in place.
    const zoomAt = useCallback((nextZoom: number, clientX?: number, clientY?: number) => {
        const container = containerRef.current;
        const content = contentRef.current;
        const current = zoomRef.current;
        const target = clampZoom(nextZoom);
        if (!container || !content || target === current) return;

        const box = container.getBoundingClientRect();
        const focusX = (clientX ?? box.left + box.width / 2) - box.left;
        const focusY = (clientY ?? box.top + box.height / 2) - box.top;
        const ratio = target / current;
        pendingScrollRef.current = {
            left: (container.scrollLeft + focusX) * ratio - focusX,
            top: (container.scrollTop + focusY) * ratio - focusY,
        };
        zoomRef.current = target;
        setZoom(target);
    }, []);

    useLayoutEffect(() => {
        const container = containerRef.current;
        const pending = pendingScrollRef.current;
        if (!container || !pending) return;
        container.scrollLeft = pending.left;
        container.scrollTop = pending.top;
        pendingScrollRef.current = null;
    }, [zoom]);

    // Pinch on touch screens; ctrl + wheel covers trackpad pinch and Ctrl+scroll.
    useEffect(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return;

        let pinch: { distance: number; originX: number; originY: number; scale: number } | null = null;

        const onTouchStart = (event: TouchEvent) => {
            if (event.touches.length !== 2) return;
            const box = content.getBoundingClientRect();
            const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
            pinch = {
                distance: touchDistance(event.touches),
                originX: midX - box.left,
                originY: midY - box.top,
                scale: 1,
            };
            content.style.transformOrigin = `${pinch.originX}px ${pinch.originY}px`;
        };

        const onTouchMove = (event: TouchEvent) => {
            if (!pinch || event.touches.length !== 2) return;
            event.preventDefault();
            const target = clampZoom(zoomRef.current * (touchDistance(event.touches) / pinch.distance));
            pinch.scale = target / zoomRef.current;
            // Preview with a transform; the pages re-render sharply on release.
            content.style.transform = `scale(${pinch.scale})`;
        };

        const onTouchEnd = (event: TouchEvent) => {
            if (!pinch || event.touches.length > 1) return;
            const { scale, originX, originY } = pinch;
            pinch = null;
            content.style.transform = '';
            content.style.transformOrigin = '';
            const box = content.getBoundingClientRect();
            zoomAt(zoomRef.current * scale, box.left + originX, box.top + originY);
        };

        const onWheel = (event: WheelEvent) => {
            if (!event.ctrlKey) return;
            event.preventDefault();
            zoomAt(zoomRef.current * Math.exp(-event.deltaY / 200), event.clientX, event.clientY);
        };

        container.addEventListener('touchstart', onTouchStart, { passive: true });
        container.addEventListener('touchmove', onTouchMove, { passive: false });
        container.addEventListener('touchend', onTouchEnd);
        container.addEventListener('touchcancel', onTouchEnd);
        container.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            container.removeEventListener('touchstart', onTouchStart);
            container.removeEventListener('touchmove', onTouchMove);
            container.removeEventListener('touchend', onTouchEnd);
            container.removeEventListener('touchcancel', onTouchEnd);
            container.removeEventListener('wheel', onWheel);
        };
    }, [book, zoomAt]);

    useEffect(() => {
        const foundBook = books.find(b => b.id === bookId);
        if (foundBook) {
            pageRefs.current = {};
            setNumPages(0);
            setCurrentPage(1);
            zoomRef.current = 1;
            setZoom(1);
            pendingInitialPageRef.current = readLastReadPage(foundBook.id);
            setBook(foundBook);
        } else {
            navigate(libraryHref);
        }

    }, [bookId, libraryHref, navigate]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        // Subtract the offset pages from total
        const readablePages = Math.max(1, numPages - PDF_OFFSET);
        const restoredPage = Math.min(
            pendingInitialPageRef.current ?? 1,
            readablePages,
        );
        pendingInitialPageRef.current = restoredPage;
        setNumPages(readablePages);
        setCurrentPage(restoredPage);
    };

    useEffect(() => {
        const initialPage = pendingInitialPageRef.current;
        if (!numPages || initialPage === null) return;

        requestAnimationFrame(() => {
            pageRefs.current[initialPage]?.scrollIntoView({
                behavior: 'auto',
                block: 'start',
            });
            pendingInitialPageRef.current = null;
        });
    }, [currentPage, numPages]);

    useEffect(() => {
        if (book && numPages > 0) {
            writeLastReadPage(book.id, currentPage);
        }
    }, [book, currentPage, numPages]);

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

    const bookStructure = useMemo(
        () => flattenBookStructure(book?.structure ?? []),
        [book],
    );

    // Track which topic is currently active based on scroll position
    const getCurrentSection = useCallback(() => {
        if (!book) return null;

        for (let i = bookStructure.length - 1; i >= 0; i--) {
            if (currentPage >= bookStructure[i].pageStart) {
                return bookStructure[i];
            }
        }
        return bookStructure[0];
    }, [book, bookStructure, currentPage]);

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
        return book.structure.flatMap((item) => {
            if (matchesContentsSearch(item, query)) return [item];
            const children = item.children?.filter((child) =>
                matchesContentsSearch(child, query),
            );
            return children?.length ? [{ ...item, children }] : [];
        });
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

    const pageWidth = Math.round((baseWidth || 600) * zoom);

    return (
        <div className="flex flex-col h-screen bg-muted overflow-hidden">
            {/* Header */}
            <header className="bg-card border-b border-border px-3 py-2 flex items-center justify-between gap-2 z-20 shrink-0 sm:px-4">
                <Link
                    aria-label="Back to Library"
                    to={libraryHref}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="sr-only">{book.bookInfo.title}</h1>
                <nav
                    aria-label="Book breadcrumb"
                    className="flex min-w-0 flex-1 items-center justify-center gap-1.5 text-sm"
                >
                    {semesterDashboardHref && (
                        <>
                            <Link
                                to={semesterDashboardHref}
                                className="hidden max-w-[12rem] truncate font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline"
                            >
                                {semesterQuery.data?.name ?? 'Semester'}
                            </Link>
                            <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
                        </>
                    )}
                    <Link
                        to={libraryHref}
                        className="shrink-0 font-semibold text-primary hover:text-orange-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        Library
                    </Link>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span
                        aria-current="page"
                        className="min-w-0 truncate font-semibold text-foreground"
                        title={book.bookInfo.title}
                    >
                        {book.bookInfo.title}
                    </span>
                </nav>
                <div className="h-11 w-11 shrink-0" aria-hidden="true" />
            </header>

            {/* PDF Viewer Container */}
            <div
                ref={containerRef}
                className="relative flex-1 touch-pan-x touch-pan-y overflow-auto overscroll-contain bg-muted py-6"
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
                <div ref={contentRef} className="flex min-h-full w-max min-w-full flex-col items-center gap-6 px-2 pb-20 will-change-transform sm:px-4">
                    <Document
                            file={book.pdfUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            options={PDF_OPTIONS}
                            className="flex w-full flex-col items-center gap-6"
                            loading={
                                <div className="flex items-center justify-center min-h-[400px]">
                                    <div className="text-center">
                                        <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-muted-foreground">Loading book...</p>
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
                                        className="aspect-[581/782] shrink-0 overflow-hidden rounded-lg bg-card shadow-lg"
                                        style={{ width: pageWidth }}
                                    >
                                        {baseWidth > 0 && visiblePageNumbers.has(bookPageNum) && (
                                            <Page
                                                pageNumber={pdfPageNum}
                                                width={pageWidth}
                                                devicePixelRatio={PAGE_PIXEL_RATIO}
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
            <div className="bg-card border-t border-border px-4 py-3 flex items-center justify-between z-20 shrink-0">
                <button
                    aria-label="Previous page"
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1}
                    className={cn(
                        "p-2 rounded-lg transition-colors",
                        currentPage <= 1
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-foreground hover:bg-muted"
                    )}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center gap-1">
                    {activeSection && (
                        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                            {activeSection.title}
                        </span>
                    )}
                    <span className="text-sm text-muted-foreground">
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
                            : "text-foreground hover:bg-muted"
                    )}
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Zoom controls */}
            <div
                role="group"
                aria-label="Zoom"
                className="fixed bottom-20 left-4 z-30 flex items-center rounded-full border border-border bg-card shadow-lg sm:left-6"
            >
                <button
                    type="button"
                    aria-label="Zoom out"
                    onClick={() => zoomAt(zoomRef.current - ZOOM_STEP)}
                    disabled={zoom <= MIN_ZOOM}
                    className="flex h-12 w-12 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:text-muted-foreground/50"
                >
                    <ZoomOut className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    aria-label={zoom === 1 ? 'Zoom 100%' : `Zoom ${Math.round(zoom * 100)}%, reset to 100%`}
                    onClick={() => zoomAt(1)}
                    className="min-w-12 text-sm font-semibold tabular-nums text-foreground"
                >
                    {Math.round(zoom * 100)}%
                </button>
                <button
                    type="button"
                    aria-label="Zoom in"
                    onClick={() => zoomAt(zoomRef.current + ZOOM_STEP)}
                    disabled={zoom >= MAX_ZOOM}
                    className="flex h-12 w-12 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:text-muted-foreground/50"
                >
                    <ZoomIn className="h-5 w-5" aria-hidden="true" />
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
                            className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-2xl shadow-2xl h-[75vh] flex flex-col"
                        >
                            {/* Sheet Header */}
                            <div className="sticky top-0 bg-card border-b border-border px-4 py-4 rounded-t-2xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-6 bg-orange-600 rounded-full" />
                                    <h2 className="font-bold text-foreground text-lg">Table of Contents</h2>
                                </div>
                                <button
                                    aria-label="Close table of contents"
                                    onClick={() => setIsIndexOpen(false)}
                                    className="p-2 hover:bg-muted rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Search Bar */}
                            <div className="px-4 pt-3 pb-2 bg-card border-b border-border">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search topics..."
                                        className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
                                        >
                                            <X className="w-3 h-3 text-muted-foreground" />
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
                                            <p className="text-muted-foreground font-medium">No topics found</p>
                                            <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
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
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.03, duration: 0.2 }}
                                                    className="space-y-1"
                                                >
                                                    <ContentsButton
                                                        item={item}
                                                        label={index + 1}
                                                        active={activeSection?.id === item.id}
                                                        itemRef={activeSection?.id === item.id ? activeItemRef : undefined}
                                                        onClick={() => handleSectionClick(item.pageStart)}
                                                    />
                                                    {item.children?.map((topic, topicIndex) => (
                                                        <ContentsButton
                                                            key={topic.id}
                                                            item={topic}
                                                            label={topicIndex + 1}
                                                            active={activeSection?.id === topic.id}
                                                            nested
                                                            itemRef={activeSection?.id === topic.id ? activeItemRef : undefined}
                                                            onClick={() => handleSectionClick(topic.pageStart)}
                                                        />
                                                    ))}
                                                </motion.div>
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
