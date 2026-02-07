import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Search,
    AlertCircle,
    CalendarDays,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { listAllEntities, listTasks } from '@/lib/api';
import {
    differenceInCalendarDays,
    startOfDay,
    isPast,
    isToday as isTodayFn,
    isTomorrow as isTomorrowFn
} from 'date-fns';

const OngoingTasksExpanded = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchData = useCallback(async () => {
        if (!user?.access_token) return;
        setLoading(true);
        try {
            const token = user.access_token;
            const agencyId = user.agency_id;
            const today = startOfDay(new Date());

            const [entities, tasksResponse] = await Promise.all([
                listAllEntities(token).catch(() => []),
                listTasks(agencyId, token).catch(() => ({ items: [] }))
            ]);

            const tasks = tasksResponse.items || [];
            const openTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'CANCELLED');

            // Aggregate by Entity
            const entityStats = entities.map(entity => {
                const eId = entity.id;
                const eName = entity.name;

                const entityTasks = openTasks.filter(t => (t.entity_id || t.entity) === eId);
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
    }, [user]);

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
        <div className="p-4 md:p-8 text-white relative overflow-hidden h-full flex flex-col pt-20 lg:pt-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="h-10 w-10 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-2xl sm:text-3xl font-bold">
                        Ongoing Tasks
                    </h1>
                </div>
            </div>

            <div className="glass-pane rounded-lg flex-grow flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-black/10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-semibold text-gray-200">
                                Task Aging Analysis
                            </h2>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search by entity..."
                                    className="pl-10 glass-input border-white/10 bg-black/20 text-white placeholder:text-gray-500 focus:ring-blue-500/50"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-auto relative min-h-0 bg-black/5 text-[11px] sm:text-sm">
                    <Table className="min-w-full">
                        <TableHeader className="sticky top-0 z-10 border-b border-white/10 bg-black/40 backdrop-blur-md">
                            <TableRow className="border-white/10 hover:bg-white/5 uppercase text-[10px] tracking-widest text-gray-300">
                                <TableHead className="w-[100px] font-bold">Sr no.</TableHead>
                                <TableHead className="min-w-[150px] font-bold">Entity</TableHead>
                                <TableHead className="text-right font-bold">Total</TableHead>
                                <TableHead className="text-right text-rose-400 font-bold">Overdue</TableHead>
                                <TableHead className="text-right text-amber-400 font-bold">Today</TableHead>
                                <TableHead className="text-right text-sky-400 font-bold">Tomorrow</TableHead>
                                <TableHead className="text-right text-indigo-400 font-bold">{'< 5 Days'}</TableHead>
                                <TableHead className="text-right text-violet-400 font-bold">{'< 7 Days'}</TableHead>
                                <TableHead className="text-right text-zinc-400 font-bold">{'> 10 Days'}</TableHead>
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
                                        <TableRow key={row.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                            <TableCell className="text-gray-500 font-mono text-[10px]">
                                                {String((currentPage - 1) * itemsPerPage + idx + 1).padStart(2, '0')}
                                            </TableCell>
                                            <TableCell className="font-semibold text-white whitespace-nowrap">{row.entity}</TableCell>
                                            <TableCell className="text-right font-black text-white">{row.total}</TableCell>
                                            <TableCell className={`text-right font-bold ${row.overdue > 0 ? 'text-rose-400' : 'text-gray-600'}`}>{row.overdue}</TableCell>
                                            <TableCell className={`text-right font-bold ${row.dueToday > 0 ? 'text-amber-400' : 'text-gray-600'}`}>{row.dueToday}</TableCell>
                                            <TableCell className={`text-right font-bold ${row.dueTomorrow > 0 ? 'text-sky-400' : 'text-gray-600'}`}>{row.dueTomorrow}</TableCell>
                                            <TableCell className={`text-right font-bold ${row.dueLt5 > 0 ? 'text-indigo-400' : 'text-gray-600'}`}>{row.dueLt5}</TableCell>
                                            <TableCell className={`text-right font-bold ${row.dueLt7 > 0 ? 'text-violet-400' : 'text-gray-600'}`}>{row.dueLt7}</TableCell>
                                            <TableCell className={`text-right font-bold ${row.dueGt10 > 0 ? 'text-zinc-400' : 'text-gray-600'}`}>{row.dueGt10}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-white/10 border-t-2 border-white/20 sticky bottom-0 z-10 backdrop-blur-md text-[10px] sm:text-xs">
                                        <TableCell colSpan={2} className="text-white font-bold text-xs p-4 uppercase tracking-wider">AGGREGATE SUM</TableCell>
                                        <TableCell className="text-right text-white font-black text-lg">{totals.total}</TableCell>
                                        <TableCell className="text-right text-rose-400 font-bold">{totals.overdue}</TableCell>
                                        <TableCell className="text-right text-amber-400 font-bold">{totals.dueToday}</TableCell>
                                        <TableCell className="text-right text-sky-400 font-bold">{totals.dueTomorrow}</TableCell>
                                        <TableCell className="text-right text-indigo-400 font-bold">{totals.dueLt5}</TableCell>
                                        <TableCell className="text-right text-violet-400 font-bold">{totals.dueLt7}</TableCell>
                                        <TableCell className="text-right text-zinc-400 font-bold">{totals.dueGt10}</TableCell>
                                    </TableRow>
                                </>
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                                        No ongoing tasks found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-6 bg-black/20 p-3 rounded-lg border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-lg border border-white/10 w-full md:w-auto">
                    <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-widest">Critical Focus</p>
                        <p className="text-sm font-bold text-white whitespace-nowrap">{totals.overdue + totals.dueToday} Tasks Overdue/Today</p>
                    </div>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-2 self-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="glass-input border-white/10 bg-black/20 disabled:opacity-50 h-9"
                        >
                            Previous
                        </Button>
                        <div className="glass-input border-white/10 bg-black/20 px-3 py-1.5 rounded-lg text-sm font-medium">
                            {currentPage} / {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="glass-input border-white/10 bg-black/20 disabled:opacity-50 h-9"
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OngoingTasksExpanded;
