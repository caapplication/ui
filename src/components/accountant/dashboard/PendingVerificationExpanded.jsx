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
    Calendar as CalendarIcon,
    AlertCircle
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
    listTeamMembers,
    listAllEntities,
    getCATeamInvoicesBulk,
    getCATeamVouchersBulk
} from '@/lib/api';
import { format, formatDistanceToNow, isWithinInterval, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, startOfYear, differenceInDays, isAfter } from 'date-fns';

const TIME_FRAME_PRESETS = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: 'last_7_days' },
    { label: 'Last 30 Days', value: 'last_30_days' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Last 3 Months', value: 'last_3_months' },
    { label: 'Last 6 Months', value: 'last_6_months' },
    { label: 'This Year', value: 'this_year' },
    { label: 'Custom Range', value: 'custom' },
];

const getDateRange = (preset, start, end) => {
    const now = new Date();
    switch (preset) {
        case 'today':
            return { start: startOfDay(now), end: endOfDay(now) };
        case 'yesterday': {
            const yesterday = subDays(now, 1);
            return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
        }
        case 'last_7_days':
            return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
        case 'last_30_days':
            return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
        case 'this_month':
            return { start: startOfMonth(now), end: endOfDay(now) };
        case 'last_month': {
            const lastMonth = subMonths(now, 1);
            return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
        }
        case 'last_3_months':
            return { start: startOfDay(subMonths(now, 3)), end: endOfDay(now) };
        case 'last_6_months':
            return { start: startOfDay(subMonths(now, 6)), end: endOfDay(now) };
        case 'this_year':
            return { start: startOfYear(now), end: endOfDay(now) };
        case 'custom':
            return {
                start: start ? startOfDay(start) : null,
                end: end ? endOfDay(end) : null
            };
        default:
            return { start: null, end: null };
    }
};

const PendingVerificationExpanded = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [timeFrame, setTimeFrame] = useState('last_30_days');
    const [customStartDate, setCustomStartDate] = useState(null);
    const [customEndDate, setCustomEndDate] = useState(null);
    const [dateError, setDateError] = useState('');
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

        const headers = ["Sr No", "Entity", "Total", "Vouchers", "Invoices", "Due Since", "Team Members"];
        const rows = filteredData.map((row, idx) => [
            String(idx + 1).padStart(2, '0'),
            row.entity.replace(/,/g, ";"),
            row.total,
            row.vouchers,
            row.invoices,
            formatDistanceToNow(row.dueSince) + " ago",
            row.teamMembers.replace(/,/g, ";")
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

            const [teamMembers, entities] = await Promise.all([
                listTeamMembers(token).catch(() => []),
                listAllEntities(token).catch(() => [])
            ]);

            const entityIds = entities.map(e => e.id);

            const [invoices, vouchers] = await Promise.all([
                entityIds.length > 0 ? getCATeamInvoicesBulk(entityIds, token).catch(() => []) : Promise.resolve([]),
                entityIds.length > 0 ? getCATeamVouchersBulk(entityIds, token).catch(() => []) : Promise.resolve([])
            ]);

            const teamMap = teamMembers.reduce((acc, t) => ({ ...acc, [t.user_id || t.id]: t.full_name || t.name || '-' }), {});

            // Filter for Pending Approval (pending_ca_approval or pending_master_admin_approval) and timeFrame
            const { start, end } = getDateRange(timeFrame, customStartDate, customEndDate);

            const isWithinRange = (dateStr) => {
                if (!start || !end) return true;
                const d = new Date(dateStr);
                return d >= start && d <= end;
            };

            const pendingInvoices = invoices.filter(i =>
                (i.status === 'pending_ca_approval' || i.status === 'pending_master_admin_approval') &&
                isWithinRange(i.created_at || i.timestamp)
            );
            const pendingVouchers = vouchers.filter(v =>
                (v.status === 'pending_ca_approval' || v.status === 'pending_master_admin_approval') &&
                isWithinRange(v.created_date || v.created_at || v.timestamp)
            );

            // Aggregate by Entity
            const entityStats = entities.map(entity => {
                const eId = entity.id;
                const eName = entity.name;

                const entityInvoices = pendingInvoices.filter(i => (i.entity_id || i.entity) === eId);
                const entityVouchers = pendingVouchers.filter(v => (v.entity_id || v.entity) === eId);

                if (entityInvoices.length === 0 && entityVouchers.length === 0) return null;

                // Find oldest item for "Due Since"
                const allPending = [...entityInvoices, ...entityVouchers];
                const oldestDate = allPending.reduce((oldest, current) => {
                    const currentDate = new Date(current.created_at || current.timestamp || current.created_date);
                    return currentDate < oldest ? currentDate : oldest;
                }, new Date());

                // Find associated team members
                const creatorIds = [...new Set(allPending.map(item => item.created_by))];
                const associatedTeam = creatorIds.map(id => teamMap[id] || '-').join(', ');

                return {
                    id: eId,
                    entity: eName,
                    invoices: entityInvoices.length,
                    vouchers: entityVouchers.length,
                    total: entityInvoices.length + entityVouchers.length,
                    dueSince: oldestDate,
                    teamMembers: associatedTeam
                };
            }).filter(e => e !== null);

            setData(entityStats);
        } catch (error) {
            console.error('Error fetching pending verification:', error);
        } finally {
            setLoading(false);
        }
    }, [user, timeFrame, customStartDate, customEndDate]);

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
                        if (val === 'custom' && !customStartDate) {
                            const end = new Date();
                            const start = new Date();
                            start.setMonth(start.getMonth() - 1);
                            setCustomStartDate(start);
                            setCustomEndDate(end);
                        }
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
                                <TableHead className="py-4 pr-6 text-gray-400">Team Members</TableHead>
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
                                                <span className="bg-rose-500/10 text-rose-400 py-1 px-3 rounded-full text-[10px] font-bold border border-rose-500/20">
                                                    {formatDistanceToNow(row.dueSince)} ago
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-4 pr-6 text-gray-400 text-xs italic max-w-[200px] truncate">
                                                {row.teamMembers}
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
                                        <TableCell colSpan={2} className="py-4 pr-6" />
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
