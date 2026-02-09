import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import {
    getBeneficiary,
    getInvoices,
    getVouchersList,
    getFinanceHeaders,
} from '@/lib/api';
import {
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Loader2,
    Calendar as CalendarIcon,
    Search,
    Download,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    AlertCircle
} from 'lucide-react';
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
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { cn } from '@/lib/utils';
import {
    format,
    differenceInDays,
    isAfter,
    subDays,
    startOfDay,
    endOfDay,
    startOfMonth,
    endOfMonth,
    subMonths
} from 'date-fns';

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

const formatDate = (dateString) => {
    if (!dateString) return { date: 'Invalid Date', time: '-' };
    const localDate = new Date(dateString);
    if (isNaN(localDate.getTime())) return { date: 'Invalid Date', time: '-' };

    return {
        date: format(localDate, "dd MMM yy"),
        time: format(localDate, "hh:mm a").toLowerCase(),
    };
};

const StatusBadge = ({ status }) => {
    if (!status) return (
        <div className="inline-flex items-center justify-center text-center px-3 py-1 rounded-full text-xs font-medium border h-auto min-h-[1.5rem] whitespace-normal leading-tight bg-gray-500/20 text-gray-400 border-gray-500/50">
            Unknown
        </div>
    );

    const statusMap = {
        verified: 'Verified',
        pending_ca_approval: 'Pending Audit',
        rejected_by_ca: 'Rejected',
        rejected_by_master_admin: 'Rejected',
        pending_master_admin_approval: 'Pending Approval'
    };

    const getStatusColor = (s) => {
        switch (s) {
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

    const displayText = statusMap[status.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1);

    return (
        <div className={`inline-flex items-center justify-center text-center px-3 py-1 rounded-full text-xs font-medium border h-auto min-h-[1.5rem] whitespace-normal leading-tight ${getStatusColor(status.toLowerCase())}`}>
            {displayText}
        </div>
    );
};

const SortIcon = ({ column, sortColumn, sortDirection }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return sortDirection === 'asc'
        ? <ArrowUp className="w-3 h-3 ml-1 inline text-blue-400" />
        : <ArrowDown className="w-3 h-3 ml-1 inline text-blue-400" />;
};

const BeneficiaryIndividualLedger = ({ entityId }) => {
    const { beneficiaryId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const organizationId = useCurrentOrganization(entityId);

    const [isLoading, setIsLoading] = useState(true);
    const [beneficiary, setBeneficiary] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeFrame, setTimeFrame] = useState('last30');
    const [customStartDate, setCustomStartDate] = useState(null);
    const [customEndDate, setCustomEndDate] = useState(null);
    const [dateError, setDateError] = useState('');
    const [sortColumn, setSortColumn] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const fetchData = useCallback(async () => {
        if (!user?.access_token || !organizationId || !entityId || !beneficiaryId) return;
        setIsLoading(true);
        try {
            const agencyId = user.agency_id || localStorage.getItem('agency_id');
            const [beneficiaryData, invoicesData, vouchersData, headersData] = await Promise.all([
                getBeneficiary(beneficiaryId, organizationId, user.access_token),
                getInvoices(entityId, user.access_token),
                getVouchersList(entityId, user.access_token),
                getFinanceHeaders(agencyId || 'null', user.access_token)
            ]);

            setBeneficiary(beneficiaryData);

            // Create a mapping for finance headers
            const headerMap = {};
            if (Array.isArray(headersData)) {
                headersData.forEach(h => {
                    if (h.id) {
                        headerMap[String(h.id)] = h.name;
                    }
                });
            }

            const filterByBeneficiary = (item, targetId) => {
                if (!item) return false;
                const itemBId = item.beneficiary?.id || item.beneficiary_id || (typeof item.beneficiary === 'string' ? item.beneficiary : null);
                return itemBId && String(itemBId) === String(targetId);
            };

            const bInvoices = (Array.isArray(invoicesData) ? invoicesData : [])
                .filter(inv => filterByBeneficiary(inv, beneficiaryId))
                .map(inv => {
                    const totalAmount = parseFloat(inv.total_amount || 0) || (
                        parseFloat(inv.amount || 0) +
                        parseFloat(inv.cgst || 0) +
                        parseFloat(inv.sgst || 0) +
                        parseFloat(inv.igst || 0)
                    );

                    return {
                        id: inv.id,
                        date: inv.created_at || inv.invoice_date,
                        type: 'Invoice',
                        rawType: 'Invoice',
                        ref: inv.bill_number || inv.invoice_number || inv.id?.slice(0, 8),
                        invoiceAmount: totalAmount,
                        paymentAmount: 0,
                        remark: inv.remarks || '-',
                        head: (inv.finance_header_id ? headerMap[String(inv.finance_header_id)] : null) || inv.finance_header_name || inv.category || '-',
                        status: inv.status || 'Verified'
                    };
                });

            const bVouchers = (Array.isArray(vouchersData) ? vouchersData : [])
                .filter(v => filterByBeneficiary(v, beneficiaryId))
                .map(v => ({
                    id: v.id,
                    date: v.created_date || v.timestamp || v.voucher_date || v.created_at,
                    type: v.voucher_type === 'cash' ? 'Cash Voucher' : 'Debit Voucher',
                    rawType: v.voucher_type, // 'cash' or 'debit'
                    ref: v.voucher_id || v.voucher_number || v.id?.slice(0, 8),
                    invoiceAmount: 0,
                    paymentAmount: parseFloat(v.amount || 0),
                    remark: v.remarks || '-',
                    head: (v.finance_header_id ? headerMap[String(v.finance_header_id)] : null) || v.finance_header_name || v.category || '-',
                    status: v.status || 'Pending Approval'
                }));

            const merged = [...bInvoices, ...bVouchers].sort((a, b) => {
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                return dateB.getTime() - dateA.getTime();
            });

            setTransactions(merged);
        } catch (error) {
            console.error("Error fetching individual ledger data:", error);
            toast({
                title: "Error",
                description: "Failed to load beneficiary ledger.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [user, organizationId, entityId, beneficiaryId, toast]);

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

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection(column === 'date' ? 'desc' : 'asc');
        }
    };

    const filteredAndSortedData = useMemo(() => {
        const { from, to } = getDateRange(timeFrame, customStartDate, customEndDate);

        let result = transactions.filter(tx => {
            const search = searchTerm.toLowerCase();
            const matchesSearch =
                tx.remark.toLowerCase().includes(search) ||
                tx.ref.toLowerCase().includes(search) ||
                tx.head.toLowerCase().includes(search) ||
                tx.type.toLowerCase().includes(search) ||
                tx.status.toLowerCase().includes(search) ||
                tx.invoiceAmount.toString().includes(search) ||
                tx.paymentAmount.toString().includes(search);

            if (!matchesSearch) return false;

            if (from && to) {
                const txDate = new Date(tx.date);
                if (txDate < from || txDate > to) return false;
            }

            return true;
        });

        result.sort((a, b) => {
            let valA, valB;
            switch (sortColumn) {
                case 'date':
                    valA = new Date(a.date).getTime();
                    valB = new Date(b.date).getTime();
                    break;
                case 'invoiceAmount':
                    valA = a.invoiceAmount;
                    valB = b.invoiceAmount;
                    break;
                case 'paymentAmount':
                    valA = a.paymentAmount;
                    valB = b.paymentAmount;
                    break;
                case 'type':
                    valA = a.type.toLowerCase();
                    valB = b.type.toLowerCase();
                    break;
                case 'head':
                    valA = a.head.toLowerCase();
                    valB = b.head.toLowerCase();
                    break;
                case 'status':
                    valA = a.status.toLowerCase();
                    valB = b.status.toLowerCase();
                    break;
                default:
                    valA = new Date(a.date).getTime();
                    valB = new Date(b.date).getTime();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [transactions, searchTerm, timeFrame, customStartDate, customEndDate, sortColumn, sortDirection]);

    const beneficiaryName = beneficiary?.name || beneficiary?.company_name || 'Beneficiary';

    const handleRowClick = (tx) => {
        const isCA = user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM';

        if (tx.rawType === 'Invoice') {
            const route = isCA ? `/invoices/ca/${tx.id}` : `/invoices/${tx.id}`;
            navigate(route);
        } else {
            // Voucher (cash or debit)
            const route = isCA ? `/vouchers/ca/${tx.id}` : `/finance/vouchers/${tx.id}`;
            navigate(route);
        }
    };

    const handleExport = () => {
        if (filteredAndSortedData.length === 0) {
            toast({
                title: "No data to export",
                description: "There are no transactions matching your current filters.",
                variant: "warning"
            });
            return;
        }

        const headers = ["Sr No", "Date", "Type", "Ref", "Invoice", "Payment", "Remark", "Finance Head", "Status"];
        const rows = filteredAndSortedData.map((tx, idx) => [
            idx + 1,
            format(new Date(tx.date), "dd MMM yy"),
            tx.type,
            tx.ref,
            tx.invoiceAmount,
            tx.paymentAmount,
            tx.remark.replace(/,/g, ";"),
            tx.head,
            tx.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Ledger_${beneficiaryName.replace(/\s+/g, '_')}_${format(new Date(), "ddMMyy")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const paginatedData = filteredAndSortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-white/10"
                    >
                        <ArrowLeft className="h-5 w-5 text-white" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            Ledger - {beneficiaryName}
                        </h1>
                        <p className="text-gray-400 text-sm mt-0.5">Detailed transaction history</p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                    <div className="flex flex-wrap items-center justify-end gap-2 w-full">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            className="h-9 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 gap-2 px-4 shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export</span>
                        </Button>

                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search transactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:ring-blue-500/20"
                            />
                        </div>

                        <Select value={timeFrame} onValueChange={(val) => {
                            setTimeFrame(val);
                            setCurrentPage(1);
                        }}>
                            <SelectTrigger className="w-[140px] h-9 rounded-xl border-white/10 bg-white/5 text-white text-xs">
                                <CalendarIcon className="w-3.5 h-3.5 mr-2 opacity-50" />
                                <SelectValue placeholder="Time Frame" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a2e] border-white/10 text-white rounded-xl">
                                {TIME_FRAME_PRESETS.map(preset => (
                                    <SelectItem key={preset.key} value={preset.key} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-lg text-xs">
                                        {preset.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {timeFrame === 'custom' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center gap-1.5">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-[110px] h-9 gap-2 justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl px-3",
                                                !customStartDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                            <span className="truncate text-[10px]">{customStartDate ? format(customStartDate, "dd MMM yy") : "Start"}</span>
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
                                            disabled={(date) => isAfter(date, new Date())}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <span className="text-gray-500 text-[10px] font-medium uppercase tracking-tighter">to</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-[110px] h-9 gap-2 justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl px-3",
                                                !customEndDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                            <span className="truncate text-[10px]">{customEndDate ? format(customEndDate, "dd MMM yy") : "End"}</span>
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
                                            disabled={(date) => isAfter(date, new Date())}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            {dateError && (
                                <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-400/10 px-2 py-1 rounded-lg border border-red-400/20">
                                    <AlertCircle className="w-3 h-3" />
                                    {dateError}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Table Section */}
            <Card className="glass-card overflow-hidden border-white/5 rounded-3xl">
                <CardContent className="p-0">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="border-b border-white/5 text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider bg-white/5">
                                    <td className="py-4 pl-6 w-16">Sr No</td>
                                    <td className="py-4 px-4 w-40 cursor-pointer select-none hover:text-white transition-colors" onClick={() => handleSort('date')}>
                                        <span className="inline-flex items-center">
                                            Date
                                            <SortIcon column="date" sortColumn={sortColumn} sortDirection={sortDirection} />
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 w-48 cursor-pointer select-none hover:text-white transition-colors" onClick={() => handleSort('type')}>
                                        <span className="inline-flex items-center">
                                            Type
                                            <SortIcon column="type" sortColumn={sortColumn} sortDirection={sortDirection} />
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 cursor-pointer select-none hover:text-white transition-colors" onClick={() => handleSort('invoiceAmount')}>
                                        <span className="inline-flex items-center">
                                            Invoice
                                            <SortIcon column="invoiceAmount" sortColumn={sortColumn} sortDirection={sortDirection} />
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 cursor-pointer select-none hover:text-white transition-colors" onClick={() => handleSort('paymentAmount')}>
                                        <span className="inline-flex items-center">
                                            Payment
                                            <SortIcon column="paymentAmount" sortColumn={sortColumn} sortDirection={sortDirection} />
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 cursor-pointer select-none hover:text-white transition-colors" onClick={() => handleSort('remark')}>
                                        <span className="inline-flex items-center">
                                            Remark
                                            <SortIcon column="remark" sortColumn={sortColumn} sortDirection={sortDirection} />
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 cursor-pointer select-none hover:text-white transition-colors" onClick={() => handleSort('head')}>
                                        <span className="inline-flex items-center">
                                            Finance Head
                                            <SortIcon column="head" sortColumn={sortColumn} sortDirection={sortDirection} />
                                        </span>
                                    </td>
                                    <td className="py-4 pr-6 text-right cursor-pointer select-none hover:text-white transition-colors" onClick={() => handleSort('status')}>
                                        <span className="inline-flex items-center justify-end w-full">
                                            Status
                                            <SortIcon column="status" sortColumn={sortColumn} sortDirection={sortDirection} />
                                        </span>
                                    </td>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {paginatedData.length > 0 ? (
                                    paginatedData.map((tx, idx) => (
                                        <tr
                                            key={tx.id}
                                            className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                                            onClick={() => handleRowClick(tx)}
                                        >
                                            <td className="py-4 pl-6 text-gray-500 font-mono">
                                                {String((currentPage - 1) * pageSize + idx + 1).padStart(2, "0")}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col">
                                                    {(() => {
                                                        const { date, time } = formatDate(tx.date);
                                                        return (
                                                            <>
                                                                <span className="text-white font-medium">
                                                                    {date}
                                                                </span>
                                                                <span className="text-gray-500 text-[10px] italic mt-0.5">
                                                                    {time}
                                                                </span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${tx.rawType === 'Invoice'
                                                        ? 'bg-blue-500/20 text-blue-300'
                                                        : tx.rawType === 'cash'
                                                            ? 'bg-green-500/20 text-green-300'
                                                            : 'bg-pink-500/20 text-pink-300'
                                                        }`}>
                                                        {tx.type}
                                                    </span>
                                                    <span className="text-gray-300 text-xs font-mono font-medium">{tx.ref}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-white font-bold">
                                                {tx.invoiceAmount > 0 ? `₹${tx.invoiceAmount.toLocaleString('en-IN')}` : '-'}
                                            </td>
                                            <td className="py-4 px-4 text-red-400 font-bold">
                                                {tx.paymentAmount > 0 ? `₹${tx.paymentAmount.toLocaleString('en-IN')}` : '-'}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="max-w-[200px]">
                                                    <span className="text-gray-400 text-xs line-clamp-2">{tx.remark}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center">
                                                    <span className="text-gray-400 text-xs truncate">{tx.head}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-6 text-right">
                                                <StatusBadge status={tx.status} />
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="py-20 text-center text-gray-500">
                                            No records found for this beneficiary.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 sm:p-6 border-t border-white/5 flex justify-between items-center bg-white/5">
                        <p className="text-xs text-gray-400">
                            Showing {paginatedData.length} of {transactions.length} records
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

export default BeneficiaryIndividualLedger;
