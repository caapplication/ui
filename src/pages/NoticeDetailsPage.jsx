import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Paperclip, MoreVertical, FileText, UserPlus, X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RefreshCcw, Share2, Trash2, CheckCircle, XCircle, AlertCircle, Loader2, ImageIcon, Clock, MessageSquare, Maximize2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import { Badge } from '@/components/ui/badge';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import imageCompression from 'browser-image-compression';

import { getNotice, getNoticeComments, addNoticeComment, requestNoticeClosure, approveNoticeClosure, rejectNoticeClosure, addNoticeCollaborator, removeNoticeCollaborator, markNoticeCommentAsRead, getNoticeCommentReadReceipts, deleteNotice } from '@/lib/api/notices';
import { getNoticeAttachment } from '@/lib/api';
import { listAllClientUsers } from '@/lib/api/organisation';
import { useAuth } from '@/hooks/useAuth';
import { useFinanceSocket } from '@/contexts/FinanceSocketContext';
import { useToast } from '@/components/ui/use-toast';

const NoticeDetailsPage = () => {
    const { noticeId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const token = user?.access_token;
    const { toast } = useToast();
    const { socket, joinNoticeRoom, leaveNoticeRoom } = useFinanceSocket();

    const [notice, setNotice] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isAttachmentLoading, setIsAttachmentLoading] = useState(true);
    const [isFetchingAttachment, setIsFetchingAttachment] = useState(false);

    // Collaboration
    const [isCollaborateOpen, setIsCollaborateOpen] = useState(false);
    const [clientUsers, setClientUsers] = useState([]);
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Zoom for preview
    const [zoom, setZoom] = useState(1);

    // Secure Attachment
    const [attachmentUrl, setAttachmentUrl] = useState(null);
    const [attachmentContentType, setAttachmentContentType] = useState(null);

    // Workflow Modals
    const [isRequestCloseOpen, setIsRequestCloseOpen] = useState(false);
    const [isRejectCloseOpen, setIsRejectCloseOpen] = useState(false);
    const [closureReason, setClosureReason] = useState('');
    const [previewAttachment, setPreviewAttachment] = useState(null); // { url, name, type }
    const [isProcessingAction, setIsProcessingAction] = useState(false);

    const [loadingImages, setLoadingImages] = useState(new Set());
    const [readReceipts, setReadReceipts] = useState({}); // { commentId: [{ user_id, user_name, read_at }] }
    const [isLoadingReadReceipts, setIsLoadingReadReceipts] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    // PDF Preview States
    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);
    const pdfBlobUrlRef = useRef(null);
    const canvasRef = useRef(null);

    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        } else if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    };

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    // Socket.io Real-time updates
    useEffect(() => {
        if (noticeId) {
            joinNoticeRoom(noticeId);
        }
        return () => {
            if (noticeId) leaveNoticeRoom(noticeId);
        };
    }, [noticeId]);

    useEffect(() => {
        if (!socket) return;

        const handleNewComment = (newComment) => {
            console.log("Socket: New comment received", newComment);
            setMessages(prev => {
                if (prev.some(m => m.id === newComment.id)) return prev;
                return [...prev, newComment];
            });
        };

        socket.on('new_comment', handleNewComment);

        return () => {
            socket.off('new_comment', handleNewComment);
        };
    }, [socket]);

    useEffect(() => {
        fetchData();

        // Polling for updates (optional but good for read receipts)
        const interval = setInterval(() => {
            if (noticeId) {
                // Refresh comments periodically to get new read receipts
                refreshComments();
            }
        }, 10000); // 10 seconds

        return () => clearInterval(interval);
    }, [noticeId]);

    // Handle PDF preview - fetch and render using PDF.js
    useEffect(() => {
        const loadPdf = async () => {
            if (!previewAttachment) {
                // Clean up
                if (pdfBlobUrlRef.current) {
                    URL.revokeObjectURL(pdfBlobUrlRef.current);
                    pdfBlobUrlRef.current = null;
                }
                setPdfBlobUrl(null);
                setPdfDoc(null);
                setCurrentPage(1);
                setTotalPages(0);
                return;
            }

            // Try to load as PDF if it's explicitly PDF or if it's NOT an image and not known to be something else
            // This handles cases where extension is lost or missing
            const isImage = previewAttachment.type?.startsWith('image') ||
                previewAttachment.name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ||
                previewAttachment.url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i);

            if (!isImage) {
                setIsLoadingPdf(true);
                try {
                    // Clean up previous blob URL if exists
                    if (pdfBlobUrlRef.current) {
                        URL.revokeObjectURL(pdfBlobUrlRef.current);
                    }

                    // Fetch PDF as blob
                    const response = await fetch(previewAttachment.url, {
                        method: 'GET',
                    });

                    if (!response.ok) {
                        throw new Error('Failed to fetch PDF');
                    }

                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    pdfBlobUrlRef.current = blobUrl;
                    setPdfBlobUrl(blobUrl);

                    // Load PDF with PDF.js (lighter options for faster first paint)
                    const loadingTask = pdfjsLib.getDocument({
                        url: blobUrl,
                        verbosity: 0,
                    });
                    const pdf = await loadingTask.promise;
                    setPdfDoc(pdf);
                    setTotalPages(pdf.numPages);
                    setCurrentPage(1);

                    // Render first page will be handled by the useEffect below
                } catch (error) {
                    console.error('Error loading PDF:', error);
                    toast({
                        title: 'Error loading PDF',
                        description: 'Could not load the PDF. Please try downloading it instead.',
                        variant: 'destructive',
                    });
                } finally {
                    setIsLoadingPdf(false);
                }
            }
        };

        loadPdf();

        // Cleanup function
        return () => {
            if (pdfBlobUrlRef.current) {
                URL.revokeObjectURL(pdfBlobUrlRef.current);
                pdfBlobUrlRef.current = null;
            }
        };
    }, [previewAttachment, toast]);

    // Render PDF page
    const renderPage = useCallback(async (pdf, pageNum) => {
        if (!pdf || !canvasRef.current) return;

        try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.2 });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;
        } catch (error) {
            console.error('Error rendering PDF page:', error);
        }
    }, []);

    // Handle page change
    useEffect(() => {
        if (pdfDoc && currentPage) {
            renderPage(pdfDoc, currentPage);
        }
    }, [pdfDoc, currentPage, renderPage]);

    const refreshComments = async () => {
        try {
            const commentsData = await getNoticeComments(noticeId, token);
            setMessages(Array.isArray(commentsData) ? commentsData : []);
        } catch (error) {
            console.error("Failed to refresh comments", error);
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        setAttachmentUrl(null);
        setIsAttachmentLoading(true);
        setIsFetchingAttachment(false);

        try {
            // Priority 1: Fetch basic notice details
            const noticeData = await getNotice(noticeId, token);
            setNotice(noticeData);

            // Parallel Process 1: Fetch comments (independent of attachment)
            fetchComments();

            // Parallel Process 2: Fetch secure attachment (independent of comments)
            if (noticeData.id) {
                fetchAttachment(noticeData.id);
            }

            // End primary loading state once notice metadata is available
            // This allows the layout and chat container anchor to render
            setIsLoading(false);

        } catch (error) {
            console.error("Failed to fetch notice details", error);
            toast({ title: "Error", description: "Failed to load notice details", variant: "destructive" });
            setIsLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const commentsData = await getNoticeComments(noticeId, token);
            setMessages(Array.isArray(commentsData) ? commentsData : []);
        } catch (error) {
            console.error("Failed to fetch comments", error);
        }
    };

    const fetchAttachment = async (id) => {
        setIsFetchingAttachment(true);
        try {
            const result = await getNoticeAttachment(id, token);
            setAttachmentUrl(result.url);
            setAttachmentContentType(result.contentType);
        } catch (e) {
            console.error("Failed to load secure attachment", e);
        } finally {
            setIsFetchingAttachment(false);
        }
    };

    const handleFetchReadReceipts = async (commentId) => {
        if (readReceipts[commentId] || isLoadingReadReceipts) return;

        try {
            const receipts = await getNoticeCommentReadReceipts(noticeId, commentId, token);
            setReadReceipts(prev => ({
                ...prev,
                [commentId]: receipts
            }));
        } catch (error) {
            console.error("Failed to fetch read receipts", error);
        }
    };

    // Hydrate receipts from comments when messages load
    useEffect(() => {
        if (messages.length > 0) {
            setReadReceipts(prev => {
                const next = { ...prev };
                let changed = false;
                messages.forEach(c => {
                    const receipts = c.read_receipts;
                    if (receipts && Array.isArray(receipts) && !next[c.id]) {
                        next[c.id] = receipts;
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }
    }, [messages]);

    // Intersection Observer for Mark as Read
    useEffect(() => {
        if (!user?.id || messages.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(async (entry) => {
                    if (entry.isIntersecting) {
                        const commentId = entry.target.getAttribute('data-comment-id');
                        const comment = messages.find(m => m.id === commentId);

                        // Mark as read if not ours and not already read by us
                        if (comment && String(comment.user_id) !== String(user.id)) {
                            const alreadyReadByMe = (comment.read_receipts || []).some(
                                r => String(r.user_id) === String(user.id)
                            ) || (readReceipts[commentId] || []).some(
                                r => String(r.user_id) === String(user.id)
                            );

                            if (!alreadyReadByMe) {
                                try {
                                    await markNoticeCommentAsRead(noticeId, commentId, token);
                                    // Optionally refresh to get updated receipts
                                    handleFetchReadReceipts(commentId);
                                } catch (error) {
                                    console.error("Failed to mark comment as read", error);
                                }
                            }
                        }
                    }
                });
            },
            { threshold: 0.5, root: chatContainerRef.current }
        );

        const messageElements = document.querySelectorAll('[data-comment-id]');
        messageElements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [messages, user?.id, noticeId, readReceipts]);

    const groupMessagesByDate = (msgs) => {
        const groups = {};
        msgs.forEach(msg => {
            const dateStr = format(new Date(msg.created_at), 'yyyy-MM-dd');
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(msg);
        });
        return groups;
    };

    const formatDateHeader = (dateStr) => {
        const date = new Date(dateStr);
        if (format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) return 'Today';
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) return 'Yesterday';
        return format(date, 'd MMMM yyyy');
    };


    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedFile) return;

        setIsSending(true);
        try {
            let fileToSend = selectedFile;

            // Image Compression
            if (fileToSend && fileToSend.type.startsWith('image/')) {
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true
                };
                try {
                    fileToSend = await imageCompression(fileToSend, options);
                } catch (error) {
                    console.error("Image compression failed:", error);
                }
            }

            // Backend requires 'message' field not to be empty/null
            const messageToSend = newMessage.trim() || " ";

            await addNoticeComment(noticeId, messageToSend, fileToSend, token);
            setNewMessage('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Refresh comments
            const commentsData = await getNoticeComments(noticeId, token);
            setMessages(Array.isArray(commentsData) ? commentsData : []);
        } catch (error) {
            console.error("Failed to send message", error);
            toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };

    const handleAction = async (action) => {
        setIsProcessingAction(true);
        try {
            if (action === 'request_close') {
                await requestNoticeClosure(noticeId, closureReason, token);
                toast({ title: "Success", description: "Closure requested successfully" });
                setIsRequestCloseOpen(false);
            } else if (action === 'approve_close') {
                await approveNoticeClosure(noticeId, token);
                toast({ title: "Success", description: "Notice closed successfully" });
            } else if (action === 'reject_close') {
                await rejectNoticeClosure(noticeId, closureReason, token);
                toast({ title: "Success", description: "Closure request rejected" });
                setIsRejectCloseOpen(false);
            }

            setClosureReason('');
            fetchData(); // Refresh state
        } catch (error) {
            console.error(`Failed to ${action}`, error);
            toast({ title: "Error", description: `Failed to ${action.replace('_', ' ')}`, variant: "destructive" });
        } finally {
            setIsProcessingAction(false);
        }
    }

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this notice? This action cannot be undone.")) return;
        setIsProcessingAction(true);
        try {
            await deleteNotice(noticeId, token);
            toast({ title: "Success", description: "Notice deleted successfully" });
            navigate('/notices');
        } catch (error) {
            console.error("Failed to delete notice", error);
            toast({ title: "Error", description: "Failed to delete notice", variant: "destructive" });
        } finally {
            setIsProcessingAction(false);
        }
    };



    const getUserNameColor = (userId) => {
        if (!userId) return 'text-gray-300';
        const colors = [
            'text-red-400',
            'text-blue-400',
            'text-green-400',
            'text-yellow-400',
            'text-purple-400',
            'text-pink-400',
            'text-cyan-400',
            'text-orange-400',
        ];
        const idStr = String(userId);
        const hash = idStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };


    if (isLoading && !notice) {
        return (
            <div className="h-full flex flex-col text-white bg-transparent p-3 sm:p-4 md:p-6 pb-24 md:pb-24">
                {/* Header Skeleton */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-white/10 mb-3 sm:mb-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-48 bg-white/10" />
                            <Skeleton className="h-4 w-32 bg-white/10" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-32 rounded bg-white/10" />
                    </div>
                </header>

                <div className="flex-1 flex gap-4 overflow-hidden">
                    {/* Left Panel Skeleton */}
                    <div className="flex-1 rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col items-center justify-center">
                        <Skeleton className="h-full w-full bg-white/5 rounded-lg" />
                    </div>

                    {/* Right Panel Skeleton */}
                    <div className="w-[400px] hidden md:flex flex-col rounded-lg border border-white/10 bg-black/10">
                        <div className="p-4 border-b border-white/10">
                            <Skeleton className="h-6 w-32 bg-white/10" />
                        </div>
                        <div className="flex-1 p-4 space-y-4">
                            <Skeleton className="h-16 w-full rounded bg-white/5" />
                            <Skeleton className="h-16 w-3/4 rounded bg-white/5 self-end" />
                            <Skeleton className="h-16 w-full rounded bg-white/5" />
                        </div>
                        <div className="p-4 border-t border-white/10">
                            <Skeleton className="h-10 w-full rounded-full bg-white/10" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    if (!isLoading && !notice) return <div className="p-8 text-center text-white">Notice not found</div>;

    const canRequestClose = user?.role === 'CA_ACCOUNTANT' &&
        (notice.status === 'pending' || notice.status === 'rejected');

    const canReviewClose = user?.role === 'CLIENT_MASTER_ADMIN' && notice.status === 'closure_requested';

    return (
        <div className="h-full flex flex-col text-white bg-transparent p-3 sm:p-4 md:p-6 pb-24 md:pb-24">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-white/10 mb-3 sm:mb-4">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/notices')} className="h-9 w-9 sm:h-10 sm:w-10 text-gray-300 hover:text-white hover:bg-white/10">
                        <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                            {notice.title}
                            <Badge variant={
                                notice.status === 'pending' ? 'destructive' :
                                    notice.status === 'closure_requested' ? 'warning' :
                                        notice.status === 'closed' ? 'success' : 'secondary'
                            } className="ml-2 text-xs capitalize">
                                {notice.status.replace('_', ' ')}
                            </Badge>
                        </h1>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center gap-2">
                    {/* Collaborators List */}
                    {notice.collaborators && notice.collaborators.length > 0 && (
                        <div className="flex items-center gap-2 mr-2 border-r border-white/10 pr-4">
                            <span className="text-xs text-gray-400 hidden lg:inline">Collaborated with:</span>
                            <div className="flex -space-x-2">
                                <TooltipProvider>
                                    {notice.collaborators.slice(0, 3).map((collab) => (
                                        <Tooltip key={collab.id}>
                                            <TooltipTrigger asChild>
                                                <Avatar className="w-8 h-8 border-2 border-gray-800 cursor-help">
                                                    <AvatarFallback className="bg-gray-700 text-white text-xs">
                                                        {(collab.user_name?.charAt(0) || collab.user_email?.charAt(0) || '?').toLowerCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{collab.user_email || collab.user_name || 'Unknown'}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                    {notice.collaborators.length > 3 && (
                                        <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-800 flex items-center justify-center text-xs text-white">
                                            +{notice.collaborators.length - 3}
                                        </div>
                                    )}
                                </TooltipProvider>
                            </div>
                        </div>
                    )}

                    {/* Delete Option for CA */}
                    {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_ADMIN') && notice.status !== 'closed' && (
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isProcessingAction}
                            className="h-9 text-sm font-medium bg-red-600 hover:bg-red-700 text-white mr-2"
                            title="Delete Notice"
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                    )}

                    {canRequestClose && (
                        <Button
                            variant="accept" // Changed from 'reject' to default/green custom
                            onClick={() => setIsRequestCloseOpen(true)}
                            className="bg-green-600 hover:bg-green-700 text-white h-9 text-sm font-medium"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" /> Request Close
                        </Button>
                    )}

                    {canReviewClose && (
                        <>
                            <Button variant="accept" onClick={() => handleAction('approve_close')} disabled={isProcessingAction} className="bg-green-600 hover:bg-green-700 text-white h-9 text-sm font-medium">
                                <CheckCircle className="w-4 h-4 mr-2" /> Approve
                            </Button>
                            <Button variant="reject" onClick={() => setIsRejectCloseOpen(true)} className="bg-red-600 hover:bg-red-700 text-white h-9 text-sm font-medium">
                                <XCircle className="w-4 h-4 mr-2" /> Reject
                            </Button>
                        </>
                    )}

                    {(user?.role === 'CLIENT_MASTER_ADMIN' || user?.role === 'CA_ACCOUNTANT') && notice.status !== 'closed' && (
                        <Button onClick={() => setIsCollaborateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-sm font-medium">
                            <UserPlus className="w-4 h-4 mr-2" /> Collaborate
                        </Button>
                    )}
                </div>
            </header>

            {/* Main Content - Split View with Resizable Panel */}
            <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border border-white/10 hidden md:flex">
                {/* Left Panel - Document Preview */}
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="relative flex h-full w-full flex-col items-center justify-center p-2 bg-black/40 overflow-hidden">
                        {/* Zoom controls */}
                        {/* <div className="absolute bottom-4 right-4 z-10 flex gap-2">
                            <Button variant="outline" size="icon" onClick={() => setZoom(z => z + 0.1)} className="h-9 w-9 bg-black/50 border-white/10 hover:bg-black/70">
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="h-9 w-9 bg-black/50 border-white/10 hover:bg-black/70">
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setZoom(1)} className="h-9 w-9 bg-black/50 border-white/10 hover:bg-black/70">
                                <RefreshCcw className="h-4 w-4" />
                            </Button>
                        </div> */}

                        {(isAttachmentLoading || (!attachmentUrl && !notice.file_url)) && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 bg-black/40">
                                <Skeleton className="w-full h-full rounded-lg" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <FileText className="w-12 h-12 text-blue-400 mb-4 animate-pulse" />
                                    <p className="text-gray-400 animate-pulse text-lg font-medium">Loading Document...</p>
                                </div>
                            </div>
                        )}

                        {(attachmentUrl || (!isFetchingAttachment && notice.file_url)) ? (
                            (() => {
                                const urlToUse = attachmentUrl || (!isFetchingAttachment ? notice.file_url : null);
                                if (!urlToUse) return null;

                                const isPdf =
                                    (attachmentContentType && attachmentContentType.includes("pdf")) ||
                                    notice.file_name?.toLowerCase().endsWith(".pdf") ||
                                    urlToUse.toLowerCase().includes(".pdf");

                                if (isPdf) {
                                    // Hide built-in PDF viewer UI (works in many browsers)
                                    const pdfUrl = `${urlToUse}#toolbar=0&navpanes=0&scrollbar=0`;

                                    return (
                                        <iframe
                                            src={pdfUrl}
                                            className={`w-full h-full border-0 bg-white transition-opacity duration-300 ${isAttachmentLoading ? "opacity-0" : "opacity-100"
                                                }`}
                                            title="Notice Document"
                                            onLoad={() => setIsAttachmentLoading(false)}
                                        />
                                    );
                                } else {
                                    return (
                                        <img
                                            src={urlToUse}
                                            alt="Notice Document"
                                            className={`max-w-full max-h-full object-contain transition-all duration-300 ${isAttachmentLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
                                                }`}
                                            style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                                            onLoad={() => setIsAttachmentLoading(false)}
                                        />
                                    );
                                }
                            })()
                        ) : (
                            !isAttachmentLoading && <div className="text-gray-500">No document attached</div>
                        )}


                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-white/10" />

                {/* Right Panel - Chat Interface */}
                <ResizablePanel defaultSize={50} minSize={30}>
                    <Card className="glass-pane flex h-full flex-col overflow-hidden rounded-r-2xl rounded-l-none border-none">
                        <CardHeader className="flex-shrink-0 border-b border-white/10 py-3">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                                <MessageSquare className="w-5 h-5 text-gray-300" />
                                Notice Chat
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col overflow-hidden min-h-0 p-0">
                            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 mb-4 pr-2 min-h-0" style={{ overflowX: 'visible' }}>
                                {messages.length === 0 ? (
                                    <div className="text-center text-gray-500 mt-10">No messages yet. Start the discussion.</div>
                                ) : (
                                    Object.entries(groupMessagesByDate(messages)).map(([dateStr, dateMsgs]) => (
                                        <div key={dateStr} className="space-y-4">
                                            {/* Date Separator */}
                                            <div className="flex justify-center my-6">
                                                <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 shadow-lg">
                                                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                                        {formatDateHeader(dateStr)}
                                                    </span>
                                                </div>
                                            </div>

                                            {dateMsgs.map((msg, index) => {
                                                const isOwnComment = String(msg.user_id) === String(user?.id);
                                                const commentUserName = msg.user_name || (isOwnComment ? (user?.name || 'You') : 'Unknown');

                                                // Check if previous message in THIS date group is from same user
                                                const prevMessage = index > 0 ? dateMsgs[index - 1] : null;
                                                const isGrouped = prevMessage && String(prevMessage.user_id) === String(msg.user_id);

                                                // Format timestamp
                                                const messageDate = new Date(msg.created_at);
                                                const timeStr = format(messageDate, 'HH:mm');

                                                return (
                                                    <div
                                                        key={msg.id}
                                                        data-comment-id={msg.id}
                                                        className={`flex gap-2 ${isOwnComment ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-1' : 'mt-4'}`}
                                                    >
                                                        {/* Avatar - only show if not grouped */}
                                                        {!isGrouped && (
                                                            <div className="flex-shrink-0">
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Avatar className="w-10 h-10 shadow-lg cursor-help">
                                                                                <AvatarFallback className="bg-gradient-to-br from-primary/40 to-primary/60 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                                                                                    {commentUserName.charAt(0).toUpperCase()}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>{msg.user_email || msg.user_name || 'Unknown'}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </div>
                                                        )}
                                                        {isGrouped && <div className="w-10"></div>}

                                                        <div className={`flex-1 ${isOwnComment ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                                                            {!isGrouped && (
                                                                <div className={`mb-1 ${isOwnComment ? 'text-right' : 'text-left'}`}>
                                                                    <span className={`text-sm font-bold ${getUserNameColor(msg.user_id)}`}>
                                                                        {commentUserName}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Message bubble */}
                                                            <div className={`relative inline-block max-w-[85%] ${isOwnComment ? 'bg-blue-500/20 text-white border border-blue-500/50' : 'bg-white/10 text-white border border-white/20'} rounded-lg shadow-sm`} style={{
                                                                borderRadius: isOwnComment
                                                                    ? (isGrouped ? '7px 7px 2px 7px' : '7px 7px 2px 7px')
                                                                    : (isGrouped ? '2px 7px 7px 7px' : '7px 7px 7px 2px')
                                                            }}>
                                                                <div className="p-3 pb-1">
                                                                    {msg.attachment_url && (
                                                                        <div className="mb-2">
                                                                            {msg.attachment_url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i) ? (
                                                                                <button
                                                                                    type="button"
                                                                                    className="rounded-lg overflow-hidden relative block w-full text-left"
                                                                                    onClick={() => setPreviewAttachment({
                                                                                        url: msg.attachment_url,
                                                                                        name: msg.attachment_name || 'Image',
                                                                                        type: 'image'
                                                                                    })}
                                                                                >
                                                                                    <img
                                                                                        src={msg.attachment_url}
                                                                                        alt="Attachment"
                                                                                        className="max-w-full h-auto max-h-[200px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                                                    />
                                                                                </button>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setPreviewAttachment({
                                                                                        url: msg.attachment_url,
                                                                                        name: msg.attachment_name || 'Document',
                                                                                        type: msg.attachment_name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'document'
                                                                                    })}
                                                                                    className="w-full flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-left cursor-pointer"
                                                                                >
                                                                                    <div className="flex-shrink-0">
                                                                                        {msg.attachment_name?.toLowerCase().endsWith('.pdf') ? (
                                                                                            <FileText className="w-8 h-8 text-red-500" />
                                                                                        ) : msg.attachment_name?.toLowerCase().match(/\.(xls|xlsx)$/i) ? (
                                                                                            <FileText className="w-8 h-8 text-blue-500" />
                                                                                        ) : (
                                                                                            <FileText className="w-8 h-8 text-gray-400" />
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="text-sm font-medium text-white truncate">{msg.attachment_name || 'Attachment'}</p>
                                                                                        <p className="text-xs text-gray-400">{msg.attachment_name?.split('.').pop()?.toUpperCase() || 'FILE'}</p>
                                                                                    </div>
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {msg.message && <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>}
                                                                </div>

                                                                {/* Timestamp and ticks */}
                                                                <div className="flex items-center justify-end gap-1 px-3 pb-1 opacity-70">
                                                                    <span className="text-[10px] text-gray-300">
                                                                        {timeStr}
                                                                    </span>
                                                                    {isOwnComment && (
                                                                        <TooltipProvider>
                                                                            <Tooltip delayDuration={300}>
                                                                                <TooltipTrigger asChild>
                                                                                    <button
                                                                                        onMouseEnter={() => handleFetchReadReceipts(msg.id)}
                                                                                        className="text-[10px] cursor-pointer ml-1 flex items-center"
                                                                                    >
                                                                                        {(() => {
                                                                                            const receipts = readReceipts[msg.id] || msg.read_receipts || [];
                                                                                            const isReadByOthers = receipts.some(r => String(r.user_id) !== String(user?.id));
                                                                                            return isReadByOthers ? (
                                                                                                <span className="text-blue-400 font-bold">✓✓</span>
                                                                                            ) : (
                                                                                                <span className="text-gray-400">✓</span>
                                                                                            );
                                                                                        })()}
                                                                                    </button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent className="bg-slate-900 border border-white/10 p-2 shadow-2xl z-50">
                                                                                    <div>
                                                                                        <div className="text-[11px] font-bold text-blue-400 mb-2 border-b border-white/10 pb-1">Read By</div>
                                                                                        {(readReceipts[msg.id] || []).filter(r => String(r.user_id) !== String(user?.id)).length > 0 ? (
                                                                                            <div className="space-y-2 min-w-[120px]">
                                                                                                {(readReceipts[msg.id] || []).filter(r => String(r.user_id) !== String(user?.id)).map((r, i) => (
                                                                                                    <div key={i} className="flex items-center gap-2">
                                                                                                        <Avatar className="w-5 h-5">
                                                                                                            <AvatarFallback className="text-[8px] bg-blue-500 text-white">
                                                                                                                {(r.user_name || 'U')[0]}
                                                                                                            </AvatarFallback>
                                                                                                        </Avatar>
                                                                                                        <div className="flex flex-col">
                                                                                                            <span className="text-[10px] font-medium text-white">{r.user_name || 'Unknown'}</span>
                                                                                                            <span className="text-[9px] text-gray-400">{format(new Date(r.read_at), 'HH:mm, dd MMM')}</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="text-[10px] text-gray-400 py-1 italic">Not read by anyone yet</div>
                                                                                        )}
                                                                                    </div>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm flex-shrink-0">
                                {selectedFile && (
                                    <div className="mb-2 p-2 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Paperclip className="w-4 h-4 text-blue-400" />
                                            <span className="text-xs text-white truncate max-w-[200px]">{selectedFile.name}</span>
                                        </div>
                                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-gray-400 hover:text-white" onClick={() => setSelectedFile(null)}>
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}
                                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={(e) => setSelectedFile(e.target.files[0])}
                                        disabled={isSending || notice.status === 'closed'}
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="text-gray-400 hover:text-white flex-shrink-0 h-10 w-10"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isSending || notice.status === 'closed'}
                                    >
                                        <Paperclip className="w-5 h-5" />
                                    </Button>
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={notice.status === 'closed' ? "This notice is closed" : "Type your message..."}
                                        className="flex-1 bg-white/10 text-white border-2 border-blue-500/50 rounded-full h-10 px-4 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={isSending || notice.status === 'closed'}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e);
                                            }
                                        }}
                                    />
                                    <Button type="submit" size="icon" disabled={isSending || notice.status === 'closed'} className={`flex-shrink-0 h-10 w-10 rounded-full p-0 ${(isSending || notice.status === 'closed') ? 'bg-gray-600 cursor-not-allowed text-gray-400' : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg'}`}>
                                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </Button>
                                </form>
                            </div>
                        </CardContent>
                    </Card>
                </ResizablePanel>
            </ResizablePanelGroup>

            {/* Mobile View (Simplified) */}
            < div className="flex flex-col md:hidden flex-1 gap-4 overflow-hidden" >
                <div className="flex items-center gap-2 px-1">
                    <MessageSquare className="w-5 h-5 text-gray-300" />
                    <h2 className="text-lg font-semibold text-white">Notice Chat</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 border border-white/10 rounded-lg">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">No messages yet.</div>
                    ) : (
                        messages.map((msg, index) => {
                            const isOwnComment = msg.user_id === user?.id;
                            const prevMessage = index > 0 ? messages[index - 1] : null;
                            const isGrouped = prevMessage && prevMessage.user_id === msg.user_id;
                            const messageDate = new Date(msg.created_at || msg.timestamp || msg.time);
                            const timeStr = format(messageDate, 'HH:mm');

                            return (
                                <div key={msg.id} className={`flex ${isOwnComment ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-3'}`}>
                                    <div className={`p-3 rounded-lg text-sm max-w-[85%] ${isOwnComment ? 'bg-blue-500/20 text-white border border-blue-500/50' : 'bg-white/10 text-white border border-white/20'}`} style={{
                                        borderRadius: isOwnComment
                                            ? (isGrouped ? '7px 7px 2px 7px' : '7px 7px 2px 7px')
                                            : (isGrouped ? '2px 7px 7px 7px' : '7px 7px 7px 2px')
                                    }}>
                                        <p className="whitespace-pre-wrap">{msg.message}</p>
                                        <div className="flex items-center justify-end gap-1 mt-1">
                                            <span className="text-[9px] text-gray-400">{timeStr}</span>
                                            {isOwnComment && (
                                                <span className="text-[9px] font-bold">
                                                    {(() => {
                                                        const receipts = readReceipts[msg.id] || msg.read_receipts || msg.read_by || [];
                                                        const hasRead = Array.isArray(receipts) && receipts.some(r => {
                                                            const rid = r.user_id || r.id || (typeof r !== 'object' ? r : null);
                                                            return rid && String(rid) !== String(user?.id);
                                                        });
                                                        return hasRead ? (
                                                            <span className="text-blue-400">✓✓</span>
                                                        ) : (
                                                            <span className="text-gray-500">✓</span>
                                                        );
                                                    })()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t border-white/10 bg-black/20">
                    {selectedFile && (
                        <div className="mb-2 p-2 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs truncate">
                                <Paperclip className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                <span className="text-white truncate">{selectedFile.name}</span>
                            </div>
                            <Button type="button" size="icon" variant="ghost" className="h-5 w-5 text-gray-400" onClick={() => setSelectedFile(null)}>
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 text-gray-400 rounded-full"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Paperclip className="w-5 h-5" />
                        </Button>
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Message..."
                            className="flex-1 h-10 bg-white/10 text-white border border-blue-500/30 rounded-full px-4 text-sm"
                            disabled={isSending}
                        />
                        <Button type="submit" size="icon" disabled={isSending} className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
                            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </form>
                </div>
            </div >

            {/* Request Close Dialog */}
            < Dialog open={isRequestCloseOpen} onOpenChange={setIsRequestCloseOpen} >
                <DialogContent className="glass-card border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Request Notice Closure</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Provide a reason for closing this notice.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="reason">Reason / Remarks</Label>
                        <Textarea id="reason" value={closureReason} onChange={(e) => setClosureReason(e.target.value)} className="glass-input border-white/10 bg-black/20" />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRequestCloseOpen(false)}>Cancel</Button>
                        <Button onClick={() => handleAction('request_close')} disabled={isProcessingAction}>Submit Request</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Preview Attachment Dialog */}
            <Dialog open={!!previewAttachment} onOpenChange={(open) => {
                if (!open) {
                    setPreviewAttachment(null);
                    // Clean up blob URL when dialog closes
                    if (pdfBlobUrlRef.current) {
                        URL.revokeObjectURL(pdfBlobUrlRef.current);
                        pdfBlobUrlRef.current = null;
                        setPdfBlobUrl(null);
                    }
                }
            }}>
                <DialogContent className="glass-card border-white/10 text-white max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-white/10 bg-black/40">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-white flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Document
                            </DialogTitle>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-2 hover:bg-white/10 text-white"
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = previewAttachment?.url;
                                        link.download = previewAttachment?.name || 'download';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                >
                                    <Download className="w-4 h-4" /> Download
                                </Button>
                            </div>
                        </div>
                        <DialogDescription className="sr-only">
                            Preview of the selected attachment
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 bg-black/60 flex items-center justify-center p-6 overflow-hidden relative">
                        {previewAttachment && (
                            <>
                                {(previewAttachment.type?.startsWith('image') ||
                                    previewAttachment.name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ||
                                    previewAttachment.url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i)) ? (
                                    <div className="h-full flex items-center justify-center">
                                        <img
                                            src={previewAttachment.url}
                                            alt={previewAttachment.name}
                                            className="max-w-full max-h-full object-contain rounded-lg"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full w-full flex flex-col">
                                        {isLoadingPdf ? (
                                            <div className="flex-1 flex items-center justify-center">
                                                <div className="text-center">
                                                    <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
                                                    <p className="text-white">Loading PDF...</p>
                                                </div>
                                            </div>
                                        ) : pdfDoc && totalPages > 0 ? (
                                            <>
                                                <div className="flex-1 w-full overflow-auto rounded-lg border border-white/10 bg-gray-900 p-4 flex justify-center">
                                                    <canvas
                                                        ref={canvasRef}
                                                        className="shadow-lg"
                                                        style={{ maxWidth: '100%', height: 'auto' }}
                                                    />
                                                </div>
                                                <div className="mt-4 flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                            disabled={currentPage === 1}
                                                            className="bg-white/10 hover:bg-white/20 text-white border-white/10"
                                                        >
                                                            Previous
                                                        </Button>
                                                        <span className="text-white px-4 text-sm font-medium">
                                                            Page {currentPage} of {totalPages}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                            disabled={currentPage === totalPages}
                                                            className="bg-white/10 hover:bg-white/20 text-white border-white/10"
                                                        >
                                                            Next
                                                        </Button>
                                                    </div>

                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center">
                                                <div className="text-center">
                                                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                                    <p className="text-white mb-4 italic">Preview not available directly. Please try downloading or opening in new tab.</p>
                                                    <div className="flex items-center justify-center gap-4">
                                                        <a
                                                            href={previewAttachment.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                                                        >
                                                            <Maximize2 className="w-4 h-4" />
                                                            Open in New Tab
                                                        </a>
                                                        <a
                                                            href={previewAttachment.url}
                                                            download={previewAttachment.name}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                            Download
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Reject Close Dialog */}
            <Dialog open={isRejectCloseOpen} onOpenChange={setIsRejectCloseOpen}>
                <DialogContent className="glass-card border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Reject Closure Request</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Why are you rejecting this closure request?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="rejectReason">Rejection Reason</Label>
                        <Textarea id="rejectReason" value={closureReason} onChange={(e) => setClosureReason(e.target.value)} className="glass-input border-white/10 bg-black/20" required />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRejectCloseOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => handleAction('reject_close')} disabled={isProcessingAction}>Reject Request</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            <CollaboratorsDialog
                isOpen={isCollaborateOpen}
                onClose={() => setIsCollaborateOpen(false)}
                noticeId={noticeId}
                entityId={notice?.entity_id}
                token={token}
                toast={toast}
                existingCollaborators={notice?.collaborators || []}
                onSuccess={fetchData}
            />
        </div >
    );
};

const CollaboratorsDialog = ({ isOpen, onClose, noticeId, entityId, token, toast, existingCollaborators = [], onSuccess }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [processing, setProcessing] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Pass entityId to filter users by the notice's entity
            const data = await listAllClientUsers(token, entityId);
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (userId) => {
        setProcessing(userId);
        try {
            await addNoticeCollaborator(noticeId, userId, token);
            toast({ title: "Success", description: "Collaborator added successfully" });
            if (onSuccess) onSuccess();
            onClose(); // Close modal after successful addition
        } catch (error) {
            console.error("Failed to add collaborator", error);
            toast({ title: "Error", description: "This user is already a collaborator or error occurred", variant: "destructive" });
        } finally {
            setProcessing(null);
        }
    };

    const handleRemove = async (userId) => {
        setProcessing(userId);
        try {
            await removeNoticeCollaborator(noticeId, userId, token);
            toast({ title: "Success", description: "Collaborator removed successfully" });
            if (onSuccess) onSuccess();
            // Don't close modal, allow user to add/remove more
        } catch (error) {
            console.error("Failed to remove collaborator", error);
            toast({ title: "Error", description: "Failed to remove collaborator", variant: "destructive" });
        } finally {
            setProcessing(null);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="glass-card border-white/10 text-white sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-indigo-400" />
                        Manage Collaborators
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Add team members to this notice so they can see it and join the discussion.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                            placeholder="Search team members..."
                            className="pl-10 glass-input border-white/10 bg-black/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" /></div>
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map(u => {
                                const isAlreadyCollaborator = existingCollaborators.some(c => String(c.user_id) === String(u.id));

                                return (
                                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-8 h-8">
                                                <AvatarFallback className="bg-indigo-600 text-xs">{(u.name || 'U')[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{u.name}</span>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-wider">{u.role?.replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                        {isAlreadyCollaborator ? (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                onClick={() => handleRemove(u.id)}
                                                disabled={processing === u.id}
                                            >
                                                {processing === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Remove'}
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                                                onClick={() => handleAdd(u.id)}
                                                disabled={processing === u.id}
                                            >
                                                {processing === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                                            </Button>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-8 text-center text-gray-500 text-sm italic">No members found</div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} className="hover:bg-white/10 border-white/10">Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NoticeDetailsPage;
