import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { useOrganisation } from '@/hooks/useOrganisation';
import { getCATeamInvoices, getCATeamVouchers, updateInvoice, updateVoucher } from '@/lib/api';
import Vouchers from './Vouchers';
import Invoices from './Invoices';
import * as XLSX from 'xlsx';

const FinancePage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const tabParam = params.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'invoices' ? 'invoices' : 'vouchers');
  const {
    organisations,
    selectedOrg,
    setSelectedOrg,
    entities,
    selectedEntity,
    setSelectedEntity,
    loading: isOrgLoading,
  } = useOrganisation();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleRefresh = () => {
    setIsDataLoading(true);
    // This will trigger a refresh in child components via prop change
    setTimeout(() => setIsDataLoading(false), 500); // Simulate refresh
  };

  const handleExport = async () => {
    if (!selectedEntity) {
      toast({
        title: 'Error',
        description: 'Please select an entity to export.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const [invoices, vouchers] = await Promise.all([
        getCATeamInvoices(selectedEntity, user.access_token),
        getCATeamVouchers(selectedEntity, user.access_token),
      ]);

      const readyInvoices = invoices.filter(inv => inv.is_ready && !inv.is_exported);
      const readyVouchers = vouchers.filter(v => v.is_ready && !v.is_exported);

      if (readyInvoices.length === 0 && readyVouchers.length === 0) {
        toast({
          title: 'No Data to Export',
          description: 'There are no ready invoices or vouchers to export.',
        });
        return;
      }

      const exportData = [
        [
          'Voucher Date', 'Voucher Type Name', 'Voucher Number', 'Party A/c Name', 'Sales Ledger',
          'Item Amount', 'Total Invoice Value', 'Payment(Cash/UPI/Wallet)', 'Payment(Lakmo Coins)',
          'Balance', 'Other Ledger', 'Other Ledger Amount', 'CGST Ledger', 'CSGST Rate', 'CGST Amount',
          'UTST Ledger', 'UTGST Rate', 'UTGST Amount', 'Dr', 'Cr', 'Narataion', 'Place of Supply',
          'State', 'Country', 'Registration Type', 'GSTIN'
        ],
        ...readyInvoices.map(inv => [
          new Date(inv.date).toLocaleDateString(), 'Sales', inv.bill_number, inv.beneficiary.name, 'Sales',
          inv.amount, inv.amount + inv.cgst + inv.sgst + inv.igst, '', '', '', '', '', 'CGST', 9, inv.cgst,
          'UTGST', 9, inv.sgst, 'Dr', 'Cr', inv.remarks, '', '', 'India', 'Regular', ''
        ]),
        ...readyVouchers.map(v => [
          new Date(v.created_date).toLocaleDateString(), v.voucher_type, '', v.beneficiaryName, '',
          v.amount, v.amount, '', '', '', '', '', '', '', '', '', '', '', 'Dr', 'Cr', v.remarks, '', '', 'India', 'Regular', ''
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Accounting Voucher');
      XLSX.writeFile(wb, 'Sales Format.xlsx');

      await Promise.all([
        ...readyInvoices.map(inv => updateInvoice(inv.id, { is_exported: true }, user.access_token)),
        ...readyVouchers.map(v => updateVoucher(v.id, { is_exported: true }, user.access_token))
      ]);

      toast({
        title: 'Success',
        description: 'Data exported successfully.',
      });

      handleRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to export data: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 sm:p-8">
      {/* Header with title, dropdowns, and refresh on the same line */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-3xl sm:text-5xl font-bold text-white mb-0">Finances</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedOrg || ''} onValueChange={setSelectedOrg} disabled={isOrgLoading}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={isOrgLoading ? "Loading..." : "Select an organisation"} />
            </SelectTrigger>
            <SelectContent>
              {organisations.map(org => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedEntity || ''} onValueChange={setSelectedEntity} disabled={isOrgLoading || !selectedOrg}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={isOrgLoading ? "Loading..." : "Select entity"} />
            </SelectTrigger>
            <SelectContent>
              {entities.length > 1 && <SelectItem value="all">All Entities</SelectItem>}
              {entities.map(entity => (
                <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isDataLoading || isOrgLoading || !selectedOrg}>
            <RefreshCw className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} />
          </Button>
          {user.role === 'CA_ACCOUNTANT' && (
            <Button onClick={handleExport} disabled={isDataLoading || !selectedEntity}>
              Export to Tally
            </Button>
          )}
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-8">
          <TabsList className="inline-flex items-center justify-center gap-4 text-lg">
            <TabsTrigger value="vouchers" className="px-4 py-2 transition-all duration-300 ease-in-out">Vouchers</TabsTrigger>
            <TabsTrigger value="invoices" className="px-4 py-2 transition-all duration-300 ease-in-out">Invoices</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="vouchers">
          <Vouchers
            selectedOrganisation={selectedOrg}
            selectedEntity={selectedEntity}
            isDataLoading={isDataLoading || isOrgLoading}
            onRefresh={handleRefresh}
          />
        </TabsContent>
        <TabsContent value="invoices">
          <Invoices
            selectedOrganisation={selectedOrg}
            selectedEntity={selectedEntity}
            isDataLoading={isDataLoading || isOrgLoading}
            onRefresh={handleRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancePage;
