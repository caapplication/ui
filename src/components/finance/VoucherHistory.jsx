import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Eye, ChevronLeft, ChevronRight, Trash2, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { getVoucherAttachment, updateVoucher } from '@/lib/api';
import { getFinanceHeaders } from '@/lib/api/settings';
import { formatCurrencyINR } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;

const formatDate = (dateString) => {
    const localDate = new Date(dateString);
    // The dateString from the backend is in UTC, but JavaScript's `new Date()` parses it as local time.
    // To correct this, we get the timezone offset from the client's machine and adjust the date.
    // This creates a new Date object that correctly represents the UTC time.
    const utcDate = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));

    return {
        date: utcDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
        time: utcDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }),
    };
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
            return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'rejected_by_ca':
        case 'rejected_by_master_admin':
            return 'bg-red-500/20 text-red-400 border-red-500/30';
        case 'pending_ca_approval':
            return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'pending_master_admin_approval':
            return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        default:
            return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
};

import { Check } from 'lucide-react';

import AnimatedSearch from '@/components/ui/AnimatedSearch';
import { DateRangePicker } from '@/components/ui/date-range-picker';

const VoucherHistory = ({ vouchers, onDeleteVoucher, onEditVoucher, onViewVoucher, isAccountantView, onRefresh }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [datePreset, setDatePreset] = useState('last_30_days');
    const [dateRange, setDateRange] = useState({ from: null, to: null });
    const [voucherToDelete, setVoucherToDelete] = useState(null);
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

    const sortedAndFilteredVouchers = useMemo(() => {
        let sortableVouchers = [...(vouchers || [])];
        sortableVouchers.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

        // Filter based on View Mode (Active vs History)
        let modeFilteredVouchers;
        if (viewMode === 'active') {
            // Active: Not exported AND Not tagged (finance_header_id) AND Not deleted
            modeFilteredVouchers = sortableVouchers.filter(v => !v.is_exported && !v.finance_header_id && !v.is_deleted);
        } else {
            // History: Exported OR Tagged (finance_header_id) OR Deleted
            modeFilteredVouchers = sortableVouchers.filter(v => v.is_exported || v.finance_header_id || v.is_deleted);
        }

        return modeFilteredVouchers.filter(v => {
            let match = true;
            if (searchTerm) {
                const term = searchTerm.toLowerCase().trim();
                const beneficiaryMatch = v.beneficiaryName && v.beneficiaryName.toLowerCase().includes(term);
                const voucherIdMatch = (v.voucher_id || v.id || '').toString().toLowerCase().includes(term);
                const remarksMatch = (v.remarks || 'N/A').toLowerCase().includes(term);
                if (!beneficiaryMatch && !voucherIdMatch && !remarksMatch) {
                    match = false;
                }
            }
            if (typeFilter && typeFilter !== 'all') {
                if (v.voucher_type !== typeFilter) {
                    match = false;
                }
            }
            if (datePreset !== 'all_time') {
                const vDate = new Date(v.created_date);
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                if (datePreset === 'today') {
                    if (vDate < today) match = false;
                } else if (datePreset === 'yesterday') {
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (vDate < yesterday || vDate >= today) match = false;
                } else if (datePreset === 'last_7_days') {
                    const last7 = new Date(today);
                    last7.setDate(last7.getDate() - 7);
                    if (vDate < last7) match = false;
                } else if (datePreset === 'last_30_days') {
                    const last30 = new Date(today);
                    last30.setDate(last30.getDate() - 30);
                    if (vDate < last30) match = false;
                } else if (datePreset === 'this_month') {
                    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    if (vDate < firstDayThisMonth) match = false;
                } else if (datePreset === 'last_month') {
                    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                    if (vDate < firstDayLastMonth || vDate > lastDayLastMonth) match = false;
                } else if (datePreset === 'last_3_months') {
                    const last3Months = new Date(today);
                    last3Months.setMonth(last3Months.getMonth() - 3);
                    if (vDate < last3Months) match = false;
                } else if (datePreset === 'custom') {
                    const from = dateRange?.from ? new Date(dateRange.from) : null;
                    const to = dateRange?.to ? new Date(dateRange.to) : null;
                    if (from && to) {
                        const toEnd = new Date(to);
                        toEnd.setHours(23, 59, 59, 999);
                        if (vDate < from || vDate > toEnd) match = false;
                    } else if (from) {
                        if (vDate < from) match = false;
                    } else if (to) {
                        const toEnd = new Date(to);
                        toEnd.setHours(23, 59, 59, 999);
                        if (vDate > toEnd) match = false;
                    }
                }
            }
            return match;
        });
    }, [vouchers, searchTerm, typeFilter, datePreset, dateRange, viewMode]);

    const totalPages = Math.ceil(sortedAndFilteredVouchers.length / ITEMS_PER_PAGE);
    const paginatedVouchers = sortedAndFilteredVouchers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        setActivePage(1);
        setHistoryPage(1);
    }, [searchTerm, typeFilter, datePreset, dateRange]);

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
            <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col gap-4">
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

                        <div className="flex flex-wrap items-center justify-end gap-3 w-full lg:w-auto">
                            <div className="flex-1 min-w-[140px] sm:flex-none">
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-full sm:w-[140px] glass-input">
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="debit">Debit</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Select value={datePreset} onValueChange={setDatePreset}>
                                <SelectTrigger className="w-full sm:w-[190px] h-11 rounded-full glass-input px-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <SelectValue placeholder="All Time" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
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
                            {datePreset === 'custom' && (
                                <DateRangePicker
                                    dateRange={dateRange}
                                    onChange={setDateRange}
                                    className="w-full sm:w-auto"
                                />
                            )}
                            <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                                <AnimatedSearch
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search Here"
                                />
                            </div>
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
                                <TableHead className="text-xs sm:text-sm">Voucher ID</TableHead>
                                <TableHead className="text-xs sm:text-sm">Type</TableHead>
                                <TableHead className="text-xs sm:text-sm">Beneficiaries</TableHead>
                                <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                                <TableHead className="text-xs sm:text-sm">Status</TableHead>
                                <TableHead className="text-xs sm:text-sm">Remarks</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedVouchers.map(voucher => {
                                const { date, time } = formatDate(voucher.created_date);
                                return (
                                    <TableRow key={voucher.id} onClick={() => onViewVoucher({ ...voucher, isReadOnly: viewMode === 'history' }, searchTerm || typeFilter !== 'all' || datePreset !== 'all_time', sortedAndFilteredVouchers)} className={`transition-colors cursor-pointer ${voucher.is_ready ? '' : ''}`}>
                                        <TableCell className="text-xs sm:text-sm">
                                            <div>{date}</div>
                                            <div className="text-xs text-gray-400">{time}</div>
                                        </TableCell>
                                        <TableCell className="text-xs sm:text-sm">{voucher.voucher_id ? voucher.voucher_id : (voucher.id ? voucher.id : '-')}</TableCell>
                                        <TableCell className="text-xs sm:text-sm">
                                            <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium capitalize ${voucher.voucher_type === 'cash' ? 'bg-green-500/20 text-green-300' : 'bg-pink-500/20 text-pink-300'}`}>
                                                {voucher.voucher_type}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{voucher.beneficiaryName}</TableCell>
                                        <TableCell className="text-xs sm:text-sm">
                                            {formatCurrencyINR(voucher.amount)}
                                        </TableCell>
                                        <TableCell className="text-xs sm:text-sm">
                                            <span className={`inline-flex items-center justify-center text-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium border h-auto min-h-[1.5rem] whitespace-normal leading-tight ${voucher.is_deleted ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' : getStatusColor(voucher.status)}`}>
                                                {voucher.is_deleted ? 'Deleted' : formatStatus(voucher.status)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs sm:text-sm max-w-[200px]">
                                            <div className="line-clamp-2 whitespace-normal break-words overflow-hidden" title={voucher.remarks}>
                                                {voucher.remarks && voucher.remarks.trim() ? voucher.remarks : 'N/A'}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                {paginatedVouchers.length === 0 && <p className="text-center text-gray-400 py-8 text-sm sm:text-base">No vouchers found.</p>}
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

export default VoucherHistory;
