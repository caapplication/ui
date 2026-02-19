import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useApiCache } from '@/contexts/ApiCacheContext.jsx';
import * as pdfjsLib from 'pdfjs-dist';
import { useAuth } from '@/hooks/useAuth.jsx';

// Set up PDF.js worker - use local worker from package
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url
).toString();
import { deleteVoucher, updateVoucher, getBeneficiaries, getVoucherAttachment, getVoucher, getBankAccountsForBeneficiary, getOrganisationBankAccounts, getFinanceHeaders, getInvoices, getCATeamVouchers } from '@/lib/api.js';


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
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import ActivityLog from '@/components/finance/ActivityLog';
import PdfPreviewModal from '@/components/modals/PdfPreviewModal';

// Helper functions for localStorage caching
const getCache = (key) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        console.error('Failed to read from cache', e);
        return null;
    }
};

const setCache = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Failed to write to cache', e);
    }
};


// ... unchanged formatPaymentMethod ...

// Inside handleUpdate (I will target handleUpdate function body closer)

// Actually I can't replace scattered parts easily. 
// I will target getStatusColor/formatStatus first.


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

const VoucherPDF = React.forwardRef(({ voucher, organizationName, entityName, fromBankAccounts, toBankAccounts }, ref) => {
    if (!voucher) return null;

    const beneficiaryName = voucher.beneficiary
        ? (voucher.beneficiary.beneficiary_type === 'individual' ? voucher.beneficiary.name : voucher.beneficiary.company_name)
        : voucher.beneficiaryName || 'N/A';

    // Find from/to bank account details (prefer live lookup; fallback to voucher snapshot)
    let fromBank = null;
    let toBank = null;
    if (voucher.voucher_type === 'debit' && voucher.payment_type !== 'cash') {
        if (fromBankAccounts && voucher.from_bank_account_id) {
            fromBank = fromBankAccounts.find(acc => String(acc.id) === String(voucher.from_bank_account_id));
        }
        if (toBankAccounts && voucher.to_bank_account_id) {
            toBank = toBankAccounts.find(acc => String(acc.id) === String(voucher.to_bank_account_id));
        }
    }

    const fromSnapshotLabel = voucher.from_bank_account_name
        ? `${voucher.from_bank_account_name} - ${voucher.from_bank_account_number || ''}`.trim()
        : null;
    const toSnapshotLabel = voucher.to_bank_account_name
        ? `${voucher.to_bank_account_name} - ${voucher.to_bank_account_number || ''}`.trim()
        : null;

    return (
        <div ref={ref} className="p-8 bg-white text-black" style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-blue-600">{organizationName || 'The Abduz Group'}</h1>
                <h2 className="text-xl font-semibold text-gray-700">{entityName}</h2>
                <p className="text-gray-500">Payment Voucher</p>
            </div>

            <div className="flex justify-between items-center border-b pb-4 mb-4">
                <div>
                    <p><span className="font-bold">Voucher No:</span> {voucher.voucher_id || voucher.id}</p>
                    <p><span className="font-bold">Voucher Type:</span> {voucher.voucher_type ? voucher.voucher_type.charAt(0).toUpperCase() + voucher.voucher_type.slice(1) : 'N/A'}</p>
                </div>
                <p><span className="font-bold">Date:</span> {new Date(voucher.created_date).toLocaleDateString()}</p>
            </div>

            <div className="mb-8">
                <h2 className="text-lg font-bold mb-2">Paid to:</h2>
                <p><span className="font-bold">Beneficiary Name:</span> {beneficiaryName}</p>
                <p><span className="font-bold">PAN:</span> {voucher.beneficiary?.pan || 'N/A'}</p>
                <p><span className="font-bold">Email:</span> {voucher.beneficiary?.email || 'N/A'}</p>
                <p><span className="font-bold">Phone:</span> {voucher.beneficiary?.phone || 'N/A'}</p>
                {voucher.voucher_type === 'debit' && voucher.payment_type !== 'cash' && (
                    <>
                        <p>
                            <span className="font-bold">From Bank Account:</span>
                            {fromBank
                                ? ` ${fromBank.bank_name} - ${fromBank.account_number}`
                                : (fromSnapshotLabel ? ` ${fromSnapshotLabel}` : (voucher.from_bank_account_id && voucher.from_bank_account_id !== '0' ? ` ${voucher.from_bank_account_id}` : ' -'))}
                        </p>
                        <p>
                            <span className="font-bold">To Bank Account:</span>
                            {toBank
                                ? ` ${toBank.bank_name} - ${toBank.account_number}`
                                : (toSnapshotLabel ? ` ${toSnapshotLabel}` : (voucher.to_bank_account_id && voucher.to_bank_account_id !== '0' ? ` ${voucher.to_bank_account_id}` : ' -'))}
                        </p>
                    </>
                )}
            </div>

            <table className="w-full mb-8 text-base">
                <thead>
                    <tr className="bg-blue-600 text-white">
                        <th className="p-4 text-left text-base font-semibold">Particulars</th>
                        <th className="p-4 text-right text-base font-semibold">Amount (INR)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="p-4 border-b text-base">{voucher.remarks || 'N/A'}</td>
                        <td className="p-4 border-b text-right text-base">₹{parseFloat(voucher.amount).toFixed(2)}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr className="bg-blue-600 text-white font-bold">
                        <td className="p-4 text-left text-base">Total</td>
                        <td className="p-4 text-right text-base">₹{parseFloat(voucher.amount).toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>

            <div>
                <h2 className="text-lg font-bold mb-2">Payment Details:</h2>
                <p><span className="font-bold">Payment Method:</span> {formatPaymentMethod(voucher.payment_type)}</p>
            </div>
        </div>
    );
});

const VoucherDetailsPage = () => {
    const { voucherId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const cache = useApiCache();
    const { voucher: initialVoucher, vouchers, startInEditMode, organizationName, entityName, organisationId, isReadOnly } = location.state || {};
    const [voucher, setVoucher] = useState(initialVoucher);
    // Initialize voucherList from location state if available
    const [voucherList, setVoucherList] = useState(vouchers || []);
    const [currentIndex, setCurrentIndex] = useState(vouchers ? vouchers.findIndex(v => String(v.id) === String(initialVoucher?.id)) : -1);
    const hasFetchedVoucherList = useRef(false);
    const voucherDetailsRef = useRef(null);
    const voucherDetailsPDFRef = useRef(null);
    const attachmentRef = useRef(null);
    const activityLogRef = useRef(null);
    const [attachmentUrl, setAttachmentUrl] = useState(null);
    const [attachmentContentType, setAttachmentContentType] = useState(null);
    const [allAttachmentIds, setAllAttachmentIds] = useState([]);
    const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);
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
    const [isSaving, setIsSaving] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(320); // Default to expanded width (300px + padding)

    // Fetch voucher list if not present (e.g. direct load) to enable navigation
    useEffect(() => {
        // If we already have a list, don't refetch
        if (voucherList && voucherList.length > 0) return;
        // If we are already fetching or not authorized, skip
        if (hasFetchedVoucherList.current || !user?.access_token) return;

        // Try to get entity ID from available sources
        const entityId = (user?.role === 'CLIENT_MASTER_ADMIN' ? user?.organization_id : null) || localStorage.getItem('entityId') || voucher?.entity_id;

        // If no entity context found, we can't fetch a reasonable list
        if (!entityId) return;

        const fetchVoucherList = async () => {
            hasFetchedVoucherList.current = true;
            try {
                // Determine which list to fetch based on role
                let data = [];
                const cacheKey = { entityId, token: user.access_token, role: user.role };

                // Fetch vouchers
                const cached = cache.get('getCATeamVouchers', cacheKey);
                if (cached) {
                    data = cached;
                } else {
                    data = await getCATeamVouchers(entityId, user.access_token);
                    cache.set('getCATeamVouchers', cacheKey, data);
                }

                if (Array.isArray(data) && data.length > 0) {
                    // Sort by date descending
                    const allVouchers = data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
                    console.log("Fetched voucher list context for Page:", allVouchers.length);
                    setVoucherList(allVouchers);
                }
            } catch (error) {
                console.error("Failed to fetch voucher list context:", error);
            }
        };

        fetchVoucherList();
    }, [voucherList, voucher?.entity_id, user?.access_token, user?.organization_id, user?.role]);

    // Status and Remarks State
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectionRemarks, setRejectionRemarks] = useState('');
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionModalType, setCompletionModalType] = useState('all_done'); // 'all_done' or 'go_to_invoices'

    // Determine if the current user is a client user
    // CA_ACCOUNTANT and CA_TEAM should NOT be treated as client users
    const isClientUser = user?.role === 'CLIENT_USER';
    const isCaUser = user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM';

    // Debug the values to understand why buttons aren't hiding
    // Hide actions if status is 'pending_ca_approval' OR 'verified'
    const hideClientActions = (isClientUser || user?.role === 'client_user') && (voucher?.status === 'pending_ca_approval' || voucher?.status === 'verified');

    console.log('Visibility Logic:', {
        role: user?.role,
        isClientUser,
        status: voucher?.status,
        hideClientActions
    });

    // Keeping shouldHideActions as alias if used elsewhere, though we updated main buttons
    const shouldHideActions = hideClientActions;

    const defaultTab = 'details';
    const cols = 'grid-cols-3';



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
        // Priority 1: Check if entityId is in localStorage (most reliable for client context)
        const entityId = localStorage.getItem('entityId') || voucher?.entity_id;

        // Priority 2: Check user.entities if available
        if (entityId && user.entities && Array.isArray(user.entities)) {
            const entity = user.entities.find(e => String(e.id) === String(entityId));
            if (entity) return entity.name;
        }

        // Priority 3: Check location state
        if (entityName) return entityName;

        // Priority 4: If voucher has entity_name (sometimes populated)
        if (voucher?.entity_name) return voucher.entity_name;

        return 'N/A';
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

    // Update currentIndex when voucherId changes
    useEffect(() => {
        if (voucherList && Array.isArray(voucherList) && voucherId) {
            const index = voucherList.findIndex(v => String(v.id) === String(voucherId));
            if (index !== currentIndex) {
                setCurrentIndex(index >= 0 ? index : -1);
            }
        }
    }, [voucherId, voucherList]);

    useEffect(() => {
        if (authLoading || !user?.access_token) return;

        let isMounted = true;
        const fetchData = async () => {
            try {
                const entityId = localStorage.getItem('entityId');
                const CACHE_KEY_VOUCHER = `fynivo_voucher_${voucherId}`;

                // 1. Try to load from cache immediately
                const cachedVoucher = getCache(CACHE_KEY_VOUCHER);
                if (cachedVoucher && isMounted) {
                    setVoucher(cachedVoucher);
                    // Don't setEditedVoucher here to avoid overwriting edits if re-render happens during edit?
                    // Actually, fetchData runs on mount. If we edit, we update state locally.
                    // If we navigate back, we want cache.
                    setEditedVoucher(cachedVoucher);
                    setIsLoading(false);
                }

                // Always fetch fresh voucher data to ensure we have all fields (especially snapshot fields)
                // This ensures consistency and that we always have the latest data from the server
                let currentVoucher = await getVoucher(entityId, voucherId, user.access_token);

                // If fetch fails or returns null, fall back to initialVoucher
                if (!currentVoucher && initialVoucher && String(initialVoucher.id) === String(voucherId)) {
                    currentVoucher = initialVoucher;
                }

                if (!currentVoucher) {
                    if (!cachedVoucher) {
                        toast({ title: 'Error', description: 'Voucher not found.', variant: 'destructive' });
                    }
                    setIsLoading(false);
                    return;
                }

                if (isMounted) {
                    const promises = [];
                    // Cache the fresh data
                    setCache(CACHE_KEY_VOUCHER, currentVoucher);

                    // Debug: Log the voucher data to verify snapshot fields are present
                    console.log('Setting voucher with data:', {
                        id: currentVoucher.id,
                        from_bank_account_name: currentVoucher.from_bank_account_name,
                        from_bank_account_number: currentVoucher.from_bank_account_number,
                        to_bank_account_name: currentVoucher.to_bank_account_name,
                        to_bank_account_number: currentVoucher.to_bank_account_number,
                        payment_type: currentVoucher.payment_type
                    });

                    setVoucher(currentVoucher);
                    setEditedVoucher(currentVoucher);
                    // Update currentIndex when voucher changes
                    if (voucherList && Array.isArray(voucherList)) {
                        const index = voucherList.findIndex(v => String(v.id) === String(voucherId));
                        setCurrentIndex(index >= 0 ? index : -1);
                    }
                    setIsLoading(false);

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

                    // Always reset attachment state when voucher changes
                    // Load first attachment
                    if (allIds.length > 0) {
                        setIsImageLoading(true);
                        setAttachmentUrl(null); // Reset attachment URL
                        setAttachmentContentType(null);
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
                                })
                                .catch(err => {
                                    console.error("Failed to fetch voucher attachment:", err);
                                    setIsImageLoading(false);
                                    setAttachmentUrl(null);
                                    setAttachmentContentType(null);
                                    // Show a toast for user feedback
                                    toast({
                                        title: 'Attachment Error',
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
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [voucherId, authLoading, user?.access_token]);

    // No need for separate preload - the img tag handles loading

    // Fetch edit data only when editing or when voucher is loaded (for bank account display)
    useEffect(() => {
        const fetchEditData = async () => {
            if (!user?.access_token || !voucher) return;

            try {
                const entityId = localStorage.getItem('entityId');
                const orgId = voucher?.organisation_id || organisationId || user?.organization_id;

                if (!orgId) return;

                const CACHE_KEY_BENEFICIARIES = `fynivo_beneficiaries_${orgId}`;
                const CACHE_KEY_ORG_ACCOUNTS = `fynivo_org_bank_accounts_${entityId}`;

                // Try cache first
                const cachedBeneficiaries = getCache(CACHE_KEY_BENEFICIARIES);
                const cachedOrgAccounts = getCache(CACHE_KEY_ORG_ACCOUNTS);

                if (cachedBeneficiaries) setBeneficiaries(cachedBeneficiaries);
                if (cachedOrgAccounts) setFromBankAccounts(cachedOrgAccounts);

                // Use optimized endpoints and fetch in parallel
                const [beneficiariesData, fromAccountsData] = await Promise.all([
                    getBeneficiaries(orgId, user.access_token),
                    getOrganisationBankAccounts(entityId, user.access_token),
                ]);

                if (beneficiariesData) {
                    setBeneficiaries(beneficiariesData);
                    setCache(CACHE_KEY_BENEFICIARIES, beneficiariesData);
                }
                if (fromAccountsData) {
                    setFromBankAccounts(fromAccountsData);
                    setCache(CACHE_KEY_ORG_ACCOUNTS, fromAccountsData);
                }

                // Debug: Log voucher bank account data
                if (voucher?.payment_type === 'bank_transfer') {
                    console.log('Voucher bank account data:', {
                        from_bank_account_id: voucher.from_bank_account_id,
                        to_bank_account_id: voucher.to_bank_account_id,
                        from_bank_account_name: voucher.from_bank_account_name,
                        from_bank_account_number: voucher.from_bank_account_number,
                        to_bank_account_name: voucher.to_bank_account_name,
                        to_bank_account_number: voucher.to_bank_account_number,
                        fromBankAccountsCount: fromAccountsData?.length || 0
                    });
                }
            } catch (error) {
                console.error('Failed to fetch edit data:', error);
                // Don't show toast for non-critical errors
            }
        };

        // Fetch if editing or if we need bank accounts for display (always fetch for bank_transfer to show bank account names)
        if (isEditing || voucher?.payment_type === 'bank_transfer') {
            fetchEditData();
        }
    }, [isEditing, user?.access_token, voucher?.id, voucher?.payment_type, organisationId]);

    useEffect(() => {
        if (!user?.access_token) return;

        // Get beneficiary_id from voucher or editedVoucher
        const beneficiaryId = editedVoucher?.beneficiary_id || voucher?.beneficiary_id;
        if (!beneficiaryId) return;

        // Fetch if editing or if payment type requires bank accounts (always fetch for bank_transfer to show bank account names)
        const paymentType = editedVoucher?.payment_type || voucher?.payment_type;
        if (!isEditing && paymentType !== 'bank_transfer') return;

        (async () => {
            try {
                const CACHE_KEY_BENEFICIARY_ACCOUNTS = `fynivo_beneficiary_bank_accounts_${beneficiaryId}`;
                const cachedAccounts = getCache(CACHE_KEY_BENEFICIARY_ACCOUNTS);
                if (cachedAccounts) setToBankAccounts(cachedAccounts);

                const toAccounts = await getBankAccountsForBeneficiary(beneficiaryId, user.access_token);
                if (toAccounts) {
                    setToBankAccounts(toAccounts);
                    setCache(CACHE_KEY_BENEFICIARY_ACCOUNTS, toAccounts);
                }
            } catch {
                console.error('Failed to fetch beneficiary bank accounts');
                // Don't show toast for non-critical errors
            }
        })();
    }, [user?.access_token, editedVoucher?.beneficiary_id, editedVoucher?.payment_type, isEditing, voucher?.beneficiary_id, voucher?.payment_type]);

    useEffect(() => {
        if (editedVoucher?.voucher_type === 'cash') {
            setEditedVoucher(prevState => ({ ...prevState, payment_type: 'cash' }));
        }
    }, [editedVoucher?.voucher_type]);

    // Attachment and finance headers are now loaded in parallel in the main fetchData effect

    // Handle attachment navigation
    const handleAttachmentNavigate = async (direction) => {
        if (allAttachmentIds.length <= 1 || !user?.access_token) return; // No navigation if only one or no attachments, or no auth token

        const newIndex = currentAttachmentIndex + direction;
        if (newIndex >= 0 && newIndex < allAttachmentIds.length) {
            setIsImageLoading(true);
            setAttachmentUrl(null);
            setAttachmentContentType(null);
            setCurrentAttachmentIndex(newIndex);

            try {
                const attachmentId = allAttachmentIds[newIndex];
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
            } catch (error) {
                console.error("Failed to fetch attachment:", error);
                setIsImageLoading(false);
                setAttachmentUrl(null);
                setAttachmentContentType(null);
            }
        }
    };

    // Filter vouchers based on role to ensure consistent navigation
    const filteredVouchers = useMemo(() => {
        if (!voucherList || !Array.isArray(voucherList)) return [];

        return voucherList.filter(v => {
            // Filter out deleted vouchers
            if (v.is_deleted) return false;

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
            const nextVoucher = filteredVouchers[newIndex];
            console.log("Navigating to voucher:", nextVoucher.id);
            // Update currentIndex immediately
            setCurrentIndex(newIndex);
            navigate(`/finance/vouchers/${nextVoucher.id}`, {
                state: {
                    voucher: nextVoucher,
                    // Pass the UDPATED full list so consistent navigation works in next screen
                    vouchers: updatedList || voucherList,
                    organisationId,
                    entityName,
                }
            });
        } else {
            console.warn("Navigation out of bounds:", { newIndex, vouchersLength: filteredVouchers.length });
        }
    };

    // Auto-navigation helper
    const handleAutoNext = async (updatedList = null) => {
        let sourceList = filteredVouchers;

        if (updatedList) {
            sourceList = updatedList.filter(v => {
                if (v.is_deleted) return false;
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

        // For all roles, filter out the current voucher ID from the pending list
        pendingVouchers = sourceList.filter(v =>
            String(v.id) !== String(voucherId)
        );

        if (pendingVouchers.length > 0) {
            // Go to the first pending/next voucher
            const nextVoucher = pendingVouchers[0];
            navigate(`/finance/vouchers/${nextVoucher.id}`, {
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
            // Check for pending invoices if Client Master Admin
            if (user?.role === 'CLIENT_MASTER_ADMIN') {
                try {
                    const entityId = voucher?.entity_id || localStorage.getItem('entityId');
                    if (entityId) {
                        const invoices = await getInvoices(entityId, user.access_token);
                        const pendingInvoices = invoices.filter(inv => inv.status === 'pending_master_admin_approval' && !inv.is_deleted);

                        if (pendingInvoices.length > 0) {
                            setCompletionModalType('go_to_invoices');
                            setShowCompletionModal(true);
                            return;
                        }
                    }
                } catch (err) {
                    console.error("Failed to check pending invoices:", err);
                }
            }

            // No more vouchers (and no pending invoices for Master Admin)
            setCompletionModalType('all_done');
            setShowCompletionModal(true);
        }
    };

    // Check if we have vouchers to navigate - show arrows if we have multiple vouchers
    const hasVouchers = filteredVouchers && Array.isArray(filteredVouchers) && filteredVouchers.length > 1;

    // Use useMemo to ensure voucherDetails updates when voucher changes
    const voucherDetails = useMemo(() => {
        if (voucher) {
            // Debug: Log voucher to verify it has bank account fields
            console.log('voucherDetails computed from voucher:', {
                hasVoucher: !!voucher,
                from_bank_account_id: voucher.from_bank_account_id,
                from_bank_account_name: voucher.from_bank_account_name,
                from_bank_account_number: voucher.from_bank_account_number,
                to_bank_account_id: voucher.to_bank_account_id,
                to_bank_account_name: voucher.to_bank_account_name,
                to_bank_account_number: voucher.to_bank_account_number,
            });
            return voucher;
        }
        return {
            id: voucherId,
            beneficiaryName: 'N/A',
            created_date: new Date().toISOString(),
            amount: 0,
            voucher_type: 'N/A',
            payment_type: 'N/A',
            remarks: 'No remarks available.',
        };
    }, [voucher, voucherId]);

    // Status helper functions
    const formatStatus = (status) => {
        if (!status) return 'Unknown';
        if (voucherDetails?.is_deleted || status === 'deleted') return 'Deleted';
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
        if (voucherDetails?.is_deleted || status === 'deleted') return 'bg-gray-500/20 text-gray-400 border-gray-500/30';

        switch (status) {
            case 'verified':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'rejected_by_ca':
            case 'rejected_by_master_admin':
            case 'rejected':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'pending_ca_approval':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'pending_master_admin_approval':
                return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'deleted':
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };



    const beneficiaryName = voucherDetails.beneficiary
        ? (voucherDetails.beneficiary.beneficiary_type === 'individual' ? voucherDetails.beneficiary.name : voucherDetails.beneficiary.company_name)
        : voucherDetails.beneficiaryName || 'N/A';

    const [isExportingPDF, setIsExportingPDF] = React.useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

    const handleServerPDFExport = async () => {
        setIsExportingPDF(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_FINANCE_API_URL}/api/vouchers/${voucherId}/generate_pdf`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${user.access_token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to generate PDF');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            setPdfPreviewUrl(url);
            setIsPdfPreviewOpen(true);

        } catch (error) {
            console.error('PDF export error:', error);
            toast({
                title: 'Error',
                description: 'Failed to export PDF',
                variant: 'destructive'
            });
        } finally {
            setIsExportingPDF(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const entityId = voucherDetails.entity_id || localStorage.getItem('entityId');
            await deleteVoucher(entityId, voucherId, user.access_token);
            toast({ title: 'Success', description: 'Voucher deleted successfully.' });
            setShowDeleteDialog(false);
            if (user.role === 'CLIENT_USER' || user.role === 'CLIENT_MASTER_ADMIN') {
                navigate('/finance');
            } else {
                navigate('/finance/ca');
            }
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

        // Auto-transition status for Client User re-submission
        if (isClientUser && (editedVoucher.status === 'rejected_by_master_admin' || editedVoucher.status === 'rejected_by_admin')) {
            payload.status = 'pending_master_admin_approval';
        }
        // Auto-transition status for Client Master Admin re-submission (from CA rejection)
        else if (user?.role === 'CLIENT_MASTER_ADMIN' && (editedVoucher.status === 'rejected_by_ca' || editedVoucher.status === 'rejected')) {
            payload.status = 'pending_ca_approval';
        }

        try {
            const updatedVoucher = await updateVoucher(voucherId, payload, user.access_token);
            // Update local state with the returned voucher data immediately
            if (updatedVoucher) {
                setVoucher(updatedVoucher);
                setEditedVoucher(updatedVoucher);
            }
            toast({ title: 'Success', description: 'Voucher updated successfully.' });
            setIsEditing(false);
            // Refresh the voucher data to ensure we have the latest from server
            const entityId = voucherDetails.entity_id || localStorage.getItem('entityId');
            const refreshedVoucher = await getVoucher(entityId, voucherId, user.access_token);
            if (refreshedVoucher) {
                setVoucher(refreshedVoucher);
                setEditedVoucher(refreshedVoucher);

                // If bank transfer, ensure bank accounts are fetched for display
                if (refreshedVoucher.payment_type === 'bank_transfer') {
                    const orgId = refreshedVoucher?.organisation_id || organisationId || user?.organization_id;
                    if (orgId) {
                        // Fetch bank accounts in parallel
                        Promise.all([
                            getOrganisationBankAccounts(entityId, user.access_token),
                            refreshedVoucher.beneficiary_id ? getBankAccountsForBeneficiary(refreshedVoucher.beneficiary_id, user.access_token) : Promise.resolve([])
                        ]).then(([fromAccounts, toAccounts]) => {
                            setFromBankAccounts(fromAccounts || []);
                            setToBankAccounts(toAccounts || []);
                        }).catch(err => {
                            console.error('Failed to fetch bank accounts after update:', err);
                        });
                    }
                }
            }
        } catch (error) {
            toast({ title: 'Error', description: `Failed to update voucher: ${error.message}`, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusUpdate = async (status, remarks = null) => {
        setIsStatusUpdating(true);
        try {
            const payload = {
                status: status,
                ...(remarks && { status_remarks: remarks })
            };

            const entityId = voucherDetails.entity_id || localStorage.getItem('entityId');
            const updatedVoucher = await updateVoucher(voucherId, payload, user.access_token);

            if (updatedVoucher) {
                setVoucher(updatedVoucher);
                setEditedVoucher(updatedVoucher);
                toast({
                    title: 'Status Updated',
                    description: `Voucher marked as ${status}.`
                });
                setShowRejectDialog(false);
                setRejectionRemarks('');

                // Auto-navigate to next voucher if available
                // This mimics the CA panel behavior
                if (status !== 'rejected') {
                    // Update local list
                    const updatedList = voucherList.map(v =>
                        String(v.id) === String(voucherId) ? { ...v, status: status } : v
                    );
                    setVoucherList(updatedList);

                    setTimeout(() => {
                        handleAutoNext(updatedList);
                    }, 500);
                } else {
                    // Even on reject, we want to update list and navigate
                    const updatedList = voucherList.map(v =>
                        String(v.id) === String(voucherId) ? { ...v, status: 'rejected' } : v
                    );
                    setVoucherList(updatedList);

                    setTimeout(() => {
                        handleAutoNext(updatedList);
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Status Update Error:', error);
            toast({
                title: 'Error',
                description: `Failed to update status: ${error.message}`,
                variant: 'destructive'
            });
        } finally {
            setIsStatusUpdating(false);
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

    if (isLoading) {
        return <VoucherDetailsSkeleton />;
    }


    return (
        <div className="h-screen w-full flex flex-col text-white bg-transparent p-3 sm:p-4 md:p-6" style={{ paddingBottom: hasVouchers ? '6rem' : '1.5rem' }}>
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-white/10 mb-3 sm:mb-4">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 sm:h-10 sm:w-10">
                        <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold">Voucher Details</h1>
                        <p className="text-xs sm:text-sm text-gray-400">Review all cash and debit transactions.</p>
                    </div>
                </div>
                {/* Entity name in top right */}
                <div className="flex flex-col items-end">
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-white truncate">{getEntityName()}</p>
                    {user?.role === 'CLIENT_MASTER_ADMIN' && (
                        <p className="text-sm text-gray-400">
                            Pending Approval: {filteredVouchers?.length || 0}
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
                        {/* Zoom controls in bottom right corner */}
                        {attachmentUrl && !(attachmentContentType?.toLowerCase().includes('pdf') || attachmentUrl.toLowerCase().endsWith('.pdf')) && (
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
                                            setIsImageLoading(false);
                                        }}
                                        onError={(e) => {
                                            console.error("Image failed to load:", e, "URL:", attachmentUrl);
                                            setIsImageLoading(false);
                                        }}
                                        loading="eager"
                                    />
                                )
                            ) : (
                                <div className="text-center text-gray-400">
                                    <p>No attachment available for this voucher.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={30}>
                    <div className="relative flex h-full flex-col">
                        <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-6 hide-scrollbar" style={{ paddingBottom: hasVouchers ? '8rem' : '2rem' }}>
                            <Tabs defaultValue={defaultTab} className="w-full">
                                <TabsList className={`grid w-full ${cols} text-xs sm:text-sm`}>
                                    <TabsTrigger value="details" className="text-xs sm:text-sm">Details</TabsTrigger>
                                    <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity Log</TabsTrigger>
                                    <TabsTrigger value="beneficiary" className="text-xs sm:text-sm">Beneficiary</TabsTrigger>
                                </TabsList>
                                <TabsContent value="details" className="mt-4">
                                    {isEditing ? (
                                        <form onSubmit={handleUpdate} className="space-y-4">
                                            <div>
                                                <Label htmlFor="voucher_type" className="text-sm">Voucher Type</Label>
                                                <Select
                                                    value={editedVoucher?.voucher_type || ''}
                                                    onValueChange={(val) => setEditedVoucher(p => ({ ...p, voucher_type: val }))}
                                                    disabled={true}
                                                >
                                                    <SelectTrigger disabled={true}>
                                                        <SelectValue placeholder="Select a voucher type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="debit">Debit</SelectItem>
                                                        <SelectItem value="cash">Cash</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="beneficiary_id" className="text-sm">Beneficiary</Label>
                                                <Select
                                                    value={editedVoucher?.beneficiary_id ? String(editedVoucher.beneficiary_id) : ''}
                                                    onValueChange={(val) => setEditedVoucher(p => ({ ...p, beneficiary_id: val }))}
                                                    disabled={true}
                                                >
                                                    <SelectTrigger disabled={true}>
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
                                        <div ref={voucherDetailsRef} className="w-full space-y-6 relative z-20">
                                            <div ref={voucherDetailsPDFRef} className="w-full space-y-6">


                                                {/* Voucher Details Card */}
                                                <Card className="w-full glass-pane border-none shadow-none bg-gray-800 text-white">
                                                    <CardHeader className="p-4 sm:p-6">
                                                        <CardTitle className="text-lg sm:text-xl">{beneficiaryName}</CardTitle>
                                                        <CardDescription className="text-xs sm:text-sm flex items-center gap-2">
                                                            <span>Created on {new Date(voucherDetails.created_date).toLocaleDateString()}</span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(voucherDetails.status)}`}>
                                                                {formatStatus(voucherDetails.status)}
                                                            </span>
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="space-y-2 relative z-20 p-4 sm:p-6 pt-0">

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
                                                        {(voucherDetails.voucher_type === 'debit' && voucherDetails.payment_type !== 'cash') && (
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
                                                                            const fromBranch = source.from_bank_branch;
                                                                            const fromIfsc = source.from_bank_ifsc;
                                                                            const fromCode = source.from_bank_code;
                                                                            const fromAccountType = source.from_bank_account_type;
                                                                            const fromCountry = source.from_bank_country;
                                                                            const fromCurrency = source.from_bank_currency;
                                                                            const fromSwiftCode = source.from_bank_swift_code;
                                                                            const fromBban = source.from_bank_bban;
                                                                            const fromIban = source.from_bank_iban;
                                                                            const fromIdCode = source.from_bank_id_code;
                                                                            const fromIdType = source.from_bank_id_type;
                                                                            const fromLegalName = source.from_bank_legal_name;
                                                                            const fromOrganizationId = source.from_bank_organization_id;
                                                                            const fromPhone = source.from_bank_phone;
                                                                            const fromPostalCode = source.from_bank_postal_code;
                                                                            const fromState = source.from_bank_state;
                                                                            const fromWebsite = source.from_bank_website;
                                                                            const fromAddressLine1 = source.from_bank_address_line1;
                                                                            const fromAddressLine2 = source.from_bank_address_line2;
                                                                            const fromCity = source.from_bank_city;

                                                                            // Priority 1: Use snapshot data first (most reliable, always available after save)
                                                                            if (fromName && fromName.trim()) {
                                                                                return `${fromName}${fromNumber ? ' - ' + fromNumber : ''}`.trim();
                                                                            }

                                                                            // Priority 2: Try to find in fetched bank accounts array (if loaded)
                                                                            if (fromId && fromId !== '0' && fromBankAccounts?.length > 0) {
                                                                                const fromBank = fromBankAccounts.find(
                                                                                    acc => String(acc.id) === String(fromId)
                                                                                );
                                                                                if (fromBank) {
                                                                                    return `${fromBank.bank_name} - ${fromBank.account_number}`;
                                                                                }
                                                                            }

                                                                            // Priority 3: Show ID if available
                                                                            if (fromId && fromId !== '0') {
                                                                                return String(fromId);
                                                                            }

                                                                            return '-';
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
                                                                            if (toId && toId !== '0' && toBankAccounts?.length > 0) {
                                                                                const toBank = toBankAccounts.find(
                                                                                    acc => String(acc.id) === String(toId)
                                                                                );
                                                                                if (toBank) {
                                                                                    return `${toBank.bank_name} - ${toBank.account_number}`;
                                                                                }
                                                                            }

                                                                            // Priority 3: Show ID if available
                                                                            if (toId && toId !== '0') {
                                                                                return String(toId);
                                                                            }

                                                                            return '-';
                                                                        })()
                                                                    }
                                                                />
                                                            </>
                                                        )}
                                                        <div className="pt-4">
                                                            <p className="text-sm text-gray-400 mb-1">Remarks</p>
                                                            <p className="text-sm text-white p-3 bg-white/5 rounded-md">{voucherDetails.remarks && voucherDetails.remarks.trim() ? voucherDetails.remarks : 'N/A'}</p>
                                                        </div>
                                                        {voucherDetails.status_remarks && (voucherDetails.status === 'rejected_by_master_admin' || voucherDetails.status === 'rejected_by_ca' || voucherDetails.status === 'rejected_by_admin' || voucherDetails.status === 'rejected') && (
                                                            <div className="pt-3">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <AlertCircle className="h-4 w-4 text-red-400" />
                                                                    <p className="text-sm text-red-300 font-medium">
                                                                        {voucherDetails.status === 'rejected_by_ca' ? 'Rejected Remarks' : 'Rejected Remarks'}
                                                                    </p>
                                                                </div>
                                                                <p className="text-sm text-white p-3 bg-red-500/10 border border-red-500/30 rounded-md">{voucherDetails.status_remarks}</p>
                                                                {user?.role === 'CLIENT_MASTER_ADMIN' && (voucherDetails.status === 'rejected_by_ca' || voucherDetails.status === 'rejected') && (
                                                                    <p className="text-xs text-gray-400 mt-1">Click Edit to make changes and resubmit to CA for review.</p>
                                                                )}
                                                            </div>
                                                        )}

                                                    </CardContent>

                                                    <div className="flex items-center gap-3 pb-4 mb-20 sm:mb-16 md:mb-4 justify-center relative z-[100] px-4 sm:px-6 action-buttons-container">
                                                        {/* Action buttons on right */}
                                                        <div className="flex items-center gap-3 relative z-[100]">
                                                            <TooltipProvider>
                                                                {!isReadOnly && !hideClientActions && !(user?.role === 'CLIENT_MASTER_ADMIN' && voucher?.status === 'verified') && !voucherDetails.is_deleted && voucherDetails.status !== 'deleted' && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="destructive"
                                                                                size="icon"
                                                                                onClick={() => setShowDeleteDialog(true)}
                                                                                className="h-9 w-9 sm:h-10 sm:w-10"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Delete</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                                {!isReadOnly && !hideClientActions && !(user?.role === 'CLIENT_MASTER_ADMIN' && voucher?.status === 'verified') && !voucherDetails.is_deleted && voucherDetails.status !== 'deleted' && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="icon"
                                                                                onClick={() => setIsEditing(!isEditing)}
                                                                                className="h-9 w-9 sm:h-10 sm:w-10"
                                                                            >
                                                                                <Edit className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Edit</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            onClick={handleServerPDFExport}
                                                                            disabled={
                                                                                isExportingPDF ||
                                                                                (voucher?.payment_type === 'bank_transfer' &&
                                                                                    (!fromBankAccounts.length || !toBankAccounts.length))
                                                                            }
                                                                            className="h-9 w-9 sm:h-10 sm:w-10"
                                                                        >
                                                                            {isExportingPDF ? (
                                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                            ) : (
                                                                                <FileText className="h-4 w-4" />
                                                                            )}
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Export</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>

                                                            {/* CA/Team Actions */}
                                                            {!isClientUser && user?.role !== 'CLIENT_MASTER_ADMIN' && !voucherDetails.is_deleted && voucherDetails.status !== 'deleted' && (
                                                                <>
                                                                    {voucherDetails.status !== 'approved' && (
                                                                        <Button onClick={() => handleStatusUpdate('approved')} disabled={isStatusUpdating} variant="approve" className="h-9 sm:h-10" size="sm">
                                                                            {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />} Approve
                                                                        </Button>
                                                                    )}
                                                                    {voucherDetails.status !== 'rejected' && (
                                                                        <Button onClick={() => setShowRejectDialog(true)} disabled={isStatusUpdating} variant="reject" className="h-9 sm:h-10" size="sm">
                                                                            {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />} Reject
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            )}
                                                            {/* Client Admin Actions for Pending Vouchers Only */}
                                                            {user?.role === 'CLIENT_MASTER_ADMIN' && (voucherDetails.status === 'pending_master_admin_approval' || voucherDetails.status === 'pending_approval') && !voucherDetails.is_deleted && voucherDetails.status !== 'deleted' && (
                                                                <>
                                                                    <Button onClick={() => handleStatusUpdate('pending_ca_approval')} disabled={isStatusUpdating} variant="approve" className="h-9 sm:h-10" size="sm">
                                                                        {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />} Approve
                                                                    </Button>
                                                                    <Button onClick={() => setShowRejectDialog(true)} disabled={isStatusUpdating} variant="reject" className="h-9 sm:h-10" size="sm">
                                                                        {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />} Reject
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>


                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="activity" className="mt-4">
                                    <div className="p-2 sm:p-4" ref={activityLogRef}>
                                        <ActivityLog itemId={voucherDetails.voucher_id || voucherId} itemType="voucher" showFilter={false} />
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
                                                <CardHeader className="p-4 sm:p-6">
                                                    <CardTitle className="text-lg sm:text-xl">Beneficiary Details</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 p-4 sm:p-6 pt-0">
                                                    <DetailItem label="Name" value={beneficiaryObj?.name || beneficiaryName} />
                                                    <DetailItem label="PAN" value={beneficiaryObj?.pan || 'N/A'} />
                                                    <DetailItem label="Email" value={beneficiaryObj?.email || 'N/A'} />
                                                    <DetailItem label="Phone" value={beneficiaryObj?.phone || 'N/A'} />
                                                </CardContent>
                                            </Card>
                                        );
                                    })()}
                                </TabsContent>
                                {!isClientUser && (
                                    <TabsContent value="preview" className="mt-4">
                                        <div className="overflow-auto hide-scrollbar" style={{ maxHeight: '80vh' }}>
                                            <VoucherPDF
                                                voucher={voucher}
                                                organizationName={organizationName}
                                                entityName={entityName}
                                                fromBankAccounts={fromBankAccounts}
                                                toBankAccounts={toBankAccounts}
                                            />
                                        </div>
                                    </TabsContent>
                                )}
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
                    {allAttachmentIds.length > 1 && attachmentUrl && (
                        <>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleAttachmentNavigate(-1)}
                                disabled={currentAttachmentIndex === 0}
                                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleAttachmentNavigate(1)}
                                disabled={currentAttachmentIndex === allAttachmentIds.length - 1}
                                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </>
                    )}
                    {/* Zoom controls in bottom right corner */}
                    {attachmentUrl && !(attachmentContentType?.toLowerCase().includes('pdf') || attachmentUrl.toLowerCase().endsWith('.pdf')) && (
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
                        {allAttachmentIds.length > 0 && !attachmentUrl ? (
                            <Skeleton className="h-full w-full rounded-md" />
                        ) : attachmentUrl ? (
                            (attachmentContentType?.toLowerCase().includes('pdf') || attachmentUrl.toLowerCase().endsWith('.pdf')) ? (
                                <iframe
                                    src={attachmentUrl}
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
                                        setIsImageLoading(false);
                                    }}
                                    onError={(e) => {
                                        console.error("Image failed to load:", e, "URL:", attachmentUrl);
                                        setIsImageLoading(false);
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

                {/* Details Section */}
                <div className="flex-1 overflow-y-auto border border-white/10 rounded-lg p-4 hide-scrollbar" style={{ paddingBottom: hasVouchers ? '6rem' : '2rem' }}>
                    <Tabs defaultValue={defaultTab} className="w-full">
                        <TabsList className={`grid w-full ${cols} text-xs sm:text-sm`}>
                            {!isClientUser && (
                                <TabsTrigger value="preview" className="text-xs sm:text-sm">Preview</TabsTrigger>
                            )}
                            <TabsTrigger value="details" className="text-xs sm:text-sm">Details</TabsTrigger>
                            <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity</TabsTrigger>
                            <TabsTrigger value="beneficiary" className="text-xs sm:text-sm">Beneficiary</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="mt-4">


                            {isEditing ? (
                                <form onSubmit={handleUpdate} className="space-y-4">
                                    <div>
                                        <Label htmlFor="voucher_type" className="text-sm">Voucher Type</Label>
                                        <Select
                                            value={editedVoucher?.voucher_type || ''}
                                            onValueChange={(val) => setEditedVoucher(p => ({ ...p, voucher_type: val }))}
                                            disabled={true}
                                        >
                                            <SelectTrigger className="text-sm" disabled={true}>
                                                <SelectValue placeholder="Select a voucher type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="debit">Debit</SelectItem>
                                                <SelectItem value="cash">Cash</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="beneficiary_id" className="text-sm">Beneficiary</Label>
                                        <Select
                                            value={editedVoucher?.beneficiary_id ? String(editedVoucher.beneficiary_id) : ''}
                                            onValueChange={(val) => setEditedVoucher(p => ({ ...p, beneficiary_id: val }))}
                                            disabled={true}
                                        >
                                            <SelectTrigger className="text-sm" disabled={true}>
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
                                        <Label htmlFor="amount" className="text-sm">Amount</Label>
                                        <Input
                                            name="amount"
                                            type="number"
                                            step="0.01"
                                            defaultValue={editedVoucher.amount}
                                            onChange={(e) => setEditedVoucher(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                                            className="text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="payment_type" className="text-sm">Payment Method</Label>
                                        {editedVoucher?.voucher_type === 'cash' ? (
                                            <Input value="Cash" disabled className="text-sm" />
                                        ) : (
                                            <Select
                                                value={(editedVoucher?.payment_type ?? '').toLowerCase()}
                                                onValueChange={(val) => setEditedVoucher(p => ({ ...p, payment_type: val }))}
                                            >
                                                <SelectTrigger className="text-sm"><SelectValue placeholder="Select a payment method" /></SelectTrigger>
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
                                                <SelectTrigger className="text-sm"><SelectValue placeholder="Select your bank account" /></SelectTrigger>
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
                                                <SelectTrigger className="text-sm"><SelectValue placeholder="Select beneficiary's bank account" /></SelectTrigger>
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
                                        <Label htmlFor="remarks" className="text-sm">Remarks</Label>
                                        <Input name="remarks" defaultValue={editedVoucher.remarks || ''} className="text-sm" />
                                    </div>
                                    {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                        <div>
                                            <Label htmlFor="finance_header_id" className="text-sm">Header</Label>
                                            <Select name="finance_header_id" defaultValue={editedVoucher.finance_header_id}>
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
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-sm" disabled={isSaving}>Cancel</Button>
                                        <Button type="submit" className="text-sm" disabled={isSaving}>
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
                                <div className="w-full space-y-4">

                                    {/* Voucher Details Card */}
                                    <Card className="w-full glass-pane border-none shadow-none text-white">
                                        <CardHeader className="p-4">
                                            <CardTitle className="text-lg">{beneficiaryName}</CardTitle>
                                            <CardDescription className="text-xs flex items-center gap-2">
                                                <span>Created on {new Date(voucherDetails.created_date).toLocaleDateString()}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(voucherDetails.status)}`}>
                                                    {formatStatus(voucherDetails.status)}
                                                </span>
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2 p-4 pt-0">

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
                                                                const source = voucher || voucherDetails;
                                                                const fromId = source.from_bank_account_id;
                                                                const fromName = source.from_bank_account_name;
                                                                const fromNumber = source.from_bank_account_number;

                                                                if (fromName && fromName.trim()) {
                                                                    return `${fromName}${fromNumber ? ' - ' + fromNumber : ''}`.trim();
                                                                }

                                                                if (fromId && fromBankAccounts?.length > 0) {
                                                                    const fromBank = fromBankAccounts.find(
                                                                        acc => String(acc.id) === String(fromId)
                                                                    );
                                                                    if (fromBank) {
                                                                        return `${fromBank.bank_name} - ${fromBank.account_number}`;
                                                                    }
                                                                }

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
                                                                const source = voucher || voucherDetails;
                                                                const toId = source.to_bank_account_id;
                                                                const toName = source.to_bank_account_name;
                                                                const toNumber = source.to_bank_account_number;

                                                                if (toName && toName.trim()) {
                                                                    return `${toName}${toNumber ? ' - ' + toNumber : ''}`.trim();
                                                                }

                                                                if (toId && toBankAccounts?.length > 0) {
                                                                    const toBank = toBankAccounts.find(
                                                                        acc => String(acc.id) === String(toId)
                                                                    );
                                                                    if (toBank) {
                                                                        return `${toBank.bank_name} - ${toBank.account_number}`;
                                                                    }
                                                                }

                                                                if (toId) {
                                                                    return String(toId);
                                                                }

                                                                return 'N/A';
                                                            })()
                                                        }
                                                    />
                                                </>
                                            )}
                                            {voucherDetails.status_remarks && (voucherDetails.status === 'rejected_by_master_admin' || voucherDetails.status === 'rejected_by_ca' || voucherDetails.status === 'rejected_by_admin' || voucherDetails.status === 'rejected') && (
                                                <div className="pt-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <AlertCircle className="h-3 w-3 text-red-400" />
                                                        <p className="text-xs text-red-300 font-medium">
                                                            {voucherDetails.status === 'rejected_by_ca' ? 'Rejected Remarks' : 'Rejected Remarks'}
                                                        </p>
                                                    </div>
                                                    <p className="text-xs text-white p-3 bg-red-500/10 border border-red-500/30 rounded-md">{voucherDetails.status_remarks}</p>
                                                    {user?.role === 'CLIENT_MASTER_ADMIN' && (voucherDetails.status === 'rejected_by_ca' || voucherDetails.status === 'rejected') && (
                                                        <p className="text-xs text-gray-400 mt-1">Click Edit to make changes and resubmit to CA for review.</p>
                                                    )}
                                                </div>
                                            )}
                                            <div className="pt-4">
                                                <p className="text-xs text-gray-400 mb-1">Remarks</p>
                                                <p className="text-xs text-white p-3 bg-white/5 rounded-md">{voucherDetails.remarks && voucherDetails.remarks.trim() ? voucherDetails.remarks : 'N/A'}</p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Action buttons */}
                                    <div className="flex items-center justify-between gap-3 w-full">
                                        {/* Left Side: Icon Actions (Delete, Edit, Export) */}
                                        <div className="flex items-center gap-2">
                                            <TooltipProvider>
                                                {!isReadOnly && !hideClientActions && !voucherDetails.is_deleted && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                                                                className="h-9 w-9"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Delete</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {!isReadOnly && !hideClientActions && !voucherDetails.is_deleted && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
                                                                className="h-9 w-9"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Edit</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={(e) => { e.stopPropagation(); handleExportToPDF(); }}
                                                            disabled={
                                                                voucher?.payment_type === 'bank_transfer' &&
                                                                (!fromBankAccounts.length || !toBankAccounts.length)
                                                            }
                                                            className="h-9 w-9"
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Export</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>

                                        {/* Right Side: Primary Actions (Approve/Reject) */}
                                        <div className="flex items-center gap-2">
                                            {/* CA/Team Actions */}
                                            {!isClientUser && user?.role !== 'CLIENT_MASTER_ADMIN' && (
                                                <>
                                                    {voucherDetails.status !== 'approved' && (
                                                        <Button onClick={() => handleStatusUpdate('approved')} disabled={isStatusUpdating} className="bg-green-600 hover:bg-green-700 text-white border-none h-9 w-9" size="icon">
                                                            {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                        </Button>
                                                    )}
                                                    {voucherDetails.status !== 'rejected' && (
                                                        <Button onClick={() => setShowRejectDialog(true)} disabled={isStatusUpdating} className="bg-red-600 hover:bg-red-700 text-white border-none h-9 w-9" size="icon">
                                                            {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                            {/* Client Admin Actions for Pending Vouchers Only */}
                                            {user?.role === 'CLIENT_MASTER_ADMIN' && (voucherDetails.status === 'pending_master_admin_approval' || voucherDetails.status === 'pending_approval') && (
                                                <>
                                                    <Button onClick={() => handleStatusUpdate('pending_ca_approval')} disabled={isStatusUpdating} className="bg-green-600 hover:bg-green-700 text-white border-none h-9 px-3 gap-1">
                                                        {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                        <span>Approve</span>
                                                    </Button>
                                                    <Button onClick={() => setShowRejectDialog(true)} disabled={isStatusUpdating} className="bg-red-600 hover:bg-red-700 text-white border-none h-9 px-3 gap-1">
                                                        {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                        <span>Reject</span>
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>


                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="activity" className="mt-4">
                            <div className="p-2 sm:p-4" ref={activityLogRef}>
                                <ActivityLog itemId={voucherDetails.voucher_id || voucherId} itemType="voucher" showFilter={false} />
                            </div>
                        </TabsContent>
                        <TabsContent value="beneficiary" className="mt-4">
                            {(() => {
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
                                    <Card className="w-full glass-pane border-none shadow-none text-white">
                                        <CardHeader className="p-4">
                                            <CardTitle className="text-lg sm:text-xl">Beneficiary Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 p-4 pt-0">
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
                </div >
            </div >

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
                <DialogContent className="bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            This action cannot be undone. This will permanently delete the voucher.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting} className="text-white hover:bg-white/10">
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
                <DialogContent className="bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Reject Voucher</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Please provide remarks for rejecting this voucher. These remarks will be visible to the client.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="status_remarks" className="mb-2 block">Rejection Remarks</Label>
                        <Textarea
                            id="status_remarks"
                            value={rejectionRemarks}
                            onChange={(e) => setRejectionRemarks(e.target.value)}
                            placeholder="Enter reason for rejection..."
                            className="bg-black/20 border-white/10 text-white min-h-[100px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)} className="bg-transparent border-white/10 text-white hover:bg-white/10 hover:text-white">Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleStatusUpdate(
                                user?.role === 'CLIENT_MASTER_ADMIN' ? 'rejected_by_master_admin' : 'rejected_by_ca',
                                rejectionRemarks
                            )}
                            disabled={isStatusUpdating || !rejectionRemarks.trim()}
                        >
                            {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                            Reject Voucher
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
                                                const entityId = voucher?.entity_id || localStorage.getItem('entityId');
                                                if (entityId) {
                                                    const invoices = await getInvoices(entityId, user.access_token);
                                                    const pendingInvoices = invoices.filter(inv => inv.status === 'pending_master_admin_approval');

                                                    if (pendingInvoices.length > 0) {
                                                        pendingInvoices.sort((a, b) => new Date(b.created_date || b.date) - new Date(a.created_date || a.date));
                                                        const nextInvoice = pendingInvoices[0];
                                                        navigate(location.pathname.includes('/finance/invoices') ? `/finance/invoices/${nextInvoice.id}` : `/invoices/${nextInvoice.id}`, {
                                                            state: {
                                                                invoice: nextInvoice,
                                                                invoices: pendingInvoices,
                                                                organizationName,
                                                                entityName
                                                            },
                                                            replace: true
                                                        });
                                                    } else {
                                                        navigate('/finance/invoices');
                                                    }
                                                } else {
                                                    navigate('/finance/invoices');
                                                }
                                            } catch (e) {
                                                navigate('/finance/invoices');
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

            <PdfPreviewModal
                isOpen={isPdfPreviewOpen}
                onClose={() => {
                    setIsPdfPreviewOpen(false);
                    if (pdfPreviewUrl) {
                        window.URL.revokeObjectURL(pdfPreviewUrl);
                        setPdfPreviewUrl(null);
                    }
                }}
                pdfUrl={pdfPreviewUrl}
                title="Voucher Preview"
                fileName={`voucher-${voucherDetails?.voucher_id || voucherId}.pdf`}
            />

        </div >
    );
};

export default VoucherDetailsPage;