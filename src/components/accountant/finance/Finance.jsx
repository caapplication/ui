import React, { useState, useEffect, useCallback, useMemo } from 'react';
    import { motion } from 'framer-motion';
    import { Loader2, RefreshCw, Landmark, Download } from 'lucide-react';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
    import { useAuth } from '@/hooks/useAuth.jsx';
    import { useToast } from '@/components/ui/use-toast';
    import { getCATeamInvoices, getCATeamVouchers, listAllEntities, getFinanceHeaders, getBeneficiaries } from '@/lib/api';
    import { useOrganisation } from '@/hooks/useOrganisation';
    import { Button } from '@/components/ui/button';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import InvoiceHistory from '@/components/finance/InvoiceHistory';
    import VoucherHistory from '@/components/finance/VoucherHistory';
    import ViewVoucherDialog from '@/components/finance/ViewVoucherDialog.jsx';
    import { exportVouchersToTallyXML } from '@/lib/api/finance';
    import { useLocation, useNavigate } from 'react-router-dom';

    const AccountantFinance = () => {
      const location = useLocation();
      const navigate = useNavigate();
      const {
        organisations,
        selectedOrg,
        setSelectedOrg,
        entities,
        selectedEntity,
        setSelectedEntity,
        loading: orgLoading,
        organisationId,
      } = useOrganisation();
      const [beneficiaries, setBeneficiaries] = useState([]);
      
      const [invoices, setInvoices] = useState([]);
      const [vouchers, setVouchers] = useState([]);
      const [selectedVoucher, setSelectedVoucher] = useState(null);
      const [isViewVoucherOpen, setIsViewVoucherOpen] = useState(false);
      const [financeHeaders, setFinanceHeaders] = useState([]);

      const [isLoading, setIsLoading] = useState(false);
      const [isDataLoading, setIsDataLoading] = useState(false);
      const { user } = useAuth();
      const { toast } = useToast();

      const activeTab = useMemo(() => {
        if (location.pathname.includes('invoices')) return 'invoices';
        if (location.pathname.includes('receipts')) return 'receipts';
        if (location.pathname.includes('quotations')) return 'quotations';
        if (location.pathname.includes('expenses')) return 'expenses';
        if (location.pathname.includes('credit-notes')) return 'credit-notes';
        return 'vouchers';
      }, [location.pathname]);


      const fetchInitialData = useCallback(async () => {
        if (!user?.access_token) return;
        try {
          const headersData = await getFinanceHeaders(user.agency_id, user.access_token);
          setFinanceHeaders(headersData || []);
        } catch (error) {
          toast({
            title: 'Error',
            description: `Failed to fetch finance headers: ${error.message}`,
            variant: 'destructive',
          });
          setFinanceHeaders([]);
        }
      }, [user?.access_token, user?.agency_id, toast]);

      const fetchDataForClient = useCallback(async (isRefresh = false) => {
        if (!organisationId || !user?.access_token) {
            setInvoices([]);
            setVouchers([]);
            setBeneficiaries([]);
            return;
        }
        if (isRefresh) {
            setIsDataLoading(true);
        } else {
            setIsLoading(true);
        }
        
        let entityIdsToFetch = [];
        if (selectedEntity === 'all') {
          entityIdsToFetch = entities.map(e => e.id);
        } else {
          entityIdsToFetch = [selectedEntity];
        }
        
        if (entityIdsToFetch.length === 0) {
            entityIdsToFetch = entities.map(e => e.id);
        }

        try {
            const [beneficiariesData, ...results] = await Promise.all([
                getBeneficiaries(organisationId, user.access_token),
                ...entityIdsToFetch.flatMap(id => [
                    getCATeamInvoices(id, user.access_token),
                    getCATeamVouchers(id, user.access_token)
                ])
            ]);
            
            setBeneficiaries(beneficiariesData || []);

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
      }, [selectedEntity, user?.access_token, toast, entities, organisationId]);

      useEffect(() => {
        fetchInitialData();
      }, [fetchInitialData]);


      useEffect(() => {
        if (selectedEntity) {
          fetchDataForClient();
        }
      }, [selectedEntity, fetchDataForClient]);


      const handleOrganisationChange = (orgId) => {
        setSelectedOrganisation(orgId);
        setEntities([]);
        setSelectedEntity(null);
      };

      const handleViewVoucher = (voucher) => {
        const organisationId = selectedOrganisation;
        const enrichedVoucher = enrichedVouchers.find(v => v.id === voucher.id);
        const organizationName = organisations.find(o => o.id === selectedOrganisation)?.name;
        const entityName = entities.find(e => e.id === selectedEntity)?.name;
        navigate(`/vouchers/${voucher.id}`, { state: { voucher: enrichedVoucher, organizationName, entityName, organisationId } });
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
        const readyVouchers = vouchers.filter(v => v.is_ready);
        if (readyVouchers.length === 0) {
          toast({
            title: 'No Vouchers Ready',
            description: 'There are no vouchers marked as ready for export.',
            variant: 'destructive',
          });
          return;
        }
        const org = organisations.find(o => o.id === selectedOrganisation);
        exportVouchersToTallyXML(readyVouchers, org?.name || 'Company');
        toast({
          title: 'Export Successful',
          description: 'Ready vouchers have been exported to Tally XML format.',
        });
      };

      const handleTabChange = (tab) => {
        if (tab === 'vouchers') {
          navigate('/finance');
        } else {
          navigate(`/finance/billings/${tab}`);
        }
      };

      const renderContent = () => {
        const isLoadingState = (isLoading && !selectedOrganisation) || isDataLoading;
        if (isLoadingState) {
          return (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          );
        }

        switch (activeTab) {
          case 'vouchers':
            return <VoucherHistory 
                      vouchers={enrichedVouchers}
                      onDeleteVoucher={() => toast({ title: "Note", description: "Deletion from this view is not supported."})}
                      onViewVoucher={handleViewVoucher}
                      financeHeaders={financeHeaders}
                      onRefresh={fetchDataForClient}
                      isAccountantView={true}
                    />;
          case 'invoices':
            return <InvoiceHistory 
                      invoices={invoices}
                      onDeleteInvoice={() => toast({ title: "Note", description: "Deletion from this view is not supported."})}
                      financeHeaders={financeHeaders}
                      onRefresh={fetchDataForClient}
                      isAccountantView={true}
                    />;
          default:
            return (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-lg font-semibold text-gray-300">Coming Soon!</p>
                <p className="text-gray-400 mt-2">This section is under construction.</p>
              </div>
            );
        }
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
                        <SelectValue placeholder="Select an entity" />
                    </SelectTrigger>
                    <SelectContent>
                        {entities.length > 1 && <SelectItem value="all">All Entities</SelectItem>}
                        {entities.map(entity => (
                            <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => fetchDataForClient(true)} disabled={isDataLoading || !selectedOrganisation}>
                  <RefreshCw className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="glass-tab-list">
                  <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="receipts">Receipts</TabsTrigger>
                  <TabsTrigger value="quotations">Quotations</TabsTrigger>
                  <TabsTrigger value="expenses">Expenses</TabsTrigger>
                  <TabsTrigger value="credit-notes">Credit Notes</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab} className="mt-4">
                {renderContent()}
              </TabsContent>
          </Tabs>
          </motion.div>
          <ViewVoucherDialog
            isOpen={isViewVoucherOpen}
            onOpenChange={setIsViewVoucherOpen}
            voucher={selectedVoucher}
            beneficiary={beneficiaries.find(b => b.id === selectedVoucher?.beneficiary_id)}
            organisationBankAccounts={organisations.find(o => o.id === selectedOrganisation)?.bank_accounts || []}
            organisationId={selectedOrganisation}
            organizationName={organisations.find(o => o.id === selectedOrganisation)?.name}
            financeHeaders={financeHeaders}
          />
        </div>
      );
    };
    export default AccountantFinance;