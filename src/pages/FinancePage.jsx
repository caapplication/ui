import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { useOrganisation } from '@/hooks/useOrganisation';
import { getCATeamInvoices, getCATeamVouchers, updateInvoice, updateVoucher, getEntityIndicators } from '@/lib/api';
import { listClientsByOrganization } from '@/lib/api/clients';
import Vouchers from './Vouchers';
import Invoices from './Invoices';
import ExportTallyModal from '@/components/finance/ExportTallyModal';
import * as XLSX from 'xlsx';

const FinancePage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const tabParam = params.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'invoices' ? 'invoices' : 'vouchers');
  const {
    organisations,
    selectedOrg,
    setSelectedOrg,
    loading: isOrgLoading,
  } = useOrganisation();

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [entityIndicators, setEntityIndicators] = useState({}); // { "entity_id": { has_finance_pending, has_notice_unread } }
  const { user } = useAuth();
  const { toast } = useToast();

  const [refreshKey, setRefreshKey] = useState(0);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleRefresh = () => {
    setIsDataLoading(true);
    // Trigger refresh by updating key - this will force child components to refetch
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setIsDataLoading(false), 500);
  };

  // Fetch clients when selectedOrg changes
  useEffect(() => {
    const fetchClients = async () => {
      if (selectedOrg && user?.access_token) {
        try {
          // Use the specific endpoint for fetching clients by organization
          const fetchedClients = await listClientsByOrganization(selectedOrg, user.access_token);
          setClients(fetchedClients || []);

          // Auto-select first client if available and none selected (or if switching orgs)
          if (fetchedClients?.length > 0) {
            // Check if previously selected client is in the new list, otherwise select first
            // Since we allow switching orgs, it's safer to always default to first or keep if exists
            // For simplicity and to ensure validity, let's select the first one if the current one isn't found
            //   setSelectedClient(fetchedClients[0].id);
            // Logic to persist selection could be added here similar to useOrganisation
            const storedClientId = localStorage.getItem('finance_selectedClientId');
            if (storedClientId && fetchedClients.some(c => c.id === storedClientId)) {
              setSelectedClient(storedClientId);
            } else {
              // Always default to first client, never 'all' or null if clients exist
              setSelectedClient(fetchedClients[0].id);
            }
          } else {
            setSelectedClient(null);
          }
        } catch (error) {
          console.error('Failed to fetch clients:', error);
          toast({
            title: 'Error',
            description: 'Failed to fetch clients for the selected organization.',
            variant: 'destructive',
          });
          setClients([]);
          setSelectedClient(null);
        }
      } else {
        setClients([]);
        setSelectedClient(null);
      }
    };

    fetchClients();
  }, [selectedOrg, user?.access_token, toast]);

  // Update localStorage when selectedClient changes
  useEffect(() => {
    if (selectedClient) {
      localStorage.setItem('finance_selectedClientId', selectedClient);
    }
  }, [selectedClient]);

  // Fetch entity indicators (finance pending, notices unread) for dropdown dots
  useEffect(() => {
    const fetchIndicators = async () => {
      if (clients.length > 0 && user?.access_token) {
        try {
          console.log('FinancePage: Fetching indicators for clients:', clients.length);
          const indicators = await getEntityIndicators(user.access_token);
          console.log('FinancePage: Fetched entity indicators:', indicators);
          console.log('FinancePage: Clients:', clients.map(c => ({ id: String(c.id), name: c.name })));
          
          // Normalize entity IDs to strings for comparison
          const normalizedIndicators = {};
          Object.keys(indicators || {}).forEach(key => {
            normalizedIndicators[String(key)] = indicators[key];
          });
          
          console.log('FinancePage: Normalized indicators:', normalizedIndicators);
          setEntityIndicators(normalizedIndicators);
        } catch (error) {
          console.error('FinancePage: Failed to fetch entity indicators:', error);
          setEntityIndicators({});
        }
      } else {
        console.log('FinancePage: Skipping indicator fetch - clients:', clients.length, 'token:', !!user?.access_token);
      }
    };
    fetchIndicators();
    // Refresh indicators every 30 seconds
    const interval = setInterval(fetchIndicators, 30000);
    return () => clearInterval(interval);
  }, [clients, user?.access_token]);

  // Refresh when returning from detail page
  useEffect(() => {
    // If we are on the finance page
    if (location.pathname === '/finance' || location.pathname === '/finance/ca') {
      // We can trigger a refresh. Since Vouchers component now ignores cache (due to my previous edit), 
      // simply remounting or passing a new key is enough.
      // The handleRefresh updates 'refreshKey', which is passed to Vouchers key.
      handleRefresh();
    }
  }, [location.pathname]); // Run when pathname changes (e.g. back navigation)

  // handleExport logic removed as it's now handled by the modal


  return (
    <div className="p-4 sm:p-8">
      {/* Header with title, dropdowns, and refresh on the same line */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-3xl sm:text-5xl font-bold text-white mb-0">Finances</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedOrg || ''} onValueChange={setSelectedOrg} disabled={isOrgLoading}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={isOrgLoading ? "Loading..." : "Select an organisation"} />
            </SelectTrigger>
            <SelectContent>
              {organisations.map(org => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedClient || ''} onValueChange={setSelectedClient} disabled={isOrgLoading || !selectedOrg}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={!clients.length ? "No clients found" : "Select client"} />
            </SelectTrigger>
            <SelectContent>
              {clients.map(client => {
                const entityIdStr = String(client.id);
                const indicator = entityIndicators[entityIdStr];
                const hasNotification = indicator && (indicator.has_finance_pending || indicator.has_notice_unread);
                
                // Debug logging
                if (hasNotification) {
                  console.log(`FinancePage: Client ${client.name} (${entityIdStr}) has notification:`, indicator);
                }
                
                return (
                  <SelectItem 
                    key={client.id} 
                    value={client.id}
                    className={hasNotification ? "relative !pr-8" : "relative"}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="flex-1 truncate">{client.name}</span>
                      {hasNotification && (
                        <span 
                          className="w-2 h-2 rounded-full bg-amber-400 border border-[#1e293b] flex-shrink-0" 
                          aria-hidden="true"
                          style={{ minWidth: '8px', minHeight: '8px' }}
                        />
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isDataLoading || isOrgLoading || !selectedOrg}>
            <RefreshCw className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} />
          </Button>
          {user.role === 'CA_ACCOUNTANT' && (
            <Button onClick={() => setIsExportModalOpen(true)} disabled={isDataLoading || !selectedClient}>
              Export to Tally
            </Button>
          )}
        </div>
      </div>

      {/* Export Modal */}
      <ExportTallyModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        entityId={selectedClient}
        entityName={clients.find(c => c.id === selectedClient)?.name}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-8">
          <TabsList className="inline-flex items-center justify-center gap-4 text-lg">
            <TabsTrigger value="vouchers" className="px-4 py-2 transition-all duration-300 ease-in-out">Vouchers</TabsTrigger>
            <TabsTrigger value="invoices" className="px-4 py-2 transition-all duration-300 ease-in-out">Invoices</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="vouchers">
          <Vouchers
            key={`vouchers-${refreshKey}-${activeTab}`}
            selectedOrganisation={selectedOrg}
            selectedEntity={selectedClient}
            isDataLoading={isDataLoading || isOrgLoading}
            onRefresh={handleRefresh}
            isActive={activeTab === 'vouchers'}
            entities={clients}
          />
        </TabsContent>
        <TabsContent value="invoices">
          <Invoices
            key={`invoices-${refreshKey}`}
            selectedOrganisation={selectedOrg}
            selectedEntity={selectedClient}
            isDataLoading={isDataLoading || isOrgLoading}
            onRefresh={handleRefresh}
            isActive={activeTab === 'invoices'}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancePage;
