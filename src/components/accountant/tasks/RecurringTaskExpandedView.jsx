import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getTaskDetails, getTaskHistory, getTaskCollaborators, updateTask, addTaskCollaborator, removeTaskCollaborator } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Calendar as CalendarIcon, User, Tag, Flag, CheckCircle, Briefcase, Users, Repeat, Edit2, UserPlus, X, History, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { format, formatDistanceToNow } from 'date-fns';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listTeamMembers, listEntityUsers } from '@/lib/api';
import { listClients } from '@/lib/api';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const FREQUENCY_LABELS = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
};

const getFrequencyDescription = (task) => {
    // Support both old field names (frequency, interval) and new unified names (recurrence_frequency, recurrence_interval)
    const frequency = task?.recurrence_frequency || task?.frequency;
    const interval = task?.recurrence_interval !== undefined ? task.recurrence_interval : (task?.interval !== undefined ? task.interval : null);
    const dayOfWeek = task?.recurrence_day_of_week !== undefined ? task.recurrence_day_of_week : task?.day_of_week;
    const dayOfMonth = task?.recurrence_day_of_month !== undefined ? task.recurrence_day_of_month : task?.day_of_month;
    const weekOfMonth = task?.recurrence_week_of_month !== undefined ? task.recurrence_week_of_month : task?.week_of_month;
    
    if (!frequency || interval === null || interval === undefined) return "N/A";
    let desc = `Every ${interval} ${FREQUENCY_LABELS[frequency] || frequency}`;

    if (frequency === "weekly" && dayOfWeek !== null && dayOfWeek !== undefined) {
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        desc += ` on ${days[dayOfWeek] || ""}`.trimEnd();
    } else if (frequency === "monthly") {
        if (dayOfMonth !== null && dayOfMonth !== undefined) {
            desc += ` on day ${dayOfMonth}`;
        } else if (weekOfMonth !== null && weekOfMonth !== undefined && dayOfWeek !== null && dayOfWeek !== undefined) {
            const weeks = ["first", "second", "third", "fourth"];
            const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            desc = `${weeks[weekOfMonth - 1] || ""} ${days[dayOfWeek] || ""} of every ${interval} month(s)`.trim();
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

const getUserInfo = (userId, teamMembers = []) => {
    if (!userId) return { name: 'N/A', role: 'N/A' };
    const userIdStr = String(userId).toLowerCase();
    const member = (teamMembers || []).find((m) => {
        const mUserId = m?.user_id ? String(m.user_id).toLowerCase() : "";
        const mId = m?.id ? String(m.id).toLowerCase() : "";
        return mUserId === userIdStr || mId === userIdStr;
    });
    return member ? { name: member.name || member.full_name || 'N/A', role: member.role || 'N/A' } : { name: 'N/A', role: 'N/A' };
};

const RecurringTaskExpandedView = ({ task, onEdit, onDelete, onRefresh }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [history, setHistory] = useState([]);
    const [collaborators, setCollaborators] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [clients, setClients] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
    const [isUpdatingChecklist, setIsUpdatingChecklist] = useState(false);
    const [showAddCollaboratorDialog, setShowAddCollaboratorDialog] = useState(false);
    const [selectedCollaboratorId, setSelectedCollaboratorId] = useState('');
    const [selectedCollaboratorHostClient, setSelectedCollaboratorHostClient] = useState('');
    const [collaboratorHostClientUsers, setCollaboratorHostClientUsers] = useState([]);
    const [loadingCollaboratorHostUsers, setLoadingCollaboratorHostUsers] = useState(false);
    const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
    const [showAddChecklistDialog, setShowAddChecklistDialog] = useState(false);
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [isAddingChecklistItem, setIsAddingChecklistItem] = useState(false);
    const [showEditDueDateDialog, setShowEditDueDateDialog] = useState(false);
    const [editingDueDate, setEditingDueDate] = useState(null);
    const [isUpdatingDueDate, setIsUpdatingDueDate] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);

    // Fetch supporting data
    useEffect(() => {
        const fetchSupportingData = async () => {
            if (!user?.access_token || !user?.agency_id) return;
            try {
                const [membersRes, clientsRes] = await Promise.allSettled([
                    listTeamMembers(user.access_token),
                    listClients(user.agency_id, user.access_token)
                ]);
                
                if (membersRes.status === 'fulfilled') {
                    const membersData = Array.isArray(membersRes.value) ? membersRes.value : (membersRes.value?.items || []);
                    setTeamMembers(membersData);
                }
                
                if (clientsRes.status === 'fulfilled') {
                    const clientsData = Array.isArray(clientsRes.value) ? clientsRes.value : (clientsRes.value?.items || []);
                    setClients(clientsData);
                }
            } catch (error) {
                console.error('Error fetching supporting data:', error);
            }
        };
        fetchSupportingData();
    }, [user?.access_token, user?.agency_id]);

    // Fetch history
    const fetchHistory = useCallback(async () => {
        if (!task?.id || !user?.agency_id || !user?.access_token) return;
        setIsLoadingHistory(true);
        try {
            const historyData = await getTaskHistory(task.id, user.agency_id, user.access_token);
            // Filter out comment-related events (chat history)
            const filteredHistory = (historyData || []).filter(item =>
                item.event_type !== 'comment_added' &&
                item.event_type !== 'comment_updated' &&
                item.event_type !== 'comment_deleted'
            );
            setHistory(filteredHistory);
        } catch (error) {
            // For recurring tasks, history might not be available - handle gracefully
            console.error('Error fetching history:', error);
            setHistory([]);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [task?.id, user?.agency_id, user?.access_token]);

    // Fetch collaborators
    const fetchCollaborators = useCallback(async () => {
        if (!task?.id || !user?.agency_id || !user?.access_token) return;
        setIsLoadingCollaborators(true);
        try {
            const collaboratorsData = await getTaskCollaborators(task.id, user.agency_id, user.access_token);
            setCollaborators(Array.isArray(collaboratorsData) ? collaboratorsData : []);
        } catch (error) {
            // For recurring tasks, collaborators might not be available - handle gracefully
            console.error('Error fetching collaborators:', error);
            setCollaborators([]);
        } finally {
            setIsLoadingCollaborators(false);
        }
    }, [task?.id, user?.agency_id, user?.access_token]);

    useEffect(() => {
        if (task?.id) {
            fetchHistory();
            fetchCollaborators();
        }
    }, [task?.id, fetchHistory, fetchCollaborators]);

    // Load client users when client is selected
    useEffect(() => {
        const loadClientUsers = async () => {
            if (!selectedCollaboratorHostClient || !user?.access_token) {
                setCollaboratorHostClientUsers([]);
                return;
            }
            setLoadingCollaboratorHostUsers(true);
            try {
                const entityUsers = await listEntityUsers(user.access_token);
                const clientUsers = Array.isArray(entityUsers) 
                    ? entityUsers.filter(u => String(u.client_id || u.organization_id) === String(selectedCollaboratorHostClient))
                    : [];
                setCollaboratorHostClientUsers(clientUsers);
            } catch (error) {
                console.error('Error loading client users:', error);
                setCollaboratorHostClientUsers([]);
            } finally {
                setLoadingCollaboratorHostUsers(false);
            }
        };
        loadClientUsers();
    }, [selectedCollaboratorHostClient, user?.access_token]);

    const handleAddCollaborator = async () => {
        if (!selectedCollaboratorId || !task?.id || !user?.agency_id || !user?.access_token) return;
        setIsAddingCollaborator(true);
        try {
            await addTaskCollaborator(task.id, selectedCollaboratorId, user.agency_id, user.access_token);
            toast({
                title: 'Collaborator Added',
                description: 'The collaborator has been added successfully.',
            });
            setShowAddCollaboratorDialog(false);
            setSelectedCollaboratorId('');
            setSelectedCollaboratorHostClient('');
            fetchCollaborators();
            if (onRefresh) onRefresh();
        } catch (error) {
            toast({
                title: 'Error adding collaborator',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsAddingCollaborator(false);
        }
    };

    const handleRemoveCollaborator = async (userId) => {
        if (!task?.id || !user?.agency_id || !user?.access_token) return;
        try {
            await removeTaskCollaborator(task.id, userId, user.agency_id, user.access_token);
            toast({
                title: 'Collaborator Removed',
                description: 'The collaborator has been removed successfully.',
            });
            fetchCollaborators();
            if (onRefresh) onRefresh();
        } catch (error) {
            toast({
                title: 'Error removing collaborator',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleToggleChecklistItem = async (index, checked) => {
        if (!task?.id || !user?.agency_id || !user?.access_token) return;
        setIsUpdatingChecklist(true);
        try {
            const updatedChecklist = {
                enabled: task.checklist?.enabled || true,
                items: (task.checklist?.items || []).map((item, i) => 
                    i === index ? { ...item, is_completed: checked } : item
                )
            };
            await updateTask(task.id, { checklist: updatedChecklist }, user.agency_id, user.access_token);
            if (onRefresh) onRefresh();
        } catch (error) {
            toast({
                title: 'Error updating checklist',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsUpdatingChecklist(false);
        }
    };

    const handleAddChecklistItem = async () => {
        if (!newChecklistItem.trim() || !task?.id || !user?.agency_id || !user?.access_token) return;
        setIsAddingChecklistItem(true);
        try {
            const updatedChecklist = {
                enabled: true,
                items: [
                    ...(task.checklist?.items || []),
                    { name: newChecklistItem.trim(), is_completed: false }
                ]
            };
            await updateTask(task.id, { checklist: updatedChecklist }, user.agency_id, user.access_token);
            setNewChecklistItem('');
            setShowAddChecklistDialog(false);
            if (onRefresh) onRefresh();
        } catch (error) {
            toast({
                title: 'Error adding checklist item',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsAddingChecklistItem(false);
        }
    };

    const handleDeleteChecklistItem = async (index) => {
        if (!task?.id || !user?.agency_id || !user?.access_token) return;
        setIsUpdatingChecklist(true);
        try {
            const updatedChecklist = {
                enabled: task.checklist?.enabled || true,
                items: (task.checklist?.items || []).filter((_, i) => i !== index)
            };
            await updateTask(task.id, { checklist: updatedChecklist }, user.agency_id, user.access_token);
            if (onRefresh) onRefresh();
        } catch (error) {
            toast({
                title: 'Error deleting checklist item',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsUpdatingChecklist(false);
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
            const dueDateStr = editingDueDate ? format(editingDueDate, 'yyyy-MM-dd') : null;
            await updateTask(task.id, { due_date: dueDateStr }, user.agency_id, user.access_token);

            if (onRefresh) {
                await onRefresh();
            }

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

    const formatFieldName = (fieldName) => {
        return fieldName
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatFieldValue = (field, value) => {
        if (!value || value === 'None' || value === 'null') return 'Not set';
        
        // Handle objects (like checklist, document_request, etc.)
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            if (field === 'checklist') {
                const itemCount = value.items?.length || 0;
                return `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
            }
            if (field === 'document_request') {
                return value.enabled ? 'Enabled' : 'Disabled';
            }
            // For other objects, return a string representation
            return JSON.stringify(value);
        }
        
        // Handle arrays
        if (Array.isArray(value)) {
            return `${value.length} item${value.length !== 1 ? 's' : ''}`;
        }
        
        // Format dates
        if (field.includes('date') || field.includes('Date')) {
            try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    return format(date, 'dd MMM yyyy');
                }
            } catch (e) {
                // Fall through to default formatting
            }
        }
        
        // Format status/priority/enum values
        if (field === 'status' || field === 'priority') {
            return String(value).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        
        // Ensure we return a string
        return String(value);
    };

    const renderHistoryItem = (item) => {
        const userInfo = getUserInfo(item.user_id, teamMembers);
        const actionDate = item.created_at ? new Date(item.created_at) : new Date();
        const hasDetailedChanges = item.from_value && item.to_value && Object.keys(item.from_value).length > 0;
        
        return (
            <div key={item.id} className="flex gap-3 pb-4 border-b border-white/10 last:border-0">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {userInfo.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                        <span className="font-semibold">{userInfo.name}</span> {item.action || 'performed an action'}
                    </p>
                    {hasDetailedChanges ? (
                        <div className="mt-2 space-y-1">
                            {Object.keys(item.from_value).map((field) => {
                                const fromVal = item.from_value[field];
                                const toVal = item.to_value[field];
                                const fieldDisplay = formatFieldName(field);
                                const fromDisplay = formatFieldValue(field, fromVal);
                                const toDisplay = formatFieldValue(field, toVal);
                                
                                return (
                                    <div key={field} className="text-xs text-gray-300 pl-2 border-l-2 border-white/20">
                                        <span className="font-medium text-gray-400">{fieldDisplay}:</span>{' '}
                                        <span className="text-red-300 line-through">{fromDisplay}</span>
                                        {' → '}
                                        <span className="text-green-300 font-medium">{toDisplay}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : item.details ? (
                        <p className="text-xs text-gray-400 mt-1">{item.details}</p>
                    ) : null}
                    <p className="text-xs text-gray-400 mt-1">
                        {format(actionDate, 'dd MMM yyyy, HH:mm')}
                    </p>
                </div>
            </div>
        );
    };

    if (!task) return null;

    const createdByInfo = getUserInfo(task.created_by, teamMembers);
    const updatedByInfo = getUserInfo(task.updated_by || task.created_by, teamMembers);
    const assignedToInfo = getUserInfo(task.assigned_to, teamMembers);
    const startDate = task.recurrence_start_date || task.start_date;
    const isActive = task.recurrence_is_active !== undefined ? task.recurrence_is_active : task.is_active;

    // Helper functions to match normal task display
    const getTaskId = (task) => {
        if (task.task_number) return `T${task.task_number}`;
        if (task.id) {
            const idStr = String(task.id);
            const match = idStr.match(/(\d+)$/);
            return match ? `T${match[1]}` : `T${idStr.slice(-4)}`;
        }
        return 'N/A';
    };

    const formatTimeAgo = (dateStr) => {
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
        } catch {
            return '';
        }
    };

    const getDateBadgeColor = (dateStr) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return 'bg-green-500/20 text-green-300 border-green-500/50';
            if (diffDays <= 7) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
            return 'bg-red-500/20 text-red-300 border-red-500/50';
        } catch {
            return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
        }
    };

    const displayTaskId = getTaskId(task);

    return (
        <>
            <style>{`
                .recurring-task-scroll::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .recurring-task-scroll::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                }
                .recurring-task-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 4px;
                }
                .recurring-task-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.5);
                }
            `}</style>
            <div className="flex-1 min-h-0 overflow-hidden">
                {/* Task Summary Table - Same as normal tasks */}
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="border-white/10">
                                    {/* T.ID */}
                                    <TableCell>
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded">
                                            <span className="font-medium text-sm text-white">
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
                                            <span className="text-sm text-white">{assignedToInfo.name || 'Unassigned'}</span>
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
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid - Same layout as normal tasks but without chat */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-4 md:gap-6 h-auto lg:h-full min-h-0">
                {/* Checklists - Column 3, Row 1 (col-span-1, row-span-1) - Green Box */}
                <Card className="glass-pane card-hover overflow-hidden rounded-2xl flex flex-col md:col-span-1 lg:col-span-1 lg:row-span-1 border-2 border-green-500/50 h-[400px] lg:h-full max-h-full">
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
                    <CardContent className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-2 recurring-task-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1)' }}>
                        {isUpdatingChecklist && (
                            <div className="flex justify-center items-center py-2 mb-2 flex-shrink-0">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            </div>
                        )}
                        {task.checklist?.enabled && task.checklist?.items && task.checklist.items.length > 0 ? (
                            <div className="space-y-2">
                                {task.checklist.items.map((item, index) => (
                                    <div key={index} className="flex flex-col gap-1 p-2 rounded-md bg-white/5 transition-colors hover:bg-white/10">
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
                                        {item.created_by && (
                                            <p className="text-xs text-gray-400 italic ml-7">
                                                Added by <span className="text-white">{getUserInfo(item.created_by, teamMembers).name}</span>
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-400 py-4">No checklist items yet.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Due Date & Recurring - Column 3, Row 2 (col-span-1, row-span-1) - Merged Card */}
                <Card className="glass-pane card-hover overflow-hidden rounded-2xl flex flex-col md:col-span-1 lg:col-span-1 lg:row-span-1 border-2 border-purple-500/50 h-[400px] lg:h-full">
                    <CardContent className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col p-6 pr-4 recurring-task-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1)' }}>
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
                                {task.due_date ? (
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
                            </div>
                            <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                                {task.is_recurring || task.is_recurring_task ? (
                                    <div className="text-center space-y-2">
                                        <div className="text-xl font-bold text-white">
                                            {getFrequencyDescription(task)}
                                        </div>
                                        {(task.recurrence_start_date || task.start_date) && (
                                            <div className="text-sm font-semibold text-blue-400">
                                                Starts: {format(new Date(task.recurrence_start_date || task.start_date), 'dd MMM yyyy')}
                                            </div>
                                        )}
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
                <Card className="glass-pane card-hover overflow-hidden rounded-2xl flex flex-col md:col-span-1 lg:col-span-1 lg:row-span-1 border-2 border-red-500/50 h-[400px] lg:h-full max-h-full">
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
                                        <DialogDescription>Select a user to add as a collaborator</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4">
                                        <div>
                                            <Label className="mb-2 block">Client (Optional)</Label>
                                            <Combobox
                                                options={clients.map(c => ({
                                                    value: String(c.id),
                                                    label: c.name || c.email
                                                }))}
                                                value={selectedCollaboratorHostClient}
                                                onValueChange={(val) => {
                                                    setSelectedCollaboratorHostClient(val);
                                                    setSelectedCollaboratorId('');
                                                }}
                                                placeholder="Select a client..."
                                                searchPlaceholder="Search clients..."
                                                emptyText="No clients found."
                                            />
                                        </div>
                                        <div>
                                            <Label className="mb-2 flex items-center gap-2">
                                                Collaborator
                                                {loadingCollaboratorHostUsers && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                                            </Label>
                                            <Combobox
                                                options={(selectedCollaboratorHostClient ? collaboratorHostClientUsers : teamMembers)
                                                    .filter(m => {
                                                        const userId = m.user_id || m.id;
                                                        const isCreator = String(userId) === String(task.created_by);
                                                        const isAssignee = String(userId) === String(task.assigned_to);
                                                        const isAlreadyCollaborator = collaborators.some(c => String(c.user_id) === String(userId));
                                                        return !isCreator && !isAssignee && !isAlreadyCollaborator;
                                                    })
                                                    .map(m => ({
                                                        value: m.user_id || m.id,
                                                        label: `${m.name || m.full_name || m.email} ${(selectedCollaboratorHostClient) ? '(Client User)' : `(${m.role || m.department || 'N/A'})`}`
                                                    }))}
                                                value={selectedCollaboratorId}
                                                onValueChange={setSelectedCollaboratorId}
                                                placeholder={
                                                    loadingCollaboratorHostUsers
                                                        ? "Loading users..."
                                                        : selectedCollaboratorHostClient
                                                            ? (collaboratorHostClientUsers.length === 0 ? "No users found for this client" : "Select a client user...")
                                                            : "Select a team member..."
                                                }
                                                searchPlaceholder="Search users..."
                                                emptyText={selectedCollaboratorHostClient && collaboratorHostClientUsers.length === 0 ? "No users found for this client." : "No users found."}
                                                disabled={loadingCollaboratorHostUsers || isAddingCollaborator || (selectedCollaboratorHostClient && collaboratorHostClientUsers.length === 0)}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setShowAddCollaboratorDialog(false);
                                                setSelectedCollaboratorId('');
                                                setSelectedCollaboratorHostClient('');
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
                    <CardContent className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col pr-2 recurring-task-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1)' }}>
                        {isLoadingCollaborators ? (
                            <div className="flex justify-center items-center py-4 flex-shrink-0">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {collaborators.length > 0 ? (
                                    collaborators.map((collab) => {
                                        const teamMember = teamMembers.find(m =>
                                            (m.user_id || m.id) === collab.user_id
                                        );
                                        const displayName = collab.user_name || teamMember?.name || teamMember?.full_name || teamMember?.email || 'Unknown';
                                        const displayRole = collab.user_role || teamMember?.role || teamMember?.department || 'N/A';

                                        return (
                                            <div key={collab.id} className="flex items-center justify-between p-2 rounded-md bg-white/5 hover:bg-white/10">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                                                        {displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">
                                                            {displayName}
                                                        </p>
                                                        <p className="text-xs text-gray-400 italic">
                                                            {displayRole}
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
                <Card className="glass-pane card-hover overflow-hidden rounded-2xl flex flex-col md:col-span-1 lg:col-span-1 lg:row-span-1 border-2 border-blue-500/50 h-[400px] lg:h-full max-h-full">
                    <CardHeader className="flex-shrink-0">
                        <CardTitle className="flex items-center gap-2">
                            <History className="w-5 h-5" />
                            Activity Log
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col pr-2 recurring-task-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1)' }}>
                        {isLoadingHistory ? (
                            <div className="flex justify-center items-center py-8 flex-shrink-0">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : history.length > 0 ? (
                            <div className="space-y-4">
                                {history.map(renderHistoryItem)}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400 flex-shrink-0">No history found for this task.</div>
                        )}
                    </CardContent>
                </Card>
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
                            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                                        onSelect={(date) => {
                                            setEditingDueDate(date);
                                            setCalendarOpen(false); // Close calendar when date is selected
                                        }}
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
            </div>
        </>
    );
};

export default RecurringTaskExpandedView;
