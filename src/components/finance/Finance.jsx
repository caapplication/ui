import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Banknote, ChevronDown, Loader2, RefreshCw, Download } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getBeneficiaries, getInvoices, addInvoice, deleteInvoice, addVoucher, getVouchers, deleteVoucher, getBankAccountsForBeneficiary, exportVouchersToTallyXML } from '@/lib/api';

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
  const [activeTab, setActiveTab] = useState('vouchers');
  
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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

  useEffect(() => {
    if (quickAction === 'add-invoice') {
      setActiveTab('invoices');
      setShowInvoiceDialog(true);
      clearQuickAction();
    } else if (quickAction === 'add-voucher') {
      setActiveTab('vouchers');
      setShowVoucherDialog(true);
      clearQuickAction();
    }
  }, [quickAction, clearQuickAction]);

  const handleAddInvoiceClick = async (invoiceData) => {
    try {
      await addInvoice(invoiceData, user.access_token);
      toast({ title: 'Success', description: 'Invoice added successfully.' });
      setShowInvoiceDialog(false);
      setActiveTab('invoices');
      fetchData(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to add invoice: ${error.message}`,
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
  
  const handleAddVoucherClick = async (voucherData) => {
    try {
        await addVoucher(voucherData, user.access_token);
        toast({ title: 'Success', description: 'Voucher added successfully.' });
        setShowVoucherDialog(false);
        setActiveTab('vouchers');
        fetchData(true);
    } catch (error) {
        toast({
            title: 'Error',
            description: `Failed to add voucher: ${error.message}`,
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
  
  const handleViewVoucherClick = (voucher) => {
    setSelectedVoucher(voucher);
    setShowViewVoucherDialog(true);
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

  const handleExportToTally = () => {
    if (enrichedVouchers.length === 0) {
      toast({
        title: 'No Vouchers',
        description: 'There are no vouchers to export.',
        variant: 'destructive',
      });
      return;
    }
    exportVouchersToTallyXML(enrichedVouchers, organizationName || 'Company Name');
    toast({
      title: 'Export Successful',
      description: 'Vouchers have been exported to Tally XML format.',
    });
  };

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-5xl font-bold text-white">Finance</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => fetchData(true)} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={handleExportToTally} disabled={enrichedVouchers.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export to Tally
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="w-5 h-5 mr-2" />
                  Add New
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem onSelect={() => { setShowInvoiceDialog(true); setActiveTab('invoices'); }}>
                  <FileText className="w-4 h-4 mr-2" />
                  <span>Invoice</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setShowVoucherDialog(true); setActiveTab('vouchers'); }}>
                  <Banknote className="w-4 h-4 mr-2" />
                  <span>Voucher</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="glass-tab-list">
              <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>
          
          <TabsContent value="vouchers">
             {isLoading ? (
               <div className="flex justify-center items-center h-64">
                 <Loader2 className="w-8 h-8 animate-spin text-white" />
               </div>
             ) : (
                <VoucherHistory 
                  vouchers={enrichedVouchers}
                  onDeleteVoucher={handleDeleteVoucherClick}
                  onViewVoucher={handleViewVoucherClick}
                />
             )}
          </TabsContent>

          <TabsContent value="invoices">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            ) : (
              <InvoiceHistory 
                invoices={invoices}
                beneficiaries={beneficiaries}
                onDeleteInvoice={handleDeleteInvoiceClick}
              />
            )}
          </TabsContent>
      </Tabs>
      </motion.div>

      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <InvoiceForm 
          entityId={entityId}
          beneficiaries={beneficiaries} 
          isLoading={isLoading}
          onAdd={handleAddInvoiceClick} 
          onCancel={() => setShowInvoiceDialog(false)} 
        />
      </Dialog>
      
      <Dialog open={showVoucherDialog} onOpenChange={setShowVoucherDialog}>
        <VoucherForm 
          entityId={entityId}
          beneficiaries={beneficiaries} 
          isLoading={isLoading}
          organisationBankAccounts={organisationBankAccounts}
          onAdd={handleAddVoucherClick} 
          onCancel={() => setShowVoucherDialog(false)} 
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