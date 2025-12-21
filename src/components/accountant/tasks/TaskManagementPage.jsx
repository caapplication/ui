import React, { useState, useEffect, useCallback } from 'react';
    import { useNavigate, Link } from 'react-router-dom';
    import { useAuth } from '@/hooks/useAuth.jsx';
    import { useToast } from '@/components/ui/use-toast';
    import { Loader2, Repeat } from 'lucide-react';
    import TaskList from '@/components/accountant/tasks/TaskList.jsx';
    import NewTaskForm from '@/components/accountant/tasks/NewTaskForm.jsx';
    import { listTasks, createTask, updateTask, deleteTask as apiDeleteTask, listClients, listServices, listTeamMembers, getTags } from '@/lib/api';
    import { AnimatePresence, motion } from 'framer-motion';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import { Button } from '@/components/ui/button';
    
    const TaskManagementPage = () => {
        const { user } = useAuth();
        const { toast } = useToast();
        const navigate = useNavigate();
        const [view, setView] = useState('list'); // 'list', 'new', 'edit'
        const [tasks, setTasks] = useState([]);
        const [clients, setClients] = useState([]);
        const [services, setServices] = useState([]);
        const [teamMembers, setTeamMembers] = useState([]);
        const [tags, setTags] = useState([]);
        const [isLoading, setIsLoading] = useState(true);
        const [editingTask, setEditingTask] = useState(null);
    
        const fetchData = useCallback(async () => {
            setIsLoading(true);
            try {
                if (!user?.agency_id || !user?.access_token) {
                    throw new Error("User information not available.");
                }
                // Use Promise.allSettled to handle individual failures gracefully
                const results = await Promise.allSettled([
                    listTasks(user.agency_id, user.access_token).catch(err => {
                        console.warn('Failed to fetch tasks:', err);
                        return { items: [] };
                    }),
                    listClients(user.agency_id, user.access_token),
                    listServices(user.agency_id, user.access_token),
                    listTeamMembers(user.access_token),
                    getTags(user.agency_id, user.access_token),
                ]);
    
                // Extract data from settled promises, handling both fulfilled and rejected states
                const tasksData = results[0].status === 'fulfilled' ? results[0].value : { items: [] };
                const clientsData = results[1].status === 'fulfilled' ? results[1].value : [];
                const servicesData = results[2].status === 'fulfilled' ? results[2].value : [];
                const teamData = results[3].status === 'fulfilled' ? results[3].value : [];
                const tagsData = results[4].status === 'fulfilled' ? results[4].value : [];
    
                // Handle different response formats (direct array or { items: [...] })
                setTasks(Array.isArray(tasksData) ? tasksData : (tasksData?.items || []));
                setClients(Array.isArray(clientsData) ? clientsData : (clientsData?.items || []));
                setServices(Array.isArray(servicesData) ? servicesData : (servicesData?.items || []));
                setTeamMembers(Array.isArray(teamData) ? teamData : (teamData?.items || []));
                setTags(Array.isArray(tagsData) ? tagsData : (tagsData?.items || []));
    
            } catch (error) {
                console.error('Error fetching task data:', error);
                // Set empty arrays to allow UI to render even if API fails
                setTasks([]);
                setClients([]);
                setServices([]);
                setTeamMembers([]);
                setTags([]);
                
                // Only show error toast if it's not a network error (backend might not be running)
                if (error.message && !error.message.includes('Failed to fetch') && !error.message.includes('NetworkError')) {
                    toast({
                        title: 'Error fetching data',
                        description: error.message,
                        variant: 'destructive',
                    });
                }
            } finally {
                setIsLoading(false);
            }
        }, [user?.agency_id, user?.access_token, toast]);
    
        useEffect(() => {
            fetchData();
        }, [fetchData]);
    
        const handleAddNew = () => {
            setEditingTask(null);
            setView('new');
        };
        
        const handleEditTask = (task) => {
            setEditingTask(task);
            setView('edit');
        };
        
        const handleViewTask = (taskId) => {
            navigate(`/tasks/${taskId}`);
        };
    
        const handleBackToList = () => {
            setView('list');
            setEditingTask(null);
            fetchData();
        };
    
        const handleSaveTask = async (taskData, isEditing) => {
            try {
                if (!user?.agency_id || !user?.access_token) {
                    throw new Error("User information not available.");
                }
                if (isEditing) {
                    await updateTask(editingTask.id, taskData, user.agency_id, user.access_token);
                    toast({ title: "✅ Task Updated", description: `Task "${taskData.title}" has been updated.` });
                } else {
                    await createTask(taskData, user.agency_id, user.access_token);
                    toast({ title: "✅ Task Created", description: `New task "${taskData.title}" has been added.` });
                }
                handleBackToList();
            } catch (error) {
                toast({
                    title: `Error ${isEditing ? 'updating' : 'creating'} task`,
                    description: error.message,
                    variant: 'destructive',
                });
            }
        };
        
        const handleDeleteTask = async (taskId) => {
            try {
                if (!user?.agency_id || !user?.access_token) {
                    throw new Error("User information not available.");
                }
                await apiDeleteTask(taskId, user.agency_id, user.access_token);
                toast({ title: "✅ Task Deleted", description: "The task has been successfully removed."});
                setTasks(prev => prev.filter(t => t.id !== taskId));
            } catch (error) {
                toast({
                    title: 'Error deleting task',
                    description: error.message,
                    variant: 'destructive',
                });
            }
        };
    
        const renderContent = () => {
            if (isLoading) {
                return (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    </div>
                );
            }
    
            switch (view) {
                case 'list':
                    return (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, x: -300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 300 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="h-full"
                        >
                            <TaskList
                                tasks={tasks}
                                clients={clients}
                                services={services}
                                teamMembers={teamMembers}
                                tags={tags}
                                onAddNew={handleAddNew}
                                onEditTask={handleEditTask}
                                onDeleteTask={handleDeleteTask}
                                onViewTask={handleViewTask}
                                onRefresh={fetchData}
                            />
                        </motion.div>
                    );
                case 'new':
                case 'edit':
                    return (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, x: 300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -300 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="h-full overflow-y-auto"
                        >
                           <NewTaskForm 
                                onSave={handleSaveTask} 
                                onCancel={handleBackToList}
                                clients={clients}
                                services={services}
                                teamMembers={teamMembers}
                                tags={tags}
                                task={editingTask}
                            />
                        </motion.div>
                    );
                default:
                    return null;
            }
        };
    
        return (
            <div className="p-4 md:p-8 text-white relative overflow-hidden h-full">
                {view === 'list' && (
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-3xl font-bold">Tasks</h1>
                        <Link to="/recurring-tasks">
                            <Button
                                variant="outline"
                                className="text-white border-white/20 hover:bg-white/10"
                            >
                                <Repeat className="w-4 h-4 mr-2" />
                                Recurring Tasks
                            </Button>
                        </Link>
                    </div>
                )}
                <AnimatePresence mode="wait">
                    {renderContent()}
                </AnimatePresence>
            </div>
        );
    };
    
    export default TaskManagementPage;