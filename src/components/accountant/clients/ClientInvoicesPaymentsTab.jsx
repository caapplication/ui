import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CreditCard, Upload, X, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { getInvoicesWithPaymentStatus, getPaymentQRCode, uploadPaymentProof } from '@/lib/api';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const ClientInvoicesPaymentsTab = ({ client }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [isLoadingQR, setIsLoadingQR] = useState(false);
    const [paymentFile, setPaymentFile] = useState(null);
    const [transactionId, setTransactionId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (client?.id && user?.access_token) {
            loadInvoices();
        }
    }, [client?.id, user?.access_token]);

    const loadInvoices = async () => {
        if (!client?.id || !user?.access_token) return;
        setIsLoading(true);
        try {
            // Client ID maps to entity ID in Finance service
            const data = await getInvoicesWithPaymentStatus(client.id, user.access_token);
            setInvoices(data || []);
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

    const handleMakePayment = async (invoice) => {
        setSelectedInvoice(invoice);
        setIsPaymentModalOpen(true);
        setIsLoadingQR(true);
        setPaymentFile(null);
        setTransactionId('');
        setPaymentMethod('');
        setRemarks('');

        try {
            const details = await getPaymentQRCode(invoice.id, user.access_token);
            setPaymentDetails(details);
        } catch (error) {
            console.error('Error loading payment details:', error);
            toast({
                title: 'Error',
                description: 'Failed to load payment details. ' + (error.message || ''),
                variant: 'destructive',
            });
        } finally {
            setIsLoadingQR(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
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

    const handleUploadPaymentProof = async () => {
        if (!paymentFile && !transactionId) {
            toast({
                title: 'Validation Error',
                description: 'Please upload a payment proof file or enter a transaction ID',
                variant: 'destructive',
            });
            return;
        }

        setIsUploading(true);
        try {
            await uploadPaymentProof(
                selectedInvoice.id,
                paymentFile,
                transactionId || undefined,
                paymentMethod || undefined,
                remarks || undefined,
                user.access_token
            );
            toast({
                title: 'Success',
                description: 'Payment proof uploaded successfully. Waiting for CA admin verification.',
            });
            setIsPaymentModalOpen(false);
            loadInvoices(); // Refresh invoice list
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

    const getStatusBadge = (status) => {
        const statusConfig = {
            due: { label: 'Due', variant: 'default', icon: Clock },
            overdue: { label: 'Overdue', variant: 'destructive', icon: AlertCircle },
            paid: { label: 'Paid', variant: 'success', icon: CheckCircle },
            pending_verification: { label: 'Pending Verification', variant: 'secondary', icon: Clock },
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
        <div className="glass-pane p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Invoices & Payments</h3>

            {invoices.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
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
                                <TableCell>{getStatusBadge(invoice.payment_status)}</TableCell>
                                <TableCell>
                                    {invoice.due_date
                                        ? format(new Date(invoice.due_date), 'dd MMM yyyy')
                                        : '-'}
                                </TableCell>
                                <TableCell>
                                    {invoice.payment_status !== 'paid' && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleMakePayment(invoice)}
                                            className="flex items-center gap-2"
                                        >
                                            <CreditCard className="w-4 h-4" />
                                            Make Payment
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Make Payment</DialogTitle>
                        <DialogDescription>
                            Invoice: {selectedInvoice?.bill_number} - Amount: ₹
                            {selectedInvoice?.amount ? parseFloat(selectedInvoice.amount).toFixed(2) : '0.00'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* QR Code Section */}
                        {isLoadingQR ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* QR Code Image (CA Uploaded) */}
                                {paymentDetails?.qr_code_image_url && (
                                    <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg">
                                        <h4 className="font-semibold">Scan QR Code to Pay</h4>
                                        <img
                                            src={paymentDetails.qr_code_image_url}
                                            alt="Payment QR Code"
                                            className="w-48 h-48 border rounded object-contain"
                                        />
                                    </div>
                                )}

                                {/* Bank Details (Optional - from CA settings) */}
                                {paymentDetails && (paymentDetails.bank_name || paymentDetails.account_number || paymentDetails.upi_id) && (
                                    <div className="p-4 border rounded-lg space-y-2">
                                        <h4 className="font-semibold mb-3">Payment Details</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            {paymentDetails.bank_name && (
                                                <div>
                                                    <span className="text-gray-500">Bank Name:</span>
                                                    <span className="ml-2 font-medium">{paymentDetails.bank_name}</span>
                                                </div>
                                            )}
                                            {paymentDetails.account_number && (
                                                <div>
                                                    <span className="text-gray-500">Account Number:</span>
                                                    <span className="ml-2 font-medium">{paymentDetails.account_number}</span>
                                                </div>
                                            )}
                                            {paymentDetails.account_holder_name && (
                                                <div>
                                                    <span className="text-gray-500">Account Holder:</span>
                                                    <span className="ml-2 font-medium">{paymentDetails.account_holder_name}</span>
                                                </div>
                                            )}
                                            {paymentDetails.ifsc_code && (
                                                <div>
                                                    <span className="text-gray-500">IFSC Code:</span>
                                                    <span className="ml-2 font-medium">{paymentDetails.ifsc_code}</span>
                                                </div>
                                            )}
                                            {paymentDetails.branch_name && (
                                                <div>
                                                    <span className="text-gray-500">Branch:</span>
                                                    <span className="ml-2 font-medium">{paymentDetails.branch_name}</span>
                                                </div>
                                            )}
                                            {paymentDetails.upi_id && (
                                                <div>
                                                    <span className="text-gray-500">UPI ID:</span>
                                                    <span className="ml-2 font-medium">{paymentDetails.upi_id}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Payment Proof Upload */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold">Upload Payment Proof</h4>

                                    <div className="space-y-2">
                                        <Label htmlFor="payment-file">Payment Screenshot/PDF</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="payment-file"
                                                type="file"
                                                accept="image/*,.pdf"
                                                onChange={handleFileChange}
                                                className="flex-1"
                                            />
                                            {paymentFile && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setPaymentFile(null)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                        {paymentFile && (
                                            <p className="text-xs text-gray-500">
                                                Selected: {paymentFile.name}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="transaction-id">Transaction ID (Optional)</Label>
                                        <Input
                                            id="transaction-id"
                                            value={transactionId}
                                            onChange={(e) => setTransactionId(e.target.value)}
                                            placeholder="Enter transaction ID"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="payment-method">Payment Method (Optional)</Label>
                                        <Input
                                            id="payment-method"
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            placeholder="e.g., UPI, Bank Transfer, NEFT"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="remarks">Remarks (Optional)</Label>
                                        <Textarea
                                            id="remarks"
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            placeholder="Any additional notes"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsPaymentModalOpen(false)}
                            disabled={isUploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUploadPaymentProof}
                            disabled={isUploading || isLoadingQR}
                            className="flex items-center gap-2"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Submit Payment Proof
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ClientInvoicesPaymentsTab;
