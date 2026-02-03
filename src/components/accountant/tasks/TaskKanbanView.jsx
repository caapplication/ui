import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Loader2, Plus, MoreVertical, Edit, Trash2,
    Settings, X, Check, AlertCircle, Bell
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
import { format, formatDistanceToNow, formatDistanceStrict } from 'date-fns';

// Blinking animation style
const blinkStyle = `
@keyframes blink-orange {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
.animate-blink-3s {
  animation: blink-orange 0.5s ease-in-out 6; /* 3 seconds total */
}
`;

const TaskKanbanView = forwardRef(({
    tasks,
    clients,
    services,
    teamMembers,
    tags,
    stages: propStages = [],
    onTaskClick,
    onAddNew,
    onRefresh,
    onStagesUpdate
}, ref) => {
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
    const scrollContainerRef = useRef(null);
    const dragInfo = useRef({ isDragging: false, clientX: 0 });

    // Utility function to deduplicate stages by ID
    const deduplicateStages = useCallback((stagesList) => {
        if (!Array.isArray(stagesList)) return [];

        const stagesMap = new Map();
        stagesList.forEach(stage => {
            if (stage && stage.id) {
                const stageIdStr = String(stage.id);
                // Only add if not already present (keeps first occurrence)
                if (!stagesMap.has(stageIdStr)) {
                    stagesMap.set(stageIdStr, stage);
                }
            }
        });

        return Array.from(stagesMap.values());
    }, []);

    const fetchStages = useCallback(async () => {
        if (!user?.agency_id || !user?.access_token) return;
        setIsLoadingStages(true);
        try {
            const stagesData = await listTaskStages(user.agency_id, user.access_token);
            const stagesList = Array.isArray(stagesData) ? stagesData : (stagesData?.items || []);
            // Deduplicate stages before sorting and setting state
            const uniqueStages = deduplicateStages(stagesList);
            const sortedStages = uniqueStages.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            // Force update by creating a new array reference
            setStages([...sortedStages]);
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
            // Deduplicate prop stages before sorting and setting state
            const uniqueStages = deduplicateStages(propStages);
            const sortedStages = uniqueStages.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            // Force update by creating a new array reference
            setStages([...sortedStages]);
            setIsLoadingStages(false);
        } else {
            fetchStages();
        }
    }, [propStages, fetchStages, deduplicateStages]);

    // Auto-scroll logic
    useEffect(() => {
        if (!isDragging) {
            dragInfo.current.isDragging = false;
            return;
        }

        dragInfo.current.isDragging = true;
        let animationFrameId;

        const autoScroll = () => {
            if (!dragInfo.current.isDragging || !scrollContainerRef.current) return;

            const container = scrollContainerRef.current;
            const { left, right } = container.getBoundingClientRect();
            const { clientX } = dragInfo.current;

            const threshold = 100; // px from edge to start scrolling
            const maxSpeed = 15; // max pixels per frame

            // Scroll Right
            if (clientX > right - threshold) {
                const intensity = Math.min(1, (clientX - (right - threshold)) / threshold);
                container.scrollLeft += maxSpeed * intensity;
            }
            // Scroll Left
            else if (clientX < left + threshold) {
                const intensity = Math.min(1, ((left + threshold) - clientX) / threshold);
                container.scrollLeft -= maxSpeed * intensity;
            }

            animationFrameId = requestAnimationFrame(autoScroll);
        };

        animationFrameId = requestAnimationFrame(autoScroll);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isDragging]);

    // Update local tasks when prop tasks change
    useEffect(() => {
        if (tasks && Array.isArray(tasks)) {
            // Force update by creating a new array reference to ensure React detects the change
            setLocalTasks([...tasks]);
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
        dragInfo.current.clientX = e.clientX;
    };

    const handleDrop = async (e, targetStageId) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent propagation to avoid double handling if dropped on card but bubbled? 
        // Actually, if we drop on stage (empty space), we want this.
        // If we drop on Card, Card's stopPropagation should handle it.

        if (!draggedTask) {
            setIsDragging(false);
            setDraggedTask(null);
            return;
        }

        // Restrict moving to "Request To Close" if not assigned user
        const targetStage = stages.find(s => s.id === targetStageId);
        if (targetStage && targetStage.name.toLowerCase() === 'request to close') {
            const isAssignee = String(draggedTask.assigned_to) === String(user?.id);
            if (!isAssignee) {
                setIsDragging(false);
                setDraggedTask(null);
                toast({
                    title: "Action Not Allowed",
                    description: "Task creator cannot request to close. Only the assigned user can request to close.",
                    variant: "destructive"
                });
                return;
            }
        }

        const draggedStageIdStr = draggedTask.stage_id ? String(draggedTask.stage_id) : null;
        const targetStageIdStr = targetStageId ? String(targetStageId) : null;

        // Note: We allow dropping on same stage now (implies moving to bottom)

        // Set loading state for this specific task
        setMovingTaskId(draggedTask.id);

        // Calculate new sort order (Bottom of list)
        // Find tasks in target stage
        const targetStageTasks = localTasks.filter(t => {
            const tStageId = t.stage_id || t.stage?.id;
            return String(tStageId) === String(targetStageId) && t.id !== draggedTask.id;
        });

        let newSortOrder = 0;
        if (targetStageTasks.length > 0) {
            // Find max sort_order
            const maxOrder = Math.max(...targetStageTasks.map(t => t.sort_order || 0));
            newSortOrder = maxOrder + 10000;
        } else {
            newSortOrder = 0;
        }

        // Optimistically update the task immediately in local state
        setLocalTasks(prevTasks => {
            // Filter out the dragged task first
            const filtered = prevTasks.filter(t => t.id !== draggedTask.id);

            // Create updated task object
            const updatedTaskObj = {
                ...draggedTask,
                stage_id: targetStageId,
                stage: stages.find(s => s.id === targetStageId) || draggedTask.stage,
                sort_order: newSortOrder
            };

            // Append to end of localTasks (guarantees it appears at end of stage list logic)
            return [...filtered, updatedTaskObj];
        });

        try {
            const updatePayload = {
                stage_id: targetStageId,
                sort_order: newSortOrder
            };

            const updatedTask = await updateTask(
                draggedTask.id,
                updatePayload,
                user.agency_id,
                user.access_token
            );

            // Update local tasks with the response from server to ensure consistency
            setLocalTasks(prevTasks => {
                // Filter out the dragged task again to avoid dupes if race condition
                const filtered = prevTasks.filter(t => t.id !== draggedTask.id);
                return [...filtered, {
                    ...draggedTask, // Keep client-side props if any
                    ...updatedTask,
                    stage_id: targetStageId,
                    stage: stages.find(s => s.id === targetStageId) || draggedTask.stage
                }];
            });

            // Call refresh to sync with parent state (but UI already updated)
            if (onRefresh) {
                onRefresh();
            }

            toast({
                title: 'Task moved',
                description: 'Task has been moved.',
            });
        } catch (error) {
            console.error(error);
            // Revert optimistic update on error (approximate revert)
            if (onRefresh) onRefresh();

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

    const handleTaskDrop = async (e, targetTask) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedTask || draggedTask.id === targetTask.id) {
            setIsDragging(false);
            setDraggedTask(null);
            return;
        }

        const targetStageId = targetTask.stage_id || targetTask.stage?.id;

        // Restrict moving to "Request To Close" if not assigned user (same check as handleDrop)
        const targetStage = stages.find(s => s.id === targetStageId);
        if (targetStage && targetStage.name.toLowerCase() === 'request to close') {
            const isAssignee = String(draggedTask.assigned_to) === String(user?.id);
            if (!isAssignee) {
                setIsDragging(false);
                setDraggedTask(null);
                toast({
                    title: "Action Not Allowed",
                    description: "Task creator cannot request to close. Only the assigned user can request to close.",
                    variant: "destructive"
                });
                return;
            }
        }

        // Calculate new sort order
        // 1. Get all tasks in target stage
        // 2. Find target task index
        // 3. Determine if dropping above or below (basic logic: append after for now, or use midpoint)
        // For simplicity: We will insert *before* the target task if we are dragging, 
        // effectively taking the target task's current sort order and shifting others?
        // Better: sort localTasks for this stage, find neighbors, avg sort_order.

        // Basic reorder in localTasks array first for UI responsiveness
        const newTasks = [...localTasks];
        const draggedIndex = newTasks.findIndex(t => t.id === draggedTask.id);
        if (draggedIndex === -1) return;

        // Remove dragged task
        const [removed] = newTasks.splice(draggedIndex, 1);

        // Update stage info
        removed.stage_id = targetStageId;
        removed.stage = stages.find(s => s.id === targetStageId) || removed.stage;

        // Find new index
        // Since we removed 'dragged', indices might have shifted. 
        // We find the target task in the *modified* array
        const targetIndex = newTasks.findIndex(t => t.id === targetTask.id);

        // Insert before target task
        newTasks.splice(targetIndex, 0, removed);

        setLocalTasks(newTasks);
        setIsDragging(false);
        setDraggedTask(null);

        // Calculate sort_order for API
        // We need 'sort_order' of previous and next tasks in the NEW list for that stage
        const stageTasks = newTasks.filter(t => {
            const tStageId = t.stage_id || t.stage?.id;
            return String(tStageId) === String(targetStageId);
        });

        const newIndexInStage = stageTasks.findIndex(t => t.id === draggedTask.id);
        let newSortOrder = 0;

        if (newIndexInStage === 0) {
            // First item
            const nextTask = stageTasks[1];
            newSortOrder = nextTask ? (nextTask.sort_order || 0) - 1000 : 0;
        } else if (newIndexInStage === stageTasks.length - 1) {
            // Last item
            const prevTask = stageTasks[newIndexInStage - 1];
            newSortOrder = (prevTask.sort_order || 0) + 1000;
        } else {
            // Middle
            const prevTask = stageTasks[newIndexInStage - 1];
            const nextTask = stageTasks[newIndexInStage + 1];
            const prevOrder = prevTask.sort_order || 0;
            const nextOrder = nextTask.sort_order || 0;
            newSortOrder = (prevOrder + nextOrder) / 2;
        }

        try {
            await updateTask(
                draggedTask.id,
                {
                    stage_id: targetStageId,
                    sort_order: newSortOrder
                },
                user.agency_id,
                user.access_token
            );

            // Optionally update the local task with the new sort_order to keep math consistent
            setLocalTasks(prev => prev.map(t =>
                t.id === draggedTask.id ? { ...t, sort_order: newSortOrder } : t
            ));

        } catch (error) {
            console.error("Failed to update task order", error);
            // Revert or show toast
            toast({
                title: 'Error reordering task',
                description: error.message,
                variant: 'destructive',
            });
            // Force refresh to restore order
            if (onRefresh) onRefresh();
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

    // Expose openStageDialog to parent via ref
    useImperativeHandle(ref, () => ({
        openStageDialog: () => openStageDialog()
    }));

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
                // Optimistically update the stage in local state
                setStages(prevStages => {
                    const updated = prevStages.map(s => {
                        const stageIdStr = String(s.id);
                        const editIdStr = String(editingStage.id);
                        if (stageIdStr === editIdStr) {
                            return {
                                ...s,
                                ...stageForm,
                                id: s.id // Preserve the original ID
                            };
                        }
                        return s;
                    });
                    // Force update by creating a new array reference
                    return [...updated];
                });

                await updateTaskStage(
                    editingStage.id,
                    stageForm,
                    user.agency_id,
                    user.access_token
                );
                toast({ title: 'Stage updated', description: 'Stage has been updated successfully.' });
            } else {
                // Optimistically add the new stage to local state
                const tempId = `temp-${Date.now()}`;
                const newStage = {
                    id: tempId,
                    name: stageForm.name,
                    description: stageForm.description || '',
                    color: stageForm.color || '#3b82f6',
                    sort_order: stageForm.sort_order || stages.length,
                    is_default: false
                };

                setStages(prevStages => {
                    const updated = [...prevStages, newStage].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                    // Force update by creating a new array reference
                    return [...updated];
                });

                const createdStage = await createTaskStage(stageForm, user.agency_id, user.access_token);
                toast({ title: 'Stage created', description: 'New stage has been created.' });

                // Replace the temporary stage with the actual created stage
                setStages(prevStages => {
                    const updated = prevStages.map(s => {
                        if (String(s.id) === tempId) {
                            return createdStage;
                        }
                        return s;
                    }).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                    // Force update by creating a new array reference
                    return [...updated];
                });
            }
            setShowStageDialog(false);

            // Refresh stages from server to ensure consistency
            await fetchStages();
            // Notify parent component to refresh stages
            if (onStagesUpdate) {
                await onStagesUpdate();
            }
        } catch (error) {
            toast({
                title: `Error ${editingStage ? 'updating' : 'creating'} stage`,
                description: error.message,
                variant: 'destructive',
            });
            // Revert optimistic update on error by refreshing stages
            await fetchStages();
            if (onStagesUpdate) {
                await onStagesUpdate();
            }
        }
    };

    const handleDeleteStage = async () => {
        if (!stageToDelete) return;
        try {
            await deleteTaskStage(stageToDelete.id, user.agency_id, user.access_token);
            toast({ title: 'Stage deleted', description: 'Stage has been deleted.' });
            setShowDeleteDialog(false);

            // Optimistically remove the stage from local state immediately
            setStages(prevStages => {
                const filtered = prevStages.filter(s => {
                    const stageIdStr = String(s.id);
                    const deleteIdStr = String(stageToDelete.id);
                    return stageIdStr !== deleteIdStr;
                });
                // Force update by creating a new array reference
                return [...filtered];
            });

            setStageToDelete(null);

            // Refresh stages from server to ensure consistency
            await fetchStages();
            // Notify parent component to refresh stages
            if (onStagesUpdate) {
                await onStagesUpdate();
            }
        } catch (error) {
            toast({
                title: 'Error deleting stage',
                description: error.message,
                variant: 'destructive',
            });
            // Revert optimistic update on error by refreshing stages
            await fetchStages();
            if (onStagesUpdate) {
                await onStagesUpdate();
            }
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

    const getCreatorName = (task) => {
        // First check if task has created_by_name directly from API
        if (task?.created_by_name) {
            return task.created_by_name;
        }

        // Fallback to looking up in teamMembers array
        const userId = task?.created_by;
        if (!userId || !Array.isArray(teamMembers)) return 'N/A';
        const member = teamMembers.find(m =>
            m.user_id === userId ||
            String(m.user_id) === String(userId) ||
            m.id === userId ||
            String(m.id) === String(userId)
        );
        return member?.name || member?.full_name || member?.email || 'N/A';
    };

    const getTimestampColor = (dateString) => {
        if (!dateString) return 'text-gray-400';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'text-gray-400';

            const now = new Date();
            const diffMs = now - date;
            const diffHours = diffMs / (1000 * 60 * 60);
            const diffDays = diffHours / 24;

            if (diffHours <= 24) {
                return 'text-green-400'; // Green for within 24 hours
            } else if (diffDays <= 7) {
                return 'text-red-400'; // Red for more than 24 hours but less than 7 days
            } else {
                return 'text-yellow-400'; // Yellow for more than 7 days
            }
        } catch {
            return 'text-gray-400';
        }
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
                return 'bg-green-500/20 text-green-300 border-green-500/50'; // Green for within 24 hours
            } else if (diffDays <= 7) {
                return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'; // Yellow for 24h to 7 days
            } else {
                return 'bg-red-500/20 text-red-300 border-red-500/50'; // Red for more than 7 days
            }
        } catch {
            return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
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
        } catch (error) {
            return 'N/A';
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
        <div className="h-full flex flex-col min-h-0">

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
                
                /* Stage column scrollbar styles */
                .kanban-stage-scroll::-webkit-scrollbar {
                    width: 8px;
                }
                .kanban-stage-scroll::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                }
                .kanban-stage-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                }
                .kanban-stage-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            `}</style>
            <div
                ref={scrollContainerRef}
                className="flex-1 w-full overflow-x-scroll overflow-y-hidden kanban-scroll-container min-h-0 pb-2"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255, 255, 255, 0.4) rgba(255, 255, 255, 0.1)',
                    WebkitOverflowScrolling: 'touch',
                }}
            >

                <div className="flex gap-4 min-w-max h-full pr-4">
                    {stages
                        .filter(s => (s.name || '').toLowerCase() !== 'complete' && (s.name || '').toLowerCase() !== 'completed')
                        .map((stage) => {
                            const stageTasks = getTasksForStage(stage.id);
                            return (
                                <div
                                    key={stage.id}
                                    className="flex-shrink-0 w-80 flex flex-col"
                                    style={{ height: 'calc(100vh)', maxHeight: 'calc(100vh - 130px)' }}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, stage.id)}
                                >
                                    <Card className="glass-pane h-full flex flex-col  rounded-2xl ">
                                        <CardContent className="p-4 flex-1 flex flex-col min-h-0 ">
                                            <div
                                                className="flex items-center justify-between mb-4 pb-3 border-b border-white/10 flex-shrink-0"
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

                                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 kanban-stage-scroll min-h-0" style={{
                                                scrollbarWidth: 'thin',
                                                scrollbarColor: 'rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05)',
                                                maxHeight: '100%'
                                            }}>
                                                {stageTasks.map((task, taskIndex) => {
                                                    const isMoving = movingTaskId === task.id;

                                                    return (
                                                        <Card
                                                            key={task.id}
                                                            className={`glass-card p-3 cursor-pointer hover:bg-white/10 transition-colors relative ${isMoving ? 'opacity-50 pointer-events-none' : ''
                                                                }`}
                                                            draggable={!isMoving}
                                                            onDragStart={(e) => !isMoving && handleDragStart(e, task)}
                                                            onDragEnd={handleDragEnd}
                                                            onDragOver={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                            }}
                                                            onDrop={(e) => handleTaskDrop(e, task)}
                                                            onClick={() => !isMoving && onTaskClick && onTaskClick(task.id)}
                                                        >
                                                            {/* Loading overlay */}
                                                            {isMoving && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg z-10">
                                                                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                                                                </div>
                                                            )}

                                                            <div className="flex items-start justify-between mb-2">
                                                                <style>{blinkStyle}</style>
                                                                <h4
                                                                    key={task._last_unread_update || 'static'}
                                                                    className={`font-medium text-sm flex-1 mr-2 flex items-center gap-1.5 ${task.has_unread_messages
                                                                        ? (task._last_unread_update ? 'text-orange-500 animate-blink-3s' : 'text-orange-500')
                                                                        : 'text-white'
                                                                        }`}
                                                                >
                                                                    {task.has_unread_messages && (
                                                                        <Bell className="w-3.5 h-3.5 fill-current flex-shrink-0" />
                                                                    )}
                                                                    {task.title}
                                                                </h4>
                                                                {task.due_date && (
                                                                    <Badge variant="outline" className={`${getDateBadgeColor(task.due_date)} text-[10px] px-1.5 py-0.5 h-auto w-fit italic whitespace-nowrap`}>
                                                                        {formatTimeUntil(task.due_date)}
                                                                    </Badge>
                                                                )}
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
                                                            </div>
                                                            {task.created_at && (
                                                                <div className="mt-2 flex items-center gap-2 text-xs">
                                                                    <span className="text-white">{getCreatorName(task)}</span>
                                                                    <span className={getTimestampColor(task.created_at)}>•</span>
                                                                    <span className={getTimestampColor(task.created_at)}>
                                                                        {format(new Date(task.created_at), 'MMM dd, HH:mm')}
                                                                    </span>
                                                                </div>
                                                            )}
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
});

TaskKanbanView.displayName = 'TaskKanbanView';

export default TaskKanbanView;

