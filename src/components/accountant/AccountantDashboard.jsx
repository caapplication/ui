import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth.jsx';
import { CheckCircle, Clock, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const StatCard = ({ title, value, label, color, delay }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}>
      <Card className="glass-card card-hover overflow-hidden h-full">
        <CardContent className="pt-6">
          <div className={`text-4xl font-bold ${color}`}>{value}</div>
          <p className="text-sm font-medium text-white mt-1">{title}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const TaskSummaryItem = ({ task, value, progress, color }) => (
    <div className="flex items-center space-x-4">
        <p className="flex-1 text-gray-300">{task}</p>
        <div className="w-24">
            <Progress value={progress} indicatorClassName={color} />
        </div>
        <p className="w-10 text-right font-semibold text-white">{value}</p>
    </div>
);


const AccountantDashboard = () => {
    const { user } = useAuth();

    const stats = [
        { title: 'Due', value: '0', label: 'Today', color: 'text-yellow-400' },
        { title: 'Due', value: '0', label: 'Tomorrow', color: 'text-blue-400' },
        { title: 'Due', value: '0', label: 'In 7 days', color: 'text-green-400' },
        { title: 'Overdue', value: '0', label: 'Up to 7 days', color: 'text-orange-400' },
        { title: 'Overdue', value: '231', label: '>7 days', color: 'text-red-500' },
    ];
    
    const taskSummary = {
        pending: 228,
        hold: 14,
        inProgress: 0,
        completed: 2319,
    };
    
    const totalTasks = taskSummary.pending + taskSummary.hold + taskSummary.inProgress + taskSummary.completed;

    return (
        <div className="p-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-5xl font-bold text-white">Dashboard</h1>
                        <p className="text-gray-400 mt-1">Welcome back, {user?.name}!</p>
                    </div>
                </header>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
                    {stats.map((stat, index) => (
                        <StatCard key={index} {...stat} delay={index * 0.1} />
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="glass-card lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <TaskSummaryItem task="Income Tax Return" value="177" progress={40} color="bg-blue-500" />
                                <TaskSummaryItem task="Monthly GSTR-1" value="9" progress={10} color="bg-green-500" />
                                <TaskSummaryItem task="Monthly GSTR-3B" value="20" progress={25} color="bg-yellow-500" />
                                <TaskSummaryItem task="Quarterly GSTR-1" value="5" progress={5} color="bg-purple-500" />
                                <TaskSummaryItem task="Tax Audit" value="11" progress={15} color="bg-red-500" />
                                <TaskSummaryItem task="CMP-08" value="1" progress={2} color="bg-indigo-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Task Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 text-white">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-yellow-400"/>
                                        <span>Pending</span>
                                    </div>
                                    <span className="font-bold">{taskSummary.pending}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-gray-400"/>
                                        <span>Hold</span>
                                    </div>
                                    <span className="font-bold">{taskSummary.hold}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-blue-400"/>
                                        <span>In-Progress</span>
                                    </div>
                                    <span className="font-bold">{taskSummary.inProgress}</span>
                                </div>
                                 <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-400"/>
                                        <span>Completed</span>
                                    </div>
                                    <span className="font-bold">{taskSummary.completed}</span>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-white">
                                <span>Need to complete tasks</span>
                                <span className="text-2xl font-bold text-blue-400">{totalTasks - taskSummary.completed}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </motion.div>
        </div>
    );
};

export default AccountantDashboard;