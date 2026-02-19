import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, UserCheck, Briefcase, Landmark, Building2, Banknote, ListTodo, Bell, FileWarning, Eye, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, ReferenceLine, LabelList } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import {
  listClients,
  listClientsByOrganization,
  listAllClientUsers,
  listTeamMembers,
  listServices,
  listAllEntities,
  listEntities,
  getCATeamInvoicesBulk,
  getCATeamVouchersBulk,
  listTasks,
  listRecurringTasks,
  getNotices,
  getClientBillingInvoices,
  getTaskDashboardAnalytics,
  getNoticeDashboardAnalytics,
  getInvoiceAnalytics,
  getVoucherAnalytics
} from '@/lib/api';
import { useOrganisation } from "@/hooks/useOrganisation";

const StatCard = ({ title, value, description, icon, color, delay, trend, meta, hideValue, suffix = "", onClick }) => {
  const Icon = icon;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}>
      <Card
        className={`glass-card card-hover overflow-hidden h-full relative group rounded-3xl border-white/5 ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row gap-2 items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wider">
            {title}
          </CardTitle>
          <div className={`w-10 h-10 bg-gradient-to-r ${color} rounded-xl flex items-center justify-center shadow-lg shadow-black/20 shrink-0 group-hover:scale-110 transition-transform`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {!hideValue && (
            <div className="flex items-center gap-3 mb-1">
              <div className="text-2xl sm:text-3xl font-bold text-white">
                {suffix && <span className="text-xl mr-1">{suffix}</span>}
                {typeof value === 'number' ? value.toLocaleString() : value}
              </div>
              {trend && (
                <div className={`${trend.isBad ? 'text-red-500' : 'text-green-500'}`}>
                  {trend.isUp ? <TrendingUp className="w-5 h-5" /> : <TrendingUp className="w-5 h-5 rotate-180" />}
                </div>
              )}
            </div>
          )}
          {description && (
            <p className={`text-xs mt-1 ${trend ? (trend.isBad ? 'text-red-500' : 'text-green-500') : 'text-gray-400'}`}>
              {description}
            </p>
          )}
          {meta && (
            <div className={`${hideValue ? "mt-2" : "mt-4 pt-3 border-t border-white/10"} space-y-2 text-sm text-gray-400`}>
              {Object.entries(meta).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center text-xs">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="text-white font-medium">{val}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Normalize users.id (uuid) for comparison - same as DB users table id
const normalizeUserId = (id) => (id == null || id === '') ? '' : String(id).toLowerCase().trim();
const normalizeName = (s) => (s == null || s === '') ? '' : String(s).toLowerCase().trim();
const normalizeEmail = (s) => (s == null || s === '') ? '' : String(s).toLowerCase().trim();

const DetailBlock = ({ title, subtitle, count, data, columns, onViewMore, delay, onRowClick, currentUserId, currentUserName, currentUserEmail }) => {
  const currentIdNorm = normalizeUserId(currentUserId);
  const currentNameNorm = normalizeName(currentUserName);
  const currentEmailNorm = normalizeEmail(currentUserEmail);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay }}>
      <Card className="glass-card flex flex-col h-full rounded-2xl border-white/5">
        <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
          <CardTitle className="text-lg font-bold text-white">{title}</CardTitle>
          {subtitle && <CardDescription className="text-gray-400 text-xs mt-0.5">{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className="p-4 sm:p-5 flex-1 flex flex-col">
          <div className="space-y-2 flex-1">
            <div className="grid grid-cols-12 text-[10px] text-gray-400 font-medium uppercase tracking-wider border-b border-white/10 pb-2 mb-2 pr-2">
              <div className="col-span-2">{columns[0]}</div>
              <div className="col-span-6">{columns[1]}</div>
              <div className="col-span-4 text-right">{columns[2]}</div>
            </div>
            <div className="min-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
              {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[320px] text-gray-500 text-xs italic">
                  No records found
                </div>
              ) : (
                data.slice(0, 8).map((row, idx) => {
                  // Match current user using same fields as users table: id (uuid), name, email
                  const rowIdNorm = normalizeUserId(row.id);
                  const rowNameNorm = normalizeName(row.col1);
                  const rowEmailNorm = normalizeEmail(row.email);
                  const isCurrentUser = currentIdNorm && (
                    row.isCurrentUser ||
                    (rowIdNorm && rowIdNorm === currentIdNorm) ||
                    (currentNameNorm && rowNameNorm && rowNameNorm === currentNameNorm) ||
                    (currentEmailNorm && rowEmailNorm && rowEmailNorm === currentEmailNorm)
                  );
                  const sNo = row.sNo !== undefined ? row.sNo : (row.rank !== undefined ? row.rank : idx + 1);

                  return (
                    <div
                      key={row.id || idx}
                      onClick={() => {
                        if (onRowClick && isCurrentUser) {
                          onRowClick(row);
                        }
                      }}
                      className={`grid grid-cols-12 items-center text-sm py-2 transition-all rounded px-1 group border-b border-white/5 last:border-0 ${isCurrentUser
                        ? 'bg-blue-500/20 hover:bg-blue-500/30 cursor-pointer border-l-4 border-l-blue-500 border-blue-400/30'
                        : 'hover:bg-white/5 cursor-default'
                        }`}
                    >
                      <div className={`col-span-2 font-mono text-xs ${isCurrentUser ? 'text-blue-300 font-bold' : 'text-gray-400'}`}>
                        {String(sNo).padStart(2, "0")}
                      </div>
                      <div className={`col-span-6 truncate pr-2 group-hover:scale-[1.01] transition-transform origin-left text-xs sm:text-sm ${isCurrentUser ? 'text-blue-200 font-semibold' : 'text-white'
                        }`}>
                        {row.col1}
                      </div>
                      <div className={`col-span-4 text-right font-semibold text-xs sm:text-sm ${isCurrentUser ? 'text-blue-200' : 'text-red-100'
                        }`}>
                        {typeof row.col2 === 'number' ? row.col2.toLocaleString() : row.col2}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="pt-3 mt-auto border-t border-white/5">
            <Button
              variant="ghost"
              className="w-full text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-xl group transition-all text-xs py-1.5 h-auto"
              onClick={onViewMore}
            >
              View more
              <TrendingUp className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};



const AccountantDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const {
    selectedOrg,
    selectedEntity,
    entities,
    organisationId,
  } = useOrganisation();

  // State for the dashboard metrics
  const [stats, setStats] = useState({
    myClients: 0,
    clientUsers: 0,
    myTeam: 0,
    services: 0,
    revenue: 0,
    due: 0
  });

  const [chartData, setChartData] = useState([]);
  const [averageActivity, setAverageActivity] = useState(0);

  const [detailBlocks, setDetailBlocks] = useState({
    todayProgress: [],
    pendingVerification: [],
    ongoingTasks: [],
    ongoingNotices: []
  });

  const fetchDashboardStats = useCallback(async () => {
    if (!user?.access_token) return;

    setIsLoading(true);
    try {
      const token = user.access_token;
      const agencyId = user.agency_id;

      // Determine Entity IDs based on context
      let entityIds = [];
      let relevantEntities = [];

      // For CA_TEAM: Only show entities assigned to this user via EntityUser table
      if (user.role === 'CA_TEAM') {
        const myEntities = await listEntities(null, token).catch(() => []);
        entityIds = myEntities.map(e => e.id);
        relevantEntities = myEntities;
      } else if (organisationId) {
        if (selectedEntity && selectedEntity !== 'all') {
          entityIds = [selectedEntity];
          relevantEntities = entities.filter(e => e.id === selectedEntity);
        } else if (entities && entities.length > 0) {
          entityIds = entities.map(e => e.id);
          relevantEntities = entities;
        }
      } else {
        // Fallback: If no org selected, fetch all entities for the user (global view)
        const allEntities = await listAllEntities(token).catch(() => []);
        entityIds = allEntities.map(e => e.id);
        relevantEntities = allEntities;
      }

      // 1. Fetch Summary Stats
      let clientsData = [];
      // For CA_TEAM: Use assigned entities as clients
      if (user.role === 'CA_TEAM') {
        clientsData = relevantEntities; // Already filtered to assigned entities
      } else if (user.organizations && user.organizations.length > 0) {
        clientsData = await Promise.all(
          user.organizations.map(org =>
            listClientsByOrganization(org.id, token).catch(() => [])
          )
        ).then(results => results.flat());
      } else if (agencyId) {
        clientsData = await listClients(agencyId, token).catch(() => []);
      }

      const [clientUsersData, teamData, servicesData] = await Promise.all([
        listAllClientUsers(token).catch(() => []),
        listTeamMembers(token).catch(() => []),
        listServices(agencyId, token).catch(() => [])
      ]);

      const [
        recurringTasksData,
        taskAnalytics,
        noticeAnalytics,
        invoiceAnalytics,
        voucherAnalytics
      ] = await Promise.all([
        listRecurringTasks(agencyId, token, null, 1, 1000).catch(() => ({ items: [] })),
        getTaskDashboardAnalytics(15, agencyId, token).catch(() => ({ activity_trend: [], ongoing_stats: [], todays_progress: [] })),
        getNoticeDashboardAnalytics(15, agencyId, token).catch(() => ({ activity_trend: [], ongoing_stats: [], todays_progress: [] })),
        getInvoiceAnalytics(15, token).catch(() => ({ activity_trend: [], pending_stats: [], todays_progress: [] })),
        getVoucherAnalytics(15, token).catch(() => ({ activity_trend: [], pending_stats: [], todays_progress: [] }))
      ]);

      const recurringTasks = Array.isArray(recurringTasksData) ? recurringTasksData : (recurringTasksData?.items || []);

      const invoices = []; // Removed bulk call
      const vouchers = []; // Removed bulk call
      const filteredTasks = []; // Removed listTasks call
      const filteredNotices = []; // Removed getNotices call

      // Compute Revenue & Due from current month billing invoices
      let totalRevenue = 0;
      let totalDue = 0;

      try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        // Get all clients for this CA
        const allClients = Array.isArray(clientsData) ? clientsData : (clientsData?.results || []);

        // Fetch invoices for all clients and calculate current month totals
        for (const client of allClients) {
          try {
            const invoices = await getClientBillingInvoices(client.id, agencyId, token);
            if (Array.isArray(invoices)) {
              for (const invoice of invoices) {
                const invoiceDate = new Date(invoice.invoice_date);
                // Check if invoice is from current month
                if (invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear) {
                  const amount = parseFloat(invoice.invoice_amount || 0);
                  totalRevenue += amount;

                  // Add to due if status is due or overdue
                  if (invoice.status === 'due' || invoice.status === 'overdue') {
                    totalDue += amount;
                  }
                }
              }
            }
          } catch (error) {
            console.warn(`Error fetching invoices for client ${client.id}:`, error);
          }
        }
      } catch (error) {
        console.error('Error calculating Revenue & Due:', error);
      }

      setStats({
        myClients: Array.isArray(clientsData) ? clientsData.length : (clientsData?.results?.length || 0),
        clientUsers: Array.isArray(clientUsersData) ? clientUsersData.length : 0,
        myTeam: Array.isArray(teamData) ? teamData.length : 0,
        services: Array.isArray(servicesData) ? servicesData.length : 0,
        revenue: totalRevenue,
        due: totalDue
      });

      // Process Trend Data - use data from the 4 analytics APIs
      const last15Days = [];
      for (let i = 14; i >= 0; i--) {
        const date = subDays(startOfDay(new Date()), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        last15Days.push({
          date,
          name: format(date, 'MMM dd'),
          dateStr,
          tasks: 0,
          vouchers: 0,
          invoices: 0,
          notices: 0,
          total: 0
        });
      }

      // Helper: merge API activity_trend data into chart days
      const mergeApiTrend = (trendData, key) => {
        if (!Array.isArray(trendData)) return;
        trendData.forEach(({ date, count }) => {
          if (!date || !count) return;
          const day = last15Days.find(d => d.dateStr === date);
          if (day) {
            day[key] += count;
            day.total += count;
          }
        });
      };

      mergeApiTrend(taskAnalytics.activity_trend, 'tasks');
      mergeApiTrend(noticeAnalytics.activity_trend, 'notices');
      mergeApiTrend(invoiceAnalytics.activity_trend, 'invoices');
      mergeApiTrend(voucherAnalytics.activity_trend, 'vouchers');

      setChartData(last15Days);
      const totalActivity = last15Days.reduce((sum, day) => sum + day.total, 0);
      setAverageActivity(totalActivity / 15);


      // 3. Process Detail Blocks
      // Build entityMap from relevantEntities + also extract entity names from nested objects in invoices/vouchers/tasks/notices
      const entityMap = {};
      relevantEntities.forEach(e => {
        if (e.id) entityMap[String(e.id)] = e.name || `Entity ${e.id}`;
      });
      // Supplement from nested entity objects in tasks/notices (they have entity relationship loaded)
      [...filteredTasks, ...filteredNotices].forEach(item => {
        if (item.entity && item.entity.id) {
          entityMap[String(item.entity.id)] = item.entity.name || entityMap[String(item.entity.id)] || `Entity ${item.entity.id}`;
        }
        if (item.entity_id && !entityMap[String(item.entity_id)]) {
          entityMap[String(item.entity_id)] = `Entity ${item.entity_id}`;
        }
      });


      const today = startOfDay(new Date());

      const getTodayUserProgress = () => {
        // Use user_id from login response when id is missing (e.g. CA_TEAM previously used data.sub)
        const effectiveUserId = user.id ?? user.user_id;
        const currentUserIdStr = (effectiveUserId != null && effectiveUserId !== '')
          ? String(effectiveUserId).toLowerCase().trim()
          : '';

        // Get all CA_ACCOUNTANT and CA_TEAM members from teamData
        const allTeamMembers = teamData.filter(m => {
          const uid = m.user_id ?? m.id;
          if (!uid) return false;
          const memberRole = m.role;
          return memberRole === 'CA_ACCOUNTANT' || memberRole === 'CA_TEAM';
        });

        // Duplication removal and normalized map
        const uniqueMembersMap = new Map();
        for (const member of allTeamMembers) {
          const canonicalId = String(member.user_id ?? member.id).toLowerCase().trim();
          if (!uniqueMembersMap.has(canonicalId)) {
            uniqueMembersMap.set(canonicalId, { ...member, normalizedId: canonicalId });
          }
        }

        // Include current user if they are CA_ACCOUNTANT/CA_TEAM and not in list
        const existingEmails = new Set(Array.from(uniqueMembersMap.values()).map(m => (m.email || '').toLowerCase().trim()));
        const currentUserEmail = (user.email || '').toLowerCase().trim();
        const alreadyInTeam = uniqueMembersMap.has(currentUserIdStr) || (currentUserEmail && existingEmails.has(currentUserEmail));
        if (!alreadyInTeam && (user.role === 'CA_ACCOUNTANT' || user.role === 'CA_TEAM')) {
          uniqueMembersMap.set(currentUserIdStr, {
            id: user.id,
            user_id: user.id,
            name: user.name,
            full_name: user.full_name || user.name,
            email: user.email,
            role: user.role,
            normalizedId: currentUserIdStr
          });
        }

        const uniqueMembers = Array.from(uniqueMembersMap.values());

        // Process Analytics Data for Today's Progress
        // Create maps of user_id -> count for each type
        const taskCounts = {};
        (taskAnalytics.todays_progress || []).forEach(item => taskCounts[String(item.id).toLowerCase()] = item.count);

        const noticeCounts = {};
        (noticeAnalytics.todays_progress || []).forEach(item => noticeCounts[String(item.id).toLowerCase()] = item.count);

        const invoiceCounts = {};
        (invoiceAnalytics.todays_progress || []).forEach(item => invoiceCounts[String(item.id).toLowerCase()] = item.count);

        const voucherCounts = {};
        (voucherAnalytics.todays_progress || []).forEach(item => voucherCounts[String(item.id).toLowerCase()] = item.count);

        // Count activities for each team member using analytics data
        // Match current user same way for both CA_ACCOUNTANT and CA_TEAM: id, email, or (fallback) name for CA_TEAM
        const currentUserNameNorm = (user.full_name || user.name || '').toLowerCase().trim();
        const memberCounts = uniqueMembers.map(member => {
          const memberId = (member.normalizedId || String(member.user_id ?? member.id)).toLowerCase().trim();
          const memberName = member.full_name || member.name || 'Unknown';
          const memberNameNorm = (memberName || '').toLowerCase().trim();

          const tCount = taskCounts[memberId] || 0;
          const nCount = noticeCounts[memberId] || 0;
          const iCount = invoiceCounts[memberId] || 0;
          const vCount = voucherCounts[memberId] || 0;
          const total = tCount + nCount + iCount + vCount;

          // Match using users table fields: id (uuid), email, name (same as DB)
          const currentUserEmailNorm = (user.email || '').toLowerCase().trim();
          const memberEmailNorm = (member.email || '').toLowerCase().trim();
          const isCurrentUser =
            memberId === currentUserIdStr ||
            (currentUserEmailNorm && memberEmailNorm && memberEmailNorm === currentUserEmailNorm) ||
            (currentUserNameNorm && memberNameNorm && memberNameNorm === currentUserNameNorm);

          return {
            id: memberId,
            col1: memberName,
            col2: total,
            email: member.email ?? undefined,
            isCurrentUser
          };
        });

        // Final deduplication
        const finalDeduplicationMap = new Map();
        for (const member of memberCounts) {
          if (!finalDeduplicationMap.has(member.id)) {
            finalDeduplicationMap.set(member.id, member);
          }
        }
        const deduplicatedCounts = Array.from(finalDeduplicationMap.values());

        const sortedByCount = [...deduplicatedCounts].sort((a, b) => b.col2 - a.col2);
        const currentUser = sortedByCount.find(item => item.isCurrentUser);
        const others = sortedByCount.filter(item => !item.isCurrentUser);
        const finalList = currentUser ? [currentUser, ...others] : others;

        return finalList.map((item, idx) => {
          const actualRank = sortedByCount.findIndex(i => i.id === item.id) + 1;
          const isFirstRow = currentUser && idx === 0;
          return {
            ...item,
            rank: actualRank,
            sNo: actualRank,
            isCurrentUser: isFirstRow || item.isCurrentUser
          };
        });
      };

      setDetailBlocks({
        todayProgress: getTodayUserProgress(),
        pendingVerification: [
          ...(invoiceAnalytics.pending_stats || []),
          ...(voucherAnalytics.pending_stats || [])
        ].reduce((acc, item) => {
          const existing = acc.find(x => x.id === item.entity_id);
          if (existing) {
            existing.col2 += item.count;
          } else {
            acc.push({
              col1: item.entity_name || entityMap[item.entity_id] || `Entity ${item.entity_id}`,
              col2: item.count,
              id: item.entity_id
            });
          }
          return acc;
        }, []).sort((a, b) => b.col2 - a.col2),
        ongoingTasks: (taskAnalytics.ongoing_stats || []).filter(item => item.entity_id !== null && item.entity_id !== undefined).map(item => ({
          col1: item.entity_name || entityMap[item.entity_id] || `Entity ${item.entity_id}`,
          col2: item.count,
          id: item.entity_id
        })),
        ongoingNotices: (noticeAnalytics.ongoing_stats || []).filter(item => item.entity_id !== null && item.entity_id !== undefined).map(item => ({
          col1: item.entity_name || entityMap[item.entity_id] || `Entity ${item.entity_id}`,
          col2: item.count,
          id: item.entity_id
        }))
      });

    } catch (error) {
      console.error("Error fetching dashboard statistics:", error);
      toast({
        title: "Error",
        description: "Failed to load latest dashboard statistics.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 lg:mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
          Welcome, {user?.full_name || user?.name || 'Accountant'}
        </h1>
        <p className="text-gray-400 mt-1">Real-time overview of your consultancy activity.</p>
      </motion.div>

      {/* Row 1: 6 Metric Cards - Only show for CA_ACCOUNTANT, not CA_TEAM */}
      {user?.role === 'CA_ACCOUNTANT' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-4 lg:gap-4 mb-6 lg:mb-8">
          <StatCard
            title="MY CLIENTS"
            value={stats.myClients}
            icon={Building2}
            color="from-blue-500 to-indigo-600"
            delay={0.1}
          />
          <StatCard
            title="CLIENT USERS"
            value={stats.clientUsers}
            icon={Users}
            color="from-sky-400 to-blue-500"
            delay={0.15}
          />
          <StatCard
            title="MY TEAM"
            value={stats.myTeam}
            icon={UserCheck}
            color="from-violet-500 to-purple-600"
            delay={0.2}
          />
          <StatCard
            title="SERVICES"
            value={stats.services}
            icon={Briefcase}
            color="from-indigo-500 to-blue-600"
            delay={0.25}
          />
          <StatCard
            title="REVENUE"
            value={stats.revenue}
            suffix="₹"
            icon={Banknote}
            color="from-blue-600 to-indigo-700"
            delay={0.3}
            onClick={() => navigate('/clients-bill')}
          />
          <StatCard
            title="DUE"
            value={stats.due}
            suffix="₹"
            icon={Clock}
            color="from-slate-600 to-gray-700"
            delay={0.35}
            onClick={() => navigate('/clients-bill')}
          />
        </div>
      )}

      {/* Row 2: Chart Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mb-6">
        <Card className="glass-card overflow-hidden border-white/5 rounded-3xl">
          <CardHeader className="p-4 sm:px-6 py-3 pb-0">
            <CardTitle className="text-lg font-bold">Activity Trend</CardTitle>
            <CardDescription className="text-xs">
              Completed tasks, verified vouchers & invoices, closed notices (by activity date)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] px-4 sm:px-4 pt-2 pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ fontSize: '12px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', top: -10, right: 10 }}
                />
                {averageActivity > 0 && (
                  <ReferenceLine
                    y={averageActivity}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                  />
                )}
                <Bar dataKey="tasks" stackId="a" fill="#3b82f6" fillOpacity={0.9} radius={[4, 4, 0, 0]} barSize={32} maxBarSize={40} name="Tasks" />
                <Bar dataKey="vouchers" stackId="a" fill="#22c55e" fillOpacity={0.9} radius={[4, 4, 0, 0]} barSize={32} maxBarSize={40} name="Vouchers" />
                <Bar dataKey="invoices" stackId="a" fill="#eab308" fillOpacity={0.9} radius={[4, 4, 0, 0]} barSize={32} maxBarSize={40} name="Invoices" />
                <Bar dataKey="notices" stackId="a" fill="#ef4444" fillOpacity={0.9} radius={[4, 4, 0, 0]} barSize={32} maxBarSize={40} name="Notices">
                  <LabelList
                    dataKey="total"
                    position="top"
                    style={{ fill: '#9ca3af', fontSize: '10px' }}
                    formatter={(val) => val > 0 ? val : ''}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 3: 4 Detail Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pb-6">
        <DetailBlock
          title="Today's Progress"
          subtitle="Leaderboard of today's activities"
          count={detailBlocks.todayProgress.reduce((acc, curr) => acc + curr.col2, 0)}
          data={detailBlocks.todayProgress}
          columns={['S.No', 'Team Member', 'Items']}
          onViewMore={() => navigate('/dashboard/today-progress')}
          onRowClick={(row) => {
            const effectiveId = user.id ?? user.user_id;
            if (row.isCurrentUser || normalizeUserId(row.id) === normalizeUserId(effectiveId)) {
              navigate('/dashboard/today-progress', { state: { userId: effectiveId } });
            }
          }}
          currentUserId={user.id ?? user.user_id}
          currentUserName={user.full_name || user.name}
          currentUserEmail={user.email}
          delay={0.7}
        />
        <DetailBlock
          title="Pending Verification"
          subtitle="Items awaiting your approval"
          count={detailBlocks.pendingVerification.reduce((acc, curr) => acc + curr.col2, 0)}
          data={detailBlocks.pendingVerification}
          columns={['S.No', 'Entity', 'Pending']}
          onViewMore={() => navigate('/dashboard/pending-verification')}
          delay={0.8}
        />
        <DetailBlock
          title="Ongoing Tasks"
          subtitle="Open and active tasks"
          count={detailBlocks.ongoingTasks.reduce((acc, curr) => acc + curr.col2, 0)}
          data={detailBlocks.ongoingTasks}
          columns={['S.No', 'Entity', 'Tasks']}
          onViewMore={() => navigate('/dashboard/ongoing-tasks')}
          delay={0.9}
        />
        <DetailBlock
          title="Ongoing Notices"
          subtitle="Pending and active notices"
          count={detailBlocks.ongoingNotices.reduce((acc, curr) => acc + curr.col2, 0)}
          data={detailBlocks.ongoingNotices}
          columns={['S.No', 'Entity', 'Notices']}
          onViewMore={() => navigate('/dashboard/ongoing-notices')}
          delay={1.0}
        />
      </div>
    </div >
  );
};

export default AccountantDashboard;
