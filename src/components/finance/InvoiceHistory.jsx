import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, FileText, ChevronLeft, ChevronRight, Trash2, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getCATeamInvoiceAttachment, getInvoiceAttachment, updateInvoice } from '@/lib/api';
import { getFinanceHeaders } from '@/lib/api/settings';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ITEMS_PER_PAGE = 10;

import { Check } from 'lucide-react';

const InvoiceHistory = ({ invoices, onDeleteInvoice, onEditInvoice, onRefresh, isAccountantView }) => {
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [financeHeaders, setFinanceHeaders] = useState([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const getBeneficiaryName = (invoice) => {
    if (!invoice.beneficiary) return 'Unknown';
    return invoice.beneficiary.beneficiary_type === 'individual' 
      ? invoice.beneficiary.name 
      : invoice.beneficiary.company_name;
  };

  const filteredInvoices = useMemo(() => {
    const sortedInvoices = [...(invoices || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const unexportedInvoices = sortedInvoices.filter(inv => !inv.is_exported);
    if (!invoiceSearchTerm) return unexportedInvoices;
    return unexportedInvoices.filter(inv => {
        const beneficiaryName = getBeneficiaryName(inv).toLowerCase();
        const searchTerm = invoiceSearchTerm.toLowerCase();
        return inv.bill_number.toLowerCase().includes(searchTerm) ||
               beneficiaryName.includes(searchTerm);
    });
  }, [invoices, invoiceSearchTerm]);

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleViewAttachment = (invoice) => {
    const beneficiaryName = getBeneficiaryName(invoice);
    navigate(`/invoices/${invoice.id}`, { state: { invoice, beneficiaryName } });
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
                        <TableHead>Bill No</TableHead>
                        <TableHead>Beneficiary</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Remarks</TableHead>
                        {isAccountantView && <TableHead>Ready for Export</TableHead>}
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedInvoices.map(invoice => (
                        <TableRow key={invoice.id} onClick={() => handleViewAttachment(invoice)} className="cursor-pointer">
                            <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                            <TableCell>{invoice.bill_number}</TableCell>
                            <TableCell>{getBeneficiaryName(invoice)}</TableCell>
                            <TableCell>₹{(parseFloat(invoice.amount) + parseFloat(invoice.cgst) + parseFloat(invoice.sgst) + parseFloat(invoice.igst)).toFixed(2)}</TableCell>
                            <TableCell>{invoice.remarks || 'N/A'}</TableCell>
                            {isAccountantView && (
                                <TableCell>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${invoice.is_ready ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                        {invoice.is_ready ? 'Yes' : 'No'}
                                    </span>
                                </TableCell>
                            )}
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {invoice.attachment_id && (
                                            <Button variant="link" onClick={(e) => { e.stopPropagation(); handleViewAttachment(invoice); }} className="text-sky-400" title="View Attachment">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {!invoice.is_ready && invoice.finance_header_id && (user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            className="text-green-400 hover:text-green-300"
                                            onClick={() => {
                                              updateInvoice(invoice.id, { is_ready: true }, user.access_token)
                                                .then(() => {
                                                  toast({ title: 'Success', description: 'Invoice marked as ready.' });
                                                  if (onRefresh) onRefresh();
                                                })
                                                .catch(err => {
                                                  toast({ title: 'Error', description: `Failed to mark invoice as ready: ${err.message}`, variant: 'destructive' });
                                                });
                                            }}
                                          >
                                            <Check className="w-4 h-4" />
                                          </Button>
                                        )}
                                    </div>
                                </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {paginatedInvoices.length === 0 && <p className="text-center text-gray-400 py-8">No invoices found.</p>}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            <div>
                <p className="text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </CardFooter>
    </Card>
  );
};

export default InvoiceHistory;
