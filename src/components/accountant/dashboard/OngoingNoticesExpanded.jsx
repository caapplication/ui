import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Search,
    Clock,
    Users,
    Bell,
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
import { listTeamMembers, listAllEntities, getNotices } from '@/lib/api';
import { differenceInDays, startOfDay } from 'date-fns';

const OngoingNoticesExpanded = () => {
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
            const today = startOfDay(new Date());

            const [teamMembers, entities, notices] = await Promise.all([
                listTeamMembers(token).catch(() => []),
                listAllEntities(token).catch(() => []),
                getNotices(null, token).catch(() => [])
            ]);

            const teamMap = teamMembers.reduce((acc, t) => ({ ...acc, [t.user_id || t.id]: t.full_name || t.name || 'Unknown' }), {});

            const activeNotices = notices.filter(n => n.status !== 'Resolved' && n.status !== 'Closed' && n.status !== 'closed');

            // Aggregate by Entity
            const entityStats = entities.map(entity => {
                const eId = entity.id;
                const eName = entity.name;

                const entityNotices = activeNotices.filter(n => (n.entity_id || n.entity) === eId);
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

    const totalNotices = useMemo(() => {
        return filteredData.reduce((sum, curr) => sum + curr.total, 0);
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
                        Ongoing Notices
                    </h1>
                </div>
            </div>

            <div className="glass-pane rounded-lg flex-grow flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-black/10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-semibold text-gray-200">
                                Notice Processing Summary
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

                <div className="flex-grow overflow-auto relative min-h-0 bg-black/5">
                    <Table className="min-w-full">
                        <TableHeader className="sticky top-0 z-10 border-b border-white/10 bg-black/40 backdrop-blur-md">
                            <TableRow className="border-white/10 hover:bg-white/5 uppercase text-[10px] tracking-widest text-gray-300">
                                <TableHead className="w-[100px] font-bold">Sr no.</TableHead>
                                <TableHead className="font-bold">Entity</TableHead>
                                <TableHead className="text-center font-bold">Total Notices</TableHead>
                                <TableHead className="text-center font-bold">Avg Processing Time</TableHead>
                                <TableHead className="font-bold">Primary Handler</TableHead>
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
                                        <TableRow key={row.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                            <TableCell className="text-gray-500 font-mono text-xs">
                                                {String((currentPage - 1) * itemsPerPage + idx + 1).padStart(2, '0')}
                                            </TableCell>
                                            <TableCell className="font-semibold text-white whitespace-nowrap">{row.entity}</TableCell>
                                            <TableCell className="text-center">
                                                <span className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 font-bold inline-flex items-center justify-center border border-amber-500/20">
                                                    {row.total}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center font-medium text-white p-4">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-lg font-bold">{row.avgTime}</span>
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Days Open</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-white font-medium italic">{row.teamMember}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-white/10 border-t-2 border-white/20 sticky bottom-0 z-10 backdrop-blur-md">
                                        <TableCell colSpan={2} className="text-white font-bold uppercase text-xs tracking-wider p-4">Aggregate Notice Sum</TableCell>
                                        <TableCell className="text-center text-white font-black text-xl">{totalNotices}</TableCell>
                                        <TableCell colSpan={2} />
                                    </TableRow>
                                </>
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                                        No active notices found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-6 bg-black/20 p-3 rounded-lg border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-lg border border-white/10 w-full md:w-auto">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <Bell className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-widest">Active Notices</p>
                        <p className="text-sm font-bold text-white leading-tight">{totalNotices} Pending Resolution</p>
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

export default OngoingNoticesExpanded;
