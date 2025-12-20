import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getCATeamVouchers, listEntities } from '@/lib/api';
import VoucherHistory from '@/components/finance/VoucherHistory';
import { VoucherHistorySkeleton } from '@/components/finance/VoucherHistorySkeleton';
import { useNavigate } from 'react-router-dom';

const Vouchers = ({ selectedOrganisation, selectedEntity, isDataLoading, onRefresh }) => {
  const [vouchers, setVouchers] = useState([]);
  const [entities, setEntities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchDataForClient = useCallback(async () => {
    if (!selectedEntity || !user?.access_token) {
      setVouchers([]);
      return;
    }
    setIsLoading(true);
    
    let entityIdsToFetch = [];
    if (selectedEntity === 'all') {
      // If 'all' is selected, we need to fetch the full entity list first.
      try {
        const entityData = await listEntities(selectedOrganisation, user.access_token);
        setEntities(entityData || []);
        entityIdsToFetch = (entityData || []).map(e => e.id);
      } catch (error) {
        toast({
          title: 'Error',
          description: `Failed to fetch entities for voucher data: ${error.message}`,
          variant: 'destructive',
        });
        setEntities([]);
        setIsLoading(false);
        return;
      }
    } else {
      entityIdsToFetch = [selectedEntity];
    }
    
    if (entityIdsToFetch.length === 0) {
      setVouchers([]);
      setIsLoading(false);
      return;
    }

    try {
      const fetchPromises = entityIdsToFetch.map(id => getCATeamVouchers(id, user.access_token));
      const results = await Promise.allSettled(fetchPromises);
      const allVouchers = results
        .filter(res => res.status === 'fulfilled' && Array.isArray(res.value))
        .flatMap(res => res.value)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      
      setVouchers(allVouchers);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch voucher data: ${error.message}`,
        variant: 'destructive',
      });
      setVouchers([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrganisation, selectedEntity, user?.access_token, toast]);

  useEffect(() => {
    fetchDataForClient();
  }, [fetchDataForClient, isDataLoading]); // Refreshes when isDataLoading prop changes

  const handleViewVoucher = (voucher) => {
    navigate(`/vouchers/ca/${voucher.id}`, { state: { voucher, vouchers: enrichedVouchers, organisationId: selectedOrganisation } });
  };

  const enrichedVouchers = useMemo(() => {
    return (vouchers || []).map(v => ({
      ...v,
      beneficiaryName: v.beneficiary_name || (v.beneficiary 
        ? (v.beneficiary.beneficiary_type === 'individual' ? v.beneficiary.name : v.beneficiary.company_name) 
        : 'Unknown Beneficiary'),
    }));
  }, [vouchers]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {isLoading ? (
        <VoucherHistorySkeleton />
      ) : (
        <VoucherHistory 
          vouchers={enrichedVouchers}
          onDeleteVoucher={() => toast({ title: "Note", description: "Deletion from this view is not supported."})}
          onViewVoucher={handleViewVoucher}
          onRefresh={onRefresh} // Pass down the refresh handler from the parent
        />
      )}
    </motion.div>
  );
};

export default Vouchers;
