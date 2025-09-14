import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Trash2, Edit, MoreVertical } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getBusinessTypes, createBusinessType, updateBusinessType, deleteBusinessType } from '@/lib/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const BusinessTypesContent = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [openDialog, setOpenDialog] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [name, setName] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [businessTypes, setBusinessTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchBusinessTypes = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const fetchedTypes = await getBusinessTypes(user.agency_id, user.access_token);
            setBusinessTypes(fetchedTypes || []);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not fetch business types." });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchBusinessTypes();
    }, [fetchBusinessTypes]);

    const handleSave = async () => {
        if (!name) {
            toast({ variant: "destructive", title: "Validation Error", description: "Business type name cannot be empty." });
            return;
        }
        
        const data = { name };

        try {
            if (editingType) {
                await updateBusinessType(editingType.id, data, user.agency_id, user.access_token);
                toast({ title: "Success", description: "Business type updated successfully." });
            } else {
                await createBusinessType(data, user.agency_id, user.access_token);
                toast({ title: "Success", description: "Business type created successfully." });
            }
            await fetchBusinessTypes();
            setOpenDialog(false);
            setEditingType(null);
            setName("");
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: `Failed to ${editingType ? 'update' : 'create'} business type.` });
        }
    };
    
    const handleOpenNew = () => {
        setEditingType(null);
        setName("");
        setOpenDialog(true);
    };

    const handleOpenEdit = (type) => {
        setEditingType(type);
        setName(type.name);
        setOpenDialog(true);
    };
    
    const handleDelete = async (typeId) => {
        try {
            await deleteBusinessType(typeId, user.agency_id, user.access_token);
            toast({ title: "Success", description: "Business type deleted successfully." });
            await fetchBusinessTypes();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to delete business type." });
        }
    };

    const filteredTypes = businessTypes.filter(type => type.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className='text-white'>
            <div className="flex justify-between items-center mb-6">
                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <Input placeholder="Search business types..." className="pl-10 glass-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Button onClick={handleOpenNew} className="bg-primary hover:bg-primary/90 text-white">
                    <Plus className="mr-2 h-4 w-4" /> New Business Type
                </Button>
            </div>
            <div className="glass-card p-4">
                <div className="grid grid-cols-[1fr_auto] px-4 py-2 border-b border-white/10 font-bold uppercase text-sm text-gray-400">
                    <span>Name</span>
                    <span className="text-right">Actions</span>
                </div>
                {isLoading ? (
                    <div className="flex justify-center items-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                ) : filteredTypes.map((type) => (
                    <div key={type.id} className="grid grid-cols-[1fr_auto] items-center px-4 py-3 border-b border-white/10 last:border-b-0">
                        <span>{type.name}</span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass-pane text-white">
                                <DropdownMenuItem onClick={() => handleOpenEdit(type)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(type.id)} className="text-red-400 focus:text-red-400 focus:bg-red-400/10">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
                 {!isLoading && filteredTypes.length === 0 && (
                    <div className="text-center py-10 text-gray-400">No business types found.</div>
                )}
            </div>

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="glass-pane text-white">
                    <DialogHeader>
                        <DialogTitle>{editingType ? 'Edit Business Type' : 'New Business Type'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="type-name">Business Type Name</Label>
                            <Input id="type-name" placeholder="E.g. LLC, Sole Proprietorship" className="glass-input" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" className="text-white">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BusinessTypesContent;