import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Eye, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { getVoucherAttachment, updateVoucher } from '@/lib/api';
import { getFinanceHeaders } from '@/lib/api/settings';

const ITEMS_PER_PAGE = 10;

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
};

import { Check } from 'lucide-react';

const VoucherHistory = ({ vouchers, onDeleteVoucher, onEditVoucher, onViewVoucher, isAccountantView, onRefresh }) => {
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterValues, setFilterValues] = useState({ dateFrom: '', dateTo: '' });
  const [voucherToDelete, setVoucherToDelete] = useState(null);
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

  const sortedAndFilteredVouchers = useMemo(() => {
    let sortableVouchers = [...(vouchers || [])];
    sortableVouchers.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    const unexportedVouchers = sortableVouchers.filter(v => !v.is_exported);

    return unexportedVouchers.filter(v => {
      let match = true;
      for (const filter of activeFilters) {
        if (filter === 'beneficiary') {
          match = match && v.beneficiaryName && v.beneficiaryName.toLowerCase().includes((filterValues.beneficiary || '').toLowerCase());
        }
        if (filter === 'voucher_id') {
          match = match && (v.voucher_id || v.id || '').toLowerCase().includes((filterValues.voucher_id || '').toLowerCase());
        }
        if (filter === 'type') {
          match = match && (filterValues.type === 'all' || v.voucher_type === filterValues.type);
        }
        if (filter === 'date') {
          const from = filterValues.dateFrom ? new Date(filterValues.dateFrom) : null;
          const to = filterValues.dateTo ? new Date(filterValues.dateTo) : null;
          const vDate = new Date(v.created_date);
          if (from && to) {
            match = match && vDate >= from && vDate <= to;
          } else if (from) {
            match = match && vDate >= from;
          } else if (to) {
            match = match && vDate <= to;
          }
        }
      }
      return match;
    });
  }, [vouchers, activeFilters, filterValues]);

  const totalPages = Math.ceil(sortedAndFilteredVouchers.length / ITEMS_PER_PAGE);
  const paginatedVouchers = sortedAndFilteredVouchers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleViewAttachment = async (voucher) => {
    if (!voucher.attachment_id) {
        toast({ title: 'No Attachment', description: 'This voucher does not have an attachment.', variant: 'destructive' });
        return;
    }
    try {
        const attachmentUrl = await getVoucherAttachment(voucher.attachment_id, user.access_token);
        navigate(`/vouchers/${voucher.id}`, { state: { attachmentUrl, voucher } });
    } catch (error) {
       toast({ title: 'Error', description: `Could not fetch attachment: ${error.message}`, variant: 'destructive' });
    }
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
                            {!activeFilters.includes('voucher_id') && <SelectItem value="voucher_id">Voucher ID</SelectItem>}
                            {!activeFilters.includes('type') && <SelectItem value="type">Type</SelectItem>}
                            {!activeFilters.includes('date') && <SelectItem value="date">Date</SelectItem>}
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
                            {filter === 'voucher_id' && (
                                <Input
                                    placeholder="Search by voucher ID..."
                                    value={filterValues.voucher_id || ''}
                                    onChange={e => setFilterValues(fv => ({ ...fv, voucher_id: e.target.value }))}
                                    className="max-w-xs"
                                />
                            )}
                            {filter === 'type' && (
                                <Select
                                    value={filterValues.type || 'all'}
                                    onValueChange={val => setFilterValues(fv => ({ ...fv, type: val }))}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="debit">Debit</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
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
                        <TableHead>Voucher ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Beneficiaries</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedVouchers.map(voucher => {
                        const { date, time } = formatDate(voucher.created_date);
                        return (
                            <TableRow key={voucher.id} onClick={() => onViewVoucher(voucher)} className={`transition-colors cursor-pointer ${voucher.is_ready ? 'bg-green-500/10' : ''}`}>
                                <TableCell>
                                    <div>{date}</div>
                                    <div className="text-xs text-gray-400">{time}</div>
                                </TableCell>
                                <TableCell>{voucher.voucher_id || voucher.id}</TableCell>
                                <TableCell>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${voucher.voucher_type === 'cash' ? 'bg-green-500/20 text-green-300' : 'bg-pink-500/20 text-pink-300'}`}>
                                        {voucher.voucher_type}
                                    </span>
                                </TableCell>
                                <TableCell>{voucher.beneficiaryName}</TableCell>
                                <TableCell>₹{parseFloat(voucher.amount).toFixed(2)}</TableCell>
                                <TableCell>{voucher.remarks || 'N/A'}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => { e.stopPropagation(); onViewVoucher(voucher); }}
                                            className="text-gray-400 hover:text-gray-300"
                                            tooltip="View: See voucher details"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </Button>
                                        {!voucher.is_ready && voucher.finance_header_id && (user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="text-green-400 hover:text-green-300"
                                                disabled={readyLoadingId === voucher.id}
                                                style={readyLoadingId === voucher.id ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                                                onClick={async () => {
                                                    setReadyLoadingId(voucher.id);
                                                    try {
                                                        await updateVoucher(voucher.id, { is_ready: true }, user.access_token);
                                                        toast({ title: 'Success', description: 'Voucher marked as ready.' });
                                                        if (onRefresh) onRefresh();
                                                    } catch (err) {
                                                        toast({ title: 'Error', description: `Failed to mark voucher as ready: ${err.message}`, variant: 'destructive' });
                                                    } finally {
                                                        setReadyLoadingId(null);
                                                    }
                                                }}
                                            >
                                                {readyLoadingId === voucher.id ? (
                                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                                    </svg>
                                                ) : (
                                                    <Check className="w-4 h-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            {paginatedVouchers.length === 0 && <p className="text-center text-gray-400 py-8">No vouchers found.</p>}
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

export default VoucherHistory;
