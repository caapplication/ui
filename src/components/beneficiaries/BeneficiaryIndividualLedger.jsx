import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import {
    getBeneficiary,
    getInvoices,
    getVouchersList,
    getFinanceHeaders,
} from '@/lib/api';
import {
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Loader2,
    Calendar,
    Clock,
    Hash,
    MessageSquare,
    Tag,
    CheckCircle2,
    Clock3,
    AlertCircle
} from 'lucide-react';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { format } from 'date-fns';

const formatDate = (dateString) => {
    if (!dateString) return { date: 'Invalid Date', time: '-' };
    const localDate = new Date(dateString);
    if (isNaN(localDate.getTime())) return { date: 'Invalid Date', time: '-' };

    // Standard timezone adjustment used across the app
    const utcDate = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));

    return {
        date: utcDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
        time: utcDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }),
    };
};

const StatusBadge = ({ status }) => {
    if (!status) return (
        <div className="inline-flex items-center justify-center text-center px-3 py-1 rounded-full text-xs font-medium border h-auto min-h-[1.5rem] whitespace-normal leading-tight bg-gray-500/20 text-gray-400 border-gray-500/50">
            Unknown
        </div>
    );

    const statusMap = {
        verified: 'Verified',
        pending_ca_approval: 'Pending Audit',
        rejected_by_ca: 'Rejected',
        rejected_by_master_admin: 'Rejected',
        pending_master_admin_approval: 'Pending Approval'
    };

    const getStatusColor = (s) => {
        switch (s) {
            case 'verified':
                return 'bg-green-500/20 text-green-400 border-green-500/50';
            case 'rejected_by_ca':
            case 'rejected_by_master_admin':
                return 'bg-red-500/20 text-red-400 border-red-500/50';
            case 'pending_ca_approval':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
            case 'pending_master_admin_approval':
                return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    const displayText = statusMap[status.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1);

    return (
        <div className={`inline-flex items-center justify-center text-center px-3 py-1 rounded-full text-xs font-medium border h-auto min-h-[1.5rem] whitespace-normal leading-tight ${getStatusColor(status.toLowerCase())}`}>
            {displayText}
        </div>
    );
};

const BeneficiaryIndividualLedger = ({ entityId }) => {
    const { beneficiaryId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const organizationId = useCurrentOrganization(entityId);

    const [isLoading, setIsLoading] = useState(true);
    const [beneficiary, setBeneficiary] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const fetchData = useCallback(async () => {
        if (!user?.access_token || !organizationId || !entityId || !beneficiaryId) return;
        setIsLoading(true);
        try {
            const agencyId = user.agency_id || localStorage.getItem('agency_id');
            const [beneficiaryData, invoicesData, vouchersData, headersData] = await Promise.all([
                getBeneficiary(beneficiaryId, organizationId, user.access_token),
                getInvoices(entityId, user.access_token),
                getVouchersList(entityId, user.access_token),
                getFinanceHeaders(agencyId || 'null', user.access_token)
            ]);

            setBeneficiary(beneficiaryData);

            // Create a mapping for finance headers
            const headerMap = {};
            if (Array.isArray(headersData)) {
                headersData.forEach(h => {
                    if (h.id) {
                        headerMap[String(h.id)] = h.name;
                    }
                });
            }

            const filterByBeneficiary = (item, targetId) => {
                if (!item) return false;
                const itemBId = item.beneficiary?.id || item.beneficiary_id || (typeof item.beneficiary === 'string' ? item.beneficiary : null);
                return itemBId && String(itemBId) === String(targetId);
            };

            const bInvoices = (Array.isArray(invoicesData) ? invoicesData : [])
                .filter(inv => filterByBeneficiary(inv, beneficiaryId))
                .map(inv => {
                    const totalAmount = parseFloat(inv.total_amount || 0) || (
                        parseFloat(inv.amount || 0) +
                        parseFloat(inv.cgst || 0) +
                        parseFloat(inv.sgst || 0) +
                        parseFloat(inv.igst || 0)
                    );

                    return {
                        id: inv.id,
                        date: inv.created_at || inv.invoice_date,
                        type: 'Invoice',
                        rawType: 'Invoice',
                        ref: inv.bill_number || inv.invoice_number || inv.id?.slice(0, 8),
                        invoiceAmount: totalAmount,
                        paymentAmount: 0,
                        remark: inv.remarks || '-',
                        head: (inv.finance_header_id ? headerMap[String(inv.finance_header_id)] : null) || inv.finance_header_name || inv.category || '-',
                        status: inv.status || 'Verified'
                    };
                });

            const bVouchers = (Array.isArray(vouchersData) ? vouchersData : [])
                .filter(v => filterByBeneficiary(v, beneficiaryId))
                .map(v => ({
                    id: v.id,
                    date: v.created_date || v.timestamp || v.voucher_date || v.created_at,
                    type: v.voucher_type === 'cash' ? 'Cash Voucher' : 'Debit Voucher',
                    rawType: v.voucher_type, // 'cash' or 'debit'
                    ref: v.voucher_id || v.voucher_number || v.id?.slice(0, 8),
                    invoiceAmount: 0,
                    paymentAmount: parseFloat(v.amount || 0),
                    remark: v.remarks || '-',
                    head: (v.finance_header_id ? headerMap[String(v.finance_header_id)] : null) || v.finance_header_name || v.category || '-',
                    status: v.status || 'Pending Approval'
                }));

            const merged = [...bInvoices, ...bVouchers].sort((a, b) => {
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                return dateB.getTime() - dateA.getTime();
            });

            setTransactions(merged);
        } catch (error) {
            console.error("Error fetching individual ledger data:", error);
            toast({
                title: "Error",
                description: "Failed to load beneficiary ledger.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [user, organizationId, entityId, beneficiaryId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const paginatedData = transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const totalPages = Math.ceil(transactions.length / pageSize);

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    const beneficiaryName = beneficiary?.name || beneficiary?.company_name || 'Beneficiary';

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="h-10 w-10 rounded-full hover:bg-white/10"
                >
                    <ArrowLeft className="h-6 w-6 text-white" />
                </Button>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        Ledger - {beneficiaryName}
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Detailed transaction history</p>
                </div>
            </div>

            {/* Table Section */}
            <Card className="glass-card overflow-hidden border-white/5 rounded-3xl">
                <CardContent className="p-0">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="border-b border-white/5 text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider bg-white/5">
                                    <td className="py-4 pl-6 w-16">Sr No</td>
                                    <td className="py-4 px-4 w-40">Date</td>
                                    <td className="py-4 px-4 w-48">Type</td>
                                    <td className="py-4 px-4">Invoice</td>
                                    <td className="py-4 px-4">Payment</td>
                                    <td className="py-4 px-4">Remark</td>
                                    <td className="py-4 px-4">Finance Head</td>
                                    <td className="py-4 pr-6 text-right">Status</td>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {paginatedData.length > 0 ? (
                                    paginatedData.map((tx, idx) => (
                                        <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            <td className="py-4 pl-6 text-gray-500 font-mono">
                                                {String((currentPage - 1) * pageSize + idx + 1).padStart(2, "0")}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col">
                                                    {(() => {
                                                        const { date, time } = formatDate(tx.date);
                                                        return (
                                                            <>
                                                                <span className="text-white font-medium">
                                                                    {date}
                                                                </span>
                                                                <span className="text-gray-500 text-[10px] italic mt-0.5">
                                                                    {time}
                                                                </span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${tx.rawType === 'Invoice'
                                                        ? 'bg-blue-500/20 text-blue-300'
                                                        : tx.rawType === 'cash'
                                                            ? 'bg-green-500/20 text-green-300'
                                                            : 'bg-pink-500/20 text-pink-300'
                                                        }`}>
                                                        {tx.type}
                                                    </span>
                                                    <span className="text-gray-300 text-xs font-mono font-medium">{tx.ref}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-white font-bold">
                                                {tx.invoiceAmount > 0 ? `₹${tx.invoiceAmount.toLocaleString('en-IN')}` : '-'}
                                            </td>
                                            <td className="py-4 px-4 text-red-400 font-bold">
                                                {tx.paymentAmount > 0 ? `₹${tx.paymentAmount.toLocaleString('en-IN')}` : '-'}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="max-w-[200px]">
                                                    <span className="text-gray-400 text-xs line-clamp-2">{tx.remark}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center">
                                                    <span className="text-gray-400 text-xs truncate">{tx.head}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-6 text-right">
                                                <StatusBadge status={tx.status} />
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="py-20 text-center text-gray-500">
                                            No records found for this beneficiary.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 sm:p-6 border-t border-white/5 flex justify-between items-center bg-white/5">
                        <p className="text-xs text-gray-400">
                            Showing {paginatedData.length} of {transactions.length} records
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-white/10 bg-transparent hover:bg-white/10 text-white"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                                <span className="text-xs font-bold text-white">{currentPage}</span>
                                <span className="text-[10px] text-gray-500">/</span>
                                <span className="text-[10px] text-gray-500 font-medium">{totalPages}</span>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-white/10 bg-transparent hover:bg-white/10 text-white"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default BeneficiaryIndividualLedger;
