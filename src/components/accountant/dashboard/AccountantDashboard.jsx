import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Briefcase, UserCheck, FileText, Loader2, FileWarning, FileCheck2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { startOfWeek, startOfMonth, subDays, format, differenceInDays } from 'date-fns';
import { useOrganisation } from '@/hooks/useOrganisation';
import { listExpiringDocuments } from '@/lib/api/documents';

const StatCard = ({ title, value, active, inactive, icon, color, delay }) => {
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
          <div className="text-xs text-gray-400 mt-1 flex gap-4">
            <span className="text-green-400">Active: {active}</span>
            <span className="text-red-400">Inactive: {inactive}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const FinanceTable = ({ data, type, onRowClick }) => {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-gray-400">No {type} found.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>{type === 'invoices' ? 'Bill No.' : 'Beneficiary'}</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(item => (
          <TableRow key={item.id} className="hover:bg-white/5">
            <TableCell>{new Date(item.date || item.created_date).toLocaleDateString()}</TableCell>
            <TableCell>{type === 'invoices' ? item.bill_number : item.beneficiaryName}</TableCell>
            <TableCell>₹{parseFloat(item.amount).toFixed(2)}</TableCell>
            <TableCell>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_ready ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {item.is_ready ? 'Closed' : 'Pending'}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" onClick={() => onRowClick(item)}>
                <Eye className="w-4 h-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const AccountantDashboard = () => {
  const { user } = useAuth();
  const { selectedEntity } = useOrganisation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    clients: { total: 0, active: 0, inactive: 0 },
    services: { total: 0, active: 0, inactive: 0 },
    team: { total: 0, active: 0, inactive: 0 },
    documents: { total: 0 },
  });
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [expiringDocs, setExpiringDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    // Using dummy data to render the dashboard as requested.
    setIsLoading(true);
    setStats({
      clients: { total: 25, active: 20, inactive: 5 },
      services: { total: 10, active: 8, inactive: 2 },
      team: { total: 12, active: 12, inactive: 0 },
      documents: { total: 150 },
    });
    setInvoices([
      { id: '1', date: new Date(), bill_number: 'INV-2024-001', amount: '5000.00', is_ready: false, beneficiaryName: 'Innovate Inc.' },
      { id: '2', date: subDays(new Date(), 10), bill_number: 'INV-2024-002', amount: '12500.00', is_ready: true, beneficiaryName: 'Tech Solutions Ltd.' },
    ]);
    setVouchers([
      { id: '1', created_date: new Date(), beneficiaryName: 'Office Supplies Co.', amount: '1200.00', is_ready: false },
      { id: '2', created_date: subDays(new Date(), 5), beneficiaryName: 'Cloud Services Provider', amount: '3500.00', is_ready: true },
    ]);

    // Fetch Expiring Documents
    const fetchExpiring = async () => {
      if (user?.access_token) {
        try {
          const docs = await listExpiringDocuments(user.access_token);
          setExpiringDocs(docs || []);
        } catch (error) {
          console.error("Failed to fetch expiring documents:", error);
        }
      }
    };
    fetchExpiring();

    setIsLoading(false);
    toast({ title: 'Dashboard Loaded', description: 'Data refreshed successfully.' });
  }, [toast, user]);

  const filterByTime = (data, filter) => {
    if (filter === 'all') return data;
    const now = new Date();
    let startDate;
    if (filter === 'week') {
      startDate = startOfWeek(now);
    } else if (filter === 'month') {
      startDate = startOfMonth(now);
    } else if (filter === '3months') {
      startDate = subDays(now, 90);
    }
    return data.filter(item => new Date(item.date || item.created_date) >= startDate);
  };

  const { pendingInvoices, closedInvoices, pendingVouchers, closedVouchers } = useMemo(() => {
    const filteredInvoices = filterByTime(invoices, timeFilter);
    const filteredVouchers = filterByTime(vouchers, timeFilter);
    return {
      pendingInvoices: filteredInvoices.filter(i => !i.is_ready),
      closedInvoices: filteredInvoices.filter(i => i.is_ready),
      pendingVouchers: filteredVouchers.filter(v => !v.is_ready),
      closedVouchers: filteredVouchers.filter(v => v.is_ready),
    };
  }, [invoices, vouchers, timeFilter]);

  const handleViewItem = (item, type) => {
    if (type === 'invoices') {
      navigate(`/invoices/${item.id}`);
    } else if (type === 'vouchers') {
      navigate(`/vouchers/ca/${item.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold text-white mb-8">
        Welcome, {user?.name}
      </motion.h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
        <StatCard title="Clients" value={stats.clients.total} active={stats.clients.active} inactive={stats.clients.inactive} icon={Users} color="from-sky-500 to-cyan-500" delay={0.1} />
        <StatCard title="Services" value={stats.services.total} active={stats.services.active} inactive={stats.services.inactive} icon={Briefcase} color="from-violet-500 to-fuchsia-500" delay={0.2} />
        <StatCard title="Team Members" value={stats.team.total} active={stats.team.active} inactive={stats.team.inactive} icon={UserCheck} color="from-emerald-500 to-green-500" delay={0.3} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <Card className="glass-card card-hover overflow-hidden h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Documents</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-black/20">
                <FileText className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">{stats.documents.total}</div>
              <p className="text-xs text-gray-400 mt-1">Total files and folders</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">

        {/* Financial Overview - Spanning 2 columns */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="lg:col-span-2">
          <Card className="glass-pane h-full">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl">Financial Overview</CardTitle>
                  <CardDescription>Track pending and closed invoices & vouchers.</CardDescription>
                </div>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pending"><FileWarning className="w-4 h-4 mr-2" />Pending</TabsTrigger>
                  <TabsTrigger value="closed"><FileCheck2 className="w-4 h-4 mr-2" />Closed</TabsTrigger>
                </TabsList>
                <TabsContent value="pending">
                  <h3 className="text-lg font-semibold my-4">Pending Invoices</h3>
                  <FinanceTable data={pendingInvoices} type="invoices" onRowClick={(item) => handleViewItem(item, 'invoices')} />
                  <h3 className="text-lg font-semibold my-4 pt-4 border-t border-white/10">Pending Vouchers</h3>
                  <FinanceTable data={pendingVouchers} type="vouchers" onRowClick={(item) => handleViewItem(item, 'vouchers')} />
                </TabsContent>
                <TabsContent value="closed">
                  <h3 className="text-lg font-semibold my-4">Closed Invoices</h3>
                  <FinanceTable data={closedInvoices} type="invoices" onRowClick={(item) => handleViewItem(item, 'invoices')} />
                  <h3 className="text-lg font-semibold my-4 pt-4 border-t border-white/10">Closed Vouchers</h3>
                  <FinanceTable data={closedVouchers} type="vouchers" onRowClick={(item) => handleViewItem(item, 'vouchers')} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Expiring Documents Widget */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45 }} className="lg:col-span-1">
          <Card className="glass-pane h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-yellow-500" />
                Expiring Documents
              </CardTitle>
              <CardDescription>Documents expiring within 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {expiringDocs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No documents expiring soon.</div>
              ) : (
                <div className="space-y-4">
                  {expiringDocs.map(doc => {
                    const daysLeft = differenceInDays(new Date(doc.expiry_date), new Date());
                    return (
                      <div key={doc.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/documents?folderId=${doc.folder_id || 'root'}&clientId=${doc.entity_id || ''}`)}>
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                            <p className={`text-xs ${daysLeft < 5 ? 'text-red-400' : 'text-yellow-400'}`}>
                              {daysLeft < 0
                                ? `Expired ${Math.abs(daysLeft)} days ago`
                                : `Expires in ${daysLeft} days`} ({format(new Date(doc.expiry_date), 'dd MMM')})
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-4 h-4 text-gray-400" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div >
  );
};

export default AccountantDashboard;
