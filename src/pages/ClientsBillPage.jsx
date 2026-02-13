import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Loader2, Search, Filter, ArrowLeft, CheckCircle, AlertCircle, Clock, Download } from 'lucide-react';
import { format } from 'date-fns';
import { getClientBillingInvoices, listClients, downloadInvoicePDF } from '@/lib/api';

const ClientsBillPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const agencyId = user?.agency_id || localStorage.getItem('agency_id');
    
    const [invoices, setInvoices] = useState([]);
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [clientFilter, setClientFilter] = useState('all');
    
    useEffect(() => {
        loadData();
    }, [user?.access_token, agencyId]);
    
    useEffect(() => {
        applyFilters();
    }, [invoices, searchTerm, statusFilter, clientFilter]);
    
    const loadData = async () => {
        if (!user?.access_token || !agencyId) return;
        
        setIsLoading(true);
        try {
            // Load all clients
            const clientsData = await listClients(agencyId, user.access_token);
            const clientsList = Array.isArray(clientsData) ? clientsData : (clientsData?.results || []);
            setClients(clientsList);
            
            // Load invoices for all clients
            const allInvoices = [];
            for (const client of clientsList) {
                try {
                    const clientInvoices = await getClientBillingInvoices(client.id, agencyId, user.access_token);
                    if (Array.isArray(clientInvoices) && clientInvoices.length > 0) {
                        // Add client name to each invoice and ensure all fields are included
                        const invoicesWithClient = clientInvoices.map(inv => ({
                            ...inv,
                            client_name: client.name,
                            client_id: client.id,
                            billing_head: inv.billing_head,
                            hsn_sac_code: inv.hsn_sac_code,
                            state: inv.state
                        }));
                        allInvoices.push(...invoicesWithClient);
                    }
                } catch (error) {
                    console.error(`Error loading invoices for client ${client.id}:`, error);
                }
            }
            
            // Sort by invoice date (newest first)
            allInvoices.sort((a, b) => {
                const dateA = new Date(a.invoice_date);
                const dateB = new Date(b.invoice_date);
                return dateB - dateA;
            });
            
            setInvoices(allInvoices);
        } catch (error) {
            console.error('Error loading data:', error);
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
        
        // Search filter (invoice number, client name)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(inv =>
                inv.invoice_number?.toLowerCase().includes(term) ||
                inv.client_name?.toLowerCase().includes(term)
            );
        }
        
        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(inv => inv.status === statusFilter);
        }
        
        // Client filter
        if (clientFilter !== 'all') {
            filtered = filtered.filter(inv => inv.client_id === clientFilter);
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
        if (!user?.access_token || !agencyId) return;
        
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
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="text-white hover:bg-white/10"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white">Clients Bills</h1>
                        <p className="text-gray-400 mt-1">View and manage all client billing invoices</p>
                    </div>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="search" className="text-sm text-gray-400 mb-2 block">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="search"
                                        placeholder="Search by invoice number or client name..."
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
                            <div>
                                <Label htmlFor="client" className="text-sm text-gray-400 mb-2 block">Client</Label>
                                <Select value={clientFilter} onValueChange={setClientFilter}>
                                    <SelectTrigger className="glass-input text-white">
                                        <SelectValue placeholder="All Clients" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Clients</SelectItem>
                                        {clients.map(client => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.name}
                                            </SelectItem>
                                        ))}
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
                                            <TableHead className="text-white">Client</TableHead>
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
                                                <TableCell className="text-white">{invoice.client_name || '-'}</TableCell>
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

export default ClientsBillPage;
