import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    getBeneficiaries,
    getInvoices,
    getVouchers,
    getVouchersList
} from '@/lib/api';
import {
    Search,
    Download,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Loader2,
    TrendingUp,
    Users,
    FileText,
    CreditCard,
    Banknote,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import {
    startOfDay,
    endOfDay,
    subDays,
    startOfMonth,
    endOfMonth,
    subMonths,
    addDays,
    addMonths,
    differenceInDays,
    isAfter
} from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { AlertCircle, Calendar as CalendarIcon } from 'lucide-react';

// --- Time Frame Presets ---
const TIME_FRAME_PRESETS = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7', label: 'Last 7 Days' },
    { key: 'last30', label: 'Last 30 Days' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'lastMonth', label: 'Last Month' },
    { key: 'last3Months', label: 'Last 3 Months' },
    { key: 'custom', label: 'Custom' },
];

function getDateRange(preset, start, end) {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    switch (preset) {
        case 'today':
            return { from: todayStart, to: todayEnd };
        case 'yesterday':
            return { from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)) };
        case 'last7':
            return { from: startOfDay(subDays(now, 6)), to: todayEnd };
        case 'last30':
            return { from: startOfDay(subDays(now, 29)), to: todayEnd };
        case 'thisMonth':
            return { from: startOfMonth(now), to: endOfMonth(now) };
        case 'lastMonth':
            return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) };
        case 'last3Months':
            return { from: startOfDay(subMonths(now, 3)), to: todayEnd };
        case 'custom':
            return { from: start ? startOfDay(start) : null, to: end ? endOfDay(end) : null };
        default:
            return null;
    }
}

