import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { deleteVoucher, updateVoucher, getBeneficiaries, getVoucherAttachment } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
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

const VoucherDetailsPage = () => {
    const { voucherId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const { voucher } = location.state || {};
    const [attachmentUrl, setAttachmentUrl] = useState(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [editedVoucher, setEditedVoucher] = useState(voucher);
    const [fromBankAccounts, setFromBankAccounts] = useState([]);
    const [toBankAccounts, setToBankAccounts] = useState([]);

    useEffect(() => {
        const fetchVoucherDetails = async () => {
            if (user?.access_token && voucher?.entity_id) {
                try {
                    const data = await getVoucher(voucher.entity_id, voucherId, user.access_token);
                    setEditedVoucher(data);
                } catch (error) {
                    console.error("Failed to fetch voucher details:", error);
                }
            }
        };
        const fetchBeneficiaries = async () => {
            if (user?.access_token) {
                const data = await getBeneficiaries(user.access_token);
                setBeneficiaries(data);
            }
        };
        const fetchAttachment = async () => {
            if (voucher?.attachment_id && user?.access_token) {
                try {
                    const url = await getVoucherAttachment(voucher.attachment_id, user.access_token);
                    setAttachmentUrl(url);
                } catch (error) {
                    console.error("Failed to fetch attachment:", error);
                }
            }
        };
        const fetchBankAccounts = async () => {
            if (user?.access_token && voucher?.entity_id) {
                const fromAccounts = await getOrganisationBankAccounts(voucher.entity_id, user.access_token);
                setFromBankAccounts(fromAccounts);
            }
            if (user?.access_token && editedVoucher?.beneficiary_id) {
                const toAccounts = await getBankAccountsForBeneficiary(editedVoucher.beneficiary_id, user.access_token);
                setToBankAccounts(toAccounts);
            }
        };
        fetchVoucherDetails();
        fetchBeneficiaries();
        fetchAttachment();
        fetchBankAccounts();
    }, [user?.access_token, voucher?.attachment_id, voucher?.entity_id, voucherId, editedVoucher?.beneficiary_id]);
    
    const voucherDetails = voucher || {
        id: voucherId,
        beneficiaryName: 'N/A',
        created_date: new Date().toISOString(),
        amount: 0,
        voucher_type: 'N/A',
        payment_type: 'N/A',
        remarks: 'No remarks available.',
    };
    
    const beneficiaryName = voucherDetails.beneficiary 
        ? (voucherDetails.beneficiary.beneficiary_type === 'individual' ? voucherDetails.beneficiary.name : voucherDetails.beneficiary.company_name) 
        : voucherDetails.beneficiaryName || 'N/A';

    const handleDelete = async () => {
        try {
            await deleteVoucher(voucherDetails.entity_id, voucherId, user.access_token);
            toast({ title: 'Success', description: 'Voucher deleted successfully.' });
            navigate(-1);
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to delete voucher: ${error.message}`,
                variant: 'destructive',
            });
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        try {
            await updateVoucher(voucherId, data, user.access_token);
            toast({ title: 'Success', description: 'Voucher updated successfully.' });
            setIsEditing(false);
            // NOTE: We are not refreshing the data as the user will be navigated away
            navigate(-1);
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to update voucher: ${error.message}`,
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="h-screen w-full flex flex-col text-white bg-transparent p-4 md:p-6">
            <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-2xl font-bold">Voucher Details</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setIsEditing(!isEditing)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => setShowDeleteDialog(true)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </header>

            <ResizablePanelGroup
                direction="horizontal"
                className="flex-1 rounded-lg border border-white/10"
            >
                <ResizablePanel defaultSize={60} minSize={30}>
                    <div className="flex h-full items-center justify-center p-2">
                         {attachmentUrl ? (
                            <iframe 
                                src={attachmentUrl} 
                                title="Voucher Attachment"
                                className="w-full h-full rounded-md border-none"
                            />
                        ) : (
                            <div className="text-center text-gray-400">
                                <p>No attachment available for this voucher.</p>
                            </div>
                        )}
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
                                            <Select name="voucher_type" defaultValue={editedVoucher.voucher_type}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a voucher type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="debit">Debit</SelectItem>
                                                    <SelectItem value="credit">Credit</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="payment_type">Payment Method</Label>
                                            <Select name="payment_type" defaultValue={editedVoucher.payment_type} onValueChange={(value) => setEditedVoucher({ ...editedVoucher, payment_type: value })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a payment method" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cash">Cash</SelectItem>
                                                    <SelectItem value="bank">Bank</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {editedVoucher.payment_type === 'bank' && (
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
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                            <Button type="submit">Save Changes</Button>
                                        </div>
                                    </form>
                                ) : (
                                    <Card className="w-full glass-pane border-none shadow-none">
                                        <CardHeader>
                                            <CardTitle>Voucher to {beneficiaryName}</CardTitle>
                                            <CardDescription>Created on {new Date(voucherDetails.created_date).toLocaleDateString()}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <DetailItem label="Amount" value={`₹${parseFloat(voucherDetails.amount).toFixed(2)}`} />
                                            <DetailItem label="Voucher Type" value={voucherDetails.voucher_type} />
                                            <DetailItem label="Payment Method" value={voucherDetails.payment_type} />
                                            <div className="pt-4">
                                                <p className="text-sm text-gray-400 mb-1">Remarks</p>
                                                <p className="text-sm text-white p-3 bg-white/5 rounded-md">{voucherDetails.remarks || 'N/A'}</p>
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
