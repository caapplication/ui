import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, FileText, ChevronLeft, ChevronRight, Trash2, Eye, Calendar } from 'lucide-react';
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
import AnimatedSearch from '@/components/ui/AnimatedSearch';

const InvoiceHistory = ({ invoices, onDeleteInvoice, onEditInvoice, onViewInvoice, onRefresh, isAccountantView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [datePreset, setDatePreset] = useState('all_time');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // ...
  const handleViewAttachment = (invoice) => {
    if (onViewInvoice) {
      onViewInvoice(invoice, searchTerm || datePreset !== 'all_time', filteredInvoices);
      return;
    }
    const beneficiaryName = getBeneficiaryName(invoice);
    // ... (rest of logic)
    const invoiceIndex = filteredInvoices.findIndex(inv => inv.id === invoice.id);
    const path = (user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM')
      ? `/invoices/ca/${invoice.id}`
      : `/invoices/${invoice.id}`;

    // Always navigate in same tab to preserve navigation capabilities
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

  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
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

  const currentPage = viewMode === 'active' ? activePage : historyPage;
  const setCurrentPage = (val) => {
    if (viewMode === 'active') setActivePage(val);
    else setHistoryPage(val);
  };

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
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const billMatch = (inv.bill_number || '').toString().toLowerCase().includes(term);
        const remarksMatch = (inv.remarks || 'N/A').toLowerCase().includes(term);
        const beneficiaryMatch = beneficiaryName.includes(term);
        if (!billMatch && !remarksMatch && !beneficiaryMatch) {
          match = false;
        }
      }
      if (datePreset !== 'all_time') {
        const invDate = new Date(inv.date || inv.created_date);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (datePreset === 'today') {
          if (invDate < today) match = false;
        } else if (datePreset === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          if (invDate < yesterday || invDate >= today) match = false;
        } else if (datePreset === 'last_7_days') {
          const last7 = new Date(today);
          last7.setDate(last7.getDate() - 7);
          if (invDate < last7) match = false;
        } else if (datePreset === 'last_30_days') {
          const last30 = new Date(today);
          last30.setDate(last30.getDate() - 30);
          if (invDate < last30) match = false;
        } else if (datePreset === 'this_month') {
          const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          if (invDate < firstDayThisMonth) match = false;
        } else if (datePreset === 'last_month') {
          const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          if (invDate < firstDayLastMonth || invDate > lastDayLastMonth) match = false;
        } else if (datePreset === 'last_3_months') {
          const last3Months = new Date(today);
          last3Months.setMonth(last3Months.getMonth() - 3);
          if (invDate < last3Months) match = false;
        } else if (datePreset === 'custom') {
          const from = dateFrom ? new Date(dateFrom) : null;
          const to = dateTo ? new Date(dateTo) : null;
          if (from && to) {
            const toEnd = new Date(to);
            toEnd.setHours(23, 59, 59, 999);
            if (invDate < from || invDate > toEnd) match = false;
          } else if (from) {
            if (invDate < from) match = false;
          } else if (to) {
            const toEnd = new Date(to);
            toEnd.setHours(23, 59, 59, 999);
            if (invDate > toEnd) match = false;
          }
        }
      }
      return match;
    });
  }, [invoices, searchTerm, datePreset, dateFrom, dateTo, viewMode]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setActivePage(1);
    setHistoryPage(1);
  }, [searchTerm, datePreset, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );



  return (
    <Card className="glass-card mt-4">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
<div className="flex p-1 rounded-lg border border-white/10 backdrop-blur-sm w-fit">
  <button
    type="button"
    onClick={() => setViewMode('active')}
    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
      viewMode === 'active'
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
    }`}
  >
    Active
  </button>

  <button
    type="button"
    onClick={() => setViewMode('history')}
    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
      viewMode === 'history'
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
    }`}
  >
    History
  </button>
</div>
          <div className="flex flex-col sm:flex-row lg:items-center  gap-4">


            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex-1 min-w-[160px] sm:flex-none">
                <Select value={datePreset} onValueChange={setDatePreset}>
                  <SelectTrigger className="w-full glass-input sm:w-[160px] h-11 rounded-full  text-white focus:ring-primary/20 px-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <SelectValue placeholder="All Time" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className=" bg-gray-900 border-white/10 text-white rounded-2xl">
                    <SelectItem value="all_time">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* <div className="relative flex-1 min-w-[200px] lg:max-w-xs">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search by Beneficiary, ID..."
                  className="pl-11 h-11 rounded-full bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:ring-primary/20 w-full px-4"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div> */}

              {datePreset === 'custom' && (
                <div className="flex items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="flex-1 lg:w-36 h-11 rounded-full bg-white/5 border-white/10 text-white focus:ring-primary/20 px-4"
                  />
                  <span className="text-gray-500 font-medium">to</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="flex-1 lg:w-36 h-11 rounded-full bg-white/5 border-white/10 text-white focus:ring-primary/20 px-4"
                  />
                </div>
              )}
            </div>
            <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
              <AnimatedSearch
                placeholder="Beneficiary, Remarks, Bill No..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
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
      <CardFooter className="flex flex-row justify-center items-center gap-3 p-4 sm:p-6 border-t border-white/10">
        <div>
          <p className="text-xs sm:text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/10 bg-transparent hover:bg-white/10 text-white">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/10 bg-transparent hover:bg-white/10 text-white">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default InvoiceHistory;
