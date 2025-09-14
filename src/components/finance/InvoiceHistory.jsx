
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const InvoiceHistory = ({ invoices, beneficiaries, onDeleteInvoice }) => {
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleInvoiceExpansion = (id) => {
    setExpandedInvoice(expandedInvoice === id ? null : id);
  };

  const getBeneficiaryName = (beneficiaryId) => {
    const beneficiary = (beneficiaries || []).find(b => b.id === beneficiaryId);
    if (!beneficiary) return 'Unknown';
    return beneficiary.beneficiary_type === 'individual' ? beneficiary.name : beneficiary.company_name;
  };

  const filteredInvoices = useMemo(() => 
      (invoices || []).filter(inv => {
          const beneficiaryName = getBeneficiaryName(inv.beneficiary_id).toLowerCase();
          const searchTerm = invoiceSearchTerm.toLowerCase();
          return inv.bill_number.toLowerCase().includes(searchTerm) ||
                 beneficiaryName.includes(searchTerm);
      }), [invoices, invoiceSearchTerm, beneficiaries]);

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
            attachmentUrl = await api.getCATeamInvoiceAttachment(invoice.id, user.access_token);
        } else {
            attachmentUrl = await api.getInvoiceAttachment(invoice.attachment_id, user.access_token);
        }
        navigate(`/invoices/${invoice.id}`, { state: { attachmentUrl } });
    } catch (error) {
       toast({
          title: 'Error',
          description: `Could not fetch attachment: ${error.message}`,
          variant: 'destructive'
      });
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
                    <div key={invoice.id} className="border border-white/10 rounded-2xl bg-white/5">
                        <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleInvoiceExpansion(invoice.id)}>
                            <div>
                                <p className="font-semibold text-white">{invoice.bill_number}</p>
                                <p className="text-sm text-gray-400">{getBeneficiaryName(invoice.beneficiary_id)} - {new Date(invoice.date).toLocaleDateString()}</p>
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
                                    <div className="col-span-full flex items-center justify-between">
                                        {invoice.attachment_id ? (
                                            <Button variant="link" onClick={() => handleViewAttachment(invoice)} className="text-sky-400 hover:underline flex items-center gap-2 p-0">
                                                <FileText className="w-4 h-4" />
                                                View Attachment
                                            </Button>
                                        ) : <p className="text-gray-500">No Attachment</p>}
                                        {onDeleteInvoice && (
                                            <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => onDeleteInvoice(invoice.id)}><Trash2 className="w-4 h-4" /></Button>
                                        )}
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
