import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Plus,
  FileText,
  Banknote,
  ChevronDown,
  Loader2,
  RefreshCw,
  Download,
  Landmark,
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useNavigate,
  Routes,
  Route,
  useLocation,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import {
  HandoverTab,
  BankTallyListTab,
  BankTallyFormPage,
  CashTallyListTab,
  CashTallyFormPage,
  ReportTab,
  CashierReportListTab,
  CashierReportFormPage,
} from '@/pages/ClientHandoverPage';
import {
  getBeneficiaries,
  getInvoices,
  getInvoicesList,
  addInvoice,
  updateInvoice,
  deleteInvoice,
  addVoucher,
  updateVoucher,
  getVouchers,
  getVouchersList,
  deleteVoucher,
  exportVouchersToTallyXML,
} from '@/lib/api';
import { useOrganisation } from '@/hooks/useOrganisation';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import InvoiceForm from '@/components/finance/InvoiceForm';
import VoucherForm from '@/components/finance/VoucherForm';
import InvoiceHistory from '@/components/finance/InvoiceHistory';
import VoucherHistory from '@/components/finance/VoucherHistory';
import { InvoiceHistorySkeleton } from '@/components/finance/InvoiceHistorySkeleton';
import { VoucherHistorySkeleton } from '@/components/finance/VoucherHistorySkeleton';
import VoucherDetailsPage from '@/pages/VoucherDetailsPage';

// Global map to track active fetches across component remounts
const activeFetchPromises = new Map();

// Helper functions for localStorage caching
const getCache = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error('Failed to read from cache', e);
    return null;
  }
};

const setCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to write to cache', e);
  }
};

