import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Download, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getVoucherAttachment } from '@/lib/api';
import ActivityLog from './ActivityLog';
import { useNavigate } from 'react-router-dom';

const ViewVoucherDialog = ({ voucher, fromAccount, toAccount, beneficiary, isOpen, onOpenChange, organizationName, organisationId }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    if (!voucher) return null;

    const handleViewAttachment = async () => {
        if (!voucher.attachment) return;
        try {
            const fileURL = await getVoucherAttachment(voucher.attachment.id, user.access_token);
            navigate(`/vouchers/${voucher.id}`, { state: { attachmentUrl: fileURL, voucher, organisationId, financeHeaders } });
        } catch (error) {
            console.error('Failed to fetch attachment:', error);
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF({ orientation: "landscape" });

        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 10;

        // Pink header
        doc.setFillColor(255, 192, 203);
        doc.rect(0, y, pageWidth, 12, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(80, 0, 40);
        doc.text("DEBIT VOUCHER", pageWidth / 2, y + 8, { align: "center" });
        y += 14;

        // Voucher No. and Date
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.autoTable({
            startY: y,
            head: [[
                { content: "Voucher No. :", styles: { fillColor: [255, 192, 203] } },
                voucher.voucher_id || voucher.id,
                { content: "Date :", styles: { fillColor: [255, 192, 203] } },
                voucher.created_date ? new Date(voucher.created_date).toLocaleDateString() : ""
            ]],
            theme: "plain",
            styles: { fontSize: 11, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: "bold" }, 2: { fontStyle: "bold" } }
        });
        y = doc.lastAutoTable.finalY + 2;

        // Remitter/Beneficiary Section
        doc.autoTable({
            startY: y,
            head: [[
                { content: "REMITTER", colSpan: 2, styles: { fillColor: [255, 192, 203], halign: "center" } },
                { content: "BENEFICIARY", colSpan: 2, styles: { fillColor: [255, 192, 203], halign: "center" } }
            ]],
            body: [
                [
                    { content: "Entity :", styles: { fontStyle: "bold" } },
                    organizationName || "N/A",
                    { content: "Name :", styles: { fontStyle: "bold" } },
                    (beneficiary?.name || beneficiary?.company_name || voucher?.beneficiary_name || "N/A")
                ],
                [
                    { content: "Address :", styles: { fontStyle: "bold" } },
                    "P.Namgyal Road, Sheynam, Leh, UT Ladakh -194101", // Example static, replace as needed
                    { content: "Aadhar :", styles: { fontStyle: "bold" } },
                    beneficiary?.aadhar || ""
                ],
                [
                    "",
                    "",
                    { content: "PAN :", styles: { fontStyle: "bold" } },
                    beneficiary?.pan || ""
                ]
            ],
            theme: "grid",
            styles: { fontSize: 10, cellPadding: 2 }
        });
        y = doc.lastAutoTable.finalY + 2;

        // Remitter/Beneficiary Bank Section
        doc.autoTable({
            startY: y,
            head: [[
                { content: "REMITTER BANK", colSpan: 4, styles: { fillColor: [255, 192, 203], halign: "center" } },
                { content: "BENEFICIARY BANK", colSpan: 4, styles: { fillColor: [255, 192, 203], halign: "center" } }
            ]],
            body: [
                [
                    { content: "A/C Name :", styles: { fontStyle: "bold" } },
                    organizationName || "N/A",
                    { content: "A/C No. :", styles: { fontStyle: "bold" } },
                    fromAccount?.account_number || "",
                    { content: "A/C Name :", styles: { fontStyle: "bold" } },
                    (beneficiary?.name || beneficiary?.company_name || voucher?.beneficiary_name || "N/A"),
                    { content: "A/C No. :", styles: { fontStyle: "bold" } },
                    toAccount?.account_number || ""
                ],
                [
                    { content: "Bank :", styles: { fontStyle: "bold" } },
                    fromAccount?.bank_name || "",
                    { content: "Branch :", styles: { fontStyle: "bold" } },
                    fromAccount?.branch || "",
                    { content: "Bank :", styles: { fontStyle: "bold" } },
                    toAccount?.bank_name || "",
                    { content: "Branch :", styles: { fontStyle: "bold" } },
                    toAccount?.branch || ""
                ],
                [
                    { content: "IFSC :", styles: { fontStyle: "bold" } },
                    fromAccount?.ifsc || "",
                    "",
                    "",
                    { content: "IFSC :", styles: { fontStyle: "bold" } },
                    toAccount?.ifsc || "",
                    "",
                    ""
                ]
            ],
            theme: "grid",
            styles: { fontSize: 10, cellPadding: 2 }
        });
        y = doc.lastAutoTable.finalY + 2;

        // Payment Info Section
        doc.autoTable({
            startY: y,
            head: [[
                { content: "PAYMENT INFO", colSpan: 4, styles: { fillColor: [255, 192, 203], halign: "center" } }
            ]],
            body: [
                [
                    { content: "Amount", styles: { fontStyle: "bold" } },
                    `₹${parseFloat(voucher.amount).toFixed(2)}`,
                    { content: "Purpose :", styles: { fontStyle: "bold" } },
                    voucher.remarks || "N/A"
                ]
            ],
            theme: "grid",
            styles: { fontSize: 10, cellPadding: 2 }
        });
        y = doc.lastAutoTable.finalY + 2;

        // Created By / Approved By Section
        doc.autoTable({
            startY: y,
            head: [[
                { content: "CREATED BY", colSpan: 2, styles: { fillColor: [255, 192, 203], halign: "center" } },
                { content: "APPROVED BY", colSpan: 2, styles: { fillColor: [255, 192, 203], halign: "center" } }
            ]],
            body: [
                [
                    { content: "Name", styles: { fontStyle: "bold" } },
                    user?.name || "",
                    { content: "Name", styles: { fontStyle: "bold" } },
                    "" // Approved By Name (leave blank or fill as needed)
                ],
                [
                    { content: "Date & Time", styles: { fontStyle: "bold" } },
                    voucher.created_date ? new Date(voucher.created_date).toLocaleString() : "",
                    { content: "Date & Time", styles: { fontStyle: "bold" } },
                    "" // Approved By Date & Time (leave blank or fill as needed)
                ]
            ],
            theme: "grid",
            styles: { fontSize: 10, cellPadding: 2 }
        });

        doc.save(`debit-voucher-${voucher.voucher_id || voucher.id}.pdf`);
    };

    // FINAL fallback logic for beneficiary name
    const displayBeneficiaryName = beneficiary
        ? (beneficiary.beneficiary_type === 'individual' ? beneficiary.name : beneficiary.company_name)
        : (voucher?.beneficiary_name || 'Unknown Beneficiary');

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="glass-pane text-white max-w-lg">
                <DialogHeader>
                    <DialogTitle>Voucher Details</DialogTitle>
                    <DialogDescription>
                        Transaction from {new Date(voucher.created_date).toLocaleDateString()}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="activity">Activity Log</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details" className="mt-4">
                        <div className="grid gap-4 py-4 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <p className="text-gray-400">Beneficiary:</p>
                                <p>{displayBeneficiaryName}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <p className="text-gray-400">Amount:</p>
                                <p>₹{parseFloat(voucher.amount).toFixed(2)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <p className="text-gray-400">Type:</p>
                                <p className="capitalize">{voucher.voucher_type}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <p className="text-gray-400">Payment Method:</p>
                                <p className="capitalize">{voucher.payment_type}</p>
                            </div>
                            {voucher.payment_type === 'bank' && fromAccount && (
                                <div className="grid grid-cols-2 gap-2">
                                    <p className="text-gray-400">From Account:</p>
                                    <p>{fromAccount.bank_name} (...{fromAccount.account_number.slice(-4)})</p>
                                </div>
                            )}
                            {voucher.payment_type === 'bank' && toAccount && (
                                <div className="grid grid-cols-2 gap-2">
                                    <p className="text-gray-400">To Account:</p>
                                    <p>{toAccount.bank_name} (...{toAccount.account_number.slice(-4)})</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <p className="text-gray-400">Remarks:</p>
                                <p>{voucher.remarks || 'N/A'}</p>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="activity" className="mt-4">
                        <ActivityLog itemId={voucher.id} itemType="voucher" />
                    </TabsContent>
                </Tabs>

                <DialogFooter className="gap-2 sm:justify-between">
                    <div>
                        <Button variant="outline" onClick={handleExportPDF}>
                            <Download className="w-4 h-4 mr-2" />
                            Export to PDF
                        </Button>
                        {voucher.attachment && (
                            <Button variant="outline" onClick={handleViewAttachment} className="ml-2">
                                <FileText className="w-4 h-4 mr-2" />
                                View Attachment
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => navigate(`/vouchers/${voucher.id}`, { state: { voucher, organisationId, organizationName, financeHeaders } })} className="ml-2">
                            <FileText className="w-4 h-4 mr-2" />
                            View Full Details
                        </Button>
                    </div>
                    <DialogClose asChild>
                        <Button variant="secondary">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ViewVoucherDialog;
