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
  addInvoice,
  updateInvoice,
  deleteInvoice,
  addVoucher,
  updateVoucher,
  getVouchers,
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
          getInvoices(entityId, token),
          getVouchers(entityId, token),
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
      const beneficiary = v.beneficiary || {};
      const beneficiaryName =
        beneficiary.beneficiary_type === 'individual'
          ? beneficiary.name
          : beneficiary.company_name;
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
        await updateInvoice(invoiceId, invoiceData, token);
        toast({ title: 'Success', description: 'Invoice updated successfully.' });
      } else {
        if (invoiceData instanceof FormData) {
          invoiceData.append('entity_id', entityId);
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
    navigate(`/finance/vouchers/${voucher.id}`, { state: { voucher } });
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
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* HEADER SECTION */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Top Line: Finance + Filters */}
          <div className="flex flex-wrap justify-between items-center gap-4">
            {/* Finance Title + Icon */}
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Landmark className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-white">Finance</h1>
            {/* Removed Add Voucher and Add Invoice buttons as per user request */}
          </div>

            {/* Refresh Button and Add Dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" className="ml-2">
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
          <p className="text-muted-foreground">
            Review client invoices and vouchers.
          </p>
        </div>

        {/* 🔹 Tabs Section */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => navigate(`/finance/${value}`)}
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <Routes>
              <Route path="/" element={<Navigate to="vouchers" replace />} />
              <Route
                path="vouchers"
                element={
                  isLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
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
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
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
