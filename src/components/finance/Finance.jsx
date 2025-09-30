import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Banknote, ChevronDown, Loader2, RefreshCw, Download } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getBeneficiaries, getInvoices, addInvoice, updateInvoice, deleteInvoice, addVoucher, updateVoucher, getVouchers, deleteVoucher, getBankAccountsForBeneficiary, exportVouchersToTallyXML } from '@/lib/api';
import { useOrganisation } from '@/hooks/useOrganisation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import InvoiceForm from '@/components/finance/InvoiceForm';
import VoucherForm from '@/components/finance/VoucherForm';
import InvoiceHistory from '@/components/finance/InvoiceHistory';
import VoucherHistory from '@/components/finance/VoucherHistory';

const Finance = ({ quickAction, clearQuickAction }) => {
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showVoucherDialog, setShowVoucherDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editingVoucher, setEditingVoucher] = useState(null);
  
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
  const [organisationBankAccounts, setOrganisationBankAccounts] = useState([]);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleOrgChange = (orgId) => {
    setSelectedOrg(orgId);
    setSelectedEntity(null);
  };

  const activeTab = location.pathname.includes('/invoices') ? 'invoices' : 'vouchers';

  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (organisationId && user?.access_token) {
        try {
          const bankAccounts = await getOrganisationBankAccounts(organisationId, user.access_token);
          setOrganisationBankAccounts(bankAccounts || []);
        } catch (error) {
          toast({ title: 'Error', description: 'Failed to fetch bank accounts.', variant: 'destructive' });
        }
      }
    };
    fetchBankAccounts();
  }, [organisationId, user?.access_token, toast]);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!organisationId || !user?.access_token) return;

    if (isRefresh) {
        setIsRefreshing(true);
    } else {
        setIsLoading(true);
    }
    try {
      const [beneficiariesData, invoicesData, vouchersData] = await Promise.all([
        getBeneficiaries(organisationId, user.access_token),
        getInvoices(selectedEntity || organisationId, user.access_token),
        getVouchers(selectedEntity || organisationId, user.access_token)
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
      setInvoices([]);
      setVouchers([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [organisationId, selectedEntity, user?.access_token, toast]);

  useEffect(() => {
    if (user?.role === 'CLIENT_USER' && user.entities && user.entities.length > 0) {
      setSelectedEntity(user.entities[0].id);
    }
  }, [user]);

  useEffect(() => {
    if (selectedEntity) {
      fetchData();
    }
  }, [fetchData, selectedEntity]);

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
        await addInvoice({ ...invoiceData, entity_id: selectedEntity }, user.access_token);
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
      await deleteInvoice(selectedEntity, invoiceId, user.access_token);
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
            await addVoucher({ ...voucherData, entity_id: selectedEntity }, user.access_token);
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
      await deleteVoucher(selectedEntity, voucherId, user.access_token);
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
    const organizationName = organisations.find(o => o.id === selectedOrg)?.name;
    const entityName = entities.find(e => e.id === selectedEntity)?.name;
    navigate(`/vouchers/${voucher.id}`, { state: { voucher: enrichedVoucher, startInEditMode: true, organizationName, entityName, organisationId: selectedOrg } });
  };

  const handleViewVoucherClick = (voucher) => {
    const enrichedVoucher = enrichedVouchers.find(v => v.id === voucher.id);
    const organizationName = organisations.find(o => o.id === selectedOrg)?.name;
    const entityName = entities.find(e => e.id === selectedEntity)?.name;
    navigate(`/vouchers/${voucher.id}`, { state: { voucher: enrichedVoucher, organizationName, entityName, organisationId: selectedOrg } });
  };
      
  const handleExportToTally = async (format) => {
    if (format === 'xml') {
      try {
        await exportVouchersToTallyXML(selectedEntity, user.access_token);
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
  }

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-5xl font-bold text-white">Finance</h1>
          <div className="flex items-center gap-2">
            {user.role !== 'CLIENT_USER' && (
              <>
                <Select value={selectedOrg} onValueChange={handleOrgChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    {organisations.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedEntity} onValueChange={setSelectedEntity} disabled={!selectedOrg}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map(ent => <SelectItem key={ent.id} value={ent.id}>{ent.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}
            <Button variant="outline" size="icon" onClick={() => fetchData(true)} disabled={isRefreshing || !selectedEntity}>
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
                <Button disabled={!selectedEntity}>
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
          <Tabs value={activeTab} onValueChange={(value) => navigate(`/finance/${value}`)} className="w-full">
            <TabsList>
              <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
            </TabsList>
            <div className="mt-4">
              <Routes>
                <Route path="/" element={<Navigate to="vouchers" replace />} />
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
          </Tabs>
        </div>
      </motion.div>

      <Dialog open={showInvoiceDialog} onOpenChange={closeDialogs}>
        <InvoiceForm 
          entityId={selectedEntity}
          beneficiaries={beneficiaries} 
          isLoading={isLoading}
          onSave={handleAddOrUpdateInvoice} 
          onCancel={closeDialogs} 
          invoice={editingInvoice}
          financeHeaders={[]}
        />
      </Dialog>
      
      <Dialog open={showVoucherDialog} onOpenChange={closeDialogs}>
        <VoucherForm 
          entityId={selectedEntity}
          beneficiaries={beneficiaries} 
          isLoading={isLoading}
          organisationBankAccounts={organisationBankAccounts}
          onSave={handleAddOrUpdateVoucher} 
          onCancel={closeDialogs}
          voucher={editingVoucher}
          financeHeaders={[]}
        />
      </Dialog>
      
    </div>
  );
};

export default Finance;
