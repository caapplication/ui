import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    Search,
    Bell,
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
import { getNoticeDashboardAnalytics } from '@/lib/api';
import AnimatedSearch from '@/components/ui/AnimatedSearch';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { differenceInDays, subDays } from 'date-fns';

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

const OngoingNoticesExpanded = () => {
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

        const headers = ["Sr No", "Entity", "Total Notices"];
        const rows = filteredData.map((row, idx) => [
            String(idx + 1).padStart(2, '0'),
            row.entity.replace(/,/g, ";"),
            row.total,
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

            const analytics = await getNoticeDashboardAnalytics(days, token)
                .catch(() => ({ ongoing_stats: [] }));

            // Map API response — filter out General / No Entity (entity_id === null)
            const result = (analytics.ongoing_stats || [])
                .filter(item => item.entity_id !== null && item.entity_id !== undefined)
                .map(item => ({
                    id: item.entity_id,
                    entity: item.entity_name || `Entity ${item.entity_id}`,
                    total: item.count || 0,
                }));

            setData(result);
        } catch (error) {
            console.error('Error fetching ongoing notices:', error);
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
                        <ArrowLeft className="h-5 w-5 text-white" />
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
                        <TableHeader className="sticky top-0 z-20">
                            <TableRow className="border-b border-white/10 text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider bg-white/5">
                                <TableHead className="py-4 pl-6 w-16 text-gray-400">Sr no.</TableHead>
                                <TableHead className="py-4 px-4 text-gray-400">Entity</TableHead>
                                <TableHead className="py-4 px-4 text-center text-gray-400">Total Notices</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-gray-400">
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
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-white/5 border-t border-white/10 font-bold text-white">
                                        <TableCell colSpan={2} className="py-4 pl-6 text-white font-bold uppercase text-xs tracking-wider">
                                            Aggregate Notice Sum
                                        </TableCell>
                                        <TableCell className="py-4 px-4 text-center text-white font-black text-xl">{totalNotices}</TableCell>
                                    </TableRow>
                                </>
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
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
        </div>
    );
};

export default OngoingNoticesExpanded;
