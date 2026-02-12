import React, { useEffect, useState, useCallback } from 'react';
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

const RecurringTaskDetails = ({ taskId, onClose, isOpen }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [task, setTask] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTask = useCallback(async () => {
        if (!user?.agency_id || !user?.access_token || !taskId) return;
        setIsLoading(true);
        try {
            const data = await getRecurringTask(taskId, user.agency_id, user.access_token);
            setTask(data);
        } catch (error) {
            toast({
                title: 'Error fetching recurring task details',
                description: error.message,
                variant: 'destructive',
            });
            onClose();
        } finally {
            setIsLoading(false);
        }
    }, [taskId, user?.agency_id, user?.access_token, toast, onClose]);

    useEffect(() => {
        if (isOpen && taskId) {
            fetchTask();
        }
    }, [isOpen, taskId, fetchTask]);

    const renderDetailItem = (Icon, label, value) => (
        <div className="flex items-start text-sm">
            <Icon className="w-4 h-4 mr-3 mt-1 text-gray-400 flex-shrink-0" />
            <span className="font-semibold text-gray-300 w-24">{label}:</span>
            <span className="text-white flex-grow">{value}</span>
        </div>
    );

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
                    <div className="p-6 h-full flex flex-col overflow-y-auto">
                        <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                            <h2 className="text-2xl font-bold">{task.title}</h2>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </header>

                        <div className="flex-grow space-y-6 pr-2">
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

                            <Card className="glass-pane">
                                <CardHeader><CardTitle>Recurrence Details</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    {renderDetailItem(Repeat, 'Frequency', getFrequencyDescription(task))}
                                    {task.start_date && renderDetailItem(Calendar, 'Start Date', format(new Date(task.start_date), 'dd MMM yyyy'))}
                                    {renderDetailItem(Calendar, 'Due Date Offset', formatOffset(task.due_date_offset))}
                                    {renderDetailItem(Calendar, 'Target Date Offset', formatOffset(task.target_date_offset))}
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

                            <Card className="glass-pane">
                                <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    {task.created_at && renderDetailItem(Calendar, 'Created', format(new Date(task.created_at), 'dd MMM yyyy, HH:mm'))}
                                    {task.created_by && renderDetailItem(User, 'Created By', task.created_by_user?.name || 'N/A')}
                                    {task.updated_at && renderDetailItem(Calendar, 'Updated', format(new Date(task.updated_at), 'dd MMM yyyy, HH:mm'))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p>Could not load recurring task details.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecurringTaskDetails;
