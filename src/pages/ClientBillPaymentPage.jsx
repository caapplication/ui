import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter, CheckCircle, AlertCircle, Clock, Download } from 'lucide-react';
import { format } from 'date-fns';
import { getClientBillingInvoices, listClientsByOrganization, downloadInvoicePDF } from '@/lib/api';

const ClientBillPaymentPage = ({ entityId }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    
    // For client users, get client_id from multiple sources
    // Priority: entityId prop > user.entities[0].id > localStorage entityId > fetch from API
    const getClientId = () => {
        if (entityId) return entityId;
        if (user?.entities && user.entities.length > 0) return user.entities[0].id;
        const storedEntityId = localStorage.getItem('entityId');
        if (storedEntityId) return storedEntityId;
        return null;
    };
    
    const [clientId, setClientId] = useState(getClientId());
    
    const [invoices, setInvoices] = useState([]);
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    
    // Update clientId when entityId prop changes
    useEffect(() => {
        if (entityId) {
            setClientId(entityId);
        } else if (user?.entities && user.entities.length > 0) {
            setClientId(user.entities[0].id);
        } else {
            const storedEntityId = localStorage.getItem('entityId');
            if (storedEntityId) {
                setClientId(storedEntityId);
            }
        }
    }, [entityId, user?.entities]);
    
    // Fetch client_id if not available
    useEffect(() => {
        const fetchClientId = async () => {
            if (!clientId && user?.access_token && user?.organization_id) {
                // Try to fetch clients for this organization and use the first one
                try {
                    const clients = await listClientsByOrganization(user.organization_id, user.access_token);
                    if (clients && Array.isArray(clients) && clients.length > 0) {
                        setClientId(clients[0].id);
                        localStorage.setItem('entityId', clients[0].id);
                    }
                } catch (error) {
                    console.error('Error fetching clients:', error);
                }
            }
        };
        
        if (!clientId && user) {
            fetchClientId();
        }
    }, [clientId, user]);
    
    useEffect(() => {
        if (clientId && user?.access_token) {
            loadInvoices();
        }
    }, [clientId, user?.access_token]);
    
    useEffect(() => {
        applyFilters();
    }, [invoices, searchTerm, statusFilter]);
    
    const loadInvoices = async () => {
        if (!user?.access_token) return;
        
        // Get client_id - try multiple sources
        const finalClientId = clientId || user?.entities?.[0]?.id || user?.entity_id || localStorage.getItem('entityId');
        
        if (!finalClientId) {
            console.log('Waiting for client_id...', { clientId, userEntities: user?.entities, entityId });
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        try {
            // Get agency_id from user (for CA context) or use a default
            // For client users, we might need to get agency_id differently
            const agencyId = user?.agency_id || localStorage.getItem('agency_id');
            
            const data = await getClientBillingInvoices(finalClientId, agencyId, user.access_token);
            
            // Map to frontend format
            const mappedInvoices = (Array.isArray(data) ? data : []).map(inv => ({
                id: inv.id,
                invoice_number: inv.invoice_number,
                invoice_date: inv.invoice_date,
                due_date: inv.due_date,
                invoice_amount: inv.invoice_amount,
                billing_head: inv.billing_head,
                hsn_sac_code: inv.hsn_sac_code,
                state: inv.state,
                status: inv.status,
                paid_at: inv.paid_at,
            }));
            
            // Sort by invoice date (newest first)
            mappedInvoices.sort((a, b) => {
                const dateA = new Date(a.invoice_date);
                const dateB = new Date(b.invoice_date);
                return dateB - dateA;
            });
            
            setInvoices(mappedInvoices);
        } catch (error) {
            console.error('Error loading invoices:', error);
            toast({
                title: 'Error',
                description: 'Failed to load invoices. ' + (error.message || ''),
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const applyFilters = () => {
        let filtered = [...invoices];
        
        // Search filter (invoice number)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(inv =>
                inv.invoice_number?.toLowerCase().includes(term)
            );
        }
        
        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(inv => inv.status === statusFilter);
        }
        
        setFilteredInvoices(filtered);
    };
    
    const getStatusBadge = (status) => {
        const statusConfig = {
            paid: { label: 'Paid', variant: 'default', icon: CheckCircle, className: 'bg-green-500/20 text-green-400' },
            due: { label: 'Due', variant: 'default', icon: Clock, className: 'bg-yellow-500/20 text-yellow-400' },
            overdue: { label: 'Overdue', variant: 'destructive', icon: AlertCircle, className: 'bg-red-500/20 text-red-400' },
            pending_verification: { label: 'Pending Verification', variant: 'default', icon: Clock, className: 'bg-blue-500/20 text-blue-400' },
        };
        
        const config = statusConfig[status] || statusConfig.due;
        const Icon = config.icon;
        
        return (
            <Badge className={config.className}>
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
            </Badge>
        );
    };
    
    const calculateTotals = () => {
        return filteredInvoices.reduce((acc, inv) => {
            acc.total += parseFloat(inv.invoice_amount || 0);
            if (inv.status === 'paid') {
                acc.paid += parseFloat(inv.invoice_amount || 0);
            } else if (inv.status === 'due' || inv.status === 'overdue') {
                acc.due += parseFloat(inv.invoice_amount || 0);
            }
            return acc;
        }, { total: 0, paid: 0, due: 0 });
    };
    
    const handleDownloadPDF = async (invoiceId) => {
        if (!user?.access_token) return;
        
        const agencyId = user?.agency_id || localStorage.getItem('agency_id');
        
        try {
            await downloadInvoicePDF(invoiceId, agencyId, user.access_token);
            toast({
                title: 'Success',
                description: 'Invoice PDF downloaded successfully',
            });
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast({
                title: 'Error',
                description: 'Failed to download invoice PDF. ' + (error.message || ''),
                variant: 'destructive',
            });
        }
    };
    
    const totals = calculateTotals();
    
    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="mb-6">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white">Bill & Payment</h1>
                    <p className="text-gray-400 mt-1">View and manage your billing invoices</p>
                </div>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <Card className="glass-card border-white/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-gray-400">Total Invoices</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{filteredInvoices.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="glass-card border-white/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-gray-400">Total Amount</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        </CardContent>
                    </Card>
                    <Card className="glass-card border-white/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-gray-400">Due Amount</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-400">₹{totals.due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        </CardContent>
                    </Card>
                </div>
                
                {/* Filters */}
                <Card className="glass-card border-white/5 mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="search" className="text-sm text-gray-400 mb-2 block">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="search"
                                        placeholder="Search by invoice number..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 glass-input text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="status" className="text-sm text-gray-400 mb-2 block">Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="glass-input text-white">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="due">Due</SelectItem>
                                        <SelectItem value="overdue">Overdue</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="pending_verification">Pending Verification</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Table */}
                <Card className="glass-card border-white/5">
                    <CardHeader>
                        <CardTitle className="text-lg text-white">Invoices</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {filteredInvoices.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                No invoices found
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-white/10">
                                            <TableHead className="text-white">Invoice Date</TableHead>
                                            <TableHead className="text-white">Invoice No.</TableHead>
                                            <TableHead className="text-white">Particulars</TableHead>
                                            <TableHead className="text-white">HSN/SAC</TableHead>
                                            <TableHead className="text-white">Amount</TableHead>
                                            <TableHead className="text-white">Status</TableHead>
                                            <TableHead className="text-white">Due Date</TableHead>
                                            <TableHead className="text-white">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredInvoices.map((invoice) => (
                                            <TableRow key={invoice.id} className="border-white/5 hover:bg-white/5">
                                                <TableCell className="text-white">
                                                    {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd MMM yyyy') : '-'}
                                                </TableCell>
                                                <TableCell className="font-medium text-white">{invoice.invoice_number}</TableCell>
                                                <TableCell className="text-white">{invoice.billing_head || '-'}</TableCell>
                                                <TableCell className="text-white">{invoice.hsn_sac_code || '-'}</TableCell>
                                                <TableCell className="text-white">₹{parseFloat(invoice.invoice_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                                                <TableCell className="text-white">
                                                    {invoice.due_date
                                                        ? format(new Date(invoice.due_date), 'dd MMM yyyy')
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDownloadPDF(invoice.id)}
                                                        className="text-white hover:bg-white/10"
                                                    >
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Download
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default ClientBillPaymentPage;
