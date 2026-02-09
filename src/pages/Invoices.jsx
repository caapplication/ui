import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getCATeamInvoices, getCATeamInvoicesBulk, listEntities } from '@/lib/api';
import InvoiceHistory from '@/components/finance/InvoiceHistory';
import { InvoiceHistorySkeleton } from '@/components/finance/InvoiceHistorySkeleton';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApiCache } from '@/contexts/ApiCacheContext.jsx';

const Invoices = ({ selectedOrganisation, selectedEntity, isDataLoading, onRefresh, isActive = true }) => {
  const [invoices, setInvoices] = useState([]);
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

  const fetchDataForClient = useCallback(async () => {
    // If we don't have required dependencies, keep loading state true
    // This prevents showing "No invoices found" before we've attempted to load
    if (!selectedEntity || !user?.access_token) {
      // Only set loading to false if we've attempted to load before and dependencies are missing
      if (hasAttemptedLoad) {
        setInvoices([]);
        setIsLoading(false);
      } else {
        // Keep loading true until we have dependencies
        setIsLoading(true);
      }
      return;
    }

    // Create a unique key for this fetch
    const fetchKey = `${selectedEntity}-${selectedOrganisation}`;

    // Skip if we're already fetching
    if (isFetchingRef.current) {
      return;
    }

    // OPTIMIZATION: Check cache first and show immediately, then refresh in background
    if (selectedEntity !== 'all') {
      const cacheKey = { entityId: selectedEntity, token: user.access_token };
      const cached = cache.get('getCATeamInvoices', cacheKey);
      if (cached) {
        // Show cached data immediately for instant UI response
        setInvoices(cached);
        setIsLoading(false);
        // If this is the same fetch key, we already have fresh data
        if (lastFetchKey.current === fetchKey) {
          return;
        }
      }
    }

    // Prevent concurrent fetches - if we already have data for this exact fetch key, skip
    if (lastFetchKey.current === fetchKey && invoices.length > 0) {
      setIsLoading(false);
      return;
    }

    // Only show loading if we don't have cached data
    if (invoices.length === 0) {
      setIsLoading(true);
    }
    setHasAttemptedLoad(true);
    lastFetchKey.current = fetchKey;
    isFetchingRef.current = true;

    let entityIdsToFetch = [];
    if (selectedEntity === 'all') {
      try {
        // Check cache first
        let entityData = cache.get('listEntities', { orgId: selectedOrganisation, token: user.access_token });
        if (!entityData) {
          entityData = await listEntities(selectedOrganisation, user.access_token);
          cache.set('listEntities', { orgId: selectedOrganisation, token: user.access_token }, entityData);
        }
        entityIdsToFetch = (entityData || []).map(e => e.id);
      } catch (error) {
        toast({
          title: 'Error',
          description: `Failed to fetch entities for invoice data: ${error.message}`,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
    } else {
      entityIdsToFetch = [selectedEntity];
    }

    if (entityIdsToFetch.length === 0) {
      setInvoices([]);
      setIsLoading(false);
      return;
    }

    try {
      // ULTRA-FAST OPTIMIZATION: Use bulk endpoint when fetching multiple entities
      if (entityIdsToFetch.length > 1) {
        // Use bulk endpoint - single API call instead of N calls
        const cacheKey = { entityIds: entityIdsToFetch.sort().join(','), token: user.access_token };
        const requestKey = `getCATeamInvoicesBulk-${cacheKey.entityIds}-${user.access_token}`;

        // Check cache first
        let cached = cache.get('getCATeamInvoicesBulk', cacheKey);
        if (cached) {
          setInvoices(cached);
          setIsLoading(false);
          return;
        }

        // Check if there's already a pending request
        if (pendingRequestsRef.current.has(requestKey)) {
          const data = await pendingRequestsRef.current.get(requestKey);
          setInvoices(data);
          setIsLoading(false);
          return;
        }

        // Create bulk request
        const requestPromise = getCATeamInvoicesBulk(entityIdsToFetch, user.access_token)
          .then(data => {
            cache.set('getCATeamInvoicesBulk', cacheKey, data);
            pendingRequestsRef.current.delete(requestKey);
            return data;
          })
          .catch(error => {
            pendingRequestsRef.current.delete(requestKey);
            throw error;
          });

        pendingRequestsRef.current.set(requestKey, requestPromise);
        const allInvoices = await requestPromise;
        setInvoices(allInvoices);
      } else {
        // Single entity - use regular endpoint
        const id = entityIdsToFetch[0];
        const cacheKey = { entityId: id, token: user.access_token };
        const requestKey = `getCATeamInvoices-${id}-${user.access_token}`;

        // Check cache first
        let cached = cache.get('getCATeamInvoices', cacheKey);
        if (cached) {
          setInvoices(cached);
          setIsLoading(false);
          return;
        }

        // Check if there's already a pending request
        if (pendingRequestsRef.current.has(requestKey)) {
          const data = await pendingRequestsRef.current.get(requestKey);
          setInvoices(data);
          setIsLoading(false);
          return;
        }

        // Create request
        const requestPromise = getCATeamInvoices(id, user.access_token)
          .then(data => {
            cache.set('getCATeamInvoices', cacheKey, data);
            pendingRequestsRef.current.delete(requestKey);
            return data;
          })
          .catch(error => {
            pendingRequestsRef.current.delete(requestKey);
            throw error;
          });

        pendingRequestsRef.current.set(requestKey, requestPromise);
        const invoices = await requestPromise;
        setInvoices(invoices);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch invoice data: ${error.message}`,
        variant: 'destructive',
      });
      setInvoices([]);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [selectedOrganisation, selectedEntity, user?.access_token, toast, hasAttemptedLoad, cache, invoices.length]);

  useEffect(() => {
    // Only fetch if tab is active and entity or organization changes
    if (isActive) {
      fetchDataForClient();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganisation, selectedEntity, user?.access_token, isActive]); // Only fetch when tab is active

  // Refresh when navigating back from detail page or when onRefresh is called
  useEffect(() => {
    // If we're on the finance page and were previously on a detail page, refresh
    if (location.pathname.includes('/finance') && !location.pathname.includes('/invoices/')) {
      const wasOnDetailPage = lastLocationRef.current.includes('/invoices/');
      if (wasOnDetailPage && isActive) {
        // Invalidate cache and refetch
        if (selectedEntity && selectedEntity !== 'all') {
          cache.invalidate('getCATeamInvoices', { entityId: selectedEntity, token: user?.access_token });
          cache.invalidate('getCATeamInvoicesBulk', null); // Invalidate all bulk caches
        }
        // Reset fetch key to force refresh
        lastFetchKey.current = null;
        isFetchingRef.current = false;
        fetchDataForClient();
      }
    }
    lastLocationRef.current = location.pathname;
  }, [location.pathname, isActive, selectedEntity, user?.access_token, cache, fetchDataForClient]);

  // Listen for refresh prop changes
  useEffect(() => {
    if (onRefresh && isActive) {
      // Invalidate cache when refresh is triggered
      if (selectedEntity && selectedEntity !== 'all') {
        cache.invalidate('getCATeamInvoices', { entityId: selectedEntity, token: user?.access_token });
        cache.invalidate('getCATeamInvoicesBulk', null);
      }
      lastFetchKey.current = null;
      isFetchingRef.current = false;
      fetchDataForClient();
    }
  }, [onRefresh, isActive, selectedEntity, user?.access_token, cache, fetchDataForClient]);

  const handleViewInvoice = (invoice) => {
    const currentIndex = invoices.findIndex(inv => inv.id === invoice.id);
    navigate(`/invoices/${invoice.id}`, { state: { invoice, invoices, currentIndex } });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {isLoading ? (
        <InvoiceHistorySkeleton />
      ) : (
        <InvoiceHistory
          invoices={invoices}
          onDeleteInvoice={() => toast({ title: "Note", description: "Deletion from this view is not supported." })}
          onViewInvoice={handleViewInvoice}
          onRefresh={onRefresh}
        />
      )}
    </motion.div>
  );
};

export default Invoices;
