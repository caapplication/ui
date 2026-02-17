import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getRecurringTask, deleteRecurringTask } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import RecurringTaskExpandedView from '@/components/accountant/tasks/RecurringTaskExpandedView';

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
    const location = useLocation();
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

    const handleDelete = async () => {
        try {
            if (!user?.agency_id || !user?.access_token || !recurringTaskId) return;
            await deleteRecurringTask(recurringTaskId, user.agency_id, user.access_token);
            toast({
                title: 'Recurring Task Deleted',
                description: 'The recurring task has been deleted successfully.',
            });
            navigate('/tasks/recurring');
        } catch (error) {
            toast({
                title: 'Error deleting recurring task',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleEdit = () => {
        navigate(`/tasks/recurring`, { state: { editTaskId: recurringTaskId } });
    };

    const handleRefresh = useCallback(async () => {
        await fetchTask();
    }, [fetchTask]);

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
        <div className="h-auto min-h-screen lg:h-[100dvh] p-4 md:p-8 text-white flex flex-col overflow-x-hidden lg:overflow-hidden">
            {/* Header */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-6 flex-shrink-0">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                            // Use location state if available (passed from navigating component)
                            if (location.state?.from === '/team-members' && location.state?.memberId) {
                                navigate('/team-members', { state: { restoreMemberId: location.state.memberId } });
                            } else if (location.state?.fromService) {
                                // Navigate back to services page - browser history will restore the service detail view
                                navigate('/services', { state: { restoreServiceId: location.state.serviceId } });
                            } else if (location.state?.fromApp) {
                                navigate(-1); // Go back to previous page
                            } else {
                                // Default fallback to recurring tasks list if opened directly or external link
                                navigate('/tasks/recurring');
                            }
                        }}
                        className="flex-shrink-0"
                    >
                        <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                    <h1 className="text-2xl sm:text-3xl font-bold truncate">
                        {task.title}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleEdit}
                        className="text-white border-white/20 hover:bg-white/10"
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="text-red-400 border-red-500/50 hover:bg-red-500/10"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-pane border border-white/20">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Delete Recurring Task</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-300">
                                    Are you sure you want to delete "{task.title}"? This will stop creating new tasks from this template.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDelete}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </header>

            {/* Common Expanded View */}
            <div className="flex-1 min-h-0">
                <RecurringTaskExpandedView 
                    task={task} 
                    onEdit={handleEdit} 
                    onDelete={handleDelete}
                    onRefresh={handleRefresh}
                />
            </div>
        </div>
    );
};

export default RecurringTaskDashboardPage;
