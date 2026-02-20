import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle, AlertCircle, Clock, Download, Check, CreditCard, Upload, X, Pencil } from 'lucide-react';
import { getClientBillingInvoices, getInvoicePDFBlob, markInvoicePaid, updateClientBillingInvoiceStatus, getPaymentProofUrl, uploadClientInvoicePaymentProof, getInvoicePaymentDetails, updateClientBillingInvoice } from '@/lib/api';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { FileDown } from 'lucide-react';

const ClientInvoicesPaymentsTab = ({ client }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const agencyId = user?.agency_id || localStorage.getItem('agency_id');
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
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

    // Bill PDF preview modal (same as clients-bill)
    const [billPreview, setBillPreview] = useState({ open: false, blobUrl: null, invoiceNumber: '', loading: false });

    useEffect(() => {
        if (client?.id && user?.access_token) {
            loadInvoices();
        }
    }, [client?.id, user?.access_token]);

    const loadInvoices = async () => {
        if (!client?.id || !user?.access_token) return;
        setIsLoading(true);
        try {
            // Get invoices directly from Client service
            const data = await getClientBillingInvoices(client.id, agencyId, user.access_token);
            
            // Map Client service response format to frontend expected format
            const mappedInvoices = (data || []).map(inv => ({
                id: inv.id,
                bill_number: inv.invoice_number,
                date: inv.invoice_date,
                amount: inv.invoice_amount,
                status: inv.status,
                payment_status: inv.status, // Use status as payment_status
                due_date: inv.due_date,
                payment_id: null,
                payment_date: inv.paid_at || null,
                billing_head: inv.billing_head,
                hsn_sac_code: inv.hsn_sac_code,
                monthly_charges_ex_gst: inv.monthly_charges_ex_gst,
                gst_percent: inv.gst_percent,
                state: inv.state,
            }));
            
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
            loadInvoices();
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
                description: 'Client can re-upload payment proof.',
            });
            setIsProofModalOpen(false);
            setSelectedInvoice(null);
            setProofUrl(null);
            setProofContentType(null);
            loadInvoices();
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

    const handleOpenBillPreview = async (invoice) => {
        if (!user?.access_token || !agencyId || !invoice?.id) return;
        setBillPreview({ open: true, blobUrl: null, invoiceNumber: invoice.bill_number || '', loading: true });
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

    const handleExportCSV = () => {
        const headers = ['Invoice Date', 'Invoice No.', 'Particulars', 'HSN/SAC', 'Amount', 'Status', 'Due Date'];
        const rows = invoices.map(inv => [
            inv.date ? format(new Date(inv.date), 'yyyy-MM-dd') : '',
            (inv.bill_number || '').replace(/,/g, ';'),
            (inv.billing_head || '').replace(/,/g, ';'),
            (inv.hsn_sac_code || '').replace(/,/g, ';'),
            parseFloat(inv.amount || 0).toFixed(2),
            inv.payment_status || inv.status || '',
            inv.due_date ? format(new Date(inv.due_date), 'yyyy-MM-dd') : ''
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `invoices_${client?.name || 'client'}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Exported', description: 'Invoices exported as CSV' });
    };

    const handleEditInvoice = (invoice) => {
        setSelectedInvoice(invoice);
        setEditFormData({
            invoice_number: invoice.bill_number || '',
            invoice_date: invoice.date || '',
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
            loadInvoices();
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

    const getStatusBadge = (status) => {
        const statusConfig = {
            due: { label: 'Due', variant: 'default', icon: Clock },
            overdue: { label: 'Overdue', variant: 'destructive', icon: AlertCircle },
            paid: { label: 'Paid', variant: 'success', icon: CheckCircle },
            pending_verification: { label: 'Pending Verification', variant: 'secondary', icon: Clock },
            rejected: { label: 'Rejected', variant: 'destructive', icon: AlertCircle },
        };

        const config = statusConfig[status] || statusConfig.due;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {config.label}
            </Badge>
        );
    };


    if (isLoading) {
        return (
            <div className="glass-pane p-6 rounded-lg flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    return (
        <div className="glass-pane p-6 rounded-lg space-y-4">
            <div className="flex flex-row items-center justify-between flex-wrap gap-4">
                <h3 className="text-lg font-semibold">Invoices & Payments</h3>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2" disabled={!invoices.length}>
                    <FileDown className="w-4 h-4" />
                    Export CSV
                </Button>
            </div>

            {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No invoices found for this client.
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice Date</TableHead>
                            <TableHead>Invoice No.</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                                <TableCell>
                                    {invoice.date ? format(new Date(invoice.date), 'dd MMM yyyy') : '-'}
                                </TableCell>
                                <TableCell className="font-medium">{invoice.bill_number}</TableCell>
                                <TableCell>₹{parseFloat(invoice.amount).toFixed(2)}</TableCell>
                                <TableCell className="w-[180px]">
                                    <div className="flex items-center justify-start">
                                        {getStatusBadge(invoice.payment_status)}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {invoice.due_date
                                        ? format(new Date(invoice.due_date), 'dd MMM yyyy')
                                        : '-'}
                                </TableCell>
                                <TableCell className="flex items-center gap-2">
                                    {invoice.payment_status === 'pending_verification' && (
                                        <Button
                                            size="icon"
                                            onClick={() => handleMarkPaymentDone(invoice)}
                                            className="h-8 w-8"
                                            title="Review client proof and mark payment done"
                                        >
                                            <Check className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {(invoice.payment_status === 'due' || invoice.payment_status === 'overdue') && (
                                        <>
                                            <Button
                                                size="icon"
                                                onClick={() => handleEditInvoice(invoice)}
                                                className="h-8 w-8"
                                                title="Edit Invoice"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                onClick={() => handleMakePayment(invoice)}
                                                className="h-8 w-8"
                                                title="Upload payment proof"
                                            >
                                                <CreditCard className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleOpenBillPreview(invoice)}
                                        className="h-8 w-8"
                                        title="View / Download PDF"
                                    >
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
            
            {/* Payment Proof Modal (for pending_verification) */}
            <Dialog open={isProofModalOpen} onOpenChange={setIsProofModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Review Payment Proof</DialogTitle>
                        <DialogDescription>
                            Invoice: {selectedInvoice?.bill_number} — Amount: ₹{selectedInvoice?.amount != null ? parseFloat(selectedInvoice.amount).toFixed(2) : '0.00'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {isLoadingProof ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                        ) : proofUrl ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold">Payment Proof</h4>
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
                                <div className="border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center min-h-[400px]">
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
                        <Button variant="outline" onClick={() => setIsProofModalOpen(false)}>
                            Cancel
                        </Button>
                        {proofUrl && (
                            <>
                                <Button variant="outline" onClick={handleRejectPayment} className="border-red-500/50 text-red-600 hover:bg-red-500/10">
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Make Payment</DialogTitle>
                        <DialogDescription>
                            Invoice: {selectedInvoice?.bill_number} — Amount: ₹{selectedInvoice?.amount != null ? parseFloat(selectedInvoice.amount).toFixed(2) : '0.00'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        {isLoadingPaymentDetails ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* Upload payment proof */}
                                <div className="space-y-2">
                                    <Label>Upload payment proof (screenshot or PDF) *</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={handlePaymentFileChange}
                                            className="flex-1"
                                        />
                                        {paymentFile && (
                                            <Button type="button" variant="ghost" size="sm" onClick={() => setPaymentFile(null)}>
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
                        <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)} disabled={isUploading}>
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Invoice</DialogTitle>
                        <DialogDescription>
                            Invoice: {selectedInvoice?.bill_number} — Edit invoice details
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit_invoice_number">Invoice Number *</Label>
                                <Input
                                    id="edit_invoice_number"
                                    value={editFormData.invoice_number}
                                    onChange={(e) => setEditFormData({ ...editFormData, invoice_number: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit_invoice_date">Invoice Date *</Label>
                                <Input
                                    id="edit_invoice_date"
                                    type="date"
                                    value={editFormData.invoice_date}
                                    onChange={(e) => setEditFormData({ ...editFormData, invoice_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit_due_date">Due Date</Label>
                                <Input
                                    id="edit_due_date"
                                    type="date"
                                    value={editFormData.due_date}
                                    onChange={(e) => setEditFormData({ ...editFormData, due_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit_billing_head">Billing Head</Label>
                                <Input
                                    id="edit_billing_head"
                                    value={editFormData.billing_head}
                                    onChange={(e) => setEditFormData({ ...editFormData, billing_head: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit_hsn_sac_code">HSN/SAC Code</Label>
                                <Input
                                    id="edit_hsn_sac_code"
                                    value={editFormData.hsn_sac_code}
                                    onChange={(e) => setEditFormData({ ...editFormData, hsn_sac_code: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit_state">State</Label>
                                <Input
                                    id="edit_state"
                                    value={editFormData.state}
                                    onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit_monthly_charges_ex_gst">Monthly Charges (Ex GST) *</Label>
                                <Input
                                    id="edit_monthly_charges_ex_gst"
                                    type="number"
                                    step="0.01"
                                    value={editFormData.monthly_charges_ex_gst}
                                    onChange={(e) => setEditFormData({ ...editFormData, monthly_charges_ex_gst: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit_gst_percent">GST % *</Label>
                                <Input
                                    id="edit_gst_percent"
                                    type="number"
                                    step="0.01"
                                    value={editFormData.gst_percent}
                                    onChange={(e) => setEditFormData({ ...editFormData, gst_percent: e.target.value })}
                                />
                            </div>
                        </div>
                        {editFormData.monthly_charges_ex_gst && editFormData.gst_percent && (
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <div className="text-sm text-gray-600 space-y-1">
                                    <div>GST Amount: ₹{((parseFloat(editFormData.monthly_charges_ex_gst || 0) * parseFloat(editFormData.gst_percent || 0)) / 100).toFixed(2)}</div>
                                    <div className="font-semibold">Total Amount: ₹{(parseFloat(editFormData.monthly_charges_ex_gst || 0) + (parseFloat(editFormData.monthly_charges_ex_gst || 0) * parseFloat(editFormData.gst_percent || 0)) / 100).toFixed(2)}</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSavingEdit}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="gap-2">
                            {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bill PDF Preview Modal (same as clients-bill) */}
            <Dialog open={billPreview.open} onOpenChange={(open) => { if (!open) closeBillPreview(); }}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="flex-shrink-0 px-6 py-4 border-b flex flex-row items-center justify-between">
                        <DialogTitle>Invoice PDF</DialogTitle>
                        {billPreview.blobUrl && (
                            <Button variant="outline" size="sm" onClick={handleDownloadFromBillPreview} className="gap-2">
                                <Download className="w-4 h-4" />
                                Download
                            </Button>
                        )}
                    </DialogHeader>
                    <div className="flex-1 min-h-[60vh] overflow-auto p-4">
                        {billPreview.loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-10 h-10 animate-spin" />
                            </div>
                        ) : billPreview.blobUrl ? (
                            <iframe src={billPreview.blobUrl} className="w-full h-[70vh] rounded border" title="Invoice PDF" />
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ClientInvoicesPaymentsTab;
