import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Loader2, Bell, Repeat, Lock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { listTasks, listRecurringTasks, listServices, listTeamMembers, getAllClientTeamMembers } from '@/lib/api';
import { format, formatDistanceToNow, formatDistanceStrict } from 'date-fns';

const FREQUENCY_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

// Blinking animation style
const blinkStyle = `
@keyframes blink-orange {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
.animate-blink-3s {
  animation: blink-orange 0.5s ease-in-out 6;
}
`;

const TeamMemberDetail = ({ member, onBack, clients = [], memberClientsMap = {} }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const agencyId = user?.agency_id || localStorage.getItem('agency_id');
    const memberId = String(member?.id || member?.user_id || '');

    const [activeTab, setActiveTab] = useState('tasks');
    const [tasks, setTasks] = useState([]);
    const [recurringTasks, setRecurringTasks] = useState([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [isLoadingRecurring, setIsLoadingRecurring] = useState(false);
    const [taskStatusFilter, setTaskStatusFilter] = useState('all');
    const [taskSearch, setTaskSearch] = useState('');
    const [recurringSearch, setRecurringSearch] = useState('');
    const [recurringClientFilter, setRecurringClientFilter] = useState('all');
    const [clientSearch, setClientSearch] = useState('');
    const [services, setServices] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [clientTeamMembers, setClientTeamMembers] = useState({});
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

    const assignedClientIds = memberClientsMap[memberId] || [];
    const assignedClients = useMemo(() => {
        return assignedClientIds
            .map(cid => clients.find(c => String(c.id) === String(cid)))
            .filter(Boolean);
    }, [assignedClientIds, clients]);

    useEffect(() => {
        if (!memberId || !agencyId || !user?.access_token) return;
        setIsLoadingTasks(true);
        listTasks(agencyId, user.access_token, { assigned_to: memberId, limit: 500 })
            .then(data => {
                const items = Array.isArray(data) ? data : (data?.items || []);
                setTasks(items);
            })
            .catch(() => setTasks([]))
            .finally(() => setIsLoadingTasks(false));
    }, [memberId, agencyId, user?.access_token]);

    useEffect(() => {
        if (!memberId || !agencyId || !user?.access_token) return;
        setIsLoadingRecurring(true);
        listRecurringTasks(agencyId, user.access_token, null, 1, 500, null, memberId)
            .then(data => {
                const items = Array.isArray(data) ? data : (data?.items || []);
                setRecurringTasks(items);
            })
            .catch(() => setRecurringTasks([]))
            .finally(() => setIsLoadingRecurring(false));
    }, [memberId, agencyId, user?.access_token]);

    useEffect(() => {
        if (!agencyId || !user?.access_token) return;
        listServices(agencyId, user.access_token).then(d => setServices(Array.isArray(d) ? d : (d?.items || []))).catch(() => setServices([]));
        listTeamMembers(user.access_token, 'joined').then(d => setTeamMembers(Array.isArray(d) ? d : [])).catch(() => setTeamMembers([]));
    }, [agencyId, user?.access_token]);

    useEffect(() => {
        const fetchAssignments = async () => {
            if (!user?.access_token || !agencyId) return;
            setIsLoadingAssignments(true);
            try {
                const results = await getAllClientTeamMembers(agencyId, user.access_token);
                setClientTeamMembers(results || {});
            } catch (error) {
                console.error('Failed to fetch client team members:', error);
            } finally {
                setIsLoadingAssignments(false);
            }
        };
        fetchAssignments();
    }, [user?.access_token, agencyId]);

    const getClientName = (clientId) => {
        if (!clientId) return 'N/A';
        const c = clients.find(x => String(x.id) === String(clientId));
        return c?.name || 'N/A';
    };

    const getServiceName = (serviceId) => {
        if (!serviceId) return 'N/A';
        const s = services.find(x => String(x.id) === String(serviceId));
        return s?.name || 'N/A';
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

    const getDateBadgeColor = (dateString) => {
        if (!dateString) return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
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
                return 'bg-green-500/20 text-green-300 border-green-500/50';
            } else if (diffDays <= 7) {
                return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
            } else {
                return 'bg-red-500/20 text-red-300 border-red-500/50';
            }
        } catch {
            return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
        }
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            return formatDistanceToNow(date, { addSuffix: true });
        } catch {
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
        } catch {
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

    const getFrequencyDescription = (task) => {
        const frequency = task.recurrence_frequency || task.frequency;
        const interval = task.recurrence_interval || task.interval || 1;
        const dayOfWeek = task.recurrence_day_of_week !== undefined ? task.recurrence_day_of_week : task.day_of_week;
        const dayOfMonth = task.recurrence_day_of_month !== undefined ? task.recurrence_day_of_month : task.day_of_month;
        
        if (!frequency) return 'N/A';
        
        let desc = `Every ${interval} ${FREQUENCY_LABELS[frequency] || frequency}`;

        if (frequency === 'weekly' && dayOfWeek !== null && dayOfWeek !== undefined) {
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            desc += ` on ${days[dayOfWeek]}`;
        } else if (frequency === 'monthly' && dayOfMonth !== null && dayOfMonth !== undefined) {
            desc += ` on day ${dayOfMonth}`;
        }

        return desc;
    };

    const filteredTasks = useMemo(() => {
        let list = [...tasks];
        if (taskStatusFilter !== 'all') {
            list = list.filter(t => {
                const status = (t.status || '').toLowerCase();
                const filterLower = taskStatusFilter.toLowerCase();
                return status === filterLower;
            });
        }
        if (taskSearch.trim()) {
            const q = taskSearch.toLowerCase();
            list = list.filter(t =>
                (t.title || '').toLowerCase().includes(q) ||
                (t.task_number || '').toString().toLowerCase().includes(q) ||
                getClientName(t.client_id).toLowerCase().includes(q)
            );
        }
        return list;
    }, [tasks, taskStatusFilter, taskSearch, clients]);

    const filteredRecurring = useMemo(() => {
        let list = [...recurringTasks];
        if (recurringSearch.trim()) {
            const q = recurringSearch.toLowerCase();
            list = list.filter(t =>
                (t.title || '').toLowerCase().includes(q) ||
                getServiceName(t.service_id).toLowerCase().includes(q)
            );
        }
        if (recurringClientFilter !== 'all') {
            list = list.filter(t => String(t.client_id || '') === String(recurringClientFilter));
        }
        return list;
    }, [recurringTasks, recurringSearch, recurringClientFilter, services, clients]);

    // Get unique clients from recurring tasks for filter dropdown
    const recurringTaskClients = useMemo(() => {
        const clientIds = new Set();
        recurringTasks.forEach(task => {
            if (task.client_id) {
                clientIds.add(String(task.client_id));
            }
        });
        return Array.from(clientIds)
            .map(id => clients.find(c => String(c.id) === String(id)))
            .filter(Boolean)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [recurringTasks, clients]);

    const filteredClients = useMemo(() => {
        if (!clientSearch.trim()) return assignedClients;
        const q = clientSearch.toLowerCase();
        return assignedClients.filter(c => (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q));
    }, [assignedClients, clientSearch]);

    const renderClientUsers = (client) => {
        const orgUsers = client.orgUsers;
        const users = [...(orgUsers?.invited_users || []), ...(orgUsers?.joined_users || [])];
        if (!users.length) return <span>-</span>;

        return (
            <div className="flex -space-x-2">
                {users.slice(0, 3).map((orgUser) => (
                    <TooltipProvider key={orgUser.user_id}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Avatar className="w-8 h-8 border-2 border-gray-800 cursor-help">
                                    <AvatarFallback>{orgUser.email?.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{orgUser.email}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
                {users.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-800 flex items-center justify-center text-xs">
                        +{users.length - 3}
                    </div>
                )}
            </div>
        );
    };

    const renderTeamMembers = (client) => {
        if (isLoadingAssignments) {
            return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;
        }
        const assignedTeamMembers = clientTeamMembers[client.id] || [];
        if (!assignedTeamMembers.length) {
            return '-';
        }

        const memberDetails = assignedTeamMembers
            .map((assigned) =>
                teamMembers.find((m) => String(m.user_id || m.id) === String(assigned.team_member_user_id))
            )
            .filter(Boolean);

        if (!memberDetails.length) return '-';

        return (
            <div className="flex -space-x-2">
                {memberDetails.slice(0, 3).map((member, idx) => (
                    <TooltipProvider key={`${client.id}-${idx}`}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Avatar className="w-8 h-8 border-2 border-gray-800 cursor-help">
                                    <AvatarFallback>
                                        {member.name ? member.name.charAt(0) : member.email?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{member.email}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
                {memberDetails.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-800 flex items-center justify-center text-xs">
                        +{memberDetails.length - 3}
                    </div>
                )}
            </div>
        );
    };

    const tabs = [
        { id: 'tasks', label: 'Assigned Tasks' },
        { id: 'recurring', label: 'Recurring Tasks' },
        { id: 'clients', label: 'Assigned Clients' },
    ];

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-white">
                        <span className="text-gray-400 cursor-pointer" onClick={onBack}>Team Members / </span>
                        {member?.name || member?.email || 'Member'}
                    </h1>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto no-scrollbar pr-2 space-y-6">
                <div className="border-b border-white/10">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`${isActive ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {activeTab === 'tasks' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-48">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input placeholder="Search tasks..." className="pl-8 h-9" value={taskSearch} onChange={e => setTaskSearch(e.target.value)} />
                            </div>
                            <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                                <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                    <SelectItem value="Hold">Hold</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="glass-pane rounded-lg overflow-hidden border border-white/10">
                            <div className="overflow-x-auto">
                                {isLoadingTasks ? (
                                    <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>
                                ) : (
                                    <Table className="w-full min-w-[1000px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-24">T.ID</TableHead>
                                                <TableHead>TASK DETAILS</TableHead>
                                                <TableHead className="hidden lg:table-cell">LAST UPDATE BY</TableHead>
                                                <TableHead className="hidden md:table-cell">CREATED BY</TableHead>
                                                <TableHead className="hidden sm:table-cell">ASSIGNED TO</TableHead>
                                                <TableHead className="hidden md:table-cell">DUE DATE</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredTasks.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center text-gray-400 py-8">No assigned tasks</TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredTasks.map((task) => {
                                                    const createdByInfo = getUserInfo(task.created_by);
                                                    const updatedByInfo = getUserInfo(task.updated_by || task.created_by);
                                                    const assignedToInfo = getUserInfo(task.assigned_to);
                                                    const taskId = getTaskId(task);
                                                    const statusName = task.status || 'Pending';
                                                    const badgeClassName = `w-fit inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium w-fit ${statusName === 'Assigned' ? 'bg-orange-500/20 text-orange-300 border-orange-500/50' :
                                                        statusName === 'In Progress' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' :
                                                            statusName === 'Completed' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' :
                                                                'bg-gray-500/20 text-gray-300 border-gray-500/50'
                                                        }`;

                                                    return (
                                                        <TableRow
                                                            key={task.id}
                                                            className="hover:bg-white/5 cursor-pointer"
                                                            onClick={() => navigate(`/tasks/${task.id}`, { state: { from: '/team-members', memberId } })}
                                                        >
                                                            <TableCell>
                                                                <style>{blinkStyle}</style>
                                                                <div className="flex items-center gap-1.5 font-medium text-white">
                                                                    {task.has_unread_messages && (
                                                                        <Bell className="w-3.5 h-3.5 fill-current text-orange-500" />
                                                                    )}
                                                                    {taskId}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="font-medium text-white">{task.title || 'Untitled Task'}</span>
                                                                    {task.due_date && (
                                                                        <span className="text-xs text-gray-400 italic">
                                                                            {format(new Date(task.due_date), 'dd-MM-yyyy')} {task.due_time || (task.target_date ? format(new Date(task.target_date), 'hh:mm a') : (task.updated_at ? format(new Date(task.updated_at), 'hh:mm a') : '12:00 PM'))}
                                                                        </span>
                                                                    )}
                                                                    <Badge variant="outline" className={badgeClassName}>
                                                                        {statusName}
                                                                    </Badge>
                                                                </div>
                                                            </TableCell>
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
                                                            <TableCell className="hidden md:table-cell">
                                                                <div className="flex flex-col gap-1">
                                                                    {task.due_date ? (
                                                                        <>
                                                                            <span className="text-sm text-white">
                                                                                {format(new Date(task.due_date), 'MMM dd, yyyy')}
                                                                            </span>
                                                                            <span className="text-xs text-transparent italic select-none">&nbsp;</span>
                                                                            <Badge variant="outline" className={`${getDateBadgeColor(task.due_date)} text-xs w-fit italic`}>
                                                                                {formatTimeUntil(task.due_date)}
                                                                            </Badge>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-sm text-gray-500 italic">Not set</span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'recurring' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-48">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input placeholder="Search recurring..." className="pl-8 h-9" value={recurringSearch} onChange={e => setRecurringSearch(e.target.value)} />
                            </div>
                            <Select value={recurringClientFilter} onValueChange={setRecurringClientFilter}>
                                <SelectTrigger className="w-48 h-9">
                                    <SelectValue placeholder="Filter by Company" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Companies</SelectItem>
                                    {recurringTaskClients.map((client) => (
                                        <SelectItem key={client.id} value={String(client.id)}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="glass-pane rounded-lg overflow-hidden border border-white/10">
                            <div className="overflow-x-auto">
                                {isLoadingRecurring ? (
                                    <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b border-white/10 hover:bg-transparent">
                                                <TableHead className="text-white">TASK DETAILS</TableHead>
                                                <TableHead className="hidden lg:table-cell text-white">LAST UPDATE BY</TableHead>
                                                <TableHead className="hidden md:table-cell text-white">CREATED BY</TableHead>
                                                <TableHead className="hidden lg:table-cell text-white">FREQUENCY</TableHead>
                                                <TableHead className="hidden xl:table-cell text-white">START DATE</TableHead>
                                                <TableHead className="hidden sm:table-cell text-white">ASSIGNED TO</TableHead>
                                                <TableHead className="text-white">STATUS</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredRecurring.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">No recurring tasks assigned</TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredRecurring.map((task) => {
                                                    const createdByInfo = getUserInfo(task.created_by);
                                                    const updatedByInfo = getUserInfo(task.updated_by || task.created_by);
                                                    const assignedToInfo = getUserInfo(task.assigned_to);

                                                    return (
                                                        <TableRow
                                                            key={task.id}
                                                            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                                                            onClick={() => navigate(`/tasks/recurring/${task.id}`, { state: { from: '/team-members', memberId } })}
                                                        >
                                                            <TableCell className="align-top">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="font-medium text-white text-base">{task.title}</span>
                                                                    {task.client_id && (
                                                                        <span className="text-xs text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded w-fit">
                                                                            Client: {getClientName(task.client_id)}
                                                                        </span>
                                                                    )}
                                                                    <div className="lg:hidden text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                                        <Repeat className="w-3 h-3" />
                                                                        {getFrequencyDescription(task)}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="hidden lg:table-cell align-top">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-sm text-white">{updatedByInfo.name}</span>
                                                                    {task.updated_at && (() => {
                                                                        try {
                                                                            const date = new Date(task.updated_at);
                                                                            if (isNaN(date.getTime())) return null;
                                                                            return (
                                                                                <>
                                                                                    <span className="text-xs text-gray-400 italic">
                                                                                        {format(date, 'dd-MM-yyyy hh:mm a')}
                                                                                    </span>
                                                                                    <Badge variant="outline" className={`${getDateBadgeColor(task.updated_at)} w-fit text-xs italic`}>
                                                                                        {formatTimeAgo(task.updated_at)}
                                                                                    </Badge>
                                                                                </>
                                                                            );
                                                                        } catch {
                                                                            return null;
                                                                        }
                                                                    })()}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="hidden md:table-cell align-top">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-sm text-white">{createdByInfo.name}</span>
                                                                    {task.created_at && (() => {
                                                                        try {
                                                                            const date = new Date(task.created_at);
                                                                            if (isNaN(date.getTime())) return null;
                                                                            return (
                                                                                <>
                                                                                    <span className="text-xs text-gray-400 italic">
                                                                                        {format(date, 'dd-MM-yyyy hh:mm a')}
                                                                                    </span>
                                                                                    <Badge variant="outline" className={`${getDateBadgeColor(task.created_at)} text-xs w-fit italic`}>
                                                                                        {formatTimeAgo(task.created_at)}
                                                                                    </Badge>
                                                                                </>
                                                                            );
                                                                        } catch {
                                                                            return null;
                                                                        }
                                                                    })()}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="hidden lg:table-cell align-top">
                                                                <div className="flex items-center gap-2 text-gray-300">
                                                                    <span>{getFrequencyDescription(task)}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="hidden xl:table-cell align-top">
                                                                <span className="text-white">
                                                                    {(() => {
                                                                        const startDate = task.recurrence_start_date || task.start_date;
                                                                        if (!startDate) return 'N/A';
                                                                        try {
                                                                            const date = new Date(startDate);
                                                                            if (isNaN(date.getTime())) return 'N/A';
                                                                            return format(date, 'MMM dd, yyyy');
                                                                        } catch {
                                                                            return 'N/A';
                                                                        }
                                                                    })()}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="hidden sm:table-cell align-top">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-sm text-white">{assignedToInfo.name}</span>
                                                                    {task.created_at && (() => {
                                                                        try {
                                                                            const date = new Date(task.created_at);
                                                                            if (isNaN(date.getTime())) return null;
                                                                            return (
                                                                                <>
                                                                                    <span className="text-xs text-gray-400 italic">
                                                                                        {format(date, 'dd-MM-yyyy hh:mm a')}
                                                                                    </span>
                                                                                    <Badge variant="outline" className={`${getDateBadgeColor(task.created_at)} text-xs w-fit italic`}>
                                                                                        {formatTimeAgo(task.created_at)}
                                                                                    </Badge>
                                                                                </>
                                                                            );
                                                                        } catch {
                                                                            return null;
                                                                        }
                                                                    })()}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="align-top">
                                                                <Badge
                                                                    variant={(task.recurrence_is_active !== undefined ? task.recurrence_is_active : task.is_active) ? 'default' : 'outline'}
                                                                    className={(task.recurrence_is_active !== undefined ? task.recurrence_is_active : task.is_active)
                                                                        ? 'bg-green-500/20 text-green-300 border-green-500/50 hover:bg-green-500/30'
                                                                        : 'bg-gray-500/20 text-gray-300 border-gray-500/50 hover:bg-gray-500/30'
                                                                    }
                                                                >
                                                                    {(task.recurrence_is_active !== undefined ? task.recurrence_is_active : task.is_active) ? 'Active' : 'Inactive'}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'clients' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-48">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input placeholder="Search clients..." className="pl-8 h-9" value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="glass-pane rounded-lg overflow-hidden border border-white/10">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-white/10">
                                        <TableHead>Photo</TableHead>
                                        <TableHead>Entity Name</TableHead>
                                        <TableHead>Organisation</TableHead>
                                        <TableHead>Contact No.</TableHead>
                                        <TableHead>Mail ID</TableHead>
                                        <TableHead>Client Users</TableHead>
                                        <TableHead>My Team</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredClients.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center text-gray-400 py-8">No clients assigned</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredClients.map((client) => (
                                            <TableRow
                                                key={client.id}
                                                className="border-none hover:bg-white/5 cursor-pointer"
                                                onClick={() => navigate('/clients', { state: { clientId: client.id, from: '/team-members', memberId } })}
                                            >
                                                <TableCell>
                                                    <Avatar>
                                                        <AvatarImage
                                                            src={`${import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002'}/clients/${client.id}/photo?token=${user?.access_token}&v=${client.updated_at ? new Date(client.updated_at).getTime() : 0}`}
                                                        />
                                                        <AvatarFallback>{client.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-blue-400 hover:underline">{client.name}</span>
                                                </TableCell>
                                                <TableCell>{client.organization_name || '-'}</TableCell>
                                                <TableCell>{client.mobile || '-'}</TableCell>
                                                <TableCell>{client.email || '-'}</TableCell>
                                                <TableCell>{renderClientUsers(client)}</TableCell>
                                                <TableCell>{renderTeamMembers(client)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {client.is_active ? (
                                                            <Badge variant="success">Active</Badge>
                                                        ) : (
                                                            <Badge variant="destructive">Inactive</Badge>
                                                        )}
                                                        {client.is_locked && (
                                                            <Badge
                                                                variant="destructive"
                                                                className="bg-red-500/20 text-red-400 border-red-500/50 flex items-center gap-1"
                                                            >
                                                                <Lock className="w-3 h-3" />
                                                                Locked
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamMemberDetail;
