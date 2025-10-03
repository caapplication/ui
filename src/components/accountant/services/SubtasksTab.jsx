import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth.jsx';
import { addSubtask, deleteSubtask, getServiceDetails } from '@/lib/api';

const SubtaskItem = ({ task, onRemove, isDeleting }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="glass-pane p-4 rounded-lg flex items-start gap-4"
        >
            <GripVertical className="w-5 h-5 text-gray-500 cursor-grab mt-3 flex-shrink-0" />
            <div className="flex-grow space-y-2">
                <p className="font-semibold text-white">{task.title}</p>
                <p className="text-sm text-gray-400">{task.description}</p>
                <div className="flex gap-4 text-xs text-gray-300 pt-2">
                    {task.due_date_days_from_creation && <span>Due: {task.due_date_days_from_creation} days</span>}
                    {task.target_date_days_from_creation && <span>Target: {task.target_date_days_from_creation} days</span>}
                </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 mt-2" disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the subtask.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onRemove(task.id)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
};

const SubtasksTab = ({ service, onUpdate }) => {
    const [subtasks, setSubtasks] = useState(service.subtasks || []);
    const { toast } = useToast();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);
    const [newSubtask, setNewSubtask] = useState({ title: '', description: '', due_date: 0, target_date: 0, users: '' });
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        setSubtasks(service.subtasks || []);
    }, [service]);

    const handleAddSubtask = async () => {
        if (!newSubtask.title.trim()) {
            toast({ title: "Title is required.", variant: "destructive" });
            return;
        }
        setIsLoading(true);

        const payload = {
            title: newSubtask.title,
            description: newSubtask.description,
            due_date: newSubtask.due_date,
            target_date: newSubtask.target_date,
            users: newSubtask.users,
            enable_workflow: false,
        };

        try {
            await addSubtask(service.id, payload, user.agency_id, user.access_token);
            const updatedService = await getServiceDetails(service.id, user.agency_id, user.access_token);
            onUpdate(updatedService);
            setNewSubtask({ title: '', description: '', due_date: 0, target_date: 0, users: '' });
            setShowAddForm(false);
            toast({ title: "✅ Success", description: "Subtask added." });
        } catch (error) {
            toast({ title: "❌ Error", description: `Failed to add subtask: ${error.message}`, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveSubtask = async (id) => {
        setIsDeleting(id);
        try {
            await deleteSubtask(id, user.access_token);
            const updatedService = await getServiceDetails(service.id, user.agency_id, user.access_token);
            onUpdate(updatedService);
            toast({ title: "✅ Success", description: "Subtask removed." });
        } catch (error) {
            toast({ title: "❌ Error", description: `Failed to remove subtask: ${error.message}`, variant: "destructive" });
        } finally {
            setIsDeleting(null);
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Subtasks</h3>
                <Button variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subtask
                </Button>
            </div>
            
            <AnimatePresence>
            {showAddForm && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="glass-pane p-4 rounded-lg mb-6 space-y-4"
                >
                    <Input placeholder="Title" value={newSubtask.title} onChange={e => setNewSubtask({...newSubtask, title: e.target.value})} className="glass-input" />
                    <Textarea placeholder="Description" value={newSubtask.description} onChange={e => setNewSubtask({...newSubtask, description: e.target.value})} className="glass-input" />
                    <div className="flex gap-4">
                        <Input type="number" placeholder="Due days" value={newSubtask.due_date} onChange={e => setNewSubtask({...newSubtask, due_date: parseInt(e.target.value) || 0})} className="glass-input" />
                        <Input type="number" placeholder="Target days" value={newSubtask.target_date} onChange={e => setNewSubtask({...newSubtask, target_date: parseInt(e.target.value) || 0})} className="glass-input" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                        <Button onClick={handleAddSubtask} disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Subtask'}
                        </Button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            <div className="space-y-4">
                <AnimatePresence>
                    {subtasks.map((task) => (
                        <SubtaskItem 
                            key={task.id} 
                            task={task} 
                            onRemove={handleRemoveSubtask} 
                            isDeleting={isDeleting === task.id}
                        />
                    ))}
                </AnimatePresence>
            </div>
             {subtasks.length === 0 && !showAddForm && (
                <div className="text-center py-10 text-gray-500">
                    <p>No subtasks yet.</p>
                    <p>Click "Add Subtask" to get started.</p>
                </div>
            )}
        </div>
    );
};

export default SubtasksTab;
