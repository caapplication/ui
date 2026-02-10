import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    Search,
    Clock,
    Users,
    Bell,
    Loader2,
    Download,
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
import { listTeamMembers, listAllEntities, getNotices } from '@/lib/api';
import {
    differenceInDays,
    startOfDay,
    endOfDay,
    subDays,
    startOfMonth,
    endOfMonth,
    subMonths,
    startOfYear
} from 'date-fns';

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
    { label: 'All Time', value: 'all' },
];

const getDateRange = (preset) => {
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
        default:
            return { start: null, end: null };
    }
};

const OngoingNoticesExpanded = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [timeFrame, setTimeFrame] = useState('all');
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

        const headers = ["Sr No", "Entity", "Total Notices", "Avg Processing Time (Days)", "Primary Handler"];
        const rows = filteredData.map((row, idx) => [
            String(idx + 1).padStart(2, '0'),
            row.entity.replace(/,/g, ";"),
            row.total,
            row.avgTime,
            row.teamMember.replace(/,/g, ";")
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Ongoing_Notices_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchData = useCallback(async () => {
        if (!user?.access_token) return;
        setLoading(true);
        try {
            const token = user.access_token;
            const today = startOfDay(new Date());

            const [teamMembers, entities, notices] = await Promise.all([
                listTeamMembers(token).catch(() => []),
                listAllEntities(token).catch(() => []),
                getNotices(null, token).catch(() => [])
            ]);

            const teamMap = teamMembers.reduce((acc, t) => ({ ...acc, [t.user_id || t.id]: t.full_name || t.name || 'Unknown' }), {});

            const activeNotices = notices.filter(n => n.status !== 'closed');

            const { start, end } = getDateRange(timeFrame);
            const isWithinRange = (dateStr) => {
                if (!dateStr) return false;
                if (!start || !end) return true;
                const d = new Date(dateStr);
                return d >= start && d <= end;
            };

            const filteredNotices = activeNotices.filter(n => isWithinRange(n.created_at || n.created_date));

            // Aggregate by Entity
            const entityStats = entities.map(entity => {
                const eId = entity.id;
                const eName = entity.name;

                const entityNotices = filteredNotices.filter(n => (n.entity_id || n.entity) === eId);
                if (entityNotices.length === 0) return null;

                // Calculate Average Processing Time (Days since creation)
                const totalDays = entityNotices.reduce((sum, notice) => {
                    const createdAt = new Date(notice.created_at || notice.created_date);
                    return sum + Math.max(0, differenceInDays(today, startOfDay(createdAt)));
                }, 0);
                const avgDays = Math.round(totalDays / entityNotices.length);

                // Find primary team member (most notices created)
                const counts = entityNotices.reduce((acc, n) => {
                    acc[n.created_by] = (acc[n.created_by] || 0) + 1;
                    return acc;
                }, {});
                const primaryId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 0);
                const primaryMember = teamMap[primaryId] || 'Unknown';

                return {
                    id: eId,
                    entity: eName,
                    total: entityNotices.length,
                    avgTime: avgDays,
                    teamMember: primaryMember
                };
            }).filter(e => e !== null);

            setData(entityStats);
        } catch (error) {
            console.error('Error fetching ongoing notices:', error);
        } finally {
            setLoading(false);
        }
    }, [user, timeFrame]);

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

    const totalNotices = useMemo(() => {
        return filteredData.reduce((sum, curr) => sum + curr.total, 0);
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
                            Ongoing Notices
                        </h1>
                        <p className="text-gray-400 text-sm mt-0.5">Notice processing summary</p>
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
                        <TableHeader className="sticky top-0 z-20 ">
                            <TableRow className="border-b border-white/10 text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider bg-white/5">
                                <TableHead className="py-4 pl-6 w-16 text-gray-400">Sr no.</TableHead>
                                <TableHead className="py-4 px-4 text-gray-400">Entity</TableHead>
                                <TableHead className="py-4 px-4 text-center text-gray-400">Total Notices</TableHead>
                                <TableHead className="py-4 px-4 text-center text-gray-400">Avg Processing Time</TableHead>
                                <TableHead className="py-4 pr-6 text-right text-gray-400">Primary Handler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        Loading notices...
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
                                            <TableCell className="py-4 px-4 text-center">
                                                <span className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 font-bold inline-flex items-center justify-center border border-amber-500/20 shadow-sm">
                                                    {row.total}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-4 px-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-base font-bold text-white">{row.avgTime}</span>
                                                    <span className="text-[9px] text-gray-500 uppercase tracking-tighter">Days Open</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 pr-6 text-right text-white font-medium italic">
                                                {row.teamMember}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-white/5 border-t border-white/10 font-bold text-white">
                                        <TableCell colSpan={2} className="py-4 pl-6 text-white font-bold uppercase text-xs tracking-wider">
                                            Aggregate Notice Sum
                                        </TableCell>
                                        <TableCell className="py-4 px-4 text-center text-white font-black text-xl">{totalNotices}</TableCell>
                                        <TableCell colSpan={2} className="py-4 pr-6" />
                                    </TableRow>
                                </>
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        No active notices found for this period.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <Bell className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-none mb-1">Active Notices</p>
                        <p className="text-sm font-bold text-white leading-tight">{totalNotices} Pending Resolution</p>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
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
                )}
            </div>
        </div>
    );
};

export default OngoingNoticesExpanded;

