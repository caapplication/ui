import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Search,
    Clock,
    FileText,
    Receipt,
    Users,
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
    getCATeamVouchersBulk
} from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const PendingVerificationExpanded = () => {
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

            const [teamMembers, entities] = await Promise.all([
                listTeamMembers(token).catch(() => []),
                listAllEntities(token).catch(() => [])
            ]);

            const entityIds = entities.map(e => e.id);

            const [invoices, vouchers] = await Promise.all([
                entityIds.length > 0 ? getCATeamInvoicesBulk(entityIds, token).catch(() => []) : Promise.resolve([]),
                entityIds.length > 0 ? getCATeamVouchersBulk(entityIds, token).catch(() => []) : Promise.resolve([])
            ]);

            const teamMap = teamMembers.reduce((acc, t) => ({ ...acc, [t.user_id || t.id]: t.full_name || t.name || 'Unknown' }), {});

            // Filter for Pending Approval (pending_ca_approval or pending_master_admin_approval)
            const pendingInvoices = invoices.filter(i => i.status === 'pending_ca_approval' || i.status === 'pending_master_admin_approval');
            const pendingVouchers = vouchers.filter(v => v.status === 'pending_ca_approval' || v.status === 'pending_master_admin_approval');

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
                const associatedTeam = creatorIds.map(id => teamMap[id] || 'Unknown').join(', ');

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
            vouchers: acc.vouchers + curr.vouchers,
            invoices: acc.invoices + curr.invoices
        }), { total: 0, vouchers: 0, invoices: 0 });
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
                        Pending Verification
                    </h1>
                </div>
            </div>

            <div className="glass-pane rounded-lg flex-grow flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-black/10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-semibold text-gray-200">
                                Entity-wise Pending Items
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
                            <TableRow className="border-white/10 hover:bg-white/5">
                                <TableHead className="text-gray-300 w-[100px] font-bold">Sr no.</TableHead>
                                <TableHead className="text-gray-300 font-bold">Entity</TableHead>
                                <TableHead className="text-right text-gray-300 font-bold">Total</TableHead>
                                <TableHead className="text-right text-gray-300 font-bold">Vouchers</TableHead>
                                <TableHead className="text-right text-gray-300 font-bold">Invoices</TableHead>
                                <TableHead className="text-center text-gray-300 font-bold">Due Since</TableHead>
                                <TableHead className="text-gray-300 font-bold">Team Members</TableHead>
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
                                        <TableRow key={row.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                            <TableCell className="text-gray-500 font-mono text-xs">
                                                {String((currentPage - 1) * itemsPerPage + idx + 1).padStart(2, '0')}
                                            </TableCell>
                                            <TableCell className="font-semibold text-white">{row.entity}</TableCell>
                                            <TableCell className="text-right font-bold text-white text-base">{row.total}</TableCell>
                                            <TableCell className="text-right text-emerald-400 font-semibold">{row.vouchers}</TableCell>
                                            <TableCell className="text-right text-rose-400 font-semibold">{row.invoices}</TableCell>
                                            <TableCell className="text-center">
                                                <span className="bg-rose-500/10 text-rose-400 py-1 px-3 rounded-full text-[10px] font-bold border border-rose-500/20">
                                                    {formatDistanceToNow(row.dueSince)} ago
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-gray-400 text-xs italic max-w-[200px] truncate">
                                                {row.teamMembers}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-white/10 border-t-2 border-white/20 sticky bottom-0 z-10 backdrop-blur-md">
                                        <TableCell colSpan={2} className="text-white font-bold uppercase text-xs tracking-wider p-4">
                                            Aggregate Sum
                                        </TableCell>
                                        <TableCell className="text-right text-white font-black text-lg">{totals.total}</TableCell>
                                        <TableCell className="text-right text-emerald-400 font-bold">{totals.vouchers}</TableCell>
                                        <TableCell className="text-right text-rose-400 font-bold">{totals.invoices}</TableCell>
                                        <TableCell colSpan={2} />
                                    </TableRow>
                                </>
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                                        No items pending verification.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {totalPages > 1 && (
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/20 p-3 rounded-lg border border-white/10 backdrop-blur-sm">
                    <p className="text-sm text-gray-400">
                        Showing {Math.min(filteredData.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredData.length, currentPage * itemsPerPage)} of {filteredData.length} entities
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

export default PendingVerificationExpanded;
