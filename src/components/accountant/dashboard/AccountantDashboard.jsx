import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users, UserCheck, Briefcase, Landmark, Banknote, ListTodo, Bell, FileWarning, Eye, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, ReferenceLine, LabelList } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import {
  listClients,
  listClientsByOrganization,
  listAllClientUsers,
  listTeamMembers,
  listServices,
  getAccountantDashboardStats,
  listAllEntities,
  getCATeamInvoicesBulk,
  getCATeamVouchersBulk,
  listTasks,
  getNotices
} from '@/lib/api';

const StatCard = ({ title, value, icon, color, delay, suffix = "" }) => {
  const Icon = icon;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}>
      <Card className="glass-card card-hover overflow-hidden h-full relative group rounded-3xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 group-hover:scale-110 transition-transform">
              <Icon className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white">
              {suffix && <span className="text-xl mr-1">{suffix}</span>}
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const DetailBlock = ({ title, subtitle, count, data, columns, onViewMore, delay }) => {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay }}>
      <Card className="glass-pane h-full flex flex-col relative overflow-hidden rounded-3xl">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-bold text-white">{title}</CardTitle>
              <CardDescription className="text-gray-400 text-xs mt-1">{subtitle}</CardDescription>
            </div>
            <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/30">
              {count}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/5">
                {columns.map((col, idx) => (
                  <TableHead key={idx} className={`text-gray-400 text-xs py-2 ${idx === columns.length - 1 ? 'text-right pr-6' : 'pl-6'}`}>
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-4 text-gray-500 text-sm">No records found</TableCell>
                </TableRow>
              ) : (
                data.slice(0, 5).map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-white/5 border-white/5 transition-colors group">
                    <TableCell className="py-2 text-white text-sm font-medium pl-6">
                      <span className="text-gray-500 mr-2">{idx + 1}.</span>
                      {row.col1}
                    </TableCell>
                    <TableCell className="py-2 text-right pr-6">
                      <span className="text-white font-bold">{row.col2}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <div className="p-4 pt-2 mt-auto border-t border-white/5">
          <Button variant="ghost" className="w-full text-primary hover:text-primary/80 hover:bg-primary/10 rounded-xl group transition-all" onClick={onViewMore}>
            View more
            <TrendingUp className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

const AccountantDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

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

      const [clientUsersData, teamData, servicesData, financeStats] = await Promise.all([
        listAllClientUsers(token).catch(() => []),
        listTeamMembers(token).catch(() => []),
        listServices(agencyId, token).catch(() => []),
        getAccountantDashboardStats(token).catch(() => null)
      ]);

      setStats({
        myClients: Array.isArray(clientsData) ? clientsData.length : (clientsData?.results?.length || 0),
        clientUsers: Array.isArray(clientUsersData) ? clientUsersData.length : 0,
        myTeam: Array.isArray(teamData) ? teamData.length : 0,
        services: Array.isArray(servicesData) ? servicesData.length : 0,
        revenue: financeStats?.total_revenue || 0,
        due: financeStats?.total_due || 0
      });

      // 2. Fetch Historical Trend Data (Last 7 Days)
      const entities = await listAllEntities(token).catch(() => []);
      const entityIds = entities.map(e => e.id);

      const [invoices, vouchers, tasks, notices] = await Promise.all([
        entityIds.length > 0 ? getCATeamInvoicesBulk(entityIds, token).catch(() => []) : Promise.resolve([]),
        entityIds.length > 0 ? getCATeamVouchersBulk(entityIds, token).catch(() => []) : Promise.resolve([]),
        listTasks(agencyId, token).catch(() => ({ items: [] })),
        getNotices(null, token).catch(() => [])
      ]);

      const tasksList = tasks.items || [];
      const noticesList = notices || [];

      // Process Trend Data
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(startOfDay(new Date()), i);
        last7Days.push({
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
          const itemDate = startOfDay(new Date(item[dateKey] || item.created_date));
          const day = last7Days.find(d => d.date.getTime() === itemDate.getTime());
          if (day) {
            day[key]++;
            day.total++;
          }
        });
      };

      processItems(tasksList, 'tasks');
      processItems(vouchers, 'vouchers');
      processItems(invoices, 'invoices');
      processItems(noticesList, 'notices');

      setChartData(last7Days);
      const totalActivity = last7Days.reduce((sum, day) => sum + day.total, 0);
      setAverageActivity(totalActivity / 7);

      // 3. Process Detail Blocks
      const entityMap = entities.reduce((acc, e) => ({ ...acc, [e.id]: e.name, [String(e.id)]: e.name }), {});
      const teamMap = teamData.reduce((acc, t) => ({ ...acc, [t.user_id || t.id]: t.full_name || t.name || 'Unknown' }), {});
      const today = startOfDay(new Date());

      const getEntityCounts = (items, filterFn = () => true) => {
        const counts = items.filter(filterFn).reduce((acc, item) => {
          const eId = item.entity_id || item.entity;
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
        const allItems = [...tasksList, ...vouchers, ...invoices, ...noticesList];
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

      setDetailBlocks({
        todayProgress: getTodayUserProgress(),
        pendingVerification: getEntityCounts(vouchers, v => !v.is_verified && v.status !== 'REJECTED'),
        ongoingTasks: getEntityCounts(tasksList, t => t.status !== 'CLOSED' && t.status !== 'COMPLETED'),
        ongoingNotices: getEntityCounts(noticesList, n => n.status !== 'CLOSED' && n.status !== 'RESOLVED')
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
    <div className="p-6 md:p-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-bold text-white tracking-tight">Welcome, {user?.full_name || user?.name || 'Area'}</h1>
          <p className="text-gray-400 mt-1">Real-time overview of your accounting consultancy performance.</p>
        </motion.div>
      </div>

      {/* Row 1: 6 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard title="My Clients" value={stats.myClients} icon={Landmark} color="from-sky-500 to-indigo-500" delay={0.1} />
        <StatCard title="Client Users" value={stats.clientUsers} icon={Users} color="from-emerald-500 to-teal-500" delay={0.2} />
        <StatCard title="My Team" value={stats.myTeam} icon={UserCheck} color="from-violet-500 to-purple-500" delay={0.3} />
        <StatCard title="Services" value={stats.services} icon={Briefcase} color="from-amber-500 to-orange-500" delay={0.4} />
        <StatCard title="Revenue" value={stats.revenue} suffix="₹" icon={Banknote} color="from-rose-500 to-pink-500" delay={0.5} />
        <StatCard title="Due" value={stats.due} suffix="₹" icon={Clock} color="from-gray-500 to-slate-500" delay={0.6} />
      </div>

      {/* Row 2: Chart Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}>
        <Card className="glass-pane overflow-hidden border-white/5 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="text-primary w-6 h-6" />
              Daily Activity Completion
            </CardTitle>
            <CardDescription className="text-gray-400">Sum of Tasks, Vouchers, Invoices, and Notices completed per day.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ fontSize: '13px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />

                {averageActivity > 0 && (
                  <ReferenceLine
                    y={averageActivity}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{ position: 'right', value: 'Avg', fill: '#f59e0b', fontSize: 10 }}
                  />
                )}

                <Bar dataKey="tasks" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} barSize={32} name="Tasks" />
                <Bar dataKey="vouchers" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={32} name="Vouchers" />
                <Bar dataKey="invoices" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} barSize={32} name="Invoices" />
                <Bar dataKey="notices" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={32} name="Notices">
                  <LabelList
                    dataKey="total"
                    position="top"
                    style={{ fill: '#9ca3af', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(val) => val > 0 ? val : ''}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 3: 4 Detail Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-8">
        <DetailBlock
          title="Today's Progress"
          subtitle="Sum of completed activities in a day"
          count={detailBlocks.todayProgress.reduce((acc, curr) => acc + curr.col2, 0)}
          data={detailBlocks.todayProgress}
          columns={['# Team Member', 'Completed']}
          onViewMore={() => navigate('/team-members')}
          delay={0.8}
        />
        <DetailBlock
          title="Pending Verification"
          subtitle="Bills & Vouchers pending review"
          count={detailBlocks.pendingVerification.reduce((acc, curr) => acc + curr.col2, 0)}
          data={detailBlocks.pendingVerification}
          columns={['# Entity', 'Pending']}
          onViewMore={() => navigate('/finance/approvals')}
          delay={0.9}
        />
        <DetailBlock
          title="Ongoing Tasks"
          subtitle="Open tasks currently in progress"
          count={detailBlocks.ongoingTasks.reduce((acc, curr) => acc + curr.col2, 0)}
          data={detailBlocks.ongoingTasks}
          columns={['# Entity', 'Task']}
          onViewMore={() => navigate('/tasks')}
          delay={1.0}
        />
        <DetailBlock
          title="Ongoing Notices"
          subtitle="Unresolved notices across entities"
          count={detailBlocks.ongoingNotices.reduce((acc, curr) => acc + curr.col2, 0)}
          data={detailBlocks.ongoingNotices}
          columns={['# Entity', 'Notice']}
          onViewMore={() => navigate('/notices')}
          delay={1.1}
        />
      </div >
    </div >
  );
};

export default AccountantDashboard;
