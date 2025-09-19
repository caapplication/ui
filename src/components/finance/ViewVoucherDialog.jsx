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

const ViewVoucherDialog = ({ voucher, fromAccount, toAccount, beneficiary, isOpen, onOpenChange, organizationName }) => {
    if (!voucher) return null;
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleViewAttachment = async () => {
        if (!voucher.attachment) return;
        try {
            const fileURL = await getVoucherAttachment(voucher.attachment.id, user.access_token);
            navigate(`/vouchers/${voucher.id}`, { state: { attachmentUrl: fileURL, voucher } });
        } catch (error) {
            console.error('Failed to fetch attachment:', error);
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(26, 82, 118);
        doc.text(organizationName || 'Your Company', pageWidth / 2, 20, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text('Payment Voucher', pageWidth / 2, 28, { align: 'center' });
        doc.setLineWidth(0.5);
        doc.line(15, 32, pageWidth - 15, 32);

        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        doc.text(`Voucher No: ${voucher.id.slice(0, 8).toUpperCase()}`, 15, 40);
        doc.text(`Date: ${new Date(voucher.created_date).toLocaleDateString()}`, pageWidth - 15, 40, { align: 'right' });

        doc.setLineWidth(0.2);
        doc.line(15, 44, pageWidth - 15, 44);

        const beneficiaryDetails = beneficiary || {};
        const beneficiaryName = beneficiaryDetails.beneficiary_type === 'individual'
            ? beneficiaryDetails.name
            : beneficiaryDetails.company_name || voucher?.beneficiary_name || 'N/A';

        const beneficiaryInfo = [
            [{ content: 'Paid to:', styles: { fontStyle: 'bold' } }, beneficiaryName],
            [{ content: 'PAN:', styles: { fontStyle: 'bold' } }, beneficiaryDetails.pan || 'N/A'],
            [{ content: 'Email:', styles: { fontStyle: 'bold' } }, beneficiaryDetails.email || 'N/A'],
            [{ content: 'Phone:', styles: { fontStyle: 'bold' } }, beneficiaryDetails.phone || 'N/A'],
        ];

        doc.autoTable({
            body: beneficiaryInfo,
            startY: 48,
            theme: 'plain',
            tableWidth: 'auto',
            columnStyles: { 0: { cellWidth: 30 } },
            styles: {
                fontSize: 10,
                cellPadding: 1,
            }
        });

        const transactionColumns = ['Particulars', 'Amount (INR)'];
        const transactionRows = [
            [voucher.remarks || 'Payment', `₹${parseFloat(voucher.amount).toFixed(2)}`],
        ];

        doc.autoTable({
            head: [transactionColumns],
            body: transactionRows,
            startY: doc.autoTable.previous.finalY + 10,
            theme: 'striped',
            headStyles: { fillColor: [26, 82, 118] },
            foot: [['Total', `₹${parseFloat(voucher.amount).toFixed(2)}`]],
            footStyles: { fontStyle: 'bold' },
        });

        let paymentDetails = [
            [{ content: 'Payment Details:', colSpan: 2, styles: { fontStyle: 'bold' } }],
            ['Payment Method', voucher.payment_type ? `${voucher.payment_type.charAt(0).toUpperCase() + voucher.payment_type.slice(1)}` : 'N/A'],
        ];

        if (voucher.payment_type === 'bank' && fromAccount) {
            paymentDetails.push(['From Account', `${fromAccount.bank_name} (...${fromAccount.account_number.slice(-4)})`]);
        }
        if (voucher.payment_type === 'bank' && toAccount) {
            paymentDetails.push(['To Account', `${toAccount.bank_name} (...${toAccount.account_number.slice(-4)})`]);
        }

        doc.autoTable({
            body: paymentDetails,
            startY: doc.autoTable.previous.finalY + 5,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 1 },
            columnStyles: { 0: { cellWidth: 30, fontStyle: 'bold' } }
        });

        const footerY = pageHeight - 20;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
        doc.text('This is a computer-generated voucher and does not require a signature.', pageWidth / 2, footerY, { align: 'center' });

        doc.save(`voucher-${voucher.id.slice(0, 8)}.pdf`);
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
