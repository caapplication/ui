import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { useOrganisation } from '@/hooks/useOrganisation';
import { getCATeamInvoices, getCATeamVouchers, updateInvoice, updateVoucher } from '@/lib/api';
import { listClientsByOrganization } from '@/lib/api/clients';
import Vouchers from './Vouchers';
import Invoices from './Invoices';
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
  const { user } = useAuth();
  const { toast } = useToast();

  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleExport = async () => {
    if (!selectedClient) {
      toast({
        title: 'Error',
        description: 'Please select a client to export.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const [invoices, vouchers] = await Promise.all([
        getCATeamInvoices(selectedClient, user.access_token),
        getCATeamVouchers(selectedClient, user.access_token),
      ]);

      const readyInvoices = invoices.filter(inv => inv.is_ready && !inv.is_exported);
      const readyVouchers = vouchers.filter(v => v.is_ready && !v.is_exported);

      if (readyInvoices.length === 0 && readyVouchers.length === 0) {
        toast({
          title: 'No Data to Export',
          description: 'There are no ready invoices or vouchers to export.',
        });
        return;
      }

      const exportData = [
        [
          'Voucher Date', 'Voucher Type Name', 'Voucher Number', 'Party A/c Name', 'Sales Ledger',
          'Item Amount', 'Total Invoice Value', 'Payment(Cash/UPI/Wallet)', 'Payment(Lakmo Coins)',
          'Balance', 'Other Ledger', 'Other Ledger Amount', 'CGST Ledger', 'CSGST Rate', 'CGST Amount',
          'UTST Ledger', 'UTGST Rate', 'UTGST Amount', 'Dr', 'Cr', 'Narataion', 'Place of Supply',
          'State', 'Country', 'Registration Type', 'GSTIN'
        ],
        ...readyInvoices.map(inv => [
          new Date(inv.date).toLocaleDateString(), 'Sales', inv.bill_number, inv.beneficiary.name, 'Sales',
          inv.amount, inv.amount + inv.cgst + inv.sgst + inv.igst, '', '', '', '', '', 'CGST', 9, inv.cgst,
          'UTGST', 9, inv.sgst, 'Dr', 'Cr', inv.remarks, '', '', 'India', 'Regular', ''
        ]),
        ...readyVouchers.map(v => [
          new Date(v.created_date).toLocaleDateString(), v.voucher_type, '', v.beneficiaryName, '',
          v.amount, v.amount, '', '', '', '', '', '', '', '', '', '', '', 'Dr', 'Cr', v.remarks, '', '', 'India', 'Regular', ''
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Accounting Voucher');
      XLSX.writeFile(wb, 'Sales Format.xlsx');

      await Promise.all([
        ...readyInvoices.map(inv => updateInvoice(inv.id, { is_exported: true }, user.access_token)),
        ...readyVouchers.map(v => updateVoucher(v.id, { is_exported: true }, user.access_token))
      ]);

      toast({
        title: 'Success',
        description: 'Data exported successfully.',
      });

      handleRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to export data: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

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
              {clients.length > 1 && <SelectItem value="all">All Clients</SelectItem>}
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isDataLoading || isOrgLoading || !selectedOrg}>
            <RefreshCw className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} />
          </Button>
          {user.role === 'CA_ACCOUNTANT' && (
            <Button onClick={handleExport} disabled={isDataLoading || !selectedClient}>
              Export to Tally
            </Button>
          )}
        </div>
      </div>
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
