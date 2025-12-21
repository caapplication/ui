import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
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

const RecurringTaskManagementPage = () => {
    const { user } = useAuth();
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

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!user?.agency_id || !user?.access_token) {
                throw new Error("User information not available.");
            }
            
            const isActive = activeFilter === 'all' ? null : activeFilter === 'active';
            
            const results = await Promise.allSettled([
                listRecurringTasks(user.agency_id, user.access_token, isActive),
                listClients(user.agency_id, user.access_token),
                listServices(user.agency_id, user.access_token),
                listTeamMembers(user.access_token),
                getTags(user.agency_id, user.access_token),
            ]);

            setRecurringTasks(results[0].status === 'fulfilled' ? (Array.isArray(results[0].value) ? results[0].value : []) : []);
            setClients(results[1].status === 'fulfilled' ? (Array.isArray(results[1].value) ? results[1].value : (results[1].value?.items || [])) : []);
            setServices(results[2].status === 'fulfilled' ? (Array.isArray(results[2].value) ? results[2].value : (results[2].value?.items || [])) : []);
            setTeamMembers(results[3].status === 'fulfilled' ? (Array.isArray(results[3].value) ? results[3].value : (results[3].value?.items || [])) : []);
            setTags(results[4].status === 'fulfilled' ? (Array.isArray(results[4].value) ? results[4].value : []) : []);

        } catch (error) {
            console.error('Error fetching recurring task data:', error);
            toast({
                title: 'Error fetching data',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [user?.agency_id, user?.access_token, toast, activeFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
            await updateRecurringTask(taskId, taskData, user.agency_id, user.access_token);
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
            await deleteRecurringTask(taskId, user.agency_id, user.access_token);
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

    if (isLoading && recurringTasks.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Recurring Tasks</h1>
                {view === 'list' && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={fetchData}
                            className="text-white border-white/20 hover:bg-white/10"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                        <Button
                            onClick={() => setView('new')}
                            className="bg-primary hover:bg-primary/90"
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
                        <Tabs value={activeFilter} onValueChange={setActiveFilter} className="mb-4">
                            <TabsList>
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="active">Active</TabsTrigger>
                                <TabsTrigger value="inactive">Inactive</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <RecurringTaskList
                            recurringTasks={recurringTasks}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
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

