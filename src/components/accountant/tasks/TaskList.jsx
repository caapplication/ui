import React, { useState, useMemo, useEffect } from 'react';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
    import { Input } from '@/components/ui/input';
    import { Button } from '@/components/ui/button';
    import { Search, Plus, MoreVertical, Edit, Trash2, Bell, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Badge } from '@/components/ui/badge';
    import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
    import { format, formatDistanceToNow, formatDistanceStrict } from 'date-fns';
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
    
    const TaskList = ({ tasks, clients, services, teamMembers, stages = [], onAddNew, onEditTask, onDeleteTask, onViewTask }) => {
        const [searchTerm, setSearchTerm] = useState('');
        const [statusFilter, setStatusFilter] = useState('all');
        const [currentPage, setCurrentPage] = useState(1);
        const [pageSize, setPageSize] = useState(25);
    
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
            if (!dateString) return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) {
                    return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
                }
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dateOnly = new Date(date);
                dateOnly.setHours(0, 0, 0, 0);
                const diffTime = today - dateOnly;
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                
                if (diffDays === 0) {
                    return 'bg-green-500/20 text-green-300 border-green-500/50'; // Today - Green
                } else if (diffDays > 1) {
                    return 'bg-red-500/20 text-red-300 border-red-500/50'; // More than 1 day - Red
                } else {
                    return 'bg-gray-500/20 text-gray-300 border-gray-500/50'; // Yesterday - Gray
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
            return tasks.filter(task => {
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
                
                // Handle search with case-insensitive matching
                const clientName = getClientName(task.client_id) || '';
                const taskTitle = task.title || '';
                const searchMatch = !searchTerm || 
                                    clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    taskTitle.toLowerCase().includes(searchTerm.toLowerCase());
                return statusMatch && searchMatch;
            })
        }, [tasks, statusFilter, searchTerm, clients, stages]);

        // Pagination calculations
        const totalPages = Math.ceil(filteredTasks.length / pageSize);
        const paginatedTasks = useMemo(() => {
            const startIndex = (currentPage - 1) * pageSize;
            return filteredTasks.slice(startIndex, startIndex + pageSize);
        }, [filteredTasks, currentPage, pageSize]);

        // Reset to page 1 when filters change
        useEffect(() => {
            setCurrentPage(1);
        }, [searchTerm, statusFilter]);

        // Clamp current page if it exceeds total pages
        useEffect(() => {
            if (currentPage > totalPages && totalPages > 0) {
                setCurrentPage(totalPages);
            }
        }, [currentPage, totalPages]);
    
        return (
            <div className="h-full flex flex-col">
                <div className="glass-pane rounded-lg flex-grow flex flex-col">
                    <div className="p-4 border-b border-white/10">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h2 className="text-xl font-semibold">All Tasks</h2>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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
                                <div className="relative w-full sm:w-auto sm:max-w-xs">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input placeholder="Search tasks..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>T.ID</TableHead>
                                    <TableHead>STATUS</TableHead>
                                    <TableHead>TASK DETAILS</TableHead>
                                    <TableHead>LAST UPDATE BY</TableHead>
                                    <TableHead>CREATED BY</TableHead>
                                    <TableHead>ASSIGNED TO</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTasks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
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
                                        const assignedToInfo = getUserInfo(task.assigned_to);
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
                                        const badgeClassName = stageColor ? '' : `inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium w-fit ${
                                            statusName === 'Assigned' ? 'bg-orange-500/20 text-orange-300 border-orange-500/50' :
                                            statusName === 'In Progress' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' :
                                            statusName === 'Completed' ? 'bg-green-500/20 text-green-300 border-green-500/50' :
                                            'bg-gray-500/20 text-gray-300 border-gray-500/50'
                                        }`;
                                        
                                        return (
                                            <TableRow key={task.id} className="hover:bg-white/5 cursor-pointer" onClick={() => onViewTask && onViewTask(task.id)}>
                                                {/* T.ID */}
                                                <TableCell>
                                                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${
                                                        task.has_unread_messages 
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
                                                        <span className={`font-medium text-sm ${
                                                            task.has_unread_messages 
                                                                ? 'text-purple-600 dark:text-purple-400' 
                                                                : 'text-white'
                                                        }`}>
                                                            {taskId}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                
                                                {/* STATUS */}
                                                <TableCell>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={badgeClassName}
                                                        style={badgeStyle}
                                                    >
                                                        {statusName}
                                                    </Badge>
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
                                                        {task.due_date && (
                                                            <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/50 text-xs w-fit italic">
                                                                {formatTimeUntil(task.due_date)}
                                                            </Badge>
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