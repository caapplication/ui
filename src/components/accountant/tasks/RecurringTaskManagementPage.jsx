import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, RefreshCw, ArrowLeft, Search } from 'lucide-react';
import RecurringTaskList from '@/components/accountant/tasks/RecurringTaskList.jsx';
import NewRecurringTaskForm from '@/components/accountant/tasks/NewRecurringTaskForm.jsx';
import {
    listRecurringTasks,
    createRecurringTask,
    updateRecurringTask,
    deleteRecurringTask,
    listClients,
    listServices,
    listTeamMembers,
    getTags
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

            // Status Filter (Tabs) - Client-side filtering
            let matchesStatus = true;
            if (activeFilter === 'active') {
                matchesStatus = task.is_active === true;
            } else if (activeFilter === 'inactive') {
                matchesStatus = task.is_active === false;
            }

            return matchesSearch && matchesClient && matchesAssignee && matchesStatus;
        });
    }, [recurringTasks, searchTerm, clientIdFilter, assigneeIdFilter, activeFilter]);

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
            // Fetch ALL tasks (isActive = null) so we can filter client-side
            const isActive = null;

            const results = await Promise.allSettled([
                listRecurringTasks(agencyId, accessToken, isActive),
                listClients(agencyId, accessToken),
                listServices(agencyId, accessToken),
                listTeamMembers(accessToken),
                getTags(agencyId, accessToken),
            ]);

            console.log('Fetch results:', results.map(r => ({ status: r.status, hasValue: !!r.value })));

            // Handle results with better error handling
            if (results[0].status === 'fulfilled') {
                const tasks = Array.isArray(results[0].value) ? results[0].value : (results[0].value?.items || []);
                console.log('Recurring tasks loaded:', tasks.length);
                setRecurringTasks(tasks);
            } else {
                console.error('Error fetching recurring tasks:', results[0].reason);
                setRecurringTasks([]);
            }

            if (results[1].status === 'fulfilled') {
                const clientsData = Array.isArray(results[1].value) ? results[1].value : (results[1].value?.items || []);
                setClients(clientsData);
            } else {
                console.warn('Error fetching clients:', results[1].reason);
                setClients([]);
            }

            if (results[2].status === 'fulfilled') {
                const servicesData = Array.isArray(results[2].value) ? results[2].value : (results[2].value?.items || []);
                setServices(servicesData);
            } else {
                console.warn('Error fetching services:', results[2].reason);
                setServices([]);
            }

            if (results[3].status === 'fulfilled') {
                const membersData = Array.isArray(results[3].value) ? results[3].value : (results[3].value?.items || []);
                setTeamMembers(membersData);
            } else {
                console.warn('Error fetching team members:', results[3].reason);
                setTeamMembers([]);
            }

            if (results[4].status === 'fulfilled') {
                const tagsData = Array.isArray(results[4].value) ? results[4].value : [];
                setTags(tagsData);
            } else {
                console.warn('Error fetching tags:', results[4].reason);
                setTags([]);
            }

        } catch (error) {
            console.error('Error fetching recurring task data:', error);
            toast({
                title: 'Error fetching data',
                description: error.message || 'Failed to load recurring tasks. Please try again.',
                variant: 'destructive',
            });
            setRecurringTasks([]);
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]); // Removed activeFilter from dependencies to prevent re-fetch

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
    }, [user?.agency_id, user?.access_token, authLoading]); // Removed activeFilter from dependencies

    const handleCreate = async (taskData) => {
        try {
            await createRecurringTask(taskData, user.agency_id, user.access_token);
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

    const handleUpdate = async (taskId, taskData) => {
        try {
            const agencyId = user?.agency_id || localStorage.getItem('agency_id');
            const accessToken = user?.access_token || localStorage.getItem('accessToken');
            await updateRecurringTask(taskId, taskData, agencyId, accessToken);
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
                            <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
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
                                    <Select value={clientIdFilter} onValueChange={setClientIdFilter}>
                                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                            <SelectValue placeholder="Filter by Client" />
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
                    </motion.div>
                )}

                {(view === 'new' || view === 'edit') && (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <NewRecurringTaskForm
                            onSave={view === 'new' ? handleCreate : (data) => handleUpdate(editingTask.id, data)}
                            onCancel={handleCancel}
                            clients={clients}
                            services={services}
                            teamMembers={teamMembers}
                            tags={tags}
                            recurringTask={editingTask}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RecurringTaskManagementPage;