const ClientFinance = ({ entityId, quickAction, clearQuickAction, entityName: entityNameProp }) => {
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showVoucherDialog, setShowVoucherDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editingVoucher, setEditingVoucher] = useState(null);

  const [beneficiaries, setBeneficiaries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFetchingRef = useRef(false);
  const lastFetchedEntityId = useRef(null);
  const isMountedRef = useRef(true);

  const { user } = useAuth();
  const organizationId = useCurrentOrganization(entityId);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();


  const isAdmin = user?.role === 'CLIENT_MASTER_ADMIN';
  const path = location.pathname;
  const tabFromPath = path.replace(/^\/finance\/?/, '').split('/')[0] || 'vouchers';
  const allowedTabs = isAdmin
    ? ['vouchers', 'invoices', 'handover', 'bank-tally', 'cash-tally', 'report', 'cashier']
    : ['vouchers', 'invoices', 'cashier', 'handover', 'bank-tally', 'cash-tally', 'report'];
  const activeTab = allowedTabs.includes(tabFromPath) ? tabFromPath : 'vouchers';

  useEffect(() => {
    isMountedRef.current = true;

    if (location.state?.quickAction === 'add-invoice') {
      setShowInvoiceDialog(true);
    } else if (location.state?.quickAction === 'add-voucher') {
      setShowVoucherDialog(true);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [location.state]);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      const token = localStorage.getItem('accessToken');
      if (!organizationId || !token || !entityId) return;

      // Determine what to fetch based on active tab
      const shouldFetchInvoices = activeTab === 'invoices' || isRefresh;
      const shouldFetchVouchers = activeTab === 'vouchers' || isRefresh;

      // Cache Keys
      const CACHE_KEY_BENEFICIARIES = `fynivo_beneficiaries_${organizationId}`;
      const CACHE_KEY_INVOICES = `fynivo_invoices_${entityId}`;
      const CACHE_KEY_VOUCHERS = `fynivo_vouchers_${entityId}`;

      // 1. Try to load from cache immediately (Stale-while-revalidate)
      if (!isRefresh) {
        const cachedBeneficiaries = getCache(CACHE_KEY_BENEFICIARIES);
        const cachedInvoices = shouldFetchInvoices ? getCache(CACHE_KEY_INVOICES) : null;
        const cachedVouchers = shouldFetchVouchers ? getCache(CACHE_KEY_VOUCHERS) : null;

        if (isMountedRef.current) {
          if (cachedBeneficiaries && beneficiaries.length === 0) setBeneficiaries(cachedBeneficiaries);
          if (cachedInvoices && invoices.length === 0 && shouldFetchInvoices) setInvoices(cachedInvoices);
          if (cachedVouchers && vouchers.length === 0 && shouldFetchVouchers) setVouchers(cachedVouchers);
        }

        // If we have full cache for what we need, we can stop loading indicator (but continue fetch in background)
        const hasNeededData =
          (cachedBeneficiaries) &&
          (!shouldFetchInvoices || cachedInvoices) &&
          (!shouldFetchVouchers || cachedVouchers);

        if (hasNeededData) {
          // Data shown instantly!
          // We can optionally return here if we want "cache-first" strategy, but user said "click back... fraction of second"
          // usually implies showing cache. "stale-while-revalidate" updates it fresh.
          // If we want to avoid network call completely if cache exists (until refresh), we could return.
          // But usually keeping data fresh is better.
          // Given "multiple api calls" complaint, maybe they prefer "Cache First, Network Only on Refresh"?
          // Let's stick to Stale-While-Revalidate but make it silent (no loading spinner if cache exists).
        }
      }

      const fetchKey = `${organizationId}-${entityId}-${activeTab}`;

      // If a fetch is already in progress for this entity+tab (globally), reuse it
      if (activeFetchPromises.has(fetchKey) && !isRefresh) {
        // If we have cache, we don't need to show loading spinner for the piggy-back
        const hasCache = (shouldFetchInvoices && getCache(CACHE_KEY_INVOICES)) || (shouldFetchVouchers && getCache(CACHE_KEY_VOUCHERS));

        if (!hasCache) {
          if (isRefresh) setIsRefreshing(true);
          else setIsLoading(true);
        }

        try {
          const result = await activeFetchPromises.get(fetchKey);
          if (isMountedRef.current) {
            if (result.beneficiaries) {
              setBeneficiaries(result.beneficiaries);
              setCache(CACHE_KEY_BENEFICIARIES, result.beneficiaries);
            }
            if (result.invoices) {
              setInvoices(result.invoices);
              if (shouldFetchInvoices) setCache(CACHE_KEY_INVOICES, result.invoices);
            }
            if (result.vouchers) {
              setVouchers(result.vouchers);
              if (shouldFetchVouchers) setCache(CACHE_KEY_VOUCHERS, result.vouchers);
            }
          }
        } catch (error) {
          // Error handled by the original fetcher
        } finally {
          if (isMountedRef.current) {
            setIsLoading(false);
            setIsRefreshing(false);
          }
        }
        return;
      }

      lastFetchedEntityId.current = entityId;

      // Show loading only if we don't have cache (or if refreshing)
      const hasCache = (shouldFetchInvoices && getCache(CACHE_KEY_INVOICES)) || (shouldFetchVouchers && getCache(CACHE_KEY_VOUCHERS));
      if (isRefresh || !hasCache) {
        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);
      }

      const fetchWork = async () => {
        const promises = [];
        const beneficiariesPromise = getBeneficiaries(organizationId, token);
        const invoicesPromise = shouldFetchInvoices ? getInvoicesList(entityId, token) : Promise.resolve(null);
        const vouchersPromise = shouldFetchVouchers ? getVouchersList(entityId, token) : Promise.resolve(null);

        const [beneficiariesData, invoicesData, vouchersData] = await Promise.all([
          beneficiariesPromise,
          invoicesPromise,
          vouchersPromise
        ]);

        return {
          beneficiaries: beneficiariesData,
          invoices: invoicesData,
          vouchers: vouchersData
        };
      };

      const fetchPromise = fetchWork();

      if (!isRefresh) {
        activeFetchPromises.set(fetchKey, fetchPromise);
      }

      try {
        const result = await fetchPromise;

        if (isMountedRef.current) {
          if (result.beneficiaries) {
            setBeneficiaries(result.beneficiaries || []);
            setCache(CACHE_KEY_BENEFICIARIES, result.beneficiaries || []);
          }
          if (result.invoices) {
            setInvoices(result.invoices || []);
            if (shouldFetchInvoices) setCache(CACHE_KEY_INVOICES, result.invoices || []);
          }
          if (result.vouchers) {
            setVouchers(result.vouchers || []);
            if (shouldFetchVouchers) setCache(CACHE_KEY_VOUCHERS, result.vouchers || []);
          }
        }
      } catch (error) {
        if (isMountedRef.current) {
          toast({
            title: 'Error',
            description: `Failed to fetch finance data: ${error.message}`,
            variant: 'destructive',
          });
          // Only clear state if we failed to fetch
          if (shouldFetchInvoices) setInvoices([]);
          if (shouldFetchVouchers) setVouchers([]);
        }
      } finally {
        if (!isRefresh) {
          // Remove from active fetches after a short delay
          setTimeout(() => {
            activeFetchPromises.delete(fetchKey);
          }, 1000);
        }
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [organizationId, toast, entityId, activeTab, invoices.length, vouchers.length]
  );

  useEffect(() => {
    if (entityId) {
      fetchData();
    }
  }, [fetchData, entityId, activeTab]);

  const enrichedVouchers = useMemo(() => {
    return (vouchers || []).map((v) => {
      // Handle both full beneficiary object and list item format
      let beneficiaryName = 'Unknown Beneficiary';
      if (v.beneficiary_name) {
        beneficiaryName = v.beneficiary_name;
      } else if (v.beneficiary) {
        const beneficiary = v.beneficiary;
        beneficiaryName = beneficiary.beneficiary_type === 'individual'
          ? beneficiary.name
          : beneficiary.company_name;
      }
      return {
        ...v,
        beneficiaryName: beneficiaryName || 'Unknown Beneficiary',
      };
    });
  }, [vouchers]);

  const handleAddOrUpdateInvoice = async (invoiceData, invoiceId) => {
    const token = localStorage.getItem('accessToken');
    setIsMutating(true);
    try {
      if (invoiceId) {
        await updateInvoice(invoiceId, entityId, invoiceData, token);
        toast({ title: 'Success', description: 'Invoice updated successfully.' });
      } else {
        if (invoiceData instanceof FormData) {
          // Ensure entity_id is set (might already be set in InvoiceForm)
          if (!invoiceData.has('entity_id')) {
            invoiceData.append('entity_id', entityId);
          }
        }
        await addInvoice(invoiceData, token);
        toast({ title: 'Success', description: 'Invoice added successfully.' });
      }
      setShowInvoiceDialog(false);
      setEditingInvoice(null);

      if (location.state?.returnToDashboard) {
        navigate('/');
        return;
      }

      fetchData(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to save invoice: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddOrUpdateVoucher = async (voucherData, voucherId) => {
    const token = localStorage.getItem('accessToken');
    setIsMutating(true);
    try {
      if (voucherId) {
        await updateVoucher(voucherId, voucherData, token, entityId);
        toast({ title: 'Success', description: 'Voucher updated successfully.' });
      } else {
        await addVoucher(voucherData, token);
        toast({ title: 'Success', description: 'Voucher added successfully.' });
      }
      setShowVoucherDialog(false);
      setEditingVoucher(null);
      if (location.state?.returnToDashboard) {
        navigate('/');
        return;
      }
      fetchData(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to save voucher: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteInvoiceClick = async (invoiceId) => {
    const token = localStorage.getItem('accessToken');
    setIsMutating(true);
    try {
      await deleteInvoice(entityId, invoiceId, token);
      toast({ title: 'Success', description: 'Invoice deleted successfully.' });
      fetchData(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete invoice: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteVoucherClick = async (voucherId) => {
    const token = localStorage.getItem('accessToken');
    setIsMutating(true);
    try {
      await deleteVoucher(entityId, voucherId, token);
      toast({ title: 'Success', description: 'Voucher deleted successfully.' });
      fetchData(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete voucher: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleViewVoucher = (voucher, hasFilters, sortedFilteredVouchers) => {
    // Get entity name from user entities if available
    let entityName = 'N/A';
    if ((user?.role === 'CLIENT_USER' || user?.role === 'CLIENT_MASTER_ADMIN') && user.entities && entityId) {
      const entity = user.entities.find(e => e.id === entityId);
      if (entity) entityName = entity.name;
    }

    const vouchersListToPass = sortedFilteredVouchers || vouchers;

    navigate(`/finance/vouchers/${voucher.id}`, {
      state: {
        voucher,
        vouchers: vouchersListToPass,
        organisationId: user?.organization_id,
        entityName: entityName,
        organizationName: user?.organization_name || 'N/A'
      }
    });
  };

  const handleViewInvoice = (invoice, hasFilters, sortedFilteredInvoices) => {
    const invoicesListToPass = sortedFilteredInvoices || invoices;
    const currentIndex = invoicesListToPass.findIndex(inv => inv.id === invoice.id);
    const path = `/invoices/${invoice.id}`;

    navigate(path, { state: { invoice, invoices: invoicesListToPass, currentIndex } });
  };

  const handleExportToTally = async (format) => {
    const token = localStorage.getItem('accessToken');
    if (format === 'xml') {
      try {
        await exportVouchersToTallyXML(entityId, token);
        toast({
          title: 'Export Successful',
          description: 'Vouchers are being downloaded in Tally XML format.',
        });
      } catch (error) {
        toast({
          title: 'Export Failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Coming Soon',
        description: 'CSV/XLSX export is not yet implemented.',
      });
    }
  };

  const closeDialogs = () => {
    setShowInvoiceDialog(false);
    setEditingInvoice(null);
    setShowVoucherDialog(false);
    setEditingVoucher(null);

    if (location.state?.returnToDashboard) {
      navigate('/');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >

        <div className="page-header">
          <h1 className="page-title">Finance</h1>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => navigate(`/finance/${value}`)}
          className="w-full"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4 w-full">
            <div className="w-full">
              <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:flex h-auto md:h-11 items-center justify-start rounded-2xl md:rounded-full bg-white/5 p-1 text-gray-400 w-full md:w-fit gap-1">
                <TabsTrigger value="vouchers" className="px-4 py-2 rounded-xl md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all">Vouchers</TabsTrigger>
                <TabsTrigger value="invoices" className="px-4 py-2 rounded-xl md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all">Invoices</TabsTrigger>
                {isAdmin && (
                  <>
                    <TabsTrigger value="cashier" className="px-4 py-2 rounded-xl md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all">Cashier Report</TabsTrigger>
                    <TabsTrigger value="handover" className="px-4 py-2 rounded-xl md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all">Handover</TabsTrigger>
                    <TabsTrigger value="bank-tally" className="px-4 py-2 rounded-xl md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all text-nowrap">Bank Tally</TabsTrigger>
                    <TabsTrigger value="cash-tally" className="px-4 py-2 rounded-xl md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all text-nowrap">Cash Tally</TabsTrigger>
                    <TabsTrigger value="report" className="px-4 py-2 rounded-xl md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all">Report</TabsTrigger>
                  </>
                )}
                {!isAdmin && (user?.role === 'CLIENT_USER') && (
                  <>
                    <TabsTrigger value="cashier" className="px-4 py-2 rounded-xl md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all text-nowrap">Cashier Report</TabsTrigger>
                    <TabsTrigger value="handover" className="px-4 py-2 rounded-xl md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all">Handover</TabsTrigger>
                    <TabsTrigger value="bank-tally" className="px-4 py-2 rounded-xl md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all text-nowrap">Bank Tally</TabsTrigger>
                    <TabsTrigger value="cash-tally" className="px-4 py-2 rounded-xl md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all text-nowrap">Cash Tally</TabsTrigger>
                    <TabsTrigger value="report" className="px-4 py-2 rounded-xl md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all">Report</TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>

            {/* Refresh Button and Add Dropdown - only for vouchers/invoices */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className="h-11 w-11 min-w-[44px] rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 shadow-lg"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" className="h-11 px-8 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 flex-1 sm:flex-none font-semibold">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-gray-900 border-white/10 text-white rounded-2xl p-1">
                  <DropdownMenuItem onClick={() => setShowVoucherDialog(true)} className="hover:bg-white/10 cursor-pointer py-3 px-4 rounded-xl">
                    Voucher
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowInvoiceDialog(true)} className="hover:bg-white/10 cursor-pointer py-3 px-4 rounded-xl">
                    Invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/finance/bank-tally/new')}>
                    Bank Tally
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/finance/cash-tally/new')}>
                    Cash Tally
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/finance/cashier/new')}>
                    Cashier Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-4 sm:mt-6">
            <Routes>
              <Route path="/" element={<Navigate to="vouchers" replace />} />
              <Route
                path="vouchers"
                element={
                  isLoading ? (
                    <VoucherHistorySkeleton />
                  ) : (
                    <VoucherHistory
                      vouchers={enrichedVouchers}
                      onDeleteVoucher={handleDeleteVoucherClick}
                      onViewVoucher={handleViewVoucher}
                      onEditVoucher={(voucher) => console.log(voucher)}
                    />
                  )
                }
              />
              <Route
                path="invoices"
                element={
                  isLoading ? (
                    <InvoiceHistorySkeleton />
                  ) : (
                    <InvoiceHistory
                      invoices={invoices}
                      beneficiaries={beneficiaries}
                      onDeleteInvoice={handleDeleteInvoiceClick}
                      onEditInvoice={(invoice) => console.log(invoice)}
                      onViewInvoice={handleViewInvoice}
                    />
                  )
                }
              />
              {isAdmin && (
                <>
                  <Route path="cashier" element={<Outlet />}>
                    <Route index element={<CashierReportListTab clientId={entityId} token={user?.access_token} toast={toast} />} />
                    <Route path="new" element={<CashierReportFormPage clientId={entityId} token={user?.access_token} toast={toast} />} />
                    <Route path="entry/:reportDate" element={<CashierReportFormPage clientId={entityId} token={user?.access_token} toast={toast} />} />
                  </Route>
                  <Route path="handover" element={<HandoverTab clientId={entityId} token={user?.access_token} toast={toast} isAdminView userRole={user?.role} />} />
                  <Route path="bank-tally" element={<Outlet />}>
                    <Route index element={<BankTallyListTab clientId={entityId} token={user?.access_token} toast={toast} />} />
                    <Route path="new" element={<BankTallyFormPage clientId={entityId} token={user?.access_token} toast={toast} />} />
                    <Route path="entry/:reportDate" element={<BankTallyFormPage clientId={entityId} token={user?.access_token} toast={toast} />} />
                  </Route>
                  <Route path="cash-tally" element={<Outlet />}>
                    <Route index element={<CashTallyListTab clientId={entityId} entityId={entityId} token={user?.access_token} toast={toast} />} />
                    <Route path="new" element={<CashTallyFormPage clientId={entityId} entityId={entityId} token={user?.access_token} toast={toast} />} />
                    <Route path="entry/:reportDate" element={<CashTallyFormPage clientId={entityId} entityId={entityId} token={user?.access_token} toast={toast} />} />
                  </Route>
                  <Route path="report" element={<ReportTab clientId={entityId} entityId={entityId} entityName={entityNameProp} token={user?.access_token} toast={toast} />} />
                </>
              )}
              {!isAdmin && user?.role === 'CLIENT_USER' && (
                <>
                  <Route path="cashier" element={<Outlet />}>
                    <Route index element={<CashierReportListTab clientId={entityId} token={user?.access_token} toast={toast} />} />
                    <Route path="new" element={<CashierReportFormPage clientId={entityId} token={user?.access_token} toast={toast} />} />
                    <Route path="entry/:reportDate" element={<CashierReportFormPage clientId={entityId} token={user?.access_token} toast={toast} />} />
                  </Route>
                  <Route path="handover" element={<HandoverTab clientId={entityId} token={user?.access_token} toast={toast} userRole={user?.role} />} />
                  <Route path="bank-tally" element={<Outlet />}>
                    <Route index element={<BankTallyListTab clientId={entityId} token={user?.access_token} toast={toast} />} />
                    <Route path="new" element={<BankTallyFormPage clientId={entityId} token={user?.access_token} toast={toast} />} />
                    <Route path="entry/:reportDate" element={<BankTallyFormPage clientId={entityId} token={user?.access_token} toast={toast} />} />
                  </Route>
                  <Route path="cash-tally" element={<Outlet />}>
                    <Route index element={<CashTallyListTab clientId={entityId} entityId={entityId} token={user?.access_token} toast={toast} />} />
                    <Route path="new" element={<CashTallyFormPage clientId={entityId} entityId={entityId} token={user?.access_token} toast={toast} />} />
                    <Route path="entry/:reportDate" element={<CashTallyFormPage clientId={entityId} entityId={entityId} token={user?.access_token} toast={toast} />} />
                  </Route>
                  <Route path="report" element={<ReportTab clientId={entityId} entityId={entityId} entityName={entityNameProp} token={user?.access_token} toast={toast} />} />
                </>
              )}
            </Routes>
          </div>
        </Tabs>
      </motion.div>

      {/* 🔹 Invoice & Voucher Dialogs */}
      <Dialog open={showInvoiceDialog} onOpenChange={closeDialogs}>
        <InvoiceForm
          entityId={entityId}
          beneficiaries={beneficiaries}
          isLoading={isMutating}
          onSave={handleAddOrUpdateInvoice}
          onCancel={closeDialogs}
          invoice={editingInvoice}
          financeHeaders={[]}
        />
      </Dialog>

      <Dialog open={showVoucherDialog} onOpenChange={closeDialogs}>
        <VoucherForm
          entityId={entityId}
          beneficiaries={beneficiaries}
          isLoading={isMutating}
          onSave={handleAddOrUpdateVoucher}
          onCancel={closeDialogs}
          voucher={editingVoucher}
          financeHeaders={[]}
        />
      </Dialog>
    </div>
  );
};

export default ClientFinance;
