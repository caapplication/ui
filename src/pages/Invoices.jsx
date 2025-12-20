import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getCATeamInvoices, listEntities } from '@/lib/api';
import InvoiceHistory from '@/components/finance/InvoiceHistory';
import { InvoiceHistorySkeleton } from '@/components/finance/InvoiceHistorySkeleton';
import { useNavigate } from 'react-router-dom';

const Invoices = ({ selectedOrganisation, selectedEntity, isDataLoading, onRefresh }) => {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchDataForClient = useCallback(async () => {
    if (!selectedEntity || !user?.access_token) {
      setInvoices([]);
      return;
    }
    setIsLoading(true);
    
    let entityIdsToFetch = [];
    if (selectedEntity === 'all') {
      try {
        const entityData = await listEntities(selectedOrganisation, user.access_token);
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
      const fetchPromises = entityIdsToFetch.map(id => getCATeamInvoices(id, user.access_token));
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
    }
  }, [selectedOrganisation, selectedEntity, user?.access_token, toast]);

  useEffect(() => {
    fetchDataForClient();
  }, [fetchDataForClient, isDataLoading]);

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
