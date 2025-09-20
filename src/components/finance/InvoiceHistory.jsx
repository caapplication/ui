
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, FileText, Edit, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getCATeamInvoiceAttachment, getInvoiceAttachment, updateInvoice } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const InvoiceHistory = ({ invoices, onDeleteInvoice, onEditInvoice, financeHeaders, onRefresh }) => {
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const getBeneficiaryName = (invoice) => {
    if (!invoice.beneficiary) return 'Unknown';
    return invoice.beneficiary.beneficiary_type === 'individual' 
      ? invoice.beneficiary.name 
      : invoice.beneficiary.company_name;
  };

  const filteredInvoices = useMemo(() => 
      (invoices || []).filter(inv => {
          const beneficiaryName = getBeneficiaryName(inv).toLowerCase();
          const searchTerm = invoiceSearchTerm.toLowerCase();
          return inv.bill_number.toLowerCase().includes(searchTerm) ||
                 beneficiaryName.includes(searchTerm);
      }), [invoices, invoiceSearchTerm]);

  const handleViewAttachment = async (invoice) => {
    if (!invoice.attachment_id) {
        toast({
            title: 'No Attachment',
            description: 'This invoice does not have an attachment.',
            variant: 'destructive'
        });
        return;
    }
    try {
        let attachmentUrl;
        if (user.role === 'CA_ACCOUNTANT') {
            attachmentUrl = await getCATeamInvoiceAttachment(invoice.id, user.access_token);
        } else {
            attachmentUrl = await getInvoiceAttachment(invoice.attachment_id, user.access_token);
        }
        const beneficiaryName = getBeneficiaryName(invoice);
        navigate(`/invoices/${invoice.id}`, { state: { attachmentUrl, invoice, beneficiaryName } });
    } catch (error) {
       toast({
          title: 'Error',
          description: `Could not fetch attachment: ${error.message}`,
          variant: 'destructive'
      });
    }
  };

  const handleHeaderChange = async (invoiceId, headerId) => {
    try {
      await updateInvoice(invoiceId, { finance_header_id: headerId }, user.access_token);
      toast({ title: 'Success', description: 'Invoice header updated.' });
      onRefresh(true);
    } catch (error) {
      toast({ title: 'Error', description: `Failed to update header: ${error.message}`, variant: 'destructive' });
    }
  };

  const handleMarkAsReady = async (invoiceId) => {
    try {
      await updateInvoice(invoiceId, { is_ready: true }, user.access_token);
      toast({ title: 'Success', description: 'Invoice marked as ready.' });
      onRefresh(true);
    } catch (error) {
      toast({ title: 'Error', description: `Failed to mark as ready: ${error.message}`, variant: 'destructive' });
    }
  };

  return (
    <Card className="glass-card mt-4">
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Invoice History</CardTitle>
                    <CardDescription>Review all uploaded invoices.</CardDescription>
                </div>
                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input placeholder="Search invoices..." className="pl-10" value={invoiceSearchTerm} onChange={(e) => setInvoiceSearchTerm(e.target.value)} />
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Beneficiary</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredInvoices.map(invoice => (
                        <TableRow key={invoice.id}>
                            <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                            <TableCell>{getBeneficiaryName(invoice)}</TableCell>
                            <TableCell>₹{(parseFloat(invoice.amount) + parseFloat(invoice.cgst) + parseFloat(invoice.sgst) + parseFloat(invoice.igst)).toFixed(2)}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Button variant="link" onClick={() => handleViewAttachment(invoice)} className="text-sky-400">
                                        <FileText className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => onEditInvoice(invoice)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => onDeleteInvoice(invoice.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {filteredInvoices.length === 0 && <p className="text-center text-gray-400 py-8">No invoices found.</p>}
        </CardContent>
    </Card>
  );
};

export default InvoiceHistory;
