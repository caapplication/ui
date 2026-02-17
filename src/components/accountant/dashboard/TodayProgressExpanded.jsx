import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Search,
    FileText,
    ClipboardCheck,
    Bell,
    Receipt,
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
    listEntities,
    getCATeamInvoicesBulk,
    getCATeamVouchersBulk,
    listTasks,
    listRecurringTasks,
    getNotices
} from '@/lib/api';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, differenceInDays, isAfter } from 'date-fns';

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

const getActivityDateForDisplay = (item, type) => {
    if (type === 'task') return item.completed_at || item.updated_at || item.created_at;
    if (type === 'voucher') return item.verified_at || item.updated_at || item.created_date || item.date;
    if (type === 'invoice') return item.verified_at || item.updated_at || item.created_at || item.date;
    return item.reviewed_at || item.updated_at || item.created_at;
};

const ActivityDetailsList = ({ details, navigate }) => (
    <div className="space-y-3 text-sm">
        {details.tasks?.length > 0 && (
            <div>
                <div className="text-blue-400 font-semibold mb-1 flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4" /> Tasks ({details.tasks.length})
                </div>
                <ul className="space-y-1 ml-6">
                    {details.tasks.map(t => (
                        <li key={t.id} className="flex items-center justify-between gap-2 text-gray-300 hover:text-white">
                            <span 
                                className="cursor-pointer hover:underline truncate"
                                onClick={(e) => { e.stopPropagation(); navigate(t.is_recurring ? `/tasks/recurring/${t.id}` : `/tasks/${t.id}`); }}
                            >
                                {t.title || 'Untitled'} {t.task_number ? `(T${t.task_number})` : ''}
                            </span>
                            <span className="text-xs text-gray-500 shrink-0">
                                {getActivityDateForDisplay(t, 'task') ? format(new Date(getActivityDateForDisplay(t, 'task')), 'dd MMM yyyy, HH:mm') : ''}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        {details.vouchers?.length > 0 && (
            <div>
                <div className="text-emerald-400 font-semibold mb-1 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4" /> Vouchers ({details.vouchers.length})
                </div>
                <ul className="space-y-1 ml-6">
                    {details.vouchers.map(v => (
                        <li key={v.id} className="flex items-center justify-between gap-2 text-gray-300">
                            <span 
                                className="cursor-pointer hover:underline truncate"
                                onClick={(e) => { e.stopPropagation(); navigate(`/finance/vouchers/${v.id}`); }}
                            >
                                {v.voucher_id || v.id} - ₹{Number(v.amount || 0).toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-500 shrink-0">
                                {getActivityDateForDisplay(v, 'voucher') ? format(new Date(getActivityDateForDisplay(v, 'voucher')), 'dd MMM yyyy') : ''}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        {details.invoices?.length > 0 && (
            <div>
                <div className="text-rose-400 font-semibold mb-1 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> Invoices ({details.invoices.length})
                </div>
                <ul className="space-y-1 ml-6">
                    {details.invoices.map(i => (
                        <li key={i.id} className="flex items-center justify-between gap-2 text-gray-300">
                            <span 
                                className="cursor-pointer hover:underline truncate"
                                onClick={(e) => { e.stopPropagation(); navigate(`/invoices/ca/${i.id}`); }}
                            >
                                {i.bill_number || i.id} - ₹{Number(i.amount || 0).toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-500 shrink-0">
                                {getActivityDateForDisplay(i, 'invoice') ? format(new Date(getActivityDateForDisplay(i, 'invoice')), 'dd MMM yyyy') : ''}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        {details.notices?.length > 0 && (
            <div>
                <div className="text-amber-400 font-semibold mb-1 flex items-center gap-1.5">
                    <Bell className="w-4 h-4" /> Notices ({details.notices.length})
                </div>
                <ul className="space-y-1 ml-6">
                    {details.notices.map(n => (
                        <li key={n.id} className="flex items-center justify-between gap-2 text-gray-300">
                            <span className="truncate">{n.title || 'Untitled'}</span>
                            <span className="text-xs text-gray-500 shrink-0">
                                {getActivityDateForDisplay(n, 'notice') ? format(new Date(getActivityDateForDisplay(n, 'notice')), 'dd MMM yyyy') : ''}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
);

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

const TodayProgressExpanded = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [timeFrame, setTimeFrame] = useState('today');
    const [customStartDate, setCustomStartDate] = useState(null);
    const [customEndDate, setCustomEndDate] = useState(null);
    const [dateError, setDateError] = useState('');
    const [expandedRowId, setExpandedRowId] = useState(null);
    const itemsPerPage = 10;
    const { toast } = useToast();
    
    // Check if accessed from dashboard click (viewing own activities only)
    const viewOwnActivities = location.state?.userId === user.id;

    const handleExport = () => {
        if (filteredData.length === 0) {
            toast({
                title: "No data",
                description: "There is no data to export.",
                variant: "destructive",
            });
            return;
        }

        const headers = ["Sr No", "Team Member", "Total", "Vouchers", "Invoices", "Tasks", "Notices"];
        const rows = filteredData.map((row, idx) => [
            String(idx + 1).padStart(2, '0'),
            row.name.replace(/,/g, ";"),
            row.total,
            row.vouchers,
            row.invoices,
            row.tasks,
            row.notices
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Today_Progress_${new Date().getTime()}.csv`);
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

            const [teamMembers, allEntities] = await Promise.all([
                listTeamMembers(token).catch(() => []),
                // For CA_TEAM: Only get entities assigned to this user (same as dashboard)
                user.role === 'CA_TEAM' 
                    ? listEntities(null, token).catch(() => [])
                    : listAllEntities(token).catch(() => [])
            ]);

            const entityIds = allEntities.map(e => e.id);

            const [invoices, vouchers, tasks, recurringTasksData, notices] = await Promise.all([
                entityIds.length > 0 ? getCATeamInvoicesBulk(entityIds, token).catch(() => []) : Promise.resolve([]),
                entityIds.length > 0 ? getCATeamVouchersBulk(entityIds, token).catch(() => []) : Promise.resolve([]),
                listTasks(agencyId, token).catch(() => []),
                listRecurringTasks(agencyId, token, null, 1, 1000).catch(() => ({ items: [] })),
                getNotices(null, token).catch(() => [])
            ]);

            const regularTasks = Array.isArray(tasks) ? tasks : (tasks?.items || []);
            const recurringTasks = Array.isArray(recurringTasksData) ? recurringTasksData : (recurringTasksData?.items || []);
            const recurringTaskIds = new Set(recurringTasks.map(rt => String(rt.id)));
            const tasksList = [
                ...regularTasks.filter(t => !recurringTaskIds.has(String(t.id))),
                ...recurringTasks
            ];
            const noticesList = notices || [];

            const { start, end } = getDateRange(timeFrame, customStartDate, customEndDate);

            const isWithinRange = (dateStr) => {
                if (!dateStr) return false;
                if (!start || !end) return true;
                // Use startOfDay for consistent comparison with dashboard
                const d = startOfDay(new Date(dateStr));
                const rangeStart = startOfDay(start);
                const rangeEnd = startOfDay(end);
                return d >= rangeStart && d <= rangeEnd;
            };

            // Only completed/verified/closed items, using activity date
            const getActivityDate = (item, type) => {
                if (type === 'task') return item.completed_at || item.updated_at || item.created_at;
                if (type === 'voucher') return item.verified_at || item.updated_at || item.created_date || item.date;
                if (type === 'invoice') return item.verified_at || item.updated_at || item.created_at || item.date;
                return item.reviewed_at || item.updated_at || item.created_at;
            };
            const periodInvoices = invoices.filter(i => !i.is_deleted && i.status === 'verified' && isWithinRange(getActivityDate(i, 'invoice')));
            const periodVouchers = vouchers.filter(v => !v.is_deleted && v.status === 'verified' && isWithinRange(getActivityDate(v, 'voucher')));
            const isTaskCompleted = (t) => t.status === 'completed' || (t.stage?.name && String(t.stage.name).toLowerCase() === 'complete');
            const periodTasks = tasksList.filter(t => isTaskCompleted(t) && isWithinRange(getActivityDate(t, 'task')));
            const periodNotices = noticesList.filter(n => n.status === 'closed' && isWithinRange(getActivityDate(n, 'notice')));

            // Filter team members: if viewOwnActivities, only show current user
            const membersToShow = viewOwnActivities 
                ? teamMembers.filter(m => String(m.user_id || m.id).toLowerCase() === String(user.id).toLowerCase())
                : teamMembers.filter(m => {
                    // Only show CA_ACCOUNTANT and CA_TEAM members
                    const memberRole = m.role;
                    return memberRole === 'CA_ACCOUNTANT' || memberRole === 'CA_TEAM';
                });
            
            // If viewOwnActivities and user not in teamMembers, add them
            if (viewOwnActivities && membersToShow.length === 0) {
                membersToShow.push({
                    id: user.id,
                    user_id: user.id,
                    name: user.name,
                    full_name: user.full_name || user.name,
                    email: user.email,
                    role: user.role
                });
            }

            const memberStats = membersToShow.map(member => {
                const mId = member.user_id || member.id;
                const mName = member.full_name || member.name || 'Unknown';

                const memberInvoices = periodInvoices.filter(i => {
                    // For verified: attribute to verified_by (CA who verified), else owner_id
                    const userId = i.verified_by || i.owner_id || i.created_by || i.created_by_id;
                    return userId && String(userId).toLowerCase() === String(mId).toLowerCase();
                });
                const memberVouchers = periodVouchers.filter(v => {
                    // For verified: attribute to verified_by (CA who verified), else owner_id
                    const userId = v.verified_by || v.owner_id || v.created_by || v.created_by_id;
                    return userId && String(userId).toLowerCase() === String(mId).toLowerCase();
                });
                const memberTasks = periodTasks.filter(t => {
                    const userId = t.created_by || t.created_by_id || t.assigned_to;
                    return String(userId) === String(mId);
                });
                const memberNotices = periodNotices.filter(n => {
                    const userId = n.created_by || n.created_by_id || n.owner_id;
                    return String(userId) === String(mId);
                });

                return {
                    id: mId,
                    name: mName,
                    invoices: memberInvoices.length,
                    vouchers: memberVouchers.length,
                    tasks: memberTasks.length,
                    notices: memberNotices.length,
                    total: memberInvoices.length + memberVouchers.length + memberTasks.length + memberNotices.length,
                    activityDetails: { tasks: memberTasks, vouchers: memberVouchers, invoices: memberInvoices, notices: memberNotices }
                };
            }).filter(m => m.total > 0 || searchTerm === '');

            setData(memberStats);
        } catch (error) {
            console.error('Error fetching today\'s progress:', error);
        } finally {
            setLoading(false);
        }
    }, [user, timeFrame, searchTerm, customStartDate, customEndDate, viewOwnActivities]);

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
                            {viewOwnActivities ? 'My Activities' : "Today's Progress"}
                        </h1>
                        <p className="text-gray-400 text-sm mt-0.5">
                            {viewOwnActivities ? 'Your activity breakdown' : 'Daily activity breakdown'}
                        </p>
                    </div>
                </div>

            </div>

            <div className="glass-card rounded-3xl overflow-hidden border border-white/5 flex flex-col">
                <div className="overflow-x-auto">
                    <Table className="min-w-full">
                        <TableHeader className="sticky top-0 z-20 ">
                            <TableRow className="border-b border-white/10 text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider bg-white/5">
                                <TableHead className="py-4 pl-6 w-10 text-gray-400"></TableHead>
                                <TableHead className="py-4 pl-2 w-16 text-gray-400">Sr no.</TableHead>
                                <TableHead className="py-4 px-4 text-gray-400">Team Member</TableHead>
                                <TableHead className="py-4 px-4 text-right text-gray-400">Total</TableHead>
                                <TableHead className="py-4 px-4 text-right text-gray-400">Vouchers</TableHead>
                                <TableHead className="py-4 px-4 text-right text-gray-400">Invoices</TableHead>
                                <TableHead className="py-4 px-4 text-right text-gray-400">Tasks</TableHead>
                                <TableHead className="py-4 pr-6 text-right text-gray-400">Notices</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        Loading activity...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedData.length > 0 ? (
                                <>
                                    {paginatedData.map((row, idx) => {
                                        const isExpanded = expandedRowId === row.id;
                                        const details = row.activityDetails || { tasks: [], vouchers: [], invoices: [], notices: [] };
                                        const hasDetails = details.tasks?.length + details.vouchers?.length + details.invoices?.length + details.notices?.length > 0;
                                        return (
                                            <React.Fragment key={row.id}>
                                                <TableRow 
                                                    className={cn(
                                                        "border-b border-white/5 hover:bg-white/5 transition-colors group",
                                                        hasDetails && "cursor-pointer"
                                                    )}
                                                    onClick={() => hasDetails && setExpandedRowId(isExpanded ? null : row.id)}
                                                >
                                                    <TableCell className="py-4 pl-6 text-gray-500 font-mono text-xs w-10">
                                                        {hasDetails ? (isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : null}
                                                    </TableCell>
                                                    <TableCell className="py-4 pl-2 text-gray-500 font-mono text-xs">
                                                        {String((currentPage - 1) * itemsPerPage + idx + 1).padStart(2, '0')}
                                                    </TableCell>
                                                    <TableCell className="py-4 px-4 font-semibold text-white">
                                                        {row.name}
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
                                                    <TableCell className="py-4 px-4 text-right text-blue-400 font-semibold">
                                                        {row.tasks}
                                                    </TableCell>
                                                    <TableCell className="py-4 pr-6 text-right text-amber-400 font-semibold">
                                                        {row.notices}
                                                    </TableCell>
                                                </TableRow>
                                                {isExpanded && hasDetails && (
                                                    <TableRow className="bg-white/5 border-b border-white/5">
                                                        <TableCell colSpan={8} className="py-4 px-6">
                                                            <ActivityDetailsList details={details} navigate={navigate} />
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                    <TableRow className="bg-white/5 border-t border-white/10 font-bold text-white">
                                        <TableCell className="py-4 pl-6 w-10"></TableCell>
                                        <TableCell colSpan={2} className="py-4 pl-2 text-white font-bold uppercase text-xs tracking-wider">
                                            Aggregate Sum
                                        </TableCell>
                                        <TableCell className="py-4 px-4 text-right text-white font-black text-lg">{totals.total}</TableCell>
                                        <TableCell className="py-4 px-4 text-right text-emerald-400 font-bold">{totals.vouchers}</TableCell>
                                        <TableCell className="py-4 px-4 text-right text-rose-400 font-bold">{totals.invoices}</TableCell>
                                        <TableCell className="py-4 px-4 text-right text-blue-400 font-bold">{totals.tasks}</TableCell>
                                        <TableCell className="py-4 pr-6 text-right text-amber-400 font-bold">{totals.notices}</TableCell>
                                    </TableRow>
                                </>
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                        No activity recorded for this period.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-4 sm:p-6 border-t border-white/5 flex justify-between items-center bg-white/5 rounded-b-3xl">
                    <p className="text-xs text-gray-400">
                        Showing {paginatedData.length} of {filteredData.length} team members
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

export default TodayProgressExpanded;

