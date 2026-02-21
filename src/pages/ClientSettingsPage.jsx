import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Settings as SettingsIcon, ChevronLeft, CreditCard, Building2, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import {
    listPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    listDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
} from '@/lib/api/settings';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ClientSettingsPage = ({ entityId }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const clientId = entityId;

    if (!clientId) {
        return (
            <div className="p-8 h-full flex items-center justify-center text-white">
                <div className="text-center">
                    <SettingsIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h2 className="text-2xl font-bold mb-2">No Entity Selected</h2>
                    <p className="text-gray-400">Please select an entity from the sidebar to manage settings.</p>
                </div>
            </div>
        );
    }

    const settingsNav = [
        { path: 'payment-methods', name: 'Payment Method', icon: CreditCard, component: PaymentMethodsTab },
        { path: 'departments', name: 'Department', icon: Building2, component: DepartmentsTab },
    ];

    return (
        <Routes>
            <Route
                path="/"
                element={
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 sm:p-6 lg:p-8"
                    >
                        <div className="max-w-7xl mx-auto">
                            <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                                <SettingsIcon className="h-8 w-8" /> Settings
                            </h1>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {settingsNav.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.path}
                                            type="button"
                                            onClick={() => navigate(`/settings/${item.path}`)}
                                            className="glass-pane p-6 rounded-xl text-left hover:bg-white/5 transition"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-primary/20 rounded-lg">
                                                    <Icon className="h-6 w-6 text-primary" />
                                                </div>
                                                <h2 className="text-xl font-semibold text-white">{item.name}</h2>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                }
            />
            {settingsNav.map((item) => (
                <Route
                    key={item.path}
                    path={`${item.path}`}
                    element={
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 sm:p-6 lg:p-8"
                        >
                            <div className="max-w-7xl mx-auto">
                                <Button
                                    variant="ghost"
                                    onClick={() => navigate('/settings')}
                                    className="mb-4 text-white hover:bg-white/10"
                                >
                                    <ChevronLeft className="mr-2 h-4 w-4" />
                                    Back to Settings
                                </Button>
                                <item.component clientId={clientId} token={user?.access_token} toast={toast} />
                            </div>
                        </motion.div>
                    }
                />
            ))}
        </Routes>
    );
};

function PaymentMethodsTab({ clientId, token, toast }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetchItems = useCallback(async () => {
        if (!clientId || !token) return;
        setLoading(true);
        try {
            const data = await listPaymentMethods(clientId, token);
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load payment methods.' });
        } finally {
            setLoading(false);
        }
    }, [clientId, token, toast]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const openCreate = () => { setEditing(null); setName(''); setDialogOpen(true); };
    const openEdit = (row) => { setEditing(row); setName(row.name); setDialogOpen(true); };

    const handleSave = async () => {
        const trimmed = name?.trim();
        if (!trimmed) {
            toast({ variant: 'destructive', title: 'Validation', description: 'Name is required.' });
            return;
        }
        setSaving(true);
        try {
            if (editing) {
                await updatePaymentMethod(clientId, editing.id, { name: trimmed }, token);
                toast({ title: 'Success', description: 'Payment method updated.' });
            } else {
                await createPaymentMethod(clientId, { name: trimmed }, token);
                toast({ title: 'Success', description: 'Payment method added.' });
            }
            setDialogOpen(false);
            fetchItems();
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Save failed.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (row) => {
        try {
            await deletePaymentMethod(clientId, row.id, token);
            toast({ title: 'Success', description: 'Payment method removed.' });
            setDeleteTarget(null);
            fetchItems();
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Delete failed.' });
        }
    };

    return (
        <div className="text-white">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <CreditCard className="h-7 w-7" /> Payment Method
            </h2>
            <div className="flex justify-end mb-4">
                <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
            </div>
            <div className="glass-pane p-4 rounded-lg">
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : items.length === 0 ? (
                    <p className="text-gray-400 py-6 text-center">No payment methods yet. Add UPI, Bank, Cash, etc.</p>
                ) : (
                    <ul className="divide-y divide-white/10">
                        {items.map((row) => (
                            <li key={row.id} className="flex items-center justify-between py-3 first:pt-0">
                                <span className="font-medium">{row.name}</span>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="glass-pane border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label className="text-gray-300">Name</Label>
                        <Input
                            className="mt-2 glass-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. UPI, Bank, Cash"
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" disabled={saving}>Cancel</Button></DialogClose>
                        <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent className="glass-pane border-white/10 text-white">
                    <AlertDialogTitle>Delete payment method?</AlertDialogTitle>
                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function DepartmentsTab({ clientId, token, toast }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetchItems = useCallback(async () => {
        if (!clientId || !token) return;
        setLoading(true);
        try {
            const data = await listDepartments(clientId, token);
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load departments.' });
        } finally {
            setLoading(false);
        }
    }, [clientId, token, toast]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const openCreate = () => { setEditing(null); setName(''); setDialogOpen(true); };
    const openEdit = (row) => { setEditing(row); setName(row.name); setDialogOpen(true); };

    const handleSave = async () => {
        const trimmed = name?.trim();
        if (!trimmed) {
            toast({ variant: 'destructive', title: 'Validation', description: 'Name is required.' });
            return;
        }
        setSaving(true);
        try {
            if (editing) {
                await updateDepartment(clientId, editing.id, { name: trimmed }, token);
                toast({ title: 'Success', description: 'Department updated.' });
            } else {
                await createDepartment(clientId, { name: trimmed }, token);
                toast({ title: 'Success', description: 'Department added.' });
            }
            setDialogOpen(false);
            fetchItems();
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Save failed.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (row) => {
        try {
            await deleteDepartment(clientId, row.id, token);
            toast({ title: 'Success', description: 'Department removed.' });
            setDeleteTarget(null);
            fetchItems();
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Delete failed.' });
        }
    };

    return (
        <div className="text-white">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Building2 className="h-7 w-7" /> Department
            </h2>
            <div className="flex justify-end mb-4">
                <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
            </div>
            <div className="glass-pane p-4 rounded-lg">
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : items.length === 0 ? (
                    <p className="text-gray-400 py-6 text-center">No departments yet. Add Office, Cashier, etc.</p>
                ) : (
                    <ul className="divide-y divide-white/10">
                        {items.map((row) => (
                            <li key={row.id} className="flex items-center justify-between py-3 first:pt-0">
                                <span className="font-medium">{row.name}</span>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="glass-pane border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Department' : 'Add Department'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label className="text-gray-300">Name</Label>
                        <Input
                            className="mt-2 glass-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Office, Cashier"
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" disabled={saving}>Cancel</Button></DialogClose>
                        <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent className="glass-pane border-white/10 text-white">
                    <AlertDialogTitle>Delete department?</AlertDialogTitle>
                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default ClientSettingsPage;
