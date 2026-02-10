import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    Search,
    Loader2,
    ArrowLeft,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    CalendarIcon,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { getVouchersList } from '@/lib/api';
import { format, startOfDay, endOfDay, differenceInDays, isAfter } from 'date-fns';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const TIME_FRAME_PRESETS = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: 'last7' },
    { label: 'Last 30 Days', value: 'last30' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'Last 3 Months', value: 'last3Months' },
    { label: 'Last 6 Months', value: 'last6Months' },
    { label: 'This Year', value: 'thisYear' },
    { label: 'All Time', value: 'all' },
];

const getDateRange = (preset, start, end) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (preset) {
        case 'today':
            return { start: startOfToday, end: now };
        case 'yesterday': {
            const y = new Date(startOfToday);
            y.setDate(y.getDate() - 1);
            return { start: y, end: startOfToday };
        }
        case 'last7': {
            const d = new Date(startOfToday);
            d.setDate(d.getDate() - 7);
            return { start: d, end: now };
        }
        case 'last30': {
            const d = new Date(startOfToday);
            d.setDate(d.getDate() - 30);
            return { start: d, end: now };
        }
        case 'thisMonth':
            return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
        case 'lastMonth': {
            const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            return { start: s, end: e };
        }
        case 'last3Months': {
            const d = new Date(startOfToday);
            d.setMonth(d.getMonth() - 3);
            return { start: d, end: now };
        }
        case 'last6Months': {
            const d = new Date(startOfToday);
            d.setMonth(d.getMonth() - 6);
            return { start: d, end: now };
        }
        case 'thisYear':
            return { start: new Date(now.getFullYear(), 0, 1), end: now };
        case 'custom':
            return {
                start: start ? startOfDay(start) : null,
                end: end ? endOfDay(end) : null
            };
        case 'all':
        default:
            return { start: null, end: null };
    }
};

