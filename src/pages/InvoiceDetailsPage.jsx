import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { deleteInvoice, updateInvoice, getBeneficiaries, getInvoiceAttachment } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Edit, Trash2, FileText, ZoomIn, ZoomOut, RefreshCcw } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
    const { attachmentUrl, invoice, beneficiaryName, organisationId } = location.state || {};
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const invoiceDetailsRef = React.useRef(null);
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [editedInvoice, setEditedInvoice] = useState(invoice);
    const [attachmentToDisplay, setAttachmentToDisplay] = useState(attachmentUrl);
    const [zoom, setZoom] = useState(1);
    const [financeHeaders, setFinanceHeaders] = useState([]);


    useEffect(() => {
        const fetchBeneficiaries = async () => {
            if (user?.access_token && (organisationId || invoice?.entity_id)) {
                const data = await getBeneficiaries(organisationId || invoice?.entity_id, user.access_token);
                setBeneficiaries(data);
            }
        };
        fetchBeneficiaries();
    }, [user?.access_token, organisationId, invoice]);

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
        if (invoice?.attachment_id && user?.access_token) {
            const fetchAttachment = async () => {
                try {
                    const url = await getInvoiceAttachment(invoice.attachment_id, user.access_token);
                    setAttachmentToDisplay(url);
                } catch (error) {
                    console.error("Failed to fetch attachment:", error);
                }
            };
            fetchAttachment();
        }
    }, [user?.access_token, invoice?.attachment_id]);
    
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

    useEffect(() => {
        // Clean up blob URL on unmount
        return () => {
            if (attachmentToDisplay && attachmentToDisplay.startsWith('blob:')) {
                URL.revokeObjectURL(attachmentToDisplay);
            }
        };
    }, [attachmentToDisplay]);

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

    const handleExportToPDF = () => {
        const input = invoiceDetailsRef.current;
        if (!input) return;
        html2canvas(input, { backgroundColor: "#1e293b" }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
            });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const width = pdfWidth;
            const height = width / ratio;
            pdf.addImage(imgData, 'PNG', 0, 0, width, height);
            pdf.save(`invoice-${invoiceId}.pdf`);
            toast({ title: 'Export Successful', description: 'Invoice details exported to PDF.' });
        }).catch(error => {
            toast({ title: 'Export Failed', description: error.message, variant: 'destructive' });
        });
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
    const handleZoomReset = () => setZoom(1);

    return (
        <div className="h-screen w-full flex flex-col text-white bg-transparent p-4 md:p-6">
            <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-2xl font-bold">Invoice Details</h1>
                </div>
            </header>

            <ResizablePanelGroup
                direction="horizontal"
                className="flex-1 rounded-lg border border-white/10"
            >
                <ResizablePanel defaultSize={60} minSize={30}>
                    <div className="relative flex h-full w-full flex-col items-center justify-center p-2">
                        {attachmentToDisplay && !attachmentToDisplay.toLowerCase().endsWith('.pdf') && (
                            <div className="absolute top-4 right-4 z-10 flex gap-2">
                                <Button variant="outline" size="icon" onClick={handleZoomIn}>
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={handleZoomOut}>
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={handleZoomReset}>
                                    <RefreshCcw className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <div className="flex h-full w-full items-center justify-center overflow-auto">
                            {attachmentToDisplay ? (
                                attachmentToDisplay.toLowerCase().endsWith('.pdf') ? (
                                    <iframe
                                        src={attachmentToDisplay}
                                        title="Invoice Attachment"
                                        className="h-full w-full rounded-md border-none"
                                    />
                                ) : (
                                    <img
                                        src={attachmentToDisplay}
                                        alt="Invoice Attachment"
                                        className="max-w-full max-h-full transition-transform duration-200"
                                        style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                                    />
                                )
                            ) : (
                                <div className="text-center text-gray-400">
                                    <p>No attachment available for this invoice.</p>
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
                                            <Select name="beneficiary_id" defaultValue={editedInvoice.beneficiary_id}>
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
                                            <Label htmlFor="bill_number">Bill Number</Label>
                                            <Input name="bill_number" defaultValue={editedInvoice.bill_number} />
                                        </div>
                                        <div>
                                            <Label htmlFor="date">Date</Label>
                                            <Input name="date" type="date" defaultValue={new Date(editedInvoice.date).toISOString().split('T')[0]} />
                                        </div>
                                        <div>
                                            <Label htmlFor="amount">Amount</Label>
                                            <Input name="amount" type="number" step="0.01" defaultValue={editedInvoice.amount} />
                                        </div>
                                        <div>
                                            <Label htmlFor="cgst">CGST</Label>
                                            <Input name="cgst" type="number" step="0.01" defaultValue={editedInvoice.cgst} onChange={(e) => setEditedInvoice({ ...editedInvoice, cgst: e.target.value, sgst: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label htmlFor="sgst">SGST</Label>
                                            <Input name="sgst" type="number" step="0.01" value={editedInvoice.sgst} onChange={(e) => { setEditedInvoice({ ...editedInvoice, sgst: e.target.value, cgst: e.target.value }); }} />
                                        </div>
                                        <div>
                                            <Label htmlFor="igst">IGST</Label>
                                            <Input name="igst" type="number" step="0.01" defaultValue={editedInvoice.igst} />
                                        </div>
                                        <div>
                                            <Label htmlFor="remarks">Remarks</Label>
                                            <Input name="remarks" defaultValue={editedInvoice.remarks} />
                                        </div>
                                        {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                            <div>
                                                <Label htmlFor="finance_header_id">Header</Label>
                                                <Select name="finance_header_id" defaultValue={editedInvoice.finance_header_id}>
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
                                    <Card ref={invoiceDetailsRef} className="w-full glass-pane border-none shadow-none">
                                        <CardHeader>
                                            <CardTitle>{invoiceDetails.bill_number}</CardTitle>
                                            <CardDescription>
                                                Issued to {
                                                    (() => {
                                                        // Try to resolve beneficiary name from beneficiaries list
                                                        const beneficiary = beneficiaries.find(
                                                            b => String(b.id) === String(invoice?.beneficiary_id)
                                                        );
                                                        if (beneficiary) {
                                                            return beneficiary.beneficiary_type === 'individual'
                                                                ? beneficiary.name
                                                                : beneficiary.company_name;
                                                        }
                                                        // Fallback to beneficiary_name from state or N/A
                                                        return invoiceDetails.beneficiary_name || 'N/A';
                                                    })()
                                                }
                                            </CardDescription>
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
