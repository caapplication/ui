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
import { Loader2, Search, Filter, ArrowLeft, CheckCircle, AlertCircle, Clock, Download, Check, CreditCard, Upload, X, Eye, Pencil, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { getClientBillingInvoices, listClients, getInvoicePDFBlob, markInvoicePaid, updateClientBillingInvoiceStatus, getPaymentProofUrl, uploadClientInvoicePaymentProof, getInvoicePaymentDetails, updateClientBillingInvoice } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

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
    
    // Modals
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isProofModalOpen, setIsProofModalOpen] = useState(false);
    const [proofUrl, setProofUrl] = useState(null);
    const [proofContentType, setProofContentType] = useState(null);
    const [isLoadingProof, setIsLoadingProof] = useState(false);
    
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [isLoadingPaymentDetails, setIsLoadingPaymentDetails] = useState(false);
    const [paymentFile, setPaymentFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    
    // Edit invoice modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        invoice_number: '',
        invoice_date: '',
        due_date: '',
        billing_head: '',
        hsn_sac_code: '',
        monthly_charges_ex_gst: '',
        gst_percent: '',
        state: ''
    });
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    
    // Bill PDF preview modal (click Download -> preview then download)
    const [billPreview, setBillPreview] = useState({ open: false, blobUrl: null, invoiceNumber: '', loading: false });
    
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
            rejected: { label: 'Rejected', variant: 'destructive', icon: AlertCircle, className: 'bg-orange-500/20 text-orange-400' },
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
    
    const handleOpenBillPreview = async (invoice) => {
        if (!user?.access_token || !agencyId || !invoice?.id) return;
        setBillPreview({ open: true, blobUrl: null, invoiceNumber: invoice.invoice_number || '', loading: true });
        try {
            const { url } = await getInvoicePDFBlob(invoice.id, agencyId, user.access_token);
            setBillPreview(prev => ({ ...prev, blobUrl: url, loading: false }));
        } catch (error) {
            console.error('Error loading PDF:', error);
            toast({ title: 'Error', description: 'Failed to load invoice PDF. ' + (error?.message || ''), variant: 'destructive' });
            setBillPreview(prev => ({ ...prev, open: false, loading: false }));
        }
    };

    const closeBillPreview = () => {
        if (billPreview.blobUrl) window.URL.revokeObjectURL(billPreview.blobUrl);
        setBillPreview({ open: false, blobUrl: null, invoiceNumber: '', loading: false });
    };

    const handleDownloadFromBillPreview = () => {
        if (!billPreview.blobUrl) return;
        const a = document.createElement('a');
        a.href = billPreview.blobUrl;
        a.download = `invoice_${billPreview.invoiceNumber || 'bill'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast({ title: 'Downloaded', description: 'Invoice PDF downloaded.' });
    };
    
    const handleMarkPaymentDone = async (invoice) => {
        setSelectedInvoice(invoice);
        setIsProofModalOpen(true);
        setIsLoadingProof(true);
        setProofUrl(null);
        setProofContentType(null);
        
        try {
            const proofData = await getPaymentProofUrl(invoice.id, agencyId, user.access_token);
            const url = proofData.url;
            setProofUrl(url);
            
            // Detect content type from URL or fetch headers
            if (url.toLowerCase().endsWith('.pdf')) {
                setProofContentType('application/pdf');
            } else {
                // Try to detect from URL extension
                const extension = url.split('.').pop()?.toLowerCase();
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
                    setProofContentType(`image/${extension === 'jpg' ? 'jpeg' : extension}`);
                } else {
                    // Try fetching headers to detect content type
                    try {
                        const response = await fetch(url, { method: 'HEAD' });
                        const contentType = response.headers.get('content-type');
                        setProofContentType(contentType || 'image/jpeg');
                    } catch (e) {
                        // Default to image if can't detect
                        setProofContentType('image/jpeg');
                    }
                }
            }
        } catch (error) {
            console.error('Error loading payment proof:', error);
            toast({
                title: 'Error',
                description: 'Failed to load payment proof. ' + (error.message || ''),
                variant: 'destructive',
            });
        } finally {
            setIsLoadingProof(false);
        }
    };
    
    const handleConfirmMarkPaid = async () => {
        if (!selectedInvoice?.id || !user?.access_token || !agencyId) return;
        try {
            await markInvoicePaid(selectedInvoice.id, agencyId, user.access_token);
            toast({
                title: 'Success',
                description: 'Payment marked as done. Invoice status updated to Paid.',
            });
            setIsProofModalOpen(false);
            setSelectedInvoice(null);
            setProofUrl(null);
            setProofContentType(null);
            loadData();
        } catch (error) {
            console.error('Error marking payment done:', error);
            toast({
                title: 'Error',
                description: 'Failed to update invoice. ' + (error.message || ''),
                variant: 'destructive',
            });
        }
    };

    const handleRejectPayment = async () => {
        if (!selectedInvoice?.id || !user?.access_token || !agencyId) return;
        try {
            await updateClientBillingInvoiceStatus(selectedInvoice.id, 'rejected', agencyId, user.access_token);
            toast({
                title: 'Payment rejected',
                description: 'Invoice payment proof rejected. Client can re-upload proof.',
            });
            setIsProofModalOpen(false);
            setSelectedInvoice(null);
            setProofUrl(null);
            setProofContentType(null);
            loadData();
        } catch (error) {
            console.error('Error rejecting payment:', error);
            toast({
                title: 'Error',
                description: 'Failed to reject payment. ' + (error?.message || ''),
                variant: 'destructive',
            });
        }
    };
    
    const handleMakePayment = async (invoice) => {
        setSelectedInvoice(invoice);
        setIsPaymentModalOpen(true);
        setPaymentDetails(null);
        setPaymentFile(null);
        setIsLoadingPaymentDetails(true);
        try {
            const details = await getInvoicePaymentDetails(invoice.id, agencyId, user.access_token);
            setPaymentDetails(details);
        } catch (error) {
            console.error('Error loading payment details:', error);
            toast({
                title: 'Error',
                description: 'Failed to load payment details. ' + (error.message || ''),
                variant: 'destructive',
            });
        } finally {
            setIsLoadingPaymentDetails(false);
        }
    };
    
    const handlePaymentFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast({
                    title: 'File too large',
                    description: 'Please select a file smaller than 10MB',
                    variant: 'destructive',
                });
                return;
            }
            setPaymentFile(file);
        }
    };
    
    const handleDonePayment = async () => {
        if (!paymentFile) {
            toast({
                title: 'Required',
                description: 'Please upload payment proof (screenshot or PDF)',
                variant: 'destructive',
            });
            return;
        }
        if (!selectedInvoice?.id || !user?.access_token || !agencyId) return;
        setIsUploading(true);
        try {
            await uploadClientInvoicePaymentProof(selectedInvoice.id, paymentFile, agencyId, user.access_token);
            toast({
                title: 'Success',
                description: 'Payment proof uploaded. Status updated to Pending Verification.',
            });
            setIsPaymentModalOpen(false);
            setSelectedInvoice(null);
            setPaymentDetails(null);
            setPaymentFile(null);
            loadData();
        } catch (error) {
            console.error('Error uploading payment proof:', error);
            toast({
                title: 'Error',
                description: 'Failed to upload payment proof. ' + (error.message || ''),
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleEditInvoice = (invoice) => {
        setSelectedInvoice(invoice);
        setEditFormData({
            invoice_number: invoice.invoice_number || '',
            invoice_date: invoice.invoice_date || '',
            due_date: invoice.due_date || '',
            billing_head: invoice.billing_head || '',
            hsn_sac_code: invoice.hsn_sac_code || '',
            monthly_charges_ex_gst: invoice.monthly_charges_ex_gst || '',
            gst_percent: invoice.gst_percent || '',
            state: invoice.state || ''
        });
        setIsEditModalOpen(true);
    };
    
    const handleSaveEdit = async () => {
        if (!selectedInvoice?.id || !user?.access_token || !agencyId) return;
        
        // Validate required fields
        if (!editFormData.invoice_number || !editFormData.invoice_date || !editFormData.monthly_charges_ex_gst || !editFormData.gst_percent) {
            toast({
                title: 'Validation Error',
                description: 'Please fill in all required fields',
                variant: 'destructive',
            });
            return;
        }
        
        setIsSavingEdit(true);
        try {
            await updateClientBillingInvoice(selectedInvoice.id, editFormData, agencyId, user.access_token);
            toast({
                title: 'Success',
                description: 'Invoice updated successfully',
            });
            setIsEditModalOpen(false);
            setSelectedInvoice(null);
            loadData();
        } catch (error) {
            console.error('Error updating invoice:', error);
            toast({
                title: 'Error',
                description: 'Failed to update invoice. ' + (error.message || ''),
                variant: 'destructive',
            });
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleExportCSV = () => {
        const headers = ['Invoice Date', 'Invoice No.', 'Client', 'Particulars', 'HSN/SAC', 'Amount', 'Status', 'Due Date'];
        const rows = filteredInvoices.map(inv => [
            inv.invoice_date ? format(new Date(inv.invoice_date), 'yyyy-MM-dd') : '',
            (inv.invoice_number || '').replace(/,/g, ';'),
            (inv.client_name || '').replace(/,/g, ';'),
            (inv.billing_head || '').replace(/,/g, ';'),
            (inv.hsn_sac_code || '').replace(/,/g, ';'),
            parseFloat(inv.invoice_amount || 0).toFixed(2),
            inv.status || '',
            inv.due_date ? format(new Date(inv.due_date), 'yyyy-MM-dd') : ''
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `clients_invoices_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Exported', description: 'Invoices exported as CSV' });
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
                                        <SelectItem value="rejected">Rejected</SelectItem>
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
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-lg text-white">Invoices</CardTitle>
                        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 border-white/20 text-white hover:bg-white/10">
                            <FileDown className="w-4 h-4" />
                            Export CSV
                        </Button>
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
                                                <TableCell className="flex items-center gap-2">
                                                    {invoice.status === 'pending_verification' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleMarkPaymentDone(invoice)}
                                                            className="text-white hover:bg-white/10 h-8 w-8"
                                                            title="Review proof and mark payment done"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {(invoice.status === 'due' || invoice.status === 'overdue') && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEditInvoice(invoice)}
                                                                className="text-white hover:bg-white/10 h-8 w-8"
                                                                title="Edit Invoice"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleMakePayment(invoice)}
                                                                className="text-white hover:bg-white/10 h-8 w-8"
                                                                title="Upload payment proof"
                                                            >
                                                                <CreditCard className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenBillPreview(invoice)}
                                                        className="text-white hover:bg-white/10 h-8 w-8"
                                                        title="View / Download PDF"
                                                    >
                                                        <Download className="w-4 h-4" />
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
            
            {/* Payment Proof Modal (for pending_verification) */}
            <Dialog open={isProofModalOpen} onOpenChange={setIsProofModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white">Review Payment Proof</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Invoice: {selectedInvoice?.invoice_number} — Amount: ₹{selectedInvoice?.invoice_amount != null ? parseFloat(selectedInvoice.invoice_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {isLoadingProof ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                            </div>
                        ) : proofUrl ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-white">Payment Proof</h4>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(proofUrl, '_blank')}
                                        className="flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </Button>
                                </div>
                                <div className="border border-white/10 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center min-h-[400px]">
                                    {proofContentType?.toLowerCase().includes('pdf') || proofUrl.toLowerCase().endsWith('.pdf') ? (
                                        <iframe
                                            src={`${proofUrl}#toolbar=0`}
                                            className="w-full h-[600px]"
                                            title="Payment Proof"
                                        />
                                    ) : (
                                        <img
                                            src={proofUrl}
                                            alt="Payment Proof"
                                            className="max-w-full max-h-[600px] object-contain"
                                            onError={(e) => {
                                                console.error("Payment proof image failed to load:", e);
                                                e.target.style.display = 'none';
                                                const errorDiv = document.createElement('div');
                                                errorDiv.className = 'text-gray-400 text-center p-4';
                                                errorDiv.textContent = 'Failed to load payment proof image';
                                                e.target.parentElement.appendChild(errorDiv);
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-400 text-center py-8">Payment proof not available</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsProofModalOpen(false)} className="border-white/20 text-white">
                            Cancel
                        </Button>
                        {proofUrl && (
                            <>
                                <Button variant="outline" onClick={handleRejectPayment} className="border-red-500/50 text-red-400 hover:bg-red-500/20 gap-2">
                                    Reject
                                </Button>
                                <Button onClick={handleConfirmMarkPaid} className="gap-2">
                                    <Check className="w-4 h-4" />
                                    Mark as Paid
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Make Payment Modal (for CA on Due invoices) */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white">Make Payment</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Invoice: {selectedInvoice?.invoice_number} — Amount: ₹{selectedInvoice?.invoice_amount != null ? parseFloat(selectedInvoice.invoice_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        {isLoadingPaymentDetails ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                            </div>
                        ) : (
                            <>
                                {/* Upload payment proof */}
                                <div className="space-y-2">
                                    <Label className="text-white">Upload payment proof (screenshot or PDF) *</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={handlePaymentFileChange}
                                            className="flex-1 text-white file:mr-2 file:rounded file:border-0 file:bg-white/10 file:text-white"
                                        />
                                        {paymentFile && (
                                            <Button type="button" variant="ghost" size="sm" onClick={() => setPaymentFile(null)} className="text-white">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                    {paymentFile && <p className="text-xs text-gray-500">Selected: {paymentFile.name}</p>}
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)} disabled={isUploading} className="border-white/20 text-white">
                            Cancel
                        </Button>
                        <Button onClick={handleDonePayment} disabled={isUploading || isLoadingPaymentDetails || !paymentFile} className="gap-2">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Edit Invoice Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Invoice</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Invoice: {selectedInvoice?.invoice_number} — Edit invoice details
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="invoice_number" className="text-white">Invoice Number *</Label>
                                <Input
                                    id="invoice_number"
                                    value={editFormData.invoice_number}
                                    onChange={(e) => setEditFormData({ ...editFormData, invoice_number: e.target.value })}
                                    className="bg-gray-800 border-white/10 text-white"
                                />
                            </div>
                            <div>
                                <Label htmlFor="invoice_date" className="text-white">Invoice Date *</Label>
                                <Input
                                    id="invoice_date"
                                    type="date"
                                    value={editFormData.invoice_date}
                                    onChange={(e) => setEditFormData({ ...editFormData, invoice_date: e.target.value })}
                                    className="bg-gray-800 border-white/10 text-white"
                                />
                            </div>
                            <div>
                                <Label htmlFor="due_date" className="text-white">Due Date</Label>
                                <Input
                                    id="due_date"
                                    type="date"
                                    value={editFormData.due_date}
                                    onChange={(e) => setEditFormData({ ...editFormData, due_date: e.target.value })}
                                    className="bg-gray-800 border-white/10 text-white"
                                />
                            </div>
                            <div>
                                <Label htmlFor="billing_head" className="text-white">Billing Head</Label>
                                <Input
                                    id="billing_head"
                                    value={editFormData.billing_head}
                                    onChange={(e) => setEditFormData({ ...editFormData, billing_head: e.target.value })}
                                    className="bg-gray-800 border-white/10 text-white"
                                />
                            </div>
                            <div>
                                <Label htmlFor="hsn_sac_code" className="text-white">HSN/SAC Code</Label>
                                <Input
                                    id="hsn_sac_code"
                                    value={editFormData.hsn_sac_code}
                                    onChange={(e) => setEditFormData({ ...editFormData, hsn_sac_code: e.target.value })}
                                    className="bg-gray-800 border-white/10 text-white"
                                />
                            </div>
                            <div>
                                <Label htmlFor="state" className="text-white">State</Label>
                                <Input
                                    id="state"
                                    value={editFormData.state}
                                    onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                                    className="bg-gray-800 border-white/10 text-white"
                                />
                            </div>
                            <div>
                                <Label htmlFor="monthly_charges_ex_gst" className="text-white">Monthly Charges (Ex GST) *</Label>
                                <Input
                                    id="monthly_charges_ex_gst"
                                    type="number"
                                    step="0.01"
                                    value={editFormData.monthly_charges_ex_gst}
                                    onChange={(e) => setEditFormData({ ...editFormData, monthly_charges_ex_gst: e.target.value })}
                                    className="bg-gray-800 border-white/10 text-white"
                                />
                            </div>
                            <div>
                                <Label htmlFor="gst_percent" className="text-white">GST % *</Label>
                                <Input
                                    id="gst_percent"
                                    type="number"
                                    step="0.01"
                                    value={editFormData.gst_percent}
                                    onChange={(e) => setEditFormData({ ...editFormData, gst_percent: e.target.value })}
                                    className="bg-gray-800 border-white/10 text-white"
                                />
                            </div>
                        </div>
                        {editFormData.monthly_charges_ex_gst && editFormData.gst_percent && (
                            <div className="p-4 bg-gray-800/50 rounded-lg border border-white/10">
                                <div className="text-sm text-gray-400 space-y-1">
                                    <div>GST Amount: ₹{((parseFloat(editFormData.monthly_charges_ex_gst || 0) * parseFloat(editFormData.gst_percent || 0)) / 100).toFixed(2)}</div>
                                    <div className="text-white font-semibold">Total Amount: ₹{(parseFloat(editFormData.monthly_charges_ex_gst || 0) + (parseFloat(editFormData.monthly_charges_ex_gst || 0) * parseFloat(editFormData.gst_percent || 0)) / 100).toFixed(2)}</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSavingEdit} className="border-white/20 text-white">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="gap-2">
                            {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bill PDF Preview Modal */}
            <Dialog open={billPreview.open} onOpenChange={(open) => { if (!open) closeBillPreview(); }}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-gray-900 border-white/10 p-0 overflow-hidden">
                    <DialogHeader className="flex-shrink-0 px-6 py-4 border-b border-white/10 flex flex-row items-center justify-between">
                        <DialogTitle className="text-white">Invoice PDF</DialogTitle>
                        <div className="flex items-center gap-2">
                            {billPreview.blobUrl && (
                                <Button variant="outline" size="sm" onClick={handleDownloadFromBillPreview} className="gap-2 border-white/20 text-white hover:bg-white/10">
                                    <Download className="w-4 h-4" />
                                    Download
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={closeBillPreview} className="text-white hover:bg-white/10 h-8 w-8">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 min-h-[60vh] overflow-auto p-4 bg-black/40">
                        {billPreview.loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-10 h-10 animate-spin text-white" />
                            </div>
                        ) : billPreview.blobUrl ? (
                            <iframe src={billPreview.blobUrl} className="w-full h-[70vh] rounded border border-white/10" title="Invoice PDF" />
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ClientsBillPage;
