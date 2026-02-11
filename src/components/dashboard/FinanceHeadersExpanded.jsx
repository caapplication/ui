import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    Search,
    Loader2,
    ArrowLeft,
    TrendingUp,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Download,
    Calendar as CalendarIcon,
    Filter
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, isAfter, differenceInDays } from 'date-fns';
import { getDashboardData } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const FinanceHeadersExpanded = ({ entityId }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortDirection, setSortDirection] = useState('desc'); // desc = highest amount first
    const [sortColumn, setSortColumn] = useState('amount');
    const [timeFrame, setTimeFrame] = useState('last_3_months');
    const [customStartDate, setCustomStartDate] = useState(null);
    const [customEndDate, setCustomEndDate] = useState(null);
    const itemsPerPage = 10;
    const { toast } = useToast();

    const getDateRange = (preset, start, end) => {
        const today = new Date();
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);

        switch (preset) {
            case 'today':
                return { start: startOfToday, end: endOfToday };
            case 'yesterday':
                const yesterday = subDays(today, 1);
                return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
            case 'last_7_days':
                return { start: startOfDay(subDays(today, 7)), end: endOfToday };
            case 'last_30_days':
                return { start: startOfDay(subDays(today, 30)), end: endOfToday };
            case 'this_month':
                return { start: startOfMonth(today), end: endOfMonth(today) };
            case 'last_month':
                const lastMonth = subMonths(today, 1);
                return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
            case 'last_3_months':
                return { start: startOfMonth(subMonths(today, 2)), end: endOfMonth(today) };
            case 'custom':
                return {
                    start: start ? startOfDay(start) : null,
                    end: end ? endOfDay(end) : null
                };
            default:
                return { start: null, end: null };
        }
    };

    const resolvedEntityId = entityId || localStorage.getItem('entityId');

    const fetchData = useCallback(async () => {
        if (!user?.access_token || !resolvedEntityId) return;
        setLoading(true);
        try {
            const { start, end } = getDateRange(timeFrame, customStartDate, customEndDate);
            const fromDateStr = start ? format(start, "yyyy-MM-dd") : null;
            const toDateStr = end ? format(end, "yyyy-MM-dd") : null;

            const dashData = await getDashboardData(
                resolvedEntityId,
                user.access_token,
                user.agency_id,
                fromDateStr,
                toDateStr,
                100 // Fetch more for expansion
            );
            setData(dashData?.top_header_expenses || []);
        } catch (error) {
            console.error('Error fetching finance header data:', error);
        } finally {
            setLoading(false);
        }
    }, [user, resolvedEntityId, timeFrame, customStartDate, customEndDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection(column === 'header_name' ? 'asc' : 'desc');
        }
    };

    const SortIcon = ({ column }) => {
        if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
        return sortDirection === 'asc'
            ? <ArrowUp className="w-3 h-3 ml-1 inline text-blue-400" />
            : <ArrowDown className="w-3 h-3 ml-1 inline text-blue-400" />;
    };

    const filteredData = useMemo(() => {
        let result = data.filter(item => {
            const search = searchTerm.toLowerCase();
            const headerName = (item.header_name || '').toLowerCase();
            const amount = (item.amount || 0).toString();
            return headerName.includes(search) || amount.includes(search);
        });

        result.sort((a, b) => {
            if (sortColumn === 'header_name') {
                const valA = (a.header_name || '').toLowerCase();
                const valB = (b.header_name || '').toLowerCase();
                return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            const valA = parseFloat(a.amount) || 0;
            const valB = parseFloat(b.amount) || 0;
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        });

        return result;
    }, [data, searchTerm, sortColumn, sortDirection]);

    const totalAmount = useMemo(() => {
        return filteredData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    }, [filteredData]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleExport = () => {
        if (filteredData.length === 0) {
            toast({
                title: "No data to export",
                description: "There are no expenses matching your current filters.",
                variant: "warning"
            });
            return;
        }

        const headers = ["Sr No", "Finance Header", "Amount"];
        const rows = filteredData.map((item, idx) => [
            idx + 1,
            item.header_name,
            item.amount
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Finance_Headers_${format(new Date(), "ddMMyy")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/')}
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-white/10 shrink-0"
                    >
                        <ArrowLeft className="h-5 w-5 text-white" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white whitespace-nowrap">Finance Header Expenses</h1>
                        <p className="text-gray-400 text-sm mt-0.5">Top cost drivers by finance header</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <Button
                        onClick={handleExport}
                        className="h-9 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 gap-2 px-4 shadow-sm w-full sm:w-auto justify-center"
                    >
                        <Download className="w-4 h-4" />
                        <span className="inline">Export</span>
                    </Button>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search headers..."
                            className="pl-9 h-9 border-white/10 bg-white/5 focus:bg-white/10 text-white placeholder:text-gray-500 rounded-xl text-sm w-full"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select value={timeFrame} onValueChange={(val) => { setTimeFrame(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[140px] h-9 rounded-xl border-white/10 bg-white/5 text-white text-xs focus:ring-0 focus:ring-offset-0">
                                <CalendarIcon className="w-3.5 h-3.5 mr-2 opacity-50" />
                                <SelectValue placeholder="Time Frame" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white rounded-xl">
                                <SelectItem value="today" className="text-xs cursor-pointer">Today</SelectItem>
                                <SelectItem value="yesterday" className="text-xs cursor-pointer">Yesterday</SelectItem>
                                <SelectItem value="last_7_days" className="text-xs cursor-pointer">Last 7 Days</SelectItem>
                                <SelectItem value="last_30_days" className="text-xs cursor-pointer">Last 30 Days</SelectItem>
                                <SelectItem value="this_month" className="text-xs cursor-pointer">This Month</SelectItem>
                                <SelectItem value="last_month" className="text-xs cursor-pointer">Last Month</SelectItem>
                                <SelectItem value="last_3_months" className="text-xs cursor-pointer">Last 3 Months</SelectItem>
                                <SelectItem value="custom" className="text-xs cursor-pointer">Custom Range</SelectItem>
                            </SelectContent>
                        </Select>

                        {timeFrame === 'custom' && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-[110px] h-9 gap-2 justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl px-3",
                                                !customStartDate && "text-gray-500"
                                            )}
                                        >
                                            <CalendarIcon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                            <span className="truncate text-[10px]">{customStartDate ? format(customStartDate, "dd MMM yy") : "Start"}</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={customStartDate}
                                            onSelect={(date) => {
                                                setCustomStartDate(date);
                                                setCurrentPage(1);
                                            }}
                                            disabled={(date) => isAfter(date, new Date()) || (customEndDate && isAfter(date, customEndDate))}
                                            initialFocus
                                            className="bg-slate-900 text-white"
                                        />
                                    </PopoverContent>
                                </Popover>

                                <span className="text-gray-500 text-[10px] font-medium uppercase tracking-tighter">to</span>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-[110px] h-9 gap-2 justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl px-3",
                                                !customEndDate && "text-gray-500"
                                            )}
                                        >
                                            <CalendarIcon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                            <span className="truncate text-[10px]">{customEndDate ? format(customEndDate, "dd MMM yy") : "End"}</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={customEndDate}
                                            onSelect={(date) => {
                                                if (customStartDate && date) {
                                                    const diff = differenceInDays(date, customStartDate);
                                                    if (diff > 365) {
                                                        toast({
                                                            title: "Range too long",
                                                            description: "Please select a range within 1 year.",
                                                            variant: "destructive"
                                                        });
                                                        return;
                                                    }
                                                }
                                                setCustomEndDate(date);
                                                setCurrentPage(1);
                                            }}
                                            disabled={(date) => isAfter(date, new Date()) || (customStartDate && isAfter(customStartDate, date))}
                                            initialFocus
                                            className="bg-slate-900 text-white"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <Card className="glass-card overflow-hidden border-white/5 rounded-3xl flex flex-col">
                <CardContent className="p-0 flex flex-col">
                    <div className="overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-20 ">
                                <tr className="border-b border-white/10 text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider bg-white/5">
                                    <th className="py-4 pl-6 w-20">S.No</th>
                                    <th
                                        className="py-4 px-4 cursor-pointer select-none hover:text-white transition-colors"
                                        onClick={() => handleSort('header_name')}
                                    >
                                        Finance Header <SortIcon column="header_name" />
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
                                        <td colSpan="3" className="py-12 text-center text-gray-400">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                            Loading...
                                        </td>
                                    </tr>
                                ) : paginatedData.length > 0 ? (
                                    paginatedData.map((item, idx) => (
                                        <tr
                                            key={idx}
                                            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                                            onClick={() => item.header_id && navigate(`/dashboard/finance-headers/${item.header_id}`)}
                                        >
                                            <td className="py-4 pl-6 text-gray-500 font-mono">
                                                {String((currentPage - 1) * itemsPerPage + idx + 1).padStart(2, '0')}
                                            </td>
                                            <td className="py-4 px-4 text-white font-medium">
                                                {item.header_name}
                                            </td>
                                            <td className="py-4 pr-6 text-right text-red-400 font-semibold">
                                                ₹{Math.round(parseFloat(item.amount)).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="py-8 text-center text-gray-500">
                                            No finance header expenses found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {filteredData.length > 0 && (
                                <tfoot>
                                    <tr className="bg-white/5 font-bold text-white border-t border-white/10">
                                        <td colSpan="2" className="py-4 pl-6 text-right pr-4 uppercase tracking-wider text-xs">Total</td>
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

export default FinanceHeadersExpanded;