const StatBox = ({ title, value, icon: Icon, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
    >
        <Card className="glass-card overflow-hidden h-full relative group">
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</p>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 group-hover:scale-110 transition-transform">
                        <Icon className="w-4 h-4 text-white" />
                    </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-white truncate">
                    {typeof value === 'number' && title !== 'Beneficiaries' ? '₹' : ''}
                    {typeof value === 'number' ? Math.round(value).toLocaleString('en-IN') : value}
                </p>
            </CardContent>
        </Card>
    </motion.div>
);

const SortIcon = ({ column, sortColumn, sortDirection }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDirection === 'asc'
        ? <ArrowUp className="w-3 h-3 ml-1 text-blue-400" />
        : <ArrowDown className="w-3 h-3 ml-1 text-blue-400" />;
};

const BeneficiaryLedger = ({ entityId }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const organizationId = useCurrentOrganization(entityId);

    const [isLoading, setIsLoading] = useState(true);
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [vouchers, setVouchers] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Sort state
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');

    // Time frame filter state
    const [timeFrame, setTimeFrame] = useState('last30');
    const [customStartDate, setCustomStartDate] = useState(null);
    const [customEndDate, setCustomEndDate] = useState(null);
    const [dateError, setDateError] = useState('');

    const fetchData = useCallback(async () => {
        if (!user?.access_token || !organizationId || !entityId) return;
        setIsLoading(true);
        try {
            const [beneficiariesData, invoicesData, vouchersData] = await Promise.all([
                getBeneficiaries(organizationId, user.access_token, 0, 1000),
                getInvoices(entityId, user.access_token),
                getVouchers(entityId, user.access_token)
            ]);

            setBeneficiaries(Array.isArray(beneficiariesData) ? beneficiariesData : []);
            setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
            setVouchers(Array.isArray(vouchersData) ? vouchersData : []);
        } catch (error) {
            console.error("Error fetching ledger data:", error);
            toast({
                title: "Error",
                description: "Failed to load ledger data.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [user, organizationId, entityId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (timeFrame === 'custom' && customStartDate && customEndDate) {
            const days = differenceInDays(customEndDate, customStartDate);
            if (days > 365) {
                setDateError('Maximum range is 365 days');
            } else if (days < 0) {
                setDateError('Start date must be before end date');
            } else {
                setDateError('');
            }
        } else {
            setDateError('');
        }
    }, [timeFrame, customStartDate, customEndDate]);

    // Compute active date range
    const dateRange = useMemo(() => {
        return getDateRange(timeFrame, customStartDate, customEndDate);
    }, [timeFrame, customStartDate, customEndDate]);

    // Filter invoices and vouchers by date range
    const filteredInvoices = useMemo(() => {
        if (!dateRange) return invoices;
        return invoices.filter(inv => {
            const d = new Date(inv.created_at || inv.date);
            return d >= dateRange.from && d <= dateRange.to;
        });
    }, [invoices, dateRange]);

    const filteredVouchers = useMemo(() => {
        if (!dateRange) return vouchers;
        return vouchers.filter(v => {
            const d = new Date(v.created_date || v.created_at);
            return d >= dateRange.from && d <= dateRange.to;
        });
    }, [vouchers, dateRange]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection(column === 'name' ? 'asc' : 'desc');
        }
        setCurrentPage(1);
    };

    const handleTimeFrameSelect = (key) => {
        setTimeFrame(key);
        setCurrentPage(1);
        setDateError('');
        if (key === 'custom' && !customStartDate) {
            const end = new Date();
            const start = subDays(end, 30);
            setCustomStartDate(start);
            setCustomEndDate(end);
        }
    };

    const ledgerData = useMemo(() => {
        const map = new Map();

        // Initialize map with all beneficiaries
        beneficiaries.forEach(b => {
            map.set(b.id, {
                id: b.id,
                name: b.name || b.company_name,
                invoiceTotal: 0,
                paymentTotal: 0,
                cashTotal: 0,
                debitTotal: 0
            });
        });

        // Add invoice totals (filtered by date)
        filteredInvoices.forEach(inv => {
            const bId = inv.beneficiary?.id || inv.beneficiary;
            if (bId && map.has(bId)) {
                const entry = map.get(bId);
                entry.invoiceTotal += parseFloat(inv.total_amount || inv.amount || 0);
            }
        });

        // Add payment totals (filtered by date)
        filteredVouchers.forEach(v => {
            const bId = v.beneficiary?.id || v.beneficiary;
            if (bId && map.has(bId)) {
                const entry = map.get(bId);
                const amount = parseFloat(v.amount || 0);
                entry.paymentTotal += amount;

                if (v.voucher_type?.toLowerCase() === 'cash') {
                    entry.cashTotal += amount;
                } else if (v.voucher_type?.toLowerCase() === 'debit') {
                    entry.debitTotal += amount;
                }
            }
        });

        let result = Array.from(map.values()).filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (item.invoiceTotal > 0 || item.paymentTotal > 0)
        );

        // Sort
        result.sort((a, b) => {
            let valA, valB;
            switch (sortColumn) {
                case 'name':
                    valA = (a.name || '').toLowerCase();
                    valB = (b.name || '').toLowerCase();
                    return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'invoiceTotal':
                    valA = a.invoiceTotal; valB = b.invoiceTotal;
                    break;
                case 'paymentTotal':
                    valA = a.paymentTotal; valB = b.paymentTotal;
                    break;
                case 'cashTotal':
                    valA = a.cashTotal; valB = b.cashTotal;
                    break;
                case 'debitTotal':
                    valA = a.debitTotal; valB = b.debitTotal;
                    break;
                default:
                    return 0;
            }
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        });

        return result;
    }, [beneficiaries, filteredInvoices, filteredVouchers, searchTerm, sortColumn, sortDirection]);

    const totals = useMemo(() => {
        return ledgerData.reduce((acc, curr) => ({
            invoices: acc.invoices + curr.invoiceTotal,
            payments: acc.payments + curr.paymentTotal,
            cash: acc.cash + curr.cashTotal,
            debit: acc.debit + curr.debitTotal
        }), { invoices: 0, payments: 0, cash: 0, debit: 0 });
    }, [ledgerData]);

    const stats = [
        { title: 'Beneficiaries', value: ledgerData.length, icon: Users },
        { title: 'Invoices', value: totals.invoices, icon: FileText },
        { title: 'Payments', value: totals.payments, icon: CreditCard },
        { title: 'By Cash', value: totals.cash, icon: Banknote },
        { title: 'By Debit', value: totals.debit, icon: TrendingUp },
    ];

    const totalPages = Math.ceil(ledgerData.length / pageSize);
    const paginatedData = ledgerData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleExport = () => {
        const headers = ['Sr No', 'Beneficiary', 'Invoice', 'Payment', 'By Cash', 'By Debit'];
        const rows = ledgerData.map((item, index) => [
            index + 1,
            `"${item.name}"`,
            item.invoiceTotal,
            item.paymentTotal,
            item.cashTotal,
            item.debitTotal
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "beneficiary_ledger.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            {/* Header Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 sm:gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/')}
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-white/10"
                    >
                        <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </Button>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Ledger</h1>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                        variant="outline"
                        className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
                        onClick={handleExport}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Export</span>
                    </Button>

                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search beneficiary..."
                            className="pl-9 h-9 sm:h-10 border-white/10 bg-white/5 focus:bg-white/10 text-white placeholder:text-gray-500 rounded-xl text-xs sm:text-sm"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    {/* Time Frame Filter */}
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                            <Select value={timeFrame} onValueChange={handleTimeFrameSelect}>
                                <SelectTrigger className="w-[140px] sm:w-[150px] h-9 sm:h-10 rounded-xl text-xs sm:text-sm border-white/10 bg-white/5">
                                    <CalendarIcon className="w-4 h-4 mr-2 opacity-50 shrink-0" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a2e] border-white/10 text-white rounded-xl">
                                    {TIME_FRAME_PRESETS.map(preset => (
                                        <SelectItem key={preset.key} value={preset.key} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-lg">
                                            {preset.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {timeFrame === 'custom' && (
                                <div className="flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center gap-1.5">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-[110px] sm:w-[120px] h-9 sm:h-10 gap-2 justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl px-2 sm:px-3",
                                                        !customStartDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                                    <span className="truncate text-[10px] sm:text-xs">{customStartDate ? format(customStartDate, "dd MMM yy") : "Start"}</span>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 bg-[#1a1a2e] border-white/10 shadow-2xl" align="end">
                                                <CalendarPicker
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
                                        <span className="text-gray-500 text-[10px] uppercase font-bold px-0.5">to</span>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-[110px] sm:w-[120px] h-9 sm:h-10 gap-2 justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl px-2 sm:px-3",
                                                        !customEndDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                                    <span className="truncate text-[10px] sm:text-xs">{customEndDate ? format(customEndDate, "dd MMM yy") : "End"}</span>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 bg-[#1a1a2e] border-white/10 shadow-2xl" align="end">
                                                <CalendarPicker
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
                                </div>
                            )}
                        </div>
                        {timeFrame === 'custom' && dateError && (
                            <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-400/10 px-2 py-1 rounded-lg border border-red-400/20">
                                <AlertCircle className="w-3 h-3" />
                                {dateError}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                {stats.map((stat, idx) => (
                    <StatBox key={idx} {...stat} delay={idx * 0.1} />
                ))}
            </div>

            {/* Table Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
            >
                <Card className="glass-card overflow-hidden border-white/5 rounded-3xl">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">
                                        <td className="py-4 pl-6 w-16">S.No</td>
                                        <td
                                            className="py-4 px-4 cursor-pointer select-none hover:text-white transition-colors"
                                            onClick={() => handleSort('name')}
                                        >
                                            <span className="inline-flex items-center">
                                                Beneficiary
                                                <SortIcon column="name" sortColumn={sortColumn} sortDirection={sortDirection} />
                                            </span>
                                        </td>
                                        <td
                                            className="py-4 px-4 cursor-pointer select-none hover:text-white transition-colors"
                                            onClick={() => handleSort('invoiceTotal')}
                                        >
                                            <span className="inline-flex items-center">
                                                Invoice
                                                <SortIcon column="invoiceTotal" sortColumn={sortColumn} sortDirection={sortDirection} />
                                            </span>
                                        </td>
                                        <td
                                            className="py-4 px-4 cursor-pointer select-none hover:text-white transition-colors"
                                            onClick={() => handleSort('paymentTotal')}
                                        >
                                            <span className="inline-flex items-center">
                                                Payment
                                                <SortIcon column="paymentTotal" sortColumn={sortColumn} sortDirection={sortDirection} />
                                            </span>
                                        </td>
                                        <td
                                            className="py-4 px-4 cursor-pointer select-none hover:text-white transition-colors"
                                            onClick={() => handleSort('cashTotal')}
                                        >
                                            <span className="inline-flex items-center">
                                                By Cash
                                                <SortIcon column="cashTotal" sortColumn={sortColumn} sortDirection={sortDirection} />
                                            </span>
                                        </td>
                                        <td
                                            className="py-4 px-4 cursor-pointer select-none hover:text-white transition-colors"
                                            onClick={() => handleSort('debitTotal')}
                                        >
                                            <span className="inline-flex items-center">
                                                By Debit
                                                <SortIcon column="debitTotal" sortColumn={sortColumn} sortDirection={sortDirection} />
                                            </span>
                                        </td>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {paginatedData.length > 0 ? (
                                        paginatedData.map((item, idx) => (
                                            <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                <td className="py-4 pl-6 text-gray-500 font-mono">
                                                    {String((currentPage - 1) * pageSize + idx + 1).padStart(2, "0")}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span
                                                        className="text-white font-medium cursor-pointer hover:text-primary inline-block group-hover:scale-[1.02] transition-all origin-left"
                                                        onClick={() => navigate(`/beneficiaries/${item.id}/ledger`)}
                                                    >
                                                        {item.name}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-white">
                                                    ₹{Math.round(item.invoiceTotal).toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-4 px-4 text-white">
                                                    ₹{Math.round(item.paymentTotal).toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-4 px-4 text-red-400">
                                                    ₹{Math.round(item.cashTotal).toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-4 px-4 text-red-400">
                                                    ₹{Math.round(item.debitTotal).toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="py-12 text-center text-gray-500">
                                                No transactions found matching your criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {ledgerData.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-white/5 font-bold text-white border-t border-white/10">
                                            <td colSpan="2" className="py-4 pl-6 text-right pr-4 uppercase tracking-wider text-xs">Total</td>
                                            <td className="py-4 px-4 text-white">
                                                ₹{Math.round(totals.invoices).toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-4 px-4 text-white">
                                                ₹{Math.round(totals.payments).toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-4 px-4 text-red-400">
                                                ₹{Math.round(totals.cash).toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-4 px-4 text-red-400">
                                                ₹{Math.round(totals.debit).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </CardContent>

                    {/* Pagination */}
                    <div className="p-4 sm:p-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-xs sm:text-sm text-gray-400">
                            Page {currentPage} of {totalPages || 1}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 sm:h-9 sm:w-9 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => (
                                    <Button
                                        key={i}
                                        variant={currentPage === i + 1 ? "default" : "ghost"}
                                        className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl text-xs ${currentPage === i + 1 ? 'bg-primary text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        onClick={() => setCurrentPage(i + 1)}
                                    >
                                        {i + 1}
                                    </Button>
                                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 sm:h-9 sm:w-9 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
};

export default BeneficiaryLedger;
