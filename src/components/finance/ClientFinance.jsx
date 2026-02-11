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
} from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
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

const ClientFinance = ({ entityId, quickAction, clearQuickAction }) => {
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


  const activeTab = location.pathname.includes('/invoices')
    ? 'invoices'
    : 'vouchers';

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

  const handleViewVoucher = (voucher, hasFilters) => {
    // Get entity name from user entities if available
    let entityName = 'N/A';
    if ((user?.role === 'CLIENT_USER' || user?.role === 'CLIENT_MASTER_ADMIN') && user.entities && entityId) {
      const entity = user.entities.find(e => e.id === entityId);
      if (entity) entityName = entity.name;
    }

    if (hasFilters) {
      // Open in new tab to preserve filters in the list view if filters are applied
      const url = `/finance/vouchers/${voucher.id}`;
      window.open(url, '_blank');
    } else {
      navigate(`/finance/vouchers/${voucher.id}`, {
        state: {
          voucher,
          vouchers: vouchers || [],
          organisationId: user?.organization_id,
          entityName: entityName,
          organizationName: user?.organization_name || 'N/A'
        }
      });
    }
  };

  const handleViewInvoice = (invoice, hasFilters) => {
    const currentIndex = invoices.findIndex(inv => inv.id === invoice.id);
    const path = `/invoices/${invoice.id}`;

    if (hasFilters) {
      window.open(path, '_blank');
    } else {
      navigate(path, { state: { invoice, invoices, currentIndex } });
    }
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
        {/* HEADER SECTION */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          {/* Top Line: Finance + Filters */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            {/* Finance Title + Icon */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-primary/10 p-2 sm:p-3 rounded-xl">
                <Landmark className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">Finance</h1>
              {/* Removed Add Voucher and Add Invoice buttons as per user request */}
            </div>

          </div>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-muted-foreground">
            Review client invoices and vouchers.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => navigate(`/finance/${value}`)}
          className="w-full"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
              <TabsTrigger value="vouchers" className="text-sm sm:text-base">Vouchers</TabsTrigger>
              <TabsTrigger value="invoices" className="text-sm sm:text-base">Invoices</TabsTrigger>
            </TabsList>

            {/* Refresh Button and Add Dropdown - Moved here */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className="h-9 w-9 sm:h-10 sm:w-10"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" className="text-sm sm:text-base h-9 sm:h-10 px-3 sm:px-4">
                    + Add New
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowVoucherDialog(true)}>
                    Voucher
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowInvoiceDialog(true)}>
                    Invoice
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
