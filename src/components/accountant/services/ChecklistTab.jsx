import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth.jsx';
import { addChecklistItem, deleteChecklistItem, getServiceDetails } from '@/lib/api/services';

const ChecklistTab = ({ service, onUpdate }) => {
    const [checklist, setChecklist] = useState(service.checklists || []);
    const { toast } = useToast();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);
    const [newItemText, setNewItemText] = useState('');

    useEffect(() => {
        setChecklist(service.checklists || []);
    }, [service]);

    const handleAddStep = async () => {
        if (!newItemText.trim()) {
            toast({ title: "Checklist item cannot be empty.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        try {
            await addChecklistItem(service.id, { item_text: newItemText, is_required: false }, user.agency_id, user.access_token);
            const updatedService = await getServiceDetails(service.id, user.agency_id, user.access_token);
            onUpdate(updatedService);
            setNewItemText('');
            toast({ title: "✅ Success", description: "Checklist item added." });
        } catch (error) {
            toast({ title: "❌ Error", description: `Failed to add checklist item: ${error.message}`, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRemoveStep = async (id) => {
        setIsDeleting(id);
        try {
            await deleteChecklistItem(id, user.agency_id, user.access_token);
            const updatedService = await getServiceDetails(service.id, user.agency_id, user.access_token);
            onUpdate(updatedService);
            toast({ title: "✅ Success", description: "Checklist item removed." });
        } catch (error) {
            toast({ title: "❌ Error", description: `Failed to remove item: ${error.message}`, variant: "destructive" });
        } finally {
            setIsDeleting(null);
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Checklist</h3>
            </div>
            <div className="space-y-3">
                <AnimatePresence>
                    {checklist.map((item) => (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -300 }}
                            transition={{ duration: 0.3 }}
                            className="flex items-center gap-3 p-2 bg-black/10 rounded-lg"
                        >
                            <GripVertical className="w-5 h-5 text-gray-500 cursor-grab" />
                            <p className="flex-grow text-white">{item.item_text}</p>
                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300" onClick={() => handleRemoveStep(item.id)} disabled={isDeleting === item.id}>
                                {isDeleting === item.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                            </Button>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {checklist.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <p>No checklist steps yet.</p>
                    </div>
                )}
            </div>
            <div className="mt-6 flex gap-2">
                <Input 
                    placeholder="Add a new checklist item..."
                    className="glass-input"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStep()}
                />
                <Button onClick={handleAddStep} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Step
                </Button>
            </div>
        </div>
    );
};

export default ChecklistTab;