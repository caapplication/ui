import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getTaskDetails, startTaskTimer, stopTaskTimer, getTaskHistory, addTaskSubtask, updateTaskSubtask, deleteTaskSubtask } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Paperclip, Clock, Calendar, User, Tag, Flag, CheckCircle, FileText, List, MessageSquare, Briefcase, Users, Play, Square, History, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    const [isLoading, setIsLoading] = useState(true);
    const [isTimerLoading, setIsTimerLoading] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [newSubtask, setNewSubtask] = useState('');

    const fetchTask = useCallback(async () => {
        if (!user?.agency_id || !user?.access_token || !taskId) return;
        setIsLoading(true);
        try {
            const data = await getTaskDetails(taskId, user.agency_id, user.access_token);
            setTask(data);
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

    const fetchHistory = useCallback(async () => {
        if (!user?.agency_id || !user?.access_token || !taskId) return;
        setIsHistoryLoading(true);
        try {
            const historyData = await getTaskHistory(taskId, user.agency_id, user.access_token);
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

    useEffect(() => {
        fetchTask();
    }, [fetchTask]);

    const handleTimerAction = async (action) => {
        setIsTimerLoading(true);
        try {
            const actionFn = action === 'start' ? startTaskTimer : stopTaskTimer;
            await actionFn(taskId, user.agency_id, user.access_token);
            toast({
                title: `Timer ${action === 'start' ? 'Started' : 'Stopped'}`,
                description: `The timer for this task has been successfully ${action === 'start' ? 'started' : 'stopped'}.`,
            });
            fetchTask(); 
        } catch (error) {
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
        try {
            await addTaskSubtask(taskId, { name: newSubtask.trim() }, user.agency_id, user.access_token);
            toast({ title: "Subtask Added", description: "The new subtask has been added." });
            setNewSubtask('');
            fetchTask();
        } catch (error) {
            toast({ title: "Error adding subtask", description: error.message, variant: "destructive" });
        }
    };

    const handleToggleSubtask = async (subtaskId, completed) => {
        try {
            await updateTaskSubtask(taskId, subtaskId, { is_completed: completed }, user.agency_id, user.access_token);
            toast({ title: "Subtask Updated", description: "The subtask status has been updated." });
            fetchTask();
        } catch (error) {
            toast({ title: "Error updating subtask", description: error.message, variant: "destructive" });
        }
    };

    const handleDeleteSubtask = async (subtaskId) => {
        try {
            await deleteTaskSubtask(taskId, subtaskId, user.agency_id, user.access_token);
            toast({ title: "Subtask Deleted", description: "The subtask has been removed." });
            fetchTask();
        } catch (error) {
            toast({ title: "Error deleting subtask", description: error.message, variant: "destructive" });
        }
    };
    
    const renderHistoryItem = (item) => {
        let eventText = `Task ${item.event_type.replace(/_/g, ' ')}`;
        if (item.event_type === 'task_created' && item.to_value?.status) {
             eventText = `Task created with status "${item.to_value.status}"`;
        } else if (item.from_value?.status && item.to_value?.status) {
            eventText = `Status changed from "${item.from_value.status}" to "${item.to_value.status}"`;
        }

        return (
            <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 transition-colors hover:bg-white/10">
                <History className="h-5 w-5 text-primary mt-1" />
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

            <Tabs defaultValue="dashboard" className="flex-grow flex flex-col">
                <TabsList className="mb-6 glass-tab-list self-start">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="subtasks">Subtasks</TabsTrigger>
                    <TabsTrigger value="timelog">Timelog</TabsTrigger>
                    <TabsTrigger value="history" onClick={fetchHistory}>History</TabsTrigger>
                </TabsList>
                <TabsContent value="dashboard" className="flex-grow overflow-y-auto pr-2 space-y-6">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Card className="glass-pane">
                                <CardHeader><CardTitle>Task Overview</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                     <OverviewCard Icon={Briefcase} label="Client" value={task.client?.name || 'N/A'} colorClass="bg-gradient-to-br from-blue-500/30 to-blue-800/30" />
                                     <OverviewCard Icon={Users} label="Service" value={task.service?.name || 'N/A'} colorClass="bg-gradient-to-br from-purple-500/30 to-purple-800/30" />
                                     <OverviewCard Icon={User} label="Assignee" value={task.assignee?.name || 'Unassigned'} colorClass="bg-gradient-to-br from-green-500/30 to-green-800/30" />
                                     <OverviewCard Icon={Flag} label="Priority" value={<Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>} colorClass="bg-gradient-to-br from-yellow-500/30 to-yellow-800/30" />
                                     <OverviewCard Icon={CheckCircle} label="Status" value={<Badge variant={getStatusVariant(task.status)}>{task.status}</Badge>} colorClass="bg-gradient-to-br from-teal-500/30 to-teal-800/30" />
                                     <OverviewCard Icon={Calendar} label="Due Date" value={task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy') : 'N/A'} colorClass="bg-gradient-to-br from-red-500/30 to-red-800/30" />
                                 </CardContent>
                            </Card>
                        </div>
                        <div className="space-y-6">
                            {task.description && (
                                 <Card className="glass-pane card-hover">
                                    <CardHeader><CardTitle>Description</CardTitle></CardHeader>
                                    <CardContent>
                                        <p className="text-gray-300">{task.description}</p>
                                    </CardContent>
                                </Card>
                            )}
                             {task.tags?.length > 0 && (
                                <Card className="glass-pane card-hover">
                                    <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
                                    <CardContent className="flex flex-wrap gap-2">
                                        {task.tags.map(tag => (
                                            <Badge key={tag.id} style={{ backgroundColor: tag.color || '#888', color: 'white' }}>{tag.name}</Badge>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}
                         </div>
                    </div>
                     {task.requested_documents?.length > 0 && (
                        <Card className="glass-pane card-hover mt-6">
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
                <TabsContent value="subtasks" className="flex-grow overflow-y-auto pr-2">
                    <Card className="glass-pane card-hover">
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
                                            {sub.name}
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
                    <Card className="glass-pane card-hover">
                        <CardHeader><CardTitle>Time Tracking</CardTitle></CardHeader>
                        <CardContent className="flex flex-col items-center justify-center space-y-6 p-8">
                            <div className="text-center">
                                <p className="text-lg text-gray-400">Total Time Logged</p>
                                <p className="text-6xl font-extrabold tracking-tighter text-primary">{formatSeconds(task.total_logged_seconds)}</p>
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
                <TabsContent value="history" className="flex-grow overflow-y-auto pr-2">
                     <Card className="glass-pane card-hover">
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