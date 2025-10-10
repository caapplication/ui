import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RefreshCw,
  Landmark,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth.jsx";
import { useToast } from "@/components/ui/use-toast";
import {
  getCATeamInvoices,
  getCATeamVouchers,
  getFinanceHeaders,
  getBeneficiaries,
  updateInvoice,
  updateVoucher,
} from "@/lib/api";
import { useOrganisation } from "@/hooks/useOrganisation";
import * as XLSX from 'xlsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InvoiceHistory from "@/components/finance/InvoiceHistory";
import VoucherHistory from "@/components/finance/VoucherHistory";
import { useNavigate, Routes, Route, useLocation, Navigate } from "react-router-dom";

const AccountantFinance = () => {
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
    organisationId,
  } = useOrganisation();

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleOrgChange = (orgId) => {
    setSelectedOrg(orgId);
    setSelectedEntity(null);
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

      fetchData(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to export data: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const activeTab = location.pathname.includes("/invoices")
    ? "invoices"
    : "vouchers";

  const fetchData = useCallback(
    async (isRefresh = false) => {
      console.log("fetchData called with organisationId:", organisationId, "selectedEntity:", selectedEntity, "entities:", entities);
      if (!organisationId || !user?.access_token) {
        setInvoices([]);
        setVouchers([]);
        setBeneficiaries([]);
        return;
      }
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      let entityIdsToFetch = [];
      if (selectedEntity === "all") {
        entityIdsToFetch = entities.map((e) => e.id);
      } else if (selectedEntity) {
        entityIdsToFetch = [selectedEntity];
      }

      if (entityIdsToFetch.length === 0 && entities.length > 0) {
        // Fallback to all entities if no specific entity is selected but entities are available
        entityIdsToFetch = entities.map((e) => e.id);
      }
      console.log("entityIdsToFetch for API call:", entityIdsToFetch);

      try {
        const [beneficiariesData, ...results] = await Promise.all([
          getBeneficiaries(organisationId, user.access_token),
          ...entityIdsToFetch.flatMap((id) => [
            getCATeamInvoices(id, user.access_token),
            getCATeamVouchers(id, user.access_token),
          ]),
        ]);

        setBeneficiaries(beneficiariesData || []);

        const allInvoices = [];
        const allVouchers = [];

        for (let i = 0; i < entityIdsToFetch.length; i++) {
          const invoiceResult = results[i * 2];
          const voucherResult = results[i * 2 + 1];

          if (Array.isArray(invoiceResult)) {
            allInvoices.push(...invoiceResult);
          }
          if (Array.isArray(voucherResult)) {
            allVouchers.push(...voucherResult);
          }
        }

        setInvoices(allInvoices);
        setVouchers(allVouchers);
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to fetch finance data: ${error.message}`,
          variant: "destructive",
        });
        setInvoices([]);
        setVouchers([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedEntity, user?.access_token, toast, entities, organisationId]
  );

  useEffect(() => {
    // This effect manages the entire data fetching lifecycle for the component.

    // 1. If no organization is selected, clear all data and stop.
    if (!organisationId) {
      setInvoices([]);
      setVouchers([]);
      setSelectedEntity(null);
      return;
    }

    // 2. Wait until entities are loaded and are consistent with the selected organization.
    //    This check prevents a race condition where we might use stale entities from a previous org.
    if (entities.length === 0 || (entities.length > 0 && entities[0].organization_id !== organisationId)) {
      // Clear previous data while waiting for the correct entities to load.
      setInvoices([]);
      setVouchers([]);
      return;
    }

    // 3. Once we have a consistent state (org + its entities), if no specific entity
    //    is selected yet, default to "all". This will trigger a re-render.
    if (!selectedEntity) {
      setSelectedEntity("all");
      return;
    }

    // 4. Finally, if we have an organization, its entities, and a selected entity ("all" or specific),
    //    we can safely fetch the data.
    fetchData();

  }, [organisationId, entities, selectedEntity, setSelectedEntity, fetchData]);

  const enrichedVouchers = useMemo(() => {
    return (vouchers || []).map((v) => {
      const beneficiary =
        v.beneficiary ||
        beneficiaries.find((b) => b.id === v.beneficiary_id) ||
        {};
      const beneficiaryName =
        beneficiary.beneficiary_type === "individual"
          ? beneficiary.name
          : beneficiary.company_name;
      return {
        ...v,
        beneficiaryName: beneficiaryName || "Unknown Beneficiary",
      };
    });
  }, [vouchers, beneficiaries]);

  const handleDeleteInvoiceClick = async (invoiceId) => {
    // Accountant-specific: deletion not supported from this view
    toast({
      title: "Note",
      description: "Deletion from this view is not supported.",
    });
  };

  const handleDeleteVoucherClick = async (voucherId) => {
    // Accountant-specific: deletion not supported from this view
    toast({
      title: "Note",
      description: "Deletion from this view is not supported.",
    });
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
          {/* Top Header: Dropdowns + Refresh */}
          <div className="flex flex-wrap justify-end items-center gap-2 mb-4">
            <Select value={selectedOrg || ""} onValueChange={handleOrgChange}>
              <SelectTrigger className="w-[180px] h-9 text-sm bg-[#1E2A47] text-white border border-gray-600">
                <SelectValue placeholder="Select organisation" />
              </SelectTrigger>
              <SelectContent>
                {organisations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedEntity || ""}
              onValueChange={(val) => {
                console.log("Entity selected:", val);
                setSelectedEntity(val);
              }}
              disabled={!selectedOrg}
            >
              <SelectTrigger className="w-[180px] h-9 text-sm bg-[#1E2A47] text-white border border-gray-600">
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {entities.length > 1 && (
                  <SelectItem value="all">All Entities</SelectItem>
                )}
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchData(true)}
              disabled={isRefreshing || !selectedOrg}
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
            {user.role === 'CA_ACCOUNTANT' && (
              <Button onClick={handleExport} disabled={isLoading || !selectedEntity}>
                Export to Tally
              </Button>
            )}
          </div>
          {/* Finance Title + Icon */}
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Landmark className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-white">
              Finance
            </h1>
          </div>
          {/* Subtitle */}
          <p className="text-muted-foreground">
            Review client invoices and vouchers.
          </p>
        </div>

        {/* Tabs Section */}
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
                      onViewVoucher={(voucher) => console.log(voucher)}
                      onEditVoucher={(voucher) => console.log(voucher)}
                      isAccountantView={true}
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
                      isAccountantView={true}
                    />
                  )
                }
              />
            </Routes>
          </div>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default AccountantFinance;
