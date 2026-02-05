import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getVouchersList, getCATeamVouchersBulk, listEntities } from '@/lib/api';
import VoucherHistory from '@/components/finance/VoucherHistory';
import { VoucherHistorySkeleton } from '@/components/finance/VoucherHistorySkeleton';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApiCache } from '@/contexts/ApiCacheContext.jsx';

const Vouchers = ({ selectedOrganisation, selectedEntity, isDataLoading, onRefresh, isActive = true, entities: entitiesFromProps }) => {
  const [vouchers, setVouchers] = useState([]);
  const [entities, setEntities] = useState(entitiesFromProps || []);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const cache = useApiCache();
  const lastFetchKey = useRef(null);
  const isFetchingRef = useRef(false);
  const pendingRequestsRef = useRef(new Map());
  const lastLocationRef = useRef(location.pathname);

  // Update entities when prop changes
  useEffect(() => {
    if (entitiesFromProps) {
      setEntities(entitiesFromProps);
    }
  }, [entitiesFromProps]);

  const fetchDataForClient = useCallback(async () => {
    // If we don't have required dependencies, keep loading state true
    // This prevents showing "No vouchers found" before we've attempted to load
    if (!user?.access_token) {
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

    // If no entity is selected but we have an organization, we need to wait for entities or use "all"
    // For CA panel, if selectedEntity is null but selectedOrganisation exists, we should fetch for all entities
    let entityToFetch = selectedEntity;
    if (!entityToFetch && selectedOrganisation) {
      // If no entity is selected, we'll fetch for all entities (if entities list is available)
      // Otherwise, we'll wait for entities to load
      if (entities.length === 0) {
        // Keep loading until entities are available
        setIsLoading(true);
        return;
      }
      // Default to "all" if no specific entity is selected
      entityToFetch = "all";
    }

    if (!entityToFetch) {
      // Still no entity to fetch - keep loading
      if (hasAttemptedLoad) {
        setVouchers([]);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
      return;
    }

    // Create a unique key for this fetch
    const fetchKey = `${entityToFetch}-${selectedOrganisation}`;

    // Skip if we're already fetching the same data or currently fetching
    if (isFetchingRef.current) {
      return;
    }

    // OPTIMIZATION: Check cache first and show immediately, then refresh in background
    /* Cache check disabled to ensure fresh data always
    if (entityToFetch !== 'all') {
      const cacheKey = { entityId: entityToFetch, token: user.access_token };
      const cached = cache.get('getVouchersList', cacheKey);
      if (cached) {
        // Show cached data immediately for instant UI response
        setVouchers(cached);
        setIsLoading(false);
        // If this is the same fetch key, we already have fresh data
        if (lastFetchKey.current === fetchKey) {
          return;
        }
      }
    }
    */

    // Prevent concurrent fetches - if we already have data for this exact fetch key, skip
    if (lastFetchKey.current === fetchKey && vouchers.length > 0) {
      setIsLoading(false);
      return;
    }

    // Only show loading if we don't have cached data
    if (vouchers.length === 0) {
      setIsLoading(true);
    }
    setHasAttemptedLoad(true);
    lastFetchKey.current = fetchKey;
    isFetchingRef.current = true;

    let entityIdsToFetch = [];
    if (entityToFetch === 'all') {
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
      entityIdsToFetch = [entityToFetch];
    }

    if (entityIdsToFetch.length === 0) {
      setVouchers([]);
      setIsLoading(false);
      return;
    }

    try {
      // ULTRA-FAST OPTIMIZATION: Use bulk endpoint when fetching multiple entities
      if (entityIdsToFetch.length > 1) {
        // Use bulk endpoint - single API call instead of N calls
        const cacheKey = { entityIds: entityIdsToFetch.sort().join(','), token: user.access_token };
        const requestKey = `getCATeamVouchersBulk-${cacheKey.entityIds}-${user.access_token}`;

        // Check cache first
        /*
        let cached = cache.get('getCATeamVouchersBulk', cacheKey);
        if (cached) {
          setVouchers(cached);
          setIsLoading(false);
          return;
        }
        */

        // Check if there's already a pending request
        if (pendingRequestsRef.current.has(requestKey)) {
          const data = await pendingRequestsRef.current.get(requestKey);
          setVouchers(data);
          setIsLoading(false);
          return;
        }

        // Create bulk request
        const requestPromise = getCATeamVouchersBulk(entityIdsToFetch, user.access_token)
          .then(data => {
            // Sort by created_date descending
            const sorted = data.sort((a, b) => new Date(b.created_date || b.created_at || 0) - new Date(a.created_date || a.created_at || 0));
            cache.set('getCATeamVouchersBulk', cacheKey, sorted);
            pendingRequestsRef.current.delete(requestKey);
            return sorted;
          })
          .catch(error => {
            pendingRequestsRef.current.delete(requestKey);
            throw error;
          });

        pendingRequestsRef.current.set(requestKey, requestPromise);
        const allVouchers = await requestPromise;
        setVouchers(allVouchers);
      } else {
        // Single entity - use list endpoint (more efficient)
        const id = entityIdsToFetch[0];
        const cacheKey = { entityId: id, token: user.access_token };
        const requestKey = `getVouchersList-${id}-${user.access_token}`;

        // Check cache first
        /*
        let cached = cache.get('getVouchersList', cacheKey);
        if (cached) {
          setVouchers(cached);
          setIsLoading(false);
          return;
        }
        */

        // Check if there's already a pending request
        if (pendingRequestsRef.current.has(requestKey)) {
          const data = await pendingRequestsRef.current.get(requestKey);
          setVouchers(data);
          setIsLoading(false);
          return;
        }

        // Create request
        const requestPromise = getVouchersList(id, user.access_token)
          .then(data => {
            cache.set('getVouchersList', cacheKey, data);
            pendingRequestsRef.current.delete(requestKey);
            return data;
          })
          .catch(error => {
            pendingRequestsRef.current.delete(requestKey);
            throw error;
          });

        pendingRequestsRef.current.set(requestKey, requestPromise);
        const vouchers = await requestPromise;
        setVouchers(vouchers);
      }
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
  }, [selectedOrganisation, selectedEntity, user?.access_token, toast, hasAttemptedLoad, cache, vouchers.length, entities]);

  useEffect(() => {
    // Only fetch if tab is active and entity or organization changes
    if (isActive) {
      lastFetchKey.current = null; // Force refresh always when active
      fetchDataForClient();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganisation, selectedEntity, user?.access_token, isActive]); // Only fetch when tab is active

  // Refresh when navigating back from detail page
  /* Redundant refresh logic removed
  useEffect(() => {
    // If we're on the finance page and were previously on a detail page, refresh
    if (location.pathname.includes('/finance') && !location.pathname.includes('/vouchers/ca/') && !location.pathname.includes('/vouchers/')) {
      const wasOnDetailPage = lastLocationRef.current.includes('/vouchers/ca/') || lastLocationRef.current.includes('/vouchers/');
      if (wasOnDetailPage && isActive) {
        // Invalidate cache and refetch
        if (selectedEntity && selectedEntity !== 'all') {
          cache.invalidate('getVouchersList', { entityId: selectedEntity, token: user?.access_token });
        }
        // Reset fetch key to force refresh
        lastFetchKey.current = null;
        fetchDataForClient();
      }
    }
    lastLocationRef.current = location.pathname;
  }, [location.pathname, isActive, selectedEntity, user?.access_token, cache, fetchDataForClient]);
  */

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
          onDeleteVoucher={() => toast({ title: "Note", description: "Deletion from this view is not supported." })}
          onViewVoucher={handleViewVoucher}
          onRefresh={onRefresh} // Pass down the refresh handler from the parent
        />
      )}
    </motion.div>
  );
};

export default Vouchers;
