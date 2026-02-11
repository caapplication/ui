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

const VoucherHistory = ({ vouchers, onDeleteVoucher, onEditVoucher, onViewVoucher, isAccountantView, onRefresh }) => {
    const [activeFilters, setActiveFilters] = useState([]);
    const [filterValues, setFilterValues] = useState({ dateFrom: '', dateTo: '', beneficiary: '', voucher_id: '', type: '', remarks: '' });
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

    const [viewMode, setViewMode] = useState('active');

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
            for (const filter of activeFilters) {
                if (filter === 'beneficiary') {
                    const searchTerm = (filterValues.beneficiary || '').toLowerCase().trim();
                    match = match && (!searchTerm || (v.beneficiaryName && v.beneficiaryName.toLowerCase().includes(searchTerm)));
                }
                if (filter === 'voucher_id') {
                    const searchTerm = (filterValues.voucher_id || '').toLowerCase().trim();
                    const voucherId = (v.voucher_id || v.id || '').toString().toLowerCase();
                    match = match && (!searchTerm || voucherId.includes(searchTerm));
                }
                if (filter === 'type') {
                    if (filterValues.type && filterValues.type !== 'all') {
                        match = match && v.voucher_type === filterValues.type;
                    }
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
                if (filter === 'remarks') {
                    const searchTerm = (filterValues.remarks || '').toLowerCase().trim();
                    const remarks = (v.remarks || 'N/A').toLowerCase();
                    match = match && (!searchTerm || remarks.includes(searchTerm));
                }
            }
            return match;
        });
    }, [vouchers, activeFilters, filterValues, viewMode]);

    const totalPages = Math.ceil(sortedAndFilteredVouchers.length / ITEMS_PER_PAGE);
    const paginatedVouchers = sortedAndFilteredVouchers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilters, filterValues]);

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
                                    {!activeFilters.includes('beneficiary') && <SelectItem value="beneficiary">Beneficiary Name</SelectItem>}
                                    {!activeFilters.includes('voucher_id') && <SelectItem value="voucher_id">Voucher ID</SelectItem>}
                                    {!activeFilters.includes('type') && <SelectItem value="type">Type</SelectItem>}
                                    {!activeFilters.includes('date') && <SelectItem value="date">Date</SelectItem>}
                                    {!activeFilters.includes('remarks') && <SelectItem value="remarks">Remarks</SelectItem>}
                                </SelectContent>
                            </Select>
                            {activeFilters.map(filter => (
                                <div key={filter} className="flex items-center gap-2 flex-wrap">
                                    {filter === 'beneficiary' && (
                                        <Input
                                            placeholder="Search by beneficiary..."
                                            value={filterValues.beneficiary || ''}
                                            onChange={e => setFilterValues(fv => ({ ...fv, beneficiary: e.target.value }))}
                                            className="w-full sm:max-w-xs text-sm sm:text-base"
                                        />
                                    )}
                                    {filter === 'voucher_id' && (
                                        <Input
                                            placeholder="Search by voucher ID..."
                                            value={filterValues.voucher_id || ''}
                                            onChange={e => setFilterValues(fv => ({ ...fv, voucher_id: e.target.value }))}
                                            className="w-full sm:max-w-xs text-sm sm:text-base"
                                        />
                                    )}
                                    {filter === 'type' && (
                                        <Select
                                            value={filterValues.type || 'all'}
                                            onValueChange={val => setFilterValues(fv => ({ ...fv, type: val }))}
                                        >
                                            <SelectTrigger className="w-full sm:w-[180px] text-sm sm:text-base">
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
                                                } else {
                                                    delete newFv[filter];
                                                }
                                                return newFv;
                                            });
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
                                    <TableRow key={voucher.id} onClick={() => onViewVoucher({ ...voucher, isReadOnly: viewMode === 'history' }, activeFilters.length > 0)} className={`transition-colors cursor-pointer ${voucher.is_ready ? '' : ''}`}>
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
                                            ₹{(() => {
                                                const val = parseFloat(voucher.amount);
                                                return val % 1 === 0
                                                    ? val.toLocaleString('en-IN', { maximumFractionDigits: 0 })
                                                    : val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                            })()}
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

export default VoucherHistory;
