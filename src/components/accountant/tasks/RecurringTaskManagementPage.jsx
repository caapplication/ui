import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, RefreshCw, ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import RecurringTaskList from '@/components/accountant/tasks/RecurringTaskList.jsx';
import NewTaskForm from '@/components/accountant/tasks/NewTaskForm.jsx';
import {
    listRecurringTasks,
    createRecurringTask,
    updateRecurringTask,
    deleteRecurringTask,
    listClients,
    listServices,
    listTeamMembers,
    listAllClientUsers
} from '@/lib/api';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RecurringTaskManagementPage = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [view, setView] = useState('list'); // 'list', 'new', 'edit'
    const [recurringTasks, setRecurringTasks] = useState([]);
    const [clients, setClients] = useState([]);
    const [services, setServices] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [tags, setTags] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingTask, setEditingTask] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'active', 'inactive'
    const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
    const [isLoadingClients, setIsLoadingClients] = useState(true);

    // Pagination states
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [clientIdFilter, setClientIdFilter] = useState('all');
    const [assigneeIdFilter, setAssigneeIdFilter] = useState('all');

    const filteredTasks = useMemo(() => {
        return recurringTasks.filter(task => {
            // Text Search
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                task.title.toLowerCase().includes(searchLower) ||
                (task.description && task.description.toLowerCase().includes(searchLower));

            // Client Filter
            const matchesClient = clientIdFilter === 'all' || task.client_id === clientIdFilter;

            // Assignee Filter
            const matchesAssignee = assigneeIdFilter === 'all' || task.assigned_to === assigneeIdFilter;

            // Note: Status filtering is now backend-side, so we don't filter here.

            return matchesSearch && matchesClient && matchesAssignee;
        });
    }, [recurringTasks, searchTerm, clientIdFilter, assigneeIdFilter]);

    const fetchData = useCallback(async () => {
        // Get agency_id from user or localStorage
        const agencyId = user?.agency_id || localStorage.getItem('agency_id');
        const accessToken = user?.access_token || localStorage.getItem('accessToken');

        // Don't fetch if user is not loaded yet or missing required data
        if (!user || !agencyId || !accessToken) {
            console.log('Skipping fetch - missing data:', { hasUser: !!user, agencyId, hasToken: !!accessToken });
            setIsLoading(false);
            return;
        }

        console.log('Fetching recurring tasks data...');
        setIsLoading(true);
        setHasAttemptedFetch(true);
        try {
            let isActiveParam = null;
            if (activeFilter === 'active') isActiveParam = true;
            if (activeFilter === 'inactive') isActiveParam = false;

            // 1. Fetch Tasks & Team Members FIRST (Critical & Fast)
            // Team Members are fast and needed for "Created By/Assigned To"
            // We WAIT for these so the main table structure is ready.
            const results = await Promise.allSettled([
                listRecurringTasks(agencyId, accessToken, isActiveParam, page, itemsPerPage), // Pass pagination and status
                listTeamMembers(accessToken),
            ]);

            // Recurring Tasks
            if (results[0].status === 'fulfilled') {
                const res = results[0].value;
                const tasks = res.items || (Array.isArray(res) ? res : []);
                console.log('Recurring tasks loaded:', tasks.length);
                setRecurringTasks(tasks);

                if (res.total !== undefined) {
                    setTotalItems(res.total);
                    setTotalPages(res.pages);
                    // Handle edge case where page > totalPages after deletion/filtering
                    if (res.pages > 0 && page > res.pages) {
                        setPage(1); // Reset to first page
                        // Optimization: We could immediately re-fetch here but next render will handle it or user will see empty
                    }
                }
            } else {
                console.error('Error fetching recurring tasks:', results[0].reason);
                setRecurringTasks([]);
                setTotalItems(0);
                setTotalPages(0);
            }

            // Team Members (Needed for Created By / Assigned To)
            // Team Members (Needed for Created By / Assigned To)
            // AND Entity Users (Client Users) to resolve N/A
            const teamMembersPromise = results[1].status === 'fulfilled' ? (Array.isArray(results[1].value) ? results[1].value : (results[1].value?.items || [])) : [];

            // We can fetch entity users here or separate?
            // Since we are inside async, let's fetch entity users separately or promise.all them initially.
            // Let's modify the initial Promise.all to include entityUsers.

            // To avoid complexity of rewriting the whole block, I'll fetch entity users here concurrently if needed, 
            // OR better, I'll just rewrite the initial Promise.all block.
            // But wait, replace_file_content is better for small chunks.
            // Let's do a post-fetch merge.

            let allMembers = [...teamMembersPromise];

            try {
                // Quick fetch for entity users to ensure they are available
                const entityUsersRes = await listAllClientUsers(accessToken);
                const entityUsers = Array.isArray(entityUsersRes) ? entityUsersRes : (entityUsersRes?.items || entityUsersRes?.users || []);
                const normalizedEntityUsers = entityUsers.map(u => ({
                    ...u,
                    id: u.user_id || u.id,
                    name: u.name || u.full_name || u.email,
                    role: u.role || 'Client User'
                }));
                allMembers = [...allMembers, ...normalizedEntityUsers];
            } catch (err) {
                console.warn('Failed to fetch entity users for recurring tasks:', err);
            }

            // Deduplicate
            const uniqueMembers = Array.from(new Map(allMembers.map(item => [item.id, item])).values());
            setTeamMembers(uniqueMembers);

            // STOP LOADING HERE - Show the list immediately (Tasks + Team Names ready)
            setIsLoading(false);

            // 2. Fetch Clients in Background (Slow)
            // The "Client Name" badge will show "Loading..." or ID briefly, then pop in.
            // This prevents the 5s delay on initial load.
            setIsLoadingClients(true); // Start client loading state
            try {
                const clientResult = await listClients(agencyId, accessToken);
                const clientsData = Array.isArray(clientResult) ? clientResult : (clientResult?.items || []);
                setClients(clientsData);
            } catch (clientError) {
                console.warn('Error fetching clients in background:', clientError);
            } finally {
                setIsLoadingClients(false); // Stop client loading state
            }

        } catch (error) {
            console.error('Error fetching recurring task data:', error);
            toast({
                title: 'Error fetching data',
                description: error.message || 'Failed to load recurring tasks. Please try again.',
                variant: 'destructive',
            });
            // If main task fetch fails, ensure we stop loading
            setIsLoading(false);
            setIsLoadingClients(false); // Ensure this is reset on error
        } finally {
            // Ensure loading stops if something catastrophic happens in block 1
            setIsLoading(false);
        }
    }, [user, toast]);

    // Separate fetch for Form data (only when needed)
    const fetchFormData = async () => {
        const agencyId = user?.agency_id || localStorage.getItem('agency_id');
        const accessToken = user?.access_token || localStorage.getItem('accessToken');
        if (!agencyId || !accessToken) return;

        try {
            const results = await Promise.allSettled([
                listServices(agencyId, accessToken),
                getTags(agencyId, accessToken)
            ]);

            if (results[0].status === 'fulfilled') {
                setServices(Array.isArray(results[0].value) ? results[0].value : (results[0].value?.items || []));
            }
            if (results[1].status === 'fulfilled') {
                setTags(Array.isArray(results[1].value) ? results[1].value : []);
            }
        } catch (e) {
            console.error("Error loading form data", e);
        }
    };

    // Trigger form data fetch when entering New or Edit mode
    useEffect(() => {
        if (view === 'new' || view === 'edit') {
            fetchFormData();
        }
    }, [view]);

    useEffect(() => {
        // Only fetch when user is available and auth is not loading
        if (authLoading) {
            return; // Wait for auth to finish loading
        }

        if (!user) {
            setIsLoading(false);
            return;
        }

        const agencyId = user?.agency_id || localStorage.getItem('agency_id');
        const accessToken = user?.access_token || localStorage.getItem('accessToken');

        if (agencyId && accessToken) {
            fetchData();
        } else {
            console.log('Missing required data for fetch:', { agencyId, hasToken: !!accessToken });
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.agency_id, user?.access_token, authLoading, page, activeFilter, itemsPerPage]); // Added page, activeFilter, itemsPerPage dependencies

    const handleCreate = async (taskData, isEdit) => {
        try {
            // Map NewTaskForm data to Recurring Task API format
            const finalTaskData = {
                title: taskData.title,
                client_id: taskData.client_id,
                service_id: taskData.service_id === 'none' ? null : taskData.service_id,
                description: taskData.description,
                assigned_to: taskData.assigned_to,
                priority: taskData.priority,
                tag_id: taskData.tag_id,

                frequency: taskData.recurrence_frequency,
                interval: taskData.recurrence_interval,
                start_date: taskData.recurrence_start_date,
                day_of_week: taskData.recurrence_day_of_week,
                day_of_month: taskData.recurrence_day_of_month,
                due_date_offset: taskData.due_date_offset,
                target_date_offset: taskData.target_date_offset,
                is_active: true
            };

            await createRecurringTask(finalTaskData, user.agency_id, user.access_token);
            toast({
                title: 'Recurring Task Created',
                description: 'The recurring task has been created successfully.',
            });
            setView('list');
            fetchData();
        } catch (error) {
            toast({
                title: 'Error creating recurring task',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleUpdate = async (taskData, isEdit) => {
        try {
            if (!editingTask) return;
            const agencyId = user?.agency_id || localStorage.getItem('agency_id');
            const accessToken = user?.access_token || localStorage.getItem('accessToken');

            const finalTaskData = {
                title: taskData.title,
                client_id: taskData.client_id,
                service_id: taskData.service_id === 'none' ? null : taskData.service_id,
                description: taskData.description,
                assigned_to: taskData.assigned_to,
                priority: taskData.priority,
                tag_id: taskData.tag_id,

                frequency: taskData.recurrence_frequency,
                interval: taskData.recurrence_interval,
                start_date: taskData.recurrence_start_date,
                day_of_week: taskData.recurrence_day_of_week,
                day_of_month: taskData.recurrence_day_of_month,
                due_date_offset: taskData.due_date_offset,
                target_date_offset: taskData.target_date_offset,
                is_active: editingTask.is_active // Preserve existing active state
            };

            await updateRecurringTask(editingTask.id, finalTaskData, agencyId, accessToken);
            toast({
                title: 'Recurring Task Updated',
                description: 'The recurring task has been updated successfully.',
            });
            setView('list');
            setEditingTask(null);
            fetchData();
        } catch (error) {
            toast({
                title: 'Error updating recurring task',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async (taskId) => {
        try {
            const agencyId = user?.agency_id || localStorage.getItem('agency_id');
            const accessToken = user?.access_token || localStorage.getItem('accessToken');
            await deleteRecurringTask(taskId, agencyId, accessToken);
            toast({
                title: 'Recurring Task Deleted',
                description: 'The recurring task has been deleted successfully.',
            });
            fetchData();
        } catch (error) {
            toast({
                title: 'Error deleting recurring task',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleEdit = (task) => {
        setEditingTask(task);
        setView('edit');
    };

    const handleCancel = () => {
        setView('list');
        setEditingTask(null);
    };

    // Show loading state while auth is loading
    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Add a timeout to prevent infinite loading
    useEffect(() => {
        if (!authLoading && user && isLoading) {
            const timer = setTimeout(() => {
                if (isLoading) {
                    console.warn('Fetch taking too long, stopping loading state');
                    setIsLoading(false);
                }
            }, 10000); // 10 second timeout

            return () => clearTimeout(timer);
        }
    }, [authLoading, user, isLoading]);

    if (isLoading && !hasAttemptedFetch && recurringTasks.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/tasks')}
                        className="text-white hover:bg-white/10"
                        title="Back to Tasks"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-3xl font-bold text-white">Recurring Tasks</h1>
                </div>
                {view === 'list' && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={fetchData}
                            disabled={isLoading}
                            className="text-white border-white/20 hover:bg-white/10 bg-white/5"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button
                            onClick={() => setView('new')}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Recurring Task
                        </Button>
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                {view === 'list' && (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <div className="flex flex-col gap-4 mb-6">
                            <Tabs
                                value={activeFilter}
                                onValueChange={(val) => {
                                    setActiveFilter(val);
                                    setPage(1); // Reset to page 1 on filter change
                                }}
                                className="w-full"
                            >
                                <TabsList className="bg-white/10 border border-white/20">
                                    <TabsTrigger
                                        value="all"
                                        className="data-[state=active]:bg-primary data-[state=active]:text-white"
                                    >
                                        All
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="active"
                                        className="data-[state=active]:bg-primary data-[state=active]:text-white"
                                    >
                                        Active
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="inactive"
                                        className="data-[state=active]:bg-primary data-[state=active]:text-white"
                                    >
                                        Inactive
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <div className="flex flex-wrap items-center gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        placeholder="Search recurring tasks..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:bg-white/10 transition-all"
                                    />
                                </div>
                                <div className="w-[200px]">
                                    <Select
                                        value={clientIdFilter}
                                        onValueChange={setClientIdFilter}
                                        disabled={isLoadingClients}
                                    >
                                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                            <SelectValue placeholder={isLoadingClients ? "Loading Clients..." : "Filter by Client"} />
                                            {isLoadingClients && <Loader2 className="w-3 h-3 ml-2 animate-spin" />}
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Clients</SelectItem>
                                            {clients.map(client => (
                                                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-[200px]">
                                    <Select value={assigneeIdFilter} onValueChange={setAssigneeIdFilter}>
                                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                            <SelectValue placeholder="Filter by Assignee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Assignees</SelectItem>
                                            {teamMembers.map(member => (
                                                <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {(searchTerm || clientIdFilter !== 'all' || assigneeIdFilter !== 'all') && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setClientIdFilter('all');
                                            setAssigneeIdFilter('all');
                                        }}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        Clear Filters
                                    </Button>
                                )}
                            </div>
                        </div>

                        <RecurringTaskList
                            recurringTasks={filteredTasks}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            isLoading={isLoading}
                            clients={clients}
                            teamMembers={teamMembers}
                        />

                        {/* Pagination Controls */}
                        {filteredTasks.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 text-white gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-400">Items per page:</span>
                                    <div className="w-[70px]">
                                        <Select
                                            value={String(itemsPerPage)}
                                            onValueChange={(val) => {
                                                setItemsPerPage(Number(val));
                                                setPage(1); // Reset to page 1 on size change
                                            }}
                                            disabled={isLoading}
                                        >
                                            <SelectTrigger className="h-8 bg-white/5 border-white/10 text-white text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="25">25</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                                <SelectItem value="100">100</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-400">
                                        Page {page} of {totalPages} ({totalItems} total)
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1 || isLoading}
                                            className="h-8 w-8 text-white border-white/20 hover:bg-white/10 bg-white/5 disabled:opacity-50"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages || isLoading}
                                            className="h-8 w-8 text-white border-white/20 hover:bg-white/10 bg-white/5 disabled:opacity-50"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {(view === 'new' || view === 'edit') && (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <NewTaskForm
                            onSave={view === 'new' ? handleCreate : handleUpdate}
                            onCancel={handleCancel}
                            clients={clients}
                            services={services}
                            teamMembers={teamMembers}
                            tags={tags}
                            // Map existing recurring task to NewTaskForm expectation
                            task={editingTask ? {
                                ...editingTask,
                                is_recurring: true,
                                recurrence_frequency: editingTask.frequency,
                                recurrence_interval: editingTask.interval,
                                recurrence_start_date: editingTask.start_date,
                                recurrence_day_of_week: editingTask.day_of_week,
                                recurrence_day_of_month: editingTask.day_of_month,
                                due_date_offset: editingTask.due_date_offset,
                                target_date_offset: editingTask.target_date_offset
                            } : null}
                            isRecurringOnly={true}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RecurringTaskManagementPage;

