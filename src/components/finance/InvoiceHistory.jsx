
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, ChevronDown, ChevronUp, FileText, Edit, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getCATeamInvoiceAttachment, getInvoiceAttachment, updateInvoice } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const InvoiceHistory = ({ invoices, onDeleteInvoice, onEditInvoice, financeHeaders, onRefresh }) => {
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleInvoiceExpansion = (id) => {
    setExpandedInvoice(expandedInvoice === id ? null : id);
  };

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
            <div className="space-y-2">
                {filteredInvoices.map(invoice => (
                    <div key={invoice.id} className={`border rounded-2xl bg-white/5 transition-colors ${invoice.is_ready ? 'border-green-500/50' : 'border-white/10'}`}>
                        <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleInvoiceExpansion(invoice.id)}>
                            <div>
                                <p className="font-semibold text-white">{invoice.bill_number}</p>
                                <p className="text-sm text-gray-400">{getBeneficiaryName(invoice)} - {new Date(invoice.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="text-lg font-bold text-white">₹{(parseFloat(invoice.amount) + parseFloat(invoice.cgst) + parseFloat(invoice.sgst) + parseFloat(invoice.igst)).toFixed(2)}</p>
                                {expandedInvoice === invoice.id ? <ChevronUp /> : <ChevronDown />}
                            </div>
                        </div>
                        <AnimatePresence>
                        {expandedInvoice === invoice.id && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div><p className="text-gray-400">Base Amount</p><p>₹{parseFloat(invoice.amount).toFixed(2)}</p></div>
                                    <div><p className="text-gray-400">CGST</p><p>₹{parseFloat(invoice.cgst).toFixed(2)}</p></div>
                                    <div><p className="text-gray-400">SGST</p><p>₹{parseFloat(invoice.sgst).toFixed(2)}</p></div>
                                    <div><p className="text-gray-400">IGST</p><p>₹{parseFloat(invoice.igst).toFixed(2)}</p></div>
                                    <div className="col-span-full"><p className="text-gray-400">Remarks</p><p>{invoice.remarks || 'N/A'}</p></div>
                                    <div className="col-span-full flex items-center justify-between flex-wrap gap-4">
                                        {invoice.attachment_id ? (
                                            <Button variant="link" onClick={() => handleViewAttachment(invoice)} className="text-sky-400 hover:underline flex items-center gap-2 p-0">
                                                <FileText className="w-4 h-4" />
                                                View Attachment
                                            </Button>
                                        ) : <p className="text-gray-500">No Attachment</p>}
                                        <div className="flex items-center gap-2">
                                            {user.role === 'CA_ACCOUNTANT' && financeHeaders && (
                                                <>
                                                    <Select onValueChange={(value) => handleHeaderChange(invoice.id, value)} defaultValue={invoice.finance_header_id}>
                                                        <SelectTrigger className="w-[180px] h-9">
                                                            <SelectValue placeholder="Select Header" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {financeHeaders.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button size="sm" variant="outline" onClick={() => handleMarkAsReady(invoice.id)} disabled={invoice.is_ready}>
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        {invoice.is_ready ? 'Ready' : 'Mark as Ready'}
                                                    </Button>
                                                </>
                                            )}
                                            {onEditInvoice && (
                                                <Button size="icon" variant="ghost" className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10" onClick={() => onEditInvoice(invoice)}><Edit className="w-4 h-4" /></Button>
                                            )}
                                            {onDeleteInvoice && (
                                                <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => onDeleteInvoice(invoice.id)}><Trash2 className="w-4 h-4" /></Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                ))}
                {filteredInvoices.length === 0 && <p className="text-center text-gray-400 py-8">No invoices found.</p>}
            </div>
        </CardContent>
    </Card>
  );
};

export default InvoiceHistory;
  