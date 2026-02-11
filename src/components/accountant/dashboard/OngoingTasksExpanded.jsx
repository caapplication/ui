import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    Search,
    AlertCircle,
    CalendarDays,
    Loader2,
    Download,
    Calendar as CalendarIcon
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
import { listAllEntities, listTasks } from '@/lib/api';
import {
    differenceInCalendarDays,
    startOfDay,
    endOfDay,
    isPast,
    isToday as isTodayFn,
    isTomorrow as isTomorrowFn,
    subDays,
    startOfMonth,
    endOfMonth,
    subMonths,
    startOfYear,
    differenceInDays,
    isAfter,
    format
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

const OngoingTasksExpanded = () => {
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

        const headers = ["Sr No", "Entity", "Total", "Overdue", "Today", "Tomorrow", "< 5 Days", "< 7 Days", "> 10 Days"];
        const rows = filteredData.map((row, idx) => [
            String(idx + 1).padStart(2, '0'),
            row.entity.replace(/,/g, ";"),
            row.total,
            row.overdue,
            row.dueToday,
            row.dueTomorrow,
            row.dueLt5,
            row.dueLt7,
            row.dueGt10
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Ongoing_Tasks_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchData = useCallback(async () => {
        if (!user?.access_token) return;
        setLoading(true);
        try {
            const token = user.access_token;
            const agencyId = user.agency_id;
            const today = startOfDay(new Date());

            const [entities, tasksRaw] = await Promise.all([
                listAllEntities(token).catch(() => []),
                listTasks(agencyId, token).catch(() => [])
            ]);

            const tasks = Array.isArray(tasksRaw) ? tasksRaw : (tasksRaw?.items || []);
            const openTasks = tasks.filter(t => t.status !== 'completed');

            const { start, end } = getDateRange(timeFrame, customStartDate, customEndDate);
            const isWithinRange = (dateStr) => {
                if (!dateStr) return false;
                if (!start || !end) return true;
                const d = new Date(dateStr);
                return d >= start && d <= end;
            };

            const filteredTasks = openTasks.filter(t => isWithinRange(t.created_at || t.created_date));

            // Aggregate by Entity
            const entityStats = entities.map(entity => {
                const eId = entity.id;
                const eName = entity.name;

                const entityTasks = filteredTasks.filter(t => (t.entity_id || t.client_id || t.entity) === eId);
                if (entityTasks.length === 0) return null;

                const stats = {
                    overdue: 0,
                    dueToday: 0,
                    dueTomorrow: 0,
                    dueLt5: 0,
                    dueLt7: 0,
                    dueGt10: 0
                };

                entityTasks.forEach(task => {
                    if (!task.due_date) return;
                    const dueDate = startOfDay(new Date(task.due_date));
                    const diffDays = differenceInCalendarDays(dueDate, today);

                    if (isPast(dueDate) && !isTodayFn(dueDate)) {
                        stats.overdue++;
                    } else if (isTodayFn(dueDate)) {
                        stats.dueToday++;
                    } else if (isTomorrowFn(dueDate)) {
                        stats.dueTomorrow++;
                    } else if (diffDays > 0 && diffDays < 5) {
                        stats.dueLt5++;
                    } else if (diffDays >= 5 && diffDays < 7) {
                        stats.dueLt7++;
                    } else if (diffDays > 10) {
                        stats.dueGt10++;
                    }
                });

                return {
                    id: eId,
                    entity: eName,
                    total: entityTasks.length,
                    ...stats
                };
            }).filter(e => e !== null);

            setData(entityStats);
        } catch (error) {
            console.error('Error fetching ongoing tasks:', error);
        } finally {
            setLoading(false);
        }
    }, [user, timeFrame, customStartDate, customEndDate]);

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
            overdue: acc.overdue + curr.overdue,
            dueToday: acc.dueToday + curr.dueToday,
            dueTomorrow: acc.dueTomorrow + curr.dueTomorrow,
            dueLt5: acc.dueLt5 + curr.dueLt5,
            dueLt7: acc.dueLt7 + curr.dueLt7,
            dueGt10: acc.dueGt10 + curr.dueGt10
        }), { total: 0, overdue: 0, dueToday: 0, dueTomorrow: 0, dueLt5: 0, dueLt7: 0, dueGt10: 0 });
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
                            Ongoing Tasks
                        </h1>
                        <p className="text-gray-400 text-sm mt-0.5">Task aging analysis</p>
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
                        <TableHeader className="sticky top-0 z-20 ">
                            <TableRow className="border-b border-white/10 text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider bg-white/5">
                                <TableHead className="py-4 pl-6 w-16 text-gray-400">Sr no.</TableHead>
                                <TableHead className="py-4 px-4 text-gray-400">Entity</TableHead>
                                <TableHead className="py-4 px-4 text-right text-gray-400">Total</TableHead>
                                <TableHead className="py-4 px-4 text-right text-rose-400">Overdue</TableHead>
                                <TableHead className="py-4 px-4 text-right text-amber-400">Today</TableHead>
                                <TableHead className="py-4 px-4 text-right text-sky-400">Tomorrow</TableHead>
                                <TableHead className="py-4 px-4 text-right text-indigo-400">{'< 5 Days'}</TableHead>
                                <TableHead className="py-4 px-4 text-right text-violet-400">{'< 7 Days'}</TableHead>
                                <TableHead className="py-4 pr-6 text-right text-zinc-400">{'> 10 Days'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        Loading tasks...
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
                                            <TableCell className="py-4 px-4 text-right font-black text-white text-base">
                                                {row.total}
                                            </TableCell>
                                            <TableCell className={`py-4 px-4 text-right font-bold ${row.overdue > 0 ? 'text-rose-400' : 'text-gray-600'}`}>
                                                {row.overdue}
                                            </TableCell>
                                            <TableCell className={`py-4 px-4 text-right font-bold ${row.dueToday > 0 ? 'text-amber-400' : 'text-gray-600'}`}>
                                                {row.dueToday}
                                            </TableCell>
                                            <TableCell className={`py-4 px-4 text-right font-bold ${row.dueTomorrow > 0 ? 'text-sky-400' : 'text-gray-600'}`}>
                                                {row.dueTomorrow}
                                            </TableCell>
                                            <TableCell className={`py-4 px-4 text-right font-bold ${row.dueLt5 > 0 ? 'text-indigo-400' : 'text-gray-600'}`}>
                                                {row.dueLt5}
                                            </TableCell>
                                            <TableCell className={`py-4 px-4 text-right font-bold ${row.dueLt7 > 0 ? 'text-violet-400' : 'text-gray-600'}`}>
                                                {row.dueLt7}
                                            </TableCell>
                                            <TableCell className={`py-4 pr-6 text-right font-bold ${row.dueGt10 > 0 ? 'text-zinc-400' : 'text-gray-600'}`}>
                                                {row.dueGt10}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-white/5 border-t border-white/10 font-bold text-white">
                                        <TableCell colSpan={2} className="py-4 pl-6 text-white font-bold uppercase text-xs tracking-wider">
                                            Aggregate Sum
                                        </TableCell>
                                        <TableCell className="py-4 px-4 text-right text-white font-black text-lg">{totals.total}</TableCell>
                                        <TableCell className="py-4 px-4 text-right text-rose-400 font-bold">{totals.overdue}</TableCell>
                                        <TableCell className="py-4 px-4 text-right text-amber-400 font-bold">{totals.dueToday}</TableCell>
                                        <TableCell className="py-4 px-4 text-right text-sky-400 font-bold">{totals.dueTomorrow}</TableCell>
                                        <TableCell className="py-4 px-4 text-right text-indigo-400 font-bold">{totals.dueLt5}</TableCell>
                                        <TableCell className="py-4 px-4 text-right text-violet-400 font-bold">{totals.dueLt7}</TableCell>
                                        <TableCell className="py-4 pr-6 text-right text-zinc-400 font-bold">{totals.dueGt10}</TableCell>
                                    </TableRow>
                                </>
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                        No tasks found for this period.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                    <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-none mb-1">Critical Focus</p>
                        <p className="text-sm font-bold text-white whitespace-nowrap">{totals.overdue + totals.dueToday} Tasks Overdue/Today</p>
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

export default OngoingTasksExpanded;

