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
  const [filterValues, setFilterValues] = useState({
    dateFrom: '',
    dateTo: '',
    createdFrom: '',
    createdTo: '',
    beneficiary: '',
    bill_number: '',
    amount: '',
    remarks: ''
  });
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
  const [viewMode, setViewMode] = useState('active');

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    const statusMap = {
      verified: 'Verified',
      pending_ca_approval: 'Pending Audit',
      rejected_by_ca: 'Rejected',
      rejected_by_master_admin: 'Rejected',
      pending_master_admin_approval: 'Pending Approval'
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'rejected_by_ca':
      case 'rejected_by_master_admin':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'pending_ca_approval':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'pending_master_admin_approval':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getBeneficiaryName = (invoice) => {
    // Handle both list format (beneficiary_name) and full format (beneficiary object)
    if (invoice.beneficiary_name) {
      return invoice.beneficiary_name;
    }
    if (invoice.beneficiary) {
      return invoice.beneficiary.beneficiary_type === 'individual'
        ? invoice.beneficiary.name
        : invoice.beneficiary.company_name;
    }
    return 'Unknown';
  };

  const filteredInvoices = useMemo(() => {
    const sortedInvoices = [...(invoices || [])].sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date));

    // Filter based on View Mode (Active vs History)
    let modeFilteredInvoices;
    if (viewMode === 'active') {
      // Active: (Not verified AND Not approved) AND Not deleted
      modeFilteredInvoices = sortedInvoices.filter(inv => inv.status !== 'verified' && inv.status !== 'approved' && !inv.is_deleted);
    } else {
      // History: Verified OR Approved OR Deleted
      modeFilteredInvoices = sortedInvoices.filter(inv => inv.status === 'verified' || inv.status === 'approved' || inv.is_deleted);
    }

    return modeFilteredInvoices.filter(inv => {
      const beneficiaryName = getBeneficiaryName(inv).toLowerCase();
      let match = true;
      for (const filter of activeFilters) {
        if (filter === 'beneficiary') {
          const searchTerm = (filterValues.beneficiary || '').toLowerCase().trim();
          match = match && (!searchTerm || beneficiaryName.includes(searchTerm));
        }
        if (filter === 'bill_number') {
          const searchTerm = (filterValues.bill_number || '').toLowerCase().trim();
          const billNumber = (inv.bill_number || '').toString().toLowerCase();
          match = match && (!searchTerm || billNumber.includes(searchTerm));
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
        if (filter === 'amount') {
          const searchTerm = (filterValues.amount || '').trim();
          if (searchTerm) {
            const searchAmount = parseFloat(searchTerm);
            if (!isNaN(searchAmount)) {
              const totalAmount = parseFloat(inv.amount) + parseFloat(inv.cgst || 0) + parseFloat(inv.sgst || 0) + parseFloat(inv.igst || 0);
              match = match && Math.abs(totalAmount - searchAmount) < 0.01; // Allow for floating point precision
            }
          }
        }
        if (filter === 'remarks') {
          const searchTerm = (filterValues.remarks || '').toLowerCase().trim();
          const remarks = (inv.remarks || 'N/A').toLowerCase();
          match = match && (!searchTerm || remarks.includes(searchTerm));
        }
      }
      return match;
    });
  }, [invoices, activeFilters, filterValues, viewMode]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilters, filterValues]);

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleViewAttachment = (invoice) => {
    const beneficiaryName = getBeneficiaryName(invoice);
    // Find the index of the clicked invoice in the filtered invoices list
    const invoiceIndex = filteredInvoices.findIndex(inv => inv.id === invoice.id);

    // Determine the route based on user role
    const path = (user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM')
      ? `/invoices/ca/${invoice.id}`
      : `/invoices/${invoice.id}`;

    navigate(path, {
      state: {
        invoice,
        beneficiaryName,
        invoices: filteredInvoices,
        currentIndex: invoiceIndex >= 0 ? invoiceIndex : -1,
        isReadOnly: viewMode === 'history'
      }
    });
  };

  return (
    <Card className="glass-card mt-4">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-between w-full">
            <div className="bg-secondary/20 p-1 rounded-lg inline-flex">
              <button
                onClick={() => setViewMode('active')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${viewMode === 'active'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}
              >
                Active
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${viewMode === 'history'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}
              >
                History
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-1 justify-end">
              <Select
                value=""
                onValueChange={filter => {
                  if (!activeFilters.includes(filter)) {
                    setActiveFilters([...activeFilters, filter]);
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px] text-sm sm:text-base">
                  <SelectValue placeholder="Add Filter" />
                </SelectTrigger>
                <SelectContent>
                  {!activeFilters.includes('bill_number') && <SelectItem value="bill_number">Bill Number</SelectItem>}
                  {!activeFilters.includes('beneficiary') && <SelectItem value="beneficiary">Beneficiary Name</SelectItem>}
                  {!activeFilters.includes('date') && <SelectItem value="date">Invoice Date</SelectItem>}
                  {!activeFilters.includes('created') && <SelectItem value="created">Created Date</SelectItem>}
                  {!activeFilters.includes('amount') && <SelectItem value="amount">Amount</SelectItem>}
                  {!activeFilters.includes('remarks') && <SelectItem value="remarks">Remarks</SelectItem>}
                </SelectContent>
              </Select>
              {activeFilters.map(filter => (
                <div key={filter} className="flex items-center gap-2 flex-wrap">
                  {filter === 'bill_number' && (
                    <Input
                      placeholder="Search by bill number..."
                      value={filterValues.bill_number || ''}
                      onChange={e => setFilterValues(fv => ({ ...fv, bill_number: e.target.value }))}
                      className="w-full sm:max-w-xs text-sm sm:text-base"
                    />
                  )}
                  {filter === 'beneficiary' && (
                    <Input
                      placeholder="Search by beneficiary..."
                      value={filterValues.beneficiary || ''}
                      onChange={e => setFilterValues(fv => ({ ...fv, beneficiary: e.target.value }))}
                      className="w-full sm:max-w-xs text-sm sm:text-base"
                    />
                  )}
                  {filter === 'date' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        type="date"
                        value={filterValues.dateFrom || ''}
                        onChange={e => setFilterValues(fv => ({ ...fv, dateFrom: e.target.value }))}
                        className="w-full sm:max-w-xs text-sm sm:text-base"
                        placeholder="From"
                      />
                      <span className="text-gray-400 text-sm">to</span>
                      <Input
                        type="date"
                        value={filterValues.dateTo || ''}
                        onChange={e => setFilterValues(fv => ({ ...fv, dateTo: e.target.value }))}
                        className="w-full sm:max-w-xs text-sm sm:text-base"
                        placeholder="To"
                      />
                    </div>
                  )}
                  {filter === 'created' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        type="date"
                        value={filterValues.createdFrom || ''}
                        onChange={e => setFilterValues(fv => ({ ...fv, createdFrom: e.target.value }))}
                        className="w-full sm:max-w-xs text-sm sm:text-base"
                        placeholder="From"
                      />
                      <span className="text-gray-400 text-sm">to</span>
                      <Input
                        type="date"
                        value={filterValues.createdTo || ''}
                        onChange={e => setFilterValues(fv => ({ ...fv, createdTo: e.target.value }))}
                        className="w-full sm:max-w-xs text-sm sm:text-base"
                        placeholder="To"
                      />
                    </div>
                  )}
                  {filter === 'amount' && (
                    <Input
                      type="number"
                      placeholder="Search by amount..."
                      value={filterValues.amount || ''}
                      onChange={e => setFilterValues(fv => ({ ...fv, amount: e.target.value }))}
                      className="w-full sm:max-w-xs text-sm sm:text-base"
                      step="0.01"
                    />
                  )}
                  {filter === 'remarks' && (
                    <Input
                      placeholder="Search by remarks..."
                      value={filterValues.remarks || ''}
                      onChange={e => setFilterValues(fv => ({ ...fv, remarks: e.target.value }))}
                      className="w-full sm:max-w-xs text-sm sm:text-base"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setActiveFilters(activeFilters.filter(f => f !== filter));
                      setFilterValues(fv => {
                        const newFv = { ...fv };
                        if (filter === 'date') {
                          delete newFv.dateFrom;
                          delete newFv.dateTo;
                        } else if (filter === 'created') {
                          delete newFv.createdFrom;
                          delete newFv.createdTo;
                        } else {
                          delete newFv[filter];
                        }
                        return newFv;
                      });
                      setCurrentPage(1); // Reset to page 1 when filter is removed
                    }}
                    title="Remove filter"
                    className="h-8 w-8 sm:h-10 sm:w-10"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">Date</TableHead>
                <TableHead className="text-xs sm:text-sm">Invoice Details</TableHead>
                <TableHead className="text-xs sm:text-sm">Beneficiary</TableHead>
                <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                <TableHead className="text-xs sm:text-sm">Status</TableHead>
                <TableHead className="text-xs sm:text-sm">Remarks</TableHead>
                {isAccountantView && <TableHead className="text-xs sm:text-sm">Ready for Export</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.map(invoice => (
                <TableRow key={invoice.id} onClick={() => handleViewAttachment(invoice)} className="cursor-pointer">
                  <TableCell className="text-xs sm:text-sm">
                    {invoice.date
                      ? (
                        <>
                          {new Date(invoice.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </>
                      )
                      : '-'}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    <div className="font-semibold">No.: {invoice.bill_number}</div>
                    <div className="text-xs text-gray-400">
                      Created: {invoice.created_at
                        ? (
                          <>
                            {new Date(invoice.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            {' '}
                            {new Date(invoice.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                          </>
                        )
                        : '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{getBeneficiaryName(invoice)}</TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    ₹{(() => {
                      const val = parseFloat(invoice.amount) + parseFloat(invoice.cgst || 0) + parseFloat(invoice.sgst || 0) + parseFloat(invoice.igst || 0);
                      return val % 1 === 0
                        ? val.toLocaleString('en-IN', { maximumFractionDigits: 0 })
                        : val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    <span className={`inline-flex items-center justify-center text-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium capitalize border h-auto min-h-[1.5rem] whitespace-normal leading-tight ${invoice.is_deleted ? 'bg-gray-500/20 text-gray-400 border-gray-500/50' : getStatusColor(invoice.status)}`}>
                      {invoice.is_deleted ? 'Deleted' : formatStatus(invoice.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm max-w-[200px]">
                    <div className="line-clamp-2 whitespace-normal break-words overflow-hidden" title={invoice.remarks || 'N/A'}>
                      {invoice.remarks || 'N/A'}
                    </div>
                  </TableCell>
                  {isAccountantView && (
                    <TableCell className="text-xs sm:text-sm">
                      <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium ${invoice.is_ready ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {invoice.is_ready ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {paginatedInvoices.length === 0 && <p className="text-center text-gray-400 py-8 text-sm sm:text-base">No invoices found.</p>}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 p-4 sm:p-6">
        <div>
          <p className="text-xs sm:text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 w-8 sm:h-10 sm:w-10">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 w-8 sm:h-10 sm:w-10">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default InvoiceHistory;
