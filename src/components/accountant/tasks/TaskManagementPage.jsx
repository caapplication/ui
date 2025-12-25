    import React, { useState, useEffect, useCallback } from 'react';
    import { useNavigate, Link } from 'react-router-dom';
    import { useAuth } from '@/hooks/useAuth.jsx';
    import { useToast } from '@/components/ui/use-toast';
    import { Loader2, Repeat, LayoutGrid, List } from 'lucide-react';
    import TaskList from '@/components/accountant/tasks/TaskList.jsx';
    import TaskKanbanView from '@/components/accountant/tasks/TaskKanbanView.jsx';
    import NewTaskForm from '@/components/accountant/tasks/NewTaskForm.jsx';
    import { listTasks, createTask, updateTask, deleteTask as apiDeleteTask, listClients, listServices, listTeamMembers, getTags, listTaskStages } from '@/lib/api';
    import { AnimatePresence, motion } from 'framer-motion';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import { Button } from '@/components/ui/button';
    import { useOrganisation } from '@/hooks/useOrganisation';
    import {
        Dialog,
        DialogContent,
        DialogHeader,
        DialogTitle,
    } from "@/components/ui/dialog";
    
    const TaskManagementPage = () => {
        const { user } = useAuth();
        const { toast } = useToast();
        const navigate = useNavigate();
        const { selectedOrg } = useOrganisation();
        const [view, setView] = useState('list'); // 'list', 'kanban', 'new', 'edit'
        const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
        const [tasks, setTasks] = useState([]);
        const [clients, setClients] = useState([]);
        const [services, setServices] = useState([]);
        const [teamMembers, setTeamMembers] = useState([]);
    const [tags, setTags] = useState([]);
    const [stages, setStages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingTask, setEditingTask] = useState(null);
    
        const fetchData = useCallback(async () => {
            setIsLoading(true);
            try {
                if (!user?.access_token) {
                    throw new Error("User information not available.");
                }
                // For CLIENT users, agency_id might be null/undefined - API will handle it
                const agencyId = user?.agency_id || null;
                // Use Promise.allSettled to handle individual failures gracefully
                const results = await Promise.allSettled([
                    listTasks(agencyId, user.access_token).catch(err => {
                        console.warn('Failed to fetch tasks:', err);
                        return { items: [] };
                    }),
                    listClients(agencyId, user.access_token).catch(err => {
                        console.warn('Failed to fetch clients:', err);
                        return [];
                    }),
                    listServices(agencyId, user.access_token).catch(err => {
                        console.warn('Failed to fetch services:', err);
                        return [];
                    }),
                    listTeamMembers(user.access_token).catch(err => {
                        console.warn('Failed to fetch team members:', err);
                        return [];
                    }),
                    getTags(agencyId, user.access_token).catch(err => {
                        console.warn('Failed to fetch tags:', err);
                        return [];
                    }),
                    listTaskStages(agencyId, user.access_token).catch(err => {
                        console.warn('Failed to fetch stages:', err);
                        return [];
                    }),
                ]);
    
                // Extract data from settled promises, handling both fulfilled and rejected states
                const tasksData = results[0].status === 'fulfilled' ? results[0].value : { items: [] };
                const clientsData = results[1].status === 'fulfilled' ? results[1].value : [];
                const servicesData = results[2].status === 'fulfilled' ? results[2].value : [];
                const teamData = results[3].status === 'fulfilled' ? results[3].value : [];
                const tagsData = results[4].status === 'fulfilled' ? results[4].value : [];
                const stagesData = results[5].status === 'fulfilled' ? results[5].value : [];
    
                // Handle different response formats (direct array or { items: [...] })
                const tasksArray = Array.isArray(tasksData) ? tasksData : (tasksData?.items || []);
                const clientsArray = Array.isArray(clientsData) ? clientsData : (clientsData?.items || []);
                const servicesArray = Array.isArray(servicesData) ? servicesData : (servicesData?.items || []);
                const teamMembersArray = Array.isArray(teamData) ? teamData : (teamData?.items || []);
                const tagsArray = Array.isArray(tagsData) ? tagsData : (tagsData?.items || []);
                const stagesArray = Array.isArray(stagesData) ? stagesData : (stagesData?.items || []);
                
                // Debug: Log data for troubleshooting
                console.debug('TaskManagementPage - Loaded data:', {
                    tasksCount: tasksArray.length,
                    clientsCount: clientsArray.length,
                    servicesCount: servicesArray.length,
                    teamMembersCount: teamMembersArray.length,
                    tagsCount: tagsArray.length,
                    stagesCount: stagesArray.length,
                    sampleTask: tasksArray[0] ? {
                        id: tasksArray[0].id,
                        client_id: tasksArray[0].client_id,
                        assigned_to: tasksArray[0].assigned_to,
                        assignee_id: tasksArray[0].assignee_id
                    } : null,
                    sampleClients: clientsArray.slice(0, 3).map(c => ({ id: c?.id, name: c?.name })),
                    sampleTeamMembers: teamMembersArray.slice(0, 3).map(m => ({ id: m?.id, user_id: m?.user_id, name: m?.name, email: m?.email }))
                });
                
                setTasks(tasksArray);
                setClients(clientsArray);
                setServices(servicesArray);
                setTeamMembers(teamMembersArray);
                setTags(tagsArray);
                setStages(stagesArray);
    
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
        }, [user?.agency_id, user?.access_token, user?.role, toast]);
    
        useEffect(() => {
            fetchData();
        }, [fetchData]);
    
        const [showTaskDialog, setShowTaskDialog] = useState(false);
        
        const handleAddNew = () => {
            setEditingTask(null);
            setShowTaskDialog(true);
        };
        
        const handleCloseTaskDialog = () => {
            setShowTaskDialog(false);
            setEditingTask(null);
        };
        
        const handleEditTask = (task) => {
            setEditingTask(task);
            setShowTaskDialog(true);
        };
        
        const handleViewTask = (taskId) => {
            navigate(`/tasks/${taskId}`);
        };
    
        const handleBackToList = () => {
            setShowTaskDialog(false);
            setEditingTask(null);
            fetchData();
        };
    
        const handleSaveTask = async (taskData, isEditing) => {
            try {
                if (!user?.access_token) {
                    throw new Error("User information not available.");
                }
                const agencyId = user?.agency_id || null;
                if (isEditing) {
                    await updateTask(editingTask.id, taskData, agencyId, user.access_token);
                    toast({ title: "✅ Task Updated", description: `Task "${taskData.title}" has been updated.` });
                } else {
                    await createTask(taskData, agencyId, user.access_token);
                    toast({ title: "✅ Task Created", description: `New task "${taskData.title}" has been added.` });
                }
                setShowTaskDialog(false);
                setEditingTask(null);
                fetchData();
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
                if (!user?.access_token) {
                    throw new Error("User information not available.");
                }
                const agencyId = user?.agency_id || null;
                await apiDeleteTask(taskId, agencyId, user.access_token);
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
                case 'kanban':
                    if (viewMode === 'kanban') {
                        return (
                            <motion.div
                                key="kanban"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="h-full"
                            >
                                <TaskKanbanView
                                    tasks={tasks}
                                    clients={clients}
                                    services={services}
                                    teamMembers={teamMembers}
                                    tags={tags}
                                    stages={stages}
                                    onTaskClick={handleViewTask}
                                    onAddNew={handleAddNew}
                                    onRefresh={async () => {
                                        // Lightweight refresh - only fetch tasks, don't show full loader
                                        try {
                                            if (!user?.agency_id || !user?.access_token) return;
                                            const tasksData = await listTasks(user.agency_id, user.access_token);
                                            setTasks(Array.isArray(tasksData) ? tasksData : (tasksData?.items || []));
                                        } catch (error) {
                                            console.error('Error refreshing tasks:', error);
                                        }
                                    }}
                                />
                            </motion.div>
                        );
                    }
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
                                stages={stages}
                                tags={tags}
                                onAddNew={handleAddNew}
                                onEditTask={handleEditTask}
                                onDeleteTask={handleDeleteTask}
                                onViewTask={handleViewTask}
                                onRefresh={fetchData}
                            />
                        </motion.div>
                    );
                default:
                    return null;
            }
        };
    
        return (
            <div className="p-4 md:p-8 text-white relative overflow-hidden h-full">
                {(view === 'list' || view === 'kanban') && (
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-3xl font-bold">Tasks</h1>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                                <Button
                                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => {
                                        setViewMode('list');
                                        setView('list');
                                    }}
                                    className={viewMode === 'list' ? 'bg-white/10' : ''}
                                >
                                    <List className="w-4 h-4 mr-2" />
                                    List
                                </Button>
                                <Button
                                    variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => {
                                        setViewMode('kanban');
                                        setView('kanban');
                                    }}
                                    className={viewMode === 'kanban' ? 'bg-white/10' : ''}
                                >
                                    <LayoutGrid className="w-4 h-4 mr-2" />
                                    Kanban
                                </Button>
                            </div>
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
                    </div>
                )}
                <AnimatePresence mode="wait">
                    {renderContent()}
                </AnimatePresence>
                
                {/* Task Dialog Modal */}
                <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                    <DialogContent className="glass-pane max-w-5xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                        </DialogHeader>
                        <NewTaskForm 
                            onSave={handleSaveTask} 
                            onCancel={handleCloseTaskDialog}
                            clients={clients}
                            services={services}
                            teamMembers={teamMembers}
                            tags={tags}
                            stages={stages}
                            task={editingTask}
                            selectedOrg={selectedOrg}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        );
    };
    
    export default TaskManagementPage;