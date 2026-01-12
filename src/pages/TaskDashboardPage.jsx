import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useSocket } from '@/contexts/SocketContext.jsx';
import { useOrganisation } from '@/hooks/useOrganisation';
import { getTaskDetails, startTaskTimer, stopTaskTimer, getTaskHistory, /* addTaskSubtask, updateTaskSubtask, deleteTaskSubtask, */ updateTask, listClients, listServices, listTeamMembers, listTaskComments, createTaskComment, updateTaskComment, deleteTaskComment, addTaskCollaborator, removeTaskCollaborator, getTaskCollaborators, getCommentReadReceipts, requestTaskClosure, getClosureRequest, reviewClosureRequest, listTaskStages } from '@/lib/api';
import { listOrgUsers } from '@/lib/api/organisation';
import * as pdfjsLib from 'pdfjs-dist';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Paperclip, Clock, Calendar as CalendarIcon, User, Tag, Flag, CheckCircle, FileText, List, MessageSquare, Briefcase, Users, Play, Square, History, Plus, Trash2, Send, Edit2, Bell, UserPlus, X, Download, Image as ImageIcon, Eye, Maximize2, Repeat, LayoutGrid, CheckCircle2, XCircle } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, formatDistanceToNow } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const getStatusVariant = (status) => {
    switch (status) {
        case 'pending': return 'default';
        case 'in progress': return 'secondary';
        case 'completed': return 'success';
        case 'hold': return 'destructive';
        default: return 'outline';
    }
};

const getPriorityVariant = (priority) => {
    switch (priority) {
        case 'P1': return 'destructive';
        case 'P2': return 'warning';
        case 'P3': return 'secondary';
        case 'P4': return 'outline';
        default: return 'outline';
    }
};

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const formatSeconds = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '00:00:00';
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const OverviewCard = ({ Icon, label, value, colorClass }) => (
    <div className={`glass-card p-4 flex flex-col justify-between h-full rounded-xl ${colorClass}`}>
        <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-white/80">{label}</p>
            <Icon className="w-5 h-5 text-white/70" />
        </div>
        <p className="text-xl font-bold text-white mt-2 truncate">{value}</p>
    </div>
);


