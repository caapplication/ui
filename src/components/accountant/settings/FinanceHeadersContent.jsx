import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Trash2, Edit, MoreVertical, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getFinanceHeaders, createFinanceHeader, updateFinanceHeader, deleteFinanceHeader } from '@/lib/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';

const FinanceHeadersContent = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [openDialog, setOpenDialog] = useState(false);
    const [editingHeader, setEditingHeader] = useState(null);
    const [name, setName] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [financeHeaders, setFinanceHeaders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchFinanceHeaders = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const fetchedHeaders = await getFinanceHeaders(user.agency_id, user.access_token);
            setFinanceHeaders(fetchedHeaders || []);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not fetch finance headers." });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchFinanceHeaders();
    }, [fetchFinanceHeaders]);

    const handleSave = async () => {
        if (!name) {
            toast({ variant: "destructive", title: "Validation Error", description: "Header name cannot be empty." });
            return;
        }

        setIsSubmitting(true);
        const data = { name, value: name, agency_id: user.agency_id };

        try {
            if (editingHeader) {
                await updateFinanceHeader(editingHeader.id, data, user.agency_id, user.access_token);
                toast({ title: "Success", description: "Finance header updated successfully." });
            } else {
                await createFinanceHeader(data, user.agency_id, user.access_token);
                toast({ title: "Success", description: "Finance header created successfully." });
            }
            await fetchFinanceHeaders();
            setOpenDialog(false);
            setEditingHeader(null);
            setName("");
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: `Failed to ${editingHeader ? 'update' : 'create'} finance header.` });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenNew = () => {
        setEditingHeader(null);
        setName("");
        setOpenDialog(true);
    };

    const handleOpenEdit = (header) => {
        setEditingHeader(header);
        setName(header.name);
        setOpenDialog(true);
    };

    const handleDelete = async (headerId) => {
        try {
            await deleteFinanceHeader(headerId, user.agency_id, user.access_token);
            toast({ title: "Success", description: "Finance header deleted successfully." });
            await fetchFinanceHeaders();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to delete finance header." });
        }
    };

    const filteredHeaders = financeHeaders.filter(header => header.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleExport = () => {
        if (financeHeaders.length === 0) {
            toast({ variant: "destructive", title: "Export Error", description: "No data to export." });
            return;
        }

        // Prepare data for export - simple 'Name' column
        const exportData = financeHeaders.map(header => ({
            Name: header.name
        }));

        // Create a new workbook
        const wb = XLSX.utils.book_new();
        // Create a new worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, "Finance Headers");

        // Generate Excel file and trigger download
        XLSX.writeFile(wb, "Finance_Headers.xlsx");

        toast({ title: "Success", description: "Finance headers exported successfully." });
    };

    return (
        <div className='text-white'>
            <div className="flex justify-between items-center mb-6">
                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <Input placeholder="Search finance headers..." className="pl-10 glass-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExport} variant="outline" className="bg-transparent text-white border-white/20 hover:bg-white/10">
                        Export to Excel
                    </Button>
                    <Button onClick={handleOpenNew} className="bg-primary hover:bg-primary/90 text-white">
                        <Plus className="mr-2 h-4 w-4" /> New Finance Header
                    </Button>
                </div>
            </div>
            <div className="glass-card p-4">
                <div className="grid grid-cols-[1fr_auto] px-4 py-2 border-b border-white/10 font-bold uppercase text-sm text-gray-400">
                    <span>Name</span>
                    <span className="text-right">Actions</span>
                </div>
                {isLoading ? (
                    <div className="flex justify-center items-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                ) : filteredHeaders.map((header) => (
                    <div key={header.id} className="grid grid-cols-[1fr_auto] items-center px-4 py-3 border-b border-white/10 last:border-b-0">
                        <span>{header.name}</span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass-pane text-white">
                                <DropdownMenuItem onClick={() => handleOpenEdit(header)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-400 focus:text-red-400 focus:bg-red-400/10">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the finance header.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(header.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
                {!isLoading && filteredHeaders.length === 0 && (
                    <div className="text-center py-10 text-gray-400">No finance headers found.</div>
                )}
            </div>

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="glass-pane text-white">
                    <DialogHeader>
                        <DialogTitle>{editingHeader ? 'Edit Finance Header' : 'New Finance Header'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="header-name">Header Name</Label>
                            <Input id="header-name" placeholder="E.g. Sales, Expenses" className="glass-input" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" className="text-white">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default FinanceHeadersContent;
