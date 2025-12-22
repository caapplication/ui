import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();


  const activeTab = location.pathname.includes('/invoices')
    ? 'invoices'
    : 'vouchers';

  const fetchData = useCallback(
    async (isRefresh = false) => {
      const token = localStorage.getItem('accessToken');
      if (!user?.organization_id || !token || !entityId) return;

      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const promises = [
          getBeneficiaries(user.organization_id, token),
          getInvoicesList(entityId, token),
          getVouchersList(entityId, token),
        ];
        const [beneficiariesData, invoicesData, vouchersData] =
          await Promise.all(promises);

        setBeneficiaries(beneficiariesData || []);
        setInvoices(invoicesData || []);
        setVouchers(vouchersData || []);
      } catch (error) {
        toast({
          title: 'Error',
          description: `Failed to fetch finance data: ${error.message}`,
          variant: 'destructive',
        });
        setInvoices([]);
        setVouchers([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.organization_id, toast, entityId]
  );

  useEffect(() => {
    if (entityId) {
      fetchData();
    }
  }, [fetchData, entityId, user]);

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

  const handleViewVoucher = (voucher) => {
    // Get entity name from user entities if available
    let entityName = 'N/A';
    if (user?.role === 'CLIENT_USER' && user.entities && entityId) {
      const entity = user.entities.find(e => e.id === entityId);
      if (entity) entityName = entity.name;
    }
    
    navigate(`/finance/vouchers/${voucher.id}`, { 
      state: { 
        voucher,
        vouchers: vouchers || [],
        organisationId: user?.organization_id,
        entityName: entityName,
        organizationName: user?.organization_name || 'N/A'
      } 
    });
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

            {/* Refresh Button and Add Dropdown */}
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

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-muted-foreground">
            Review client invoices and vouchers.
          </p>
        </div>

        {/* 🔹 Tabs Section */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => navigate(`/finance/${value}`)}
          className="w-full"
        >
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
            <TabsTrigger value="vouchers" className="text-sm sm:text-base">Vouchers</TabsTrigger>
            <TabsTrigger value="invoices" className="text-sm sm:text-base">Invoices</TabsTrigger>
          </TabsList>

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
