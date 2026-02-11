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
  getCATeamInvoicesBulk,
  getCATeamVouchersBulk,
  listTasks,
  getNotices
} from '@/lib/api';
import { useOrganisation } from "@/hooks/useOrganisation";

const StatCard = ({ title, value, description, icon, color, delay, trend, meta, hideValue, suffix = "" }) => {
  const Icon = icon;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}>
      <Card className="glass-card card-hover overflow-hidden h-full relative group rounded-3xl border-white/5">
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

const DetailBlock = ({ title, subtitle, count, data, columns, onViewMore, delay }) => {
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
                data.slice(0, 8).map((row, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 items-center text-sm py-2 hover:bg-white/5 transition-all rounded px-1 group cursor-default border-b border-white/5 last:border-0"
                  >
                    <div className="col-span-2 text-gray-400 font-mono text-xs">
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="col-span-6 text-white truncate pr-2 group-hover:scale-[1.01] transition-transform origin-left text-xs sm:text-sm">
                      {row.col1}
                    </div>
                    <div className="col-span-4 text-right text-red-100 font-semibold text-xs sm:text-sm">
                      {typeof row.col2 === 'number' ? row.col2.toLocaleString() : row.col2}
                    </div>
                  </div>
                ))
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

      if (organisationId) {
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
      if (user.organizations && user.organizations.length > 0) {
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

      // 2. Fetch Historical Trend Data (Last 15 Days)
      const [invoices, vouchers, tasks, notices] = await Promise.all([
        entityIds.length > 0 ? getCATeamInvoicesBulk(entityIds, token).catch(() => []) : Promise.resolve([]),
        entityIds.length > 0 ? getCATeamVouchersBulk(entityIds, token).catch(() => []) : Promise.resolve([]),
        listTasks(agencyId, token).catch(() => []),
        getNotices(null, token).catch(() => [])
      ]);

      const tasksList = Array.isArray(tasks) ? tasks : (tasks?.items || []);
      const noticesList = notices || [];

      // Filter tasks and notices by entityIds
      const filteredTasks = tasksList.filter(t => entityIds.includes(t.entity_id) || entityIds.includes(t.client_id));
      const filteredNotices = noticesList.filter(n => entityIds.includes(n.entity_id) || entityIds.includes(n.client_id));

      // Compute Revenue & Due from actual invoice/voucher data
      const totalRevenue = 0;
      const totalDue = 0;

      setStats({
        myClients: Array.isArray(clientsData) ? clientsData.length : (clientsData?.results?.length || 0),
        clientUsers: Array.isArray(clientUsersData) ? clientUsersData.length : 0,
        myTeam: Array.isArray(teamData) ? teamData.length : 0,
        services: Array.isArray(servicesData) ? servicesData.length : 0,
        revenue: totalRevenue,
        due: totalDue
      });

      // Process Trend Data
      const last15Days = [];
      for (let i = 14; i >= 0; i--) {
        const date = subDays(startOfDay(new Date()), i);
        last15Days.push({
          date,
          name: format(date, 'MMM dd'),
          tasks: 0,
          vouchers: 0,
          invoices: 0,
          notices: 0,
          total: 0
        });
      }

      const processItems = (items, key, dateKey = 'created_at') => {
        items.forEach(item => {
          const rawDate = item[dateKey] || item.created_at || item.created_date;
          if (!rawDate) return;
          const itemDate = startOfDay(new Date(rawDate));
          const day = last15Days.find(d => d.date.getTime() === itemDate.getTime());
          if (day) {
            day[key]++;
            day.total++;
          }
        });
      };

      processItems(filteredTasks, 'tasks', 'created_at');
      processItems(vouchers.filter(v => v.status === 'pending_ca_approval'), 'vouchers', 'date');
      processItems(invoices.filter(i => i.status === 'pending_ca_approval'), 'invoices', 'date');
      processItems(filteredNotices, 'notices', 'created_at');

      setChartData(last15Days);
      const totalActivity = last15Days.reduce((sum, day) => sum + day.total, 0);
      setAverageActivity(totalActivity / 15);

      // 3. Process Detail Blocks
      const entityMap = relevantEntities.reduce((acc, e) => ({ ...acc, [e.id]: e.name, [String(e.id)]: e.name }), {});
      const teamMap = teamData.reduce((acc, t) => ({ ...acc, [t.user_id || t.id]: t.full_name || t.name || 'Unknown' }), {});
      const today = startOfDay(new Date());

      const getEntityCounts = (items, filterFn = () => true) => {
        const counts = items.filter(filterFn).reduce((acc, item) => {
          const eId = item.entity_id || item.client_id || item.entity;
          if (eId && eId !== 'undefined' && eId !== 'null') {
            acc[eId] = (acc[eId] || 0) + 1;
          }
          return acc;
        }, {});
        return Object.entries(counts)
          .map(([id, count]) => ({ col1: entityMap[id] || `Entity ${id}`, col2: count }))
          .sort((a, b) => b.col2 - a.col2);
      };


      const getTodayUserProgress = () => {
        const allItems = [
          ...filteredTasks.filter(t => t.status !== 'completed'),
          ...vouchers.filter(v => v.status === 'pending_ca_approval'),
          ...invoices.filter(i => i.status === 'pending_ca_approval'),
          ...filteredNotices.filter(n => n.status !== 'closed')
        ];
        const counts = allItems
          .filter(item => {
            const date = item.created_at || item.created_date || item.date;
            return date && startOfDay(new Date(date)).getTime() === today.getTime();
          })
          .reduce((acc, item) => {
            const userId = item.created_by_id || item.created_by;
            if (userId) acc[userId] = (acc[userId] || 0) + 1;
            return acc;
          }, {});
        return Object.entries(counts)
          .map(([id, count]) => ({ col1: teamMap[id] || 'Team Member', col2: count }))
          .sort((a, b) => b.col2 - a.col2);
      };

      // Pending verification: invoices + vouchers awaiting CA approval
      const pendingItems = [
        ...invoices.filter(i => i.status === 'pending_ca_approval'),
        ...vouchers.filter(v => v.status === 'pending_ca_approval')
      ];

      setDetailBlocks({
        todayProgress: getTodayUserProgress(),
        pendingVerification: getEntityCounts(pendingItems),
        ongoingTasks: getEntityCounts(filteredTasks, t => t.status !== 'completed'),
        ongoingNotices: getEntityCounts(filteredNotices, n => n.status !== 'closed')
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

      {/* Row 1: 6 Metric Cards */}
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
          />
          <StatCard
            title="DUE"
            value={stats.due}
            suffix="₹"
            icon={Clock}
            color="from-slate-600 to-gray-700"
            delay={0.35}
          />
        </div>
      )}

      {/* Row 2: Chart Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mb-6">
        <Card className="glass-card overflow-hidden border-white/5 rounded-3xl">
          <CardHeader className="p-4 sm:px-6 py-3 pb-0">
            <CardTitle className="text-lg font-bold">Activity Trend</CardTitle>
            <CardDescription className="text-xs">Daily items processed (Invoices + Vouchers + Tasks)</CardDescription>
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
          subtitle="Recent activities recorded today"
          count={detailBlocks.todayProgress.reduce((acc, curr) => acc + curr.col2, 0)}
          data={detailBlocks.todayProgress}
          columns={['S.No', 'Team Member', 'Items']}
          onViewMore={() => navigate('/dashboard/today-progress')}
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
