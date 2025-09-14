import React, { useEffect, useState, useCallback } from 'react';
    import { useAuth } from '@/hooks/useAuth.jsx';
    import { getTaskDetails, startTaskTimer, stopTaskTimer, getTaskHistory } from '@/lib/api';
    import { useToast } from '@/components/ui/use-toast';
    import { Loader2, ArrowLeft, Paperclip, Clock, Calendar, User, Tag, Flag, CheckCircle, FileText, List, MessageSquare, Briefcase, Users, Play, Square, History } from 'lucide-react';
    import { Badge } from '@/components/ui/badge';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import { format } from 'date-fns';

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

    const TaskDetails = ({ taskId, onClose, isOpen }) => {
        const { user } = useAuth();
        const { toast } = useToast();
        const [task, setTask] = useState(null);
        const [history, setHistory] = useState([]);
        const [isLoading, setIsLoading] = useState(true);
        const [isTimerLoading, setIsTimerLoading] = useState(false);
        const [isHistoryLoading, setIsHistoryLoading] = useState(false);

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
                onClose();
            } finally {
                setIsLoading(false);
            }
        }, [taskId, user?.agency_id, user?.access_token, toast, onClose]);

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
            if (isOpen && taskId) {
                fetchTask();
            }
        }, [isOpen, taskId, fetchTask]);

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
        
        const renderDetailItem = (Icon, label, value) => (
            <div className="flex items-start text-sm">
                <Icon className="w-4 h-4 mr-3 mt-1 text-gray-400 flex-shrink-0" />
                <span className="font-semibold text-gray-300 w-24">{label}:</span>
                <span className="text-white flex-grow">{value}</span>
            </div>
        );

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

        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}>
                <div 
                    className="fixed top-0 right-0 h-full w-full max-w-2xl bg-gray-900/90 backdrop-blur-sm text-white shadow-2xl transform transition-transform duration-300 ease-in-out"
                    style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        </div>
                    ) : task ? (
                        <div className="p-6 h-full flex flex-col">
                            <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                                <h2 className="text-2xl font-bold">{task.title}</h2>
                                <Button variant="ghost" size="icon" onClick={onClose}>
                                    <ArrowLeft className="h-6 w-6" />
                                </Button>
                            </header>

                            <Tabs defaultValue="dashboard" className="flex-grow flex flex-col">
                                <TabsList className="mb-4">
                                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                                    <TabsTrigger value="timelog">Timelog</TabsTrigger>
                                    <TabsTrigger value="history" onClick={fetchHistory}>History</TabsTrigger>
                                </TabsList>
                                <TabsContent value="dashboard" className="flex-grow overflow-y-auto pr-2 space-y-6">
                                    <Card className="glass-pane">
                                        <CardHeader><CardTitle>Task Overview</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            {renderDetailItem(Briefcase, 'Client', task.client?.name || 'N/A')}
                                            {renderDetailItem(Users, 'Service', task.service?.name || 'N/A')}
                                            {renderDetailItem(User, 'Assignee', task.assignee?.name || 'Unassigned')}
                                            {renderDetailItem(Flag, 'Priority', <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>)}
                                            {renderDetailItem(CheckCircle, 'Status', <Badge variant={getStatusVariant(task.status)}>{task.status}</Badge>)}
                                            {renderDetailItem(Calendar, 'Due Date', task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy') : 'N/A')}
                                            {renderDetailItem(Calendar, 'Target Date', task.target_date ? format(new Date(task.target_date), 'dd MMM yyyy') : 'N/A')}
                                        </CardContent>
                                    </Card>

                                    {task.description && (
                                         <Card className="glass-pane">
                                            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
                                            <CardContent>
                                                <p className="text-gray-300">{task.description}</p>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {task.tags?.length > 0 && (
                                        <Card className="glass-pane">
                                            <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
                                            <CardContent className="flex flex-wrap gap-2">
                                                {task.tags.map(tag => (
                                                    <Badge key={tag.id} style={{ backgroundColor: tag.color || '#888', color: 'white' }}>{tag.name}</Badge>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {task.requested_documents?.length > 0 && (
                                        <Card className="glass-pane">
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
                                <TabsContent value="timelog" className="flex-grow overflow-y-auto pr-2">
                                    <Card className="glass-pane">
                                        <CardHeader><CardTitle>Time Tracking</CardTitle></CardHeader>
                                        <CardContent className="flex flex-col items-center justify-center space-y-6 p-8">
                                            <div className="text-center">
                                                <p className="text-lg text-gray-400">Total Time Logged</p>
                                                <p className="text-5xl font-bold tracking-tighter">{formatSeconds(task.total_logged_seconds)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-lg text-gray-400">Timer Status</p>
                                                <Badge variant={task.is_timer_running_for_me ? 'success' : 'default'} className="text-lg">
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
                                     <Card className="glass-pane">
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
                    ) : (
                        <div className="flex items-center justify-center h-full">
                           <p>Could not load task details.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    export default TaskDetails;