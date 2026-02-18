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
    Download
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

import {
    getInvoiceAnalytics,
    getVoucherAnalytics
} from '@/lib/api';

import { formatDistanceToNow } from 'date-fns';


const TIME_FRAME_PRESETS = [
    { label: 'Last 7 Days', value: 7 },
    { label: 'Last 15 Days', value: 15 },
    { label: 'Last 30 Days', value: 30 },
    { label: 'Last 60 Days', value: 60 },
    { label: 'Last 90 Days', value: 90 },
];



const PendingVerificationExpanded = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [timeFrame, setTimeFrame] = useState(30);
    const itemsPerPage = 10;
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

            const [invoiceData, voucherData] = await Promise.all([
                getInvoiceAnalytics(timeFrame, token).catch(() => ({ pending_stats: [] })),
                getVoucherAnalytics(timeFrame, token).catch(() => ({ pending_stats: [] }))
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
    }, [user, timeFrame]);


    useEffect(() => {
        fetchData();
    }, [fetchData, timeFrame]);

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
                        <ChevronLeft className="h-5 w-5 text-white" />
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
                        className="h-9 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 gap-2 px-4 shadow-sm w-full sm:w-auto justify-center"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                    </Button>

                    <Select value={timeFrame} onValueChange={(val) => {
                        setTimeFrame(val);
                        setCurrentPage(1);
                    }}>
                        <SelectTrigger className="w-full sm:w-44 h-9 border-white/10 bg-white/5 text-white rounded-xl text-sm">
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
                            placeholder="Search by entity..."
                            className="pl-9 h-9 sm:h-10 border-white/10 bg-white/5 focus:bg-white/10 text-white placeholder:text-gray-500 rounded-xl text-sm"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-3xl overflow-hidden border border-white/5 flex flex-col">
                <div className="overflow-x-auto">
                    <Table className="min-w-full">
                        <TableHeader className="sticky top-0 z-20 backdrop-blur-md">
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
        </div>
    );
};

export default PendingVerificationExpanded;
