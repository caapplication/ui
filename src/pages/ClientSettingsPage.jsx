import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Settings as SettingsIcon, CreditCard, Building2, Plus, Trash2, Loader2, Banknote, FilePen, Search } from 'lucide-react';
import {
    listPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    listDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    listCashDenominations,
    createCashDenomination,
    updateCashDenomination,
    deleteCashDenomination,
} from '@/lib/api/settings';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const TAB_PATHS = { 'payment-methods': 'payment-methods', 'departments': 'departments', 'cash-denomination': 'cash-denomination' };

const ClientSettingsPage = ({ entityId }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();
    const clientId = entityId;

    const pathTab = location.pathname.replace(/^\/settings\/?/, '') || 'payment-methods';
    const activeTab = TAB_PATHS[pathTab] ? pathTab : 'payment-methods';

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

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="">
                <div className="page-header">
                    <h1 className="page-title">Settings</h1>
                    {/* <p className="text-gray-400 text-sm sm:text-base">Payment methods, departments and cash denominations for this entity.</p> */}
                </div>
                <Tabs value={activeTab} onValueChange={(v) => navigate(`/settings/${v}`)} className="w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <TabsList>
                            <TabsTrigger value="payment-methods">
                                <CreditCard className="w-4 h-4 mr-2" />
                                Payment Method
                            </TabsTrigger>
                            <TabsTrigger value="departments">
                                <Building2 className="w-4 h-4 mr-2" />
                                Department
                            </TabsTrigger>
                            <TabsTrigger value="cash-denomination">
                                <Banknote className="w-4 h-4 mr-2" />
                                Cash Denomination
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="payment-methods">
                        <PaymentMethodsTab clientId={clientId} token={user?.access_token} toast={toast} />
                    </TabsContent>
                    <TabsContent value="departments">
                        <DepartmentsTab clientId={clientId} token={user?.access_token} toast={toast} />
                    </TabsContent>
                    <TabsContent value="cash-denomination">
                        <CashDenominationsTab clientId={clientId} token={user?.access_token} toast={toast} />
                    </TabsContent>
                </Tabs>
            </motion.div>
        </div>
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
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredItems = items.filter(item => (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <>
            <Card className="glass-card border-white/5">
                <CardHeader className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="font-semibold tracking-tight text-lg text-white mb-0">Payment Method</CardTitle>
                        <CardDescription className="text-sm sm:text-base mt-0">Add or edit payment methods (e.g. UPI, Bank, Cash).</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">

                        <Button onClick={openCreate} className="h-9 sm:h-10 text-sm flex-shrink-0">
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                            Add
                        </Button>
                        <div className="relative w-full sm:w-64 shrink-0">
                            <Search className="search-icon" />
                            <Input
                                placeholder="Search payment methods..."
                                className="glass-input w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-white" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-white/10">
                                        <TableHead className="text-xs sm:text-sm text-gray-300">Name</TableHead>
                                        <TableHead className="text-right text-xs sm:text-sm text-gray-300">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.length > 0 ? (
                                        filteredItems.map((row) => (
                                            <TableRow key={row.id} className="border-white/10">
                                                <TableCell className="text-xs sm:text-sm font-medium text-white">{row.name}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                                                        <Button size="icon" variant="ghost" onClick={() => openEdit(row)} className="h-7 w-7 sm:h-8 sm:w-8">
                                                            <FilePen className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(row)} className="h-7 w-7 sm:h-8 sm:w-8">
                                                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-gray-400 py-8 text-sm">No payment methods yet. Add UPI, Bank, Cash, etc.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{editing ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
                        <DialogDescription className="text-sm text-gray-400">Used in cashier report and handover.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2 text-left">
                            <Label htmlFor="pm-name" className="text-gray-300">Name</Label>
                            <Input id="pm-name" className="glass-input mt-2 !w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. UPI, Bank, Cash" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" disabled={saving}>Cancel</Button></DialogClose>
                        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent className="w-[95vw] sm:w-full max-w-md bg-gray-900 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl text-white">Are you sure?</DialogTitle>
                        <DialogDescription className="text-sm text-gray-400">This will permanently remove this payment method. This action cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="h-9 sm:h-10 text-sm text-white">Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)} className="h-9 sm:h-10 text-sm">Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
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
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredItems = items.filter(item => (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <>
            <Card className="glass-card border-white/5">
                <CardHeader className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="font-semibold tracking-tight text-lg text-white mb-0">Department</CardTitle>
                        <CardDescription className="text-sm sm:text-base mt-0">Add or edit departments (e.g. Office, Cashier).</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">

                        <Button onClick={openCreate} className="h-9 sm:h-10 text-sm flex-shrink-0">
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                            Add
                        </Button>
                        <div className="relative w-full sm:w-64 shrink-0">
                            <Search className="search-icon" />
                            <Input
                                placeholder="Search departments..."
                                className="glass-input w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-white" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-white/10">
                                        <TableHead className="text-xs sm:text-sm text-gray-300">Name</TableHead>
                                        <TableHead className="text-right text-xs sm:text-sm text-gray-300">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.length > 0 ? (
                                        filteredItems.map((row) => (
                                            <TableRow key={row.id} className="border-white/10">
                                                <TableCell className="text-xs sm:text-sm font-medium text-white">{row.name}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                                                        <Button size="icon" variant="ghost" onClick={() => openEdit(row)} className="h-7 w-7 sm:h-8 sm:w-8">
                                                            <FilePen className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(row)} className="h-7 w-7 sm:h-8 sm:w-8">
                                                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-gray-400 py-8 text-sm">No departments yet. Add Office, Cashier, etc.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{editing ? 'Edit Department' : 'Add Department'}</DialogTitle>
                        <DialogDescription className="text-sm text-gray-400">Used in cashier report and handover.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2 text-left">
                            <Label htmlFor="dept-name" className="text-gray-300">Name</Label>
                            <Input id="dept-name" className="glass-input mt-2 !w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Office, Cashier" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" disabled={saving}>Cancel</Button></DialogClose>
                        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent className="w-[95vw] sm:w-full max-w-md bg-gray-900 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl text-white">Are you sure?</DialogTitle>
                        <DialogDescription className="text-sm text-gray-400">This will permanently remove this department. This action cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="h-9 sm:h-10 text-sm text-white">Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)} className="h-9 sm:h-10 text-sm">Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function CashDenominationsTab({ clientId, token, toast }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [value, setValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchItems = useCallback(async () => {
        if (!clientId || !token) return;
        setLoading(true);
        try {
            const data = await listCashDenominations(clientId, token);
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load cash denominations.' });
        } finally {
            setLoading(false);
        }
    }, [clientId, token, toast]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const openCreate = () => { setEditing(null); setValue(''); setDialogOpen(true); };
    const openEdit = (row) => { setEditing(row); setValue(String(row.value)); setDialogOpen(true); };

    const handleSave = async () => {
        const num = parseFloat(value);
        if (isNaN(num) || num <= 0) {
            toast({ variant: 'destructive', title: 'Validation', description: 'Enter a positive number (e.g. 500, 200).' });
            return;
        }
        setSaving(true);
        try {
            if (editing) {
                await updateCashDenomination(clientId, editing.id, { value: num }, token);
                toast({ title: 'Success', description: 'Denomination updated.' });
            } else {
                await createCashDenomination(clientId, { value: num }, token);
                toast({ title: 'Success', description: 'Denomination added.' });
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
            await deleteCashDenomination(clientId, row.id, token);
            toast({ title: 'Success', description: 'Denomination removed.' });
            setDeleteTarget(null);
            fetchItems();
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Delete failed.' });
        }
    };

    const filteredItems = items.filter(item => (item.value || '').toString().toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <>
            <Card className="glass-card border-white/5">
                <CardHeader className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="font-semibold tracking-tight text-lg text-white mb-0">Cash Denomination</CardTitle>
                        <CardDescription className="text-sm sm:text-base mt-0">Add note/coin values (e.g. ₹500, ₹200). Used in Cash Tally.</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">

                        <Button onClick={openCreate} className="h-9 sm:h-10 text-sm flex-shrink-0">
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                            Add
                        </Button>
                        <div className="relative w-full sm:w-64 shrink-0">
                            <Search className="search-icon" />
                            <Input
                                placeholder="Search denominations..."
                                className="glass-input w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-white" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-white/10">
                                        <TableHead className="text-xs sm:text-sm text-gray-300">Value (₹)</TableHead>
                                        <TableHead className="text-right text-xs sm:text-sm text-gray-300">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.length > 0 ? (
                                        filteredItems.map((row) => (
                                            <TableRow key={row.id} className="border-white/10">
                                                <TableCell className="text-xs sm:text-sm font-medium text-white">₹ {Number(row.value).toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                                                        <Button size="icon" variant="ghost" onClick={() => openEdit(row)} className="h-7 w-7 sm:h-8 sm:w-8">
                                                            <FilePen className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(row)} className="h-7 w-7 sm:h-8 sm:w-8">
                                                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-gray-400 py-8 text-sm">No denominations yet. Add ₹500, ₹200, ₹100, etc.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{editing ? 'Edit Denomination' : 'Add Denomination'}</DialogTitle>
                        <DialogDescription className="text-sm text-gray-400">Value in rupees. Used in Cash Tally denomination table.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2 text-left">
                            <Label htmlFor="denom-value" className="text-gray-300">Value (₹)</Label>
                            <Input id="denom-value" type="number" min={0.01} step={1} className="glass-input mt-2 !w-full" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 500, 200, 100" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" disabled={saving}>Cancel</Button></DialogClose>
                        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent className="w-[95vw] sm:w-full max-w-md bg-gray-900 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl text-white">Are you sure?</DialogTitle>
                        <DialogDescription className="text-sm text-gray-400">This will remove this denomination. It will no longer appear in Cash Tally.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="h-9 sm:h-10 text-sm text-white">Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)} className="h-9 sm:h-10 text-sm">Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default ClientSettingsPage;
