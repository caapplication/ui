import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getCATeamVouchers, listEntities } from '@/lib/api';
import VoucherHistory from '@/components/finance/VoucherHistory';
import { VoucherHistorySkeleton } from '@/components/finance/VoucherHistorySkeleton';
import { useNavigate } from 'react-router-dom';
import { useApiCache } from '@/contexts/ApiCacheContext.jsx';

const Vouchers = ({ selectedOrganisation, selectedEntity, isDataLoading, onRefresh }) => {
  const [vouchers, setVouchers] = useState([]);
  const [entities, setEntities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const cache = useApiCache();
  const lastFetchKey = useRef(null);
  const isFetchingRef = useRef(false);
  const pendingRequestsRef = useRef(new Map());

  const fetchDataForClient = useCallback(async () => {
    // If we don't have required dependencies, keep loading state true
    // This prevents showing "No vouchers found" before we've attempted to load
    if (!selectedEntity || !user?.access_token) {
      // Only set loading to false if we've attempted to load before and dependencies are missing
      if (hasAttemptedLoad) {
        setVouchers([]);
        setIsLoading(false);
      } else {
        // Keep loading true until we have dependencies
        setIsLoading(true);
      }
      return;
    }

    // Create a unique key for this fetch
    const fetchKey = `${selectedEntity}-${selectedOrganisation}`;
    
    // Skip if we're already fetching the same data or currently fetching
    if (isFetchingRef.current) {
      return;
    }
    
    // Check cache first before making any API calls
    if (selectedEntity !== 'all') {
      const cacheKey = { entityId: selectedEntity, token: user.access_token };
      const cached = cache.get('getCATeamVouchers', cacheKey);
      if (cached && lastFetchKey.current === fetchKey) {
        // We have cached data for this exact fetch, use it
        setVouchers(cached);
        setIsLoading(false);
        return;
      }
    }
    
    // Prevent concurrent fetches
    if (lastFetchKey.current === fetchKey && !isDataLoading) {
      return;
    }
    
    setIsLoading(true);
    setHasAttemptedLoad(true);
    lastFetchKey.current = fetchKey;
    isFetchingRef.current = true;
    
    let entityIdsToFetch = [];
    if (selectedEntity === 'all') {
      // If 'all' is selected, we need to fetch the full entity list first.
      try {
        // Check cache first
        let entityData = cache.get('listEntities', { orgId: selectedOrganisation, token: user.access_token });
        if (!entityData) {
          entityData = await listEntities(selectedOrganisation, user.access_token);
          cache.set('listEntities', { orgId: selectedOrganisation, token: user.access_token }, entityData);
        }
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
      // Check cache for each entity's vouchers and deduplicate requests
      const fetchPromises = entityIdsToFetch.map(async (id) => {
        const cacheKey = { entityId: id, token: user.access_token };
        const requestKey = `getCATeamVouchers-${id}-${user.access_token}`;
        
        // Check cache first
        let cached = cache.get('getCATeamVouchers', cacheKey);
        if (cached) {
          return cached;
        }
        
        // Check if there's already a pending request for this entity
        if (pendingRequestsRef.current.has(requestKey)) {
          // Wait for the existing request to complete
          return await pendingRequestsRef.current.get(requestKey);
        }
        
        // Create a new request and store it
        const requestPromise = getCATeamVouchers(id, user.access_token)
          .then(data => {
            cache.set('getCATeamVouchers', cacheKey, data);
            pendingRequestsRef.current.delete(requestKey);
            return data;
          })
          .catch(error => {
            pendingRequestsRef.current.delete(requestKey);
            throw error;
          });
        
        pendingRequestsRef.current.set(requestKey, requestPromise);
        return await requestPromise;
      });
      
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
      isFetchingRef.current = false;
    }
  }, [selectedOrganisation, selectedEntity, user?.access_token, toast, hasAttemptedLoad, cache, isDataLoading]);

  useEffect(() => {
    fetchDataForClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganisation, selectedEntity, user?.access_token, isDataLoading]); // Only re-fetch when these change

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
