import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { deleteInvoice, updateInvoice, getBeneficiaries } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
        <p className="text-sm font-semibold text-white">{value}</p>
    </div>
);

const InvoiceDetailsPage = () => {
    const { invoiceId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const { attachmentUrl, invoice, beneficiaryName } = location.state || {};
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [editedInvoice, setEditedInvoice] = useState(invoice);

    useEffect(() => {
        const fetchBeneficiaries = async () => {
            if (user?.access_token) {
                const data = await getBeneficiaries(user.access_token);
                setBeneficiaries(data);
            }
        };
        fetchBeneficiaries();
    }, [user?.access_token]);
    
    const invoiceDetails = invoice || {
        id: invoiceId,
        bill_number: 'N/A',
        date: new Date().toISOString(),
        beneficiary_name: beneficiaryName || 'N/A',
        amount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        remarks: 'No remarks available.',
    };
    
    const totalAmount = (
        parseFloat(invoiceDetails.amount) + 
        parseFloat(invoiceDetails.cgst) + 
        parseFloat(invoiceDetails.sgst) + 
        parseFloat(invoiceDetails.igst)
    ).toFixed(2);

    const attachmentToDisplay = attachmentUrl;

    const handleDelete = async () => {
        try {
            await deleteInvoice(invoice.entity_id, invoiceId, user.access_token);
            toast({ title: 'Success', description: 'Invoice deleted successfully.' });
            navigate(-1);
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to delete invoice: ${error.message}`,
                variant: 'destructive',
            });
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        try {
            await updateInvoice(invoiceId, data, user.access_token);
            toast({ title: 'Success', description: 'Invoice updated successfully.' });
            setIsEditing(false);
            navigate(-1);
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to update invoice: ${error.message}`,
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
                    <h1 className="text-2xl font-bold">Invoice Details</h1>
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
                         {attachmentToDisplay ? (
                            <iframe 
                                src={attachmentToDisplay} 
                                title="Invoice Attachment"
                                className="w-full h-full rounded-md border-none"
                            />
                        ) : (
                            <div className="text-center text-gray-400">
                                <p>No attachment available for this invoice.</p>
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
                                        {/* Edit form fields go here */}
                                        <Button type="submit">Save Changes</Button>
                                    </form>
                                ) : (
                                    <Card className="w-full glass-pane border-none shadow-none">
                                        <CardHeader>
                                            <CardTitle>{invoiceDetails.bill_number}</CardTitle>
                                            <CardDescription>Issued to {invoiceDetails.beneficiary_name}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <DetailItem label="Date" value={new Date(invoiceDetails.date).toLocaleDateString()} />
                                            <DetailItem label="Base Amount" value={`₹${parseFloat(invoiceDetails.amount).toFixed(2)}`} />
                                            <DetailItem label="CGST" value={`₹${parseFloat(invoiceDetails.cgst).toFixed(2)}`} />
                                            <DetailItem label="SGST" value={`₹${parseFloat(invoiceDetails.sgst).toFixed(2)}`} />
                                            <DetailItem label="IGST" value={`₹${parseFloat(invoiceDetails.igst).toFixed(2)}`} />
                                            <div className="pt-4">
                                                 <DetailItem label="Total Amount" value={`₹${totalAmount}`} />
                                            </div>
                                            <div className="pt-4">
                                                <p className="text-sm text-gray-400 mb-1">Remarks</p>
                                                <p className="text-sm text-white p-3 bg-white/5 rounded-md">{invoiceDetails.remarks}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>
                            <TabsContent value="activity" className="mt-4">
                                <div className="p-4">
                                    <ActivityLog itemId={invoiceId} itemType="invoice" />
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
                            This action cannot be undone. This will permanently delete the invoice.
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

export default InvoiceDetailsPage;
