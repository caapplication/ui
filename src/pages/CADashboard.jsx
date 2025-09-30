import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { listOrganisations, listEntities, getDashboardData } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const StatCard = ({ title, value, icon }) => (
  <Card className="glass-card card-hover">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">{value}</div>
    </CardContent>
  </Card>
);

const CADashboard = () => {
  const [organisations, setOrganisations] = useState([]);
  const [entities, setEntities] = useState([]);
  const [selectedOrganisation, setSelectedOrganisation] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchInitialData = useCallback(async () => {
    if (!user?.access_token) return;
    setIsLoading(true);
    try {
      const orgData = await listOrganisations(user.access_token);
      const sortedOrgs = (orgData || []).sort((a, b) => a.name.localeCompare(b.name));
      setOrganisations(sortedOrgs);
      if (sortedOrgs.length > 0) {
        setSelectedOrganisation(sortedOrgs[0].id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch organisations: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.access_token, toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    const fetchEntities = async () => {
      if (selectedOrganisation) {
        try {
          const entityData = await listEntities(selectedOrganisation, user.access_token);
          setEntities(entityData || []);
          if (entityData.length > 0) {
            setSelectedEntity(entityData[0].id);
          } else {
            setSelectedEntity(null);
          }
        } catch (error) {
          toast({
            title: 'Error',
            description: `Failed to fetch entities: ${error.message}`,
            variant: 'destructive',
          });
        }
      }
    };
    fetchEntities();
  }, [selectedOrganisation, user?.access_token, toast]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (selectedEntity) {
        try {
          const data = await getDashboardData(selectedEntity, user.access_token);
          setDashboardData(data);
        } catch (error) {
          toast({
            title: 'Error',
            description: `Failed to fetch dashboard data: ${error.message}`,
            variant: 'destructive',
          });
        }
      }
    };
    fetchDashboardData();
  }, [selectedEntity, user?.access_token, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="p-4 sm:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl sm:text-5xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Select value={selectedOrganisation || ''} onValueChange={setSelectedOrganisation}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Select an organisation" />
            </SelectTrigger>
            <SelectContent>
              {organisations.map(org => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedEntity || ''} onValueChange={setSelectedEntity} disabled={!selectedOrganisation}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Select an entity" />
            </SelectTrigger>
            <SelectContent>
              {entities.map(entity => (
                <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {dashboardData ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Vouchers" value={dashboardData.total_vouchers} />
          <StatCard title="Total Invoices" value={dashboardData.total_invoices} />
          <StatCard title="Total Beneficiaries" value={dashboardData.total_beneficiaries} />
          <StatCard title="Total Bank Accounts" value={dashboardData.total_bank_accounts} />
        </div>
      ) : (
        <div className="text-white">Select an entity to view dashboard data.</div>
      )}
    </motion.div>
  );
};

export default CADashboard;
