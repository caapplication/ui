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
  getEntityIndicators,
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
import InvoiceHistory from "@/components/finance/InvoiceHistory";
import VoucherHistory from "@/components/finance/VoucherHistory";
import { useNavigate, Routes, Route, useLocation, Navigate } from "react-router-dom";
import ExportTallyModal from "@/components/finance/ExportTallyModal";

const AccountantFinance = () => {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [entityIndicators, setEntityIndicators] = useState({}); // { "entity_id": { has_finance_pending, has_notice_unread } }

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

  // handleExport logic removed as it's now handled by the modal

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

  }, [user?.access_token, organisationId, entities, selectedEntity, fetchData]);

  // Fetch entity indicators (finance pending, notices unread) for dropdown dots
  useEffect(() => {
    const fetchIndicators = async () => {
      if (entities.length > 0 && user?.access_token) {
        try {
          console.log('Finance: Fetching indicators for entities:', entities.length);
          const indicators = await getEntityIndicators(user.access_token);
          console.log('Finance: Fetched entity indicators:', indicators);
          console.log('Finance: Entities:', entities.map(e => ({ id: String(e.id), name: e.name })));
          
          // Normalize entity IDs to strings for comparison
          const normalizedIndicators = {};
          Object.keys(indicators || {}).forEach(key => {
            normalizedIndicators[String(key)] = indicators[key];
          });
          
          console.log('Finance: Normalized indicators:', normalizedIndicators);
          setEntityIndicators(normalizedIndicators);
        } catch (error) {
          console.error('Failed to fetch entity indicators:', error);
          setEntityIndicators({});
        }
      } else {
        console.log('Finance: Skipping indicator fetch - entities:', entities.length, 'token:', !!user?.access_token);
      }
    };
    fetchIndicators();
    // Refresh indicators every 30 seconds
    const interval = setInterval(fetchIndicators, 30000);
    return () => clearInterval(interval);
  }, [entities, user?.access_token]);

  const handleViewInvoice = (invoice, hasFilters) => {
    const currentIndex = invoices.findIndex(inv => inv.id === invoice.id);
    const path = `/invoices/ca/${invoice.id}`;

    if (hasFilters) {
      window.open(path, '_blank');
    } else {
      navigate(path, { state: { invoice, invoices, currentIndex } });
    }
  };

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
                {entities.map((entity) => {
                  const entityIdStr = String(entity.id);
                  const indicator = entityIndicators[entityIdStr];
                  const hasNotification = indicator && (indicator.has_finance_pending || indicator.has_notice_unread);
                  
                  // Debug logging
                  if (entity.name === 'The Abduz' || entity.name === 'Spic N Span') {
                    console.log(`Finance: Checking ${entity.name}`, {
                      entityId: entity.id,
                      entityIdStr,
                      indicator,
                      hasNotification,
                      allIndicators: entityIndicators
                    });
                  }
                  
                  return (
                    <SelectItem 
                      key={entity.id} 
                      value={entity.id}
                      className={hasNotification ? "relative !pr-8" : "relative"}
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="flex-1 truncate">{entity.name}</span>
                        {hasNotification && (
                          <span 
                            className="w-2 h-2 rounded-full bg-amber-400 border border-[#1e293b] flex-shrink-0" 
                            aria-hidden="true"
                            style={{ minWidth: '8px', minHeight: '8px' }}
                          />
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
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
              <Button onClick={() => setIsExportModalOpen(true)} disabled={isLoading || !selectedEntity || selectedEntity === 'all'}>
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

        {/* Export Modal */}
        <ExportTallyModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          entityId={selectedEntity}
          entityName={entities.find(e => e.id === selectedEntity)?.name}
        />

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

          <div className="mt-6 relative">
            {(isLoading) && (
              <div className="absolute inset-0 z-50 flex justify-center items-center bg-black/20 backdrop-blur-[1px] rounded-lg h-64">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
            <Routes>
              <Route path="/" element={<Navigate to="vouchers" replace />} />
              <Route
                path="vouchers"
                element={
                  <VoucherHistory
                    vouchers={enrichedVouchers}
                    onDeleteVoucher={handleDeleteVoucherClick}
                    onViewVoucher={(voucher, hasFilters) => {
                      if (hasFilters) {
                        const url = `/vouchers/ca/${voucher.id}`;
                        window.open(url, '_blank');
                      } else {
                        console.log("Navigating to voucher:", voucher);
                        navigate(`/vouchers/ca/${voucher.id}`, {
                          state: {
                            voucher: voucher,
                            vouchers: enrichedVouchers,
                            isReadOnly: voucher.isReadOnly // Passed from VoucherHistory
                          }
                        });
                      }
                    }}
                    onEditVoucher={(voucher) => console.log(voucher)}
                    isAccountantView={true}
                  />
                }
              />
              <Route
                path="invoices"
                element={
                  <InvoiceHistory
                    invoices={invoices}
                    beneficiaries={beneficiaries}
                    onDeleteInvoice={handleDeleteInvoiceClick}
                    onEditInvoice={(invoice) => console.log(invoice)}
                    onViewInvoice={handleViewInvoice}
                    isAccountantView={true}
                  />
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
