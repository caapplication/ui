import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Search,
    FileText,
    ClipboardCheck,
    Bell,
    Receipt,
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
import {
    listTeamMembers,
    listAllEntities,
    getCATeamInvoicesBulk,
    getCATeamVouchersBulk,
    listTasks,
    getNotices
} from '@/lib/api';
import { startOfDay } from 'date-fns';

const TodayProgressExpanded = () => {
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

            const [teamMembers, entities] = await Promise.all([
                listTeamMembers(token).catch(() => []),
                listAllEntities(token).catch(() => [])
            ]);

            const entityIds = entities.map(e => e.id);

            const [invoices, vouchers, tasks, notices] = await Promise.all([
                entityIds.length > 0 ? getCATeamInvoicesBulk(entityIds, token).catch(() => []) : Promise.resolve([]),
                entityIds.length > 0 ? getCATeamVouchersBulk(entityIds, token).catch(() => []) : Promise.resolve([]),
                listTasks(agencyId, token).catch(() => []),
                getNotices(null, token).catch(() => [])
            ]);

            const tasksList = Array.isArray(tasks) ? tasks : (tasks?.items || []);
            const noticesList = notices || [];

            const isToday = (dateStr) => {
                if (!dateStr) return false;
                return startOfDay(new Date(dateStr)).getTime() === today.getTime();
            };

            const todayInvoices = invoices.filter(i => isToday(i.created_at || i.created_date));
            const todayVouchers = vouchers.filter(v => isToday(v.created_at || v.timestamp));
            const todayTasks = tasksList.filter(t => isToday(t.created_at || t.created_date));
            const todayNotices = noticesList.filter(n => isToday(n.created_at || n.created_date));

            const memberStats = teamMembers.map(member => {
                const mId = member.user_id || member.id;
                const mName = member.full_name || member.name || 'Unknown';

                const memberInvoices = todayInvoices.filter(i => i.created_by === mId).length;
                const memberVouchers = todayVouchers.filter(v => v.created_by === mId).length;
                const memberTasks = todayTasks.filter(t => t.created_by === mId).length;
                const memberNotices = todayNotices.filter(n => n.created_by === mId).length;

                return {
                    id: mId,
                    name: mName,
                    invoices: memberInvoices,
                    vouchers: memberVouchers,
                    tasks: memberTasks,
                    notices: memberNotices,
                    total: memberInvoices + memberVouchers + memberTasks + memberNotices
                };
            }).filter(m => m.total > 0 || searchTerm === '');

            setData(memberStats);
        } catch (error) {
            console.error('Error fetching today\'s progress:', error);
        } finally {
            setLoading(false);
        }
    }, [user, searchTerm]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredData = useMemo(() => {
        return data.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totals = useMemo(() => {
        return filteredData.reduce((acc, curr) => ({
            total: acc.total + curr.total,
            vouchers: acc.vouchers + curr.vouchers,
            invoices: acc.invoices + curr.invoices,
            tasks: acc.tasks + curr.tasks,
            notices: acc.notices + curr.notices
        }), { total: 0, vouchers: 0, invoices: 0, tasks: 0, notices: 0 });
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
                        Today's Progress
                    </h1>
                </div>
            </div>

            <div className="glass-pane rounded-lg flex-grow flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-black/10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-semibold text-gray-200">
                                Daily Activity Breakdown
                            </h2>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search team member..."
                                    className="pl-10 glass-input border-white/10 bg-black/20 text-white placeholder:text-gray-500 focus:ring-blue-500/50"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-auto relative min-h-0 bg-black/5">
                    <Table className="min-w-full">
                        <TableHeader className="sticky top-0 z-10 border-b border-white/10 bg-black/40 backdrop-blur-md">
                            <TableRow className="border-white/10 hover:bg-white/5">
                                <TableHead className="text-gray-300 w-[100px] font-bold">Sr no.</TableHead>
                                <TableHead className="text-gray-300 font-bold">Team Member</TableHead>
                                <TableHead className="text-right text-gray-300 font-bold">Total</TableHead>
                                <TableHead className="text-right text-gray-300 font-bold">Vouchers</TableHead>
                                <TableHead className="text-right text-gray-300 font-bold">Invoices</TableHead>
                                <TableHead className="text-right text-gray-300 font-bold">Tasks</TableHead>
                                <TableHead className="text-right text-gray-300 font-bold">Notices</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        Loading activity...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedData.length > 0 ? (
                                <>
                                    {paginatedData.map((row, idx) => (
                                        <TableRow key={row.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                            <TableCell className="text-gray-500 font-mono text-xs">
                                                {String((currentPage - 1) * itemsPerPage + idx + 1).padStart(2, '0')}
                                            </TableCell>
                                            <TableCell className="font-medium text-white">{row.name}</TableCell>
                                            <TableCell className="text-right font-bold text-white text-base">{row.total}</TableCell>
                                            <TableCell className="text-right text-emerald-400 font-semibold">{row.vouchers}</TableCell>
                                            <TableCell className="text-right text-rose-400 font-semibold">{row.invoices}</TableCell>
                                            <TableCell className="text-right text-blue-400 font-semibold">{row.tasks}</TableCell>
                                            <TableCell className="text-right text-amber-400 font-semibold">{row.notices}</TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Aggregate Sum as part of the body but styled as a footer row */}
                                    <TableRow className="bg-white/10 border-t-2 border-white/20 sticky bottom-0 z-10 backdrop-blur-md">
                                        <TableCell colSpan={2} className="text-white font-bold uppercase text-xs tracking-wider p-4">
                                            Aggregate Sum
                                        </TableCell>
                                        <TableCell className="text-right text-white font-black text-lg">{totals.total}</TableCell>
                                        <TableCell className="text-right text-emerald-400 font-bold">{totals.vouchers}</TableCell>
                                        <TableCell className="text-right text-rose-400 font-bold">{totals.invoices}</TableCell>
                                        <TableCell className="text-right text-blue-400 font-bold">{totals.tasks}</TableCell>
                                        <TableCell className="text-right text-amber-400 font-bold">{totals.notices}</TableCell>
                                    </TableRow>
                                </>
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                                        No activity recorded today.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination at the bottom-most part of the container */}
            {totalPages > 1 && (
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/20 p-3 rounded-lg border border-white/10 backdrop-blur-sm">
                    <p className="text-sm text-gray-400">
                        Showing {Math.min(filteredData.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredData.length, currentPage * itemsPerPage)} of {filteredData.length} team members
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="glass-input border-white/10 bg-black/20 disabled:opacity-50 h-9"
                        >
                            Previous
                        </Button>
                        <div className="flex items-center gap-1">
                            <div className="glass-input border-white/10 bg-black/20 px-3 py-1.5 rounded-lg text-sm font-medium">
                                {currentPage} / {totalPages}
                            </div>
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
                </div>
            )}
        </div>
    );
};

export default TodayProgressExpanded;
