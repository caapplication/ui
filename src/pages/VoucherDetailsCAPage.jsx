import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '@/hooks/useAuth.jsx';
import { deleteVoucher, updateVoucher, getBeneficiariesForCA, getVoucherAttachment, getVoucher, getBankAccountsForBeneficiary, getOrganisationBankAccountsForCA, getFinanceHeaders } from '@/lib/api.js';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Edit, Trash2, FileText, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RefreshCcw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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

const VoucherPDF = React.forwardRef(({ voucher, organizationName, entityName }, ref) => {
    if (!voucher) return null;

    const beneficiaryName = voucher.beneficiary
        ? (voucher.beneficiary.beneficiary_type === 'individual' ? voucher.beneficiary.name : voucher.beneficiary.company_name)
        : voucher.beneficiaryName || 'N/A';

    return (
        <div ref={ref} className="p-8 bg-white text-black" style={{ width: '210mm', minHeight: '297mm', position: 'absolute', left: '-210mm', top: 0 }}>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-blue-600">{organizationName || 'The Abduz Group'}</h1>
                <h2 className="text-xl font-semibold text-gray-700">{entityName}</h2>
                <p className="text-gray-500">Payment Voucher</p>
            </div>

            <div className="flex justify-between items-center border-b pb-4 mb-4">
                <p><span className="font-bold">Voucher No:</span> {voucher.id}</p>
                <p><span className="font-bold">Date:</span> {new Date(voucher.created_date).toLocaleDateString()}</p>
            </div>

            <div className="mb-8">
                <h2 className="text-lg font-bold mb-2">Paid to:</h2>
                <p>{beneficiaryName}</p>
                <p><span className="font-bold">PAN:</span> {voucher.beneficiary?.pan || 'N/A'}</p>
                <p><span className="font-bold">Email:</span> {voucher.beneficiary?.email || 'N/A'}</p>
                <p><span className="font-bold">Phone:</span> {voucher.beneficiary?.phone_number || 'N/A'}</p>
            </div>

            <table className="w-full mb-8">
                <thead>
                    <tr className="bg-blue-600 text-white">
                        <th className="p-2 text-left">Particulars</th>
                        <th className="p-2 text-right">Amount (INR)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="p-2 border-b">{voucher.remarks || 'N/A'}</td>
                        <td className="p-2 border-b text-right">₹{parseFloat(voucher.amount).toFixed(2)}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr className="bg-blue-600 text-white font-bold">
                        <td className="p-2 text-left">Total</td>
                        <td className="p-2 text-right">₹{parseFloat(voucher.amount).toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>

            <div>
                <h2 className="text-lg font-bold mb-2">Payment Details:</h2>
                <p><span className="font-bold">Payment Method:</span> {voucher.payment_type}</p>
            </div>
        </div>
    );
});

const VoucherDetailsCAPage = () => {
    const { voucherId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const { voucher: initialVoucher, vouchers, startInEditMode, organizationName, entityName, organisationId } = location.state || {};
    const [voucher, setVoucher] = useState(initialVoucher);
    const [currentIndex, setCurrentIndex] = useState(vouchers ? vouchers.findIndex(v => v.id === initialVoucher.id) : -1);
    const voucherDetailsRef = useRef(null);
    const [attachmentUrl, setAttachmentUrl] = useState(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [editedVoucher, setEditedVoucher] = useState(voucher);
    const [fromBankAccounts, setFromBankAccounts] = useState([]);
    const [toBankAccounts, setToBankAccounts] = useState([]);
    const [zoom, setZoom] = useState(1);
    const [financeHeaders, setFinanceHeaders] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [attachmentContentType, setAttachmentContentType] = useState(null);
    const activityLogRef = useRef(null);
    const attachmentRef = useRef(null);

    // Status management state
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectionRemarks, setRejectionRemarks] = useState('');
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);

    // Get entity name from user entities
    const getEntityName = () => {
        if (!user) return 'N/A';
        const entityId = localStorage.getItem('entityId') || voucher?.entity_id;
        if (!entityId) return 'N/A';

        // Fallback to entityName from location state
        return entityName || 'N/A';
    };

    useEffect(() => {
        if (startInEditMode) {
            setIsEditing(true);
        }
    }, [startInEditMode]);

    // Update currentIndex when voucherId changes
    useEffect(() => {
        if (vouchers && Array.isArray(vouchers) && voucherId) {
            const index = vouchers.findIndex(v => String(v.id) === String(voucherId));
            if (index !== currentIndex) {
                setCurrentIndex(index >= 0 ? index : -1);
            }
        }
    }, [voucherId, vouchers, currentIndex]);

    useEffect(() => {
        if (authLoading || !user?.access_token) return;

        let isMounted = true;
        const fetchData = async () => {
            try {
                // Use initialVoucher if available, otherwise fetch
                let currentVoucher = initialVoucher;

                // Only fetch if we don't have initial voucher or if voucherId changed
                if (!currentVoucher || currentVoucher.id !== voucherId) {
                    currentVoucher = await getVoucher(null, voucherId, user.access_token);
                }

                if (!currentVoucher) {
                    toast({ title: 'Error', description: 'Voucher not found.', variant: 'destructive' });
                    setIsLoading(false);
                    return;
                }

                if (isMounted) {
                    setVoucher(currentVoucher);
                    setEditedVoucher(currentVoucher);
                    // Update currentIndex when voucher changes
                    if (vouchers && Array.isArray(vouchers)) {
                        const index = vouchers.findIndex(v => String(v.id) === String(voucherId));
                        setCurrentIndex(index >= 0 ? index : -1);
                    }
                    setIsLoading(false);

                    // Load attachment in background
                    const attachmentId = currentVoucher.attachment_id || (currentVoucher.attachment && currentVoucher.attachment.id);

                    if (attachmentId) {
                        setIsImageLoading(true);
                        setAttachmentUrl(null);
                        setAttachmentContentType(null);
                        getVoucherAttachment(attachmentId, user.access_token)
                            .then(result => {
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
                            })
                            .catch(err => {
                                console.error("Failed to fetch attachment:", err);
                                setIsImageLoading(false);
                                setAttachmentUrl(null);
                                setAttachmentContentType(null);
                                toast({ title: 'Error', description: 'Failed to load attachment.', variant: 'destructive' });
                            });
                    } else {
                        setAttachmentUrl(null);
                        setAttachmentContentType(null);
                        setIsImageLoading(false);
                    }
                }
            } catch (error) {
                toast({ title: 'Error', description: `Failed to fetch data: ${error.message}`, variant: 'destructive' });
                setIsLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [voucherId, authLoading, user?.access_token]);

    useEffect(() => {
        if (!voucher || !user?.access_token) return;

        const fetchRelatedData = async () => {
            const orgId = voucher.organisation_id || organisationId;
            if (!orgId) {
                toast({ title: 'Error', description: 'Could not determine organization ID from voucher.', variant: 'destructive' });
                return;
            }

            try {
                const [beneficiariesData, fromAccountsData] = await Promise.all([
                    getBeneficiariesForCA(orgId, user.access_token),
                    getOrganisationBankAccountsForCA(orgId, user.access_token),
                ]);

                setBeneficiaries(beneficiariesData || []);
                setFromBankAccounts(fromAccountsData || []);
            } catch (error) {
                toast({ title: 'Error', description: `Failed to fetch related data: ${error.message}`, variant: 'destructive' });
            }
        };

        fetchRelatedData();
    }, [voucher, user?.access_token, organisationId]);

    useEffect(() => {
        if (!user?.access_token || !editedVoucher?.beneficiary_id) return;
        (async () => {
            try {
                const toAccounts = await getBankAccountsForBeneficiary(editedVoucher.beneficiary_id, user.access_token);
                setToBankAccounts(toAccounts || []);
            } catch {
                toast({ title: 'Error', description: 'Failed to fetch beneficiary bank accounts.', variant: 'destructive' });
            }
        })();
    }, [user?.access_token, editedVoucher?.beneficiary_id]);

    useEffect(() => {
        if (editedVoucher?.voucher_type === 'cash') {
            setEditedVoucher(prevState => ({ ...prevState, payment_type: 'cash' }));
        }
    }, [editedVoucher?.voucher_type]);


    useEffect(() => {
        const fetchHeaders = async () => {
            if (user && (user.role === 'CA_ACCOUNTANT' || user.role === 'CA_TEAM')) {
                try {
                    const headers = await getFinanceHeaders(user.agency_id, user.access_token);
                    setFinanceHeaders(headers);
                } catch (error) {
                    toast({
                        title: 'Error',
                        description: `Failed to fetch finance headers: ${error.message}`,
                        variant: 'destructive',
                    });
                }
            }
        };
        fetchHeaders();
    }, [user, toast]);

    const handleNavigate = (direction) => {
        if (!vouchers || vouchers.length === 0) {
            console.warn("No vouchers available for navigation");
            return;
        }
        const newIndex = currentIndex + direction;
        console.log("Navigating:", { currentIndex, newIndex, direction, vouchersLength: vouchers.length });
        if (newIndex >= 0 && newIndex < vouchers.length) {
            const nextVoucher = vouchers[newIndex];
            console.log("Navigating to voucher:", nextVoucher.id);
            // Update currentIndex immediately
            setCurrentIndex(newIndex);
            navigate(`/vouchers/ca/${nextVoucher.id}`, {
                state: {
                    voucher: nextVoucher,
                    vouchers,
                    organisationId,
                    entityName,
                    organizationName
                }
            });
        } else {
            console.warn("Navigation out of bounds:", { newIndex, vouchersLength: vouchers.length });
        }
    };

    const voucherDetails = voucher || {
        id: voucherId,
        beneficiaryName: 'N/A',
        created_date: new Date().toISOString(),
        amount: 0,
        voucher_type: 'N/A',
        payment_type: 'N/A',
        remarks: 'No remarks available.',
    };

    // Status helper functions
    const formatStatus = (status) => {
        if (!status || status === 'created') return 'Pending';
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'rejected':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            default:
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        }
    };

    // Status update handler
    const handleStatusUpdate = async (newStatus) => {
        if (newStatus === 'rejected' && !rejectionRemarks) {
            setShowRejectDialog(true);
            return;
        }

        setIsStatusUpdating(true);
        try {
            const payload = {
                status: newStatus,
                ...(newStatus === 'rejected' && rejectionRemarks && { status_remarks: rejectionRemarks })
            };

            const updatedVoucher = await updateVoucher(voucherId, payload, user.access_token);

            if (updatedVoucher) {
                setVoucher(updatedVoucher);
                setEditedVoucher(updatedVoucher);
            }

            toast({
                title: 'Success',
                description: `Voucher ${newStatus} successfully.`
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

    const handleExportToPDF = async () => {
        // For bank transfers, ensure bank account details are loaded
        if (
            voucher?.payment_type === 'bank_transfer' &&
            (
                !fromBankAccounts.length ||
                !toBankAccounts.length
            )
        ) {
            toast({
                title: 'Bank Account Details Not Loaded',
                description: 'Please wait for bank account details to load before exporting the PDF.',
                variant: 'destructive'
            });
            return;
        }

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
            // Helper function to add image to PDF with proper scaling and validation
            const addImageToPDF = (imgData, imgWidth, imgHeight) => {
                // Validate input dimensions
                if (!imgData || !imgWidth || !imgHeight || imgWidth <= 0 || imgHeight <= 0) {
                    console.warn('Invalid image dimensions:', { imgWidth, imgHeight });
                    return false;
                }

                // Calculate ratio with validation
                const ratio = imgWidth / imgHeight;
                if (!isFinite(ratio) || ratio <= 0) {
                    console.warn('Invalid image ratio:', ratio);
                    return false;
                }

                let displayWidth = contentWidth;
                let displayHeight = displayWidth / ratio;

                // If content is taller than page, scale it down to fit
                if (displayHeight > contentHeight) {
                    displayHeight = contentHeight;
                    displayWidth = displayHeight * ratio;
                }

                // Validate calculated dimensions
                if (!isFinite(displayWidth) || !isFinite(displayHeight) || displayWidth <= 0 || displayHeight <= 0) {
                    console.warn('Invalid display dimensions:', { displayWidth, displayHeight });
                    return false;
                }

                // Center the image on the page
                const xPos = margin + (contentWidth - displayWidth) / 2;
                const yPos = margin + (contentHeight - displayHeight) / 2;

                // Validate coordinates
                if (!isFinite(xPos) || !isFinite(yPos) || xPos < 0 || yPos < 0) {
                    console.warn('Invalid coordinates:', { xPos, yPos });
                    return false;
                }

                try {
                    pdf.addImage(imgData, 'PNG', xPos, yPos, displayWidth, displayHeight);
                    return true;
                } catch (imgError) {
                    console.error('Error adding image to PDF:', imgError);
                    return false;
                }
            };

            let hasContent = false;

            // Page 1: Voucher Details - Create formatted table with dark theme
            if (voucherDetails) {
                try {
                    // Dark theme colors
                    const darkBg = [30, 41, 59]; // #1e293b (slate-800)
                    const darkCard = [51, 65, 85]; // #334155 (slate-700)
                    const lightText = [255, 255, 255];
                    const grayText = [203, 213, 225]; // #cbd5e1 (slate-300)
                    const borderColor = [100, 100, 100]; // Gray border for visibility

                    // Set background to dark
                    pdf.setFillColor(...darkBg);
                    pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

                    // Header section
                    let yPos = margin + 5;
                    pdf.setTextColor(...lightText);
                    pdf.setFontSize(20);
                    pdf.setFont(undefined, 'bold');
                    pdf.text('Voucher Details', margin + 5, yPos);

                    yPos += 8;
                    pdf.setFontSize(12);
                    pdf.setFont(undefined, 'normal');
                    pdf.setTextColor(...grayText);
                    const beneficiaryName = voucherDetails.beneficiary
                        ? (voucherDetails.beneficiary.beneficiary_type === 'individual'
                            ? voucherDetails.beneficiary.name
                            : voucherDetails.beneficiary.company_name)
                        : voucherDetails.beneficiaryName || 'N/A';
                    pdf.text(`Voucher to ${beneficiaryName}`, margin + 5, yPos);

                    yPos += 5;
                    pdf.setFontSize(10);
                    pdf.text(`Created on ${new Date(voucherDetails.created_date).toLocaleDateString()}`, margin + 5, yPos);

                    yPos += 10;

                    // Create table with dark theme
                    const tableStartY = yPos;
                    const rowHeight = 8;
                    const col1Width = contentWidth * 0.4;
                    const col2Width = contentWidth * 0.6;

                    // Table header
                    pdf.setFillColor(...darkCard);
                    pdf.rect(margin, tableStartY, contentWidth, rowHeight, 'F');
                    pdf.setTextColor(...lightText);
                    pdf.setFontSize(11);
                    pdf.setFont(undefined, 'bold');
                    pdf.text('Field', margin + 3, tableStartY + 5);
                    pdf.text('Value', margin + col1Width + 3, tableStartY + 5);

                    // Draw border
                    pdf.setDrawColor(...borderColor);
                    pdf.rect(margin, tableStartY, contentWidth, rowHeight);

                    yPos = tableStartY + rowHeight;

                    // Table rows
                    const rows = [
                        ['Amount', `Rs. ${parseFloat(voucherDetails.amount || 0).toFixed(2)}`],
                        ['Voucher Type', voucherDetails.voucher_type ? voucherDetails.voucher_type.charAt(0).toUpperCase() + voucherDetails.voucher_type.slice(1) : 'N/A'],
                        ['Payment Method', voucherDetails.voucher_type === 'cash' ? 'Cash' : (voucherDetails.payment_type || 'N/A')],
                    ];

                    // Draw table rows
                    pdf.setFontSize(10);
                    pdf.setFont(undefined, 'normal');
                    rows.forEach(([field, value]) => {
                        pdf.setFillColor(...darkBg);
                        pdf.rect(margin, yPos, contentWidth, rowHeight, 'F');
                        pdf.setDrawColor(...borderColor);
                        pdf.rect(margin, yPos, contentWidth, rowHeight);
                        pdf.setTextColor(...lightText);
                        pdf.text(field, margin + 3, yPos + 5);
                        pdf.setTextColor(...grayText);
                        pdf.text(value, margin + col1Width + 3, yPos + 5);
                        yPos += rowHeight;
                    });

                    // Remarks section
                    yPos += 5;
                    const remarksTitleY = yPos;
                    const remarksTitleHeight = 6;
                    pdf.setFontSize(12);
                    pdf.setFont(undefined, 'bold');
                    pdf.setTextColor(...lightText);
                    pdf.text('Remarks', margin + 5, remarksTitleY + 4);

                    // Remarks content box - directly below title, no gap
                    yPos = remarksTitleY + remarksTitleHeight;
                    pdf.setFillColor(...darkBg);
                    const remarksHeight = 12;
                    const remarksBoxY = yPos;
                    pdf.rect(margin, remarksBoxY, contentWidth, remarksHeight, 'F');

                    // Draw border around remarks box - use same color as table rows
                    pdf.setDrawColor(...borderColor);
                    pdf.rect(margin, remarksBoxY, contentWidth, remarksHeight);

                    pdf.setFontSize(10);
                    pdf.setFont(undefined, 'normal');
                    pdf.setTextColor(...lightText);
                    const remarksText = voucherDetails.remarks && voucherDetails.remarks.trim()
                        ? voucherDetails.remarks
                        : 'N/A';
                    const wrappedRemarks = pdf.splitTextToSize(remarksText, contentWidth - 6);
                    pdf.text(wrappedRemarks, margin + 3, remarksBoxY + 5);

                    hasContent = true;
                } catch (error) {
                    console.error('Error creating voucher details PDF:', error);
                }
            }

            // Page 2: Attachment (image only - PDFs will be merged separately)
            if (attachmentUrl) {
                const isPdfAttachment = attachmentContentType?.toLowerCase().includes('pdf') || attachmentUrl?.toLowerCase().endsWith('.pdf');

                if (!isPdfAttachment) {
                    // For image attachments only, add them to jsPDF
                    try {
                        pdf.addPage();

                        // Load the image directly from URL
                        const img = new Image();
                        img.crossOrigin = 'anonymous';

                        await new Promise((resolve, reject) => {
                            img.onload = () => resolve();
                            img.onerror = (err) => {
                                console.error('Error loading image:', err);
                                reject(err);
                            };
                            img.src = attachmentUrl;

                            // Timeout after 10 seconds
                            setTimeout(() => {
                                if (!img.complete) {
                                    reject(new Error('Image load timeout'));
                                }
                            }, 10000);
                        });

                        // Calculate dimensions to fit the page
                        const imgWidth = img.width;
                        const imgHeight = img.height;
                        const ratio = imgWidth / imgHeight;

                        let displayWidth = contentWidth;
                        let displayHeight = displayWidth / ratio;

                        // If image is taller than page, scale it down
                        if (displayHeight > contentHeight) {
                            displayHeight = contentHeight;
                            displayWidth = displayHeight * ratio;
                        }

                        // Center the image on the page
                        const xPos = margin + (contentWidth - displayWidth) / 2;
                        const yPos = margin + (contentHeight - displayHeight) / 2;

                        // Add image to PDF
                        pdf.addImage(attachmentUrl, 'PNG', xPos, yPos, displayWidth, displayHeight);
                    } catch (error) {
                        console.error('Error adding attachment image to PDF:', error);
                        // Fallback: try using html2canvas if direct image load fails
                        if (attachmentRef.current) {
                            try {
                                const attachmentCanvas = await html2canvas(attachmentRef.current, {
                                    useCORS: true,
                                    scale: 2,
                                    backgroundColor: '#ffffff',
                                    logging: false,
                                    allowTaint: true
                                });

                                if (attachmentCanvas && attachmentCanvas.width > 0 && attachmentCanvas.height > 0) {
                                    const attachmentImgData = attachmentCanvas.toDataURL('image/png');
                                    addImageToPDF(attachmentImgData, attachmentCanvas.width, attachmentCanvas.height);
                                }
                            } catch (canvasError) {
                                console.error('Error capturing attachment with html2canvas:', canvasError);
                            }
                        }
                    }
                }
            }

            // Last Page: Activity Log
            if (activityLogRef.current) {
                try {
                    pdf.addPage();
                    const activityCanvas = await html2canvas(activityLogRef.current, {
                        useCORS: true,
                        scale: 2,
                        backgroundColor: '#1e293b',
                        logging: false,
                        allowTaint: true
                    });

                    if (activityCanvas && activityCanvas.width > 0 && activityCanvas.height > 0) {
                        const activityImgData = activityCanvas.toDataURL('image/png');
                        addImageToPDF(activityImgData, activityCanvas.width, activityCanvas.height);
                    }
                } catch (error) {
                    console.error('Error capturing activity log:', error);
                }
            }

            if (!hasContent) {
                throw new Error('No valid content to export. Please ensure the voucher details are visible.');
            }

            // Convert jsPDF to arrayBuffer for merging
            const detailsPdfBytes = pdf.output('arraybuffer');

            // Now merge PDFs if there's a PDF attachment
            const isPdfAttachment = attachmentUrl && (attachmentContentType?.toLowerCase().includes('pdf') || attachmentUrl?.toLowerCase().endsWith('.pdf'));

            if (isPdfAttachment) {
                try {
                    // Dynamically import pdf-lib only when needed
                    const { PDFDocument } = await import('pdf-lib');

                    // Get attachment ID from voucher
                    const attachmentId = voucher?.attachment_id || (voucher?.attachment && voucher?.attachment.id);

                    if (!attachmentId) {
                        throw new Error('No attachment ID available');
                    }

                    // Fetch the PDF directly from the API endpoint
                    const FINANCE_API_BASE_URL = import.meta.env.VITE_FINANCE_API_URL || 'http://127.0.0.1:8003';
                    const response = await fetch(`${FINANCE_API_BASE_URL}/api/attachments/${attachmentId}`, {
                        headers: {
                            'Authorization': `Bearer ${user.access_token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to fetch attachment: ${response.status}`);
                    }

                    const attachmentBlob = await response.blob();
                    const attachmentPdfBytes = await attachmentBlob.arrayBuffer();

                    // Create a new PDF document to merge
                    const mergedPdf = await PDFDocument.create();

                    // Load the details PDF
                    const detailsPdf = await PDFDocument.load(detailsPdfBytes);
                    const detailsPages = await mergedPdf.copyPages(detailsPdf, detailsPdf.getPageIndices());
                    detailsPages.forEach((page) => mergedPdf.addPage(page));

                    // Load and merge the attachment PDF
                    const attachmentPdf = await PDFDocument.load(attachmentPdfBytes);
                    const attachmentPages = await mergedPdf.copyPages(attachmentPdf, attachmentPdf.getPageIndices());
                    attachmentPages.forEach((page) => mergedPdf.addPage(page));

                    // Save the merged PDF
                    const mergedPdfBytes = await mergedPdf.save();
                    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `voucher-${voucher.voucher_id || voucherId}.pdf`;
                    link.click();
                    URL.revokeObjectURL(url);

                    toast({ title: 'Export Successful', description: 'Voucher exported to PDF with details, attachment, and activity log.' });
                } catch (error) {
                    console.error('Error merging PDF attachment:', error);
                    // Fallback to saving jsPDF if merging fails
                    pdf.save(`voucher-${voucher.voucher_id || voucherId}.pdf`);
                    toast({
                        title: 'Export Warning',
                        description: 'PDF exported but attachment could not be merged. Details only.',
                        variant: 'default'
                    });
                }
            } else {
                // No PDF attachment, just save the jsPDF
                pdf.save(`voucher-${voucher.voucher_id || voucherId}.pdf`);
                toast({ title: 'Export Successful', description: 'Voucher exported to PDF with details, attachment, and activity log.' });
            }
        } catch (error) {
            console.error('PDF Export Error:', error);
            toast({ title: 'Export Error', description: `An error occurred: ${error.message}`, variant: 'destructive' });
        }
    };

    const beneficiaryName = voucherDetails.beneficiary
        ? (voucherDetails.beneficiary.beneficiary_type === 'individual' ? voucherDetails.beneficiary.name : voucherDetails.beneficiary.company_name)
        : voucherDetails.beneficiaryName || 'N/A';

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteVoucher(voucherDetails.entity_id, voucherId, user.access_token);
            toast({ title: 'Success', description: 'Voucher deleted successfully.' });
            setShowDeleteDialog(false);
            navigate('/finance/ca');
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to delete voucher: ${error.message}`,
                variant: 'destructive',
            });
            setShowDeleteDialog(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const payload = {
            beneficiary_id: editedVoucher.beneficiary_id,
            amount: Number(data.amount) || Number(editedVoucher.amount),
            voucher_type: editedVoucher.voucher_type,
            payment_type: editedVoucher.payment_type,
            remarks: data.remarks || editedVoucher.remarks || null,
            ...(editedVoucher.payment_type === 'bank_transfer' ? {
                from_bank_account_id: editedVoucher.from_bank_account_id,
                to_bank_account_id: editedVoucher.to_bank_account_id,
            } : {}),
            ...(data.finance_header_id && data.finance_header_id !== '' ? {
                finance_header_id: Number(data.finance_header_id)
            } : { finance_header_id: null }),
        };

        try {
            const updatedVoucher = await updateVoucher(voucherId, payload, user.access_token);
            // Update local state with the returned voucher data
            if (updatedVoucher) {
                setVoucher(updatedVoucher);
                setEditedVoucher(updatedVoucher);
            }
            toast({ title: 'Success', description: 'Voucher updated successfully.' });
            setIsEditing(false);
            // Refresh the voucher data
            const refreshedVoucher = await getVoucher(null, voucherId, user.access_token);
            if (refreshedVoucher) {
                setVoucher(refreshedVoucher);
                setEditedVoucher(refreshedVoucher);
            }
        } catch (error) {
            toast({ title: 'Error', description: `Failed to update voucher: ${error.message}`, variant: 'destructive' });
        }
    };

    // Skeleton loading component
    const VoucherDetailsSkeleton = () => (
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
        return <VoucherDetailsSkeleton />;
    }

    // Check if we have vouchers to navigate - show arrows if we have multiple vouchers
    const hasVouchers = vouchers && Array.isArray(vouchers) && vouchers.length > 1;

    return (
        <div className="h-screen w-full flex flex-col text-white bg-transparent p-4 md:p-6" style={{ paddingBottom: hasVouchers ? '5rem' : '1.5rem' }}>
            <VoucherPDF ref={voucherDetailsRef} voucher={voucher} organizationName={organizationName} entityName={entityName} />

            {/* TEST BANNER - If you see this, the new code is loading */}
            <div className="bg-red-600 text-white p-4 mb-4 text-center font-bold text-xl">
                🔴 TEST: NEW CODE IS LOADING - Status buttons should be in Details tab below 🔴
            </div>

            <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/finance/ca')}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Voucher Details</h1>
                        <p className="text-sm text-gray-400">Review all cash and debit transactions.</p>
                    </div>
                </div>
                {/* Entity name in top right */}
                <div className="flex items-center">
                    <p className="text-sm font-semibold text-white">{getEntityName()}</p>
                </div>
            </header>

            <ResizablePanelGroup
                direction="horizontal"
                className="flex-1 rounded-lg border border-white/10"
            >
                <ResizablePanel defaultSize={60} minSize={30}>
                    <div className="relative flex h-full w-full flex-col items-center justify-center p-2">
                        {/* Zoom controls in bottom right corner */}
                        {attachmentUrl && !attachmentUrl.toLowerCase().endsWith('.pdf') && (
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
                        <div className="flex h-full w-full items-center justify-center overflow-auto relative hide-scrollbar" style={{ zIndex: 1 }} ref={attachmentRef}>
                            {voucher?.attachment_id && !attachmentUrl && isImageLoading ? (
                                <Skeleton className="h-full w-full rounded-md" />
                            ) : attachmentUrl ? (
                                (attachmentContentType?.toLowerCase().includes('pdf') || attachmentUrl.toLowerCase().endsWith('.pdf')) ? (
                                    <iframe
                                        src={`${attachmentUrl}#toolbar=0`}
                                        title="Voucher Attachment"
                                        className="h-full w-full rounded-md border-none"
                                        type="application/pdf"
                                        style={{ minHeight: '100%' }}
                                    />
                                ) : (
                                    <img
                                        key={`${attachmentUrl}-${voucher?.id}`}
                                        src={attachmentUrl}
                                        alt="Voucher Attachment"
                                        className="max-w-full max-h-full transition-transform duration-200"
                                        style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                                        onLoad={() => {
                                            console.log("Image loaded successfully");
                                            setIsImageLoading(false);
                                        }}
                                        onError={(e) => {
                                            console.error("Image failed to load:", e, "URL:", attachmentUrl);
                                            setIsImageLoading(false);
                                            toast({ title: 'Error', description: 'Failed to load image attachment.', variant: 'destructive' });
                                        }}
                                        loading="eager"
                                    />
                                )
                            ) : (
                                <div className="text-center text-gray-400 text-sm">
                                    <p>No attachment available for this voucher.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={30}>
                    <div className="relative flex h-full flex-col">
                        <div className="flex-1 overflow-y-auto p-6" style={{ paddingBottom: hasVouchers ? '6rem' : '1.5rem' }}>
                            <Tabs defaultValue="details" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
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
                                                    value={editedVoucher?.beneficiary_id ? String(editedVoucher.beneficiary_id) : ''}
                                                    onValueChange={(val) => setEditedVoucher(p => ({ ...p, beneficiary_id: val }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a beneficiary" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {beneficiaries.map(b => (
                                                            <SelectItem key={b.id} value={String(b.id)}>
                                                                {b.beneficiary_type === 'individual' ? b.name : b.company_name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="amount">Amount</Label>
                                                <Input
                                                    name="amount"
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={editedVoucher.amount}
                                                    onChange={(e) => setEditedVoucher(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="voucher_type">Voucher Type</Label>
                                                <Select
                                                    value={editedVoucher?.voucher_type}
                                                    onValueChange={(val) => setEditedVoucher(p => ({ ...p, voucher_type: val }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a voucher type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="debit">Debit</SelectItem>
                                                        <SelectItem value="cash">Cash</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="payment_type">Payment Method</Label>
                                                {editedVoucher?.voucher_type === 'cash' ? (
                                                    <Input value="Cash" disabled />
                                                ) : (
                                                    <Select
                                                        value={(editedVoucher?.payment_type ?? '').toLowerCase()}
                                                        onValueChange={(val) => setEditedVoucher(p => ({ ...p, payment_type: val }))}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Select a payment method" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                                            <SelectItem value="upi">UPI</SelectItem>
                                                            <SelectItem value="card">Card</SelectItem>
                                                            <SelectItem value="cheque">Cheque</SelectItem>
                                                            <SelectItem value="demand_draft">Demand Draft</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </div>
                                            {editedVoucher?.payment_type === 'bank_transfer' && (
                                                <>
                                                    <Select
                                                        value={editedVoucher?.from_bank_account_id ? String(editedVoucher.from_bank_account_id) : ''}
                                                        onValueChange={(val) => setEditedVoucher(p => ({ ...p, from_bank_account_id: val }))}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Select your bank account" /></SelectTrigger>
                                                        <SelectContent>
                                                            {fromBankAccounts.map(acc => (
                                                                <SelectItem key={acc.id} value={String(acc.id)}>
                                                                    {acc.bank_name} - {acc.account_number}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    <Select
                                                        value={editedVoucher?.to_bank_account_id ? String(editedVoucher.to_bank_account_id) : ''}
                                                        onValueChange={(val) => setEditedVoucher(p => ({ ...p, to_bank_account_id: val }))}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Select beneficiary's bank account" /></SelectTrigger>
                                                        <SelectContent>
                                                            {toBankAccounts.map(acc => (
                                                                <SelectItem key={acc.id} value={String(acc.id)}>
                                                                    {acc.bank_name} - {acc.account_number}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </>
                                            )}
                                            <div>
                                                <Label htmlFor="remarks">Remarks</Label>
                                                <Input name="remarks" defaultValue={editedVoucher.remarks} />
                                            </div>
                                            {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                                <div>
                                                    <Label htmlFor="finance_header_id">Header</Label>
                                                    <Select name="finance_header_id" defaultValue={editedVoucher.finance_header_id}>
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
                                                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                                <Button type="submit">Save Changes</Button>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            {/* Status Card */}
                                            <Card className="w-full glass-pane border-none shadow-none bg-gray-800 text-white mb-4">
                                                <CardContent className="p-6">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${getStatusColor(voucherDetails.status)}`}>
                                                                {voucherDetails.status === 'approved' && <CheckCircle className="h-4 w-4" />}
                                                                {voucherDetails.status === 'rejected' && <XCircle className="h-4 w-4" />}
                                                                {(!voucherDetails.status || voucherDetails.status === 'created') && <AlertCircle className="h-4 w-4" />}
                                                                {formatStatus(voucherDetails.status)}
                                                            </div>
                                                            {voucherDetails.created_date && (
                                                                <span className="text-sm text-gray-400">
                                                                    {new Date(voucherDetails.created_date).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {voucherDetails.status !== 'approved' && (
                                                                <Button onClick={() => handleStatusUpdate('approved')} disabled={isStatusUpdating} className="bg-green-600 hover:bg-green-700 text-white border-none" size="sm">
                                                                    {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />} Approve
                                                                </Button>
                                                            )}
                                                            {voucherDetails.status !== 'rejected' && (
                                                                <Button onClick={() => setShowRejectDialog(true)} disabled={isStatusUpdating} className="bg-red-600 hover:bg-red-700 text-white border-none" size="sm">
                                                                    {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />} Reject
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {voucherDetails.status === 'rejected' && voucherDetails.status_remarks && (
                                                        <div className="mt-4 p-3 rounded-md bg-red-500/10 border border-red-500/20">
                                                            <Label className="text-red-400 text-xs uppercase font-bold mb-1 block">Rejection Remarks</Label>
                                                            <p className="text-sm text-white">{voucherDetails.status_remarks}</p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            <Card className="w-full glass-pane border-none shadow-none bg-gray-800 text-white">
                                                <CardHeader>
                                                    <CardTitle>Voucher to {beneficiaryName}</CardTitle>
                                                    <CardDescription>Created on {new Date(voucherDetails.created_date).toLocaleDateString()}</CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-2">
                                                    <DetailItem label="Amount" value={`₹${parseFloat(voucherDetails.amount).toFixed(2)}`} />
                                                    <DetailItem label="Voucher Type" value={voucherDetails.voucher_type} />
                                                    <DetailItem label="Payment Method" value={voucherDetails.voucher_type === 'cash' ? 'Cash' : voucherDetails.payment_type} />
                                                    <div className="pt-4">
                                                        <p className="text-sm text-gray-400 mb-1">Remarks</p>
                                                        <p className="text-sm text-white p-3 bg-white/5 rounded-md">{voucherDetails.remarks || 'N/A'}</p>
                                                    </div>
                                                    <div className="pt-4">
                                                        <Label htmlFor="finance_header_id">Header</Label>
                                                        <Select name="finance_header_id" defaultValue={editedVoucher.finance_header_id} onValueChange={(value) => setEditedVoucher(p => ({ ...p, finance_header_id: value }))}>
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
                                                    <div className="flex items-center gap-2 mt-4 justify-between relative z-20">
                                                        {/* Action buttons at bottom right */}
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
                                                                        <Button variant="outline" size="icon" onClick={handleExportToPDF}>
                                                                            <FileText className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Export</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="outline" size="icon" onClick={() => setIsEditing(!isEditing)}>
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Edit</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                                                <Button onClick={() => {
                                                                    updateVoucher(voucherId, { is_ready: true, finance_header_id: editedVoucher.finance_header_id }, user.access_token)
                                                                        .then(() => {
                                                                            toast({ title: 'Success', description: 'Voucher marked as ready.' });
                                                                            navigate('/finance/ca');
                                                                        })
                                                                        .catch(err => {
                                                                            toast({ title: 'Error', description: `Failed to mark voucher as ready: ${err.message}`, variant: 'destructive' });
                                                                        });
                                                                }}>Tag</Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </>
                                    )}
                                </TabsContent>
                                <TabsContent value="activity" className="mt-4">
                                    <div className="p-4" ref={activityLogRef}>
                                        <ActivityLog itemId={voucher?.voucher_id || voucherId} itemType="voucher" showFilter={false} />
                                    </div>
                                </TabsContent>
                                <TabsContent value="beneficiary" className="mt-4">
                                    <Card className="w-full glass-pane border-none shadow-none bg-gray-800 text-white">
                                        <CardHeader>
                                            <CardTitle>Beneficiary Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <DetailItem label="Name" value={beneficiaryName} />
                                            <DetailItem label="PAN" value={voucherDetails.beneficiary?.pan || 'N/A'} />
                                            <DetailItem label="Email" value={voucherDetails.beneficiary?.email || 'N/A'} />
                                            <DetailItem label="Phone" value={voucherDetails.beneficiary?.phone_number || 'N/A'} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>

            {/* Fixed navigation buttons at bottom corners - aligned on same line */}
            {hasVouchers && (
                <>
                    {/* Previous button at bottom left (after sidebar) */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleNavigate(1);
                        }}
                        disabled={currentIndex === vouchers.length - 1}
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
                            handleNavigate(-1);
                        }}
                        disabled={currentIndex === 0 || currentIndex === -1}
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
                            This action cannot be undone. This will permanently delete the voucher.
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

            {/* Rejection Remarks Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Voucher</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this voucher.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="status_remarks">Rejection Remarks</Label>
                        <Textarea
                            id="status_remarks"
                            value={rejectionRemarks}
                            onChange={(e) => setRejectionRemarks(e.target.value)}
                            placeholder="Enter reason for rejection..."
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => {
                            setShowRejectDialog(false);
                            setRejectionRemarks('');
                        }}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleStatusUpdate('rejected')}
                            disabled={!rejectionRemarks.trim() || isStatusUpdating}
                        >
                            {isStatusUpdating ? 'Rejecting...' : 'Reject Voucher'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default VoucherDetailsCAPage;