const RecentTransactionsExpanded = ({ entityId }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [allVouchers, setAllVouchers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState('created_date');
    const [sortDirection, setSortDirection] = useState('desc');
    const [timeFrame, setTimeFrame] = useState('last30');
    const [customStartDate, setCustomStartDate] = useState(null);
    const [customEndDate, setCustomEndDate] = useState(null);
    const [dateError, setDateError] = useState('');
    const itemsPerPage = 10;

    const resolvedEntityId = entityId || localStorage.getItem('entityId');

    const fetchData = useCallback(async () => {
        if (!user?.access_token || !resolvedEntityId) return;
        setLoading(true);
        try {
            const vouchers = await getVouchersList(resolvedEntityId, user.access_token);
            setAllVouchers(vouchers);
        } catch (error) {
            console.error('Error fetching vouchers:', error);
        } finally {
            setLoading(false);
        }
    }, [user, resolvedEntityId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection(column === 'beneficiary_name' ? 'asc' : 'desc');
        }
    };

    const SortIcon = ({ column }) => {
        if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
        return sortDirection === 'asc'
            ? <ArrowUp className="w-3 h-3 ml-1 inline text-blue-400" />
            : <ArrowDown className="w-3 h-3 ml-1 inline text-blue-400" />;
    };

    const filteredData = useMemo(() => {
        const { start, end } = getDateRange(timeFrame, customStartDate, customEndDate);

        let result = allVouchers.filter(v => {
            // Time frame filter
            const vDate = new Date(v.created_date || v.created_at);
            if (start && vDate < start) return false;
            if (end && vDate > end) return false;

            // Search filter
            const beneficiaryName = v.beneficiary_name || v.beneficiary?.name || v.beneficiary?.company_name || '';
            const remarks = v.remarks || '';
            const search = searchTerm.toLowerCase();
            return beneficiaryName.toLowerCase().includes(search) || remarks.toLowerCase().includes(search);
        });

        result.sort((a, b) => {
            if (sortColumn === 'beneficiary_name') {
                const nameA = (a.beneficiary_name || a.beneficiary?.name || a.beneficiary?.company_name || '').toLowerCase();
                const nameB = (b.beneficiary_name || b.beneficiary?.name || b.beneficiary?.company_name || '').toLowerCase();
                return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            }
            if (sortColumn === 'amount') {
                const amtA = parseFloat(a.amount) || 0;
                const amtB = parseFloat(b.amount) || 0;
                return sortDirection === 'asc' ? amtA - amtB : amtB - amtA;
            }
            // Default: created_date
            const dA = new Date(a.created_date || a.created_at).getTime();
            const dB = new Date(b.created_date || b.created_at).getTime();
            return sortDirection === 'asc' ? dA - dB : dB - dA;
        });

        return result;
    }, [allVouchers, searchTerm, sortColumn, sortDirection, timeFrame, customStartDate, customEndDate]);

    const totalAmount = useMemo(() => {
        return filteredData.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
    }, [filteredData]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/')}
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-white/10"
                    >
                        <ArrowLeft className="h-5 w-5 text-white" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Recent Transactions</h1>
                        <p className="text-gray-400 text-sm mt-0.5">All voucher transactions</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 w-full sm:w-auto">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <Select value={timeFrame} onValueChange={(val) => {
                            setTimeFrame(val);
                            setCurrentPage(1);
                            if (val === 'custom' && !customStartDate) {
                                const end = new Date();
                                const start = new Date();
                                start.setMonth(start.getMonth() - 1);
                                setCustomStartDate(start);
                                setCustomEndDate(end);
                            }
                        }}>
                            <SelectTrigger className="w-full sm:w-44 h-9 sm:h-10 border-white/10 bg-white/5 text-white rounded-xl text-sm">
                                <SelectValue placeholder="Time frame" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a2e] border-white/10 text-white rounded-xl">
                                {TIME_FRAME_PRESETS.map(preset => (
                                    <SelectItem key={preset.value} value={preset.value} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-lg">
                                        {preset.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search beneficiary..."
                                className="pl-9 h-9 sm:h-10 border-white/10 bg-white/5 focus:bg-white/10 text-white placeholder:text-gray-500 rounded-xl text-sm"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>

                    {timeFrame === 'custom' && (
                        <div className="flex flex-row items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-[120px] sm:w-[130px] h-9 gap-2 justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl px-2 sm:px-3",
                                                !customStartDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                            <span className="truncate text-xs sm:text-sm">{customStartDate ? format(customStartDate, "dd MMM yy") : "Start"}</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-[#1a1a2e] border-white/10 shadow-2xl" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={customStartDate}
                                            onSelect={(date) => {
                                                setCustomStartDate(date);
                                                if (date && customEndDate) {
                                                    const days = differenceInDays(customEndDate, date);
                                                    if (days > 365 || days < 0) {
                                                        const newEnd = new Date(date);
                                                        newEnd.setFullYear(newEnd.getFullYear() + 1);
                                                        const limit = new Date();
                                                        setCustomEndDate(newEnd > limit ? limit : newEnd);
                                                    }
                                                }
                                            }}
                                            fromYear={2020}
                                            toYear={new Date().getFullYear()}
                                            disabled={(date) => {
                                                if (customEndDate) {
                                                    const diff = differenceInDays(customEndDate, date);
                                                    return diff < 0 || diff > 365 || isAfter(date, new Date());
                                                }
                                                return isAfter(date, new Date());
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <span className="text-gray-500 text-[10px] sm:text-xs font-medium shrink-0 uppercase">to</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-[120px] sm:w-[130px] h-9 gap-2 justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl px-2 sm:px-3",
                                                !customEndDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                            <span className="truncate text-xs sm:text-sm">{customEndDate ? format(customEndDate, "dd MMM yy") : "End"}</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-[#1a1a2e] border-white/10 shadow-2xl" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={customEndDate}
                                            onSelect={(date) => {
                                                setCustomEndDate(date);
                                                if (customStartDate && date) {
                                                    const days = differenceInDays(date, customStartDate);
                                                    if (days > 365 || days < 0) {
                                                        const newStart = new Date(date);
                                                        newStart.setFullYear(newStart.getFullYear() - 1);
                                                        setCustomStartDate(newStart);
                                                    }
                                                }
                                            }}
                                            fromYear={2020}
                                            toYear={new Date().getFullYear()}
                                            disabled={(date) => {
                                                if (customStartDate) {
                                                    const diff = differenceInDays(date, customStartDate);
                                                    return diff < 0 || diff > 365 || isAfter(date, new Date());
                                                }
                                                return isAfter(date, new Date());
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {dateError && (
                                <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/20">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>{dateError}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <Card className="glass-card overflow-hidden border-white/5 rounded-3xl flex flex-col">
                <CardContent className="p-0 flex flex-col">
                    <div className="overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-20 backdrop-blur-md">
                                <tr className="border-b border-white/10 text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider bg-white/5">
                                    <th className="py-4 pl-6 w-16">S.No</th>
                                    <th
                                        className="py-4 px-4 cursor-pointer select-none hover:text-white transition-colors"
                                        onClick={() => handleSort('beneficiary_name')}
                                    >
                                        Beneficiary <SortIcon column="beneficiary_name" />
                                    </th>
                                    <th className="py-4 px-4">Remarks</th>
                                    <th
                                        className="py-4 px-4 cursor-pointer select-none hover:text-white transition-colors"
                                        onClick={() => handleSort('created_date')}
                                    >
                                        Date <SortIcon column="created_date" />
                                    </th>
                                    <th
                                        className="py-4 pr-6 text-right cursor-pointer select-none hover:text-white transition-colors"
                                        onClick={() => handleSort('amount')}
                                    >
                                        Amount <SortIcon column="amount" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center text-gray-400">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                            Loading...
                                        </td>
                                    </tr>
                                ) : paginatedData.length > 0 ? (
                                    paginatedData.map((v, idx) => {
                                        const beneficiaryName = v.beneficiary_name || v.beneficiary?.name || v.beneficiary?.company_name || '-';
                                        const vDate = v.created_date || v.created_at;
                                        return (
                                            <tr
                                                key={v.id || idx}
                                                className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/finance/vouchers/${v.id}`)}
                                            >
                                                <td className="py-4 pl-6 text-gray-500 font-mono">
                                                    {String((currentPage - 1) * itemsPerPage + idx + 1).padStart(2, '0')}
                                                </td>
                                                <td className="py-4 px-4 text-white font-medium">
                                                    {beneficiaryName}
                                                </td>
                                                <td className="py-4 px-4 text-gray-400 max-w-[200px] truncate">
                                                    {v.remarks || '-'}
                                                </td>
                                                <td className="py-4 px-4 text-gray-400 whitespace-nowrap">
                                                    {vDate ? format(new Date(vDate), 'dd MMM yyyy') : '-'}
                                                </td>
                                                <td className="py-4 pr-6 text-right text-red-400 font-semibold whitespace-nowrap">
                                                    ₹{Math.round(parseFloat(v.amount) || 0).toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="py-8 text-center text-gray-500">
                                            No transactions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {filteredData.length > 0 && (
                                <tfoot>
                                    <tr className="bg-white/5 font-bold text-white border-t border-white/10">
                                        <td colSpan="4" className="py-4 pl-6 text-right pr-4 uppercase tracking-wider text-xs">
                                            Total ({filteredData.length} transactions)
                                        </td>
                                        <td className="py-4 pr-6 text-right text-red-400 font-bold text-base">
                                            ₹{Math.round(totalAmount).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </CardContent>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 sm:p-6 border-t border-white/5 flex justify-between items-center bg-white/5">
                        <p className="text-xs text-gray-400">
                            Showing {paginatedData.length} of {filteredData.length} records
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-white/10 bg-transparent hover:bg-white/10 text-white"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                                <span className="text-xs font-bold text-white">{currentPage}</span>
                                <span className="text-[10px] text-gray-500">/</span>
                                <span className="text-[10px] text-gray-500 font-medium">{totalPages}</span>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-white/10 bg-transparent hover:bg-white/10 text-white"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default RecentTransactionsExpanded;
