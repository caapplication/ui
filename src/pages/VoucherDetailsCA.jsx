import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useOrganisation } from '@/hooks/useOrganisation';
import { deleteCAVoucher, updateCAVoucher, getBeneficiariesForCA, getVoucherAttachment, getCAVoucher, getBankAccountsForBeneficiary, getOrganisationBankAccountsForCA, getFinanceHeaders, getCATeamVouchers, FINANCE_API_BASE_URL } from '@/lib/api.js';
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
import { Combobox } from '@/components/ui/combobox';

function formatPaymentMethod(method) {
    if (!method) return 'N/A';
    const map = {
        bank_transfer: 'Bank Transfer',
        upi: 'UPI',
        card: 'Card',
        cheque: 'Cheque',
        demand_draft: 'Demand Draft',
        cash: 'Cash'
    };
    return map[method.toLowerCase()] || method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

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

const VoucherDetailsCA = () => {
    const { voucherId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { organisationId, selectedEntity, entities, loading: orgLoading } = useOrganisation();
    const { toast } = useToast();
    const cache = useApiCache();
    const { voucher: initialVoucher, vouchers, startInEditMode, organizationName, entityName, isReadOnly } = location.state || {};
    const [voucher, setVoucher] = useState(initialVoucher);
    const [voucherList, setVoucherList] = useState(vouchers || []);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const hasFetchedVouchers = useRef(false);
    const voucherDetailsRef = useRef(null);
    const voucherDetailsPDFRef = useRef(null);
    const [attachmentUrl, setAttachmentUrl] = useState(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [editedVoucher, setEditedVoucher] = useState(voucher);
    const [fromBankAccounts, setFromBankAccounts] = useState([]);
    const [toBankAccounts, setToBankAccounts] = useState([]);
    const [zoom, setZoom] = useState(1);
    const [financeHeaders, setFinanceHeaders] = useState([]);
    const [loadingVoucher, setLoadingVoucher] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [attachmentContentType, setAttachmentContentType] = useState(null);
    const [allAttachmentIds, setAllAttachmentIds] = useState([]);
    const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(320); // Default to expanded width (300px + padding)

    // Refs to prevent duplicate API calls
    const fetchingVoucherRef = useRef(false);
    const fetchingAttachmentRef = useRef(null); // Track which attachment is being fetched
    const lastFetchedVoucherIdRef = useRef(null);
    const activityLogRef = useRef(null);
    const attachmentRef = useRef(null);
    const hasFetchedVoucherList = useRef(false);

    // Status management state
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectionRemarks, setRejectionRemarks] = useState('');
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionModalType, setCompletionModalType] = useState('all_done'); // 'all_done' or 'go_to_invoices'

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

        console.log("=== useEffect triggered ===");
        console.log("voucherId:", voucherId);
        console.log("lastFetchedVoucherIdRef.current:", lastFetchedVoucherIdRef.current);
        console.log("fetchingVoucherRef.current:", fetchingVoucherRef.current);

        // Reset refs when voucherId changes
        if (lastFetchedVoucherIdRef.current !== voucherId) {
            console.log("VoucherId changed - resetting refs");
            fetchingVoucherRef.current = false;
            fetchingAttachmentRef.current = null;
        }

        // Prevent duplicate fetches for the same voucher
        if (fetchingVoucherRef.current || lastFetchedVoucherIdRef.current === voucherId) {
            console.log("Early return - fetchingVoucherRef.current:", fetchingVoucherRef.current, "lastFetchedVoucherIdRef === voucherId:", lastFetchedVoucherIdRef.current === voucherId);
            return;
        }

        let isMounted = true;
        const fetchData = async () => {
            try {
                // Prevent duplicate calls
                if (fetchingVoucherRef.current) return;
                fetchingVoucherRef.current = true;

                console.log("=== VoucherDetailsCA Fetch Debug ===");
                console.log("voucherId:", voucherId);
                console.log("selectedEntity:", selectedEntity);

                // Always fetch fresh data from API (don't use initialVoucher)
                let currentVoucher = null;

                // Check cache first
                const cacheKey = { voucherId, token: user.access_token };
                currentVoucher = cache.get('getVoucher', cacheKey);

                if (!currentVoucher) {
                    console.log("No cached voucher, making API call...");
                    // Get entityId from multiple sources with priority
                    const entityIdFromStorage = localStorage.getItem('entityId');
                    const entityIdFromVoucher = initialVoucher?.entity_id || voucher?.entity_id;
                    // Use selectedEntity if available and not 'all', otherwise check voucher/storage
                    const entityId = (selectedEntity && selectedEntity !== "all")
                        ? selectedEntity
                        : (entityIdFromVoucher || entityIdFromStorage);

                    console.log("Entity resolution:", { selectedEntity, entityIdFromStorage, entityIdFromVoucher, finalEntityId: entityId });

                    // Use standard voucher endpoint with entity_id if available
                    let url = `${FINANCE_API_BASE_URL}/api/vouchers/${voucherId}`;
                    if (entityId) {
                        url += `?entity_id=${entityId}`;
                    }

                    console.log("Fetching from URL:", url);

                    const response = await fetch(url, {
                        headers: {
                            'Authorization': `Bearer ${user.access_token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        currentVoucher = await response.json();
                        console.log("Voucher fetched successfully:", currentVoucher);
                        cache.set('getVoucher', cacheKey, currentVoucher);
                    } else {
                        console.error("Failed to fetch voucher:", response.status);
                        throw new Error(`Failed to fetch voucher: ${response.status}`);
                    }
                } else {
                    console.log("Using cached voucher");
                }

                if (!currentVoucher) {
                    toast({ title: 'Error', description: 'Voucher not found.', variant: 'destructive' });
                    setIsLoading(false);
                    return;
                }

                if (isMounted) {
                    setVoucher(currentVoucher);
                    setEditedVoucher(currentVoucher);
                    setIsLoading(false);
                    setLoadingVoucher(false);
                    lastFetchedVoucherIdRef.current = voucherId;

                    // Collect all attachment IDs (primary + additional)
                    const primaryAttachmentId = currentVoucher.attachment_id || (currentVoucher.attachment && currentVoucher.attachment.id);
                    const additionalIds = currentVoucher.additional_attachment_ids || [];
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

                    // Always reset attachment state when voucher changes
                    // Load first attachment - prevent duplicate fetches
                    if (allIds.length > 0 && fetchingAttachmentRef.current !== allIds[0]) {
                        setIsImageLoading(true);
                        setAttachmentUrl(null); // Reset attachment URL
                        setAttachmentContentType(null);
                        fetchingAttachmentRef.current = allIds[0];
                        console.log("Fetching voucher attachment with ID:", allIds[0]);
                        promises.push(
                            getVoucherAttachment(allIds[0], user.access_token)
                                .then(result => {
                                    // Handle both old format (string URL) and new format (object with url and contentType)
                                    const url = typeof result === 'string' ? result : result?.url;
                                    const contentType = typeof result === 'object' ? result?.contentType : null;

                                    console.log("Voucher attachment URL received:", url ? "Yes" : "No", url, "Content-Type:", contentType);
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
                                        console.log("No URL returned from getVoucherAttachment");
                                        setIsImageLoading(false);
                                        setAttachmentUrl(null);
                                        setAttachmentContentType(null);
                                    }
                                    fetchingAttachmentRef.current = null; // Clear fetching flag
                                })
                                .catch(err => {
                                    console.error("Failed to fetch voucher attachment:", err);
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
                        console.log("No attachment_id found in voucher object. Voucher structure:", currentVoucher);
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

                    // Don't wait for these - they load in background
                    Promise.all(promises).catch(err => console.error("Background fetch error:", err));
                }
            } catch (error) {
                toast({ title: 'Error', description: `Failed to fetch data: ${error.message}`, variant: 'destructive' });
                setIsLoading(false);
            } finally {
                fetchingVoucherRef.current = false;
            }
        };

        fetchData();
        return () => {
            isMounted = false;
            fetchingVoucherRef.current = false;
        };
    }, [voucherId, authLoading, user?.access_token, initialVoucher?.id]);

    useEffect(() => {
        if (orgLoading || !organisationId || !selectedEntity || !user?.access_token) return;

        const fetchRelatedData = async () => {
            try {
                // Check cache first
                const beneficiariesKey = { orgId: organisationId, token: user.access_token };
                const accountsKey = { entityId: selectedEntity, token: user.access_token };

                let beneficiariesData = cache.get('getBeneficiariesForCA', beneficiariesKey);
                let fromAccountsData = cache.get('getOrganisationBankAccountsForCA', accountsKey);

                if (!beneficiariesData) {
                    beneficiariesData = await getBeneficiariesForCA(organisationId, user.access_token);
                    cache.set('getBeneficiariesForCA', beneficiariesKey, beneficiariesData);
                }

                if (!fromAccountsData) {
                    fromAccountsData = await getOrganisationBankAccountsForCA(selectedEntity, user.access_token);
                    cache.set('getOrganisationBankAccountsForCA', accountsKey, fromAccountsData);
                }

                setBeneficiaries(beneficiariesData || []);
                setFromBankAccounts(fromAccountsData || []);
            } catch (error) {
                toast({ title: 'Error', description: `Failed to fetch related data: ${error.message}`, variant: 'destructive' });
            }
        };

        fetchRelatedData();
    }, [organisationId, selectedEntity, user?.access_token, orgLoading]);

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

    // Fetch voucher list if not present (e.g. direct load) to enable navigation
    useEffect(() => {
        // If we already have a list, don't refetch
        if (voucherList && voucherList.length > 0) return;
        // If we are already fetching or not authorized, skip
        if (hasFetchedVoucherList.current || orgLoading || !user?.access_token) return;

        // Try to get entity ID from available sources
        const entityId = selectedEntity && selectedEntity !== "all"
            ? selectedEntity
            : (voucher?.entity_id || localStorage.getItem('entityId'));

        // If no entity context found and not in "all", we can't fetch a reasonable list
        if (!entityId && selectedEntity !== "all") return;

        const fetchVoucherList = async () => {
            hasFetchedVoucherList.current = true;
            try {
                let entityIdsToFetch = [];
                if (selectedEntity === "all" && entities.length > 0) {
                    entityIdsToFetch = entities.map(e => e.id);
                } else if (entityId) {
                    entityIdsToFetch = [entityId];
                }

                if (entityIdsToFetch.length > 0) {
                    console.log("Fetching voucher list for navigation context...", entityIdsToFetch);
                    const fetchPromises = entityIdsToFetch.map(async (id) => {
                        const cacheKey = { entityId: id, token: user.access_token };
                        const cached = cache.get('getCATeamVouchers', cacheKey);
                        if (cached) return cached;

                        const data = await getCATeamVouchers(id, user.access_token);
                        cache.set('getCATeamVouchers', cacheKey, data);
                        return data;
                    });

                    const results = await Promise.all(fetchPromises);
                    // Flatten and sort by date descending
                    const allVouchers = results.flat().sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

                    if (allVouchers.length > 0) {
                        console.log("Fetched voucher list context:", allVouchers.length);
                        setVoucherList(allVouchers);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch voucher list context:", error);
            }
        };

        fetchVoucherList();
    }, [voucherList, selectedEntity, voucher?.entity_id, user?.access_token, orgLoading, entities]);

    // Update currentIndex when voucherList is populated
    useEffect(() => {
        if (voucherList.length > 0) {
            const newIndex = voucherList.findIndex(v => String(v.id) === String(voucherId));
            if (newIndex >= 0) {
                setCurrentIndex(newIndex);
            } else if (currentIndex === -1 && voucher) {
                // Try to find by ID even if strict equality failed or if it's the only one
                const indexById = voucherList.findIndex(v => String(v.id) === String(voucher.id));
                if (indexById >= 0) setCurrentIndex(indexById);
            }
        }
    }, [voucherList, voucherId, voucher]);

    useEffect(() => {
        if (editedVoucher?.voucher_type === 'cash') {
            setEditedVoucher(prevState => ({ ...prevState, payment_type: 'cash' }));
        }
    }, [editedVoucher?.voucher_type]);

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
                const result = await getVoucherAttachment(attachmentId, user.access_token);
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
        const fetchHeaders = async () => {
            if (user && (user.role === 'CA_ACCOUNTANT' || user.role === 'CA_TEAM')) {
                try {
                    const cacheKey = { agencyId: user.agency_id, token: user.access_token };
                    let headers = cache.get('getFinanceHeaders', cacheKey);
                    if (!headers) {
                        headers = await getFinanceHeaders(user.agency_id, user.access_token);
                        cache.set('getFinanceHeaders', cacheKey, headers);
                    }
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
    }, [user?.role, user?.agency_id, user?.access_token]);

    useEffect(() => {
        // Only fetch if we don't have vouchers from location.state and haven't fetched yet
        if (vouchers && vouchers.length > 0) {
            setVoucherList(vouchers);
            return;
        }

        if (hasFetchedVouchers.current || orgLoading || !selectedEntity || !user?.access_token || entities.length === 0) {
            return;
        }

        const fetchAllVouchers = async () => {
            hasFetchedVouchers.current = true;

            let entityIdsToFetch = [];
            if (selectedEntity === "all") {
                entityIdsToFetch = entities.map((e) => e.id);
            } else {
                entityIdsToFetch = [selectedEntity];
            }

            try {
                // Check cache for each entity's vouchers
                const fetchPromises = entityIdsToFetch.map(async (id) => {
                    const cacheKey = { entityId: id, token: user.access_token };
                    let cached = cache.get('getCATeamVouchers', cacheKey);
                    if (cached) {
                        return cached;
                    }
                    const data = await getCATeamVouchers(id, user.access_token);
                    cache.set('getCATeamVouchers', cacheKey, data);
                    return data;
                });

                const results = await Promise.all(fetchPromises);
                const allVouchers = results.flat().sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
                setVoucherList(allVouchers);
            } catch (error) {
                toast({ title: 'Error', description: `Failed to fetch voucher list: ${error.message}`, variant: 'destructive' });
            }
        };

        fetchAllVouchers();
    }, [selectedEntity, user?.access_token, orgLoading, entities, vouchers, toast, cache]);

    useEffect(() => {
        if (voucherList.length > 0) {
            const newIndex = voucherList.findIndex(v => String(v.id) === String(voucherId));
            if (newIndex >= 0) {
                setCurrentIndex(newIndex);
            } else if (currentIndex === -1 && voucher) {
                // If voucher not found in list but we have a voucher, try to add it or find by voucher.id
                const indexById = voucherList.findIndex(v => String(v.id) === String(voucher.id));
                if (indexById >= 0) {
                    setCurrentIndex(indexById);
                }
            }
        } else if (vouchers && vouchers.length > 0) {
            // Fallback to vouchers from location.state if voucherList is empty
            const newIndex = vouchers.findIndex(v => String(v.id) === String(voucherId));
            if (newIndex >= 0) {
                setCurrentIndex(newIndex);
            }
        }
    }, [voucherList, voucherId, voucher, vouchers, currentIndex]);

    // Filter vouchers based on role to ensure consistent navigation
    const filteredVouchers = React.useMemo(() => {
        if (!voucherList || !Array.isArray(voucherList)) return [];

        return voucherList.filter(v => {
            // CA Team/Accountant should only see pending_ca_approval
            if (user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') {
                return v.status === 'pending_ca_approval';
            }
            // Client Master Admin should only see pending_master_admin_approval
            if (user?.role === 'CLIENT_MASTER_ADMIN') {
                return v.status === 'pending_master_admin_approval';
            }
            return true;
        });
    }, [voucherList, user?.role]);

    // Update currentIndex when filteredVouchers changes
    useEffect(() => {
        if (filteredVouchers.length > 0) {
            const newIndex = filteredVouchers.findIndex(v => String(v.id) === String(voucherId));
            if (newIndex >= 0) {
                setCurrentIndex(newIndex);
            }
        }
    }, [filteredVouchers, voucherId]);

    const handleNavigate = (direction) => {
        if (!filteredVouchers || filteredVouchers.length === 0) {
            console.warn("No vouchers available for navigation");
            return;
        }
        const newIndex = currentIndex + direction;
        console.log("Navigating:", { currentIndex, newIndex, direction, vouchersLength: filteredVouchers.length });

        if (newIndex >= 0 && newIndex < filteredVouchers.length) {
            setLoadingVoucher(true);
            setAttachmentUrl(null);
            setAttachmentContentType(null);
            setAllAttachmentIds([]);
            setCurrentAttachmentIndex(0);
            setIsImageLoading(false);
            const nextVoucher = filteredVouchers[newIndex];
            console.log("Navigating to voucher:", nextVoucher.id);
            // Update currentIndex immediately
            setCurrentIndex(newIndex);
            navigate(`/vouchers/ca/${nextVoucher.id}`, {
                state: {
                    voucher: nextVoucher,
                    vouchers: filteredVouchers,
                    organizationName,
                    entityName
                },
                replace: true
            });
        } else {
            console.warn("Navigation out of bounds:", { newIndex, vouchersLength: voucherList.length });
        }
    };

    // Check if we have vouchers to navigate - show arrows if we have multiple vouchers
    const hasVouchers = filteredVouchers && Array.isArray(filteredVouchers) && filteredVouchers.length > 1;

    const voucherDetails = voucher || {
        id: voucherId,
        beneficiaryName: 'N/A',
        created_date: new Date().toISOString(),
        amount: 0,
        voucher_type: 'N/A',
        payment_type: 'N/A',
        remarks: 'No remarks available.',
    };

    // Auto-navigation helper
    // Auto-navigation helper
    const handleAutoNext = async (updatedList = null) => {
        // Use updated list if provided, otherwise use current filtered list
        // We need to re-filter if we passed a raw list, or just assume the caller assumed it's the source
        // Actually, if updatedList is passed (the full voucherList with updates), we need to apply the same role filters

        let sourceList = filteredVouchers;

        if (updatedList) {
            sourceList = updatedList.filter(v => {
                if (user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') {
                    return v.status === 'pending_ca_approval';
                }
                if (user?.role === 'CLIENT_MASTER_ADMIN') {
                    return v.status === 'pending_master_admin_approval';
                }
                return true;
            });
        }

        // Since the current voucher is likely just approved/rejected, it might be removed from the list.
        // We should check if there are ANY pending vouchers remaining.
        let pendingVouchers = [];

        if (user?.role === 'CLIENT_MASTER_ADMIN') {
            pendingVouchers = sourceList.filter(v =>
                v.status === 'pending_master_admin_approval' && String(v.id) !== String(voucherId)
            );
        } else {
            // For CA, we only want pending_ca_approval. filteredVouchers already does this.
            // We just exclude current.
            pendingVouchers = sourceList.filter(v =>
                String(v.id) !== String(voucherId)
            );
        }

        if (pendingVouchers.length > 0) {
            // Go to the first pending/next voucher
            const nextVoucher = pendingVouchers[0];
            navigate(`/vouchers/ca/${nextVoucher.id}`, {
                state: {
                    voucher: nextVoucher,
                    // Pass the UDPATED full list so consistent navigation works in next screen
                    vouchers: updatedList || voucherList,
                    organisationId,
                    entityName,
                    organizationName
                },
                replace: true
            });
        } else {
            // No more vouchers in the filtered list
            // Check for pending invoices before showing completion modal
            try {
                // Get entityId from current voucher or selectedEntity
                const entityId = selectedEntity || voucher?.entity_id || localStorage.getItem('entityId');

                if (selectedEntity === "all" && entities && entities.length > 0) {
                    console.log("Checking for pending invoices for ALL entities");
                    const entityIds = entities.map(e => e.id);
                    const invoices = await getCATeamInvoicesBulk(entityIds, user.access_token);
                    console.log("Fetched bulk invoices for check:", invoices.length);
                    const pendingInvoices = invoices.filter(inv => inv.status === 'pending_ca_approval');
                    console.log("Pending invoices found (bulk):", pendingInvoices.length);

                    if (pendingInvoices.length > 0) {
                        setCompletionModalType('go_to_invoices');
                        setShowCompletionModal(true);
                        return;
                    }
                } else if (entityId && entityId !== "all") {
                    console.log("Checking for pending invoices for entity:", entityId);
                    // Fetch pending invoices
                    // Ensure we check for CA pending invoices correctly
                    const invoices = await getCATeamInvoices(entityId, user.access_token);
                    console.log("Fetched invoices for check:", invoices.length);
                    const pendingInvoices = invoices.filter(inv => inv.status === 'pending_ca_approval');
                    console.log("Pending invoices found:", pendingInvoices.length);

                    if (pendingInvoices.length > 0) {
                        setCompletionModalType('go_to_invoices');
                        setShowCompletionModal(true);
                        return;
                    }
                } else {
                    console.log("No specific entity context to check for pending invoices", { selectedEntity, voucherEntityId: voucher?.entity_id });
                }
            } catch (error) {
                console.error("Failed to check for pending invoices:", error);
            }

            // No more vouchers and no pending invoices
            setCompletionModalType('all_done');
            setShowCompletionModal(true);
        }
    };

    // Status helper functions
    const formatStatus = (status) => {
        if (!status) return 'Unknown';
        const statusMap = {
            verified: 'Verified',
            pending_ca_approval: 'Pending Audit',
            rejected_by_ca: 'Rejected',
            rejected_by_master_admin: 'Rejected',
            pending_master_admin_approval: 'Pending Approval'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'verified':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'rejected_by_ca':
            case 'rejected_by_master_admin':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'pending_ca_approval':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'pending_master_admin_approval':
                return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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

            const updatedVoucher = await updateCAVoucher(voucherId, payload, user.access_token);

            // Invalidate cache
            cache.invalidate('getCATeamVouchers');
            const cacheKey = { voucherId, token: user.access_token };
            cache.invalidate('getVoucher', cacheKey);

            if (updatedVoucher) {
                setVoucher(updatedVoucher);
                setEditedVoucher(updatedVoucher);
                cache.set('getVoucher', cacheKey, updatedVoucher);
            }

            toast({
                title: 'Success',
                description: `Voucher ${newStatus} successfully.`
            });

            setShowRejectDialog(false);
            setRejectionRemarks('');
            handleAutoNext();
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
                    // Use "Rs." instead of rupee symbol since jsPDF default font doesn't support ₹
                    const amountText = `Rs. ${parseFloat(voucherDetails.amount).toFixed(2)}`;
                    const rows = [
                        ['Amount', amountText],
                        ['Voucher Type', voucherDetails.voucher_type || 'N/A'],
                        ['Payment Method', formatPaymentMethod(
                            (voucherDetails.payment_type || '')
                                .toString()
                                .toLowerCase()
                                .replace(/\s/g, '_')
                        )]
                    ];

                    // Add bank account details if applicable
                    if (voucherDetails.payment_type === 'bank_transfer') {
                        const fromBank = fromBankAccounts.find(
                            acc => String(acc.id) === String(voucherDetails.from_bank_account_id)
                        );
                        const fromBankText = fromBank
                            ? `${fromBank.bank_name} - ${fromBank.account_number}`
                            : (voucherDetails.from_bank_account_name
                                ? `${voucherDetails.from_bank_account_name} - ${voucherDetails.from_bank_account_number || ''}`.trim()
                                : voucherDetails.from_bank_account_id || 'N/A');
                        rows.push(['From Bank Account', fromBankText]);

                        const toBank = toBankAccounts.find(
                            acc => String(acc.id) === String(voucherDetails.to_bank_account_id)
                        );
                        const toBankText = toBank
                            ? `${toBank.bank_name} - ${toBank.account_number}`
                            : (voucherDetails.to_bank_account_name
                                ? `${voucherDetails.to_bank_account_name} - ${voucherDetails.to_bank_account_number || ''}`.trim()
                                : voucherDetails.to_bank_account_id || 'N/A');
                        rows.push(['To Bank Account', toBankText]);
                    }

                    // Draw table rows
                    pdf.setFontSize(10);
                    pdf.setFont(undefined, 'normal');

                    rows.forEach((row, index) => {
                        // Check if we need a new page
                        if (yPos + rowHeight > pdfHeight - margin - 10) {
                            pdf.addPage();
                            pdf.setFillColor(...darkBg);
                            pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
                            yPos = margin + 5;
                        }

                        // Use same background as page for all rows except header
                        pdf.setFillColor(...darkBg);
                        pdf.rect(margin, yPos, contentWidth, rowHeight, 'F');

                        // Draw row border
                        pdf.setDrawColor(...borderColor);
                        pdf.rect(margin, yPos, contentWidth, rowHeight);

                        // Draw column separator
                        pdf.line(margin + col1Width, yPos, margin + col1Width, yPos + rowHeight);

                        // Add text
                        pdf.setTextColor(...grayText);
                        pdf.text(row[0], margin + 3, yPos + 5);
                        pdf.setTextColor(...lightText);
                        pdf.setFont(undefined, 'bold');
                        // Wrap long text
                        const valueText = pdf.splitTextToSize(row[1], col2Width - 6);
                        pdf.text(valueText, margin + col1Width + 3, yPos + 5);
                        pdf.setFont(undefined, 'normal');

                        yPos += rowHeight;
                    });

                    // Remarks section - no gap between title and content
                    if (yPos + 20 > pdfHeight - margin - 10) {
                        pdf.addPage();
                        pdf.setFillColor(...darkBg);
                        pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
                        yPos = margin + 5;
                    }

                    // Remarks title row - similar to table rows
                    const remarksTitleY = yPos;
                    const remarksTitleHeight = rowHeight;
                    pdf.setFillColor(...darkBg);
                    pdf.rect(margin, remarksTitleY, contentWidth, remarksTitleHeight, 'F');

                    // Draw border around remarks title row
                    pdf.setDrawColor(...borderColor);
                    pdf.rect(margin, remarksTitleY, contentWidth, remarksTitleHeight);

                    pdf.setFontSize(11);
                    pdf.setFont(undefined, 'bold');
                    pdf.setTextColor(...grayText);
                    pdf.text('Remarks', margin + 3, remarksTitleY + 5);

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
                    // For image attachments, use the existing logic
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

                    // Get attachment ID from voucher or allAttachmentIds
                    const attachmentId = voucher?.attachment_id || (voucher?.attachment && voucher?.attachment.id) || allAttachmentIds[0];

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
            // Use CA-specific endpoint - no entity_id required
            console.log('Deleting voucher with ID:', voucherId);
            await deleteCAVoucher(voucherId, user.access_token);
            // Invalidate cache for vouchers
            cache.invalidate('getCATeamVouchers');
            cache.invalidate('getVoucher', { voucherId, token: user.access_token });
            toast({ title: 'Success', description: 'Voucher deleted successfully.' });
            setShowDeleteDialog(false);
            navigate('/finance/ca');
        } catch (error) {
            console.error('Delete voucher error:', error);
            // Extract error message properly
            let errorMessage = 'Unknown error occurred';
            if (error?.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error?.detail) {
                errorMessage = error.detail;
            } else if (error?.error) {
                errorMessage = error.error;
            }

            toast({
                title: 'Error',
                description: `Failed to delete voucher: ${errorMessage}`,
                variant: 'destructive',
            });
            setShowDeleteDialog(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Get remarks value - always use form data if available, even if empty string
        // Convert empty string to null for API
        let remarksValue = null;
        if ('remarks' in data) {
            // Form field exists - use its value (even if empty string)
            remarksValue = data.remarks && typeof data.remarks === 'string' && data.remarks.trim()
                ? data.remarks.trim()
                : null;
        } else {
            // Form field doesn't exist - keep existing value
            remarksValue = editedVoucher?.remarks || null;
        }

        const payload = {
            beneficiary_id: editedVoucher.beneficiary_id,
            amount: Number(data.amount) || Number(editedVoucher.amount),
            voucher_type: editedVoucher.voucher_type,
            payment_type: editedVoucher.payment_type,
            remarks: remarksValue,
            ...(editedVoucher.payment_type === 'bank_transfer' ? {
                from_bank_account_id: editedVoucher.from_bank_account_id,
                to_bank_account_id: editedVoucher.to_bank_account_id,
            } : {}),
            ...(data.finance_header_id && data.finance_header_id !== '' ? {
                finance_header_id: Number(data.finance_header_id)
            } : { finance_header_id: null }),
        };

        try {
            const updatedVoucher = await updateCAVoucher(voucherId, payload, user.access_token);
            // Invalidate cache for vouchers
            cache.invalidate('getCATeamVouchers');
            const cacheKey = { voucherId, token: user.access_token };
            cache.invalidate('getVoucher', cacheKey);

            // Update local state with the returned voucher data immediately
            if (updatedVoucher) {
                setVoucher(updatedVoucher);
                setEditedVoucher(updatedVoucher);
                // Update cache with fresh data
                cache.set('getVoucher', cacheKey, updatedVoucher);
            }
            toast({ title: 'Success', description: 'Voucher updated successfully.' });
            setIsEditing(false);
            // Refresh the voucher data to ensure we have the latest from server
            // Use CA-specific endpoint - no entity_id required
            try {
                const refreshedVoucher = await getCAVoucher(voucherId, user.access_token);
                if (refreshedVoucher) {
                    setVoucher(refreshedVoucher);
                    setEditedVoucher(refreshedVoucher);
                    cache.set('getVoucher', cacheKey, refreshedVoucher);

                    // Reload attachment if needed
                    const primaryAttachmentId = refreshedVoucher.attachment_id || (refreshedVoucher.attachment && refreshedVoucher.attachment.id);
                    const additionalIds = refreshedVoucher.additional_attachment_ids || [];
                    const allIds = [];
                    if (primaryAttachmentId) {
                        allIds.push(primaryAttachmentId);
                    }
                    additionalIds.forEach(id => {
                        if (id && id !== primaryAttachmentId && !allIds.includes(id)) {
                            allIds.push(id);
                        }
                    });
                    setAllAttachmentIds(allIds);
                    setCurrentAttachmentIndex(0);

                    if (allIds.length > 0) {
                        setIsImageLoading(true);
                        setAttachmentUrl(null);
                        setAttachmentContentType(null);
                        getVoucherAttachment(allIds[0], user.access_token)
                            .then(result => {
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
                                console.error("Failed to fetch attachment after update:", err);
                                setIsImageLoading(false);
                            });
                    }
                }
            } catch (refreshError) {
                console.error('Failed to refresh voucher after update:', refreshError);
                // Don't show error toast - the update was successful, refresh is just a bonus
            }
        } catch (error) {
            toast({ title: 'Error', description: `Failed to update voucher: ${error.message}`, variant: 'destructive' });
        } finally {
            setIsSaving(false);
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

    if (isLoading || authLoading || orgLoading || loadingVoucher) {
        return <VoucherDetailsSkeleton />;
    }

    return (
        <div className="h-screen w-full flex flex-col text-white bg-transparent p-4 md:p-6" style={{ paddingBottom: hasVouchers ? '5rem' : '1.5rem' }}>
            <VoucherPDF ref={voucherDetailsRef} voucher={voucher} organizationName={organizationName} entityName={entityName} />
            <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Voucher Details</h1>
                        <p className="text-sm text-gray-400">Review all cash and debit transactions.</p>
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
                        {/* Navigation buttons for attachments */}
                        {allAttachmentIds.length > 1 && attachmentUrl && (
                            <>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleAttachmentNavigate(-1)}
                                    disabled={currentAttachmentIndex === 0}
                                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg"
                                >
                                    <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleAttachmentNavigate(1)}
                                    disabled={currentAttachmentIndex === allAttachmentIds.length - 1}
                                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg"
                                >
                                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                                </Button>
                            </>
                        )}
                        <div className="flex h-full w-full items-center justify-center overflow-auto relative hide-scrollbar" style={{ zIndex: 1 }} ref={attachmentRef}>
                            {/* Show skeleton only if we have attachments but no URL yet (while fetching URL) */}
                            {allAttachmentIds.length > 0 && !attachmentUrl ? (
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
                                                <Input name="remarks" defaultValue={editedVoucher.remarks || ''} />
                                            </div>
                                            {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                                <div>
                                                    <Label htmlFor="finance_header_id">Header</Label>
                                                    <Select
                                                        name="finance_header_id"
                                                        value={editedVoucher.finance_header_id ? String(editedVoucher.finance_header_id) : ''}
                                                        onValueChange={(value) => setEditedVoucher(p => ({ ...p, finance_header_id: value ? Number(value) : null }))}
                                                        disabled={voucherDetails.status === 'verified'}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a header" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {financeHeaders.map((h) => (
                                                                <SelectItem key={h.id} value={String(h.id)}>
                                                                    {h.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
                                                <Button type="submit" disabled={isSaving}>
                                                    {isSaving ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        'Save Changes'
                                                    )}
                                                </Button>
                                            </div>
                                        </form>
                                    ) : (
                                        <>


                                            <Card ref={voucherDetailsRef} className="w-full glass-pane border-none shadow-none bg-gray-800 text-white relative z-20">
                                                <div ref={voucherDetailsPDFRef} className="w-full">
                                                    <CardHeader>
                                                        <CardTitle>{beneficiaryName}</CardTitle>
                                                        <CardDescription className="flex items-center gap-2">
                                                            <span>Created on {new Date(voucherDetails.created_date).toLocaleDateString()}</span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(voucherDetails.status)}`}>
                                                                {formatStatus(voucherDetails.status)}
                                                            </span>
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="space-y-2 relative z-20">
                                                        <DetailItem label="Amount" value={`₹${parseFloat(voucherDetails.amount) % 1 === 0 ? parseFloat(voucherDetails.amount).toFixed(0) : parseFloat(voucherDetails.amount).toFixed(2)}`} />
                                                        <DetailItem label="Voucher ID" value={voucherDetails.voucher_id || 'N/A'} />
                                                        <DetailItem label="Voucher Type" value={voucherDetails.voucher_type} />
                                                        <DetailItem
                                                            label="Payment Method"
                                                            value={
                                                                voucherDetails.voucher_type === 'cash'
                                                                    ? 'Cash'
                                                                    : formatPaymentMethod(
                                                                        (voucherDetails.payment_type || '')
                                                                            .toString()
                                                                            .toLowerCase()
                                                                            .replace(/\s/g, '_')
                                                                    )
                                                            }
                                                        />
                                                        {(voucherDetails.payment_type === 'bank_transfer' || voucher?.payment_type === 'bank_transfer') && (
                                                            <>
                                                                <DetailItem
                                                                    label="From Bank Account"
                                                                    value={
                                                                        (() => {
                                                                            // Use voucher directly if voucherDetails doesn't have the fields
                                                                            const source = voucher || voucherDetails;
                                                                            const fromId = source.from_bank_account_id;
                                                                            const fromName = source.from_bank_account_name;
                                                                            const fromNumber = source.from_bank_account_number;

                                                                            // Priority 1: Use snapshot data first (most reliable, always available after save)
                                                                            if (fromName && fromName.trim()) {
                                                                                return `${fromName}${fromNumber ? ' - ' + fromNumber : ''}`.trim();
                                                                            }

                                                                            // Priority 2: Try to find in fetched bank accounts array (if loaded)
                                                                            if (fromId && fromBankAccounts?.length > 0) {
                                                                                const fromBank = fromBankAccounts.find(
                                                                                    acc => String(acc.id) === String(fromId)
                                                                                );
                                                                                if (fromBank) {
                                                                                    return `${fromBank.bank_name} - ${fromBank.account_number}`;
                                                                                }
                                                                            }

                                                                            // Priority 3: Show ID if available
                                                                            if (fromId) {
                                                                                return String(fromId);
                                                                            }

                                                                            return 'N/A';
                                                                        })()
                                                                    }
                                                                />
                                                                <DetailItem
                                                                    label="To Bank Account"
                                                                    value={
                                                                        (() => {
                                                                            // Use voucher directly if voucherDetails doesn't have the fields
                                                                            const source = voucher || voucherDetails;
                                                                            const toId = source.to_bank_account_id;
                                                                            const toName = source.to_bank_account_name;
                                                                            const toNumber = source.to_bank_account_number;

                                                                            // Priority 1: Use snapshot data first (most reliable, always available after save)
                                                                            if (toName && toName.trim()) {
                                                                                return `${toName}${toNumber ? ' - ' + toNumber : ''}`.trim();
                                                                            }

                                                                            // Priority 2: Try to find in fetched bank accounts array (if loaded)
                                                                            if (toId && toBankAccounts?.length > 0) {
                                                                                const toBank = toBankAccounts.find(
                                                                                    acc => String(acc.id) === String(toId)
                                                                                );
                                                                                if (toBank) {
                                                                                    return `${toBank.bank_name} - ${toBank.account_number}`;
                                                                                }
                                                                            }

                                                                            // Priority 3: Show ID if available
                                                                            if (toId) {
                                                                                return String(toId);
                                                                            }

                                                                            return 'N/A';
                                                                        })()
                                                                    }
                                                                />
                                                            </>
                                                        )}
                                                        <div className="pt-4">
                                                            <p className="text-sm text-gray-400 mb-1">Remarks</p>
                                                            <p className="text-sm text-white p-3 bg-white/5 rounded-md">{voucherDetails.remarks || 'N/A'}</p>
                                                        </div>
                                                        {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                                            <div className="pt-4">
                                                                <Label htmlFor="finance_header_id">Header</Label>
                                                                <Combobox
                                                                    options={[...financeHeaders].sort((a, b) => a.name.localeCompare(b.name)).map(h => ({ value: String(h.id), label: h.name }))}
                                                                    value={editedVoucher.finance_header_id}
                                                                    onValueChange={(value) => setEditedVoucher(p => ({ ...p, finance_header_id: value }))}
                                                                    placeholder="Select a header"
                                                                    searchPlaceholder="Search headers..."
                                                                    className="w-full h-11 bg-white/10 border-white/20 text-white hover:bg-white/20"
                                                                    disabled={voucherDetails.status === 'verified'}
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-4 justify-center relative z-20">
                                                            {/* Action buttons at bottom right */}
                                                            <div className="flex items-center gap-2 relative z-20">
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="icon"
                                                                                onClick={handleExportToPDF}
                                                                                disabled={
                                                                                    voucher?.payment_type === 'bank_transfer' &&
                                                                                    (!fromBankAccounts.length || !toBankAccounts.length)
                                                                                }
                                                                            >
                                                                                <FileText className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Export</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                                {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && !voucherDetails.is_deleted && (
                                                                    <>
                                                                        {voucherDetails.status !== 'rejected' && voucherDetails.status !== 'verified' && !isReadOnly && (
                                                                            <Button onClick={() => setShowRejectDialog(true)} disabled={isStatusUpdating} variant="reject" className="h-9 sm:h-10" size="sm">
                                                                                {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />} Reject
                                                                            </Button>
                                                                        )}
                                                                        {voucherDetails.status !== 'verified' && !isReadOnly && (
                                                                            <Button
                                                                                variant="approve"
                                                                                onClick={() => {
                                                                                    if (!editedVoucher.finance_header_id) {
                                                                                        toast({
                                                                                            title: 'Validation Error',
                                                                                            description: 'Please select a header before tagging the voucher.',
                                                                                            variant: 'destructive',
                                                                                        });
                                                                                        return;
                                                                                    }
                                                                                    updateCAVoucher(voucherId, { is_ready: true, finance_header_id: editedVoucher.finance_header_id, status: 'verified' }, user.access_token)
                                                                                        .then(() => {
                                                                                            toast({ title: 'Success', description: 'Voucher tagged and verified successfully.' });

                                                                                            // Update local list first
                                                                                            const updatedList = voucherList.map(v =>
                                                                                                String(v.id) === String(voucherId)
                                                                                                    ? { ...v, status: 'verified', is_ready: true, finance_header_id: editedVoucher.finance_header_id }
                                                                                                    : v
                                                                                            );
                                                                                            setVoucherList(updatedList);

                                                                                            // Pass updated list to navigation logic to avoid stale data
                                                                                            handleAutoNext(updatedList);
                                                                                        })
                                                                                        .catch(err => {
                                                                                            toast({ title: 'Error', description: `Failed to tag voucher: ${err.message}`, variant: 'destructive' });
                                                                                        });
                                                                                }}>Tag</Button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </div>
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
                                    {(() => {
                                        // Try to resolve the full beneficiary object
                                        let beneficiaryObj = voucherDetails.beneficiary;
                                        if (
                                            (!beneficiaryObj || !beneficiaryObj.phone) &&
                                            beneficiaries &&
                                            voucherDetails.beneficiary_id
                                        ) {
                                            const found = beneficiaries.find(
                                                b => String(b.id) === String(voucherDetails.beneficiary_id)
                                            );
                                            if (found) beneficiaryObj = found;
                                        }
                                        return (
                                            <Card className="w-full glass-pane border-none shadow-none bg-gray-800 text-white">
                                                <CardHeader>
                                                    <CardTitle>Beneficiary Details</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2">
                                                    <DetailItem label="Name" value={beneficiaryObj?.name || beneficiaryName} />
                                                    <DetailItem label="PAN" value={beneficiaryObj?.pan || 'N/A'} />
                                                    <DetailItem label="Email" value={beneficiaryObj?.email || 'N/A'} />
                                                    <DetailItem label="Phone" value={beneficiaryObj?.phone || 'N/A'} />
                                                </CardContent>
                                            </Card>
                                        );
                                    })()}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </ResizablePanel >
            </ResizablePanelGroup >

            {/* Fixed navigation buttons at bottom corners - aligned on same line */}
            {
                hasVouchers && (
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
                            disabled={currentIndex === filteredVouchers.length - 1}
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
                                handleNavigate(-1);
                            }}
                            disabled={currentIndex === 0 || currentIndex === -1}
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
                                    handleNavigate(1);
                                }}
                                disabled={currentIndex === filteredVouchers.length - 1}
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
                                    handleNavigate(-1);
                                }}
                                disabled={currentIndex === 0 || currentIndex === -1}
                                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg flex-1 pointer-events-auto"
                            >
                                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                        </div>
                    </>
                )
            }

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

            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Voucher</DialogTitle>
                        <DialogDescription>
                            Please provide remarks for rejecting this voucher.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="rejection-remarks" className="mb-2 block">Remarks</Label>
                        <Textarea
                            id="rejection-remarks"
                            placeholder="Reason for rejection..."
                            value={rejectionRemarks}
                            onChange={(e) => setRejectionRemarks(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowRejectDialog(false)} disabled={isStatusUpdating}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleStatusUpdate('rejected')}
                            disabled={!rejectionRemarks || isStatusUpdating}
                        >
                            {isStatusUpdating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Rejecting...
                                </>
                            ) : (
                                'Reject'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
                <DialogContent
                    className="[&>button]:hidden text-white border-white/10 bg-[#0f172a] sm:max-w-[425px]"
                    onInteractOutside={(e) => {
                        e.preventDefault();
                    }}
                >
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="mb-4 rounded-full bg-green-500/20 p-3">
                            {completionModalType === 'go_to_invoices' ? (
                                <AlertCircle className="h-12 w-12 text-yellow-500" />
                            ) : (
                                <CheckCircle className="h-12 w-12 text-green-500" />
                            )}
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-xl mb-2 text-center">
                                {completionModalType === 'go_to_invoices' ? 'Vouchers Complete!' : 'All Caught Up!'}
                            </DialogTitle>
                            <DialogDescription className="text-center text-gray-400">
                                {completionModalType === 'go_to_invoices'
                                    ? 'You have completed all vouchers, but there are pending invoices requiring your attention.'
                                    : 'You have processed all pending vouchers.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="mt-8 flex gap-3 w-full justify-center">
                            {completionModalType === 'go_to_invoices' ? (
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
                                            // Navigate to first pending invoice
                                            try {
                                                const entityId = selectedEntity || voucher?.entity_id || localStorage.getItem('entityId');
                                                if (entityId) {
                                                    let invoices = [];
                                                    if (selectedEntity === "all" && entities && entities.length > 0) {
                                                        const entityIds = entities.map(e => e.id);
                                                        invoices = await getCATeamInvoicesBulk(entityIds, user.access_token);
                                                    } else if (entityId !== "all") {
                                                        invoices = await getCATeamInvoices(entityId, user.access_token);
                                                    }

                                                    const pendingInvoices = invoices.filter(inv => inv.status === 'pending_ca_approval');

                                                    if (pendingInvoices.length > 0) {
                                                        pendingInvoices.sort((a, b) => new Date(b.created_date || b.date) - new Date(a.created_date || a.date));
                                                        const nextInvoice = pendingInvoices[0];
                                                        navigate(`/invoices/${nextInvoice.id}`, {
                                                            state: {
                                                                invoice: nextInvoice,
                                                                invoices: pendingInvoices,
                                                                organizationName,
                                                                entityName
                                                            },
                                                            replace: true
                                                        });
                                                    } else {
                                                        navigate('/finance?tab=invoices');
                                                    }
                                                } else {
                                                    navigate('/finance?tab=invoices');
                                                }
                                            } catch (e) {
                                                navigate('/finance?tab=invoices');
                                            }
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        Go to Invoices
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    onClick={() => navigate('/')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]"
                                >
                                    Go to Dashboard
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div >
    );
};

export default VoucherDetailsCA;
