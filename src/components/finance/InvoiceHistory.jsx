import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, FileText, ChevronLeft, ChevronRight, Trash2, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getCATeamInvoiceAttachment, getInvoiceAttachment, updateInvoice } from '@/lib/api';
import { getFinanceHeaders } from '@/lib/api/settings';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ITEMS_PER_PAGE = 10;

import { Check } from 'lucide-react';

const InvoiceHistory = ({ invoices, onDeleteInvoice, onEditInvoice, onRefresh, isAccountantView }) => {
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterValues, setFilterValues] = useState({ dateFrom: '', dateTo: '', createdFrom: '', createdTo: '' });
  // No type filter for invoices
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

  const [readyLoadingId, setReadyLoadingId] = useState(null);

  const getBeneficiaryName = (invoice) => {
    if (!invoice.beneficiary) return 'Unknown';
    return invoice.beneficiary.beneficiary_type === 'individual' 
      ? invoice.beneficiary.name 
      : invoice.beneficiary.company_name;
  };

  const filteredInvoices = useMemo(() => {
    const sortedInvoices = [...(invoices || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const unexportedInvoices = sortedInvoices.filter(inv => !inv.is_exported);
    return unexportedInvoices.filter(inv => {
      const beneficiaryName = getBeneficiaryName(inv).toLowerCase();
      let match = true;
      for (const filter of activeFilters) {
        if (filter === 'beneficiary') {
          match = match && (filterValues.beneficiary === '' || inv.bill_number.toLowerCase().includes((filterValues.beneficiary || '').toLowerCase()) || beneficiaryName.includes((filterValues.beneficiary || '').toLowerCase()));
        }
        if (filter === 'date') {
          const from = filterValues.dateFrom ? new Date(filterValues.dateFrom) : null;
          const to = filterValues.dateTo ? new Date(filterValues.dateTo) : null;
          const invDate = new Date(inv.date);
          if (from && to) {
            match = match && invDate >= from && invDate <= to;
          } else if (from) {
            match = match && invDate >= from;
          } else if (to) {
            match = match && invDate <= to;
          }
        }
        if (filter === 'created') {
          const from = filterValues.createdFrom ? new Date(filterValues.createdFrom) : null;
          const to = filterValues.createdTo ? new Date(filterValues.createdTo) : null;
          const createdDate = inv.created_date ? new Date(inv.created_date) : null;
          if (createdDate) {
            if (from && to) {
              match = match && createdDate >= from && createdDate <= to;
            } else if (from) {
              match = match && createdDate >= from;
            } else if (to) {
              match = match && createdDate <= to;
            }
          }
        }
      }
      return match;
    });
  }, [invoices, activeFilters, filterValues]);

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
                <div className="flex items-center gap-4">
                    <Select
                        value=""
                        onValueChange={filter => {
                            if (!activeFilters.includes(filter)) {
                                setActiveFilters([...activeFilters, filter]);
                            }
                        }}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Add Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            {!activeFilters.includes('beneficiary') && <SelectItem value="beneficiary">Beneficiary Name</SelectItem>}
                            {!activeFilters.includes('date') && <SelectItem value="date">Invoice Date</SelectItem>}
                            {!activeFilters.includes('created') && <SelectItem value="created">Created Date</SelectItem>}
                        </SelectContent>
                    </Select>
                    {activeFilters.map(filter => (
                        <div key={filter} className="flex items-center gap-2">
                            {filter === 'beneficiary' && (
                                <Input
                                    placeholder="Search by beneficiary..."
                                    value={filterValues.beneficiary || ''}
                                    onChange={e => setFilterValues(fv => ({ ...fv, beneficiary: e.target.value }))}
                                    className="max-w-xs"
                                />
                            )}
                            {/* No type filter for invoices */}
                            {filter === 'date' && (
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        value={filterValues.dateFrom || ''}
                                        onChange={e => setFilterValues(fv => ({ ...fv, dateFrom: e.target.value }))}
                                        className="max-w-xs"
                                        placeholder="From"
                                    />
                                    <span className="text-gray-400">to</span>
                                    <Input
                                        type="date"
                                        value={filterValues.dateTo || ''}
                                        onChange={e => setFilterValues(fv => ({ ...fv, dateTo: e.target.value }))}
                                        className="max-w-xs"
                                        placeholder="To"
                                    />
                                </div>
                            )}
                            {filter === 'created' && (
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        value={filterValues.createdFrom || ''}
                                        onChange={e => setFilterValues(fv => ({ ...fv, createdFrom: e.target.value }))}
                                        className="max-w-xs"
                                        placeholder="From"
                                    />
                                    <span className="text-gray-400">to</span>
                                    <Input
                                        type="date"
                                        value={filterValues.createdTo || ''}
                                        onChange={e => setFilterValues(fv => ({ ...fv, createdTo: e.target.value }))}
                                        className="max-w-xs"
                                        placeholder="To"
                                    />
                                </div>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setActiveFilters(activeFilters.filter(f => f !== filter));
                                    setFilterValues(fv => {
                                        const newFv = { ...fv };
                                        delete newFv[filter];
                                        return newFv;
                                    });
                                }}
                                title="Remove filter"
                            >
                                ×
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
<TableHeader>
    <TableRow>
        <TableHead>Date</TableHead>
        <TableHead>Invoice Details</TableHead>
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
            <TableCell>
                {invoice.created_at
                    ? (
                        <>
                            {new Date(invoice.created_at).toLocaleDateString()}
                            <br />
                            <span className="text-xs text-gray-400">
                                {new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </>
                    )
                    : '-'}
            </TableCell>
            <TableCell>
                <div className="font-semibold">No.: {invoice.bill_number}</div>
                <div className="text-xs text-gray-400">Date: {new Date(invoice.date).toLocaleDateString()}</div>
            </TableCell>
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
                                    <div className="flex items-center justify-center gap-2">
                                        {user?.role === 'CLIENT_USER' ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={e => { e.stopPropagation(); handleViewAttachment(invoice); }}
                                                className="text-gray-400 hover:text-gray-300"
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="View Invoice"
                                            >
                                                <Eye className="w-6 h-6" />
                                            </Button>
                                        ) : (
                                            <>
                                                {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') ? (
                                                    <Button variant="link" onClick={(e) => { e.stopPropagation(); handleViewAttachment(invoice); }} className="text-sky-400" title="View Invoice">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                ) : (
                                                    invoice.attachment_id && (
                                                        <Button variant="link" onClick={(e) => { e.stopPropagation(); handleViewAttachment(invoice); }} className="text-sky-400" title="View Attachment">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    )
                                                )}
                                                {!invoice.is_ready && invoice.finance_header_id && (user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="text-green-400 hover:text-green-300"
                                                        disabled={readyLoadingId === invoice.id}
                                                        style={readyLoadingId === invoice.id ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                                                        onClick={async () => {
                                                            setReadyLoadingId(invoice.id);
                                                            try {
                                                                await updateInvoice(invoice.id, { is_ready: true }, user.access_token);
                                                                toast({ title: 'Success', description: 'Invoice marked as ready.' });
                                                                if (onRefresh) onRefresh();
                                                            } catch (err) {
                                                                toast({ title: 'Error', description: `Failed to mark invoice as ready: ${err.message}`, variant: 'destructive' });
                                                            } finally {
                                                                setReadyLoadingId(null);
                                                            }
                                                        }}
                                                    >
                                                        {readyLoadingId === invoice.id ? (
                                                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                                            </svg>
                                                        ) : (
                                                            <Check className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                )}
                                                {(user?.role !== 'CA_ACCOUNTANT' && user?.role !== 'CA_TEAM') && user?.role !== 'CLIENT_USER' && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); setInvoiceToDelete(invoice); }}>
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Delete</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </>
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
