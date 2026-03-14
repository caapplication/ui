import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    Search,
    Clock,
    FileText,
    Receipt,
    Users,
    Loader2,
    Download,
    ArrowLeft
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CardFooter } from '@/components/ui/card';

import {
    getInvoiceAnalytics,
    getVoucherAnalytics
} from '@/lib/api';

import { formatDistanceToNow, differenceInDays, subDays } from 'date-fns';
import AnimatedSearch from '../../ui/AnimatedSearch';
import { DateRangePicker } from '@/components/ui/date-range-picker';



const TIME_FRAME_PRESETS = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 days', value: 'last_7_days' },
    { label: 'Last 30 days', value: 'last_30_days' },
    { label: 'This month', value: 'this_month' },
    { label: 'Last month', value: 'last_month' },
    { label: 'Last 3 month', value: 'last_3_months' },
    { label: 'Last 6 month', value: 'last_6_months' },
    { label: 'Last year', value: 'last_year' },
    { label: 'Custom', value: 'custom' },
];



const PendingVerificationExpanded = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [timeFrame, setTimeFrame] = useState('last_30_days');
    const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const { toast } = useToast();

    const handleExport = () => {
        if (filteredData.length === 0) {
            toast({
                title: "No data",
                description: "There is no data to export.",
                variant: "destructive",
            });
            return;
        }

        const headers = ["Sr No", "Entity", "Total", "Vouchers", "Invoices", "Due Since"];
        const rows = filteredData.map((row, idx) => [
            String(idx + 1).padStart(2, '0'),
            row.entity.replace(/,/g, ";"),
            row.total,
            row.vouchers,
            row.invoices,
            row.dueSince ? formatDistanceToNow(new Date(row.dueSince)) + " ago" : '-'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Pending_Verification_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchData = useCallback(async () => {
        if (!user?.access_token) return;
        setLoading(true);
        try {
            const token = user.access_token;

            let days = 30;
            if (timeFrame === 'custom') {
                days = dateRange?.from ? differenceInDays(new Date(), dateRange.from) || 1 : 30;
            } else {
                switch (timeFrame) {
                    case 'today': days = 1; break;
                    case 'yesterday': days = 2; break;
                    case 'last_7_days': days = 7; break;
                    case 'last_30_days': days = 30; break;
                    case 'this_month': days = new Date().getDate(); break;
                    case 'last_month': days = new Date().getDate() + 30; break;
                    case 'last_3_months': days = 90; break;
                    case 'last_6_months': days = 180; break;
                    case 'last_year': days = 365; break;
                    default: days = 30; break;
                }
            }

            const [invoiceData, voucherData] = await Promise.all([
                getInvoiceAnalytics(days, token).catch(() => ({ pending_stats: [] })),
                getVoucherAnalytics(days, token).catch(() => ({ pending_stats: [] }))
            ]);

            // Merge invoice and voucher pending_stats by entity_id
            const entityMap = {};

            (invoiceData.pending_stats || []).forEach(item => {
                const key = item.entity_id;
                if (!entityMap[key]) {
                    entityMap[key] = {
                        id: key,
                        entity: item.entity_name || `Entity ${key}`,
                        invoices: 0,
                        vouchers: 0,
                        total: 0,
                        dueSince: item.oldest_pending_date || null
                    };
                }
                entityMap[key].invoices += item.count;
                entityMap[key].total += item.count;
                // Keep oldest date
                if (item.oldest_pending_date && (!entityMap[key].dueSince || item.oldest_pending_date < entityMap[key].dueSince)) {
                    entityMap[key].dueSince = item.oldest_pending_date;
                }
            });

            (voucherData.pending_stats || []).forEach(item => {
                const key = item.entity_id;
                if (!entityMap[key]) {
                    entityMap[key] = {
                        id: key,
                        entity: item.entity_name || `Entity ${key}`,
                        invoices: 0,
                        vouchers: 0,
                        total: 0,
                        dueSince: item.oldest_pending_date || null
                    };
                }
                entityMap[key].vouchers += item.count;
                entityMap[key].total += item.count;
                if (item.oldest_pending_date && (!entityMap[key].dueSince || item.oldest_pending_date < entityMap[key].dueSince)) {
                    entityMap[key].dueSince = item.oldest_pending_date;
                }
            });

            // Filter out entities with 0 total and sort by total desc
            const result = Object.values(entityMap)
                .filter(e => e.total > 0)
                .sort((a, b) => b.total - a.total);

            setData(result);
        } catch (error) {
            console.error('Error fetching pending verification:', error);
        } finally {
            setLoading(false);
        }
    }, [user, timeFrame, dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredData = useMemo(() => {
        return data.filter(item =>
            item.entity.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totals = useMemo(() => {
        return filteredData.reduce((acc, curr) => ({
            total: acc.total + curr.total,
            vouchers: acc.vouchers + curr.vouchers,
            invoices: acc.invoices + curr.invoices
        }), { total: 0, vouchers: 0, invoices: 0 });
    }, [filteredData]);


    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
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
                            Pending Verification
                        </h1>
                        <p className="text-gray-400 text-sm mt-0.5">Entity-wise pending items</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <Button
                        onClick={handleExport}
                        className="h-9 rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 gap-2 px-4 shadow-sm w-full sm:w-auto justify-center"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                    </Button>

                    <Select value={timeFrame} onValueChange={(val) => {
                        setTimeFrame(val);
                        setCurrentPage(1);
                    }}>
                        <SelectTrigger className="glass-input max-w-[170px]">
                            <SelectValue placeholder="Time frame" />
                        </SelectTrigger>
                        <SelectContent className="">
                            {TIME_FRAME_PRESETS.map(preset => (
                                <SelectItem key={preset.value} value={preset.value} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-lg">
                                    {preset.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {timeFrame === 'custom' && (
                        <div className="w-full sm:w-auto">
                            <DateRangePicker
                                dateRange={dateRange}
                                onChange={setDateRange}
                                className="w-full sm:w-[280px] glass-input h-9 rounded-full !p-0"
                            />
                        </div>
                    )}  

                    <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
    <AnimatedSearch
        placeholder="Search by entity..."
        value={searchTerm}
        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
    />
</div>
                </div>
            </div>

            <div className="glass-card rounded-3xl overflow-hidden border border-white/5 flex flex-col">
                <div className="overflow-x-auto">
                    <Table className="min-w-full">
                        <TableHeader className="sticky top-0 z-20 ">
                            <TableRow className="border-b border-white/10 text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider bg-white/5">
                                <TableHead className="py-4 pl-6 w-16 text-gray-400">Sr no.</TableHead>
                                <TableHead className="py-4 px-4 text-gray-400">Entity</TableHead>
                                <TableHead className="py-4 px-4 text-right text-gray-400">Total</TableHead>
                                <TableHead className="py-4 px-4 text-right text-gray-400">Vouchers</TableHead>
                                <TableHead className="py-4 px-4 text-right text-gray-400">Invoices</TableHead>
                                <TableHead className="py-4 px-4 text-center text-gray-400">Due Since</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        Loading items...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedData.length > 0 ? (
                                <>
                                    {paginatedData.map((row, idx) => (
                                        <TableRow key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer">
                                            <TableCell className="py-4 pl-6 text-gray-500 font-mono text-xs">
                                                {String((currentPage - 1) * itemsPerPage + idx + 1).padStart(2, '0')}
                                            </TableCell>
                                            <TableCell className="py-4 px-4 font-semibold text-white">
                                                {row.entity}
                                            </TableCell>
                                            <TableCell className="py-4 px-4 text-right font-bold text-white text-base">
                                                {row.total}
                                            </TableCell>
                                            <TableCell className="py-4 px-4 text-right text-emerald-400 font-semibold">
                                                {row.vouchers}
                                            </TableCell>
                                            <TableCell className="py-4 px-4 text-right text-rose-400 font-semibold">
                                                {row.invoices}
                                            </TableCell>
                                            <TableCell className="py-4 px-4 text-center">
                                                {row.dueSince ? (
                                                    <span className="bg-rose-500/10 text-rose-400 py-1 px-3 rounded-full text-[10px] font-bold border border-rose-500/20">
                                                        {formatDistanceToNow(new Date(row.dueSince))} ago
                                                    </span>
                                                ) : <span className="text-gray-500">-</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-white/5 border-t border-white/10 font-bold text-white">
                                        <TableCell colSpan={2} className="py-4 pl-6 text-white font-bold uppercase text-xs tracking-wider">
                                            Aggregate Sum
                                        </TableCell>
                                        <TableCell className="py-4 px-4 text-right text-white font-black text-lg">{totals.total}</TableCell>
                                        <TableCell className="py-4 px-4 text-right text-emerald-400 font-bold">{totals.vouchers}</TableCell>
                                        <TableCell className="py-4 px-4 text-right text-rose-400 font-bold">{totals.invoices}</TableCell>
                                        <TableCell className="py-4 pr-6" />
                                    </TableRow>
                                </>
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        No items pending verification.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-6 p-4 sm:p-6 border-t border-white/10 mt-6">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400 font-medium">Page {currentPage} of {totalPages > 0 ? totalPages : 1}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 hidden sm:inline">Rows per page:</span>
                        <Select value={String(itemsPerPage)} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
                            <SelectTrigger className="h-8 w-[70px] bg-transparent border-white/10 text-white text-xs">
                                <SelectValue placeholder={String(itemsPerPage)} />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-white/10 text-white">
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/10 bg-transparent hover:bg-white/10 text-white">
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/10 bg-transparent hover:bg-white/10 text-white">
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </CardFooter>
        </div>
    );
};

export default PendingVerificationExpanded;