const TaskDashboardPage = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const { selectedOrg, organisations, selectedEntity, entities } = useOrganisation();
    const { socket, joinTaskRoom, leaveTaskRoom } = useSocket();
    const [task, setTask] = useState(null);
    const [history, setHistory] = useState([]);
    const [clients, setClients] = useState([]);
    const [services, setServices] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [orgUsers, setOrgUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSendingComment, setIsSendingComment] = useState(false);
    const [loadingImages, setLoadingImages] = useState(new Set());
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    // Subtask functionality commented out - using checklist instead
    // const [newSubtask, setNewSubtask] = useState('');
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [collaborators, setCollaborators] = useState([]);
    const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
    const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
    const [showAddCollaborator, setShowAddCollaborator] = useState(false);
    const [selectedCollaboratorId, setSelectedCollaboratorId] = useState('');
    // const [showSubtaskDialog, setShowSubtaskDialog] = useState(false);
    const [showAddCollaboratorDialog, setShowAddCollaboratorDialog] = useState(false);
    const [showAddChecklistDialog, setShowAddChecklistDialog] = useState(false);
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [isAddingChecklistItem, setIsAddingChecklistItem] = useState(false);
    const [isUpdatingChecklist, setIsUpdatingChecklist] = useState(false);
    // const [isAddingSubtask, setIsAddingSubtask] = useState(false);
    const [readReceipts, setReadReceipts] = useState({}); // { commentId: [{ user_id, name, read_at }] }
    const [isLoadingReadReceipts, setIsLoadingReadReceipts] = useState(false);
    const chatMessagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const [closureRequest, setClosureRequest] = useState(null);
    const [isLoadingClosureRequest, setIsLoadingClosureRequest] = useState(false);
    const [showClosureRequestDialog, setShowClosureRequestDialog] = useState(false);
    const [showClosureReviewDialog, setShowClosureReviewDialog] = useState(false);
    const [closureReason, setClosureReason] = useState('');
    const [previewAttachment, setPreviewAttachment] = useState(null); // { url, name, type }
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const pdfBlobUrlRef = useRef(null);
    const canvasRef = useRef(null);
    const [stages, setStages] = useState([]);
    const [isLoadingStages, setIsLoadingStages] = useState(false);
    const [isUpdatingStage, setIsUpdatingStage] = useState(false);
    const [showEditDueDateDialog, setShowEditDueDateDialog] = useState(false);
    const [editingDueDate, setEditingDueDate] = useState(null);
    const [isUpdatingDueDate, setIsUpdatingDueDate] = useState(false);
    const [showEditRecurringDialog, setShowEditRecurringDialog] = useState(false);
    const [isUpdatingRecurring, setIsUpdatingRecurring] = useState(false);
    const [recurringFormData, setRecurringFormData] = useState({
        is_recurring: false,
        recurrence_frequency: 'weekly',
        recurrence_time: '09:00',
        recurrence_day_of_week: null,
        recurrence_date: null,
        recurrence_day_of_month: null,
        recurrence_start_date: null
    });
    const [showCloseConfirmationDialog, setShowCloseConfirmationDialog] = useState(false);
    const [pendingCloseStageId, setPendingCloseStageId] = useState(null);

    const fetchCollaborators = useCallback(async () => {
        if (!user?.access_token || !taskId) return;
        setIsLoadingCollaborators(true);
        try {
            const agencyId = user?.agency_id || null;
            const collaboratorsData = await getTaskCollaborators(taskId, agencyId, user.access_token);
            setCollaborators(collaboratorsData || []);
        } catch (error) {
            console.error('Error fetching collaborators:', error);
            setCollaborators([]);
        } finally {
            setIsLoadingCollaborators(false);
        }
    }, [taskId, user?.agency_id, user?.access_token]);

    const fetchTask = useCallback(async () => {
        if (!user?.access_token || !taskId) return;
        setIsLoading(true);
        try {
            // Only fetch task details first - load other data lazily when needed
            // For CLIENT users, agency_id might be null/undefined - API will handle it
            const agencyId = user?.agency_id || null;
            const taskData = await getTaskDetails(taskId, agencyId, user.access_token);
            setTask(taskData);
        } catch (error) {
            toast({
                title: 'Error fetching task details',
                description: error.message,
                variant: 'destructive',
            });
            navigate('/');
        } finally {
            setIsLoading(false);
        }
    }, [taskId, user?.agency_id, user?.access_token, toast, navigate]);

    // Lazy load clients, services, and team members only when task is loaded and we need them
    useEffect(() => {
        if (!task || !user?.access_token) return;

        const loadRelatedData = async () => {
            try {
                const agencyId = user?.agency_id || null;
                const [clientsData, servicesData, teamData, orgUsersData] = await Promise.allSettled([
                    clients.length === 0 ? listClients(agencyId, user.access_token).catch(() => ({ status: 'rejected' })) : Promise.resolve({ status: 'fulfilled', value: clients }),
                    services.length === 0 ? listServices(agencyId, user.access_token).catch(() => ({ status: 'rejected' })) : Promise.resolve({ status: 'fulfilled', value: services }),
                    teamMembers.length === 0 ? listTeamMembers(user.access_token).catch(() => ({ status: 'rejected' })) : Promise.resolve({ status: 'fulfilled', value: teamMembers }),
                    (selectedOrg && orgUsers.length === 0 && (user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM')) ? listOrgUsers(selectedOrg, user.access_token).catch(() => ({ status: 'rejected' })) : Promise.resolve({ status: 'fulfilled', value: orgUsers }),
                ]);

                if (clientsData.status === 'fulfilled' && clients.length === 0) {
                    const clientsList = Array.isArray(clientsData.value) ? clientsData.value : (clientsData.value?.items || []);
                    setClients(clientsList);
                }
                if (servicesData.status === 'fulfilled' && services.length === 0) {
                    const servicesList = Array.isArray(servicesData.value) ? servicesData.value : (servicesData.value?.items || []);
                    setServices(servicesList);
                }
                if (teamData.status === 'fulfilled' && teamMembers.length === 0) {
                    const teamList = Array.isArray(teamData.value) ? teamData.value : (teamData.value?.items || []);
                    setTeamMembers(teamList);
                }
                if (orgUsersData.status === 'fulfilled' && orgUsers.length === 0 && selectedOrg) {
                    const orgUsersResponse = orgUsersData.value;
                    const invitedUsers = Array.isArray(orgUsersResponse?.invited_users) ? orgUsersResponse.invited_users : [];
                    const joinedUsers = Array.isArray(orgUsersResponse?.joined_users) ? orgUsersResponse.joined_users : [];
                    const allOrgUsers = [...invitedUsers, ...joinedUsers].map(orgUser => ({
                        id: orgUser.id || orgUser.user_id,
                        user_id: orgUser.id || orgUser.user_id,
                        name: orgUser.name || orgUser.full_name || `${orgUser.first_name || ''} ${orgUser.last_name || ''}`.trim() || orgUser.email,
                        email: orgUser.email || orgUser.user_email,
                        role: orgUser.role || 'N/A'
                    }));
                    setOrgUsers(allOrgUsers);
                }
            } catch (error) {
                console.error('Error loading related data:', error);
                // Don't show toast for related data failures - they're not critical
            }
        };

        loadRelatedData();
    }, [task, user?.agency_id, user?.access_token, selectedOrg, clients.length, services.length, teamMembers.length, orgUsers.length]);

    const fetchHistory = useCallback(async () => {
        if (!user?.access_token || !taskId) return;
        setIsHistoryLoading(true);
        try {
            const agencyId = user?.agency_id || null;
            const historyData = await getTaskHistory(taskId, agencyId, user.access_token);
            setHistory(historyData);
        } catch (error) {
            toast({
                title: 'Error fetching task history',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsHistoryLoading(false);
        }
    }, [taskId, user?.agency_id, user?.access_token, toast]);

    const fetchComments = useCallback(async () => {
        if (!user?.access_token || !taskId) return;
        setIsLoadingComments(true);
        try {
            const agencyId = user?.agency_id || null;
            const commentsData = await listTaskComments(taskId, agencyId, user.access_token);
            setComments(Array.isArray(commentsData) ? commentsData : []);
        } catch (error) {
            toast({
                title: 'Error fetching comments',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoadingComments(false);
        }
    }, [taskId, user?.agency_id, user?.access_token, toast]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    // Hydrate read receipts from comments when loaded
    useEffect(() => {
        if (comments.length > 0) {
            setReadReceipts(prev => {
                const next = { ...prev };
                let changed = false;
                comments.forEach(c => {
                    const receipts = c.read_receipts || c.read_by;
                    if (receipts && Array.isArray(receipts) && !next[c.id]) {
                        next[c.id] = receipts;
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }
    }, [comments]);

    // Automatically fetch read receipts for recent own comments to ensure correct tick status
    useEffect(() => {
        if (!user?.id || comments.length === 0) return;

        // Get recent own comments (last 15) that might need receipt updates
        const recentOwnComments = comments
            .filter(c => String(c.user_id) === String(user.id))
            .slice(-15);

        recentOwnComments.forEach(c => {
            // If we don't have receipts in state, and they aren't in the comment object
            if (!readReceipts[c.id] &&
                (!c.read_receipts || c.read_receipts.length === 0) &&
                (!c.read_by || c.read_by.length === 0)) {

                // Trigger fetch (it has internal check to avoid duplicate fetches if already in progress/done)
                handleFetchReadReceipts(c.id);
            }
        });
    }, [comments, user?.id]);

    // Auto-scroll to bottom when comments load or new comment is added
    useEffect(() => {
        if (!isLoadingComments && comments.length > 0) {
            // Use requestAnimationFrame and multiple attempts to ensure scroll happens
            const scrollToBottom = () => {
                if (chatContainerRef.current) {
                    // Scroll the container directly to bottom
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                } else if (chatMessagesEndRef.current) {
                    // Fallback to scrollIntoView
                    chatMessagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
                }
            };

            // Try immediately
            requestAnimationFrame(() => {
                scrollToBottom();
                // Try again after a short delay to handle async content loading
                setTimeout(() => {
                    scrollToBottom();
                }, 200);
                // One more attempt for images/attachments
                setTimeout(() => {
                    scrollToBottom();
                }, 500);
            });
        }
    }, [comments, isLoadingComments]);

    const fetchClosureRequest = useCallback(async () => {
        if (!user?.access_token || !taskId) return;
        setIsLoadingClosureRequest(true);
        try {
            const agencyId = user?.agency_id || null;
            const request = await getClosureRequest(taskId, agencyId, user.access_token);
            setClosureRequest(request || null);
        } catch (error) {
            // Silently handle errors - CORS or endpoint not available is OK
            // This prevents the app from breaking if the backend hasn't been updated yet
            if (error?.message?.includes('CORS') || error?.message?.includes('Failed to fetch')) {
                // CORS error - backend might not be running or endpoint not available
                console.warn('Closure request endpoint not available (CORS or endpoint issue)');
            } else if (error?.response?.status !== 404) {
                // Other errors (but not 404)
                console.warn('Error fetching closure request:', error.message);
            }
            // Always set to null on error - no request exists or endpoint unavailable
            setClosureRequest(null);
        } finally {
            setIsLoadingClosureRequest(false);
        }
    }, [taskId, user?.agency_id, user?.access_token]);

    const fetchStages = useCallback(async () => {
        if (!user?.access_token) return;
        setIsLoadingStages(true);
        try {
            const agencyId = user?.agency_id || null;
            const stagesData = await listTaskStages(agencyId, user.access_token);
            setStages(Array.isArray(stagesData) ? stagesData : []);
        } catch (error) {
            console.error('Error fetching stages:', error);
            setStages([]);
        } finally {
            setIsLoadingStages(false);
        }
    }, [user?.agency_id, user?.access_token]);

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

            // Only handle if it's a PDF
            if (previewAttachment.type === 'application/pdf' || previewAttachment.url.match(/\.pdf$/i)) {
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

                    // Load PDF with PDF.js
                    const loadingTask = pdfjsLib.getDocument({ url: blobUrl });
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
            const viewport = page.getViewport({ scale: 1.5 });
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

    useEffect(() => {
        fetchTask();
        fetchHistory();
        fetchCollaborators();
        fetchClosureRequest();
        fetchStages();
    }, [fetchTask, fetchHistory, fetchCollaborators, fetchClosureRequest, fetchStages]);

    // Socket.IO: Join task room and listen for real-time comment updates
    useEffect(() => {
        if (!socket || !taskId || !user?.id) return;

        // Join the task room
        joinTaskRoom(taskId);

        // Listen for new comments
        const handleNewComment = (data) => {
            if (data.task_id === taskId && data.comment) {
                const newComment = data.comment;

                // Don't add our own messages (shouldn't happen as backend doesn't emit to sender, but safety check)
                if (newComment.user_id === user?.id || String(newComment.user_id) === String(user?.id)) {
                    return;
                }

                // Check if comment already exists (avoid duplicates) using functional update
                setComments(prev => {
                    const commentExists = prev.some(c => c.id === newComment.id);
                    if (commentExists) {
                        return prev; // Return previous state if duplicate
                    }

                    // Add the new comment to the list
                    const updatedComments = [...prev, newComment];

                    // Scroll to bottom to show new message
                    setTimeout(() => {
                        if (chatContainerRef.current) {
                            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                        } else if (chatMessagesEndRef.current) {
                            chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        }
                    }, 100);

                    return updatedComments;
                });
            }
        };

        socket.on('new_comment', handleNewComment);

        // Listen for read receipt updates
        const handleReadReceipt = (data) => {
            if (data.task_id === taskId && data.comment_id && data.receipt) {
                const { comment_id, receipt } = data;

                // Update read receipts for this comment
                setReadReceipts(prev => {
                    const existingReceipts = prev[comment_id] || [];

                    // Check if this receipt already exists
                    const receiptExists = existingReceipts.some(r => r.id === receipt.id);
                    if (receiptExists) {
                        return prev; // Return previous state if duplicate
                    }

                    // Add the new receipt
                    const updatedReceipt = {
                        ...receipt,
                        name: receipt.user_name || receipt.name || 'Unknown',
                        email: receipt.user_email || receipt.email || 'N/A'
                    };

                    return {
                        ...prev,
                        [comment_id]: [...existingReceipts, updatedReceipt]
                    };
                });
            }
        };

        socket.on('comment_read_receipt', handleReadReceipt);

        // Cleanup: Leave task room and remove listeners
        return () => {
            leaveTaskRoom(taskId);
            socket.off('new_comment', handleNewComment);
            socket.off('comment_read_receipt', handleReadReceipt);
        };
    }, [socket, taskId, user?.id, joinTaskRoom, leaveTaskRoom]);


    // Subtask functionality commented out - using checklist instead
    /*
    const handleAddSubtask = async () => {
        if (!newSubtask.trim()) return;
        const subtaskTitle = newSubtask.trim();
        setIsAddingSubtask(true);
        
        try {
            const agencyId = user?.agency_id || null;
            const newSubtaskData = await addTaskSubtask(taskId, { title: subtaskTitle }, agencyId, user.access_token);
            // Optimistically add to UI at the top
            if (task) {
                const updatedSubtasks = [newSubtaskData, ...(task.subtasks || [])];
                setTask({ ...task, subtasks: updatedSubtasks });
            }
            setNewSubtask(''); // Clear input
            setShowSubtaskDialog(false); // Close dialog
            toast({ title: "Subtask Added", description: "The new subtask has been added." });
            // Refresh task and history to get latest data
            const [updatedTask, updatedHistory] = await Promise.all([
                getTaskDetails(taskId, agencyId, user.access_token),
                getTaskHistory(taskId, agencyId, user.access_token)
            ]);
            setTask(updatedTask);
            setHistory(updatedHistory);
        } catch (error) {
            toast({ title: "Error adding subtask", description: error.message, variant: "destructive" });
        } finally {
            setIsAddingSubtask(false);
        }
    };

    const handleToggleSubtask = async (subtaskId, completed) => {
        // Optimistically update the UI first
        if (task && task.subtasks) {
            const updatedSubtasks = task.subtasks.map(sub => 
                sub.id === subtaskId ? { ...sub, is_completed: completed } : sub
            );
            setTask({ ...task, subtasks: updatedSubtasks });
        }
        
        try {
            const agencyId = user?.agency_id || null;
            await updateTaskSubtask(taskId, subtaskId, { is_completed: completed }, agencyId, user.access_token);
            // Refresh task and history to get latest data including activity logs
            const [updatedTask, updatedHistory] = await Promise.all([
                getTaskDetails(taskId, agencyId, user.access_token),
                getTaskHistory(taskId, agencyId, user.access_token)
            ]);
            setTask(updatedTask);
            setHistory(updatedHistory);
        } catch (error) {
            // Revert optimistic update on error
            if (task && task.subtasks) {
                const revertedSubtasks = task.subtasks.map(sub => 
                    sub.id === subtaskId ? { ...sub, is_completed: !completed } : sub
                );
                setTask({ ...task, subtasks: revertedSubtasks });
            }
            toast({ title: "Error updating subtask", description: error.message, variant: "destructive" });
        }
    };

    const handleDeleteSubtask = async (subtaskId) => {
        // Optimistically remove from UI
        let deletedSubtask = null;
        if (task && task.subtasks) {
            deletedSubtask = task.subtasks.find(sub => sub.id === subtaskId);
            const updatedSubtasks = task.subtasks.filter(sub => sub.id !== subtaskId);
            setTask({ ...task, subtasks: updatedSubtasks });
        }
        
        try {
            const agencyId = user?.agency_id || null;
            await deleteTaskSubtask(taskId, subtaskId, agencyId, user.access_token);
            toast({ title: "Subtask Deleted", description: "The subtask has been removed." });
            // Refresh task and history to get latest data including activity logs
            const [updatedTask, updatedHistory] = await Promise.all([
                getTaskDetails(taskId, agencyId, user.access_token),
                getTaskHistory(taskId, agencyId, user.access_token)
            ]);
            setTask(updatedTask);
            setHistory(updatedHistory);
        } catch (error) {
            // Revert optimistic update on error
            if (task && deletedSubtask) {
                const revertedSubtasks = [...(task.subtasks || []), deletedSubtask];
                setTask({ ...task, subtasks: revertedSubtasks });
            }
            toast({ title: "Error deleting subtask", description: error.message, variant: "destructive" });
        }
    };
    */

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFilePreview(reader.result);
                };
                reader.readAsDataURL(file);
            } else {
                setFilePreview(null);
            }
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setFilePreview(null);
    };

    const handleFetchReadReceipts = async (commentId) => {
        // If already fetched, don't fetch again
        if (readReceipts[commentId]) {
            return;
        }

        setIsLoadingReadReceipts(true);
        try {
            const agencyId = user?.agency_id || null;
            const receipts = await getCommentReadReceipts(taskId, commentId, agencyId, user.access_token);

            // Map receipts to include user names (use API data if available, otherwise fallback to getUserInfo)
            const receiptsWithNames = (receipts || []).map(receipt => {
                // Use API data if available (user_name, user_email from backend)
                if (receipt.user_name && receipt.user_name !== "Unknown") {
                    return {
                        ...receipt,
                        name: receipt.user_name,
                        email: receipt.user_email || receipt.email || 'N/A',
                        read_at: receipt.read_at
                    };
                }
                // Fallback to local user info
                const userInfo = getUserInfo(receipt.user_id);
                return {
                    ...receipt,
                    name: userInfo.name,
                    email: userInfo.email,
                    read_at: receipt.read_at
                };
            });

            setReadReceipts(prev => ({ ...prev, [commentId]: receiptsWithNames }));
        } catch (error) {
            console.error('Error fetching read receipts:', error);
            // Don't show toast on hover - just log the error
        } finally {
            setIsLoadingReadReceipts(false);
        }
    };

    // Generate color for user name based on user ID
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
        const hash = String(userId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    const handleToggleChecklistItem = async (itemIndex, isCompleted) => {
        if (!task?.checklist?.items) return;

        setIsUpdatingChecklist(true);

        try {
            const agencyId = user?.agency_id || null;
            const updatedItems = task.checklist.items.map((item, idx) =>
                idx === itemIndex ? { ...item, is_completed: isCompleted } : item
            );

            const updatedChecklist = {
                enabled: task.checklist.enabled,
                items: updatedItems
            };

            // Optimistically update UI
            setTask({ ...task, checklist: updatedChecklist });

            // Update via API
            await updateTask(taskId, { checklist: updatedChecklist }, agencyId, user.access_token);

            // Refresh task and history to get latest data including activity logs
            const [updatedTask, updatedHistory] = await Promise.all([
                getTaskDetails(taskId, agencyId, user.access_token),
                getTaskHistory(taskId, agencyId, user.access_token)
            ]);
            setTask(updatedTask);
            setHistory(updatedHistory);
        } catch (error) {
            // Revert on error
            setTask(task);
            toast({ title: "Error updating checklist", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdatingChecklist(false);
        }
    };

    const [draggedChecklistIndex, setDraggedChecklistIndex] = useState(null);

    const handleChecklistDragStart = (e, index) => {
        setDraggedChecklistIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // HTML5 drag and drop requires data to be set for Firefox
        e.dataTransfer.setData('text/plain', index);
    };

    const handleChecklistDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleChecklistDrop = async (e, targetIndex) => {
        e.preventDefault();
        if (draggedChecklistIndex === null || draggedChecklistIndex === targetIndex) return;

        // Clone the items array
        const newItems = [...(task.checklist?.items || [])];

        // Remove the dragged item
        const [draggedItem] = newItems.splice(draggedChecklistIndex, 1);

        // Insert it at the new position
        newItems.splice(targetIndex, 0, draggedItem);

        const updatedChecklist = {
            ...task.checklist,
            items: newItems
        };

        // Optimistically update UI
        setTask({ ...task, checklist: updatedChecklist });
        setDraggedChecklistIndex(null);

        try {
            setIsUpdatingChecklist(true);
            const agencyId = user?.agency_id || null;
            await updateTask(taskId, { checklist: updatedChecklist }, agencyId, user.access_token);

            // Refresh task to ensure consistency
            const updatedTask = await getTaskDetails(taskId, agencyId, user.access_token);
            setTask(updatedTask);
        } catch (error) {
            console.error("Failed to reorder checklist:", error);
            toast({
                title: "Error reordering checklist",
                description: "Failed to save the new order. Refreshing...",
                variant: "destructive"
            });
            // Revert by refetching
            const agencyId = user?.agency_id || null;
            const originalTask = await getTaskDetails(taskId, agencyId, user.access_token);
            setTask(originalTask);
        } finally {
            setIsUpdatingChecklist(false);
        }
    };

    const handleAddChecklistItem = async () => {
        if (!newChecklistItem.trim() || isAddingChecklistItem) return;

        setIsAddingChecklistItem(true);
        try {
            const agencyId = user?.agency_id || null;

            // Ensure checklist is enabled and has items array
            const currentItems = task?.checklist?.items || [];
            const newItem = {
                name: newChecklistItem.trim(),
                is_completed: false,
                assigned_to: user?.id || null,
                created_by: user?.id || null
            };

            const updatedChecklist = {
                enabled: true,
                items: [newItem, ...currentItems] // Add new item at the top
            };

            // Update via API
            await updateTask(taskId, { checklist: updatedChecklist }, agencyId, user.access_token);

            // Refresh task and history
            const [updatedTask, updatedHistory] = await Promise.all([
                getTaskDetails(taskId, agencyId, user.access_token),
                getTaskHistory(taskId, agencyId, user.access_token)
            ]);
            setTask(updatedTask);
            setHistory(updatedHistory);

            setNewChecklistItem('');
            setShowAddChecklistDialog(false);
            toast({ title: "Checklist Item Added", description: "The checklist item has been added successfully." });
        } catch (error) {
            console.error("Error adding checklist item:", error);
            toast({ title: "Error adding item", description: error.message, variant: "destructive" });
        } finally {
            setIsAddingChecklistItem(false);
        }
    };


    const handleDeleteChecklistItem = async (itemIndex) => {
        if (!task?.checklist?.items || isUpdatingChecklist) return;

        setIsUpdatingChecklist(true);
        try {
            const agencyId = user?.agency_id || null;
            const itemToDelete = task.checklist.items[itemIndex];
            const updatedItems = task.checklist.items.filter((_, idx) => idx !== itemIndex);

            const updatedChecklist = {
                enabled: task.checklist.enabled,
                items: updatedItems
            };

            // Optimistically update UI
            setTask({ ...task, checklist: updatedChecklist });

            // Update via API
            await updateTask(taskId, { checklist: updatedChecklist }, agencyId, user.access_token);

            toast({ title: "Checklist Item Deleted", description: "The checklist item has been removed." });

            // Refresh task and history to get latest data including activity logs
            const [updatedTask, updatedHistory] = await Promise.all([
                getTaskDetails(taskId, agencyId, user.access_token),
                getTaskHistory(taskId, agencyId, user.access_token)
            ]);
            setTask(updatedTask);
            setHistory(updatedHistory);
        } catch (error) {
            // Revert on error
            setTask(task);
            toast({ title: "Error deleting checklist item", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdatingChecklist(false);
        }
    };

    const handleAddCollaborator = async () => {
        if (!selectedCollaboratorId || isAddingCollaborator) return;
        setIsAddingCollaborator(true);
        try {
            const agencyId = user?.agency_id || null;
            await addTaskCollaborator(taskId, selectedCollaboratorId, agencyId, user.access_token);
            toast({ title: "Collaborator Added", description: "Collaborator has been added to the task." });
            setSelectedCollaboratorId('');
            setShowAddCollaboratorDialog(false);
            await fetchCollaborators();
            await fetchTask(); // Refresh task to update collaborators list
        } catch (error) {
            toast({ title: "Error adding collaborator", description: error.message, variant: "destructive" });
        } finally {
            setIsAddingCollaborator(false);
        }
    };

    const handleRequestClosure = async () => {
        if (!user?.access_token || !taskId) return;

        try {
            const agencyId = user?.agency_id || null;
            await requestTaskClosure(taskId, closureReason, agencyId, user.access_token);
            toast({
                title: "Closure Request Sent",
                description: "The task creator has been notified of your request to close this task."
            });
            setShowClosureRequestDialog(false);
            setClosureReason('');
            fetchClosureRequest();
            fetchTask();
            fetchHistory();
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to request task closure",
                variant: "destructive"
            });
        }
    };

    const handleReviewClosure = async (status) => {
        if (!user?.access_token || !taskId || !closureRequest) return;

        try {
            const agencyId = user?.agency_id || null;
            await reviewClosureRequest(taskId, closureRequest.id, status, closureReason, agencyId, user.access_token);

            // If approved, set task status to "Complete"
            if (status === 'approved') {
                // Find the "Complete" stage
                const completeStage = stages.find(s => {
                    const stageName = (s.name || '').toLowerCase();
                    return stageName === 'complete' || stageName === 'completed';
                });

                if (completeStage) {
                    await updateTask(taskId, { stage_id: completeStage.id }, agencyId, user.access_token);
                }
            }

            toast({
                title: status === 'approved' ? "Closure Approved" : "Closure Rejected",
                description: status === 'approved'
                    ? "The task has been closed and marked as Complete."
                    : "The closure request has been rejected. The task remains open."
            });
            setShowClosureReviewDialog(false);
            setClosureReason('');
            fetchClosureRequest();
            fetchTask();
            fetchHistory();
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to review closure request",
                variant: "destructive"
            });
        }
    };

    const handleRemoveCollaborator = async (userId) => {
        try {
            const agencyId = user?.agency_id || null;
            await removeTaskCollaborator(taskId, userId, agencyId, user.access_token);
            toast({ title: "Collaborator Removed", description: "Collaborator has been removed from the task." });
            fetchCollaborators();
            fetchTask(); // Refresh task to update collaborators list
        } catch (error) {
            toast({ title: "Error removing collaborator", description: error.message, variant: "destructive" });
        }
    };

    const handleSendComment = async () => {
        if (isSendingComment) return; // Prevent double submission

        const commentText = newComment.trim() || '';
        const fileToSend = selectedFile;

        setIsSendingComment(true);

        // Don't clear inputs yet - wait for success

        try {
            const agencyId = user?.agency_id || null;

            // Always use FormData (backend expects Form data)
            const formData = new FormData();
            formData.append('message', commentText || '');
            if (fileToSend) {
                formData.append('attachment', fileToSend);
            }
            const commentData = formData;

            const newCommentData = await createTaskComment(
                taskId,
                commentData,
                agencyId,
                user.access_token
            );

            // Clear inputs only after success
            setNewComment('');
            setSelectedFile(null);
            setFilePreview(null);

            setComments([...comments, newCommentData]);
            toast({ title: "Message Sent", description: "Your message has been posted." });
            // Scroll to bottom after sending message
            requestAnimationFrame(() => {
                setTimeout(() => {
                    if (chatContainerRef.current) {
                        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                    } else if (chatMessagesEndRef.current) {
                        chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }
                }, 100);
            });
        } catch (error) {
            // Don't restore inputs on error - let user retry
            toast({ title: "Error sending message", description: error.message, variant: "destructive" });
        } finally {
            setIsSendingComment(false);
        }
    };

    const handleStartEditComment = (comment) => {
        setEditingCommentId(comment.id);
        setEditCommentText(comment.message);
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditCommentText('');
    };

    const handleUpdateComment = async (commentId) => {
        if (!editCommentText.trim()) return;

        try {
            const agencyId = user?.agency_id || null;
            const updatedComment = await updateTaskComment(
                taskId,
                commentId,
                { message: editCommentText.trim() },
                agencyId,
                user.access_token
            );
            setComments(comments.map(c => c.id === commentId ? updatedComment : c));
            setEditingCommentId(null);
            setEditCommentText('');
            toast({ title: "Comment Updated", description: "Your comment has been updated." });
        } catch (error) {
            toast({ title: "Error updating comment", description: error.message, variant: "destructive" });
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            const agencyId = user?.agency_id || null;
            await deleteTaskComment(taskId, commentId, agencyId, user.access_token);
            setComments(comments.filter(c => c.id !== commentId));
            toast({ title: "Comment Deleted", description: "The comment has been removed." });
        } catch (error) {
            toast({ title: "Error deleting comment", description: error.message, variant: "destructive" });
        }
    };

    const renderHistoryItem = (item) => {
        let eventText = item.action || `Task ${item.event_type?.replace(/_/g, ' ') || 'activity'}`;
        let EventIcon = History;
        let eventColor = "text-primary";

        // Customize display based on event type
        switch (item.event_type) {
            case 'task_created':
                eventText = `Task created${item.to_value?.status ? ` with status "${item.to_value.status}"` : ''}`;
                eventColor = "text-blue-400";
                break;
            case 'task_updated':
                if (item.from_value?.status && item.to_value?.status) {
                    eventText = `Status changed from "${item.from_value.status}" to "${item.to_value.status}"`;
                } else if (item.details) {
                    eventText = item.details;
                }
                eventColor = "text-blue-400";
                break;
            case 'task_deleted':
                eventText = `Task deleted`;
                eventColor = "text-red-400";
                break;
            case 'subtask_created':
                eventText = item.action || `Subtask added`;
                eventColor = "text-purple-400";
                EventIcon = List;
                break;
            case 'subtask_updated':
                eventText = item.action || `Subtask updated`;
                eventColor = "text-purple-400";
                EventIcon = List;
                break;
            case 'subtask_deleted':
                eventText = item.action || `Subtask deleted`;
                eventColor = "text-red-400";
                EventIcon = List;
                break;
            case 'timer_started':
                eventText = `Timer started`;
                eventColor = "text-yellow-400";
                EventIcon = Play;
                break;
            case 'timer_stopped':
                const duration = item.to_value?.duration_seconds || 0;
                const hours = Math.floor(duration / 3600);
                const minutes = Math.floor((duration % 3600) / 60);
                const seconds = duration % 60;
                eventText = `Timer stopped (${hours}h ${minutes}m ${seconds}s)`;
                eventColor = "text-yellow-400";
                EventIcon = Square;
                break;
            case 'timer_manual':
                const manualDuration = item.to_value?.duration_seconds || 0;
                const mHours = Math.floor(manualDuration / 3600);
                const mMinutes = Math.floor((manualDuration % 3600) / 60);
                eventText = `Manual time entry: ${mHours}h ${mMinutes}m`;
                eventColor = "text-yellow-400";
                EventIcon = Clock;
                break;
            case 'checklist_updated':
                eventText = item.details || `Checklist updated`;
                eventColor = "text-blue-400";
                EventIcon = CheckCircle;
                break;
            case 'checklist_removed':
                eventText = `Checklist removed`;
                eventColor = "text-red-400";
                EventIcon = CheckCircle;
                break;
            default:
                if (item.details) {
                    eventText = item.details;
                }
        }

        // Get user info for activity log creator
        const activityCreator = getUserInfo(item.user_id);

        return (
            <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 transition-colors hover:bg-white/10">
                <EventIcon className={`h-5 w-5 ${eventColor} mt-1`} />
                <div className="flex-1">
                    <p className="text-sm text-white font-medium">{eventText}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-400">{format(new Date(item.created_at), 'dd MMM yyyy, HH:mm')}</p>
                        <span className="text-xs text-gray-500">•</span>
                        <p className="text-xs text-white">by {activityCreator.name}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-transparent text-white">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-transparent text-white">
                <p className="mb-4">Could not load task details.</p>
                <Button onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        );
    }

    // Helper functions to get names from IDs
    const getClientName = (clientId) => {
        if (!clientId || !Array.isArray(clients)) return 'N/A';
        const client = clients.find(c => c.id === clientId || String(c.id) === String(clientId));
        return client?.name || 'N/A';
    };

    const getServiceName = (serviceId) => {
        if (!serviceId || !Array.isArray(services)) return 'N/A';
        const service = services.find(s => s.id === serviceId || String(s.id) === String(serviceId));
        return service?.name || 'N/A';
    };

    const getUserInfo = (userId) => {
        if (!userId) return { name: 'N/A', email: 'N/A', role: 'N/A' };

        // First check if it's the current user
        const userIdStr = String(userId).toLowerCase();
        const currentUserIdStr = user?.id ? String(user.id).toLowerCase() : '';
        if (currentUserIdStr && userIdStr === currentUserIdStr) {
            return {
                name: user.name || user.email || 'You',
                email: user.email || 'N/A',
                role: user.role || 'N/A'
            };
        }

        // Then check teamMembers if available
        if (Array.isArray(teamMembers) && teamMembers.length > 0) {
            const member = teamMembers.find(m => {
                if (!m) return false;
                // Try multiple field combinations
                const mUserId = m.user_id ? String(m.user_id).toLowerCase() : '';
                const mId = m.id ? String(m.id).toLowerCase() : '';
                const mUserIdStr = String(mUserId || mId).toLowerCase();
                return mUserId === userIdStr || mId === userIdStr || mUserIdStr === userIdStr;
            });
            if (member) {
                const memberName = member.name || member.full_name || member.display_name || member.email || 'Unknown';
                return {
                    name: memberName,
                    email: member.email || 'N/A',
                    role: member.role || member.department || 'N/A'
                };
            }
        }

        // Check organization users if available
        if (Array.isArray(orgUsers) && orgUsers.length > 0) {
            const orgUser = orgUsers.find(u => {
                if (!u) return false;
                const uUserId = u.user_id ? String(u.user_id).toLowerCase() : '';
                const uId = u.id ? String(u.id).toLowerCase() : '';
                const uUserIdStr = String(uUserId || uId).toLowerCase();
                return uUserId === userIdStr || uId === userIdStr || uUserIdStr === userIdStr;
            });
            if (orgUser) {
                return {
                    name: orgUser.name || orgUser.email || 'Unknown',
                    email: orgUser.email || 'N/A',
                    role: orgUser.role || 'N/A'
                };
            }
        }

        // Check task for created_by_name or updated_by_name if userId matches
        if (task) {
            if (task.created_by && String(task.created_by).toLowerCase() === userIdStr && task.created_by_name) {
                return {
                    name: task.created_by_name || 'N/A',
                    email: 'N/A',
                    role: task.created_by_role || 'N/A'
                };
            }
            if (task.updated_by && String(task.updated_by).toLowerCase() === userIdStr && task.updated_by_name) {
                return {
                    name: task.updated_by_name || 'N/A',
                    email: 'N/A',
                    role: task.updated_by_role || 'N/A'
                };
            }
        }

        // Last resort: return Unknown instead of N/A
        return { name: 'Unknown', email: 'N/A', role: 'N/A' };
    };

    const getAssigneeName = (userId) => {
        return getUserInfo(userId).name;
    };

    const getDateBadgeColor = (dateString) => {
        if (!dateString) return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
            }
            const now = new Date();
            const diffMs = now - date;
            const diffHours = diffMs / (1000 * 60 * 60);
            const diffDays = diffHours / 24;

            if (diffHours <= 24) {
                return 'bg-green-500/20 text-green-300 border-green-500/50'; // Green for within 24 hours
            } else if (diffDays <= 7) {
                return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'; // Yellow for < 7 days
            } else {
                return 'bg-red-500/20 text-red-300 border-red-500/50'; // Red for more than 7 days
            }
        } catch {
            return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
        }
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return 'N/A';
            }
            const now = new Date();
            const diffMs = now - date;
            if (diffMs < 0) {
                return 'Just now';
            }
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
            if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
            if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
            return formatDistanceToNow(date, { addSuffix: true });
        } catch (error) {
            return 'N/A';
        }
    };

    const formatTimeUntil = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = date - now;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 0) return 'Overdue';
            if (diffMins < 1) return 'Due now';
            if (diffMins < 60) return `In ${diffMins} ${diffMins === 1 ? 'min' : 'mins'}`;
            if (diffHours < 24) return `In ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
            if (diffDays < 30) return `In ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
            return format(new Date(dateString), 'dd MMM yyyy');
        } catch (error) {
            return 'N/A';
        }
    };

    const getTaskId = (task) => {
        if (task?.task_number) {
            return `T${task.task_number}`;
        }
        if (!task?.id) return 'N/A';
        const idStr = String(task.id);
        const match = idStr.match(/\d+/);
        if (match) {
            return `T${match[0]}`;
        }
        return `T${idStr.slice(-4).toUpperCase()}`;
    };

    const getStatusName = (task) => {
        if (task.stage?.name) return task.stage.name;
        return task.status || 'Pending';
    };

    // Map stage names to display names for task detail page only
    const getDisplayStageName = (stageName) => {
        return stageName || 'Open';
    };

    // Get actual stage name from display name (reverse mapping)
    const getActualStageName = (displayName) => {
        return displayName;
    };

    const getStatusColor = (task) => {
        // Use stage color if available
        if (task.stage?.color) {
            return {
                backgroundColor: `${task.stage.color}20`,
                color: task.stage.color,
                borderColor: `${task.stage.color}50`
            };
        }

        // Fallback to default colors based on status name
        const statusName = getStatusName(task);
        const nameLower = statusName.toLowerCase();
        let className = '';

        if (nameLower === 'to do' || nameLower === 'open') {
            className = 'bg-blue-500/20 text-blue-300 border-blue-500/50';
        } else if (nameLower === 'in progress') {
            className = 'bg-orange-500/20 text-orange-300 border-orange-500/50';
        } else if (nameLower === 'need review' || nameLower === 'on review') {
            className = 'bg-purple-500/20 text-purple-300 border-purple-500/50';
        } else if (nameLower === 'on hold') {
            className = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
        } else if (nameLower === 'complete' || nameLower === 'completed' || nameLower === 'close') {
            className = 'bg-green-500/20 text-green-300 border-green-500/50';
        } else {
            className = 'bg-gray-500/20 text-gray-300 border-gray-500/50';
        }

        return { className };
    };

    // Get stage color styles for Combobox
    const getStageColorStyles = () => {
        if (task.stage?.color) {
            return {
                backgroundColor: `${task.stage.color}20`,
                color: task.stage.color,
                borderColor: `${task.stage.color}50`,
            };
        }
        const statusColor = getStatusColor(task);
        if (statusColor.className) {
            // Extract color classes and convert to inline styles
            const className = statusColor.className;
            if (className.includes('orange')) {
                return {
                    backgroundColor: 'rgba(249, 115, 22, 0.2)',
                    color: 'rgb(253, 186, 116)',
                    borderColor: 'rgba(249, 115, 22, 0.5)',
                };
            } else if (className.includes('blue')) {
                return {
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: 'rgb(147, 197, 253)',
                    borderColor: 'rgba(59, 130, 246, 0.5)',
                };
            } else if (className.includes('green')) {
                return {
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    color: 'rgb(134, 239, 172)',
                    borderColor: 'rgba(34, 197, 94, 0.5)',
                };
            } else if (className.includes('purple')) {
                return {
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    color: 'rgb(216, 180, 254)',
                    borderColor: 'rgba(168, 85, 247, 0.5)',
                };
            } else if (className.includes('yellow')) {
                return {
                    backgroundColor: 'rgba(234, 179, 8, 0.2)',
                    color: 'rgb(253, 224, 71)',
                    borderColor: 'rgba(234, 179, 8, 0.5)',
                };
            } else if (className.includes('red')) {
                return {
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    color: 'rgb(252, 165, 165)',
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                };
            }
        }
        return {
            backgroundColor: 'rgba(107, 114, 128, 0.2)',
            color: 'rgb(209, 213, 219)',
            borderColor: 'rgba(107, 114, 128, 0.5)',
        };
    };

    // Check if current user is the task creator
    const isTaskCreator = task.created_by && String(task.created_by) === String(user?.id);

    // Filter stages based on user role and deduplicate by display name
    const getAvailableStages = () => {
        if (!stages || stages.length === 0) return [];

        let filteredStages = stages;

        // If user is not creator, filter out "Complete" and "Completed" stages
        if (!isTaskCreator) {
            filteredStages = stages.filter(stage => {
                const stageName = (stage.name || '').toLowerCase();
                return stageName !== 'complete' && stageName !== 'completed';
            });
        }

        return filteredStages;
    };

    const availableStages = getAvailableStages();

    // Handle stage change
    const handleStageChange = async (stageId) => {
        if (!stageId || !task) return;

        const selectedStage = stages.find(s => s.id === stageId);
        if (!selectedStage) return;

        // Check if this is a "Close" stage (Complete/Completed)
        const stageName = (selectedStage.name || '').toLowerCase();
        const isCloseStage = stageName === 'complete' || stageName === 'completed';

        // If it's a Close stage, show confirmation dialog
        if (isCloseStage) {
            setPendingCloseStageId(stageId);
            setShowCloseConfirmationDialog(true);
            return; // Don't proceed yet, wait for confirmation
        }

        // Double-check: non-creators cannot select Complete stage (shouldn't reach here if Close is selected)
        if (!isTaskCreator && isCloseStage) {
            toast({
                title: 'Permission Denied',
                description: 'Only the task creator can change the stage to Close.',
                variant: 'destructive',
            });
            return;
        }

        // For non-Close stages, proceed directly
        await updateStageTo(stageId);
    };

    // Update stage to the given stageId
    const updateStageTo = async (stageId) => {
        if (!stageId || !task) return;

        const selectedStage = stages.find(s => s.id === stageId);
        if (!selectedStage) return;

        setIsUpdatingStage(true);
        try {
            const agencyId = user?.agency_id || null;
            await updateTask(taskId, { stage_id: stageId }, agencyId, user.access_token);

            // Refresh task data
            const updatedTask = await getTaskDetails(taskId, agencyId, user.access_token);
            setTask(updatedTask);

            // Refresh history
            const updatedHistory = await getTaskHistory(taskId, agencyId, user.access_token);
            setHistory(updatedHistory);

            // Show display name in toast
            const displayName = getDisplayStageName(selectedStage.name);
            toast({
                title: 'Stage Updated',
                description: `Task stage changed to ${displayName}`,
            });
        } catch (error) {
            toast({
                title: 'Error updating stage',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsUpdatingStage(false);
        }
    };

    // Handle confirmation to close task
    const handleConfirmClose = async () => {
        if (pendingCloseStageId) {
            await updateStageTo(pendingCloseStageId);
            setShowCloseConfirmationDialog(false);
            setPendingCloseStageId(null);
        }
    };

    // Handle due date edit
    const handleEditDueDate = () => {
        setEditingDueDate(task?.due_date ? new Date(task.due_date) : null);
        setShowEditDueDateDialog(true);
    };

    const handleSaveDueDate = async () => {
        if (!task) return;
        setIsUpdatingDueDate(true);
        try {
            const agencyId = user?.agency_id || null;
            const dueDateStr = editingDueDate ? format(editingDueDate, 'yyyy-MM-dd') : null;
            await updateTask(taskId, { due_date: dueDateStr }, agencyId, user.access_token);

            const updatedTask = await getTaskDetails(taskId, agencyId, user.access_token);
            setTask(updatedTask);

            const updatedHistory = await getTaskHistory(taskId, agencyId, user.access_token);
            setHistory(updatedHistory);

            toast({
                title: 'Due Date Updated',
                description: 'Task due date has been updated successfully.',
            });
            setShowEditDueDateDialog(false);
        } catch (error) {
            toast({
                title: 'Error updating due date',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsUpdatingDueDate(false);
        }
    };

    // Calculate days until due date
    const getDaysUntilDueDate = () => {
        if (!task?.due_date) return null;
        try {
            const dueDate = new Date(task.due_date);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            const diffMs = dueDate - now;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            return diffDays;
        } catch {
            return null;
        }
    };

    // Format recurring details
    const formatRecurringDetails = () => {
        if (!task?.is_recurring) return null;

        const frequency = task.recurrence_frequency || 'weekly';
        const details = [];

        if (frequency === 'daily' && task.recurrence_time) {
            details.push(`Daily at ${task.recurrence_time}`);
        } else if (frequency === 'weekly' && task.recurrence_day_of_week !== null) {
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            details.push(`Weekly on ${days[task.recurrence_day_of_week]}`);
        } else if (['monthly', 'yearly'].includes(frequency) && task.recurrence_date) {
            details.push(`${frequency.charAt(0).toUpperCase() + frequency.slice(1)} on ${format(new Date(task.recurrence_date), 'MMM dd')}`);
        } else if (['quarterly', 'half_yearly'].includes(frequency) && task.recurrence_day_of_month !== null) {
            const period = frequency === 'quarterly' ? '3 months' : '6 months';
            details.push(`Every ${period} on day ${task.recurrence_day_of_month}`);
        } else {
            details.push(frequency.charAt(0).toUpperCase() + frequency.slice(1));
        }

        if (task.recurrence_start_date) {
            details.push(`Starting ${format(new Date(task.recurrence_start_date), 'MMM dd, yyyy')}`);
        }

        return details.join(' • ');
    };

    // Handle recurring details edit - open edit dialog
    const handleEditRecurring = () => {
        if (!task) return;
        setRecurringFormData({
            is_recurring: task.is_recurring || false,
            recurrence_frequency: task.recurrence_frequency || 'weekly',
            recurrence_time: task.recurrence_time || '09:00',
            recurrence_day_of_week: task.recurrence_day_of_week ?? null,
            recurrence_date: task.recurrence_date ? new Date(task.recurrence_date) : null,
            recurrence_day_of_month: task.recurrence_day_of_month ?? null,
            recurrence_start_date: task.recurrence_start_date ? new Date(task.recurrence_start_date) : null
        });
        setShowEditRecurringDialog(true);
    };

    const handleRecurringFormChange = (name, value) => {
        setRecurringFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRecurringDateChange = (name, date) => {
        setRecurringFormData(prev => ({ ...prev, [name]: date }));
    };

    const handleSaveRecurring = async () => {
        if (!task) return;
        setIsUpdatingRecurring(true);
        try {
            const agencyId = user?.agency_id || null;
            const updateData = {
                is_recurring: recurringFormData.is_recurring,
                recurrence_frequency: recurringFormData.is_recurring ? recurringFormData.recurrence_frequency : null,
                recurrence_time: recurringFormData.is_recurring && recurringFormData.recurrence_frequency === 'daily' ? recurringFormData.recurrence_time : null,
                recurrence_day_of_week: recurringFormData.is_recurring && recurringFormData.recurrence_frequency === 'weekly' ? recurringFormData.recurrence_day_of_week : null,
                recurrence_date: recurringFormData.is_recurring && ['monthly', 'yearly'].includes(recurringFormData.recurrence_frequency) && recurringFormData.recurrence_date ? format(recurringFormData.recurrence_date, 'yyyy-MM-dd') : null,
                recurrence_day_of_month: recurringFormData.is_recurring && ['quarterly', 'half_yearly'].includes(recurringFormData.recurrence_frequency) ? recurringFormData.recurrence_day_of_month : null,
                recurrence_start_date: recurringFormData.is_recurring && recurringFormData.recurrence_start_date ? format(recurringFormData.recurrence_start_date, 'yyyy-MM-dd') : null
            };

            await updateTask(taskId, updateData, agencyId, user.access_token);

            const updatedTask = await getTaskDetails(taskId, agencyId, user.access_token);

            // Merge updated data to ensure UI reflects changes immediately (handles potential read-after-write lag)
            setTask({
                ...updatedTask,
                ...updateData
            });

            const updatedHistory = await getTaskHistory(taskId, agencyId, user.access_token);
            setHistory(updatedHistory);

            toast({
                title: 'Recurring Details Updated',
                description: 'Task recurring schedule has been updated successfully.',
            });
            setShowEditRecurringDialog(false);
        } catch (error) {
            toast({
                title: 'Error updating recurring details',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsUpdatingRecurring(false);
        }
    };

    // Get user info for display
    const createdByInfo = task?.created_by_name
        ? { name: task.created_by_name, email: 'N/A', role: task.created_by_role || getUserInfo(task.created_by).role || 'N/A' }
        : getUserInfo(task?.created_by);
    const updatedByInfo = task?.updated_by_name
        ? { name: task.updated_by_name, email: 'N/A', role: task.updated_by_role || getUserInfo(task?.updated_by || task?.created_by).role || 'N/A' }
        : getUserInfo(task?.updated_by || task?.created_by);
    const assignedToInfo = getUserInfo(task?.assigned_to);
    const displayTaskId = getTaskId(task);
    const statusName = getStatusName(task);
    // Get display name for status dropdown (only on task detail page)
    const displayStatusName = getDisplayStageName(statusName);

    // Get business name for business users (not CA accounts)
    const isBusinessUser = user?.role === 'CLIENT_USER' || user?.role === 'CLIENT_ADMIN' || user?.role === 'ENTITY_USER';
    let businessName = null;
    if (isBusinessUser) {
        businessName = user?.organization_name || user?.entity_name;
        if (!businessName && selectedOrg && organisations?.length > 0) {
            const org = organisations.find(o => o.id === selectedOrg || String(o.id) === String(selectedOrg));
            businessName = org?.name;
        }
    }

    // Get display name for header (same logic as TaskManagementPage)
    let displayOrgName = null;
    if (isBusinessUser) {
        displayOrgName = user?.organization_name || user?.entity_name;
    } else {
        // For CA users, show selected entity or organization (same logic as TaskManagementPage)
        // First, try to get selected entity name
        if (selectedEntity && entities?.length > 0) {
            const entity = entities.find(e => {
                const entityIdStr = String(e.id);
                const selectedIdStr = String(selectedEntity);
                return entityIdStr === selectedIdStr;
            });
            if (entity) {
                displayOrgName = entity.name;
            }
        }

        // If no entity selected, try to get organization name
        if (!displayOrgName && selectedOrg && organisations?.length > 0) {
            const org = organisations.find(o => {
                const orgIdStr = String(o.id);
                const selectedIdStr = String(selectedOrg);
                return orgIdStr === selectedIdStr;
            });
            if (org) {
                displayOrgName = org.name;
            }
        }
    }

    return (
        <div className="h-auto min-h-screen lg:h-[100dvh] p-4 md:p-8 text-white flex flex-col min-h-0 overflow-x-hidden lg:overflow-hidden">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-6 flex-shrink-0">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0">
                        <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                    <h1 className="text-2xl sm:text-3xl font-bold truncate">
                        Tasks
                    </h1>
                </div>
                {displayOrgName && (
                    <div className="w-full sm:w-auto text-center sm:text-left">
                        <span className="text-2xl sm:text-3xl font-bold truncate block">{displayOrgName}</span>
                    </div>
                )}
            </header>

            {/* Task Actions - Close Task Button */}
            {task && (
                <div className="mb-4 flex justify-end gap-2">
                    {/* Close Task Button - Show for assigned user if task is not completed and no pending request */}
                    {(() => {
                        // Check if user is assigned to this task
                        const isAssignedUser = task.assigned_to && String(task.assigned_to) === String(user?.id);
                        // Check if task is not completed (check both status and statusName)
                        const taskStatusLower = task.status?.toLowerCase() || '';
                        const statusNameLower = statusName?.toLowerCase() || '';
                        const isNotCompleted = taskStatusLower !== 'completed' &&
                            statusNameLower !== 'complete' &&
                            statusNameLower !== 'completed';
                        // Check if there's no pending closure request
                        const noPendingRequest = !closureRequest || closureRequest?.status !== 'pending';

                        // Debug logging
                        console.log('Close Button Visibility Check:', {
                            isAssignedUser,
                            taskAssignedTo: task.assigned_to,
                            currentUserId: user?.id,
                            isNotCompleted,
                            noPendingRequest,
                            taskStatusLower,
                            statusNameLower,
                            closureRequestStatus: closureRequest?.status
                        });

                        return isAssignedUser && isNotCompleted && noPendingRequest;
                    })() && (
                            <Button
                                onClick={() => setShowClosureRequestDialog(true)}
                                variant="outline"
                                size="default"
                                className="bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/30"
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Close
                            </Button>
                        )}
                    {/* Closure Request Review - Show for task creator if pending request exists */}
                    {task.created_by && String(task.created_by) === String(user?.id) && closureRequest?.status === 'pending' && (
                        <Button
                            onClick={() => setShowClosureReviewDialog(true)}
                            variant="outline"
                            size="default"
                            className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50 hover:bg-yellow-500/30"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Review Closure Request
                        </Button>
                    )}
                    {/* Show pending status if request is pending and user is assignee */}
                    {task.assigned_to && String(task.assigned_to) === String(user?.id) && closureRequest?.status === 'pending' && (
                        <Button
                            variant="outline"
                            size="default"
                            disabled
                            className="bg-gray-500/20 text-gray-300 border-gray-500/50"
                        >
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Pending Closure Request
                        </Button>
                    )}
                </div>
            )}

            {/* Task Summary Table - Same columns as Task List */}
            <div className="mb-6 flex-shrink-0">
                <Card className="glass-pane overflow-hidden rounded-2xl">
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="min-w-[1000px]">
                            <TableHeader>
                                <TableRow className="border-white/10">
                                    <TableHead>T.ID</TableHead>
                                    <TableHead>TASK DETAILS</TableHead>
                                    <TableHead>LAST UPDATE BY</TableHead>
                                    <TableHead>CREATED BY</TableHead>
                                    <TableHead>ASSIGNED TO</TableHead>
                                    <TableHead>STATUS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="border-white/10">
                                    {/* T.ID */}
                                    <TableCell>
                                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${task.has_unread_messages
                                            ? 'bg-pink-100 dark:bg-pink-900/30'
                                            : ''
                                            }`}
                                            style={task.has_unread_messages ? {
                                                animation: 'vibrate 0.8s ease-in-out infinite'
                                            } : {}}
                                        >
                                            {task.has_unread_messages && (
                                                <Bell
                                                    className="w-4 h-4 text-red-500"
                                                />
                                            )}
                                            <span className={`font-medium text-sm ${task.has_unread_messages
                                                ? 'text-purple-600 dark:text-purple-400'
                                                : 'text-white'
                                                }`}>
                                                {displayTaskId}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* TASK DETAILS */}
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium text-white">{task.title || 'Untitled Task'}</span>
                                            {task.due_date && (
                                                <span className="text-xs text-gray-400 italic">
                                                    {format(new Date(task.due_date), 'dd-MM-yyyy')} {task.due_time || '12:00 PM'}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* LAST UPDATE BY */}
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm text-white">{updatedByInfo.name}</span>
                                            {task.updated_at && (
                                                <>
                                                    <span className="text-xs text-gray-400 italic">
                                                        {format(new Date(task.updated_at), 'dd-MM-yyyy hh:mm a')}
                                                    </span>
                                                    <Badge variant="outline" className={`${getDateBadgeColor(task.updated_at)} text-xs w-fit italic`}>
                                                        {formatTimeAgo(task.updated_at)}
                                                    </Badge>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* CREATED BY */}
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm text-white">{createdByInfo.name}</span>
                                            {task.created_at && (
                                                <>
                                                    <span className="text-xs text-gray-400 italic">
                                                        {format(new Date(task.created_at), 'dd-MM-yyyy hh:mm a')}
                                                    </span>
                                                    <Badge variant="outline" className={`${getDateBadgeColor(task.created_at)} text-xs w-fit italic`}>
                                                        {formatTimeAgo(task.created_at)}
                                                    </Badge>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* ASSIGNED TO */}
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm text-white">{assignedToInfo.name}</span>
                                            {task.created_at && (
                                                <>
                                                    <span className="text-xs text-gray-400 italic">
                                                        {format(new Date(task.created_at), 'dd-MM-yyyy hh:mm a')}
                                                    </span>
                                                    <Badge variant="outline" className={`${getDateBadgeColor(task.created_at)} text-xs w-fit italic`}>
                                                        {formatTimeAgo(task.created_at)}
                                                    </Badge>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* STATUS */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {isLoadingStages ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                                            ) : availableStages.length > 0 ? (
                                                <div className="relative flex items-center gap-2">
                                                    {isUpdatingStage && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg z-10">
                                                            <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                                                        </div>
                                                    )}
                                                    <Combobox
                                                        options={availableStages.map(stage => ({
                                                            value: String(stage.id),
                                                            label: getDisplayStageName(stage.name) || 'Open',
                                                        }))}
                                                        value={task.stage_id ? String(task.stage_id) : ''}
                                                        onValueChange={handleStageChange}
                                                        placeholder={displayStatusName || "Select Stage"}
                                                        className="w-[180px]"
                                                        disabled={isUpdatingStage || displayStatusName === 'Close' || statusName?.toLowerCase() === 'complete' || statusName?.toLowerCase() === 'completed'}
                                                        displayValue={(option) => {
                                                            const stage = availableStages.find(s => String(s.id) === String(option.value));
                                                            return getDisplayStageName(stage?.name) || option.label || 'Open';
                                                        }}
                                                        style={getStageColorStyles()}
                                                    />
                                                    {/* Close Button - Show for assigned user if task is not completed and no pending request */}
                                                    {(() => {
                                                        const isAssignedUser = task.assigned_to && String(task.assigned_to) === String(user?.id);
                                                        const taskStatusLower = task.status?.toLowerCase() || '';
                                                        const statusNameLower = statusName?.toLowerCase() || '';
                                                        const isNotCompleted = taskStatusLower !== 'completed' &&
                                                            statusNameLower !== 'complete' &&
                                                            statusNameLower !== 'completed';
                                                        const noPendingRequest = !closureRequest || closureRequest?.status !== 'pending';

                                                        return isAssignedUser && isNotCompleted && noPendingRequest;
                                                    })() && (
                                                            <Button
                                                                onClick={() => setShowClosureRequestDialog(true)}
                                                                variant="outline"
                                                                size="sm"
                                                                className="bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/30"
                                                                title="Request to complete this task"
                                                            >
                                                                <XCircle className="w-4 h-4 mr-1" />
                                                                Close
                                                            </Button>
                                                        )}
                                                </div>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className={task.stage?.color ? '' : `inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium w-fit ${getStatusColor(task).className || ''}`}
                                                    style={task.stage?.color ? getStatusColor(task) : {}}
                                                >
                                                    {displayStatusName}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="flex-1 min-h-0">
                {/* Responsive Grid Layout: 1 col (mobile), 2 cols (tablet), 4 cols (desktop) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-4 md:gap-6 h-auto lg:h-full min-h-0 overflow-visible lg:overflow-hidden">
                    {/* Task Chat - Full width on mobile, 2 cols on desktop */}
                    <Card className="glass-pane card-hover flex flex-col overflow-hidden rounded-2xl md:col-span-2 lg:row-span-2 h-[500px] lg:h-full">
                        <CardHeader className="flex-shrink-0"><CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Task Chat</CardTitle></CardHeader>
                        <CardContent className="flex-1 flex flex-col overflow-hidden min-h-0">
                            <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 min-h-0" style={{ overflowX: 'visible' }}>
                                {isLoadingComments ? (
                                    <div className="flex justify-center items-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : comments.length > 0 ? (
                                    comments.map((comment, index) => {
                                        // Robust ID comparison
                                        const currentUserId = (user?.id || user?.sub || user?.user_id) ? String(user?.id || user?.sub || user?.user_id).toLowerCase() : '';
                                        const commentUserId = comment.user_id ? String(comment.user_id).toLowerCase() : '';
                                        const isOwnComment = currentUserId && commentUserId && currentUserId === commentUserId;
                                        const commentUser = teamMembers.find(m =>
                                            m.user_id === comment.user_id ||
                                            String(m.user_id) === String(comment.user_id) ||
                                            m.id === comment.user_id ||
                                            String(m.id) === String(comment.user_id)
                                        ) || { name: user?.name || 'You', email: user?.email || '' };

                                        // Check if previous message is from same user to group messages
                                        const prevComment = index > 0 ? comments[index - 1] : null;
                                        const isGrouped = prevComment && prevComment.user_id === comment.user_id;

                                        // Format timestamp like WhatsApp
                                        const messageDate = new Date(comment.created_at);
                                        const now = new Date();
                                        const isToday = messageDate.toDateString() === now.toDateString();
                                        const isYesterday = new Date(now.getTime() - 86400000).toDateString() === messageDate.toDateString();
                                        let timeStr = format(messageDate, 'HH:mm');
                                        if (isToday) {
                                            timeStr = format(messageDate, 'HH:mm');
                                        } else if (isYesterday) {
                                            timeStr = `Yesterday, ${format(messageDate, 'HH:mm')}`;
                                        } else {
                                            timeStr = format(messageDate, 'dd-MM-yyyy, HH:mm');
                                        }

                                        return (
                                            <div key={comment.id} className={`flex gap-2 ${isOwnComment ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-1' : 'mt-4'}`}>
                                                {/* Avatar - only show if not grouped */}
                                                {!isGrouped && (
                                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/60 flex items-center justify-center text-white font-semibold text-sm shadow-lg`}>
                                                        {(commentUser.name || commentUser.email || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                {isGrouped && <div className="w-10"></div>}

                                                <div className={`flex-1 ${isOwnComment ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                                                    {/* User name - only show if not grouped */}
                                                    {!isGrouped && (
                                                        <div className={`mb-1 ${isOwnComment ? 'text-right' : 'text-left'}`}>
                                                            <span className={`text-sm font-bold ${getUserNameColor(comment.user_id)}`}>
                                                                {commentUser.name || commentUser.email || 'Unknown'}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Message bubble - WhatsApp style */}
                                                    <div className={`relative inline-block max-w-[75%] ${isOwnComment ? 'bg-blue-500/20 text-white border border-blue-500/50' : 'bg-white/10 text-white border border-white/20'} rounded-lg shadow-sm`} style={{
                                                        borderRadius: isOwnComment
                                                            ? (isGrouped ? '7px 7px 2px 7px' : '7px 7px 2px 7px')
                                                            : (isGrouped ? '2px 7px 7px 7px' : '7px 7px 7px 2px')
                                                    }}>
                                                        <div className="p-2 pb-1">
                                                            {comment.attachment_url && (
                                                                <div className="mb-2">
                                                                    {comment.attachment_type?.startsWith('image/') || comment.attachment_url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? (
                                                                        // Image attachment - show inline like WhatsApp
                                                                        <div className="rounded-lg overflow-hidden relative">
                                                                            {loadingImages.has(comment.id) && (
                                                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                                                                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                                                                                </div>
                                                                            )}
                                                                            <img
                                                                                src={comment.attachment_url}
                                                                                alt={comment.attachment_name || "Image"}
                                                                                className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                                                onClick={() => setPreviewAttachment({
                                                                                    url: comment.attachment_url,
                                                                                    name: comment.attachment_name || 'Image',
                                                                                    type: comment.attachment_type || 'image'
                                                                                })}
                                                                                onLoad={() => {
                                                                                    setLoadingImages(prev => {
                                                                                        const newSet = new Set(prev);
                                                                                        newSet.delete(comment.id);
                                                                                        return newSet;
                                                                                    });
                                                                                }}
                                                                                onLoadStart={() => {
                                                                                    setLoadingImages(prev => new Set(prev).add(comment.id));
                                                                                }}
                                                                                onError={(e) => {
                                                                                    setLoadingImages(prev => {
                                                                                        const newSet = new Set(prev);
                                                                                        newSet.delete(comment.id);
                                                                                        return newSet;
                                                                                    });
                                                                                    e.target.style.display = 'none';
                                                                                    if (e.target.nextSibling) {
                                                                                        e.target.nextSibling.style.display = 'flex';
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <div className="hidden items-center gap-2 p-3 bg-white/5 rounded-lg">
                                                                                <ImageIcon className="w-5 h-5 text-gray-400" />
                                                                                <a
                                                                                    href={comment.attachment_url}
                                                                                    download={comment.attachment_name}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="flex items-center gap-2 text-sm text-primary hover:underline flex-1"
                                                                                >
                                                                                    <span>{comment.attachment_name || 'Download Image'}</span>
                                                                                    <Download className="w-4 h-4" />
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        // Non-image attachment - show download option like WhatsApp
                                                                        <div className="flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-lg">
                                                                            <div className="flex-shrink-0">
                                                                                {comment.attachment_type === 'application/pdf' ? (
                                                                                    <FileText className="w-8 h-8 text-red-500" />
                                                                                ) : comment.attachment_type?.includes('word') || comment.attachment_url.match(/\.(doc|docx)$/i) ? (
                                                                                    <FileText className="w-8 h-8 text-blue-500" />
                                                                                ) : comment.attachment_type?.includes('excel') || comment.attachment_type?.includes('spreadsheet') || comment.attachment_url.match(/\.(xls|xlsx)$/i) ? (
                                                                                    <FileText className="w-8 h-8 text-blue-500" />
                                                                                ) : (
                                                                                    <FileText className="w-8 h-8 text-gray-400" />
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-medium text-white truncate">
                                                                                    {comment.attachment_name || 'Attachment'}
                                                                                </p>
                                                                                {comment.attachment_type && (
                                                                                    <p className="text-xs text-gray-400">
                                                                                        {comment.attachment_type.split('/')[1]?.toUpperCase() || 'FILE'}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <button
                                                                                    onClick={() => setPreviewAttachment({
                                                                                        url: comment.attachment_url,
                                                                                        name: comment.attachment_name || 'Attachment',
                                                                                        type: comment.attachment_type
                                                                                    })}
                                                                                    className="flex-shrink-0 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                                                                    title="Preview"
                                                                                >
                                                                                    <Eye className="w-5 h-5 text-white" />
                                                                                </button>
                                                                                <a
                                                                                    href={comment.attachment_url}
                                                                                    download={comment.attachment_name}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="flex-shrink-0 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                                                                    title="Download"
                                                                                >
                                                                                    <Download className="w-5 h-5 text-white" />
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {comment.message && (
                                                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-white">{comment.message}</p>
                                                            )}
                                                        </div>

                                                        {/* Timestamp and read receipt - bottom right */}
                                                        <div className={`flex items-center justify-end gap-1 px-2 pb-1`}>
                                                            <span className="text-[10px] text-gray-400">
                                                                {timeStr}
                                                            </span>
                                                            {/* Show read receipts only for sender's own messages */}
                                                            {isOwnComment && (
                                                                <TooltipProvider>
                                                                    <Tooltip delayDuration={300}>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                onMouseEnter={() => handleFetchReadReceipts(comment.id)}
                                                                                className="text-[10px] text-gray-400 hover:text-gray-300 cursor-pointer ml-1 flex items-center"
                                                                            >
                                                                                {/* Single tick if not read, double tick if read */}
                                                                                {(() => {
                                                                                    const receipts = readReceipts[comment.id] || comment.read_receipts || comment.read_by || [];
                                                                                    const hasRead = Array.isArray(receipts) && receipts.some(r => {
                                                                                        const userId = r.user_id || r.id || (typeof r !== 'object' ? r : null);
                                                                                        return userId && String(userId) !== String(user?.id);
                                                                                    });

                                                                                    return hasRead ? (
                                                                                        <span className="text-blue-400">✓✓</span>
                                                                                    ) : (
                                                                                        <span className="text-gray-500">✓</span>
                                                                                    );
                                                                                })()}
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent
                                                                            side="bottom"
                                                                            align="end"
                                                                            className="bg-slate-900/95 backdrop-blur-md border border-white/10 shadow-xl p-0 max-w-xs z-[9999]"
                                                                            sideOffset={8}
                                                                            alignOffset={-10}
                                                                            onOpenAutoFocus={(e) => e.preventDefault()}
                                                                            collisionPadding={10}
                                                                        >
                                                                            <div className="p-3">
                                                                                <div className="text-xs font-semibold text-white mb-2 pb-2 border-b border-white/10">
                                                                                    Read By
                                                                                </div>
                                                                                {isLoadingReadReceipts ? (
                                                                                    <div className="flex justify-center items-center py-4">
                                                                                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                                                                                    </div>
                                                                                ) : readReceipts[comment.id]?.length > 0 ? (
                                                                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                                                                        {readReceipts[comment.id].map((receipt, idx) => (
                                                                                            <div key={idx} className="flex items-start gap-2 py-1">
                                                                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                                                                                    {(receipt.name || receipt.email || 'U').charAt(0).toUpperCase()}
                                                                                                </div>
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <div className="text-xs font-medium text-white truncate">
                                                                                                        {receipt.name || 'Unknown'}
                                                                                                    </div>
                                                                                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                                                                                        {(() => {
                                                                                                            try {
                                                                                                                const readDate = new Date(receipt.read_at);
                                                                                                                const hours = readDate.getHours();
                                                                                                                const minutes = readDate.getMinutes();
                                                                                                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                                                                                                const displayHours = hours % 12 || 12;
                                                                                                                const displayMinutes = minutes.toString().padStart(2, '0');
                                                                                                                const dateStr = format(readDate, 'dd-MM-yyyy');
                                                                                                                return `${displayHours}:${displayMinutes} ${hours >= 12 ? 'PM' : 'AM'}, ${dateStr}`;
                                                                                                            } catch (e) {
                                                                                                                return receipt.read_at ? format(new Date(receipt.read_at), 'h:mm a, dd-MM-yyyy') : 'N/A';
                                                                                                            }
                                                                                                        })()}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-xs text-gray-400 py-2">
                                                                                        No one has read this message yet.
                                                                                    </div>
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
                                    })
                                ) : (
                                    <div className="text-center py-8 text-gray-400">No comments yet. Start the conversation!</div>
                                )}
                                {/* Invisible element to scroll to */}
                                <div ref={chatMessagesEndRef} />
                            </div>
                            {/* File preview if selected */}
                            {selectedFile && (
                                <div className="mb-2 p-2 bg-white/5 rounded-lg flex items-center gap-2">
                                    {filePreview ? (
                                        <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                                    ) : (
                                        <FileText className="w-8 h-8 text-gray-400" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-white truncate">{selectedFile.name}</p>
                                        <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-gray-400 hover:text-red-400"
                                        onClick={handleRemoveFile}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}

                            <div className="flex items-center gap-2 border-t border-white/10 pt-4 pb-2 flex-shrink-0">
                                <input
                                    type="file"
                                    id="file-input"
                                    ref={(input) => {
                                        if (input) {
                                            // Store ref for programmatic access
                                            window.fileInputRef = input;
                                        }
                                    }}
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-400 hover:text-white flex-shrink-0 h-10 w-10"
                                    onClick={() => {
                                        const fileInput = document.getElementById('file-input');
                                        if (fileInput) {
                                            fileInput.click();
                                        }
                                    }}
                                    title="Attach file"
                                >
                                    <Paperclip className="w-5 h-5" />
                                </Button>
                                <Input
                                    placeholder="Type your message..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendComment();
                                        }
                                    }}
                                    className="flex-1 bg-white/10 text-white border-2 border-blue-500/50 rounded-full h-10 px-4 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400"
                                />
                                <Button
                                    onClick={handleSendComment}
                                    disabled={isSendingComment}
                                    className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white p-0"
                                >
                                    {isSendingComment ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Checklists - Column 3, Row 1 (col-span-1, row-span-1) - Green Box */}
                    <Card className="glass-pane card-hover overflow-hidden rounded-2xl flex flex-col md:col-span-1 lg:col-span-1 lg:row-span-1 border-2 border-green-500/50 h-[400px] lg:h-full">
                        <CardHeader className="flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    Checklists
                                </CardTitle>
                                <Dialog open={showAddChecklistDialog} onOpenChange={setShowAddChecklistDialog}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="p-2">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="glass-pane">
                                        <DialogHeader>
                                            <DialogTitle>Add New Checklist Item</DialogTitle>
                                            <DialogDescription>Enter the checklist item name below</DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4">
                                            <Input
                                                placeholder="Add a new checklist item..."
                                                value={newChecklistItem}
                                                onChange={(e) => setNewChecklistItem(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && !isAddingChecklistItem && handleAddChecklistItem()}
                                                className="glass-input"
                                                disabled={isAddingChecklistItem}
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                    setShowAddChecklistDialog(false);
                                                    setNewChecklistItem('');
                                                }}
                                                disabled={isAddingChecklistItem}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleAddChecklistItem}
                                                disabled={!newChecklistItem.trim() || isAddingChecklistItem}
                                            >
                                                {isAddingChecklistItem ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Adding...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-4 h-4 mr-2" /> Add
                                                    </>
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 overflow-hidden">
                            {isUpdatingChecklist && (
                                <div className="flex justify-center items-center py-2 mb-2 flex-shrink-0">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                </div>
                            )}
                            {task.checklist?.enabled && task.checklist?.items && task.checklist.items.length > 0 ? (
                                <div className="space-y-2 h-full overflow-y-auto">
                                    {[...(task.checklist.items || [])]
                                        .map((item, index) => {
                                            // draggable related styles and handlers
                                            const isDragging = draggedChecklistIndex === index;

                                            // Use created_by if available, otherwise assigned_to, otherwise task.created_by
                                            const checklistCreatorId = item.created_by || item.assigned_to || task.created_by;
                                            const checklistCreator = getUserInfo(checklistCreatorId);
                                            return (
                                                <div
                                                    key={index}
                                                    className={`flex flex-col gap-1 p-2 rounded-md bg-white/5 transition-colors hover:bg-white/10 ${isDragging ? 'opacity-50' : ''}`}
                                                    draggable={!isUpdatingChecklist}
                                                    onDragStart={(e) => handleChecklistDragStart(e, index)}
                                                    onDragOver={handleChecklistDragOver}
                                                    onDrop={(e) => handleChecklistDrop(e, index)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Checkbox
                                                            id={`checklist-${index}`}
                                                            checked={item.is_completed || false}
                                                            onCheckedChange={(checked) => handleToggleChecklistItem(index, checked)}
                                                            disabled={isUpdatingChecklist}
                                                        />
                                                        <label htmlFor={`checklist-${index}`} className={`flex-grow text-sm ${item.is_completed ? 'line-through text-gray-500' : 'text-white'}`}>
                                                            {item.name}
                                                        </label>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 h-8 w-8">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="glass-pane">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                    <AlertDialogDescription>This will permanently delete the checklist item.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteChecklistItem(index)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                    <p className="text-xs text-gray-400 italic ml-7">
                                                        Added by <span className="text-white">{checklistCreator.name}</span>
                                                    </p>
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : (
                                <p className="text-center text-gray-400 py-4">No checklist items yet.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Due Date & Recurring - Column 3, Row 2 (col-span-1, row-span-1) - Merged Card */}
                    <Card className="glass-pane card-hover overflow-hidden rounded-2xl flex flex-col md:col-span-1 lg:col-span-1 lg:row-span-1 border-2 border-purple-500/50 h-[400px] lg:h-full">
                        <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col p-6">
                            {/* Due Date Section - Top */}
                            <div className="flex flex-col border-b border-white/10 pb-6 mb-6 flex-1 min-h-0">
                                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                    <CardTitle className="flex items-center gap-2">
                                        <CalendarIcon className="w-5 h-5" />
                                        Due Date
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" className="p-2" onClick={handleEditDueDate}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                                    {task?.due_date ? (
                                        <div className="text-center space-y-2">
                                            <div className="text-xl font-bold text-white">
                                                {format(new Date(task.due_date), 'MMM dd, yyyy')}
                                            </div>
                                            {(() => {
                                                const days = getDaysUntilDueDate();
                                                if (days === null) return null;
                                                const isOverdue = days < 0;
                                                const isToday = days === 0;
                                                const isSoon = days > 0 && days <= 7;

                                                return (
                                                    <div className={`text-sm font-semibold ${isOverdue ? 'text-red-400' :
                                                        isToday ? 'text-yellow-400' :
                                                            isSoon ? 'text-orange-400' :
                                                                'text-green-400'
                                                        }`}>
                                                        {isOverdue ? `${Math.abs(days)} days overdue` :
                                                            isToday ? 'Due today' :
                                                                isSoon ? `${days} days remaining` :
                                                                    `${days} days remaining`}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <p className="text-sm">No due date set</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recurring Section - Bottom */}
                            <div className="flex flex-col flex-1 min-h-0">
                                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                    <CardTitle className="flex items-center gap-2">
                                        <Repeat className="w-5 h-5" />
                                        Recurring
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" className="p-2" onClick={handleEditRecurring}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                                    {(task?.is_recurring || task?.is_recurring === 1 || task?.is_recurring === '1') ? (
                                        <div className="text-center space-y-2">
                                            <div className="text-xl font-bold text-white">
                                                {formatRecurringDetails() || 'Recurring'}
                                            </div>
                                            <div className="text-sm font-semibold text-blue-400">
                                                Recurring Task
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <p className="text-sm">Not a recurring task</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Collaborate - Column 4, Row 1 (col-span-1, row-span-1) - Red Box */}
                    <Card className="glass-pane card-hover overflow-hidden rounded-2xl flex flex-col md:col-span-1 lg:col-span-1 lg:row-span-1 border-2 border-red-500/50 h-[400px] lg:h-full">
                        <CardHeader className="flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <CardTitle>Collaborate</CardTitle>
                                <Dialog open={showAddCollaboratorDialog} onOpenChange={setShowAddCollaboratorDialog}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="p-2">
                                            <UserPlus className="w-4 h-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="glass-pane">
                                        <DialogHeader>
                                            <DialogTitle>Add Collaborator</DialogTitle>
                                            <DialogDescription>Select a team member to add as a collaborator</DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4">
                                            <Combobox
                                                options={teamMembers
                                                    .filter(m => {
                                                        // Exclude already assigned user, creator, and existing collaborators
                                                        const userId = m.user_id || m.id;
                                                        return userId !== task.assigned_to &&
                                                            userId !== task.created_by &&
                                                            !collaborators.some(c => c.user_id === userId);
                                                    })
                                                    .map(m => ({
                                                        value: m.user_id || m.id,
                                                        label: `${m.name || m.full_name || m.email} (${m.role || m.department || 'N/A'})`
                                                    }))}
                                                value={selectedCollaboratorId}
                                                onValueChange={setSelectedCollaboratorId}
                                                placeholder="Select a collaborator..."
                                                className="mb-2"
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                    setShowAddCollaboratorDialog(false);
                                                    setSelectedCollaboratorId('');
                                                }}
                                                disabled={isAddingCollaborator}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleAddCollaborator}
                                                disabled={!selectedCollaboratorId || isAddingCollaborator}
                                            >
                                                {isAddingCollaborator ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Adding...
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus className="w-4 h-4 mr-2" /> Add Collaborator
                                                    </>
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col">
                            {isLoadingCollaborators ? (
                                <div className="flex justify-center items-center py-4 flex-shrink-0">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                                    {collaborators.length > 0 ? (
                                        collaborators.map((collab) => {
                                            const collabUser = teamMembers.find(m =>
                                                (m.user_id || m.id) === collab.user_id
                                            ) || { name: 'Unknown', email: 'N/A', role: 'N/A' };

                                            return (
                                                <div key={collab.id} className="flex items-center justify-between p-2 rounded-md bg-white/5 hover:bg-white/10">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                                                            {(collabUser.name || collabUser.email || 'U').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-white">
                                                                {collabUser.name || collabUser.email || 'Unknown'}
                                                            </p>
                                                            <p className="text-xs text-gray-400 italic">
                                                                {collabUser.role || collabUser.department || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                                                        onClick={() => handleRemoveCollaborator(collab.user_id)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-center text-gray-400 py-4">No collaborators yet. Add collaborators to share this task.</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Activity Log - Column 4, Row 2 (col-span-1, row-span-1) - Blue Box */}
                    <Card className="glass-pane card-hover overflow-hidden rounded-2xl flex flex-col md:col-span-1 lg:col-span-1 lg:row-span-1 border-2 border-blue-500/50 h-[400px] lg:h-full">
                        <CardHeader className="flex-shrink-0">
                            <CardTitle className="flex items-center gap-2">
                                <History className="w-5 h-5" />
                                Activity Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col">
                            {isHistoryLoading ? (
                                <div className="flex justify-center items-center py-8 flex-shrink-0">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : (() => {
                                // Filter out comment-related events (chat history)
                                const filteredHistory = history.filter(item =>
                                    item.event_type !== 'comment_added' &&
                                    item.event_type !== 'comment_updated' &&
                                    item.event_type !== 'comment_deleted'
                                );
                                return filteredHistory.length > 0 ? (
                                    <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
                                        {filteredHistory.map(renderHistoryItem)}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400 flex-shrink-0">No history found for this task.</div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Edit Due Date Dialog */}
            <Dialog open={showEditDueDateDialog} onOpenChange={setShowEditDueDateDialog}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle>Edit Due Date</DialogTitle>
                        <DialogDescription>Select a new due date for this task</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="due-date">Due Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !editingDueDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {editingDueDate ? format(editingDueDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={editingDueDate}
                                        onSelect={setEditingDueDate}
                                        disabled={(date) => date < new Date().setHours(0, 0, 0, 0)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowEditDueDateDialog(false);
                            setEditingDueDate(null);
                        }} disabled={isUpdatingDueDate}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveDueDate} disabled={isUpdatingDueDate}>
                            {isUpdatingDueDate ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close Task Confirmation Dialog */}
            <Dialog open={showCloseConfirmationDialog} onOpenChange={setShowCloseConfirmationDialog}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle>Are You Sure You Want To Close This Task?</DialogTitle>
                        <DialogDescription>
                            This will mark the task as complete. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowCloseConfirmationDialog(false);
                            setPendingCloseStageId(null);
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmClose} className="bg-red-500 hover:bg-red-600" disabled={isUpdatingStage}>
                            {isUpdatingStage ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Closing...
                                </>
                            ) : (
                                'Yes, Close Task'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Recurring Details Dialog */}
            <Dialog open={showEditRecurringDialog} onOpenChange={setShowEditRecurringDialog}>
                <DialogContent className="glass-pane max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Recurring Schedule</DialogTitle>
                        <DialogDescription>Update the recurring task schedule configuration</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is_recurring"
                                checked={recurringFormData.is_recurring}
                                onCheckedChange={(checked) => handleRecurringFormChange('is_recurring', checked)}
                                disabled={isUpdatingRecurring}
                            />
                            <Label htmlFor="is_recurring" className="cursor-pointer">Make this task recurring</Label>
                        </div>

                        {recurringFormData.is_recurring && (
                            <div className="space-y-4 mt-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <Label htmlFor="recurrence_frequency">Frequency</Label>
                                        <Select
                                            value={recurringFormData.recurrence_frequency}
                                            onValueChange={(v) => {
                                                handleRecurringFormChange('recurrence_frequency', v);
                                                // Reset dependent fields when frequency changes
                                                if (v !== 'daily') {
                                                    handleRecurringFormChange('recurrence_time', '09:00');
                                                }
                                                if (v !== 'weekly') {
                                                    handleRecurringFormChange('recurrence_day_of_week', null);
                                                }
                                                if (!['monthly', 'yearly'].includes(v)) {
                                                    handleRecurringDateChange('recurrence_date', null);
                                                }
                                                if (!['quarterly', 'half_yearly'].includes(v)) {
                                                    handleRecurringFormChange('recurrence_day_of_month', null);
                                                }
                                            }}
                                            disabled={isUpdatingRecurring}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="daily">Daily</SelectItem>
                                                <SelectItem value="weekly">Weekly</SelectItem>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                                <SelectItem value="half_yearly">Half Yearly</SelectItem>
                                                <SelectItem value="yearly">Yearly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* <div>
                                        <Label htmlFor="recurrence_start_date">Start Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !recurringFormData.recurrence_start_date && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {recurringFormData.recurrence_start_date ? format(recurringFormData.recurrence_start_date, "PPP") : <span>Pick a start date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={recurringFormData.recurrence_start_date}
                                                    onSelect={(d) => handleRecurringDateChange('recurrence_start_date', d)}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div> */}
                                </div>

                                {recurringFormData.recurrence_frequency === 'daily' && (
                                    <div>
                                        <Label htmlFor="recurrence_time">Time</Label>
                                        <Input
                                            id="recurrence_time"
                                            name="recurrence_time"
                                            type="time"
                                            value={recurringFormData.recurrence_time || '09:00'}
                                            onChange={(e) => handleRecurringFormChange('recurrence_time', e.target.value)}
                                            disabled={isUpdatingRecurring}
                                            className="w-full"
                                        />
                                    </div>
                                )}

                                {recurringFormData.recurrence_frequency === 'weekly' && (
                                    <div>
                                        <Label htmlFor="recurrence_day_of_week">Day of Week</Label>
                                        <Select
                                            value={recurringFormData.recurrence_day_of_week !== null ? String(recurringFormData.recurrence_day_of_week) : ''}
                                            onValueChange={(v) => handleRecurringFormChange('recurrence_day_of_week', v ? parseInt(v) : null)}
                                            disabled={isUpdatingRecurring}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">Monday</SelectItem>
                                                <SelectItem value="1">Tuesday</SelectItem>
                                                <SelectItem value="2">Wednesday</SelectItem>
                                                <SelectItem value="3">Thursday</SelectItem>
                                                <SelectItem value="4">Friday</SelectItem>
                                                <SelectItem value="5">Saturday</SelectItem>
                                                <SelectItem value="6">Sunday</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {['monthly', 'yearly'].includes(recurringFormData.recurrence_frequency) && (
                                    <div>
                                        <Label htmlFor="recurrence_date">
                                            {recurringFormData.recurrence_frequency === 'monthly' ? 'Date (Day of Month)' : 'Date'}
                                        </Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !recurringFormData.recurrence_date && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {recurringFormData.recurrence_date ? format(recurringFormData.recurrence_date, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={recurringFormData.recurrence_date}
                                                    onSelect={(d) => handleRecurringDateChange('recurrence_date', d)}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )}

                                {['quarterly', 'half_yearly'].includes(recurringFormData.recurrence_frequency) && (
                                    <div>
                                        <Label htmlFor="recurrence_day_of_month">
                                            Day of Month (repeats every {recurringFormData.recurrence_frequency === 'quarterly' ? '3 months' : '6 months'})
                                        </Label>
                                        <Select
                                            value={recurringFormData.recurrence_day_of_month !== null ? String(recurringFormData.recurrence_day_of_month) : ''}
                                            onValueChange={(v) => handleRecurringFormChange('recurrence_day_of_month', v ? parseInt(v) : null)}
                                            disabled={isUpdatingRecurring}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                                    <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowEditRecurringDialog(false);
                        }} disabled={isUpdatingRecurring}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveRecurring} disabled={isUpdatingRecurring}>
                            {isUpdatingRecurring ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Closure Request Dialog */}
            <Dialog open={showClosureRequestDialog} onOpenChange={setShowClosureRequestDialog}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle>Are You Sure You Want To Complete This Task?</DialogTitle>
                        <DialogDescription>
                            This will send a request to the task owner. Once approved, the task will be marked as Complete.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-white mb-2 block">Reason (Optional)</label>
                            <Textarea
                                placeholder="Enter reason for completing this task..."
                                value={closureReason}
                                onChange={(e) => setClosureReason(e.target.value)}
                                className="bg-white/10 border-white/20 text-white"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowClosureRequestDialog(false);
                            setClosureReason('');
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleRequestClosure} className="bg-red-500 hover:bg-red-600">
                            Yes, Complete Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Closure Review Dialog */}
            <Dialog open={showClosureReviewDialog} onOpenChange={setShowClosureReviewDialog}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle>Review Closure Request</DialogTitle>
                        <DialogDescription>
                            {closureRequest && (
                                <div className="mt-2">
                                    <p className="text-sm text-gray-300">
                                        Requested by: {getUserInfo(closureRequest.requested_by).name}
                                    </p>
                                    {closureRequest.reason && (
                                        <p className="text-sm text-gray-300 mt-2">
                                            Reason: {closureRequest.reason}
                                        </p>
                                    )}
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowClosureReviewDialog(false);
                                setClosureReason('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="outline"
                            className="bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/30"
                            onClick={() => handleReviewClosure('rejected')}
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                        </Button>
                        <Button
                            className="bg-blue-500 hover:bg-blue-600"
                            onClick={() => handleReviewClosure('approved')}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Attachment Preview Dialog */}
            <Dialog open={!!previewAttachment} onOpenChange={() => {
                setPreviewAttachment(null);
                // Clean up blob URL when dialog closes
                if (pdfBlobUrlRef.current) {
                    URL.revokeObjectURL(pdfBlobUrlRef.current);
                    pdfBlobUrlRef.current = null;
                    setPdfBlobUrl(null);
                }
            }}>
                <DialogContent className="glass-pane max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0">
                    <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-white/10">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-lg">{previewAttachment?.name || 'Preview'}</DialogTitle>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewAttachment?.url}
                                    download={previewAttachment?.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    title="Download"
                                >
                                    <Download className="w-5 h-5 text-white" />
                                </a>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setPreviewAttachment(null)}
                                    className="text-white hover:bg-white/10"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 overflow-hidden p-6">
                        {previewAttachment && (
                            <>
                                {previewAttachment.type?.startsWith('image/') || previewAttachment.url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? (
                                    <div className="h-full flex items-center justify-center">
                                        <img
                                            src={previewAttachment.url}
                                            alt={previewAttachment.name}
                                            className="max-w-full max-h-full object-contain rounded-lg"
                                        />
                                    </div>
                                ) : previewAttachment.type === 'application/pdf' || previewAttachment.url.match(/\.pdf$/i) ? (
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
                                                            className="bg-white/10 hover:bg-white/20 text-white"
                                                        >
                                                            Previous
                                                        </Button>
                                                        <span className="text-white px-4">
                                                            Page {currentPage} of {totalPages}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                            disabled={currentPage === totalPages}
                                                            className="bg-white/10 hover:bg-white/20 text-white"
                                                        >
                                                            Next
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <a
                                                            href={pdfBlobUrl || previewAttachment.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                                                        >
                                                            <Maximize2 className="w-4 h-4" />
                                                            Open in New Tab
                                                        </a>
                                                        <a
                                                            href={pdfBlobUrl || previewAttachment.url}
                                                            download={previewAttachment.name}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                            Download
                                                        </a>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center">
                                                <div className="text-center">
                                                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                                    <p className="text-white mb-4">Could not load PDF</p>
                                                    <a
                                                        href={previewAttachment.url}
                                                        download={previewAttachment.name}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Download PDF
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center">
                                        <FileText className="w-16 h-16 text-gray-400 mb-4" />
                                        <p className="text-white text-lg mb-2">{previewAttachment.name}</p>
                                        <p className="text-gray-400 text-sm mb-4">
                                            Preview not available for this file type
                                        </p>
                                        <a
                                            href={previewAttachment.url}
                                            download={previewAttachment.name}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download File
                                        </a>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TaskDashboardPage;