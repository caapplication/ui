import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Banknote, ChevronDown, Loader2, RefreshCw, Download } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getBeneficiaries, getInvoices, addInvoice, updateInvoice, deleteInvoice, addVoucher, updateVoucher, getVouchers, deleteVoucher, getBankAccountsForBeneficiary, exportVouchersToTallyXML } from '@/lib/api';

import InvoiceForm from '@/components/finance/InvoiceForm';
import VoucherForm from '@/components/finance/VoucherForm';
import ViewVoucherDialog from '@/components/finance/ViewVoucherDialog';
import InvoiceHistory from '@/components/finance/InvoiceHistory';
import VoucherHistory from '@/components/finance/VoucherHistory';

const Finance = ({ organisationBankAccounts, quickAction, clearQuickAction, entityId, organizationName }) => {
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showVoucherDialog, setShowVoucherDialog] = useState(false);
  const [showViewVoucherDialog, setShowViewVoucherDialog] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editingVoucher, setEditingVoucher] = useState(null);
  
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!entityId || !user?.access_token) return;
    if (isRefresh) {
        setIsRefreshing(true);
    } else {
        setIsLoading(true);
    }
    try {
      const [beneficiariesData, invoicesData, vouchersData] = await Promise.all([
        getBeneficiaries(user.access_token).then(async (benefs) => {
            const benefsWithAccounts = await Promise.all(
                (benefs || []).map(async (benef) => {
                    const bankAccounts = await getBankAccountsForBeneficiary(benef.id, user.access_token);
                    return { ...benef, bank_accounts: bankAccounts || [] };
                })
            );
            return benefsWithAccounts;
        }),
        getInvoices(entityId, user.access_token),
        getVouchers(entityId, user.access_token)
      ]);
      setBeneficiaries(beneficiariesData || []);
      setInvoices(invoicesData || []);
      setVouchers(vouchersData || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch finance data: ${error.message}`,
        variant: 'destructive',
      });
      setBeneficiaries([]);
      setInvoices([]);
      setVouchers([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [entityId, user?.access_token, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const enrichedVouchers = useMemo(() => {
    return (vouchers || []).map(v => {
      const beneficiary = v.beneficiary || {};
      const beneficiaryName = beneficiary.beneficiary_type === 'individual' ? beneficiary.name : beneficiary.company_name;
      return {
        ...v,
        beneficiaryName: beneficiaryName || 'Unknown Beneficiary',
      };
    });
  }, [vouchers]);

  const handleAddOrUpdateInvoice = async (invoiceData, invoiceId) => {
    try {
      if (invoiceId) {
        await updateInvoice(invoiceId, invoiceData, user.access_token);
        toast({ title: 'Success', description: 'Invoice updated successfully.' });
      } else {
        await addInvoice(invoiceData, user.access_token);
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
    }
  };

  const handleDeleteInvoiceClick = async (invoiceId) => {
    try {
      await deleteInvoice(entityId, invoiceId, user.access_token);
      toast({ title: 'Success', description: 'Invoice deleted successfully.' });
      fetchData(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete invoice: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleEditInvoiceClick = (invoice) => {
    setEditingInvoice(invoice);
    setShowInvoiceDialog(true);
  };
  
  const handleAddOrUpdateVoucher = async (voucherData, voucherId) => {
    try {
        if (voucherId) {
            await updateVoucher(voucherId, voucherData, user.access_token);
            toast({ title: 'Success', description: 'Voucher updated successfully.' });
        } else {
            await addVoucher(voucherData, user.access_token);
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
    }
  };

  const handleDeleteVoucherClick = async (voucherId) => {
    try {
      await deleteVoucher(entityId, voucherId, user.access_token);
      toast({ title: 'Success', description: 'Voucher deleted successfully.' });
      fetchData(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete voucher: ${error.message}`,
        variant: 'destructive',
      });
    }
  };
  
  const handleEditVoucherClick = (voucher) => {
    const enrichedVoucher = enrichedVouchers.find(v => v.id === voucher.id);
    navigate(`/vouchers/${voucher.id}`, { state: { voucher: enrichedVoucher, startInEditMode: true, organizationName } });
  };

  const handleViewVoucherClick = (voucher) => {
    const enrichedVoucher = enrichedVouchers.find(v => v.id === voucher.id);
    navigate(`/vouchers/${voucher.id}`, { state: { voucher: enrichedVoucher, organizationName } });
  };
      
  const selectedVoucherData = React.useMemo(() => {
    if (!selectedVoucher) return {};
    const fromAccount = organisationBankAccounts.find(b => b.id === selectedVoucher.from_bank_account_id);
    const beneficiary = beneficiaries.find(b => b.id === selectedVoucher.beneficiary_id);
    const toAccount = beneficiary?.bank_accounts?.find(b => b.id === selectedVoucher.to_bank_account_id);
    
    return { 
        beneficiary, 
        fromAccount, 
        toAccount 
    };
  }, [selectedVoucher, beneficiaries, organisationBankAccounts]);

  const handleExportToTally = (format) => {
    const readyVouchers = enrichedVouchers.filter(v => v.is_ready && v.finance_header_id);
    if (readyVouchers.length === 0) {
      toast({
        title: 'No Ready Vouchers',
        description: 'There are no vouchers marked as ready with a selected header to export.',
        variant: 'destructive',
      });
      return;
    }

    if (format === 'xml') {
      exportVouchersToTallyXML(readyVouchers, organizationName || 'Company Name');
      toast({
        title: 'Export Successful',
        description: 'Vouchers have been exported to Tally XML format.',
      });
    } else {
      // Implement CSV/XLSX export logic here
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
  }

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-5xl font-bold text-white">Finance</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => fetchData(true)} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            {user.role !== 'CLIENT_USER' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={enrichedVouchers.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Export to Tally
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => handleExportToTally('csv')}>CSV or xlsx</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleExportToTally('xml')}>XML</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="w-5 h-5 mr-2" />
                  Add New
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem onSelect={() => { setEditingVoucher(null); setShowVoucherDialog(true); }}>
                  <Banknote className="w-4 h-4 mr-2" />
                  <span>Voucher</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setEditingInvoice(null); setShowInvoiceDialog(true); }}>
                  <FileText className="w-4 h-4 mr-2" />
                  <span>Invoice</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      
        <div className="w-full">
          <div className="flex space-x-4 border-b">
            <Link to="/finance/vouchers" className={`py-2 px-4 ${location.pathname.includes('/vouchers') ? 'border-b-2 border-white text-white' : 'text-gray-400'}`}>Vouchers</Link>
            <Link to="/finance/invoices" className={`py-2 px-4 ${location.pathname.includes('/invoices') ? 'border-b-2 border-white text-white' : 'text-gray-400'}`}>Invoices</Link>
          </div>
          
          <div className="mt-4">
            <Routes>
              <Route path="/" element={<Navigate to="vouchers" />} />
              <Route path="vouchers" element={
                isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                ) : (
                  <VoucherHistory 
                    vouchers={enrichedVouchers}
                    onDeleteVoucher={handleDeleteVoucherClick}
                    onViewVoucher={handleViewVoucherClick}
                    onEditVoucher={handleEditVoucherClick}
                  />
                )
              } />
              <Route path="invoices" element={
                isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                ) : (
                  <InvoiceHistory 
                    invoices={invoices}
                    beneficiaries={beneficiaries}
                    onDeleteInvoice={handleDeleteInvoiceClick}
                    onEditInvoice={handleEditInvoiceClick}
                  />
                )
              } />
            </Routes>
          </div>
        </div>
      </motion.div>

      <Dialog open={showInvoiceDialog} onOpenChange={closeDialogs}>
        <InvoiceForm 
          entityId={entityId}
          beneficiaries={beneficiaries} 
          isLoading={isLoading}
          onSave={handleAddOrUpdateInvoice} 
          onCancel={closeDialogs} 
          invoice={editingInvoice}
        />
      </Dialog>
      
      <Dialog open={showVoucherDialog} onOpenChange={closeDialogs}>
        <VoucherForm 
          entityId={entityId}
          beneficiaries={beneficiaries} 
          isLoading={isLoading}
          organisationBankAccounts={organisationBankAccounts}
          onSave={handleAddOrUpdateVoucher} 
          onCancel={closeDialogs}
          voucher={editingVoucher}
        />
      </Dialog>
      
      <ViewVoucherDialog
        isOpen={showViewVoucherDialog}
        onOpenChange={setShowViewVoucherDialog}
        voucher={selectedVoucher}
        organizationName={organizationName}
        {...selectedVoucherData}
      />
    </div>
  );
};

export default Finance;
