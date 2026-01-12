import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, MoreVertical, Edit, Trash2, Bell, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow, formatDistanceStrict } from 'date-fns';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getTaskCollaborators } from '@/lib/api';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog';

const TaskList = ({ tasks, clients, services, teamMembers, stages = [], onAddNew, onEditTask, onDeleteTask, onViewTask, currentUserId, isHistoryView = false }) => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [userFilter, setUserFilter] = useState('all'); // 'all', 'created_by_me', 'assigned_to_me', 'collaborates'
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [taskCollaborators, setTaskCollaborators] = useState({}); // { taskId: [collaboratorIds] }
    const fetchedCollaboratorsRef = useRef(new Set()); // Track which tasks we've fetched collaborators for

    const getStatusVariant = (status) => {
        switch (status) {
            case 'Pending': return 'default';
            case 'In Progress': return 'secondary';
            case 'Completed': return 'success';
            case 'Hold': return 'destructive';
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

    const getClientName = (clientId) => {
        if (!clientId) return 'N/A';
        if (!Array.isArray(clients) || clients.length === 0) {
            // Debug: Log when clients array is empty
            if (clients.length === 0) {
                console.debug('getClientName: clients array is empty for clientId:', clientId);
            }
            return 'N/A';
        }
        // Try multiple matching strategies
        const clientIdStr = String(clientId).toLowerCase();
        const client = clients.find(c => {
            if (!c) return false;
            const cId = c.id ? String(c.id).toLowerCase() : '';
            return cId === clientIdStr;
        });
        if (!client) {
            console.debug('getClientName: No client found for clientId:', clientId, 'Available clients:', clients.map(c => ({ id: c?.id, name: c?.name })));
            return 'N/A';
        }
        return client.name || 'N/A';
    };
    const getServiceName = (serviceId) => {
        if (!serviceId || !Array.isArray(services)) return 'N/A';
        const serviceIdStr = String(serviceId).toLowerCase();
        const service = services.find(s => {
            if (!s) return false;
            const sId = s.id ? String(s.id).toLowerCase() : '';
            return sId === serviceIdStr;
        });
        return service?.name || 'N/A';
    };
    const getUserInfo = (userId) => {
        if (!userId) return { name: 'N/A', email: 'N/A', role: 'N/A' };
        if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
            return { name: 'N/A', email: 'N/A', role: 'N/A' };
        }
        // Try multiple matching strategies
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

    const getDateBadgeColor = (dateString) => {
        if (!dateString) return 'bg-gray-500/20  text-gray-300 border-gray-500/50';
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
                return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'; // Yellow for 24h to 7 days
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
            // Check if date is valid
            if (isNaN(date.getTime())) {
                console.warn('Invalid date:', dateString);
                return 'N/A';
            }
            const now = new Date();
            const diffMs = now - date;

            // Check if date is in the future (shouldn't happen for created_at/updated_at)
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
            console.error('Error formatting date:', error, dateString);
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
            return formatDistanceStrict(now, date, { addSuffix: false, unit: 'day' });
        } catch (error) {
            return 'N/A';
        }
    };

    const getTaskId = (task) => {
        // Use task_number if available, otherwise fallback to extracting from UUID
        if (task?.task_number) {
            return `T${task.task_number}`;
        }
        if (!task?.id) return 'N/A';
        // Extract numeric part or use last 4 characters
        const idStr = String(task.id);
        const match = idStr.match(/\d+/);
        if (match) {
            return `T${match[0]}`;
        }
        return `T${idStr.slice(-4).toUpperCase()}`;
    };

    const filteredTasks = useMemo(() => {
        if (!Array.isArray(tasks)) return [];
        const filtered = tasks.filter(task => {
            // Handle status filter - check both stage name and status
            let statusMatch = true;
            if (statusFilter !== 'all') {
                // Get task's stage name if available
                let taskStageName = null;
                if (task.stage_id && stages.length > 0) {
                    const stage = stages.find(s => {
                        const stageIdStr = String(s.id);
                        const taskStageIdStr = String(task.stage_id);
                        return stageIdStr === taskStageIdStr;
                    });
                    if (stage) {
                        taskStageName = stage.name?.toLowerCase();
                    }
                } else if (task.stage?.name) {
                    taskStageName = task.stage.name.toLowerCase();
                }

                // Also check task.status for backward compatibility
                const taskStatus = task.status?.toLowerCase() || '';
                const filterLower = statusFilter.toLowerCase();

                // Match if stage name or status matches the filter
                statusMatch = (taskStageName === filterLower) || (taskStatus === filterLower);
            }

            // Handle user filter
            let userMatch = true;
            if (userFilter !== 'all' && currentUserId) {
                const currentUserIdStr = String(currentUserId);
                if (userFilter === 'created_by_me') {
                    userMatch = task.created_by && String(task.created_by) === currentUserIdStr;
                } else if (userFilter === 'assigned_to_me') {
                    userMatch = task.assigned_to && String(task.assigned_to) === currentUserIdStr;
                } else if (userFilter === 'collaborates') {
                    // Check if task has collaborators array or if current user is in collaborators
                    if (task.collaborators && Array.isArray(task.collaborators)) {
                        userMatch = task.collaborators.some(collab => {
                            const collabUserId = collab.user_id || collab.id;
                            return collabUserId && String(collabUserId) === currentUserIdStr;
                        });
                    } else if (taskCollaborators[task.id]) {
                        // Check cached collaborators
                        userMatch = taskCollaborators[task.id].some(collabId =>
                            String(collabId) === currentUserIdStr
                        );
                    } else {
                        // If no collaborator info available, don't match
                        userMatch = false;
                    }
                }
            }

            // Handle search with case-insensitive matching
            const clientName = getClientName(task.client_id) || '';
            const taskTitle = task.title || '';
            const searchMatch = !searchTerm ||
                clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                taskTitle.toLowerCase().includes(searchTerm.toLowerCase());
            return statusMatch && userMatch && searchMatch;
        });

        // Sort: tasks with notifications first (sorted by updated_at descending), then others
        return filtered.sort((a, b) => {
            const aHasNotification = a.has_unread_messages || false;
            const bHasNotification = b.has_unread_messages || false;

            // If both have notifications, sort by updated_at (latest first)
            if (aHasNotification && bHasNotification) {
                const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                return bUpdated - aUpdated; // Descending (newest first)
            }

            // If only one has notification, it comes first
            if (aHasNotification && !bHasNotification) return -1;
            if (!aHasNotification && bHasNotification) return 1;

            // Neither has notification, maintain original order (or sort by updated_at descending)
            const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return bUpdated - aUpdated;
        });
    }, [tasks, statusFilter, userFilter, searchTerm, clients, stages, currentUserId, taskCollaborators]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredTasks.length / pageSize);
    const paginatedTasks = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredTasks.slice(startIndex, startIndex + pageSize);
    }, [filteredTasks, currentPage, pageSize]);

    // Fetch collaborators for tasks when "collaborates" filter is active
    useEffect(() => {
        if (userFilter === 'collaborates' && tasks.length > 0 && user?.access_token && currentUserId) {
            const fetchCollaborators = async () => {
                try {
                    const agencyId = user?.agency_id || null;
                    // Only fetch for tasks that don't have collaborators data and aren't already fetched
                    const tasksToFetch = tasks.filter(task => {
                        // Skip if task already has collaborators array
                        if (task.collaborators && Array.isArray(task.collaborators) && task.collaborators.length > 0) {
                            return false;
                        }
                        // Skip if already fetched
                        if (fetchedCollaboratorsRef.current.has(task.id)) {
                            return false;
                        }
                        return true;
                    });

                    if (tasksToFetch.length === 0) {
                        return;
                    }

                    const collaboratorPromises = tasksToFetch.map(async (task) => {
                        try {
                            const collaborators = await getTaskCollaborators(task.id, agencyId, user.access_token);
                            return {
                                taskId: task.id,
                                collaborators: Array.isArray(collaborators) ? collaborators : (collaborators?.items || [])
                            };
                        } catch (error) {
                            console.error(`Error fetching collaborators for task ${task.id}:`, error);
                            return { taskId: task.id, collaborators: [] };
                        }
                    });

                    const results = await Promise.allSettled(collaboratorPromises);
                    const newCollaborators = {};
                    results.forEach((result) => {
                        if (result.status === 'fulfilled' && result.value) {
                            const taskId = result.value.taskId;
                            newCollaborators[taskId] = result.value.collaborators.map(c => c.user_id || c.id);
                            fetchedCollaboratorsRef.current.add(taskId);
                        }
                    });

                    if (Object.keys(newCollaborators).length > 0) {
                        setTaskCollaborators(prev => ({ ...prev, ...newCollaborators }));
                    }
                } catch (error) {
                    console.error('Error fetching collaborators:', error);
                }
            };

            fetchCollaborators();
        }
    }, [userFilter, tasks, user?.access_token, user?.agency_id, currentUserId]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, userFilter]);

    // Clamp current page if it exceeds total pages
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            <div className="glass-pane rounded-lg flex-grow flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-xl font-semibold">All Tasks</h2>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            {!isHistoryView && (
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {stages && stages.length > 0 ? (
                                            // Dynamically populate from stages
                                            stages
                                                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                                                .map((stage) => (
                                                    <SelectItem key={stage.id} value={stage.name?.toLowerCase() || ''}>
                                                        {stage.name}
                                                    </SelectItem>
                                                ))
                                        ) : (
                                            // Fallback to hardcoded statuses if no stages available
                                            <>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="in progress">In Progress</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                                <SelectItem value="hold">Hold</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                            <Select value={userFilter} onValueChange={setUserFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Filter by user" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Tasks</SelectItem>
                                    <SelectItem value="created_by_me">Created by me</SelectItem>
                                    <SelectItem value="assigned_to_me">Assigned to me</SelectItem>
                                    <SelectItem value="collaborates">Collaborates</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="relative w-full sm:w-auto sm:max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input placeholder="Search tasks..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex-grow overflow-auto relative min-h-0">
                    <Table className="min-w-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-24">T.ID</TableHead>
                                <TableHead>TASK DETAILS</TableHead>
                                <TableHead className="hidden lg:table-cell">LAST UPDATE BY</TableHead>
                                <TableHead className="hidden md:table-cell">CREATED BY</TableHead>
                                <TableHead className="hidden sm:table-cell">ASSIGNED TO</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTasks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <p className="text-gray-400">No tasks found. {tasks.length === 0 ? 'Create your first task to get started!' : 'Try adjusting your filters.'}</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedTasks.map(task => {
                                    // Use names and roles from API if available, otherwise lookup
                                    const createdByInfo = task.created_by_name
                                        ? { name: task.created_by_name, email: 'N/A', role: task.created_by_role || getUserInfo(task.created_by).role || 'N/A' }
                                        : getUserInfo(task.created_by);
                                    const updatedByInfo = task.updated_by_name
                                        ? { name: task.updated_by_name, email: 'N/A', role: task.updated_by_role || getUserInfo(task.updated_by || task.created_by).role || 'N/A' }
                                        : getUserInfo(task.updated_by || task.created_by);
                                    const assignedToInfo = task.assigned_to_name
                                        ? { name: task.assigned_to_name, email: 'N/A', role: task.assigned_to_role || 'N/A' }
                                        : getUserInfo(task.assigned_to);
                                    const taskId = getTaskId(task);

                                    // Get stage name and color from stages array if available
                                    let statusName = task.status || 'Pending';
                                    let stageColor = null;
                                    if (task.stage_id && stages.length > 0) {
                                        const stage = stages.find(s => s.id === task.stage_id || String(s.id) === String(task.stage_id));
                                        if (stage) {
                                            statusName = stage.name;
                                            stageColor = stage.color;
                                        }
                                    } else if (task.stage?.name) {
                                        statusName = task.stage.name;
                                        stageColor = task.stage.color;
                                    }

                                    // Get color style for badge
                                    const badgeStyle = stageColor ? {
                                        backgroundColor: `${stageColor}20`,
                                        color: stageColor,
                                        borderColor: `${stageColor}50`
                                    } : {};
                                    const badgeClassName = stageColor ? 'w-fit italic' : ` w-fit inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium w-fit ${statusName === 'Assigned' ? 'bg-orange-500/20 text-orange-300 border-orange-500/50' :
                                        statusName === 'In Progress' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' :
                                            statusName === 'Completed' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' :
                                                'bg-gray-500/20 text-gray-300 border-gray-500/50'
                                        }`;

                                    return (
                                        <TableRow key={task.id} className="hover:bg-white/5 cursor-pointer" onClick={() => onViewTask && onViewTask(task.id)}>
                                            {/* T.ID */}
                                            <TableCell>
                                                <div className={`flex items-center gap-1.5 font-medium ${task.has_unread_messages ? 'text-orange-400 animate-pulse' : 'text-white'}`}>
                                                    {task.has_unread_messages && (
                                                        <Bell className="w-3.5 h-3.5" />
                                                    )}
                                                    {taskId}
                                                </div>
                                            </TableCell>

                                            {/* TASK DETAILS */}
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium text-white">{task.title || 'Untitled Task'}</span>
                                                    {task.due_date && (
                                                        <span className="text-xs text-gray-400 italic">
                                                            {format(new Date(task.due_date), 'dd-MM-yyyy')} {task.due_time || (task.target_date ? format(new Date(task.target_date), 'hh:mm a') : (task.updated_at ? format(new Date(task.updated_at), 'hh:mm a') : '12:00 PM'))}
                                                        </span>
                                                    )}
                                                    <Badge
                                                        variant="outline"
                                                        className={badgeClassName}
                                                        style={badgeStyle}
                                                    >
                                                        {statusName}
                                                    </Badge>
                                                </div>
                                            </TableCell>

                                            {/* LAST UPDATE BY */}
                                            <TableCell className="hidden lg:table-cell">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm text-white">{updatedByInfo.name}</span>
                                                    {task.updated_at && (
                                                        <>
                                                            <span className="text-xs text-gray-400 italic">
                                                                {format(new Date(task.updated_at), 'dd-MM-yyyy hh:mm a')}
                                                            </span>
                                                            <Badge variant="outline" className={`${getDateBadgeColor(task.updated_at)} w-fit text-xs italic`}>
                                                                {formatTimeAgo(task.updated_at)}
                                                            </Badge>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* CREATED BY */}
                                            <TableCell className="hidden md:table-cell">
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
                                            <TableCell className="hidden sm:table-cell">
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
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
                {filteredTasks.length > 0 && (
                    <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Items per page:</span>
                            <Select value={String(pageSize)} onValueChange={(value) => {
                                setPageSize(Number(value));
                                setCurrentPage(1);
                            }}>
                                <SelectTrigger className="w-20 h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-400">
                                Page {currentPage} of {totalPages} ({filteredTasks.length} total)
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 w-8"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskList;