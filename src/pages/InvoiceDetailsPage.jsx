import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useOrganisation } from '@/hooks/useOrganisation';
import { deleteInvoice, updateInvoice, getBeneficiaries, getInvoiceAttachment, getFinanceHeaders, getInvoices } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Edit, Trash2, FileText, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RefreshCcw } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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
        <p className="text-sm font-semibold text-white">{value}</p>
    </div>
);

const InvoiceDetailsPage = () => {
    const { invoiceId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { selectedEntity } = useOrganisation();
    const { toast } = useToast();
    const { attachmentUrl, invoice: initialInvoice, beneficiaryName, organisationId, invoices: invoicesFromState, currentIndex: currentIndexFromState, entityName, organizationName } = location.state || {};
    const [invoice, setInvoice] = useState(initialInvoice);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const invoiceDetailsRef = useRef(null);
    const attachmentRef = useRef(null);
    const activityLogRef = useRef(null);
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [editedInvoice, setEditedInvoice] = useState(initialInvoice);
    const [attachmentToDisplay, setAttachmentToDisplay] = useState(attachmentUrl);
    const [zoom, setZoom] = useState(1);
    const [financeHeaders, setFinanceHeaders] = useState([]);
    const [invoices, setInvoices] = useState(invoicesFromState || []);
    const [currentIndex, setCurrentIndex] = useState(currentIndexFromState ?? -1);
    const [loadingInvoice, setLoadingInvoice] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isImageLoading, setIsImageLoading] = useState(false);

    // Get entity name from user entities
    const getEntityName = () => {
        if (!user) return 'N/A';
        const entityId = localStorage.getItem('entityId') || invoice?.entity_id;
        if (!entityId) return 'N/A';
        
        // For CLIENT_USER, check user.entities
        if (user.role === 'CLIENT_USER' && user.entities) {
            const entity = user.entities.find(e => e.id === entityId);
            if (entity) return entity.name;
        }
        
        // Fallback to entityName from location state
        return entityName || 'N/A';
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
                    const response = await fetch(`http://localhost:8003/api/invoices/${invoiceId}${entityIdParam}`, {
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
                    
                    // Load attachment and finance headers in parallel (non-blocking)
                    const promises = [];
                    
                    // Always reset attachment state when invoice changes
                    // Check multiple possible fields for attachment_id
                    const attachmentId = currentInvoice.attachment_id 
                        || (currentInvoice.attachment && currentInvoice.attachment.id)
                        || (currentInvoice.attachment && currentInvoice.attachment.attachment_id)
                        || currentInvoice.attachment;
                    
                    console.log("Invoice object:", currentInvoice);
                    console.log("Looking for attachment_id. Found:", attachmentId);
                    
                    if (attachmentId) {
                        setIsImageLoading(true);
                        setAttachmentToDisplay(null);
                        console.log("Fetching attachment with ID:", attachmentId);
                        promises.push(
                            getInvoiceAttachment(attachmentId, user.access_token)
                                .then(url => {
                                    console.log("Attachment URL received:", url);
                                    if (url) {
                                        setAttachmentToDisplay(url);
                                        if (url.toLowerCase().endsWith('.pdf')) {
                                            setIsImageLoading(false);
                                        }
                                    } else {
                                        console.log("No URL returned from getInvoiceAttachment");
                                        setIsImageLoading(false);
                                    }
                                })
                                .catch(err => {
                                    console.error("Failed to fetch attachment:", err);
                                    setIsImageLoading(false);
                                    setAttachmentToDisplay(null);
                                })
                        );
                    } else {
                        console.log("No attachment_id found in invoice object");
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
        remarks: 'No remarks available.',
    };
    
    const totalAmount = (
        parseFloat(invoiceDetails.amount) + 
        parseFloat(invoiceDetails.cgst) + 
        parseFloat(invoiceDetails.sgst) + 
        parseFloat(invoiceDetails.igst)
    ).toFixed(2);

    useEffect(() => {
        // Clean up blob URL on unmount
        return () => {
            if (attachmentToDisplay && attachmentToDisplay.startsWith('blob:')) {
                URL.revokeObjectURL(attachmentToDisplay);
            }
        };
    }, [attachmentToDisplay]);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const entityId = selectedEntity || localStorage.getItem('entityId');
            await deleteInvoice(entityId, invoiceId, user.access_token);
            toast({ title: 'Success', description: 'Invoice deleted successfully.' });
            navigate(-1);
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to delete invoice: ${error.message}`,
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        delete data.date;
        try {
            const entityId = selectedEntity || localStorage.getItem('entityId');
            const updatedInvoice = await updateInvoice(invoiceId, entityId, data, user.access_token);
            // Update local state with the returned invoice data
            if (updatedInvoice) {
                setInvoice(updatedInvoice);
                setEditedInvoice(updatedInvoice);
            }
            toast({ title: 'Success', description: 'Invoice updated successfully.' });
            setIsEditing(false);
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to update invoice: ${error.message}`,
                variant: 'destructive',
            });
        }
    };

    const handleExportToPDF = async () => {
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pdfWidth - (margin * 2);
        const contentHeight = pdfHeight - (margin * 2);

        try {
            // Helper function to add image to PDF with proper scaling
            const addImageToPDF = (imgData, imgWidth, imgHeight) => {
                const ratio = imgWidth / imgHeight;
                let displayWidth = contentWidth;
                let displayHeight = displayWidth / ratio;
                
                // If content is taller than page, scale it down to fit
                if (displayHeight > contentHeight) {
                    displayHeight = contentHeight;
                    displayWidth = displayHeight * ratio;
                }
                
                // Center the image on the page
                const xPos = margin + (contentWidth - displayWidth) / 2;
                const yPos = margin + (contentHeight - displayHeight) / 2;
                
                pdf.addImage(imgData, 'PNG', xPos, yPos, displayWidth, displayHeight);
            };

            // Page 1: Invoice Details
            if (invoiceDetailsRef.current) {
                const detailsCanvas = await html2canvas(invoiceDetailsRef.current, { 
                    useCORS: true,
                    scale: 2,
                    backgroundColor: '#1e293b',
                    logging: false
                });
                const detailsImgData = detailsCanvas.toDataURL('image/png');
                addImageToPDF(detailsImgData, detailsCanvas.width, detailsCanvas.height);
            }

            // Page 2: Attachment (if it's an image, not PDF)
            if (attachmentRef.current && attachmentToDisplay && !attachmentToDisplay.toLowerCase().endsWith('.pdf')) {
                pdf.addPage();
                const attachmentCanvas = await html2canvas(attachmentRef.current, { 
                    useCORS: true,
                    scale: 2,
                    backgroundColor: '#1e293b',
                    logging: false
                });
                const attachmentImgData = attachmentCanvas.toDataURL('image/png');
                addImageToPDF(attachmentImgData, attachmentCanvas.width, attachmentCanvas.height);
            }

            // Last Page: Activity Log
            if (activityLogRef.current) {
                pdf.addPage();
                const activityCanvas = await html2canvas(activityLogRef.current, { 
                    useCORS: true,
                    scale: 2,
                    backgroundColor: '#1e293b',
                    logging: false
                });
                const activityImgData = activityCanvas.toDataURL('image/png');
                addImageToPDF(activityImgData, activityCanvas.width, activityCanvas.height);
            }

            pdf.save(`invoice-${invoiceDetails.bill_number || invoiceId}.pdf`);
            toast({ title: 'Export Successful', description: 'Invoice exported to PDF with details, attachment, and activity log.' });
        } catch (error) {
            console.error('PDF Export Error:', error);
            toast({ title: 'Export Error', description: `An error occurred: ${error.message}`, variant: 'destructive' });
        }
    };


    // Navigation logic
    const handleNavigate = (direction) => {
        if (!invoices || invoices.length === 0) {
            console.warn("No invoices available for navigation");
            return;
        }
        const newIndex = currentIndex + direction;
        console.log("Navigating:", { currentIndex, newIndex, direction, invoicesLength: invoices.length });
        if (newIndex >= 0 && newIndex < invoices.length) {
            const nextInvoice = invoices[newIndex];
            console.log("Navigating to invoice:", nextInvoice.id);
            setCurrentIndex(newIndex);
            navigate(`/invoices/${nextInvoice.id}`, { 
                state: { 
                    invoice: nextInvoice, 
                    invoices, 
                    organisationId, 
                    entityName, 
                    organizationName 
                } 
            });
        } else {
            console.warn("Navigation out of bounds:", { newIndex, invoicesLength: invoices.length });
        }
    };
    
    // Check if we have invoices to navigate - show arrows if we have multiple invoices
    const hasInvoices = invoices && Array.isArray(invoices) && invoices.length > 1;

    // Tag logic
    const handleTag = async () => {
        try {
            const entityId = selectedEntity || localStorage.getItem('entityId');
            await updateInvoice(invoiceId, entityId, { is_ready: true, finance_header_id: editedInvoice.finance_header_id }, user.access_token);
            toast({ title: 'Success', description: 'Invoice tagged successfully.' });
            navigate(-1);
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
                    <div className="flex h-full items-start justify-center p-6 overflow-y-auto">
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

    if (isLoading) {
        return <InvoiceDetailsSkeleton />;
    }

    const isClientUser = user?.role === 'CLIENT_USER';
    const defaultTab = isClientUser ? 'details' : 'details';
    const cols = isClientUser ? 'grid-cols-3' : 'grid-cols-3';

    return (
        <div className="h-screen w-full flex flex-col text-white bg-transparent p-4 md:p-6" style={{ paddingBottom: hasInvoices ? '5rem' : '1.5rem' }}>
            <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => user.role === 'CLIENT_USER' ? navigate('/finance?tab=invoices') : navigate('/finance/ca?tab=invoices')}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Invoice Details</h1>
                        <p className="text-sm text-gray-400">Review all invoice transactions.</p>
                    </div>
                </div>
                {/* Entity name in top right */}
                <div className="flex items-center">
                    <p className="text-2xl font-bold text-white">{getEntityName()}</p>
                </div>
            </header>

            <ResizablePanelGroup
                direction="horizontal"
                className="flex-1 rounded-lg border border-white/10"
            >
                <ResizablePanel defaultSize={60} minSize={30}>
                    <div className="relative flex h-full w-full flex-col items-center justify-center p-2">
                        {/* Zoom controls in bottom right corner */}
                        {attachmentToDisplay && !attachmentToDisplay.toLowerCase().endsWith('.pdf') && (
                            <div className="absolute bottom-4 right-4 z-10 flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => setZoom(z => z + 0.1)}>
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}>
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setZoom(1)}>
                                    <RefreshCcw className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <div className="flex h-full w-full items-center justify-center overflow-auto relative" style={{ zIndex: 1 }} ref={attachmentRef}>
                            {/* Show skeleton only if we have attachment_id but no URL yet (while fetching URL) */}
                            {(invoice?.attachment_id || (invoice?.attachment && invoice.attachment.id)) && !attachmentToDisplay && isImageLoading ? (
                                <Skeleton className="h-full w-full rounded-md" />
                            ) : attachmentToDisplay ? (
                                attachmentToDisplay.toLowerCase().endsWith('.pdf') ? (
                                    <iframe
                                        src={attachmentToDisplay}
                                        title="Invoice Attachment"
                                        className="h-full w-full rounded-md border-none"
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
                                    <p>No attachment available for this invoice.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={30}>
                    <div className="relative flex h-full flex-col">
                        <div className="flex-1 overflow-y-auto p-6" style={{ paddingBottom: hasInvoices ? '6rem' : '1.5rem' }}>
                            <Tabs defaultValue={defaultTab} className="w-full">
                            <TabsList className={`grid w-full ${cols}`}>
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="activity">Activity Log</TabsTrigger>
                                <TabsTrigger value="beneficiary">Beneficiary</TabsTrigger>
                            </TabsList>
                            <TabsContent value="details" className="mt-4">
                                {isEditing ? (
                                    <form onSubmit={handleUpdate} className="space-y-4">
                                        <div>
                                            <Label htmlFor="beneficiary_id">Beneficiary</Label>
                                            <Select 
                                                value={editedInvoice?.beneficiary_id ? String(editedInvoice.beneficiary_id) : ''}
                                                onValueChange={(val) => setEditedInvoice(p => ({ ...p, beneficiary_id: val }))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a beneficiary" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {beneficiaries.map((b) => (
                                                        <SelectItem key={b.id} value={String(b.id)}>
                                                            {b.beneficiary_type === 'individual' ? b.name : b.company_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="bill_number">Bill Number</Label>
                                            <Input name="bill_number" defaultValue={editedInvoice.bill_number} />
                                        </div>
                                        <div>
                                            <Label htmlFor="date">Date</Label>
                                            <Input name="date" type="date" defaultValue={new Date(editedInvoice.date).toISOString().split('T')[0]} />
                                        </div>
                                        <div>
                                            <Label htmlFor="amount">Amount</Label>
                                            <Input name="amount" type="number" step="0.01" defaultValue={editedInvoice.amount} />
                                        </div>
                                        <div>
                                            <Label htmlFor="cgst">CGST</Label>
                                            <Input name="cgst" type="number" step="0.01" defaultValue={editedInvoice.cgst} onChange={(e) => setEditedInvoice(p => ({ ...p, cgst: e.target.value, sgst: e.target.value }))} />
                                        </div>
                                        <div>
                                            <Label htmlFor="sgst">SGST</Label>
                                            <Input name="sgst" type="number" step="0.01" value={editedInvoice.sgst} onChange={(e) => setEditedInvoice(p => ({ ...p, sgst: e.target.value, cgst: e.target.value }))} />
                                        </div>
                                        <div>
                                            <Label htmlFor="igst">IGST</Label>
                                            <Input name="igst" type="number" step="0.01" defaultValue={editedInvoice.igst} />
                                        </div>
                                        <div>
                                            <Label htmlFor="remarks">Remarks</Label>
                                            <Input name="remarks" defaultValue={editedInvoice.remarks} />
                                        </div>
                                        {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                            <div>
                                                <Label htmlFor="finance_header_id">Header</Label>
                                                <Select name="finance_header_id" defaultValue={editedInvoice.finance_header_id}>
                                                    <SelectTrigger>
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
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isDeleting}>Cancel</Button>
                                            <Button type="submit" disabled={isDeleting}>
                                                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                                Save Changes
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <Card ref={invoiceDetailsRef} className="w-full glass-pane border-none shadow-none bg-gray-800 text-white relative z-20">
                                        <CardHeader>
                                            <CardTitle>{invoiceDetails.bill_number || 'N/A'}</CardTitle>
                                            <CardDescription>Created on {invoiceDetails.created_date || invoiceDetails.created_at ? new Date(invoiceDetails.created_date || invoiceDetails.created_at).toLocaleDateString() : 'N/A'}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2 relative z-20">
                                            <DetailItem label="Date" value={new Date(invoiceDetails.date).toLocaleDateString()} />
                                            <DetailItem label="Base Amount" value={`₹${parseFloat(invoiceDetails.amount || 0).toFixed(2)}`} />
                                            <DetailItem label="CGST" value={`₹${parseFloat(invoiceDetails.cgst || 0).toFixed(2)}`} />
                                            <DetailItem label="SGST" value={`₹${parseFloat(invoiceDetails.sgst || 0).toFixed(2)}`} />
                                            <DetailItem label="IGST" value={`₹${parseFloat(invoiceDetails.igst || 0).toFixed(2)}`} />
                                            <div className="pt-4">
                                                <DetailItem label="Total Amount" value={`₹${totalAmount}`} />
                                            </div>
                                            <div className="pt-4">
                                                <p className="text-sm text-gray-400 mb-1">Remarks</p>
                                                <p className="text-sm text-white p-3 bg-white/5 rounded-md">{invoiceDetails.remarks || 'N/A'}</p>
                                            </div>
                                            {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                                <div className="pt-4">
                                                    <Label htmlFor="finance_header_id">Header</Label>
                                                    <Select
                                                        name="finance_header_id"
                                                        value={editedInvoice.finance_header_id || ""}
                                                        onValueChange={(value) => setEditedInvoice(p => ({ ...p, finance_header_id: value }))}
                                                    >
                                                        <SelectTrigger>
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
                                            <div className="flex items-center gap-2 mt-4 justify-center relative z-20">
                                                {/* Action buttons in center */}
                                                <div className="flex items-center gap-2 relative z-20">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="destructive"
                                                                    size="icon"
                                                                    onClick={() => setShowDeleteDialog(true)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Delete</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={handleExportToPDF}
                                                                >
                                                                    <FileText className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Export</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => setIsEditing(!isEditing)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Edit</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button onClick={handleTag} className="bg-blue-600 text-white hover:bg-blue-700">
                                                                        Tag
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Tag Invoice</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </TooltipProvider>
                                                </div>
                                                {/* Spacer for next button (which is fixed on right) */}
                                                {hasInvoices && <div className="w-12"></div>}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>
                            <TabsContent value="activity" className="mt-4">
                                <div className="p-4" ref={activityLogRef}>
                                    <ActivityLog itemId={invoice?.id || invoiceId} itemType="invoice" />
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
                                            <CardHeader>
                                                <CardTitle>Beneficiary Details</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
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

            {/* Fixed navigation buttons at bottom corners - aligned on same line */}
            {hasInvoices && (
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
                        className="fixed bottom-4 left-80 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg z-50"
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
                        className="fixed bottom-4 right-4 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg z-50"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </>
            )}
            <Dialog open={showDeleteDialog} onOpenChange={isDeleting ? undefined : setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the invoice.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            style={isDeleting ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default InvoiceDetailsPage;
