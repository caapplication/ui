import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building,
  Users,
  UserCheck,
  Activity,
  TrendingUp,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth.jsx';

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

  const statCards = [
    {
      title: 'Total Agencies',
      value: stats.totalAgencies,
      icon: Building,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'Active CAs',
      value: stats.totalCAs,
      icon: Users,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      trend: '+5%',
      trendUp: true
    },
    {
      title: 'System Users',
      value: stats.activeUsers,
      icon: UserCheck,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      trend: '+18%',
      trendUp: true
    },
    {
      title: 'Active Today',
      value: stats.newUsersToday,
      icon: Activity,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      trend: '-2%',
      trendUp: false
    },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">System Overview</h1>
        <p className="text-gray-400">Welcome back, {user?.name}. Here's what's happening across the platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-effect border-white/5 hover:border-white/10 transition-colors cursor-default">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="flex items-center text-xs">
                    {stat.trendUp ? (
                      <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                    )}
                    <span className={stat.trendUp ? 'text-green-500' : 'text-red-500'}>
                      {stat.trend}
                    </span>
                    <span className="text-gray-500 ml-1">vs last month</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="glass-effect border-white/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent System Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">New CA Accountant registered</p>
                    <p className="text-xs text-gray-500">2 hours ago • New Delhi, India</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-500" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-white/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-500" />
              Agency Growth
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center text-gray-500 italic">
            Chart visualization will be here...
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
