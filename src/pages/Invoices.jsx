import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getCATeamInvoices, listEntities } from '@/lib/api';
import InvoiceHistory from '@/components/finance/InvoiceHistory';
import { InvoiceHistorySkeleton } from '@/components/finance/InvoiceHistorySkeleton';
import { useNavigate } from 'react-router-dom';
import { useApiCache } from '@/contexts/ApiCacheContext.jsx';

const Invoices = ({ selectedOrganisation, selectedEntity, isDataLoading, onRefresh }) => {
  const [invoices, setInvoices] = useState([]);
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
    
    // Check cache first before making any API calls
    if (selectedEntity !== 'all') {
      const cacheKey = { entityId: selectedEntity, token: user.access_token };
      const cached = cache.get('getCATeamInvoices', cacheKey);
      if (cached && lastFetchKey.current === fetchKey) {
        // We have cached data for this exact fetch, use it
        setInvoices(cached);
        setIsLoading(false);
        return;
      }
    }
    
    // Prevent concurrent fetches - if we already have data for this exact fetch key, skip
    if (lastFetchKey.current === fetchKey && invoices.length > 0) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
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
      // Check cache for each entity's invoices and deduplicate requests
      const fetchPromises = entityIdsToFetch.map(async (id) => {
        const cacheKey = { entityId: id, token: user.access_token };
        const requestKey = `getCATeamInvoices-${id}-${user.access_token}`;
        
        // Check cache first
        let cached = cache.get('getCATeamInvoices', cacheKey);
        if (cached) {
          return cached;
        }
        
        // Check if there's already a pending request for this entity
        if (pendingRequestsRef.current.has(requestKey)) {
          // Wait for the existing request to complete
          return await pendingRequestsRef.current.get(requestKey);
        }
        
        // Create a new request and store it
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
        return await requestPromise;
      });
      
      const results = await Promise.allSettled(fetchPromises);
      const allInvoices = results
        .filter(res => res.status === 'fulfilled' && Array.isArray(res.value))
        .flatMap(res => res.value);
      
      setInvoices(allInvoices);
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
    // Only fetch if entity or organization changes, not when switching tabs
    fetchDataForClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganisation, selectedEntity, user?.access_token]); // Removed isDataLoading to prevent refetch on tab switch

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
          onDeleteInvoice={() => toast({ title: "Note", description: "Deletion from this view is not supported."})}
          onViewInvoice={handleViewInvoice}
          onRefresh={onRefresh}
        />
      )}
    </motion.div>
  );
};

export default Invoices;
