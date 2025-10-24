import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '@/hooks/useAuth.jsx';
import { deleteVoucher, updateVoucher, getBeneficiaries, getVoucherAttachment, getVoucher, getBankAccountsForBeneficiary, getOrganisationBankAccounts } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Edit, Trash2, FileText, Loader2, ZoomIn, ZoomOut, RefreshCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import ActivityLog from '@/components/finance/ActivityLog';

const DetailItem = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-white/10">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-white capitalize">{value}</p>
    </div>
);

const VoucherPDF = React.forwardRef(({ voucher, organizationName, entityName }, ref) => {
    if (!voucher) return null;

    const beneficiaryName = voucher.beneficiary
        ? (voucher.beneficiary.beneficiary_type === 'individual' ? voucher.beneficiary.name : voucher.beneficiary.company_name)
        : voucher.beneficiaryName || 'N/A';

    return (
        <div ref={ref} className="p-8 bg-white text-black" style={{ width: '210mm', minHeight: '297mm', position: 'absolute', left: '-210mm', top: 0 }}>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-blue-600">{organizationName || 'The Abduz Group'}</h1>
                <h2 className="text-xl font-semibold text-gray-700">{entityName}</h2>
                <p className="text-gray-500">Payment Voucher</p>
            </div>

            <div className="flex justify-between items-center border-b pb-4 mb-4">
                <p><span className="font-bold">Voucher No:</span> {voucher.id}</p>
                <p><span className="font-bold">Date:</span> {new Date(voucher.created_date).toLocaleDateString()}</p>
            </div>

            <div className="mb-8">
                <h2 className="text-lg font-bold mb-2">Paid to:</h2>
                <p>{beneficiaryName}</p>
                <p><span className="font-bold">PAN:</span> {voucher.beneficiary?.pan || 'N/A'}</p>
                <p><span className="font-bold">Email:</span> {voucher.beneficiary?.email || 'N/A'}</p>
                <p><span className="font-bold">Phone:</span> {voucher.beneficiary?.phone_number || 'N/A'}</p>
            </div>

            <table className="w-full mb-8">
                <thead>
                    <tr className="bg-blue-600 text-white">
                        <th className="p-2 text-left">Particulars</th>
                        <th className="p-2 text-right">Amount (INR)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="p-2 border-b">{voucher.remarks || 'N/A'}</td>
                        <td className="p-2 border-b text-right">₹{parseFloat(voucher.amount).toFixed(2)}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr className="bg-blue-600 text-white font-bold">
                        <td className="p-2 text-left">Total</td>
                        <td className="p-2 text-right">₹{parseFloat(voucher.amount).toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>

            <div>
                <h2 className="text-lg font-bold mb-2">Payment Details:</h2>
                <p><span className="font-bold">Payment Method:</span> {voucher.payment_type}</p>
            </div>
        </div>
    );
});

const VoucherDetailsPage = () => {
    const { voucherId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const { voucher: initialVoucher, startInEditMode, organizationName, entityName, organisationId } = location.state || {};
    const [voucher, setVoucher] = useState(initialVoucher);
    const voucherDetailsRef = useRef(null);
    const [attachmentUrl, setAttachmentUrl] = useState(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [editedVoucher, setEditedVoucher] = useState(voucher);
    const [fromBankAccounts, setFromBankAccounts] = useState([]);
    const [toBankAccounts, setToBankAccounts] = useState([]);
    const [zoom, setZoom] = useState(1);
    const [financeHeaders, setFinanceHeaders] = useState([]);

    useEffect(() => {
        if (startInEditMode) {
            setIsEditing(true);
        }
    }, [startInEditMode]);

    useEffect(() => {
        const fetchVoucherDetails = async () => {
            if (authLoading) return;

            let currentEntityId = initialVoucher?.entity_id;
            if (!currentEntityId && user) {
                if (user.role === 'ENTITY_USER') {
                    currentEntityId = user.id;
                } else if (user.role === 'CLIENT_USER') {
                    const entitiesToDisplay = user.entities || [];
                    if (entitiesToDisplay.length > 0) {
                        currentEntityId = entitiesToDisplay[0].id;
                    } else if (user.organization_id) {
                        currentEntityId = user.organization_id;
                    }
                } else if (user.role !== 'CA_ACCOUNTANT') {
                    currentEntityId = user.organization_id || user.id;
                }
            }

            if (user?.access_token && currentEntityId) {
                try {
                    const data = await getVoucher(currentEntityId, voucherId, user.access_token);
                    setVoucher(data);
                    setEditedVoucher(data);
                } catch (error) {
                    toast({ title: 'Error', description: 'Failed to fetch voucher details.', variant: 'destructive' });
                }
            }
        };

        if (!voucher) {
            fetchVoucherDetails();
        }
    }, [voucherId, user, voucher, toast, initialVoucher, authLoading]);

    useEffect(() => {
        const fetchData = async () => {
            let orgIdsToTry = [];
            if (organisationId) orgIdsToTry.push(organisationId);
            if (voucher?.entity_id && !orgIdsToTry.includes(voucher.entity_id)) orgIdsToTry.push(voucher.entity_id);
            if (user?.organization_id && !orgIdsToTry.includes(user.organization_id)) orgIdsToTry.push(user.organization_id);

            let beneficiariesData = [];
            let fromAccountsData = [];
            let found = false;

            if (user?.access_token && orgIdsToTry.length > 0) {
                for (const orgId of orgIdsToTry) {
                    try {
                        const [bData, fData] = await Promise.all([
                            getBeneficiaries(orgId, user.access_token),
                            getOrganisationBankAccounts(orgId, user.access_token)
                        ]);
                        if (bData && bData.length > 0) {
                            beneficiariesData = bData;
                            fromAccountsData = fData || [];
                            found = true;
                            break;
                        }
                    } catch (error) {
                        // Try next orgId
                        continue;
                    }
                }
                setBeneficiaries(beneficiariesData || []);
                setFromBankAccounts(fromAccountsData || []);
                if (!found) {
                    toast({ title: 'No Beneficiaries', description: 'No beneficiaries found for this voucher. Please check your organization/entity setup.', variant: 'destructive' });
                }
            } else {
                toast({ title: 'Error', description: 'No valid organization or entity ID for fetching beneficiaries.', variant: 'destructive' });
            }
        };
        fetchData();
    }, [user, organisationId, voucher, toast]);

    useEffect(() => {
        const fetchToAccounts = async () => {
            if (user?.access_token && editedVoucher?.beneficiary_id) {
                try {
                    const toAccounts = await getBankAccountsForBeneficiary(editedVoucher.beneficiary_id, user.access_token);
                    setToBankAccounts(toAccounts || []);
                } catch (error) {
                    toast({ title: 'Error', description: 'Failed to fetch beneficiary bank accounts.', variant: 'destructive' });
                }
            }
        };
        fetchToAccounts();
    }, [user, editedVoucher?.beneficiary_id, toast]);

    useEffect(() => {
        const fetchHeaders = async () => {
            if (user && (user.role === 'CA_ACCOUNTANT' || user.role === 'CA_TEAM')) {
                try {
                    const headers = await getFinanceHeaders(user.agency_id, user.access_token);
                    setFinanceHeaders(headers);
                } catch (error) {
                    toast({
                        title: 'Error',
                        description: `Failed to fetch finance headers: ${error.message}`,
                        variant: 'destructive',
                    });
                }
            }
        };
        fetchHeaders();
    }, [user, toast]);

    useEffect(() => {
        if (voucher?.attachment_id && user?.access_token) {
            const fetchAttachment = async () => {
                try {
                    const url = await getVoucherAttachment(voucher.attachment_id, user.access_token);
                    setAttachmentUrl(url);
                } catch (error) {
                    console.error("Failed to fetch attachment:", error);
                }
            };
            fetchAttachment();
        }
    }, [user?.access_token, voucher?.attachment_id]);

    useEffect(() => {
        if (editedVoucher?.voucher_type === 'cash') {
            setEditedVoucher(prevState => ({ ...prevState, payment_type: 'cash' }));
        }
    }, [editedVoucher?.voucher_type]);
    
    const voucherDetails = voucher || {
        id: voucherId,
        beneficiaryName: 'N/A',
        created_date: new Date().toISOString(),
        amount: 0,
        voucher_type: 'N/A',
        payment_type: 'N/A',
        remarks: 'No remarks available.',
    };

    const handleExportToPDF = () => {
        const input = voucherDetailsRef.current;
        html2canvas(input, { 
            useCORS: true,
            scale: 2,
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const width = pdfWidth;
            const height = width / ratio;
            pdf.addImage(imgData, 'PNG', 0, 0, width, height);
            pdf.save(`voucher-${voucherId}.pdf`);
            toast({ title: 'Export Successful', description: 'Voucher details exported to PDF.' });
        }).catch(error => {
            toast({ title: 'Export Error', description: `An error occurred: ${error.message}`, variant: 'destructive' });
        });
    };
    
    const beneficiaryName = voucherDetails.beneficiary 
        ? (voucherDetails.beneficiary.beneficiary_type === 'individual' ? voucherDetails.beneficiary.name : voucherDetails.beneficiary.company_name) 
        : voucherDetails.beneficiaryName || 'N/A';

    const handleDelete = async () => {
        try {
            await deleteVoucher(voucherDetails.entity_id, voucherId, user.access_token);
            toast({ title: 'Success', description: 'Voucher deleted successfully.' });
            setShowDeleteDialog(false);
            navigate('/finance');
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to delete voucher: ${error.message}`,
                variant: 'destructive',
            });
            setShowDeleteDialog(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        if (data.voucher_type === 'cash' || data.payment_type !== 'bank_transfer') {
            data.from_bank_account_id = '0';
            data.to_bank_account_id = '0';
        }

        if (data.finance_header_id) {
            data.finance_header_id = data.finance_header_id;
        }

        try {
            await updateVoucher(voucherId, data, user.access_token);
            toast({ title: 'Success', description: 'Voucher updated successfully.' });
            setIsEditing(false);
            // NOTE: We are not refreshing the data as the user will be navigated away
            navigate('/finance');
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to update voucher: ${error.message}`,
                variant: 'destructive',
            });
        }
    };

    if (authLoading || !voucher) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col text-white bg-transparent p-4 md:p-6">
            <VoucherPDF ref={voucherDetailsRef} voucher={voucher} organizationName={organizationName} entityName={entityName} />
            <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/finance')}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-2xl font-bold">Voucher Details</h1>
                </div>
            </header>

            <ResizablePanelGroup
                direction="horizontal"
                className="flex-1 rounded-lg border border-white/10"
            >
                <ResizablePanel defaultSize={60} minSize={30}>
                    <div className="relative flex h-full w-full flex-col items-center justify-center p-2">
                        {attachmentUrl && !attachmentUrl.toLowerCase().endsWith('.pdf') && (
                            <div className="absolute top-4 right-4 z-10 flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => setZoom(z => z + 0.1)}>
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}>
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setZoom(1)}>
                                    <RefreshCcw className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <div className="flex h-full w-full items-center justify-center overflow-auto">
                            {attachmentUrl ? (
                                attachmentUrl.toLowerCase().endsWith('.pdf') ? (
                                    <iframe
                                        src={attachmentUrl}
                                        title="Voucher Attachment"
                                        className="h-full w-full rounded-md border-none"
                                    />
                                ) : (
                                    <img
                                        src={attachmentUrl}
                                        alt="Voucher Attachment"
                                        className="max-w-full max-h-full transition-transform duration-200"
                                        style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                                    />
                                )
                            ) : (
                                <div className="text-center text-gray-400">
                                    <p>No attachment available for this voucher.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={30}>
                    <div className="flex h-full items-start justify-center p-6 overflow-y-auto">
                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="activity">Activity Log</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details" className="mt-4">
                        {isEditing ? (
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div>
                                    <Label htmlFor="beneficiary_id">Beneficiary</Label>
                                    <Select name="beneficiary_id" defaultValue={editedVoucher.beneficiary_id}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a beneficiary" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {beneficiaries.map((b) => (
                                                <SelectItem key={b.id} value={b.id}>
                                                    {b.beneficiary_type === 'individual' ? b.name : b.company_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="amount">Amount</Label>
                                    <Input name="amount" type="number" defaultValue={editedVoucher.amount} />
                                </div>
                                <div>
                                    <Label htmlFor="voucher_type">Voucher Type</Label>
                                    <Select
                                        name="voucher_type"
                                        value={editedVoucher?.voucher_type}
                                        onValueChange={(val) => setEditedVoucher(p => ({ ...p, voucher_type: val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a voucher type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="debit">Debit</SelectItem>
                                            <SelectItem value="cash">Cash</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="payment_type">Payment Method</Label>
                                    {editedVoucher?.voucher_type === 'cash' ? (
                                        <Input value="Cash" disabled />
                                    ) : (
                                        <Select
                                            name="payment_type"
                                            value={(editedVoucher?.payment_type ?? '').toLowerCase()}
                                            onValueChange={(val) => setEditedVoucher(p => ({ ...p, payment_type: val }))}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select a payment method" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                                <SelectItem value="upi">UPI</SelectItem>
                                                <SelectItem value="card">Card</SelectItem>
                                                <SelectItem value="cheque">Cheque</SelectItem>
                                                <SelectItem value="demand_draft">Demand Draft</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                {editedVoucher.payment_type === 'bank_transfer' && (
                                    <>
                                        <div>
                                            <Label htmlFor="from_bank_account_id">From (Organisation Bank)</Label>
                                            <Select name="from_bank_account_id" defaultValue={editedVoucher.from_bank_account_id}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select your bank account" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {fromBankAccounts.map((acc) => (
                                                        <SelectItem key={acc.id} value={acc.id}>
                                                            {acc.bank_name} - {acc.account_number}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="to_bank_account_id">To (Beneficiary Bank)</Label>
                                            <Select name="to_bank_account_id" defaultValue={editedVoucher.to_bank_account_id}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select beneficiary's bank account" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {toBankAccounts.map((acc) => (
                                                        <SelectItem key={acc.id} value={acc.id}>
                                                            {acc.bank_name} - {acc.account_number}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <Label htmlFor="remarks">Remarks</Label>
                                    <Input name="remarks" defaultValue={editedVoucher.remarks} />
                                </div>
                                {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                    <div>
                                        <Label htmlFor="finance_header_id">Header</Label>
                                        <Select name="finance_header_id" defaultValue={editedVoucher.finance_header_id}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a header" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {financeHeaders.map((h) => (
                                                    <SelectItem key={h.id} value={h.id}>
                                                        {h.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                    <Button type="submit">Save Changes</Button>
                                </div>
                            </form>
                        ) : (
                            <Card className="w-full glass-pane border-none shadow-none bg-gray-800 text-white">
                                <CardHeader>
                                    <CardTitle>Voucher to {beneficiaryName}</CardTitle>
                                    <CardDescription>Created on {new Date(voucherDetails.created_date).toLocaleDateString()}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <DetailItem label="Amount" value={`₹${parseFloat(voucherDetails.amount).toFixed(2)}`} />
                                    <DetailItem label="Voucher Type" value={voucherDetails.voucher_type} />
                                    <DetailItem label="Payment Method" value={voucherDetails.voucher_type === 'cash' ? 'Cash' : voucherDetails.payment_type} />
                                    <div className="pt-4">
                                        <p className="text-sm text-gray-400 mb-1">Remarks</p>
                                        <p className="text-sm text-white p-3 bg-white/5 rounded-md">{voucherDetails.remarks || 'N/A'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-4 justify-end">
                                        <Button variant="destructive" size="icon" onClick={() => setShowDeleteDialog(true)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={handleExportToPDF}>
                                            <FileText className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={() => setIsEditing(!isEditing)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                    <TabsContent value="activity" className="mt-4">
                        <div className="p-4">
                            <ActivityLog itemId={voucherId} itemType="voucher" />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
                </ResizablePanel>
            </ResizablePanelGroup>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the voucher.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default VoucherDetailsPage;
