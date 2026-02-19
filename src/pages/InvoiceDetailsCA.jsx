import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useOrganisation } from '@/hooks/useOrganisation';
import { useApiCache } from '@/contexts/ApiCacheContext.jsx';
import { deleteInvoice, updateInvoice, getBeneficiaries, getInvoiceAttachment, getFinanceHeaders, getInvoices, getVouchers, getInvoicePdf, FINANCE_API_BASE_URL } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Trash2, FileText, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RefreshCcw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as pdfjsLib from 'pdfjs-dist';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// Set up PDF.js worker - use local worker from package
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url
).toString();
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import ActivityLog from '@/components/finance/ActivityLog';
import { Combobox } from '@/components/ui/combobox';
import PdfPreviewModal from '@/components/modals/PdfPreviewModal';

const DetailItem = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-white/10">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
    </div>
);

const InvoiceDetailsCA = () => {
    const { invoiceId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { selectedEntity } = useOrganisation();
    const cache = useApiCache();
    const { toast } = useToast();
    const { attachmentUrl, invoice: initialInvoice, beneficiaryName, organisationId, invoices: invoicesFromState, currentIndex: currentIndexFromState, entityName, organizationName, isReadOnly } = location.state || {};
    const [invoice, setInvoice] = useState(initialInvoice);
    const invoiceDetailsRef = useRef(null);
    const invoiceDetailsPDFRef = useRef(null);
    const attachmentRef = useRef(null);
    const activityLogRef = useRef(null);
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [editedInvoice, setEditedInvoice] = useState(initialInvoice);
    const [attachmentToDisplay, setAttachmentToDisplay] = useState(attachmentUrl);
    const [attachmentContentType, setAttachmentContentType] = useState(null);
    const [allAttachmentIds, setAllAttachmentIds] = useState([]);
    const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [financeHeaders, setFinanceHeaders] = useState([]);
    const [invoices, setInvoices] = useState(invoicesFromState || []);
    const [currentIndex, setCurrentIndex] = useState(currentIndexFromState ?? -1);
    const [loadingInvoice, setLoadingInvoice] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(320); // Default to expanded width (300px + padding)

    // Status and Remarks State
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectionRemarks, setRejectionRemarks] = useState('');
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionModalType, setCompletionModalType] = useState('all_done'); // 'all_done' or 'go_to_vouchers'
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);



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

        // Priority 1: Entity name from invoice API response
        if (invoice?.entity?.name) {
            return invoice.entity.name;
        }

        // Priority 2: Check if entityId is in localStorage (most reliable for client context)
        const entityId = localStorage.getItem('entityId') || invoice?.entity?.id;

        // Priority 3: Check user.entities if available
        if (entityId && user.entities && Array.isArray(user.entities)) {
            const entity = user.entities.find(e => String(e.id) === String(entityId));
            if (entity) return entity.name;
        }

        // Priority 4: Check location state
        if (entityName) return entityName;

        // Priority 5: If invoice has entity_name (sometimes populated)
        if (invoice?.entity_name) return invoice.entity_name;

        return 'N/A';
    };


    // Update currentIndex when invoiceId changes
    useEffect(() => {
        if (invoices && Array.isArray(invoices) && invoiceId) {
            const index = invoices.findIndex(i => String(i.id) === String(invoiceId));
            if (index !== currentIndex) {
                setCurrentIndex(index >= 0 ? index : -1);
            }
        }
    }, [invoiceId, invoices]);

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

        let isMounted = true;
        const fetchData = async () => {
            try {
                // Get entityId from multiple sources with priority
                const entityIdFromStorage = localStorage.getItem('entityId');
                const entityIdFromInvoice = initialInvoice?.entity_id || invoice?.entity_id;
                const entityId = selectedEntity || entityIdFromInvoice || entityIdFromStorage;

                // Use initialInvoice if available, otherwise fetch from list
                let currentInvoice = initialInvoice;

                // Fetch invoices if not passed in state (needed for navigation)
                let invoicesToUse = invoices && Array.isArray(invoices) && invoices.length > 0 ? invoices : null;
                if (!invoicesToUse && entityId) {
                    invoicesToUse = await getInvoices(entityId, user.access_token);
                    setInvoices(invoicesToUse || []);
                }

                // Always fetch full invoice object to ensure we have attachment data
                // The list might return InvoiceListItem which doesn't include attachment_id
                let fullInvoice = null;
                try {
                    // Fetch full invoice by ID to get attachment relationship
                    // Only include entity_id if it's not null or undefined
                    // For CA users, entity_id might be optional, but for others it's required
                    const entityIdParam = entityId ? `?entity_id=${entityId}` : '';
                    const response = await fetch(`${FINANCE_API_BASE_URL}/api/invoices/${invoiceId}${entityIdParam}`, {
                        headers: {
                            'Authorization': `Bearer ${user.access_token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (response.ok) {
                        fullInvoice = await response.json();
                        console.log("Fetched full invoice:", fullInvoice);
                    } else {
                        console.warn("Failed to fetch full invoice, status:", response.status);
                    }
                } catch (err) {
                    console.error("Error fetching full invoice:", err);
                }

                // Use full invoice if available, otherwise fall back to list item
                if (fullInvoice) {
                    currentInvoice = fullInvoice;
                } else if (!currentInvoice || currentInvoice.id !== invoiceId) {
                    // Try to get from invoices list first
                    currentInvoice = invoicesToUse.find(i => String(i.id) === String(invoiceId));

                    // If still not found, try fetching all invoices
                    if (!currentInvoice && invoicesToUse.length > 0) {
                        try {
                            const allInvoices = await getInvoices(entityId, user.access_token);
                            currentInvoice = allInvoices.find(i => String(i.id) === String(invoiceId));
                        } catch (err) {
                            console.error("Failed to fetch invoices:", err);
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
                    // Update currentIndex when invoice changes
                    if (invoicesToUse && invoicesToUse.length > 0) {
                        const index = invoicesToUse.findIndex(i => String(i.id) === String(invoiceId));
                        setCurrentIndex(index >= 0 ? index : -1);
                    }
                    setIsLoading(false);

                    // Collect all attachment IDs (primary + additional)
                    // Log the invoice object to debug attachment structure
                    console.log("Invoice object for attachment detection:", {
                        attachment_id: currentInvoice.attachment_id,
                        attachment: currentInvoice.attachment,
                        additional_attachment_ids: currentInvoice.additional_attachment_ids,
                        fullInvoice: currentInvoice
                    });

                    // Try multiple ways to get the primary attachment ID
                    let primaryAttachmentId = null;

                    // First, try direct attachment_id field
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
                    // Load first attachment
                    if (allIds.length > 0) {
                        setIsImageLoading(true);
                        setAttachmentToDisplay(null);
                        setAttachmentContentType(null);
                        console.log("Fetching invoice attachment with ID:", allIds[0]);
                        promises.push(
                            getInvoiceAttachment(allIds[0], user.access_token)
                                .then(result => {
                                    // Handle both old format (string URL) and new format (object with url and contentType)
                                    const url = typeof result === 'string' ? result : result?.url;
                                    const contentType = typeof result === 'object' ? result?.contentType : null;

                                    console.log("Invoice attachment URL received:", url ? "Yes" : "No", url, "Content-Type:", contentType);
                                    if (url) {
                                        setAttachmentToDisplay(url);
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
                                        setAttachmentToDisplay(null);
                                        setAttachmentContentType(null);
                                    }
                                })
                                .catch(err => {
                                    console.error("Failed to fetch invoice attachment:", err);
                                    setIsImageLoading(false);
                                    setAttachmentToDisplay(null);
                                    setAttachmentContentType(null);
                                    // Show a toast for user feedback
                                    toast({
                                        title: 'Attachment Error',
                                        description: `Failed to load attachment: ${err.message}`,
                                        variant: 'destructive'
                                    });
                                })
                        );
                    } else {
                        console.log("No attachment_id found in invoice object. Invoice structure:", currentInvoice);
                        setAttachmentToDisplay(null);
                        setIsImageLoading(false);
                    }

                    if (user && (user.role === 'CA_ACCOUNTANT' || user.role === 'CA_TEAM')) {
                        promises.push(
                            getFinanceHeaders(user.agency_id, user.access_token)
                                .then(headers => setFinanceHeaders(headers))
                                .catch(err => console.error("Failed to fetch finance headers:", err))
                        );
                    }

                    // Fetch beneficiaries
                    const orgIdToFetch = organisationId || user.organization_id;
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
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [invoiceId, authLoading, user?.access_token]);

    const invoiceDetails = invoice || {
        id: invoiceId,
        bill_number: 'N/A',
        date: new Date().toISOString(),
        beneficiary_name: beneficiaryName || 'N/A',
        amount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        roundoff: 0,
        remarks: 'No remarks available.',
    };

    // Status helper functions
    const formatStatus = (status) => {
        if (!status) return 'Unknown';
        if (invoiceDetails?.is_deleted || status === 'deleted') return 'Deleted';
        const statusMap = {
            verified: 'Verified',
            pending_ca_approval: 'Pending Audit',
            rejected_by_ca: 'Rejected',
            rejected_by_master_admin: 'Rejected',
            pending_master_admin_approval: 'Pending Approval',
            deleted: 'Deleted'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    };

    const getStatusColor = (status) => {
        if (invoiceDetails?.is_deleted || status === 'deleted') return 'bg-gray-500/20 text-gray-400 border-gray-500/50';

        switch (status) {
            case 'verified':
                return 'bg-green-500/20 text-green-400 border-green-500/50';
            case 'rejected_by_ca':
            case 'rejected_by_master_admin':
            case 'rejected':
                return 'bg-red-500/20 text-red-400 border-red-500/50';
            case 'pending_ca_approval':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
            case 'pending_master_admin_approval':
                return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
            case 'deleted':
                return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    // Determine if invoice can be audited (only if pending CA approval)
    const isAuditable = invoiceDetails.status === 'pending_ca_approval';

    const totalAmount = (
        parseFloat(invoiceDetails.amount || 0) +
        parseFloat(invoiceDetails.cgst || 0) +
        parseFloat(invoiceDetails.sgst || 0) +
        parseFloat(invoiceDetails.igst || 0) +
        parseFloat(invoiceDetails.roundoff || 0)
    ).toFixed(2);

    useEffect(() => {
        // Clean up blob URL on unmount
        return () => {
            if (attachmentToDisplay && attachmentToDisplay.startsWith('blob:')) {
                URL.revokeObjectURL(attachmentToDisplay);
            }
        };
    }, [attachmentToDisplay]);



    const handleExportToPDF = async () => {
        try {
            setIsLoading(true);
            const blobUrl = await getInvoicePdf(invoiceId, user.access_token);
            setPdfPreviewUrl(blobUrl);
            setIsPdfPreviewOpen(true);
        } catch (error) {
            console.error('PDF Export Error:', error);
            toast({ title: 'Export Error', description: `Failed to export PDF: ${error.message}`, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };


    // Filter invoices based on statuses relevant to CA audit
    const filteredInvoices = React.useMemo(() => {
        if (!invoices || !Array.isArray(invoices)) return [];

        return invoices.filter(inv => inv.status === 'pending_ca_approval' && !inv.is_deleted);
    }, [invoices]);

    // Check if we have invoices to navigate - show arrows if we have multiple invoices
    const hasInvoices = filteredInvoices && Array.isArray(filteredInvoices) && filteredInvoices.length > 1;

    // Determine current index based on filtered list
    const currentFilteredIndex = React.useMemo(() => {
        if (!filteredInvoices || !invoiceId) return -1;
        return filteredInvoices.findIndex(i => String(i.id) === String(invoiceId));
    }, [filteredInvoices, invoiceId]);

    // Override currentIndex for UI controls to reflect filtered list position
    useEffect(() => {
        if (currentFilteredIndex !== -1) {
            setCurrentIndex(currentFilteredIndex);
        }
    }, [currentFilteredIndex]);

    // Navigation logic updated to use filtered list
    const handleNavigate = (direction) => {
        if (!filteredInvoices || filteredInvoices.length === 0) {
            console.warn("No invoices available for navigation");
            return;
        }

        // Use currentFilteredIndex as the base
        const newIndex = currentFilteredIndex + direction;
        console.log("Navigating:", { currentFilteredIndex, newIndex, direction, invoicesLength: filteredInvoices.length });

        if (newIndex >= 0 && newIndex < filteredInvoices.length) {
            const nextInvoice = filteredInvoices[newIndex];
            console.log("Navigating to invoice:", nextInvoice.id);
            setCurrentIndex(newIndex);

            // Navigate with state - keep the full list in state but filtered logic applies
            navigate(`/invoices/ca/${nextInvoice.id}`, {
                state: {
                    invoice: nextInvoice,
                    invoices,
                    organisationId,
                    entityName,
                    organizationName,
                    isReadOnly
                }
            });
        } else {
            console.warn("Navigation out of bounds:", { newIndex, invoicesLength: invoices.length });
        }
    };

    // Auto-navigation helper after CA action
    const handleAutoNext = async (newStatus) => {
        let nextInvoice = null;
        let nextInvoicesList = invoices;

        // For CA panel, show next pending audit invoice
        if (currentFilteredIndex !== -1 && currentFilteredIndex + 1 < filteredInvoices.length) {
            nextInvoice = filteredInvoices[currentFilteredIndex + 1];
            if (newStatus) {
                nextInvoicesList = invoices.map(inv =>
                    String(inv.id) === String(invoiceId)
                        ? { ...inv, status: newStatus }
                        : inv
                );
            }
        }

        if (nextInvoice) {
            navigate(`/invoices/ca/${nextInvoice.id}`, {
                state: {
                    invoice: nextInvoice,
                    invoices: nextInvoicesList,
                    organisationId,
                    entityName,
                    organizationName,
                    isReadOnly
                },
                replace: true
            });
        } else {
            // No pending invoices, check for pending vouchers
            try {
                const entityId = invoiceDetails?.entity?.id || invoice?.entity?.id || localStorage.getItem('entityId');
                console.log('Checking for pending vouchers for entityId:', entityId);
                if (entityId) {
                    const vouchers = await getVouchers(entityId, user.access_token);
                    console.log('Fetched vouchers:', vouchers);
                    const pendingVouchers = vouchers.filter(v => v.status === 'pending_ca_approval' && !v.is_deleted);
                    console.log('Pending CA vouchers:', pendingVouchers);

                    if (pendingVouchers.length > 0) {
                        setCompletionModalType('go_to_vouchers');
                        setShowCompletionModal(true);
                        return;
                    }
                }
            } catch (error) {
                console.error("Failed to check for pending vouchers:", error);
            }

            // No pending vouchers either, mark as all done
            setCompletionModalType('all_done');
            setShowCompletionModal(true);
        }
    };

    // Tag logic
    const handleTag = async () => {
        if (!editedInvoice.finance_header_id) {
            toast({
                title: 'Validation Error',
                description: 'Please select a header before tagging the invoice.',
                variant: 'destructive',
            });
            return;
        }

        try {
            const entityId = selectedEntity || localStorage.getItem('entityId');
            // When tagging, we also mark as verified
            updateInvoice(invoiceId, entityId, {
                is_ready: true,
                finance_header_id: Number(editedInvoice.finance_header_id),
                status: 'verified'
            }, user.access_token);
            toast({ title: 'Success', description: 'Invoice tagged and verified successfully.' });

            // Update the local invoices list state to reflect the change immediately
            setInvoices(prevInvoices => prevInvoices.map(inv =>
                inv.id === invoiceId
                    ? { ...inv, status: 'verified', is_ready: true, finance_header_id: Number(editedInvoice.finance_header_id) }
                    : inv
            ));

            handleAutoNext('verified');
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to tag invoice: ${error.message}`,
                variant: 'destructive',
            });
        }
    };

    // Skeleton loading component
    const InvoiceDetailsSkeleton = () => (
        <div className="h-screen w-full flex flex-col text-white bg-transparent p-4 md:p-6">
            <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <Skeleton className="h-10 w-10 rounded-md" />
                </div>
            </header>
            <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border border-white/10">
                <ResizablePanel defaultSize={60} minSize={30}>
                    <div className="relative flex h-full w-full flex-col items-center justify-center p-2">
                        <Skeleton className="h-full w-full rounded-md" />
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={30}>
                    <div className="flex h-full items-start justify-center p-6 overflow-hidden hide-scrollbar">
                        <div className="w-full space-y-4">
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                            <Skeleton className="h-64 w-full rounded-lg" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-20 w-full rounded-md" />
                            </div>
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );

    const handleStatusUpdate = async (status, remarks = null) => {
        setIsStatusUpdating(true);
        try {
            const payload = {
                status: status,
                ...(remarks && { status_remarks: remarks })
            };

            // Use updateInvoice from api.js with correct signature: (id, entityId, payload, token)
            // Get entityId from invoiceDetails or localStorage
            const entityId = invoiceDetails.entity_id || localStorage.getItem('entityId');
            const updatedInvoice = await updateInvoice(invoiceId, entityId, payload, user.access_token);

            if (updatedInvoice) {
                setInvoice(updatedInvoice);
                setEditedInvoice(updatedInvoice);
                toast({
                    title: 'Status Updated',
                    description: `Invoice marked as ${formatStatus(status)}.`,
                });
                setShowRejectDialog(false);
                setRejectionRemarks('');

                // Update the local invoices list state
                setInvoices(prevInvoices => prevInvoices.map(inv =>
                    inv.id === invoiceId ? updatedInvoice : inv
                ));

                handleAutoNext(status);
            }
        } catch (error) {
            console.error('Status Update Error:', error);
            toast({
                title: 'Error',
                description: `Failed to update status: ${error.message}`,
                variant: 'destructive',
            });
        } finally {
            setIsStatusUpdating(false);
        }
    };

    if (isLoading) {
        return <InvoiceDetailsSkeleton />;
    }


    const defaultTab = 'details';
    const cols = 'grid-cols-3';

    return (
        <div className="h-screen w-full flex flex-col text-white bg-transparent p-3 sm:p-4 md:p-6" style={{ paddingBottom: hasInvoices ? '6rem' : '1.5rem' }}>
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-white/10 mb-3 sm:mb-4">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/finance')} className="h-9 w-9 sm:h-10 sm:w-10">
                        <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold">Invoice Details</h1>
                        <p className="text-xs sm:text-sm text-gray-400">Review all invoice transactions.</p>
                    </div>
                </div>
                {/* Entity name in top right */}
                <div className="flex flex-col items-end">
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-white truncate">{getEntityName()}</p>
                    {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM' || user?.role === 'CLIENT_MASTER_ADMIN') && (
                        <p className="text-sm text-gray-400">
                            Pending {user?.role === 'CLIENT_MASTER_ADMIN' ? 'Approval' : 'Audit'}: {filteredInvoices?.length || 0}
                        </p>
                    )}
                </div>
            </header>

            <ResizablePanelGroup
                direction="horizontal"
                className="flex-1 rounded-lg border border-white/10 hidden md:flex"
            >
                <ResizablePanel defaultSize={60} minSize={30}>
                    <div className="relative flex h-full w-full flex-col items-center justify-center p-2">
                        {/* Navigation buttons for attachments */}
                        {allAttachmentIds.length > 1 && attachmentToDisplay && (
                            <>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleAttachmentNavigate(1)}
                                    disabled={currentAttachmentIndex === allAttachmentIds.length - 1}
                                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg"
                                >
                                    <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleAttachmentNavigate(-1)}
                                    disabled={currentAttachmentIndex === 0}
                                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg"
                                >
                                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                                </Button>
                            </>
                        )}
                        {/* Zoom controls in bottom right corner */}
                        {attachmentToDisplay && !(attachmentContentType?.toLowerCase().includes('pdf') || attachmentToDisplay.toLowerCase().endsWith('.pdf')) && (
                            <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-10 flex gap-1 sm:gap-2">
                                <Button variant="outline" size="icon" onClick={() => setZoom(z => z + 0.1)} className="h-8 w-8 sm:h-9 sm:w-9">
                                    <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="h-8 w-8 sm:h-9 sm:w-9">
                                    <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setZoom(1)} className="h-8 w-8 sm:h-9 sm:w-9">
                                    <RefreshCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                            </div>
                        )}
                        <div className="flex h-full w-full items-center justify-center overflow-auto relative hide-scrollbar" style={{ zIndex: 1 }} ref={attachmentRef}>
                            {/* Show skeleton only if we have attachments but no URL yet (while fetching URL) */}
                            {allAttachmentIds.length > 0 && !attachmentToDisplay && isImageLoading ? (
                                <Skeleton className="h-full w-full rounded-md" />
                            ) : attachmentToDisplay ? (
                                (attachmentContentType?.toLowerCase().includes('pdf') || attachmentToDisplay.toLowerCase().endsWith('.pdf')) ? (
                                    <iframe
                                        src={`${attachmentToDisplay}#toolbar=0`}
                                        title="Invoice Attachment"
                                        className="h-full w-full rounded-md border-none"
                                        type="application/pdf"
                                        style={{ minHeight: '100%' }}
                                    />
                                ) : (
                                    <img
                                        key={`${attachmentToDisplay}-${invoice?.id}`}
                                        src={attachmentToDisplay}
                                        alt="Invoice Attachment"
                                        className="max-w-full max-h-full transition-transform duration-200"
                                        style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                                        onLoad={() => {
                                            console.log("Image loaded successfully");
                                            setIsImageLoading(false);
                                        }}
                                        onError={(e) => {
                                            console.error("Image failed to load:", e, "URL:", attachmentToDisplay);
                                            setIsImageLoading(false);
                                        }}
                                        loading="eager"
                                    />
                                )
                            ) : (
                                <div className="text-center text-gray-400">
                                    <p>No attachment available for this invoice. </p>
                                </div>
                            )}
                        </div>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={30}>
                    <div className="relative flex h-full flex-col">
                        <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-6 hide-scrollbar" style={{ paddingBottom: hasInvoices ? '8rem' : '2rem' }}>
                            <Tabs defaultValue={defaultTab} className="w-full">
                                <TabsList className={`grid w-full ${cols} text-xs sm:text-sm`}>
                                    <TabsTrigger value="details" className="text-xs sm:text-sm">Details</TabsTrigger>
                                    <TabsTrigger value="history" className="text-xs sm:text-sm">History</TabsTrigger>
                                    <TabsTrigger value="beneficiary" className="text-xs sm:text-sm">Beneficiary</TabsTrigger>
                                </TabsList>
                                <TabsContent value="details" className="mt-4">

                                    <Card ref={invoiceDetailsRef} className="w-full glass-pane border-none shadow-none bg-gray-800 text-white relative z-20">
                                        <div ref={invoiceDetailsPDFRef} className="w-full">
                                            <CardHeader className="p-4 sm:p-6">
                                                <CardTitle className="text-lg sm:text-xl">{invoiceDetails.beneficiary?.name || invoiceDetails.beneficiary?.company_name || invoiceDetails.beneficiary_name || 'N/A'}</CardTitle>
                                                <CardDescription className="text-xs sm:text-sm flex items-center gap-2">
                                                    <span>Created on {invoiceDetails.created_date || invoiceDetails.created_at ? new Date(invoiceDetails.created_date || invoiceDetails.created_at).toLocaleDateString() : 'N/A'}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(invoiceDetails.status)}`}>
                                                        {formatStatus(invoiceDetails.status)}
                                                    </span>
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-2 relative z-20 p-4 sm:p-6 pt-0">
                                                <DetailItem label="Invoice Date" value={new Date(invoiceDetails.date).toLocaleDateString()} />
                                                <DetailItem label="Invoice Number" value={invoiceDetails.bill_number || 'N/A'} />
                                                <DetailItem label="Base Amount" value={`₹${parseFloat(invoiceDetails.amount || 0) % 1 === 0 ? parseFloat(invoiceDetails.amount || 0).toFixed(0) : parseFloat(invoiceDetails.amount || 0).toFixed(2)}`} />
                                                <DetailItem label="CGST" value={`₹${parseFloat(invoiceDetails.cgst || 0) % 1 === 0 ? parseFloat(invoiceDetails.cgst || 0).toFixed(0) : parseFloat(invoiceDetails.cgst || 0).toFixed(2)}`} />
                                                <DetailItem label="SGST" value={`₹${parseFloat(invoiceDetails.sgst || 0) % 1 === 0 ? parseFloat(invoiceDetails.sgst || 0).toFixed(0) : parseFloat(invoiceDetails.sgst || 0).toFixed(2)}`} />
                                                <DetailItem label="IGST" value={`₹${parseFloat(invoiceDetails.igst || 0) % 1 === 0 ? parseFloat(invoiceDetails.igst || 0).toFixed(0) : parseFloat(invoiceDetails.igst || 0).toFixed(2)}`} />
                                                <div className="pt-4">
                                                    <DetailItem label="Total Amount" value={`₹${parseFloat(totalAmount) % 1 === 0 ? parseFloat(totalAmount).toFixed(0) : parseFloat(totalAmount).toFixed(2)}`} />
                                                </div>
                                                <div className="pt-4">
                                                    <p className="text-sm text-gray-400 mb-1">Remarks</p>
                                                    <p className="text-sm text-white p-3 bg-white/5 rounded-md">{invoiceDetails.remarks && invoiceDetails.remarks.trim() ? invoiceDetails.remarks : 'N/A'}</p>
                                                </div>
                                                {invoiceDetails.status_remarks && invoiceDetails.status_remarks.trim() && (
                                                    <div className="pt-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <p className="text-sm font-semibold text-red-400">
                                                                {invoiceDetails.status === 'rejected_by_ca' || invoiceDetails.status === 'rejected_by_master_admin' ? 'Rejected Remarks' : 'Status Remarks'}
                                                            </p>
                                                        </div>
                                                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                                                            <p className="text-sm text-white">{invoiceDetails.status_remarks}</p>
                                                        </div>

                                                    </div>
                                                )}
                                                {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                                    <div className="pt-4">
                                                        <Label htmlFor="finance_header_id">Header</Label>
                                                        <Combobox
                                                            options={[...financeHeaders].sort((a, b) => a.name.localeCompare(b.name)).map(h => ({ value: String(h.id), label: h.name }))}
                                                            value={editedInvoice?.finance_header_id ? String(editedInvoice.finance_header_id) : ""}
                                                            onValueChange={(val) => setEditedInvoice(p => ({ ...p, finance_header_id: val ? Number(val) : null }))}
                                                            placeholder="Select a header"
                                                            searchPlaceholder="Search headers..."
                                                            className="w-full h-11 bg-white/10 border-white/20 text-white hover:bg-white/20"
                                                        />
                                                    </div>
                                                )}
                                            </CardContent>
                                        </div>
                                        <div className="flex items-center gap-3 pb-10 mb-20 sm:mb-16 md:mb-4 justify-center relative z-[100] px-4 sm:px-6 action-buttons-container">
                                            {/* Action buttons on right */}
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={(e) => { e.stopPropagation(); handleExportToPDF(); }}
                                                            className="h-9 w-9 sm:h-10 sm:w-10 mr-2"
                                                        >
                                                            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Export</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            {/* 4. Approve/Reject Actions */}
                                            {/* CA Actions - only for pending audit */}
                                            {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && !isReadOnly && !invoiceDetails.is_deleted && isAuditable && (
                                                <>
                                                    <Button onClick={() => setShowRejectDialog(true)} disabled={isStatusUpdating} variant="reject" className="h-9 sm:h-10" size="sm">
                                                        {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />} Reject
                                                    </Button>
                                                    <Button onClick={handleTag} variant="approve" className="h-9 sm:h-10" size="sm">
                                                        {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />} Tag
                                                    </Button>
                                                </>
                                            )}
                                        </div>


                                    </Card>

                                </TabsContent>
                                <TabsContent value="history" className="mt-4">
                                    <div className="p-2 sm:p-4" ref={activityLogRef}>
                                        <ActivityLog itemId={invoice?.id || invoiceId} itemType="invoice" showFilter={false} />
                                    </div>
                                </TabsContent>
                                <TabsContent value="beneficiary" className="mt-4">
                                    {(() => {
                                        // Try to resolve the full beneficiary object
                                        let beneficiaryObj = invoiceDetails.beneficiary || invoice?.beneficiary;

                                        // If we have beneficiary_id but not a complete beneficiary object, try to find it in the beneficiaries list
                                        if (invoiceDetails.beneficiary_id && (!beneficiaryObj || !beneficiaryObj.name && !beneficiaryObj.company_name)) {
                                            if (beneficiaries && beneficiaries.length > 0) {
                                                const found = beneficiaries.find(
                                                    b => String(b.id) === String(invoiceDetails.beneficiary_id)
                                                );
                                                if (found) beneficiaryObj = found;
                                            }
                                        }

                                        // Resolve beneficiary name with multiple fallbacks
                                        let resolvedBeneficiaryName = 'N/A';
                                        if (beneficiaryObj) {
                                            if (beneficiaryObj.beneficiary_type === 'individual') {
                                                resolvedBeneficiaryName = beneficiaryObj.name || 'N/A';
                                            } else {
                                                resolvedBeneficiaryName = beneficiaryObj.company_name || beneficiaryObj.name || 'N/A';
                                            }
                                        } else if (invoiceDetails.beneficiary_name) {
                                            resolvedBeneficiaryName = invoiceDetails.beneficiary_name;
                                        } else if (invoice?.beneficiary_name) {
                                            resolvedBeneficiaryName = invoice.beneficiary_name;
                                        } else if (beneficiaryName) {
                                            resolvedBeneficiaryName = beneficiaryName; // from location state
                                        }

                                        return (
                                            <Card className="w-full glass-pane border-none shadow-none bg-gray-800 text-white">
                                                <CardHeader className="p-4 sm:p-6">
                                                    <CardTitle className="text-lg sm:text-xl">Beneficiary Details</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 p-4 sm:p-6 pt-0">
                                                    <DetailItem label="Name" value={resolvedBeneficiaryName} />
                                                    <DetailItem label="PAN" value={beneficiaryObj?.pan || 'N/A'} />
                                                    <DetailItem label="Email" value={beneficiaryObj?.email || 'N/A'} />
                                                    <DetailItem label="Phone" value={beneficiaryObj?.phone || beneficiaryObj?.phone_number || 'N/A'} />
                                                </CardContent>
                                            </Card>
                                        );
                                    })()}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>

            {/* Mobile Layout - Stacked vertically */}
            <div className="flex flex-col md:hidden flex-1 gap-4">
                {/* Attachment/Preview Section */}
                <div className="relative flex h-64 sm:h-80 w-full flex-col items-center justify-center p-2 border border-white/10 rounded-lg">
                    {/* Navigation buttons for attachments */}
                    {allAttachmentIds.length > 1 && attachmentToDisplay && (
                        <>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleAttachmentNavigate(1)}
                                disabled={currentAttachmentIndex === allAttachmentIds.length - 1}
                                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleAttachmentNavigate(-1)}
                                disabled={currentAttachmentIndex === 0}
                                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </>
                    )}
                    {/* Zoom controls in bottom right corner */}
                    {attachmentToDisplay && !(attachmentContentType?.toLowerCase().includes('pdf') || attachmentToDisplay.toLowerCase().endsWith('.pdf')) && (
                        <div className="absolute bottom-2 right-2 z-10 flex gap-1 sm:gap-2">
                            <Button variant="outline" size="icon" onClick={() => setZoom(z => z + 0.1)} className="h-8 w-8 sm:h-9 sm:w-9">
                                <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="h-8 w-8 sm:h-9 sm:w-9">
                                <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setZoom(1)} className="h-8 w-8 sm:h-9 sm:w-9">
                                <RefreshCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                        </div>
                    )}
                    <div className="flex h-full w-full items-center justify-center overflow-auto relative hide-scrollbar" style={{ zIndex: 1 }} ref={attachmentRef}>
                        {allAttachmentIds.length > 0 && !attachmentToDisplay && isImageLoading ? (
                            <Skeleton className="h-full w-full rounded-md" />
                        ) : attachmentToDisplay ? (
                            (attachmentContentType?.toLowerCase().includes('pdf') || attachmentToDisplay.toLowerCase().endsWith('.pdf')) ? (
                                <iframe
                                    src={attachmentToDisplay}
                                    title="Invoice Attachment"
                                    className="h-full w-full rounded-md border-none"
                                    type="application/pdf"
                                    style={{ minHeight: '100%' }}
                                />
                            ) : (
                                <img
                                    key={`${attachmentToDisplay}-${invoice?.id}`}
                                    src={attachmentToDisplay}
                                    alt="Invoice Attachment"
                                    className="max-w-full max-h-full transition-transform duration-200"
                                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                                    onLoad={() => {
                                        console.log("Image loaded successfully");
                                        setIsImageLoading(false);
                                    }}
                                    onError={(e) => {
                                        console.error("Image failed to load:", e, "URL:", attachmentToDisplay);
                                        setIsImageLoading(false);
                                    }}
                                    loading="eager"
                                />
                            )
                        ) : (
                            <div className="text-center text-gray-400 text-sm">
                                <p>No attachment available for this invoice.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Details Section (Mobile View) */}
                <div className="flex-1 overflow-y-auto border border-white/10 rounded-lg p-4 hide-scrollbar md:hidden" style={{ paddingBottom: hasInvoices ? '6rem' : '2rem' }}>
                    <Tabs defaultValue={defaultTab} className="w-full">
                        <TabsList className={`grid w-full ${cols} text-xs sm:text-sm`}>
                            <TabsTrigger value="details" className="text-xs sm:text-sm">Details</TabsTrigger>
                            <TabsTrigger value="history" className="text-xs sm:text-sm">History</TabsTrigger>
                            <TabsTrigger value="beneficiary" className="text-xs sm:text-sm">Beneficiary</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="mt-4">

                            <Card ref={invoiceDetailsRef} className="w-full glass-pane border-none shadow-none bg-gray-800 text-white relative z-20">
                                <div ref={invoiceDetailsPDFRef} className="w-full">
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-lg sm:text-xl">{invoiceDetails.bill_number || 'N/A'}</CardTitle>
                                        <CardDescription className="text-xs sm:text-sm">Created on {invoiceDetails.created_date || invoiceDetails.created_at ? new Date(invoiceDetails.created_date || invoiceDetails.created_at).toLocaleDateString() : 'N/A'}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2 relative z-20 p-4 pt-0">
                                        <DetailItem label="Date" value={new Date(invoiceDetails.date).toLocaleDateString()} />
                                        <DetailItem label="Base Amount" value={`₹${parseFloat(invoiceDetails.amount || 0).toFixed(2)}`} />
                                        <DetailItem label="CGST" value={`₹${parseFloat(invoiceDetails.cgst || 0).toFixed(2)}`} />
                                        <DetailItem label="SGST" value={`₹${parseFloat(invoiceDetails.sgst || 0).toFixed(2)}`} />
                                        <DetailItem label="IGST" value={`₹${parseFloat(invoiceDetails.igst || 0).toFixed(2)}`} />
                                        <DetailItem label="Roundoff" value={`₹${parseFloat(invoiceDetails.roundoff || 0).toFixed(2)}`} />
                                        <div className="pt-4">
                                            <DetailItem label="Total Amount" value={`₹${totalAmount}`} />
                                        </div>
                                        <div className="pt-4">
                                            <p className="text-xs sm:text-sm text-gray-400 mb-1">Remarks</p>
                                            <p className="text-xs sm:text-sm text-white p-3 bg-white/5 rounded-md">{invoiceDetails.remarks && invoiceDetails.remarks.trim() ? invoiceDetails.remarks : 'N/A'}</p>
                                        </div>

                                        {/* Rejection Remarks - separate section if rejected */}
                                        {(['rejected', 'rejected_by_ca', 'rejected_by_master_admin', 'rejected_by_admin'].includes(invoiceDetails.status) || invoiceDetails.status?.toLowerCase().includes('reject')) && (
                                            <div className="pt-4">
                                                <div className="flex items-center gap-2 text-red-400 mb-1">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <p className="text-xs sm:text-sm font-medium">Rejection Reason</p>
                                                </div>
                                                <p className="text-xs sm:text-sm text-red-200 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                                                    {invoiceDetails.status_remarks || 'No rejection remarks provided.'}
                                                </p>
                                            </div>
                                        )}
                                        {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                            <div className="pt-4">
                                                <Label htmlFor="finance_header_id" className="text-sm">Header</Label>
                                                <Select
                                                    name="finance_header_id"
                                                    value={editedInvoice.finance_header_id || ""}
                                                    onValueChange={(value) => setEditedInvoice(p => ({ ...p, finance_header_id: value }))}
                                                >
                                                    <SelectTrigger className="text-sm">
                                                        <SelectValue placeholder="Select a header" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {financeHeaders.map((h) => (
                                                            <SelectItem key={h.id} value={h.id}>
                                                                {h.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </CardContent>
                                </div>
                                <div className="flex items-center gap-3 mt-4 mb-20 sm:mb-16 md:mb-4 justify-end relative z-[100] px-4 action-buttons-container">
                                    {/* Action buttons on right */}
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="outline" size="icon" onClick={handleExportToPDF} className="h-9 w-9 bg-white/5 border-white/10 hover:bg-white/10">
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Export PDF</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    {/* CA Actions - only for pending audit */}
                                    {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && !isReadOnly && !invoiceDetails.is_deleted && isAuditable && (
                                        <>
                                            <Button onClick={() => setShowRejectDialog(true)} disabled={isStatusUpdating} variant="reject" className="h-9 sm:h-10" size="sm">
                                                {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />} Reject
                                            </Button>
                                            <Button onClick={handleTag} variant="approve" className="h-9 sm:h-10" size="sm">
                                                {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />} Tag
                                            </Button>
                                        </>
                                    )}
                                </div>

                            </Card>
                        </TabsContent>
                        <TabsContent value="history" className="mt-4">
                            <div className="p-2 sm:p-4" ref={activityLogRef}>
                                <ActivityLog itemId={invoice?.id || invoiceId} itemType="invoice" showFilter={false} />
                            </div>
                        </TabsContent>
                        <TabsContent value="beneficiary" className="mt-4">
                            {(() => {
                                let beneficiaryObj = invoiceDetails.beneficiary || invoice?.beneficiary;

                                if (invoiceDetails.beneficiary_id && (!beneficiaryObj || !beneficiaryObj.name && !beneficiaryObj.company_name)) {
                                    if (beneficiaries && beneficiaries.length > 0) {
                                        const found = beneficiaries.find(
                                            b => String(b.id) === String(invoiceDetails.beneficiary_id)
                                        );
                                        if (found) beneficiaryObj = found;
                                    }
                                }

                                let resolvedBeneficiaryName = 'N/A';
                                if (beneficiaryObj) {
                                    if (beneficiaryObj.beneficiary_type === 'individual') {
                                        resolvedBeneficiaryName = beneficiaryObj.name || 'N/A';
                                    } else {
                                        resolvedBeneficiaryName = beneficiaryObj.company_name || beneficiaryObj.name || 'N/A';
                                    }
                                } else if (invoiceDetails.beneficiary_name) {
                                    resolvedBeneficiaryName = invoiceDetails.beneficiary_name;
                                } else if (invoice?.beneficiary_name) {
                                    resolvedBeneficiaryName = invoice.beneficiary_name;
                                } else if (beneficiaryName) {
                                    resolvedBeneficiaryName = beneficiaryName;
                                }

                                return (
                                    <Card className="w-full glass-pane border-none shadow-none bg-gray-800 text-white">
                                        <CardHeader className="p-4">
                                            <CardTitle className="text-lg sm:text-xl">Beneficiary Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 p-4 pt-0">
                                            <DetailItem label="Name" value={resolvedBeneficiaryName} />
                                            <DetailItem label="PAN" value={beneficiaryObj?.pan || 'N/A'} />
                                            <DetailItem label="Email" value={beneficiaryObj?.email || 'N/A'} />
                                            <DetailItem label="Phone" value={beneficiaryObj?.phone || beneficiaryObj?.phone_number || 'N/A'} />
                                        </CardContent>
                                    </Card>
                                );
                            })()}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Fixed navigation buttons at bottom corners - aligned on same line */}
            {
                hasInvoices && (
                    <>
                        {/* Previous button at bottom left (after sidebar) */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleNavigate(-1);
                            }}
                            disabled={currentIndex === 0 || currentIndex === -1}
                            className="hidden md:flex fixed bottom-4 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg z-[50]"
                            style={{
                                left: sidebarWidth <= 150 ? `${sidebarWidth + 16}px` : '20rem' // Dynamic positioning when collapsed (sidebar width + 16px margin), left-80 (20rem) when expanded
                            }}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        {/* Next button at bottom right corner */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleNavigate(1);
                            }}
                            disabled={currentIndex === invoices.length - 1}
                            className="hidden md:flex fixed bottom-4 right-4 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg z-[50]"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                        {/* Mobile navigation buttons */}
                        <div className="flex md:hidden fixed bottom-4 left-4 right-4 justify-between z-[50] gap-2 pointer-events-none">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleNavigate(-1);
                                }}
                                disabled={currentIndex === 0 || currentIndex === -1}
                                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg flex-1 pointer-events-auto"
                            >
                                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleNavigate(1);
                                }}
                                disabled={currentIndex === invoices.length - 1}
                                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg flex-1 pointer-events-auto"
                            >
                                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                        </div>
                    </>
                )
            }


            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Reject Invoice</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Please provide a reason for rejection. This will be visible to the user.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="rejection-remarks" className="mb-2 block">Rejection Reason</Label>
                        <Textarea
                            id="rejection-remarks"
                            value={rejectionRemarks}
                            onChange={(e) => setRejectionRemarks(e.target.value)}
                            placeholder="Enter rejection remarks..."
                            className="min-h-[100px] bg-slate-800 border-slate-700"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowRejectDialog(false)} disabled={isStatusUpdating} className="text-white hover:bg-white/10">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleStatusUpdate(user?.role === 'CLIENT_MASTER_ADMIN' ? 'rejected_by_master_admin' : 'rejected_by_ca', rejectionRemarks)}
                            disabled={isStatusUpdating || !rejectionRemarks.trim()}
                        >
                            {isStatusUpdating ? 'Rejecting...' : 'Reject Invoice'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Completion Modal */}
            <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
                <DialogContent
                    className="bg-slate-900 border-white/10 text-white sm:max-w-[425px] [&>button]:hidden"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="mb-4 rounded-full bg-green-500/20 p-3">
                            {completionModalType === 'go_to_vouchers' ? (
                                <AlertCircle className="h-12 w-12 text-yellow-500" />
                            ) : (
                                <CheckCircle className="h-12 w-12 text-green-500" />
                            )}
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-xl mb-2 text-center">
                                {completionModalType === 'go_to_vouchers' ? 'Invoices Complete!' : 'All Done!'}
                            </DialogTitle>
                            <DialogDescription className="text-center text-gray-400">
                                {completionModalType === 'go_to_vouchers'
                                    ? 'You have completed all invoices, but there are pending vouchers requiring your attention.'
                                    : 'There are no more invoices pending for your review.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="mt-8 flex gap-3 w-full justify-center">
                            {completionModalType === 'go_to_vouchers' ? (
                                <>
                                    <Button
                                        onClick={() => navigate('/')}
                                        variant="outline"
                                        className="border-white/20 text-white hover:bg-white/10"
                                    >
                                        Dashboard
                                    </Button>
                                    <Button
                                        onClick={async () => {
                                            const entityId = invoiceDetails?.entity?.id || invoice?.entity?.id || localStorage.getItem('entityId');
                                            if (entityId) {
                                                try {
                                                    const vouchers = await getVouchers(entityId, user.access_token);
                                                    const pendingVouchers = vouchers.filter(v => v.status === 'pending_ca_approval');
                                                    if (pendingVouchers.length > 0) {
                                                        const nextVoucher = pendingVouchers[0];
                                                        navigate(`/vouchers/ca/${nextVoucher.id}`, {
                                                            state: { voucher: nextVoucher, vouchers, organizationName, entityName },
                                                            replace: true
                                                        });
                                                    } else {
                                                        navigate('/finance/vouchers');
                                                    }
                                                } catch (e) {
                                                    console.error('Failed to fetch vouchers:', e);
                                                    navigate('/finance/vouchers');
                                                }
                                            } else {
                                                navigate('/finance/vouchers');
                                            }
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        Go to Vouchers
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    onClick={() => navigate('/')}
                                    className="w-full bg-primary hover:bg-primary/90 text-white"
                                >
                                    Go to Dashboard
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>


            <PdfPreviewModal
                isOpen={isPdfPreviewOpen}
                onClose={() => {
                    setIsPdfPreviewOpen(false);
                    if (pdfPreviewUrl) {
                        URL.revokeObjectURL(pdfPreviewUrl);
                        setPdfPreviewUrl(null);
                    }
                }}
                pdfUrl={pdfPreviewUrl}
                title="Invoice Preview"
                fileName={`Invoice-${invoiceDetails.bill_number || invoiceId}.pdf`}
            />
        </div >
    );
};

export default InvoiceDetailsCA;
