import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useOrganisation } from '@/hooks/useOrganisation';
import { deleteInvoice, updateInvoice, getBeneficiaries, getInvoiceAttachment, getFinanceHeaders, getCATeamInvoices, getInvoices } from '@/lib/api.js';
import { useApiCache } from '@/contexts/ApiCacheContext.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Edit, Trash2, FileText, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RefreshCcw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import ActivityLog from '@/components/finance/ActivityLog';

const DetailItem = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 border-b border-white/10">
    <p className="text-sm text-gray-400">{label}</p>
    <p className="text-sm font-semibold text-white capitalize">{value}</p>
  </div>
);

const InvoiceDetailsCA = () => {
  const { invoiceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { organisationId, selectedEntity, entities, loading: orgLoading } = useOrganisation();
  const { toast } = useToast();
  const cache = useApiCache();
  const { invoice: initialInvoice, invoices, startInEditMode, organizationName, entityName, isReadOnly } = location.state || {};
  const [invoice, setInvoice] = useState(initialInvoice);
  const [invoiceList, setInvoiceList] = useState(invoices || []);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const hasFetchedInvoices = useRef(false);
  const invoiceDetailsRef = useRef(null);
  const [attachmentUrl, setAttachmentUrl] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [editedInvoice, setEditedInvoice] = useState(invoice);
  const [zoom, setZoom] = useState(1);
  const [financeHeaders, setFinanceHeaders] = useState([]);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [attachmentContentType, setAttachmentContentType] = useState(null);
  const [allAttachmentIds, setAllAttachmentIds] = useState([]);
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default to expanded width (300px + padding)

  // Refs to prevent duplicate API calls
  const fetchingInvoiceRef = useRef(false);
  const fetchingAttachmentRef = useRef(null); // Track which attachment is being fetched
  const lastFetchedInvoiceIdRef = useRef(null);
  const activityLogRef = useRef(null);
  const attachmentRef = useRef(null);

  // Status management state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  // Hide scrollbars globally for this page
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
            /* Hide scrollbar for Chrome, Safari and Opera */
            .hide-scrollbar::-webkit-scrollbar {
                display: none;
            }
            /* Hide scrollbar for IE, Edge and Firefox */
            .hide-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
        `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Get entity name from user entities
  const getEntityName = () => {
    if (!user) return 'N/A';
    if (selectedEntity && selectedEntity !== "all" && entities.length > 0) {
      const entity = entities.find(e => String(e.id) === String(selectedEntity));
      if (entity) return entity.name;
    }
    // Fallback to entityName from location state
    return entityName || 'N/A';
  };

  useEffect(() => {
    if (startInEditMode) {
      setIsEditing(true);
    }
  }, [startInEditMode]);

  // Detect sidebar width to adjust left arrow position
  useEffect(() => {
    const detectSidebarWidth = () => {
      const sidebar = document.querySelector('aside');
      if (sidebar) {
        const width = sidebar.offsetWidth;
        setSidebarWidth(width);
      }
    };

    // Initial detection
    detectSidebarWidth();

    // Use ResizeObserver to watch for sidebar width changes
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setSidebarWidth(entry.contentRect.width);
        }
      });
      resizeObserver.observe(sidebar);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user?.access_token) return;

    // Reset refs when invoiceId changes
    if (lastFetchedInvoiceIdRef.current !== invoiceId) {
      fetchingInvoiceRef.current = false;
      fetchingAttachmentRef.current = null;
    }

    // Prevent duplicate fetches for the same invoice
    if (fetchingInvoiceRef.current || lastFetchedInvoiceIdRef.current === invoiceId) {
      return;
    }

    let isMounted = true;
    const fetchData = async () => {
      try {
        // Prevent duplicate calls
        if (fetchingInvoiceRef.current) return;
        fetchingInvoiceRef.current = true;

        // Use initialInvoice if available, otherwise fetch
        let currentInvoice = initialInvoice;

        // Get entityId for fetch - preferred from selectedEntity, fallback to localStorage
        const entityId = selectedEntity || localStorage.getItem('entityId');

        // Only fetch if we don't have initial invoice or if invoiceId changed
        if (!currentInvoice || String(currentInvoice.id) !== String(invoiceId)) {
          // Start by checking invoices list passed in state
          if (invoices && invoices.length > 0) {
            currentInvoice = invoices.find(i => String(i.id) === String(invoiceId));
          }

          if (!currentInvoice && entityId) {
            // Check cache first
            const cacheKey = { invoiceId, entityId, token: user.access_token };
            // Invoice cache might be tricky with multiple entities, skipping strict single-item cache check 
            // and relying on API call if not in list

            try {
              // Try to get FULL invoice details
              // Note: Using standard GET /api/invoices/{id} endpoint which handles access control
              // We need to pass entity_id query param if available
              const entityIdParam = entityId ? `?entity_id=${entityId}` : '';
              const response = await fetch(`${import.meta.env.VITE_FINANCE_API_URL || 'http://127.0.0.1:8003'}/api/invoices/${invoiceId}${entityIdParam}`, {
                headers: {
                  'Authorization': `Bearer ${user.access_token}`
                }
              });

              if (response.ok) {
                currentInvoice = await response.json();
              }
            } catch (err) {
              console.error("Failed to fetch single invoice", err);
            }
          }
        }

        if (!currentInvoice) {
          toast({ title: 'Error', description: 'Invoice not found.', variant: 'destructive' });
          setIsLoading(false);
          return;
        }

        if (isMounted) {
          setInvoice(currentInvoice);
          setEditedInvoice(currentInvoice);
          setIsLoading(false);
          setLoadingInvoice(false);
          lastFetchedInvoiceIdRef.current = invoiceId;

          // Collect all attachment IDs (primary + additional)
          // First, try direct attachment_id field
          let primaryAttachmentId = null;
          if (currentInvoice.attachment_id) {
            primaryAttachmentId = currentInvoice.attachment_id;
          }
          // Then try attachment object with id field
          else if (currentInvoice.attachment) {
            if (typeof currentInvoice.attachment === 'object') {
              primaryAttachmentId = currentInvoice.attachment.id || currentInvoice.attachment.attachment_id;
            } else if (typeof currentInvoice.attachment === 'number') {
              primaryAttachmentId = currentInvoice.attachment;
            }
          }

          const additionalIds = currentInvoice.additional_attachment_ids || [];
          const allIds = [];
          if (primaryAttachmentId) {
            allIds.push(primaryAttachmentId);
          }
          // Add additional attachments (excluding the primary if it's also in additional)
          additionalIds.forEach(id => {
            if (id && id !== primaryAttachmentId && !allIds.includes(id)) {
              allIds.push(id);
            }
          });
          console.log("Collected attachment IDs:", { primaryAttachmentId, additionalIds, allIds });
          setAllAttachmentIds(allIds);
          setCurrentAttachmentIndex(0); // Reset to first attachment

          // Load attachment and finance headers in parallel (non-blocking)
          const promises = [];

          // Always reset attachment state when invoice changes
          // Load first attachment - prevent duplicate fetches
          if (allIds.length > 0 && fetchingAttachmentRef.current !== allIds[0]) {
            setIsImageLoading(true);
            setAttachmentUrl(null); // Reset attachment URL
            setAttachmentContentType(null);
            fetchingAttachmentRef.current = allIds[0];
            console.log("Fetching invoice attachment with ID:", allIds[0]);
            promises.push(
              getInvoiceAttachment(allIds[0], user.access_token)
                .then(result => {
                  // Handle both old format (string URL) and new format (object with url and contentType)
                  const url = typeof result === 'string' ? result : result?.url;
                  const contentType = typeof result === 'object' ? result?.contentType : null;

                  console.log("Invoice attachment URL received:", url ? "Yes" : "No", url, "Content-Type:", contentType);
                  if (url) {
                    setAttachmentUrl(url);
                    setAttachmentContentType(contentType);
                    // For PDFs, set loading to false immediately since iframes don't have onLoad
                    const isPdf = contentType?.toLowerCase().includes('pdf') || url.toLowerCase().endsWith('.pdf');
                    if (isPdf) {
                      setIsImageLoading(false);
                    }
                    // For images, keep loading state true - onLoad handler will set it to false
                  } else {
                    console.log("No URL returned from getInvoiceAttachment");
                    setIsImageLoading(false);
                    setAttachmentUrl(null);
                    setAttachmentContentType(null);
                  }
                  fetchingAttachmentRef.current = null; // Clear fetching flag
                })
                .catch(err => {
                  console.error("Failed to fetch invoice attachment:", err);
                  setIsImageLoading(false);
                  setAttachmentUrl(null);
                  setAttachmentContentType(null);
                  fetchingAttachmentRef.current = null; // Clear fetching flag
                  // Show a toast for user feedback
                  toast({
                    title: 'Attachment Error',
                    description: `Failed to load attachment: ${err.message}`,
                    variant: 'destructive'
                  });
                })
            );
          } else {
            console.log("No attachment_id found in invoice object.");
            setAttachmentUrl(null);
            setIsImageLoading(false);
          }

          if (user && (user.role === 'CA_ACCOUNTANT' || user.role === 'CA_TEAM')) {
            promises.push(
              getFinanceHeaders(user.agency_id, user.access_token)
                .then(headers => setFinanceHeaders(headers))
                .catch(err => console.error("Failed to fetch finance headers:", err))
            );
          }

          // Fetch beneficiaries (useful for editing)
          const orgIdToFetch = organisationId || currentInvoice?.beneficiary?.organization_id;
          if (orgIdToFetch) {
            promises.push(
              getBeneficiaries(orgIdToFetch, user.access_token)
                .then(data => setBeneficiaries(data || []))
                .catch(err => console.error("Failed to fetch beneficiaries:", err))
            );
          }

          // Don't wait for these - they load in background
          Promise.all(promises).catch(err => console.error("Background fetch error:", err));
        }
      } catch (error) {
        toast({ title: 'Error', description: `Failed to fetch data: ${error.message}`, variant: 'destructive' });
        setIsLoading(false);
      } finally {
        fetchingInvoiceRef.current = false;
      }
    };

    fetchData();
    return () => {
      isMounted = false;
      fetchingInvoiceRef.current = false;
    };
  }, [invoiceId, authLoading, user?.access_token, initialInvoice?.id]);


  // Handle attachment navigation
  const handleAttachmentNavigate = async (direction) => {
    if (allAttachmentIds.length <= 1 || !user?.access_token) return; // No navigation if only one or no attachments, or no auth token

    const newIndex = currentAttachmentIndex + direction;
    if (newIndex >= 0 && newIndex < allAttachmentIds.length) {
      const attachmentId = allAttachmentIds[newIndex];

      // Prevent duplicate fetches
      if (fetchingAttachmentRef.current === attachmentId) return;

      setIsImageLoading(true);
      setAttachmentUrl(null);
      setAttachmentContentType(null);
      setCurrentAttachmentIndex(newIndex);
      fetchingAttachmentRef.current = attachmentId;

      try {
        const result = await getInvoiceAttachment(attachmentId, user.access_token);
        // Handle both old format (string URL) and new format (object with url and contentType)
        const url = typeof result === 'string' ? result : result?.url;
        const contentType = typeof result === 'object' ? result?.contentType : null;

        if (url) {
          setAttachmentUrl(url);
          setAttachmentContentType(contentType);
          const isPdf = contentType?.toLowerCase().includes('pdf') || url.toLowerCase().endsWith('.pdf');
          if (isPdf) {
            setIsImageLoading(false);
          }
        } else {
          setIsImageLoading(false);
        }
        fetchingAttachmentRef.current = null; // Clear fetching flag
      } catch (error) {
        console.error("Failed to fetch attachment:", error);
        setIsImageLoading(false);
        setAttachmentUrl(null);
        setAttachmentContentType(null);
        fetchingAttachmentRef.current = null; // Clear fetching flag
        toast({
          title: 'Attachment Error',
          description: `Failed to load attachment: ${error.message}`,
          variant: 'destructive'
        });
      }
    }
  };


  useEffect(() => {
    // Only fetch if we don't have invoices from location.state and haven't fetched yet
    if (invoices && invoices.length > 0) {
      setInvoiceList(invoices);
      return;
    }

    if (hasFetchedInvoices.current || orgLoading || !selectedEntity || !user?.access_token || entities.length === 0) {
      return;
    }

    const fetchAllInvoices = async () => {
      hasFetchedInvoices.current = true;

      let entityIdsToFetch = [];
      if (selectedEntity === "all") {
        entityIdsToFetch = entities.map((e) => e.id);
      } else {
        entityIdsToFetch = [selectedEntity];
      }

      try {
        // Check cache for each entity's invoices
        const fetchPromises = entityIdsToFetch.map(async (id) => {
          const cacheKey = { entityId: id, token: user.access_token };
          let cached = cache.get('getCATeamInvoices', cacheKey);
          if (cached) {
            return cached;
          }
          const data = await getCATeamInvoices(id, user.access_token);
          cache.set('getCATeamInvoices', cacheKey, data);
          return data;
        });

        const results = await Promise.all(fetchPromises);
        const allInvoices = results.flat().sort((a, b) => new Date(b.created_date || b.date) - new Date(a.created_date || a.date));
        setInvoiceList(allInvoices);
      } catch (error) {
        toast({ title: 'Error', description: `Failed to fetch invoice list: ${error.message}`, variant: 'destructive' });
      }
    };

    fetchAllInvoices();
  }, [selectedEntity, user?.access_token, orgLoading, entities, invoices, toast, cache]);

  useEffect(() => {
    if (invoiceList.length > 0) {
      const newIndex = invoiceList.findIndex(i => String(i.id) === String(invoiceId));
      if (newIndex >= 0) {
        setCurrentIndex(newIndex);
      } else if (currentIndex === -1 && invoice) {
        // If invoice not found in list but we have an invoice, try to add it or find by invoice.id
        const indexById = invoiceList.findIndex(i => String(i.id) === String(invoice.id));
        if (indexById >= 0) {
          setCurrentIndex(indexById);
        }
      }
    } else if (invoices && invoices.length > 0) {
      // Fallback to invoices from location.state if invoiceList is empty
      const newIndex = invoices.findIndex(i => String(i.id) === String(invoiceId));
      if (newIndex >= 0) {
        setCurrentIndex(newIndex);
      }
    }
  }, [invoiceList, invoiceId, invoice, invoices, currentIndex]);

  const handleNavigate = (direction) => {
    if (!invoiceList || invoiceList.length === 0) {
      console.warn("No invoices available for navigation");
      return;
    }
    const newIndex = currentIndex + direction;
    console.log("Navigating:", { currentIndex, newIndex, direction, invoicesLength: invoiceList.length });
    if (newIndex >= 0 && newIndex < invoiceList.length) {
      setLoadingInvoice(true);
      setAttachmentUrl(null);
      setAttachmentContentType(null);
      setAllAttachmentIds([]);
      setCurrentAttachmentIndex(0);
      setIsImageLoading(false);
      const nextInvoice = invoiceList[newIndex];
      console.log("Navigating to invoice:", nextInvoice.id);
      // Update currentIndex immediately
      setCurrentIndex(newIndex);
      navigate(`/invoices/ca/${nextInvoice.id}`, {
        state: {
          invoice: nextInvoice,
          invoices: invoiceList,
          organizationName,
          entityName
        },
        replace: true
      });
    } else {
      console.warn("Navigation out of bounds:", { newIndex, invoicesLength: invoiceList.length });
    }
  };

  // Check if we have invoices to navigate - show arrows if we have multiple invoices
  const hasInvoices = invoiceList && Array.isArray(invoiceList) && invoiceList.length > 1;

  const invoiceDetails = invoice || {
    id: invoiceId,
    beneficiary_name: 'N/A',
    created_date: new Date().toISOString(),
    date: new Date().toISOString(),
    amount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    roundoff: 0,
    remarks: 'No remarks available.',
  };

  // Status helper functions
  const formatStatus = (status) => {
    if (!status || status === 'created') return 'Pending';
    // Map new two-tier approval statuses to friendly names - same as Vouchers
    const statusMap = {
      pending_master_admin_approval: 'Pending Client Approval',
      rejected_by_master_admin: 'Rejected by Client',
      pending_ca_approval: 'Pending Verification',
      rejected_by_ca: 'Rejected',
      verified: 'Verified',
      // Legacy statuses
      created: 'Pending',
      pending_approval: 'Pending Client Approval',
      rejected_by_admin: 'Rejected by Client',
      approved: 'Approved',
      rejected: 'Rejected'
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified':
      case 'approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected':
      case 'rejected_by_master_admin':
      case 'rejected_by_admin':
      case 'rejected_by_ca':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  // Status update handler
  const handleStatusUpdate = async (newStatus) => {
    if ((newStatus === 'rejected_by_ca' || newStatus === 'rejected') && !rejectionRemarks) {
      setShowRejectDialog(true);
      return;
    }

    setIsStatusUpdating(true);
    try {
      const payload = {
        status: newStatus,
        ...((newStatus === 'rejected_by_ca' || newStatus === 'rejected') && rejectionRemarks && { status_remarks: rejectionRemarks })
      };

      const entityId = selectedEntity || invoice?.entity_id || localStorage.getItem('entityId');
      const updatedInvoice = await updateInvoice(invoiceId, entityId, payload, user.access_token);

      // Invalidate cache
      cache.invalidate('getCATeamInvoices', { entityId, token: user.access_token });

      // Note: Single GetInvoice cache invalidation is tricky if key is complex, but we updated state

      if (updatedInvoice) {
        setInvoice(updatedInvoice);
        setEditedInvoice(updatedInvoice);
      }

      toast({
        title: 'Success',
        description: `Invoice ${newStatus} successfully.`
      });

      setShowRejectDialog(false);
      setRejectionRemarks('');
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to update status: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const getBeneficiaryName = () => {
    if (invoiceDetails.beneficiary) {
      return invoiceDetails.beneficiary.beneficiary_type === 'individual' ? invoiceDetails.beneficiary.name : invoiceDetails.beneficiary.company_name;
    }
    return invoiceDetails.beneficiary_name || 'N/A';
  };

  const totalAmount = (
    parseFloat(invoiceDetails.amount || 0) +
    parseFloat(invoiceDetails.cgst || 0) +
    parseFloat(invoiceDetails.sgst || 0) +
    parseFloat(invoiceDetails.igst || 0) +
    parseFloat(invoiceDetails.roundoff || 0)
  ).toFixed(2);


  if (isLoading && !invoice?.id) return <div className="p-8 text-center text-white">Loading invoice details...</div>;

  const canVerify = user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM';
  const isVerified = invoiceDetails.status === 'verified';
  const isRejected = invoiceDetails.status === 'rejected_by_ca';

  return (
    <div className="flex flex-col h-full bg-slate-950/50">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between p-4 border-b bg-slate-900/80 backdrop-blur-md border-white/10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Invoice #{invoiceDetails.bill_number || invoiceDetails.id}
              </h1>
              <span className={`px-3 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(invoiceDetails.status)}`}>
                {formatStatus(invoiceDetails.status)}
              </span>
            </div>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <span>{getEntityName()}</span>
              <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
              <span>{new Date(invoiceDetails.date).toLocaleDateString()}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasInvoices && (
            <div className="flex items-center mr-2 bg-slate-800/50 rounded-lg p-1 border border-white/10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate(-1)}
                disabled={currentIndex <= 0}
                className="h-8 w-8 text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-gray-400 px-2 font-medium min-w-[60px] text-center">
                {currentIndex + 1} / {invoiceList.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate(1)}
                disabled={currentIndex >= invoiceList.length - 1}
                className="h-8 w-8 text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {canVerify && !isVerified && !isRejected && invoiceDetails.status !== 'rejected_by_master_admin' && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(true)}
                disabled={isStatusUpdating}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
              <Button
                onClick={() => handleStatusUpdate('verified')}
                disabled={isStatusUpdating}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-lg shadow-emerald-900/20"
              >
                {isStatusUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Verify Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Split View Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Panel: Details */}
          <ResizablePanel defaultSize={40} minSize={30} className="bg-slate-900/50">
            <Tabs defaultValue="details" className="h-full flex flex-col">
              <div className="px-4 pt-4">
                <TabsList className="bg-slate-800/50 border border-white/10 w-full grid grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="activity">Activity Log</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="details" className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
                <Card className="glass-card border-white/5 bg-slate-900/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium text-white">Beneficiary Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <DetailItem label="Name" value={getBeneficiaryName()} />
                    {invoiceDetails.beneficiary && (
                      <>
                        <DetailItem label="PAN" value={invoiceDetails.beneficiary.pan || 'N/A'} />
                        <DetailItem label="GSTIN" value={invoiceDetails.beneficiary.gstin || 'N/A'} />
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="glass-card border-white/5 bg-slate-900/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium text-white">Invoice Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <DetailItem label="Bill Number" value={invoiceDetails.bill_number || 'N/A'} />
                    <DetailItem label="Invoice Date" value={new Date(invoiceDetails.date).toLocaleDateString() || 'N/A'} />
                    <DetailItem label="Base Amount" value={`₹${parseFloat(invoiceDetails.amount || 0).toFixed(2)}`} />
                    <DetailItem label="CGST" value={`₹${parseFloat(invoiceDetails.cgst || 0).toFixed(2)}`} />
                    <DetailItem label="SGST" value={`₹${parseFloat(invoiceDetails.sgst || 0).toFixed(2)}`} />
                    <DetailItem label="IGST" value={`₹${parseFloat(invoiceDetails.igst || 0).toFixed(2)}`} />
                    <DetailItem label="Roundoff" value={`₹${parseFloat(invoiceDetails.roundoff || 0).toFixed(2)}`} />
                    <div className="flex justify-between items-center py-3 mt-2 border-t border-white/10">
                      <p className="text-base font-medium text-white">Total Amount</p>
                      <p className="text-xl font-bold text-emerald-400">₹{totalAmount}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-white/5 bg-slate-900/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium text-white">Remarks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {invoiceDetails.remarks || 'No remarks provided.'}
                    </p>
                  </CardContent>
                </Card>

                {(invoiceDetails.status === 'rejected' || invoiceDetails.status === 'rejected_by_ca' || invoiceDetails.status === 'rejected_by_admin' || invoiceDetails.status === 'rejected_by_master_admin') && (
                  <Card className="glass-card border-red-500/20 bg-red-500/5">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <CardTitle className="text-lg font-medium">Rejection Details</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-red-200 leading-relaxed">
                        {invoiceDetails.status_remarks || 'No rejection remarks provided.'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="activity" className="flex-1 overflow-hidden h-full">
                <ActivityLog
                  itemId={invoiceId}
                  itemType="invoices"
                  ref={activityLogRef}
                />
              </TabsContent>
            </Tabs>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-slate-800 border-l border-r border-white/5" />

          {/* Right Panel: Attachment */}
          <ResizablePanel defaultSize={60} minSize={30} className="bg-black/40 relative">
            {loadingInvoice ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : attachmentUrl ? (
              <div className="h-full flex flex-col relative group">
                <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="secondary" onClick={() => setZoom(1)}>
                    <RefreshCcw className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="secondary" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="secondary" onClick={() => window.open(attachmentUrl, '_blank')}>
                    <FileText className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                  {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-20 backdrop-blur-sm">
                      <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                  )}
                  {attachmentContentType?.includes('pdf') || attachmentUrl.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={attachmentUrl}
                      className="w-full h-full rounded-lg shadow-2xl bg-white"
                      title="Invoice Attachment"
                    />
                  ) : (
                    <img
                      src={attachmentUrl}
                      alt="Invoice Attachment"
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
                      style={{ transform: `scale(${zoom})` }}
                      onLoad={() => setIsImageLoading(false)}
                      onError={() => setIsImageLoading(false)}
                    />
                  )}
                </div>

                {/* Attachment Navigation */}
                {allAttachmentIds.length > 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 z-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 rounded-full h-8 w-8"
                      onClick={() => handleAttachmentNavigate(-1)}
                      disabled={currentAttachmentIndex === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-medium text-white">
                      {currentAttachmentIndex + 1} / {allAttachmentIds.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 rounded-full h-8 w-8"
                      onClick={() => handleAttachmentNavigate(1)}
                      disabled={currentAttachmentIndex === allAttachmentIds.length - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                <p>No attachment available</p>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Invoice</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this invoice. This will be visible to the client.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-remarks">Rejection Remarks</Label>
            <Textarea
              id="rejection-remarks"
              value={rejectionRemarks}
              onChange={(e) => setRejectionRemarks(e.target.value)}
              placeholder="Enter rejection reason..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => handleStatusUpdate('rejected_by_ca')}
              disabled={!rejectionRemarks.trim()}
            >
              Reject Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceDetailsCA;
