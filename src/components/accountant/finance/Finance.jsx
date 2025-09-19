import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, Landmark, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getCATeamInvoices, getCATeamVouchers, listOrganisations, listAllEntities, getFinanceHeaders, getBeneficiaries } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InvoiceHistory from '@/components/finance/InvoiceHistory';
import VoucherHistory from '@/components/finance/VoucherHistory';
import ViewVoucherDialog from '@/components/finance/ViewVoucherDialog.jsx';
import { exportVouchersToTallyXML } from '@/lib/api/finance';

const AccountantFinance = () => {
  const [activeTab, setActiveTab] = useState('vouchers');
  const [organisations, setOrganisations] = useState([]);
  const [entities, setEntities] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedOrganisation, setSelectedOrganisation] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isViewVoucherOpen, setIsViewVoucherOpen] = useState(false);
  const [financeHeaders, setFinanceHeaders] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const filteredEntities = useMemo(() => {
    if (!selectedOrganisation || !entities) return [];
    return entities.filter(e => e.organization_id === selectedOrganisation);
  }, [selectedOrganisation, entities]);

  const fetchInitialData = useCallback(async () => {
    if (!user?.access_token) return;
    setIsLoading(true);
    try {
      const [orgData, entityData, headersData, beneficiariesData] = await Promise.all([
        listOrganisations(user.access_token),
        listAllEntities(user.access_token),
        getFinanceHeaders(user.agency_id, user.access_token),
        getBeneficiaries(user.access_token)
      ]);
      const sortedOrgs = (orgData || []).sort((a, b) => a.name.localeCompare(b.name));
      setOrganisations(sortedOrgs);
      setEntities(entityData || []);
      setFinanceHeaders(headersData || []);
      setBeneficiaries(beneficiariesData || []);
      if (sortedOrgs.length > 0) {
        const firstOrgId = sortedOrgs[0].id;
        setSelectedOrganisation(firstOrgId);
        const firstOrgEntities = (entityData || []).filter(e => e.organization_id === firstOrgId);
        if (firstOrgEntities.length > 0) {
          setSelectedEntity(firstOrgEntities[0].id);
        } else {
          setSelectedEntity(firstOrgId); // Fallback to org id if no entities
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch initial data: ${error.message}`,
        variant: 'destructive',
      });
      setOrganisations([]);
      setEntities([]);
      setFinanceHeaders([]);
      setBeneficiaries([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.access_token, user?.agency_id, toast]);

  const fetchDataForClient = useCallback(async (isRefresh = false) => {
    if (!selectedEntity || !user?.access_token) return;
    if (isRefresh) {
        setIsDataLoading(true);
    } else {
        setIsLoading(true);
    }
    
    let entityIdsToFetch = [];
    if (selectedEntity === 'all') {
      entityIdsToFetch = filteredEntities.map(e => e.id);
    } else {
      entityIdsToFetch = [selectedEntity];
    }
    
    if (entityIdsToFetch.length === 0 && selectedOrganisation) {
        entityIdsToFetch = [selectedOrganisation];
    }

    try {
        const fetchPromises = entityIdsToFetch.flatMap(id => [
            getCATeamInvoices(id, user.access_token),
            getCATeamVouchers(id, user.access_token)
        ]);
        
        const results = await Promise.allSettled(fetchPromises);

        const allInvoices = [];
        const allVouchers = [];

        for(let i = 0; i < entityIdsToFetch.length; i++) {
            const invoiceResult = results[i*2];
            const voucherResult = results[i*2 + 1];

            if(invoiceResult.status === 'fulfilled' && Array.isArray(invoiceResult.value)) {
                allInvoices.push(...invoiceResult.value);
            }
             if(voucherResult.status === 'fulfilled' && Array.isArray(voucherResult.value)) {
                allVouchers.push(...voucherResult.value);
            }
        }
        
      setInvoices(allInvoices);
      setVouchers(allVouchers);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch finance data for client: ${error.message}`,
        variant: 'destructive',
      });
      setInvoices([]);
      setVouchers([]);
    } finally {
        if(isRefresh) setIsDataLoading(false);
        else setIsLoading(false);
    }
  }, [selectedEntity, user?.access_token, toast, filteredEntities, selectedOrganisation]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (selectedEntity || (selectedOrganisation && filteredEntities.length === 0)) {
      fetchDataForClient();
    }
  }, [selectedEntity, selectedOrganisation, filteredEntities.length, fetchDataForClient]);

  const handleOrganisationChange = (orgId) => {
    setSelectedOrganisation(orgId);
    const orgEntities = entities.filter(e => e.organization_id === orgId);
    if (orgEntities.length > 0) {
      setSelectedEntity(orgEntities[0].id);
    } else {
      setSelectedEntity(orgId); // Fallback to org id
    }
  };

  const handleViewVoucher = (voucher) => {
    setSelectedVoucher(voucher);
    setIsViewVoucherOpen(true);
  };

  const enrichedVouchers = useMemo(() => {
    if (!vouchers) return [];
    return vouchers.map(v => {
      const beneficiary = v.beneficiary || beneficiaries.find(b => b.id === v.beneficiary_id);
      const beneficiaryName = beneficiary 
          ? (beneficiary.beneficiary_type === 'individual' ? beneficiary.name : beneficiary.company_name) 
          : 'Unknown Beneficiary';
      return {
        ...v,
        beneficiary,
        beneficiaryName,
      }
    });
  }, [vouchers, beneficiaries]);

  const handleExportToTally = () => {
    if (vouchers.length === 0) {
      toast({
        title: 'No Vouchers',
        description: 'There are no vouchers to export.',
        variant: 'destructive',
      });
      return;
    }
    const org = organisations.find(o => o.id === selectedOrganisation);
    exportVouchersToTallyXML(vouchers, org?.name || 'Company');
    toast({
      title: 'Export Successful',
      description: 'Vouchers have been exported to Tally XML format.',
    });
  };

  if (isLoading && !organisations.length) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
               <Landmark className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-5xl font-bold text-white">Finance</h1>
              <p className="text-muted-foreground">Review client invoices and vouchers.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
             <Button variant="outline" onClick={handleExportToTally} disabled={vouchers.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export to Tally
            </Button>
            <Select value={selectedOrganisation || ''} onValueChange={handleOrganisationChange}>
                <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                    {organisations.length > 0 ? (
                        organisations.map(org => (
                            <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                        ))
                    ) : (
                        <SelectItem value="no-clients" disabled>No clients found</SelectItem>
                    )}
                </SelectContent>
            </Select>
            <Select value={selectedEntity || ''} onValueChange={setSelectedEntity} disabled={!selectedOrganisation || filteredEntities.length === 0}>
                <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Select an entity" />
                </SelectTrigger>
                <SelectContent>
                    {filteredEntities.length > 1 && <SelectItem value="all">All Entities</SelectItem>}
                    {filteredEntities.map(entity => (
                        <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                    ))}
                    {filteredEntities.length === 0 && selectedOrganisation && <SelectItem value={selectedOrganisation} disabled>Main Organisation</SelectItem>}
                </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => fetchDataForClient(true)} disabled={isDataLoading || !selectedOrganisation}>
              <RefreshCw className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="glass-tab-list">
              <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>
          
          <TabsContent value="vouchers">
             {(isLoading && !selectedOrganisation) || isDataLoading ? (
               <div className="flex justify-center items-center h-64">
                 <Loader2 className="w-8 h-8 animate-spin text-white" />
               </div>
             ) : (
                <VoucherHistory 
                  vouchers={enrichedVouchers}
                  onDeleteVoucher={() => toast({ title: "Note", description: "Deletion from this view is not supported."})}
                  onViewVoucher={handleViewVoucher}
                  financeHeaders={financeHeaders}
                  onRefresh={fetchDataForClient}
                />
             )}
          </TabsContent>

          <TabsContent value="invoices">
            {(isLoading && !selectedOrganisation) || isDataLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            ) : (
              <InvoiceHistory 
                invoices={invoices}
                onDeleteInvoice={() => toast({ title: "Note", description: "Deletion from this view is not supported."})}
                financeHeaders={financeHeaders}
                onRefresh={fetchDataForClient}
              />
            )}
          </TabsContent>
      </Tabs>
      </motion.div>
      {selectedVoucher && (
        <ViewVoucherDialog
          isOpen={isViewVoucherOpen}
          onOpenChange={setIsViewVoucherOpen}
          voucher={selectedVoucher}
          beneficiary={selectedVoucher.beneficiary}
        />
      )}
    </div>
  );
};

export default AccountantFinance;