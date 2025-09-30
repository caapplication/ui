import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, Landmark, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getCATeamVouchers, listOrganisations, listEntities } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VoucherHistory from '@/components/finance/VoucherHistory';
import ViewVoucherDialog from '@/components/finance/ViewVoucherDialog.jsx';
import { exportVouchersToTallyXML } from '@/lib/api/finance';
import { useNavigate } from 'react-router-dom';

const Vouchers = () => {
  const [organisations, setOrganisations] = useState([]);
  const [entities, setEntities] = useState([]);
  const [selectedOrganisation, setSelectedOrganisation] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isViewVoucherOpen, setIsViewVoucherOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchInitialData = useCallback(async () => {
    if (!user?.access_token) return;
    setIsLoading(true);
    try {
      const orgData = await listOrganisations(user.access_token);
      const sortedOrgs = (orgData || []).sort((a, b) => a.name.localeCompare(b.name));
      setOrganisations(sortedOrgs);
      if (sortedOrgs.length > 0) {
        setSelectedOrganisation(sortedOrgs[0].id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch initial data: ${error.message}`,
        variant: 'destructive',
      });
      setOrganisations([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.access_token, toast]);

  const fetchDataForClient = useCallback(async (isRefresh = false) => {
    if (!selectedEntity || !user?.access_token) {
      setVouchers([]);
      return;
    }
    if (isRefresh) {
      setIsDataLoading(true);
    } else {
      setIsLoading(true);
    }
    
    let entityIdsToFetch = [];
    if (selectedEntity === 'all') {
      entityIdsToFetch = entities.map(e => e.id);
    } else {
      entityIdsToFetch = [selectedEntity];
    }
    
    if (entityIdsToFetch.length === 0) {
      setVouchers([]);
      if(isRefresh) setIsDataLoading(false);
      else setIsLoading(false);
      return;
    }

    try {
      const fetchPromises = entityIdsToFetch.flatMap(id => [
        getCATeamVouchers(id, user.access_token)
      ]);
      
      const results = await Promise.allSettled(fetchPromises);
      const allVouchers = [];

      for(let i = 0; i < entityIdsToFetch.length; i++) {
        const voucherResult = results[i];
        if(voucherResult.status === 'fulfilled' && Array.isArray(voucherResult.value)) {
          allVouchers.push(...voucherResult.value);
        }
      }
      
      setVouchers(allVouchers);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch finance data for client: ${error.message}`,
        variant: 'destructive',
      });
      setVouchers([]);
    } finally {
      if(isRefresh) setIsDataLoading(false);
      else setIsLoading(false);
    }
  }, [selectedEntity, user?.access_token, toast, entities]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    const fetchEntities = async () => {
      if (selectedOrganisation) {
        try {
          const entityData = await listEntities(selectedOrganisation, user.access_token);
          setEntities(entityData || []);
          if (entityData.length > 1) {
            setSelectedEntity('all');
          } else if (entityData.length === 1) {
            setSelectedEntity(entityData[0].id);
          } else {
            setSelectedEntity(null);
          }
        } catch (error) {
          toast({
            title: 'Error',
            description: `Failed to fetch entities: ${error.message}`,
            variant: 'destructive',
          });
          setEntities([]);
        }
      }
    };
    fetchEntities();
  }, [selectedOrganisation, user.access_token, toast]);

  useEffect(() => {
    if (selectedEntity) {
      fetchDataForClient();
    }
  }, [selectedEntity, fetchDataForClient]);

  const handleOrganisationChange = (orgId) => {
    setSelectedOrganisation(orgId);
    setEntities([]);
    setSelectedEntity(null);
  };

  const handleViewVoucher = (voucher) => {
    navigate(`/vouchers/ca/${voucher.id}`, { state: { voucher, organisationId: selectedOrganisation } });
  };

  const enrichedVouchers = useMemo(() => {
    if (!vouchers) return [];
    return vouchers.map(v => {
      const beneficiary = v.beneficiary;
      const beneficiaryName = beneficiary 
          ? (beneficiary.beneficiary_type === 'individual' ? beneficiary.name : beneficiary.company_name) 
          : 'Unknown Beneficiary';
      return {
        ...v,
        beneficiary,
        beneficiaryName,
      }
    });
  }, [vouchers]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="flex flex-col md:flex-row justify-end items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-2">
          <Select value={selectedOrganisation || ''} onValueChange={handleOrganisationChange}>
              <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Select an organisation" />
              </SelectTrigger>
              <SelectContent>
                  {organisations.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
              </SelectContent>
          </Select>
          <Select value={selectedEntity || ''} onValueChange={setSelectedEntity} disabled={!selectedOrganisation}>
              <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Select an entity" />
              </SelectTrigger>
              <SelectContent>
                  {entities.length > 1 && <SelectItem value="all">All Entities</SelectItem>}
                  {entities.map(entity => (
                      <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                  ))}
              </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => fetchDataForClient(true)} disabled={isDataLoading || !selectedOrganisation}>
            <RefreshCw className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      ) : (
        <VoucherHistory 
          vouchers={enrichedVouchers}
          onDeleteVoucher={() => toast({ title: "Note", description: "Deletion from this view is not supported."})}
          onViewVoucher={handleViewVoucher}
          onRefresh={fetchDataForClient}
        />
      )}
      <ViewVoucherDialog
        isOpen={isViewVoucherOpen}
        onOpenChange={setIsViewVoucherOpen}
        voucher={selectedVoucher}
        beneficiary={selectedVoucher?.beneficiary}
        organisationBankAccounts={organisations.find(o => o.id === selectedOrganisation)?.bank_accounts || []}
      />
    </motion.div>
  );
};

export default Vouchers;
