import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useSocket } from '@/contexts/SocketContext.jsx';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Repeat, LayoutGrid, List, Plus } from 'lucide-react';
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

const TaskManagementPage = ({ entityId, entityName }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedOrg, organisations, selectedEntity, entities } = useOrganisation();
    // Load view mode from localStorage on mount
    const [view, setView] = useState(() => {
        const savedView = localStorage.getItem('taskView') || 'list';
        return savedView === 'kanban' ? 'kanban' : 'list';
    });
    const [viewMode, setViewMode] = useState(() => {
        const savedViewMode = localStorage.getItem('taskViewMode') || 'list';
        return savedViewMode === 'kanban' ? 'kanban' : 'list';
    });
    const [tasks, setTasks] = useState([]);
    const [clients, setClients] = useState([]);
    const [services, setServices] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [tags, setTags] = useState([]);
    const [stages, setStages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingTask, setEditingTask] = useState(null);
    const kanbanViewRef = useRef(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!user?.access_token) {
                throw new Error("User information not available.");
            }
            // For CLIENT users, agency_id might be missing from direct property
            // Try to find it in entities if available
            let agencyId = user?.agency_id || null;
            if (!agencyId && user?.entities && user.entities.length > 0) {
                agencyId = user.entities[0].agency_id;
            }
            // Fallback: Check entities from useOrganisation hook
            if (!agencyId && entities && entities.length > 0) {
                // Try to find one with agency_id
                const entWithAgency = entities.find(e => e.agency_id);
                if (entWithAgency) {
                    agencyId = entWithAgency.agency_id;
                }
            }
            // Last resort: Check localStorage
            if (!agencyId) {
                const storedAgencyId = localStorage.getItem('agency_id');
                if (storedAgencyId) agencyId = storedAgencyId;
            }

            console.debug('TaskManagementPage - Fetching data with config:', {
                role: user?.role,
                userAgencyId: user?.agency_id,
                derivedAgencyId: agencyId,
                entityId: entityId
            });

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
            // Force update by creating a new array reference
            setStages([...stagesArray]);

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
    }, [user, entities, toast]);

    useEffect(() => {
        fetchData();

        if (location.state?.quickAction === 'add-task') {
            handleAddNew();
        }
    }, [fetchData, location.state]);

    const filteredTasks = useMemo(() => {
        // Show all tasks for the organization, no entity filtering
        return tasks;
    }, [tasks]);

    const [showTaskDialog, setShowTaskDialog] = useState(false);

    const handleAddNew = () => {
        setEditingTask(null);
        setShowTaskDialog(true);
    };

    const handleCloseTaskDialog = () => {
        setShowTaskDialog(false);
        setEditingTask(null);
        if (location.state?.returnToDashboard) {
            navigate('/');
        }
    };

    const handleAddStage = () => {
        if (kanbanViewRef.current && kanbanViewRef.current.openStageDialog) {
            kanbanViewRef.current.openStageDialog();
        }
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
            let createdTask = null;
            if (isEditing) {
                await updateTask(editingTask.id, taskData, agencyId, user.access_token);
                toast({ title: "✅ Task Updated", description: `Task "${taskData.title}" has been updated.` });
            } else {
                createdTask = await createTask(taskData, agencyId, user.access_token);
                toast({ title: "✅ Task Created", description: `New task "${taskData.title}" has been added.` });
            }
            setShowTaskDialog(false);
            setEditingTask(null);

            if (location.state?.returnToDashboard) {
                navigate('/');
                return; // Exit early as we are navigating away
            }

            // Lightweight refresh - only fetch tasks, don't show full loader
            try {
                const tasksData = await listTasks(agencyId, user.access_token);
                const tasksArray = Array.isArray(tasksData) ? tasksData : (tasksData?.items || []);
                // Force update by creating a new array reference to ensure React detects the change
                setTasks([...tasksArray]);
            } catch (error) {
                console.error('Error refreshing tasks after save:', error);
                // Fallback to full refresh if lightweight refresh fails
                fetchData();
            }
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
            toast({ title: "✅ Task Deleted", description: "The task has been successfully removed." });

            // Lightweight refresh - only fetch tasks, don't show full loader
            try {
                const tasksData = await listTasks(agencyId, user.access_token);
                const tasksArray = Array.isArray(tasksData) ? tasksData : (tasksData?.items || []);
                // Force update by creating a new array reference to ensure React detects the change
                setTasks([...tasksArray]);
            } catch (error) {
                console.error('Error refreshing tasks after delete:', error);
                // Fallback to optimistic update if refresh fails
                setTasks(prev => {
                    const filtered = prev.filter(t => {
                        const taskIdStr = String(t.id);
                        const deleteIdStr = String(taskId);
                        return taskIdStr !== deleteIdStr;
                    });
                    // Force update by creating a new array reference
                    return [...filtered];
                });
            }
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
                            className="flex-1 min-h-0 w-full"
                        >
                            <TaskKanbanView
                                ref={kanbanViewRef}
                                tasks={filteredTasks}
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
                                onStagesUpdate={async () => {
                                    // Refresh stages in parent component when stages are added/deleted
                                    try {
                                        if (!user?.agency_id || !user?.access_token) return;
                                        const stagesData = await listTaskStages(user.agency_id, user.access_token);
                                        const stagesArray = Array.isArray(stagesData) ? stagesData : (stagesData?.items || []);
                                        // Force update by creating a new array reference
                                        setStages([...stagesArray]);
                                    } catch (error) {
                                        console.error('Error refreshing stages:', error);
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
                        className="flex-1 min-h-0 w-full"
                    >
                        <TaskList
                            tasks={filteredTasks}
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
                            currentUserId={user?.id}
                        />
                    </motion.div>
                );
            default:
                return null;
        }
    };

    // Get display name based on selected entity or organization
    let displayName = entityName; // Use prop if available

    // First, try to get selected entity name FROM CONTEXT if prop not provided
    if (!displayName && selectedEntity && entities?.length > 0) {
        const entity = entities.find(e => {
            const entityIdStr = String(e.id);
            const selectedIdStr = String(selectedEntity);
            return entityIdStr === selectedIdStr;
        });
        if (entity) {
            displayName = entity.name;
        }
    }

    // If no entity selected, try to get organization name
    if (!displayName && selectedOrg && organisations?.length > 0) {
        const org = organisations.find(o => {
            const orgIdStr = String(o.id);
            const selectedIdStr = String(selectedOrg);
            return orgIdStr === selectedIdStr;
        });
        if (org) {
            displayName = org.name;
        }
    }

    // Fallback to user's organization/entity name for business users
    if (!displayName) {
        const isBusinessUser = user?.role === 'CLIENT_USER' || user?.role === 'CLIENT_ADMIN' || user?.role === 'ENTITY_USER';
        if (isBusinessUser) {
            displayName = user?.organization_name || user?.entity_name;
        }
    }

    return (
        <div className="p-4 md:p-8 text-white relative overflow-hidden h-full flex flex-col">
            {(view === 'list' || view === 'kanban') && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <h1 className="text-2xl sm:text-3xl font-bold">
                        Tasks{displayName && <span className="text-2xl sm:text-3xl font-bold text-gray-400 ml-2">- {displayName}</span>}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {viewMode === 'kanban' && (
                            <Button
                                onClick={handleAddStage}
                                variant="outline"
                                className="text-white border-white/20 hover:bg-white/10 rounded-lg"
                            >
                                <Plus className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Add Stage</span>
                            </Button>
                        )}
                        <Link to="/recurring-tasks">
                            <Button
                                variant="outline"
                                className="text-white border-white/20 hover:bg-white/10 rounded-lg"
                            >
                                <Repeat className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Recurring Tasks</span>
                            </Button>
                        </Link>
                        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => {
                                    setViewMode('list');
                                    setView('list');
                                    localStorage.setItem('taskViewMode', 'list');
                                    localStorage.setItem('taskView', 'list');
                                }}
                                className={viewMode === 'list' ? 'bg-white/10' : ''}
                            >
                                <List className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">List</span>
                            </Button>
                            <Button
                                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => {
                                    setViewMode('kanban');
                                    setView('kanban');
                                    localStorage.setItem('taskViewMode', 'kanban');
                                    localStorage.setItem('taskView', 'kanban');
                                }}
                                className={viewMode === 'kanban' ? 'bg-white/10' : ''}
                            >
                                <LayoutGrid className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Kanban</span>
                            </Button>
                        </div>
                        <Button onClick={handleAddNew} className="rounded-lg flex-1 sm:flex-initial">
                            <Plus className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">New Task</span>
                        </Button>
                    </div>
                </div>
            )}
            <AnimatePresence mode="wait">
                {renderContent()}
            </AnimatePresence>

            {/* Task Dialog Modal */}
            <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogContent className="glass-pane max-w-5xl h-[85vh] overflow-y-auto">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-left">{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
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
                        selectedOrg={entityId || selectedOrg}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TaskManagementPage;