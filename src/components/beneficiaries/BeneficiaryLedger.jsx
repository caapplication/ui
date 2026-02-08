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
    ArrowDown,
    Calendar
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
    addMonths
} from 'date-fns';

// --- Time Frame Presets ---
const TIME_FRAME_PRESETS = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7', label: 'Last 7 Days' },
    { key: 'last30', label: 'Last 30 Days' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'lastMonth', label: 'Last Month' },
    { key: 'last3Months', label: 'Last 3 Months' },
    { key: 'tomorrow', label: 'Tomorrow' },
    { key: 'next7', label: 'Next 7 Days' },
    { key: 'next30', label: 'Next 30 Days' },
    { key: 'nextMonth', label: 'Next Month' },
    { key: 'next3Months', label: 'Next 3 Months' },
];

function getDateRange(preset) {
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
        case 'tomorrow':
            return { from: startOfDay(addDays(now, 1)), to: endOfDay(addDays(now, 1)) };
        case 'next7':
            return { from: todayStart, to: endOfDay(addDays(now, 7)) };
        case 'next30':
            return { from: todayStart, to: endOfDay(addDays(now, 30)) };
        case 'nextMonth':
            return { from: startOfMonth(addMonths(now, 1)), to: endOfMonth(addMonths(now, 1)) };
        case 'next3Months':
            return { from: todayStart, to: endOfDay(addMonths(now, 3)) };
        default:
            return null; // custom or 'all'
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

    // Compute active date range
    const dateRange = useMemo(() => {
        return getDateRange(timeFrame);
    }, [timeFrame]);

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
                    <Select value={timeFrame} onValueChange={handleTimeFrameSelect}>
                        <SelectTrigger className="w-[140px] sm:w-[170px] h-9 sm:h-10 rounded-xl text-xs sm:text-sm border-white/10 bg-white/5">
                            <Calendar className="w-4 h-4 mr-2 opacity-50 shrink-0" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TIME_FRAME_PRESETS.map(preset => (
                                <SelectItem key={preset.key} value={preset.key}>
                                    {preset.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                                            className="py-4 pr-6 text-right cursor-pointer select-none hover:text-white transition-colors"
                                            onClick={() => handleSort('debitTotal')}
                                        >
                                            <span className="inline-flex items-center justify-end w-full">
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
                                                <td className="py-4 pr-6 text-right text-red-400">
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
                                            <td className="py-4 pr-6 text-right text-red-400">
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
