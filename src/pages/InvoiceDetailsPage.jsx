import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

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
    const { attachmentUrl } = location.state || {};
    
    // Dummy data as requested
    const dummyInvoice = {
        id: invoiceId,
        bill_number: 'INV-2025-001',
        date: '2025-09-13',
        beneficiary_name: 'Creative Solutions Inc.',
        amount: 5000.00,
        cgst: 450.00,
        sgst: 450.00,
        igst: 0.00,
        total: 5900.00,
        remarks: 'Q3 Creative Services and Consultation.',
    };

    const attachmentToDisplay = attachmentUrl || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

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
                <ResizablePanel defaultSize={40} minSize={30}>
                    <div className="flex h-full items-start justify-center p-6">
                        <Card className="w-full glass-pane">
                            <CardHeader>
                                <CardTitle>{dummyInvoice.bill_number}</CardTitle>
                                <CardDescription>Issued to {dummyInvoice.beneficiary_name}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <DetailItem label="Date" value={new Date(dummyInvoice.date).toLocaleDateString()} />
                                <DetailItem label="Base Amount" value={`₹${dummyInvoice.amount.toFixed(2)}`} />
                                <DetailItem label="CGST" value={`₹${dummyInvoice.cgst.toFixed(2)}`} />
                                <DetailItem label="SGST" value={`₹${dummyInvoice.sgst.toFixed(2)}`} />
                                <DetailItem label="IGST" value={`₹${dummyInvoice.igst.toFixed(2)}`} />
                                <div className="pt-4">
                                     <DetailItem label="Total Amount" value={`₹${dummyInvoice.total.toFixed(2)}`} />
                                </div>
                                <div className="pt-4">
                                    <p className="text-sm text-gray-400 mb-1">Remarks</p>
                                    <p className="text-sm text-white p-3 bg-white/5 rounded-md">{dummyInvoice.remarks}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
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
            </ResizablePanelGroup>
        </div>
    );
};

export default InvoiceDetailsPage;