import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, Plus, MoreVertical, Edit, Trash2, GripVertical,
    Settings, X, Check, AlertCircle
} from 'lucide-react';
import { 
    listTaskStages, createTaskStage, updateTaskStage, deleteTaskStage,
    updateTask, listTasks
} from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { format } from 'date-fns';

const TaskKanbanView = ({ 
    tasks, 
    clients, 
    services, 
    teamMembers, 
    tags,
    stages: propStages = [],
    onTaskClick,
    onAddNew,
    onRefresh 
}) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [stages, setStages] = useState(propStages || []);
    const [isLoadingStages, setIsLoadingStages] = useState(!propStages || propStages.length === 0);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedTask, setDraggedTask] = useState(null);
    const [showStageDialog, setShowStageDialog] = useState(false);
    const [editingStage, setEditingStage] = useState(null);
    const [stageForm, setStageForm] = useState({ name: '', description: '', color: '#3b82f6', sort_order: 0 });
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [stageToDelete, setStageToDelete] = useState(null);
    const [movingTaskId, setMovingTaskId] = useState(null); // Track which task is being moved
    const [localTasks, setLocalTasks] = useState(tasks || []); // Local copy of tasks for optimistic updates

    const fetchStages = useCallback(async () => {
        if (!user?.agency_id || !user?.access_token) return;
        setIsLoadingStages(true);
        try {
            const stagesData = await listTaskStages(user.agency_id, user.access_token);
            const stagesList = Array.isArray(stagesData) ? stagesData : (stagesData?.items || []);
            setStages(stagesList.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
        } catch (error) {
            console.error('Error fetching stages:', error);
            toast({
                title: 'Error loading stages',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoadingStages(false);
        }
    }, [user?.agency_id, user?.access_token, toast]);

    useEffect(() => {
        // Use prop stages if available, otherwise fetch
        if (propStages && propStages.length > 0) {
            setStages(propStages.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
            setIsLoadingStages(false);
        } else {
            fetchStages();
        }
    }, [propStages, fetchStages]);

    // Update local tasks when prop tasks change
    useEffect(() => {
        if (tasks && Array.isArray(tasks)) {
            setLocalTasks(tasks);
        }
    }, [tasks]);

    const handleDragStart = (e, task) => {
        setIsDragging(true);
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, targetStageId) => {
        e.preventDefault();
        if (!draggedTask) {
            setIsDragging(false);
            setDraggedTask(null);
            return;
        }
        
        // Convert both to strings for comparison
        const draggedStageIdStr = draggedTask.stage_id ? String(draggedTask.stage_id) : null;
        const targetStageIdStr = targetStageId ? String(targetStageId) : null;
        
        if (draggedStageIdStr === targetStageIdStr) {
            setIsDragging(false);
            setDraggedTask(null);
            return;
        }

        // Set loading state for this specific task
        setMovingTaskId(draggedTask.id);
        
        // Optimistically update the task immediately in local state
        setLocalTasks(prevTasks => {
            return prevTasks.map(task => {
                if (task.id === draggedTask.id) {
                    return {
                        ...task,
                        stage_id: targetStageId,
                        stage: stages.find(s => s.id === targetStageId) || task.stage
                    };
                }
                return task;
            });
        });
        
        try {
            const updatedTask = await updateTask(
                draggedTask.id,
                { stage_id: targetStageId },
                user.agency_id,
                user.access_token
            );
            
            // Update local tasks with the response from server to ensure consistency
            setLocalTasks(prevTasks => {
                return prevTasks.map(task => {
                    if (task.id === draggedTask.id) {
                        return {
                            ...task,
                            ...updatedTask,
                            stage_id: targetStageId,
                            stage: stages.find(s => s.id === targetStageId) || task.stage
                        };
                    }
                    return task;
                });
            });
            
            // Call refresh to sync with parent state (but UI already updated)
            if (onRefresh) {
                onRefresh();
            }
            
            toast({
                title: 'Task moved',
                description: 'Task has been moved to the new stage.',
            });
        } catch (error) {
            // Revert optimistic update on error
            setLocalTasks(prevTasks => {
                return prevTasks.map(task => {
                    if (task.id === draggedTask.id) {
                        return {
                            ...task,
                            stage_id: draggedTask.stage_id,
                            stage: draggedTask.stage
                        };
                    }
                    return task;
                });
            });
            
            toast({
                title: 'Error moving task',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsDragging(false);
            setDraggedTask(null);
            // Keep loading state a bit longer to show smooth transition
            setTimeout(() => {
                setMovingTaskId(null);
            }, 300);
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        setDraggedTask(null);
    };

    const openStageDialog = (stage = null) => {
        if (stage) {
            setEditingStage(stage);
            setStageForm({
                name: stage.name,
                description: stage.description || '',
                color: stage.color || '#3b82f6',
                sort_order: stage.sort_order || 0,
            });
        } else {
            setEditingStage(null);
            setStageForm({ name: '', description: '', color: '#3b82f6', sort_order: stages.length });
        }
        setShowStageDialog(true);
    };

    const handleSaveStage = async () => {
        if (!stageForm.name.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Stage name is required',
                variant: 'destructive',
            });
            return;
        }

        try {
            if (editingStage) {
                await updateTaskStage(
                    editingStage.id,
                    stageForm,
                    user.agency_id,
                    user.access_token
                );
                toast({ title: 'Stage updated', description: 'Stage has been updated successfully.' });
            } else {
                await createTaskStage(stageForm, user.agency_id, user.access_token);
                toast({ title: 'Stage created', description: 'New stage has been created.' });
            }
            setShowStageDialog(false);
            fetchStages();
        } catch (error) {
            toast({
                title: `Error ${editingStage ? 'updating' : 'creating'} stage`,
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleDeleteStage = async () => {
        if (!stageToDelete) return;
        try {
            await deleteTaskStage(stageToDelete.id, user.agency_id, user.access_token);
            toast({ title: 'Stage deleted', description: 'Stage has been deleted.' });
            setShowDeleteDialog(false);
            setStageToDelete(null);
            fetchStages();
        } catch (error) {
            toast({
                title: 'Error deleting stage',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const getTasksForStage = (stageId) => {
        if (!Array.isArray(localTasks)) {
            return [];
        }
        
        return localTasks.filter(task => {
            // Support both stage_id and status for backward compatibility
            const taskStageId = task.stage_id || task.stage?.id;
            
            // Convert both to strings for comparison to handle UUID object/string mismatches
            const taskStageIdStr = taskStageId ? String(taskStageId) : null;
            const stageIdStr = stageId ? String(stageId) : null;
            
            // Match if stage IDs match (as strings)
            return taskStageIdStr === stageIdStr;
        });
    };

    const getClientName = (clientId) => {
        if (!clientId || !Array.isArray(clients)) return 'N/A';
        const client = clients.find(c => c.id === clientId || String(c.id) === String(clientId));
        return client?.name || 'N/A';
    };

    const getAssigneeName = (userId) => {
        if (!userId || !Array.isArray(teamMembers)) return 'Unassigned';
        const member = teamMembers.find(m => 
            m.user_id === userId || 
            String(m.user_id) === String(userId) ||
            m.id === userId ||
            String(m.id) === String(userId)
        );
        return member?.name || member?.email || 'Unassigned';
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'P1': return 'bg-red-500/20 text-red-300 border-red-500/50';
            case 'P2': return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
            case 'P3': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
            case 'P4': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
            default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
        }
    };

    if (isLoadingStages) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Kanban Board</h2>
                <div className="flex items-center gap-2">
                    {onAddNew && (
                        <Button onClick={onAddNew} variant="default" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Task
                        </Button>
                    )}
                    <Button onClick={() => openStageDialog()} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Stage
                    </Button>
                </div>
            </div>

            <style>{`
                .kanban-scroll-container::-webkit-scrollbar {
                    height: 12px;
                }
                .kanban-scroll-container::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                }
                .kanban-scroll-container::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.4);
                    border-radius: 6px;
                }
                .kanban-scroll-container::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.6);
                }
            `}</style>
            <div className="flex-1 overflow-x-auto pb-4 kanban-scroll-container" style={{ 
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.4) rgba(255, 255, 255, 0.1)',
                WebkitOverflowScrolling: 'touch'
            }}>
                <div className="flex gap-4 min-w-max h-full" style={{ minHeight: 'calc(100vh - 300px)', paddingBottom: '1rem' }}>
                    {stages.map((stage) => {
                        const stageTasks = getTasksForStage(stage.id);
                        return (
                            <div
                                key={stage.id}
                                className="flex-shrink-0 w-80 flex flex-col"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                <Card className="glass-pane h-full flex flex-col">
                                    <CardContent className="p-4 flex-1 flex flex-col">
                                        <div 
                                            className="flex items-center justify-between mb-4 pb-3 border-b border-white/10"
                                            style={{ borderLeftColor: stage.color, borderLeftWidth: '4px', paddingLeft: '12px' }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: stage.color }}
                                                />
                                                <h3 className="font-semibold text-white">{stage.name}</h3>
                                                <Badge variant="outline" className="ml-2">
                                                    {stageTasks.length}
                                                </Badge>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openStageDialog(stage)}>
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    {!stage.is_default && (
                                                        <DropdownMenuItem 
                                                            onClick={() => {
                                                                setStageToDelete(stage);
                                                                setShowDeleteDialog(true);
                                                            }}
                                                            className="text-red-400"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                            {stageTasks.map((task) => {
                                                const isMoving = movingTaskId === task.id;
                                                
                                                return (
                                                    <Card
                                                        key={task.id}
                                                        className={`glass-card p-3 cursor-pointer hover:bg-white/10 transition-colors relative ${
                                                            isMoving ? 'opacity-50 pointer-events-none' : ''
                                                        }`}
                                                        draggable={!isMoving}
                                                        onDragStart={(e) => !isMoving && handleDragStart(e, task)}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={() => !isMoving && onTaskClick && onTaskClick(task.id)}
                                                    >
                                                        {/* Loading overlay */}
                                                        {isMoving && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg z-10">
                                                                <Loader2 className="w-5 h-5 animate-spin text-white" />
                                                            </div>
                                                        )}
                                                        
                                                        <div className="flex items-start justify-between mb-2">
                                                            <h4 className="font-medium text-white text-sm flex-1">{task.title}</h4>
                                                            <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                                                        </div>
                                                        {task.description && (
                                                            <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                                                                {task.description}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-2 flex-wrap mt-2">
                                                            {task.priority && (
                                                                <Badge 
                                                                    variant="outline" 
                                                                    className={`text-xs ${getPriorityColor(task.priority)}`}
                                                                >
                                                                    {task.priority}
                                                                </Badge>
                                                            )}
                                                            {task.due_date && (
                                                                <span className="text-xs text-gray-400">
                                                                    {format(new Date(task.due_date), 'MMM dd')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                                                            <span>{getClientName(task.client_id)}</span>
                                                            <span>•</span>
                                                            <span>{getAssigneeName(task.assigned_to)}</span>
                                                        </div>
                                                    </Card>
                                                );
                                            })}
                                            {stageTasks.length === 0 && (
                                                <div className="text-center text-gray-400 text-sm py-8">
                                                    No tasks in this stage
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Stage Dialog */}
            <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle>{editingStage ? 'Edit Stage' : 'Create New Stage'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="stage-name">Stage Name *</Label>
                            <Input
                                id="stage-name"
                                value={stageForm.name}
                                onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                                placeholder="e.g., To Do, In Progress, Complete"
                            />
                        </div>
                        <div>
                            <Label htmlFor="stage-description">Description</Label>
                            <Textarea
                                id="stage-description"
                                value={stageForm.description}
                                onChange={(e) => setStageForm({ ...stageForm, description: e.target.value })}
                                placeholder="Optional description for this stage"
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label htmlFor="stage-color">Color</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="stage-color"
                                    type="color"
                                    value={stageForm.color}
                                    onChange={(e) => setStageForm({ ...stageForm, color: e.target.value })}
                                    className="w-16 h-10"
                                />
                                <Input
                                    value={stageForm.color}
                                    onChange={(e) => setStageForm({ ...stageForm, color: e.target.value })}
                                    placeholder="#3b82f6"
                                    className="flex-1"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="stage-order">Sort Order</Label>
                            <Input
                                id="stage-order"
                                type="number"
                                value={stageForm.sort_order}
                                onChange={(e) => setStageForm({ ...stageForm, sort_order: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowStageDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveStage}>
                            {editingStage ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="glass-pane">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Stage</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{stageToDelete?.name}"? 
                            This action cannot be undone. Tasks in this stage will need to be moved first.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStage} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default TaskKanbanView;

