import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getTaskDetails, startTaskTimer, stopTaskTimer, getTaskHistory, addTaskSubtask, updateTaskSubtask, deleteTaskSubtask, listClients, listServices, listTeamMembers, listTaskComments, createTaskComment, updateTaskComment, deleteTaskComment } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Paperclip, Clock, Calendar, User, Tag, Flag, CheckCircle, FileText, List, MessageSquare, Briefcase, Users, Play, Square, History, Plus, Trash2, Send, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
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
    const [isTimerLoading, setIsTimerLoading] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [newSubtask, setNewSubtask] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [timerStartTime, setTimerStartTime] = useState(null); // Store when timer started for real-time updates
    const [displayTime, setDisplayTime] = useState(0); // Current displayed time in seconds
    const [baseTime, setBaseTime] = useState(0); // Base time when timer started (before active timer)
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentText, setEditCommentText] = useState('');

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
        if (activeTab === 'chat') {
            fetchComments();
        }
    }, [activeTab, fetchComments]);

    useEffect(() => {
        fetchTask();
    }, [fetchTask]);

    // Real-time timer update when timer is running
    useEffect(() => {
        if (!task?.is_timer_running_for_me) {
            setTimerStartTime(null);
            setBaseTime(0);
            setDisplayTime(task?.total_logged_seconds || 0);
            return;
        }

        // If timer is running but we don't have start time, initialize it
        if (!timerStartTime && task.is_timer_running_for_me) {
            // Use current time as approximation - will be updated with actual start_time from API
            const now = new Date();
            setTimerStartTime(now);
            // Calculate base time: total_logged_seconds includes active timer, so we subtract elapsed
            // For now, use total_logged_seconds as base (will be corrected when we get actual start_time)
            setBaseTime(task.total_logged_seconds || 0);
            setDisplayTime(task.total_logged_seconds || 0);
        }

        // Update display time every second
        const interval = setInterval(() => {
            if (timerStartTime && task.is_timer_running_for_me) {
                const now = new Date();
                const elapsed = Math.floor((now - timerStartTime) / 1000);
                // Display = base_time + elapsed time since timer started
                setDisplayTime(baseTime + elapsed);
            } else if (task?.total_logged_seconds !== undefined) {
                setDisplayTime(task.total_logged_seconds || 0);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [task?.is_timer_running_for_me, task?.total_logged_seconds, timerStartTime, baseTime]);

    const handleTimerAction = async (action) => {
        setIsTimerLoading(true);
        
        // Store previous state for rollback
        const previousTimerState = task?.is_timer_running_for_me || false;
        
        // Optimistically update the UI first
        if (task) {
            const isStarting = action === 'start';
            if (isStarting) {
                // When starting, set the start time for real-time updates
                const now = new Date();
                setTimerStartTime(now);
                // Store base time (total_logged_seconds before timer starts)
                setBaseTime(task.total_logged_seconds || 0);
                setDisplayTime(task.total_logged_seconds || 0);
            } else {
                // When stopping, clear the start time
                setTimerStartTime(null);
                setBaseTime(0);
            }
            setTask({
                ...task,
                is_timer_running_for_me: isStarting,
            });
        }
        
        try {
            const agencyId = user?.agency_id || null;
            const actionFn = action === 'start' ? startTaskTimer : stopTaskTimer;
            const timerResponse = await actionFn(taskId, agencyId, user.access_token);
            
            // If starting, use the actual start_time from the API response
            if (action === 'start' && timerResponse?.start_time) {
                const actualStartTime = new Date(timerResponse.start_time);
                setTimerStartTime(actualStartTime);
                // Calculate base time: total_logged_seconds from backend includes active timer
                // So we need to subtract the elapsed time that's already included
                const now = new Date();
                const elapsed = Math.floor((now - actualStartTime) / 1000);
                // The backend's total_logged_seconds includes this elapsed time
                // So base_time = total_logged_seconds - elapsed
                // But we'll get the updated task data next, so we'll recalculate
            }
            
            toast({
                title: `Timer ${action === 'start' ? 'Started' : 'Stopped'}`,
                description: `The timer for this task has been successfully ${action === 'start' ? 'started' : 'stopped'}.`,
            });
            // Silently refresh task data in background without showing loading state
            const updatedTask = await getTaskDetails(taskId, agencyId, user.access_token);
            setTask(updatedTask);
            
            // Update display time and base time based on refreshed data
            if (action === 'stop') {
                setDisplayTime(updatedTask.total_logged_seconds || 0);
                setTimerStartTime(null);
                setBaseTime(0);
            } else if (action === 'start' && timerResponse?.start_time) {
                // Calculate base time: backend's total_logged_seconds includes active timer
                const actualStartTime = new Date(timerResponse.start_time);
                const now = new Date();
                const elapsed = Math.floor((now - actualStartTime) / 1000);
                // Base time is what total_logged_seconds was before the active timer started
                const calculatedBaseTime = (updatedTask.total_logged_seconds || 0) - elapsed;
                setBaseTime(Math.max(0, calculatedBaseTime));
                setDisplayTime(updatedTask.total_logged_seconds || 0);
            }
        } catch (error) {
            // Revert optimistic update on error
            if (task) {
                setTask({
                    ...task,
                    is_timer_running_for_me: previousTimerState, // Revert to previous state
                });
            }
            if (action === 'start') {
                setTimerStartTime(null);
            }
            toast({
                title: `Error ${action}ing timer`,
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsTimerLoading(false);
        }
    };

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

    const handleSendComment = async () => {
        if (!newComment.trim()) return;
        const commentText = newComment.trim();
        setNewComment('');
        
        try {
            const agencyId = user?.agency_id || null;
            const newCommentData = await createTaskComment(
                taskId,
                { message: commentText },
                agencyId,
                user.access_token
            );
            setComments([...comments, newCommentData]);
            toast({ title: "Comment Added", description: "Your comment has been posted." });
        } catch (error) {
            setNewComment(commentText);
            toast({ title: "Error adding comment", description: error.message, variant: "destructive" });
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
            case 'comment_added':
                eventText = item.details || `Comment added`;
                eventColor = "text-cyan-400";
                EventIcon = MessageSquare;
                break;
            case 'comment_updated':
                eventText = `Comment updated`;
                eventColor = "text-cyan-400";
                EventIcon = MessageSquare;
                break;
            case 'comment_deleted':
                eventText = `Comment deleted`;
                eventColor = "text-red-400";
                EventIcon = MessageSquare;
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

    const getAssigneeName = (userId) => {
        if (!userId || !Array.isArray(teamMembers)) return 'Unassigned';
        const member = teamMembers.find(m => 
            m.user_id === userId || 
            String(m.user_id) === String(userId) ||
            m.id === userId ||
            String(m.id) === String(userId)
        );
        return member?.name || member?.email || 'Unassigned';
    };

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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
                <TabsList className="mb-6 glass-tab-list self-start">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="subtasks">Subtasks</TabsTrigger>
                    <TabsTrigger value="timelog">Timelog</TabsTrigger>
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="history" onClick={fetchHistory}>History</TabsTrigger>
                </TabsList>
                <TabsContent value="dashboard" className="flex-grow overflow-y-auto pr-2 space-y-6">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                        <div className="lg:col-span-2 overflow-hidden">
                            <Card className="glass-pane overflow-hidden">
                                <CardHeader><CardTitle>Task Overview</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                     <OverviewCard Icon={Briefcase} label="Client" value={getClientName(task.client_id)} colorClass="bg-gradient-to-br from-blue-500/30 to-blue-800/30" />
                                     <OverviewCard Icon={Users} label="Service" value={getServiceName(task.service_id)} colorClass="bg-gradient-to-br from-purple-500/30 to-purple-800/30" />
                                     <OverviewCard Icon={User} label="Assignee" value={getAssigneeName(task.assigned_to)} colorClass="bg-gradient-to-br from-green-500/30 to-green-800/30" />
                                     <OverviewCard Icon={Flag} label="Priority" value={<Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>} colorClass="bg-gradient-to-br from-yellow-500/30 to-yellow-800/30" />
                                     <OverviewCard Icon={CheckCircle} label="Status" value={<Badge variant={getStatusVariant(task.status)}>{task.status}</Badge>} colorClass="bg-gradient-to-br from-teal-500/30 to-teal-800/30" />
                                     <OverviewCard Icon={Calendar} label="Due Date" value={task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy') : 'N/A'} colorClass="bg-gradient-to-br from-red-500/30 to-red-800/30" />
                                 </CardContent>
                            </Card>
                        </div>
                        <div className="space-y-6 overflow-hidden">
                            {task.description && (
                                 <Card className="glass-pane card-hover overflow-hidden">
                                    <CardHeader><CardTitle>Description</CardTitle></CardHeader>
                                    <CardContent>
                                        <p className="text-gray-300">{task.description}</p>
                                    </CardContent>
                                </Card>
                            )}
                             {task.tags?.length > 0 && (
                                <Card className="glass-pane card-hover overflow-hidden">
                                    <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
                                    <CardContent className="flex flex-wrap gap-2">
                                        {task.tags.map(tag => (
                                            <Badge key={tag.id} style={{ backgroundColor: tag.color || '#888', color: 'white' }}>{tag.name}</Badge>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}
                            {task.checklist?.enabled && task.checklist?.items?.length > 0 && (
                                <Card className="glass-pane card-hover overflow-hidden">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <span>Checklist</span>
                                            <Badge variant="outline" className="text-xs">
                                                {task.checklist.items.filter(item => item.is_completed).length}/{task.checklist.items.length}
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {task.checklist.items.map((item, index) => (
                                                <div key={index} className="flex items-center gap-3 p-2 rounded-md bg-white/5 transition-colors hover:bg-white/10">
                                                    <Checkbox 
                                                        id={`checklist-${index}`}
                                                        checked={item.is_completed || false}
                                                        disabled
                                                        className="cursor-not-allowed"
                                                    />
                                                    <label 
                                                        htmlFor={`checklist-${index}`} 
                                                        className={`flex-grow text-sm ${item.is_completed ? 'line-through text-gray-500' : 'text-white'}`}
                                                    >
                                                        {item.name}
                                                    </label>
                                                    {item.assigned_to && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {getAssigneeName(item.assigned_to)}
                                                        </Badge>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                         </div>
                    </div>
                     {task.requested_documents?.length > 0 && (
                        <Card className="glass-pane card-hover overflow-hidden mt-6">
                            <CardHeader><CardTitle>Requested Documents</CardTitle></CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {task.requested_documents.map(doc => (
                                        <li key={doc.id} className="flex items-center justify-between p-2 rounded-md bg-white/5">
                                            <span className="flex items-center"><FileText className="w-4 h-4 mr-2" />{doc.name}</span>
                                            <Badge variant={doc.status === 'received' ? 'success' : 'default'}>{doc.status}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="subtasks" className="flex-grow overflow-y-auto no-scrollbar pr-2">
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
                            <div className="space-y-2">
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
                </TabsContent>
                <TabsContent value="timelog" className="flex-grow overflow-y-auto pr-2">
                    <Card className="glass-pane card-hover overflow-hidden">
                        <CardHeader><CardTitle>Time Tracking</CardTitle></CardHeader>
                        <CardContent className="flex flex-col items-center justify-center space-y-6 p-8">
                            <div className="text-center">
                                <p className="text-lg text-gray-400">Total Time Logged</p>
                                <p className="text-6xl font-extrabold tracking-tighter text-primary">{formatSeconds(displayTime || task?.total_logged_seconds || 0)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg text-gray-400">Timer Status</p>
                                <Badge variant={task.is_timer_running_for_me ? 'success' : 'default'} className="text-xl px-4 py-2">
                                    {task.is_timer_running_for_me ? 'Running' : 'Stopped'}
                                </Badge>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <Button 
                                    size="lg" 
                                    onClick={() => handleTimerAction('start')} 
                                    disabled={task.is_timer_running_for_me || isTimerLoading}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isTimerLoading && !task.is_timer_running_for_me ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Play className="w-5 h-5 mr-2" />}
                                    Start Timer
                                </Button>
                                <Button 
                                    size="lg" 
                                    variant="destructive" 
                                    onClick={() => handleTimerAction('stop')} 
                                    disabled={!task.is_timer_running_for_me || isTimerLoading}
                                >
                                    {isTimerLoading && task.is_timer_running_for_me ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Square className="w-5 h-5 mr-2" />}
                                    Stop Timer
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="chat" className="flex-grow flex flex-col overflow-hidden">
                    <Card className="glass-pane card-hover flex-1 flex flex-col overflow-hidden">
                        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Task Chat</CardTitle></CardHeader>
                        <CardContent className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
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
                                                    <div className={`inline-block max-w-[80%] rounded-lg p-3 ${isOwnComment ? 'bg-primary/20 text-white' : 'bg-white/10 text-white'}`}>
                                                        {editingCommentId === comment.id ? (
                                                            <div className="space-y-2">
                                                                <Textarea
                                                                    value={editCommentText}
                                                                    onChange={(e) => setEditCommentText(e.target.value)}
                                                                    className="bg-white/10 border-white/20 text-white"
                                                                    rows={3}
                                                                />
                                                                <div className="flex gap-2 justify-end">
                                                                    <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                                                                    <Button size="sm" onClick={() => handleUpdateComment(comment.id)}>Save</Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="text-sm whitespace-pre-wrap break-words">{comment.message}</p>
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {commentUser.name || commentUser.email || 'Unknown'} • {format(new Date(comment.created_at), 'MMM dd, HH:mm')}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                    {isOwnComment && editingCommentId !== comment.id && (
                                                        <div className="flex gap-2 mt-1 justify-end">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 px-2 text-xs text-gray-400 hover:text-white"
                                                                onClick={() => handleStartEditComment(comment)}
                                                            >
                                                                <Edit2 className="w-3 h-3 mr-1" /> Edit
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-6 px-2 text-xs text-gray-400 hover:text-red-400"
                                                                    >
                                                                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent className="glass-pane">
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                                                                        <AlertDialogDescription>Are you sure you want to delete this comment? This action cannot be undone.</AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDeleteComment(comment.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-8 text-gray-400">No comments yet. Start the conversation!</div>
                                )}
                            </div>
                            <div className="flex gap-2 border-t border-white/10 pt-4">
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
                                    rows={3}
                                />
                                <Button onClick={handleSendComment} disabled={!newComment.trim()} className="self-end">
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="history" className="flex-grow overflow-y-auto pr-2">
                     <Card className="glass-pane card-hover overflow-hidden">
                        <CardHeader><CardTitle>Task History</CardTitle></CardHeader>
                        <CardContent>
                            {isHistoryLoading ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : history.length > 0 ? (
                                <div className="space-y-4">
                                    {history.map(renderHistoryItem)}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400">No history found for this task.</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default TaskDashboardPage;