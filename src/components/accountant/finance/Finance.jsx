import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, Landmark } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getCATeamInvoices, getCATeamVouchers, getFinanceHeaders, getBeneficiaries } from '@/lib/api';
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
    if (isRefresh) setIsDataLoading(true);
    else setIsLoading(true);

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

      for (let i = 0; i < entityIdsToFetch.length; i++) {
        const invoiceResult = results[i * 2];
        const voucherResult = results[i * 2 + 1];

        if (invoiceResult.status === 'fulfilled' && Array.isArray(invoiceResult.value)) {
          allInvoices.push(...invoiceResult.value);
        }
        if (voucherResult.status === 'fulfilled' && Array.isArray(voucherResult.value)) {
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
      if (isRefresh) setIsDataLoading(false);
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
    setSelectedOrg(orgId);
    setSelectedEntity(null);
  };

  const handleViewVoucher = (voucher) => {
    const orgId = selectedOrg;
    const enrichedVoucher = enrichedVouchers.find(v => v.id === voucher.id);
    const organizationName = organisations.find(o => o.id === selectedOrg)?.name;
    const entityName = entities.find(e => e.id === selectedEntity)?.name;
    navigate(`/vouchers/${voucher.id}`, {
      state: { voucher: enrichedVoucher, organizationName, entityName, organisationId: orgId }
    });
  };

  const enrichedVouchers = useMemo(() => {
    if (!vouchers) return [];
    return vouchers.map(v => {
      const beneficiary = v.beneficiary || beneficiaries.find(b => b.id === v.beneficiary_id);
      const beneficiaryName = beneficiary
        ? (beneficiary.beneficiary_type === 'individual' ? beneficiary.name : beneficiary.company_name)
        : 'Unknown Beneficiary';
      return { ...v, beneficiary, beneficiaryName };
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
    const org = organisations.find(o => o.id === selectedOrg);
    exportVouchersToTallyXML(readyVouchers, org?.name || 'Company');
    toast({
      title: 'Export Successful',
      description: 'Ready vouchers have been exported to Tally XML format.',
    });
  };

  const handleTabChange = (tab) => {
    if (tab === 'vouchers') navigate('/finance');
    else navigate(`/finance/billings/${tab}`);
  };

  const renderContent = () => {
    const isLoadingState = (isLoading && !selectedOrg) || isDataLoading;
    if (isLoadingState) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      );
    }

    switch (activeTab) {
      case 'vouchers':
        return (
          <div className="bg-slate-900/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 h-full">
            {/* Voucher History Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-1">Voucher History</h2>
              <p className="text-gray-400 text-sm">Review all cash and debit transactions.</p>
            </div>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-xs">
                <Select
                  value={filterType}
                  onValueChange={setFilterType}
                >
                  <SelectTrigger className="w-full px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-600/30 transition-all flex items-center justify-between">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Types">All Types</SelectItem>
                    <SelectItem value="Debit">Debit</SelectItem>
                    <SelectItem value="Credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vouchers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
            </div>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Beneficiary</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Remarks</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-gray-400">
                      No vouchers found.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-gray-400">Page 1 of 0</p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-2 bg-slate-800/50 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700/50 transition-all"
                  onClick={() => toast({ title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀" })}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-2 bg-slate-800/50 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700/50 transition-all"
                  onClick={() => toast({ title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀" })}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        );
      case 'invoices':
        return (
          <InvoiceHistory
            invoices={invoices}
            onDeleteInvoice={() => toast({ title: "Note", description: "Deletion from this view is not supported." })}
            financeHeaders={financeHeaders}
            onRefresh={fetchDataForClient}
            isAccountantView={true}
          />
        );
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
        {/* HEADER BAR */}
        <div className="bg-[#101c36]/80 border-b border-[#23335c] px-2 sm:px-6 pt-4 pb-3 mb-0 flex flex-col gap-2">
          <div className="flex justify-between items-center w-full">
            <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-[#a18fff] to-[#5ad1ff] text-transparent bg-clip-text drop-shadow-md">
              Finance
            </h1>
            <div className="flex items-center gap-2">
              <Select value={selectedOrg || ''} onValueChange={handleOrganisationChange}>
                <SelectTrigger className="w-[160px] h-9 text-sm bg-[#1E2A47] text-white border border-[#23335c]">
                  <SelectValue placeholder="demo" />
                </SelectTrigger>
                <SelectContent>
                  {organisations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedEntity || ''}
                onValueChange={setSelectedEntity}
                disabled={!selectedOrg}
              >
                <SelectTrigger className="w-[160px] h-9 text-sm bg-[#1E2A47] text-white border border-[#23335c]">
                  <SelectValue placeholder="ddddddd" />
                </SelectTrigger>
                <SelectContent>
                  {entities.length > 1 && <SelectItem value="all">All Entities</SelectItem>}
                  {entities.map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchDataForClient(true)}
                disabled={isDataLoading || !selectedOrg}
                className="border border-[#23335c] bg-[#1E2A47] text-white hover:bg-[#23335c]"
              >
                <RefreshCw className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs section */}
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
        organisationBankAccounts={organisations.find(o => o.id === selectedOrg)?.bank_accounts || []}
        organisationId={selectedOrg}
        organizationName={organisations.find(o => o.id === selectedOrg)?.name}
        financeHeaders={financeHeaders}
      />
    </div>
  );
};

export default AccountantFinance;
