import React, { useState, useEffect, useCallback } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { useAuth } from '@/hooks/useAuth.jsx';
    import { useToast } from '@/components/ui/use-toast';
    import { Loader2 } from 'lucide-react';
    import TaskList from '@/components/accountant/tasks/TaskList.jsx';
    import NewTaskForm from '@/components/accountant/tasks/NewTaskForm.jsx';
    import { listTasks, createTask, updateTask, deleteTask as apiDeleteTask, listClients, listServices, listTeamMembers, getTags } from '@/lib/api';
    import { AnimatePresence, motion } from 'framer-motion';
    
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
                const [tasksData, clientsData, servicesData, teamData, tagsData] = await Promise.all([
                    listTasks(user.agency_id, user.access_token),
                    listClients(user.agency_id, user.access_token),
                    listServices(user.agency_id, user.access_token),
                    listTeamMembers(user.access_token),
                    getTags(user.agency_id, user.access_token),
                ]);
    
                setTasks(tasksData || []);
                setClients(clientsData || []);
                setServices(servicesData || []);
                setTeamMembers(teamData || []);
                setTags(tagsData || []);
    
            } catch (error) {
                toast({
                    title: 'Error fetching data',
                    description: error.message,
                    variant: 'destructive',
                });
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
                <AnimatePresence mode="wait">
                    {renderContent()}
                </AnimatePresence>
            </div>
        );
    };
    
    export default TaskManagementPage;