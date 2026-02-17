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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Search, Filter, CheckCircle, AlertCircle, Clock, Download, CreditCard, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { getClientBillingInvoices, listClientsByOrganization, downloadInvoicePDF, getInvoicePaymentDetails, uploadClientInvoicePaymentProof } from '@/lib/api';

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
    
    // Make Payment modal
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [isLoadingPaymentDetails, setIsLoadingPaymentDetails] = useState(false);
    const [paymentFile, setPaymentFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    
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
    
    const handleMakePayment = async (invoice) => {
        setSelectedInvoice(invoice);
        setIsPaymentModalOpen(true);
        setPaymentDetails(null);
        setPaymentFile(null);
        setIsLoadingPaymentDetails(true);
        const agencyId = user?.agency_id || localStorage.getItem('agency_id');
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
        if (!selectedInvoice?.id || !user?.access_token) return;
        const agencyId = user?.agency_id || localStorage.getItem('agency_id');
        setIsUploading(true);
        try {
            await uploadClientInvoicePaymentProof(selectedInvoice.id, paymentFile, agencyId, user.access_token);
            toast({
                title: 'Success',
                description: 'Payment proof uploaded. Status updated to Pending Verification. CA will review and mark as Paid.',
            });
            setIsPaymentModalOpen(false);
            setSelectedInvoice(null);
            setPaymentDetails(null);
            setPaymentFile(null);
            loadInvoices();
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
                                                <TableCell className="flex items-center gap-2">
                                                    {(invoice.status === 'due' || invoice.status === 'overdue') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleMakePayment(invoice)}
                                                            className="text-white hover:bg-white/10 h-8 w-8"
                                                            title="Make Payment"
                                                        >
                                                            <CreditCard className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDownloadPDF(invoice.id)}
                                                        className="text-white hover:bg-white/10 h-8 w-8"
                                                        title="Download PDF"
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
            
            {/* Make Payment Modal */}
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
                                {/* QR Code */}
                                {paymentDetails?.qr_code_url && (
                                    <div className="flex flex-col items-center space-y-4 p-4 border border-white/10 rounded-lg">
                                        <h4 className="font-semibold text-white">Scan QR Code to Pay</h4>
                                        <img
                                            src={paymentDetails.qr_code_url}
                                            alt="Payment QR Code"
                                            className="w-48 h-48 border-2 border-white/20 rounded-lg object-contain bg-white p-2"
                                            onError={(e) => {
                                                console.error('QR code image failed to load:', paymentDetails.qr_code_url);
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerHTML = '<p className="text-red-400">QR code image could not be loaded. Please try refreshing the page.</p>';
                                            }}
                                            crossOrigin="anonymous"
                                        />
                                    </div>
                                )}
                                
                                {/* CA Bank Details */}
                                {paymentDetails?.ca_bank_details && Object.keys(paymentDetails.ca_bank_details).length > 0 && (
                                    <div className="p-4 rounded-lg border border-white/10 space-y-2">
                                        <h4 className="font-semibold text-white">Pay to (CA Company Bank Details)</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                                            {paymentDetails.ca_bank_details.name && (
                                                <div><span className="text-gray-500">Name:</span> <span className="font-medium">{paymentDetails.ca_bank_details.name}</span></div>
                                            )}
                                            {paymentDetails.ca_bank_details.account_holder_name && (
                                                <div><span className="text-gray-500">A/c Holder:</span> <span className="font-medium">{paymentDetails.ca_bank_details.account_holder_name}</span></div>
                                            )}
                                            {paymentDetails.ca_bank_details.bank_name && (
                                                <div><span className="text-gray-500">Bank:</span> <span className="font-medium">{paymentDetails.ca_bank_details.bank_name}</span></div>
                                            )}
                                            {paymentDetails.ca_bank_details.account_number && (
                                                <div><span className="text-gray-500">A/c No.:</span> <span className="font-medium">{paymentDetails.ca_bank_details.account_number}</span></div>
                                            )}
                                            {paymentDetails.ca_bank_details.ifsc_code && (
                                                <div><span className="text-gray-500">IFSC:</span> <span className="font-medium">{paymentDetails.ca_bank_details.ifsc_code}</span></div>
                                            )}
                                            {paymentDetails.ca_bank_details.branch && (
                                                <div><span className="text-gray-500">Branch:</span> <span className="font-medium">{paymentDetails.ca_bank_details.branch}</span></div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {/* Your details (Bill To) */}
                                {paymentDetails?.client && (
                                    <div className="p-4 rounded-lg border border-white/10 space-y-1">
                                        <h4 className="font-semibold text-white">Your details (Bill To)</h4>
                                        <p className="text-sm text-gray-300 font-medium">{paymentDetails.client.name}</p>
                                        {paymentDetails.client.address_line1 && <p className="text-sm text-gray-400">{paymentDetails.client.address_line1}</p>}
                                        {paymentDetails.client.city && <p className="text-sm text-gray-400">{paymentDetails.client.city}, {paymentDetails.client.state} {paymentDetails.client.postal_code}</p>}
                                        {paymentDetails.client.gstin && <p className="text-sm text-gray-400">GSTIN: {paymentDetails.client.gstin}</p>}
                                    </div>
                                )}
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
        </div>
    );
};

export default ClientBillPaymentPage;
