import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Plus } from 'lucide-react';

const ClientEntitiesTab = ({ entities = [], onEditEntity, onDeleteEntity, isMutating, onAddEntity }) => {
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newEntityName, setNewEntityName] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    const handleAddEntity = async () => {
        if (!newEntityName.trim()) return;
        setAddLoading(true);
        try {
            if (onAddEntity) {
                await onAddEntity({ name: newEntityName });
            }
            setShowAddDialog(false);
            setNewEntityName('');
        } finally {
            setAddLoading(false);
        }
    };

    return (
        <div className="glass-pane p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-lg text-white">Entities</span>
                <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Entity
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entities.length > 0 ? (
                        entities.map(entity => (
                            <TableRow key={entity.id || entity.entity_id}>
                                <TableCell>{entity.name}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEditEntity && onEditEntity(entity)}
                                        disabled={isMutating}
                                        title="Edit"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDeleteEntity && onDeleteEntity(entity)}
                                        disabled={isMutating}
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan="2" className="text-center">
                                No entities found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Entity</DialogTitle>
                    </DialogHeader>
                    <Input
                        placeholder="Entity Name"
                        value={newEntityName}
                        onChange={e => setNewEntityName(e.target.value)}
                        disabled={addLoading}
                        className="mb-4"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={addLoading}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddEntity} disabled={addLoading || !newEntityName.trim()}>
                            {addLoading ? 'Adding...' : 'Add'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ClientEntitiesTab;
