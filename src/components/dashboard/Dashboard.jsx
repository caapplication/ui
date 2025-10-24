import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Banknote, Landmark, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast.js';
import { getDashboardData } from '@/lib/api.js';

const StatCard = ({ title, value, description, icon, color, delay }) => {
  const Icon = icon;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}>
      <Card className="glass-card card-hover overflow-hidden h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
          <div className={`w-10 h-10 bg-gradient-to-r ${color} rounded-lg flex items-center justify-center shadow-lg shadow-black/20`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-white">{value}</div>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const TransactionItem = ({ transaction }) => {
    const isCredit = transaction.voucher_type === 'cash';
    const amount = parseFloat(transaction.amount).toFixed(2);
    return (
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-300">
            <div>
                <p className="text-white font-medium capitalize">{transaction.remarks || `${transaction.voucher_type} voucher`}</p>
                <p className="text-gray-400 text-sm">{new Date(transaction.created_date).toLocaleDateString()}</p>
            </div>
            <div className={`font-semibold text-lg ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
                ₹{amount}
            </div>
        </div>
    );
};


const Dashboard = ({ entityId, entityName, onQuickAction, organisationBankAccounts }) => {
    const [dashboardData, setDashboardData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();

    const fetchDashboardData = useCallback(async () => {
        if (!entityId || !user?.access_token) return;
        setIsLoading(true);
        try {
            const data = await getDashboardData(entityId, user.access_token, user.agency_id);
            setDashboardData(data);
        } catch (error) {
            toast({
                title: 'Error fetching dashboard data',
                description: error.message,
                variant: 'destructive',
            });
            setDashboardData(null);
        } finally {
            setIsLoading(false);
        }
    }, [entityId, user?.access_token, toast]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const stats = dashboardData ? [
        { title: 'Vouchers', value: dashboardData.voucher_count, description: 'Total recorded vouchers', icon: Banknote, color: 'from-purple-500 to-indigo-600' },
        { title: 'Beneficiaries', value: dashboardData.beneficiary_count, description: 'Active beneficiaries', icon: Users, color: 'from-sky-500 to-cyan-500' },
        { title: 'Invoices', value: dashboardData.invoice_count, description: 'Total invoices', icon: FileText, color: 'from-violet-500 to-fuchsia-500' },
        { title: 'Bank Accounts', value: organisationBankAccounts.length, description: 'Organization bank accounts', icon: Landmark, color: 'from-amber-500 to-orange-500' }
      ] : [];
  
  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center space-x-4 mb-10">
            <h1 className="text-5xl font-bold text-white">{entityName}</h1>
        </div>
        
        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-12 h-12 animate-spin text-white" />
            </div>
        ) : (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                {stats.map((stat, index) => (
                    <StatCard key={stat.title} {...stat} delay={index * 0.1} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="glass-card lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>Your latest financial activities for {entityName}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {dashboardData?.recent_vouchers?.length > 0 ? (
                                dashboardData.recent_vouchers.map((transaction) => (
                                    <TransactionItem key={transaction.id} transaction={transaction} />
                                ))
                            ) : (
                                <div className="text-center py-10 text-gray-400">
                                    No recent transactions found.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Frequently used features</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                        { label: 'Add Beneficiary', icon: Users, action: 'add-beneficiary' },
                        { label: 'Add Invoice', icon: FileText, action: 'add-invoice' },
                        { label: 'Add Voucher', icon: Banknote, action: 'add-voucher' },
                        { label: 'Add Org. Bank', icon: Landmark, action: 'add-organisation-bank' }
                        ].map((action) => {
                        const Icon = action.icon;
                        return (
                            <motion.button
                            key={action.label}
                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                            whileTap={{ scale: 0.95 }}
                            className="p-4 bg-white/10 rounded-lg border border-white/20 transition-all duration-300 text-center flex flex-col items-center justify-center space-y-2 h-28"
                            onClick={() => onQuickAction(action.action)}
                            >
                            <Icon className="w-7 h-7 text-sky-400" />
                            <p className="text-white text-sm font-medium text-center">{action.label}</p>
                            </motion.button>
                        );
                        })}
                    </div>
                    </CardContent>
                </Card>
            </div>
        </>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
