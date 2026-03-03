import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building,
  Users,
  UserCheck,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalAgencies: 0,
    totalCAs: 0,
    activeUsers: 0,
    newUsersToday: 0
  });

  // Mock stats for now until actual stats API is available
  useEffect(() => {
    setStats({
      totalAgencies: 12,
      totalCAs: 45,
      activeUsers: 128,
      newUsersToday: 3
    });
  }, []);

  const chartData = [
    { name: "Jan", agencies: 4 },
    { name: "Feb", agencies: 6 },
    { name: "Mar", agencies: 8 },
    { name: "Apr", agencies: 10 },
    { name: "May", agencies: 12 },
    { name: "Jun", agencies: 15 },
  ];

  const recentActivities = [
    { id: 1, action: "New CA Accountant registered", time: "2 hours ago", location: "New Delhi, India", status: "Success" },
    { id: 2, action: "Agency subscription renewed", time: "5 hours ago", location: "Mumbai, India", status: "Success" },
    { id: 3, action: "System backup completed", time: "1 day ago", location: "Server", status: "Info" },
  ];

  const statCards = [
    {
      title: 'Total Agencies',
      value: stats.totalAgencies,
      icon: Building,
      color: 'from-blue-500 to-indigo-600',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'Active CAs',
      value: stats.totalCAs,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      trend: '+5%',
      trendUp: true
    },
    {
      title: 'System Users',
      value: stats.activeUsers,
      icon: UserCheck,
      color: 'from-green-500 to-emerald-600',
      trend: '+18%',
      trendUp: true
    },
    {
      title: 'Active Today',
      value: stats.newUsersToday,
      icon: Activity,
      color: 'from-amber-500 to-orange-500',
      trend: '-2%',
      trendUp: false
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      <div>
        <div className="flex items-center space-x-4 mb-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white break-words">System Overview</h1>
        </div>
        <p className="text-gray-400">Welcome back, {user?.name}. Here's what's happening across the platform.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-4 lg:gap-4 xl:gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card card-hover overflow-hidden h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-gray-300">
                    {stat.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center shadow-lg shadow-black/20 flex-shrink-0`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                      {stat.value}
                    </div>
                    <div className={`${!stat.trendUp ? 'text-red-500' : 'text-green-500'}`}>
                      {stat.trendUp ? (
                        <ArrowUpRight className="w-6 h-6" />
                      ) : (
                        <ArrowDownRight className="w-6 h-6" />
                      )}
                    </div>
                  </div>
                  <p className={`text-xs mt-1 ${!stat.trendUp ? 'text-red-500' : 'text-green-500'}`}>
                    {stat.trend} vs last month
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-4 xl:gap-8">
        <Card className="glass-card overflow-hidden border-white/5">
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl">
              <Activity className="w-5 h-5 text-primary" />
              Recent System Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Activity</TableHead>
                    <TableHead className="text-xs sm:text-sm">Location</TableHead>
                    <TableHead className="text-xs sm:text-sm">Time</TableHead>
                    <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-primary" />
                          <span className="font-medium">{activity.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">{activity.location}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{activity.time}</TableCell>
                      <TableCell>
                        <Badge
                          variant={activity.status === 'Success' ? 'success' : 'secondary'}
                        >
                          {activity.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card card-hover border-white/5">
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl">
              <Building className="w-5 h-5 text-blue-500" />
              Agency Growth
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0, 0, 0, 0.8)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    itemStyle={{ color: "#fff" }}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  <Bar dataKey="agencies" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default SuperAdminDashboard;
