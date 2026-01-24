import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useSocket } from '@/contexts/SocketContext.jsx';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Repeat, LayoutGrid, List, Plus, History } from 'lucide-react';
import TaskList from '@/components/accountant/tasks/TaskList.jsx';
import TaskKanbanView from '@/components/accountant/tasks/TaskKanbanView.jsx';
import NewTaskForm from '@/components/accountant/tasks/NewTaskForm.jsx';
import { listTasks, createTask, updateTask, deleteTask as apiDeleteTask, listClients, listServices, listTeamMembers, getTags, listTaskStages, listAllClientUsers } from '@/lib/api';
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

            console.debug('TaskManagementPage - Fetching data optimized:', {
                role: user?.role,
                userAgencyId: user?.agency_id,
                derivedAgencyId: agencyId
            });

            // 1. Start ALL requests in parallel immediately
            const tasksPromise = listTasks(agencyId, user.access_token).catch(err => {
                console.warn('Failed to fetch tasks:', err);
                return { items: [] };
            });
            const teamPromise = listTeamMembers(user.access_token).catch(err => {
                console.warn('Failed to fetch team members:', err);
                return [];
            });
            const clientsPromise = listClients(agencyId, user.access_token).catch(err => {
                console.warn('Failed to fetch clients:', err);
                return [];
            });
            const servicesPromise = listServices(agencyId, user.access_token).catch(err => {
                console.warn('Failed to fetch services:', err);
                return [];
            });
            const tagsPromise = getTags(agencyId, user.access_token).catch(err => {
                console.warn('Failed to fetch tags:', err);
                return [];
            });
            const stagesPromise = listTaskStages(agencyId, user.access_token).catch(err => {
                console.warn('Failed to fetch stages:', err);
                return [];
            });
            const entityUsersPromise = listAllClientUsers(user.access_token).catch(err => {
                console.warn('Failed to fetch entity users:', err);
                return [];
            });

            // 2. CRITICAL PHASE: Wait ONLY for Tasks
            // This is the minimum required data to render the main table structure usefully
            // We do NOT wait for team members here because it might fail for Client Users (403 Forbidden)
            // and we don't want to block the UI or show an error state just because of that.
            const criticalResults = await Promise.allSettled([tasksPromise]);

            // Process Critical Data
            const tasksData = criticalResults[0].status === 'fulfilled' ? criticalResults[0].value : { items: [] };

            const tasksArray = Array.isArray(tasksData) ? tasksData : (tasksData?.items || []);
            setTasks(tasksArray);

            // Initialize teamMembers as empty array initially - will be populated in background
            setTeamMembers([]);

            // UNBLOCK UI: Stop spinner and show table immediately
            setIsLoading(false);

            // 3. PROGRESSIVE PHASE: Handle secondary data in background
            // We use Promise.allSettled so we can handle them as a group.
            // Including teamPromise here so it loads in background.
            Promise.allSettled([teamPromise, clientsPromise, servicesPromise, tagsPromise, stagesPromise, entityUsersPromise])
                .then(([teamRes, clientsRes, servicesRes, tagsRes, stagesRes, entityUsersRes]) => {
                    // Update state only if component is still mounted

                    // Handle Team Members (might fail for Client Users, which is expected)
                    let fetchedTeamMembers = [];
                    if (teamRes.status === 'fulfilled') {
                        fetchedTeamMembers = Array.isArray(teamRes.value) ? teamRes.value : (teamRes.value?.items || []);
                    }

                    if (clientsRes.status === 'fulfilled') {
                        setClients(Array.isArray(clientsRes.value) ? clientsRes.value : (clientsRes.value?.items || []));
                    }
                    if (servicesRes.status === 'fulfilled') {
                        setServices(Array.isArray(servicesRes.value) ? servicesRes.value : (servicesRes.value?.items || []));
                    }
                    if (tagsRes.status === 'fulfilled') {
                        setTags(Array.isArray(tagsRes.value) ? tagsRes.value : (tagsRes.value?.items || []));
                    }
                    if (stagesRes.status === 'fulfilled') {
                        const stagesData = stagesRes.value;
                        const stagesArray = Array.isArray(stagesData) ? stagesData : (stagesData?.items || []);
                        setStages([...stagesArray]);
                    }

                    // Handle Entity Users and merge with Team Members
                    let fetchedEntityUsers = [];
                    if (entityUsersRes.status === 'fulfilled') {
                        const res = entityUsersRes.value;
                        const entityUsers = Array.isArray(res) ? res : (res?.items || res?.users || []);

                        // Normalize entity users
                        fetchedEntityUsers = entityUsers.map(u => ({
                            ...u,
                            id: u.user_id || u.id,
                            name: u.name || u.full_name || u.email,
                            role: u.role || 'Client User'
                        }));
                    }

                    // Combine and set Team Members
                    const combined = [...fetchedTeamMembers, ...fetchedEntityUsers];
                    if (combined.length > 0) {
                        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
                        setTeamMembers(unique);
                    }
                })
                .catch(err => console.warn('Background data fetch warning:', err));

        } catch (error) {
            console.error('Error in critical data fetch:', error);
            // On critical failure, we must stop loading and show what we have (or empty)
            setTasks([]);
            setIsLoading(false);

            if (error.message && !error.message.includes('Failed to fetch')) {
                toast({
                    title: 'Error loading tasks',
                    description: error.message,
                    variant: 'destructive',
                });
            }
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
        // Filter out completed tasks from the main view
        return tasks.filter(t => {
            const stageName = (t.stage?.name || t.status || '').toLowerCase();
            return stageName !== 'complete' && stageName !== 'completed';
        });
    }, [tasks]);

    const historyTasks = useMemo(() => {
        // Show only completed tasks for history
        return tasks.filter(t => {
            const stageName = (t.stage?.name || t.status || '').toLowerCase();
            return stageName === 'complete' || stageName === 'completed';
        });
    }, [tasks]);

    const [showHistoryDialog, setShowHistoryDialog] = useState(false);

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
                            isLoading={isLoading}
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
                        <Link to="/tasks/recurring">
                            <Button
                                variant="outline"
                                className="text-white border-white/20 hover:bg-white/10 rounded-lg"
                            >
                                <Repeat className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Recurring Tasks</span>
                            </Button>
                        </Link>
                        <Button
                            onClick={() => setShowHistoryDialog(true)}
                            variant="outline"
                            className="text-white border-white/20 hover:bg-white/10 rounded-lg"
                        >
                            <History className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">History</span>
                        </Button>
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

            {/* History Dialog */}
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogContent className="glass-pane max-w-6xl h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Task History</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 overflow-hidden mt-4">
                        <TaskList
                            tasks={historyTasks}
                            clients={clients}
                            services={services}
                            teamMembers={teamMembers}
                            stages={stages}
                            tags={tags}
                            onAddNew={() => { }} // No adding from history
                            onEditTask={handleEditTask}
                            onDeleteTask={handleDeleteTask}
                            onViewTask={handleViewTask}
                            onRefresh={fetchData}
                            currentUserId={user?.id}
                            isHistoryView={true}
                            isLoading={isLoading}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TaskManagementPage;