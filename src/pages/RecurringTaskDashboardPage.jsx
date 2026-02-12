import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getRecurringTask } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Calendar, User, Tag, Flag, CheckCircle, Briefcase, Users, Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const getStatusVariant = (isActive) => {
    return isActive ? 'default' : 'outline';
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

const FREQUENCY_LABELS = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
};

const getFrequencyDescription = (task) => {
    if (!task?.frequency || !task?.interval) return "N/A";
    let desc = `Every ${task.interval} ${FREQUENCY_LABELS[task.frequency] || task.frequency}`;

    if (task.frequency === "weekly" && task.day_of_week !== null && task.day_of_week !== undefined) {
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        desc += ` on ${days[task.day_of_week] || ""}`.trimEnd();
    } else if (task.frequency === "monthly") {
        if (task.day_of_month) {
            desc += ` on day ${task.day_of_month}`;
        } else if (task.week_of_month && task.day_of_week !== null && task.day_of_week !== undefined) {
            const weeks = ["first", "second", "third", "fourth"];
            const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            desc = `${weeks[task.week_of_month - 1] || ""} ${days[task.day_of_week] || ""} of every ${task.interval} month(s)`.trim();
        }
    }

    return desc;
};

const formatOffset = (days) => {
    if (days === null || days === undefined || days === "") return "N/A";
    const n = Number(days);
    if (Number.isNaN(n)) return "N/A";
    if (n === 0) return "Same day";
    return `${n} day${Math.abs(n) === 1 ? "" : "s"}`;
};

const RecurringTaskDashboardPage = () => {
    const { recurringTaskId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const [task, setTask] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTask = useCallback(async () => {
        if (!user?.agency_id || !user?.access_token || !recurringTaskId) return;
        setIsLoading(true);
        try {
            const data = await getRecurringTask(recurringTaskId, user.agency_id, user.access_token);
            setTask(data);
        } catch (error) {
            toast({
                title: 'Error fetching recurring task details',
                description: error.message,
                variant: 'destructive',
            });
            navigate('/tasks/recurring');
        } finally {
            setIsLoading(false);
        }
    }, [recurringTaskId, user?.agency_id, user?.access_token, toast, navigate]);

    useEffect(() => {
        fetchTask();
    }, [fetchTask]);

    const renderDetailItem = (Icon, label, value) => (
        <div className="flex items-start text-sm">
            <Icon className="w-4 h-4 mr-3 mt-1 text-gray-400 flex-shrink-0" />
            <span className="font-semibold text-gray-300 w-24">{label}:</span>
            <span className="text-white flex-grow">{value}</span>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <p className="text-white text-lg mb-4">Could not load recurring task details.</p>
                    <Button onClick={() => navigate('/tasks/recurring')}>Go Back</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => navigate('/tasks/recurring')}
                            className="text-white hover:bg-white/10"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">{task.title}</h1>
                            <p className="text-gray-400 mt-1">Recurring Task Details</p>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content - 2 columns */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Task Overview */}
                        <Card className="glass-pane">
                            <CardHeader><CardTitle>Task Overview</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {task.client_id && renderDetailItem(Briefcase, 'Client', task.client?.name || 'N/A')}
                                {task.service_id && renderDetailItem(Users, 'Service', task.service?.name || 'N/A')}
                                {task.assigned_to && renderDetailItem(User, 'Assignee', task.assignee?.name || 'Unassigned')}
                                {task.priority && renderDetailItem(Flag, 'Priority', <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>)}
                                {renderDetailItem(CheckCircle, 'Status', <Badge variant={getStatusVariant(task.is_active)}>{task.is_active ? 'Active' : 'Inactive'}</Badge>)}
                            </CardContent>
                        </Card>

                        {/* Recurrence Details */}
                        <Card className="glass-pane">
                            <CardHeader><CardTitle>Recurrence Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {renderDetailItem(Repeat, 'Frequency', getFrequencyDescription(task))}
                                {task.start_date && renderDetailItem(Calendar, 'Start Date', format(new Date(task.start_date), 'dd MMM yyyy'))}
                                {task.end_date && renderDetailItem(Calendar, 'End Date', format(new Date(task.end_date), 'dd MMM yyyy'))}
                                {renderDetailItem(Calendar, 'Due Date Offset', formatOffset(task.due_date_offset))}
                                {renderDetailItem(Calendar, 'Target Date Offset', formatOffset(task.target_date_offset))}
                            </CardContent>
                        </Card>

                        {/* Description */}
                        {task.description && (
                            <Card className="glass-pane">
                                <CardHeader><CardTitle>Description</CardTitle></CardHeader>
                                <CardContent>
                                    <p className="text-gray-300 whitespace-pre-wrap">{task.description}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar - 1 column */}
                    <div className="space-y-6">
                        {/* Tag */}
                        {task.tag_id && task.tag && (
                            <Card className="glass-pane">
                                <CardHeader><CardTitle>Tag</CardTitle></CardHeader>
                                <CardContent>
                                    <Badge style={{ backgroundColor: task.tag.color || '#888', color: 'white' }}>
                                        {task.tag.name}
                                    </Badge>
                                </CardContent>
                            </Card>
                        )}

                        {/* Metadata */}
                        <Card className="glass-pane">
                            <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {task.created_at && renderDetailItem(Calendar, 'Created', format(new Date(task.created_at), 'dd MMM yyyy, HH:mm'))}
                                {task.created_by && renderDetailItem(User, 'Created By', task.created_by_user?.name || 'N/A')}
                                {task.updated_at && renderDetailItem(Calendar, 'Updated', format(new Date(task.updated_at), 'dd MMM yyyy, HH:mm'))}
                                {task.last_created_at && renderDetailItem(Calendar, 'Last Created', format(new Date(task.last_created_at), 'dd MMM yyyy, HH:mm'))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecurringTaskDashboardPage;
