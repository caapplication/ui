import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { listOrganisations, listEntities } from '@/lib/api';
import Vouchers from './Vouchers';
import Invoices from './Invoices';

const FinancePage = () => {
  const [organisations, setOrganisations] = useState([]);
  const [entities, setEntities] = useState([]);
  const [selectedOrganisation, setSelectedOrganisation] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch organisations on mount
  const fetchInitialData = useCallback(async () => {
    if (!user?.access_token) return;
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
        description: `Failed to fetch initial data: ${error.message}`,
        variant: 'destructive',
      });
      setOrganisations([]);
    }
  }, [user?.access_token, toast]);

  // Fetch entities when organisation changes
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    const fetchEntities = async () => {
      if (selectedOrganisation) {
        try {
          const entityData = await listEntities(selectedOrganisation, user.access_token);
          setEntities(entityData || []);
          if (entityData.length > 1) {
            setSelectedEntity('all');
          } else if (entityData.length === 1) {
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
          setEntities([]);
        }
      }
    };
    fetchEntities();
  }, [selectedOrganisation, user.access_token, toast]);

  const handleOrganisationChange = (orgId) => {
    setSelectedOrganisation(orgId);
    setEntities([]);
    setSelectedEntity(null);
  };

  const handleRefresh = () => {
    setIsDataLoading(true);
    // This will trigger a refresh in child components via prop change
    setTimeout(() => setIsDataLoading(false), 500); // Simulate refresh
  };

  return (
    <div className="p-4 sm:p-8">
      {/* Header with title, dropdowns, and refresh on the same line */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-3xl sm:text-5xl font-bold text-white mb-0">Finances</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedOrganisation || ''} onValueChange={handleOrganisationChange}>
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
              <SelectValue placeholder="Select entity" />
            </SelectTrigger>
            <SelectContent>
              {entities.length > 1 && <SelectItem value="all">All Entities</SelectItem>}
              {entities.map(entity => (
                <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isDataLoading || !selectedOrganisation}>
            <RefreshCw className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      <Tabs defaultValue="vouchers" className="w-full">
        <div className="flex items-center justify-between mb-8">
          <TabsList className="inline-flex items-center justify-center gap-4 text-lg">
            <TabsTrigger value="vouchers" className="px-4 py-2 transition-all duration-300 ease-in-out">Vouchers</TabsTrigger>
            <TabsTrigger value="invoices" className="px-4 py-2 transition-all duration-300 ease-in-out">Invoices</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="vouchers">
          <Vouchers
            selectedOrganisation={selectedOrganisation}
            selectedEntity={selectedEntity}
            isDataLoading={isDataLoading}
            onRefresh={handleRefresh}
          />
        </TabsContent>
        <TabsContent value="invoices">
          <Invoices
            selectedOrganisation={selectedOrganisation}
            selectedEntity={selectedEntity}
            isDataLoading={isDataLoading}
            onRefresh={handleRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancePage;
