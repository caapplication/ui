import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useSocket } from '@/contexts/SocketContext.jsx';
import { getTaskDetails, startTaskTimer, stopTaskTimer, getTaskHistory, addTaskSubtask, updateTaskSubtask, deleteTaskSubtask, listClients, listServices, listTeamMembers, listTaskComments, createTaskComment, updateTaskComment, deleteTaskComment, addTaskCollaborator, removeTaskCollaborator, getTaskCollaborators } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Paperclip, Clock, Calendar, User, Tag, Flag, CheckCircle, FileText, List, MessageSquare, Briefcase, Users, Play, Square, History, Plus, Trash2, Send, Edit2, Bell, UserPlus, X, Download, Image as ImageIcon } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { format, formatDistanceToNow } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    const [task, setTask] = useState(null);
    const [history, setHistory] = useState([]);
    const [clients, setClients] = useState([]);
    const [services, setServices] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSendingComment, setIsSendingComment] = useState(false);
    const [loadingImages, setLoadingImages] = useState(new Set());
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [newSubtask, setNewSubtask] = useState('');
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
        if (!task || clients.length > 0 || services.length > 0 || teamMembers.length > 0) return;
        
        const loadRelatedData = async () => {
            try {
                const agencyId = user?.agency_id || null;
                const [clientsData, servicesData, teamData] = await Promise.allSettled([
                    listClients(agencyId, user.access_token).catch(() => ({ status: 'rejected' })),
                    listServices(agencyId, user.access_token).catch(() => ({ status: 'rejected' })),
                    listTeamMembers(user.access_token).catch(() => ({ status: 'rejected' })),
                ]);

                if (clientsData.status === 'fulfilled') {
                    const clientsList = Array.isArray(clientsData.value) ? clientsData.value : (clientsData.value?.items || []);
                    setClients(clientsList);
                }
                if (servicesData.status === 'fulfilled') {
                    const servicesList = Array.isArray(servicesData.value) ? servicesData.value : (servicesData.value?.items || []);
                    setServices(servicesList);
                }
                if (teamData.status === 'fulfilled') {
                    const teamList = Array.isArray(teamData.value) ? teamData.value : (teamData.value?.items || []);
                    setTeamMembers(teamList);
                }
            } catch (error) {
                console.error('Error loading related data:', error);
                // Don't show toast for related data failures - they're not critical
            }
        };
        
        loadRelatedData();
    }, [task, user?.agency_id, user?.access_token, user?.role, clients.length, services.length, teamMembers.length]);

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

    useEffect(() => {
        fetchTask();
        fetchHistory();
        fetchCollaborators();
    }, [fetchTask, fetchHistory, fetchCollaborators]);


    const handleAddSubtask = async () => {
        if (!newSubtask.trim()) return;
        const subtaskTitle = newSubtask.trim();
        setNewSubtask(''); // Clear input immediately for better UX
        
        try {
            const agencyId = user?.agency_id || null;
            const newSubtaskData = await addTaskSubtask(taskId, { title: subtaskTitle }, agencyId, user.access_token);
            // Optimistically add to UI
            if (task) {
                const updatedSubtasks = [...(task.subtasks || []), newSubtaskData];
                setTask({ ...task, subtasks: updatedSubtasks });
            }
            toast({ title: "Subtask Added", description: "The new subtask has been added." });
            // Silently refresh in background to ensure consistency
            const updatedTask = await getTaskDetails(taskId, agencyId, user.access_token);
            setTask(updatedTask);
        } catch (error) {
            setNewSubtask(subtaskTitle); // Restore input on error
            toast({ title: "Error adding subtask", description: error.message, variant: "destructive" });
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
            // Silently refresh task data in background without showing loading state
            const updatedTask = await getTaskDetails(taskId, agencyId, user.access_token);
            setTask(updatedTask);
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
            // Silently refresh in background
            const updatedTask = await getTaskDetails(taskId, agencyId, user.access_token);
            setTask(updatedTask);
        } catch (error) {
            // Revert optimistic update on error
            if (task && deletedSubtask) {
                const revertedSubtasks = [...(task.subtasks || []), deletedSubtask];
                setTask({ ...task, subtasks: revertedSubtasks });
            }
            toast({ title: "Error deleting subtask", description: error.message, variant: "destructive" });
        }
    };

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

    const handleAddCollaborator = async () => {
        if (!selectedCollaboratorId || isAddingCollaborator) return;
        setIsAddingCollaborator(true);
        try {
            const agencyId = user?.agency_id || null;
            await addTaskCollaborator(taskId, selectedCollaboratorId, agencyId, user.access_token);
            toast({ title: "Collaborator Added", description: "Collaborator has been added to the task." });
            setSelectedCollaboratorId('');
            setShowAddCollaborator(false);
            await fetchCollaborators();
            await fetchTask(); // Refresh task to update collaborators list
        } catch (error) {
            toast({ title: "Error adding collaborator", description: error.message, variant: "destructive" });
        } finally {
            setIsAddingCollaborator(false);
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
        if (!newComment.trim() && !selectedFile) return;
        if (isSendingComment) return; // Prevent double submission
        
        const commentText = newComment.trim();
        const fileToSend = selectedFile;
        
        setIsSendingComment(true);
        
        // Don't clear inputs yet - wait for success
        
        try {
            const agencyId = user?.agency_id || null;
            
            // Create FormData if file is attached
            let commentData;
            if (fileToSend) {
                const formData = new FormData();
                formData.append('message', commentText || '');
                formData.append('attachment', fileToSend);
                commentData = formData;
            } else {
                commentData = { message: commentText };
            }
            
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
                eventColor = "text-green-400";
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
                eventColor = "text-green-400";
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

        return (
            <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 transition-colors hover:bg-white/10">
                <EventIcon className={`h-5 w-5 ${eventColor} mt-1`} />
                <div className="flex-1">
                    <p className="text-sm text-white font-medium">{eventText}</p>
                    <p className="text-xs text-gray-400">{format(new Date(item.created_at), 'dd MMM yyyy, HH:mm')}</p>
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
        if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
            return { name: 'N/A', email: 'N/A', role: 'N/A' };
        }
        const userIdStr = String(userId).toLowerCase();
        const member = teamMembers.find(m => {
            if (!m) return false;
            const mUserId = m.user_id ? String(m.user_id).toLowerCase() : '';
            const mId = m.id ? String(m.id).toLowerCase() : '';
            return mUserId === userIdStr || mId === userIdStr;
        });
        if (!member) {
            return { name: 'N/A', email: 'N/A', role: 'N/A' };
        }
        return {
            name: member.name || member.full_name || member.email || 'N/A',
            email: member.email || 'N/A',
            role: member.role || member.department || 'N/A'
        };
    };

    const getAssigneeName = (userId) => {
        return getUserInfo(userId).name;
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

    const getStatusColor = (statusName) => {
        switch (statusName) {
            case 'To Do':
            case 'Assigned':
                return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
            case 'In Progress':
                return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
            case 'Complete':
            case 'Completed':
                return 'bg-green-500/20 text-green-300 border-green-500/50';
            case 'Blocked':
                return 'bg-red-500/20 text-red-300 border-red-500/50';
            default:
                return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
        }
    };

    // Get user info for display
    const createdByInfo = task.created_by_name 
        ? { name: task.created_by_name, email: 'N/A', role: task.created_by_role || getUserInfo(task.created_by).role || 'N/A' }
        : getUserInfo(task.created_by);
    const updatedByInfo = task.updated_by_name 
        ? { name: task.updated_by_name, email: 'N/A', role: task.updated_by_role || getUserInfo(task.updated_by || task.created_by).role || 'N/A' }
        : getUserInfo(task.updated_by || task.created_by);
    const assignedToInfo = getUserInfo(task.assigned_to);
    const displayTaskId = getTaskId(task);
    const statusName = getStatusName(task);

    return (
        <div className="p-4 md:p-8 text-white min-h-screen">
            <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-3xl font-extrabold">{task.title}</h1>
                </div>
            </header>

            {/* Task Summary Table - Same columns as Task List */}
            <div className="mb-6">
                <Card className="glass-pane overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/10">
                                    <TableHead>T.ID</TableHead>
                                    <TableHead>STATUS</TableHead>
                                    <TableHead>TASK DETAILS</TableHead>
                                    <TableHead>LAST UPDATE BY</TableHead>
                                    <TableHead>CREATED BY</TableHead>
                                    <TableHead>ASSIGNED TO</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="border-white/10">
                                    {/* T.ID */}
                                    <TableCell>
                                        <Badge variant="outline" className="bg-pink-500/20 text-pink-300 border-pink-500/50 text-xs font-medium inline-flex items-center gap-1">
                                            <Bell className="w-3 h-3" />
                                            {displayTaskId}
                                        </Badge>
                                    </TableCell>
                                    
                                    {/* STATUS */}
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <Badge 
                                                variant="outline" 
                                                className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium w-fit ${getStatusColor(statusName)}`}
                                            >
                                                {statusName}
                                            </Badge>
                                            <UserPlus className="w-4 h-4 text-gray-400" />
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
                                            <span className="text-xs text-gray-400 italic">{updatedByInfo.role}</span>
                                            {task.updated_at && (
                                                <>
                                                    <span className="text-xs text-gray-400 italic">
                                                        {format(new Date(task.updated_at), 'dd-MM-yyyy hh:mm a')}
                                                    </span>
                                                    <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/50 text-xs w-fit italic">
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
                                            <span className="text-xs text-gray-400 italic">{createdByInfo.role}</span>
                                            {task.created_at && (
                                                <>
                                                    <span className="text-xs text-gray-400 italic">
                                                        {format(new Date(task.created_at), 'dd-MM-yyyy hh:mm a')}
                                                    </span>
                                                    <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/50 text-xs w-fit italic">
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
                                            <span className="text-xs text-gray-400 italic">{assignedToInfo.role}</span>
                                            {task.due_date && (
                                                <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/50 text-xs w-fit italic">
                                                    {formatTimeUntil(task.due_date)}
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

            <div className="space-y-6">
                {/* Subtasks and Chat - Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Subtasks Box */}
                    <Card className="glass-pane card-hover overflow-hidden">
                        <CardHeader><CardTitle>Subtasks</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex gap-2 mb-4">
                                <Input 
                                    placeholder="Add a new subtask..."
                                    value={newSubtask}
                                    onChange={(e) => setNewSubtask(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                                    className="glass-input"
                                />
                                <Button onClick={handleAddSubtask}><Plus className="w-4 h-4 mr-2" /> Add</Button>
                            </div>
                            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                {task.subtasks?.length > 0 ? task.subtasks.map(sub => (
                                    <div key={sub.id} className="flex items-center gap-3 p-2 rounded-md bg-white/5 transition-colors hover:bg-white/10">
                                        <Checkbox 
                                            id={`subtask-${sub.id}`}
                                            checked={sub.is_completed}
                                            onCheckedChange={(checked) => handleToggleSubtask(sub.id, checked)}
                                        />
                                        <label htmlFor={`subtask-${sub.id}`} className={`flex-grow text-sm ${sub.is_completed ? 'line-through text-gray-500' : ''}`}>
                                            {sub.title || sub.name}
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
                                                    <AlertDialogDescription>This will permanently delete the subtask.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteSubtask(sub.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                )) : (
                                    <p className="text-center text-gray-400 py-4">No subtasks yet.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Collaborators Box */}
                    <Card className="glass-pane card-hover overflow-hidden">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Collaborators</CardTitle>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setShowAddCollaborator(!showAddCollaborator)}
                                >
                                    <UserPlus className="w-4 h-4 mr-2" /> Add
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {showAddCollaborator && (
                                <div className="mb-4 p-3 bg-white/5 rounded-lg">
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
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            onClick={handleAddCollaborator}
                                            disabled={!selectedCollaboratorId || isAddingCollaborator}
                                        >
                                            {isAddingCollaborator ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Adding...
                                                </>
                                            ) : (
                                                'Add Collaborator'
                                            )}
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost"
                                            onClick={() => {
                                                setShowAddCollaborator(false);
                                                setSelectedCollaboratorId('');
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                            
                            {isLoadingCollaborators ? (
                                <div className="flex justify-center items-center py-4">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="space-y-2">
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
                </div>

                {/* Chat and History - Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chat Box */}
                    <Card className="glass-pane card-hover flex flex-col overflow-hidden">
                        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Task Chat</CardTitle></CardHeader>
                        <CardContent className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2" style={{ maxHeight: '500px' }}>
                                {isLoadingComments ? (
                                    <div className="flex justify-center items-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : comments.length > 0 ? (
                                    comments.map((comment) => {
                                        const isOwnComment = comment.user_id === user?.id || String(comment.user_id) === String(user?.id);
                                        const commentUser = teamMembers.find(m => 
                                            m.user_id === comment.user_id || 
                                            String(m.user_id) === String(comment.user_id) ||
                                            m.id === comment.user_id ||
                                            String(m.id) === String(comment.user_id)
                                        ) || { name: user?.name || 'You', email: user?.email || '' };
                                        
                                        return (
                                            <div key={comment.id} className={`flex gap-3 ${isOwnComment ? 'flex-row-reverse' : ''}`}>
                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold`}>
                                                    {(commentUser.name || commentUser.email || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div className={`flex-1 ${isOwnComment ? 'text-right' : ''}`}>
                                                    {/* User name and time - outside the message box */}
                                                    <div className={`mb-1 ${isOwnComment ? 'text-right' : 'text-left'}`}>
                                                        <span className="text-xs text-gray-400 font-medium">
                                                            {commentUser.name || commentUser.email || 'Unknown'}
                                                        </span>
                                                        <span className="text-xs text-gray-500 mx-2">•</span>
                                                        <span className="text-xs text-gray-500">
                                                            {format(new Date(comment.created_at), 'MMM dd, HH:mm')}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Message box - only message content */}
                                                    <div className={`inline-block max-w-[80%] rounded-lg p-3 ${isOwnComment ? 'bg-primary/20 text-white' : 'bg-white/10 text-white'}`}>
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
                                                                            onClick={() => window.open(comment.attachment_url, '_blank')}
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
                                                                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                                                                        <div className="flex-shrink-0">
                                                                            {comment.attachment_type === 'application/pdf' ? (
                                                                                <FileText className="w-8 h-8 text-red-500" />
                                                                            ) : comment.attachment_type?.includes('word') || comment.attachment_url.match(/\.(doc|docx)$/i) ? (
                                                                                <FileText className="w-8 h-8 text-blue-500" />
                                                                            ) : comment.attachment_type?.includes('excel') || comment.attachment_type?.includes('spreadsheet') || comment.attachment_url.match(/\.(xls|xlsx)$/i) ? (
                                                                                <FileText className="w-8 h-8 text-green-500" />
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
                                                                        <a 
                                                                            href={comment.attachment_url} 
                                                                            download={comment.attachment_name}
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer"
                                                                            className="flex-shrink-0 p-2 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors"
                                                                            title="Download"
                                                                        >
                                                                            <Download className="w-5 h-5 text-primary" />
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {comment.message && (
                                                            <p className="text-sm whitespace-pre-wrap break-words">{comment.message}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-8 text-gray-400">No comments yet. Start the conversation!</div>
                                )}
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
                            
                            <div className="flex gap-2 border-t border-white/10 pt-4">
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
                                    className="text-gray-400 hover:text-white flex-shrink-0"
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
                                <Textarea
                                    placeholder="Type your message..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendComment();
                                        }
                                    }}
                                    className="flex-1 bg-white/10 border-white/20 text-white resize-none"
                                    rows={2}
                                />
                                <Button 
                                    onClick={handleSendComment} 
                                    disabled={(!newComment.trim() && !selectedFile) || isSendingComment} 
                                    className="self-end"
                                >
                                    {isSendingComment ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* History Box */}
                    <Card className="glass-pane card-hover overflow-hidden">
                        <CardHeader><CardTitle>Task History</CardTitle></CardHeader>
                        <CardContent>
                            {isHistoryLoading ? (
                                <div className="flex justify-center items-center py-8">
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
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                        {filteredHistory.map(renderHistoryItem)}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400">No history found for this task.</div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TaskDashboardPage;