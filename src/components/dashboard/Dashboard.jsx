import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Users,
    FileText,
    Banknote,
    Landmark,
    Loader2,
    MoreVertical,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Eye,
    TrendingUp,
    CreditCard,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "@/hooks/useMediaQuery.jsx";
import { useAuth } from "@/hooks/useAuth.jsx";
import { useToast } from "@/components/ui/use-toast.js";
import { getDashboardData, getVouchersList, getInvoicesList, listTasks, getNotices, getTaskDashboardAnalytics, getNoticeDashboardAnalytics, getInvoiceAnalytics, getVoucherAnalytics } from "@/lib/api.js";
import { getFundInHand, listHandovers, handoversSummary, listPaymentMethods } from "@/lib/api/settings.js";
import { format, parseISO } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LabelList,
    ReferenceLine,
    Legend,
} from "recharts";

const StatCard = ({
    title,
    value,
    description,
    icon,
    color,
    delay,
    showMenu,
    menuItems,
    onMenuSelect,
    trend,
    meta,
    hideValue,
}) => {
    const Icon = icon;


    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            <Card className="glass-card card-hover overflow-hidden h-[160px] sm:h-[240px] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-4">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-300">
                        {title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {showMenu && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreVertical className="h-4 w-4 text-gray-400" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {menuItems?.map((item) => (
                                        <DropdownMenuItem
                                            key={item.value}
                                            onClick={() => onMenuSelect(item.value)}
                                            className={item.selected ? "bg-primary/20" : ""}
                                        >
                                            {item.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <div
                            className={`w-7 h-7 sm:w-9 sm:h-9 bg-gradient-to-r ${color} rounded-lg flex items-center justify-center shadow-lg shadow-black/20 flex-shrink-0`}
                        >
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 overflow-hidden flex-1">
                    {!hideValue && (
                        <div className="flex items-center gap-3 mb-1">
                            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                                {value}
                            </div>

                            {trend && (
                                <div className={`${trend.isBad ? 'text-red-500' : 'text-green-500'}`}>
                                    {trend.isUp ? (
                                        <ArrowUpRight className="w-6 h-6" />
                                    ) : (
                                        <ArrowDownRight className="w-6 h-6" />
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {description && (
                        <p className={`text-xs mt-1 ${trend ? (trend.isBad ? 'text-red-500' : 'text-green-500') : 'text-gray-400'}`}>
                            {description}
                        </p>
                    )}

                    {meta && (
                        <div
                            className={`${hideValue ? "mt-1" : "mt-2 pt-2 border-t border-white/10"
                                } space-y-1 text-sm text-gray-400`}
                        >
                            <div className="flex justify-between items-center">
                                <span>Created by me</span>
                                <span className="text-white font-medium">
                                    {meta.createdByMe}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span>Last year</span>
                                <span className="text-white font-medium">{meta.lastYear}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span>Collaboration</span>
                                <span className="text-white font-medium">
                                    {meta.collaboration}
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

const TransactionItem = ({ transaction, remarks, onClick, index, name }) => {

    const amount = Math.round(parseFloat(transaction.amount));
    return (
        <div
            onClick={onClick}
            className="grid grid-cols-12 items-center text-sm py-2 hover:bg-white/10 transition-all rounded px-1 cursor-pointer group"
        >
            <div className="col-span-2 text-gray-400 font-mono">
                {String(index + 1).padStart(2, "0")}
            </div>
            <div className="col-span-6 text-white truncate pr-2 group-hover:scale-[1.02] transition-transform origin-left">
                {name || transaction.beneficiary?.name}
                <div className="text-gray-400 text-xs sm:text-sm italic truncate">
                    {remarks}
                </div>
                <div className="text-gray-400 text-xs sm:text-sm italic">
                    {new Date(transaction.created_date).toLocaleDateString()}
                </div>
            </div>
            <div className="col-span-4 text-right text-red-400 font-medium">
                ₹{amount}
                <div className={`text-xs font-normal mt-1 capitalize text-red-400`}>
                    {transaction.voucher_type}
                </div>
            </div>
        </div>
    );
};

const formatINR = (num) => `₹ ${(Number(num) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDateDDMMYYYY = (iso) => {
    if (!iso) return "—";
    try { return format(parseISO(iso), "dd-MM-yyyy"); } catch { return iso; }
};

const Dashboard = ({
    entityId,
    entityName,
    onQuickAction,
    organisationBankAccounts,
}) => {
    const [dashboardData, setDashboardData] = useState(null);
    const [recentDashboardData, setRecentDashboardData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [vouchers, setVouchers] = useState([]);
    // Expiring docs moved to Documents section Renewals tab
    const [expensePeriod, setExpensePeriod] = useState("30days");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [fundInHand, setFundInHand] = useState(null);
    const [fundInHandLoading, setFundInHandLoading] = useState(false);
    const [fundSlide, setFundSlide] = useState(0);
    const [trendSlide, setTrendSlide] = useState(0);
    const [handoverCard, setHandoverCard] = useState(null);
    const [handoverCardLoading, setHandoverCardLoading] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [notices, setNotices] = useState([]);
    const [apiTrends, setApiTrends] = useState({ tasks: [], notices: [], invoices: [], vouchers: [] });

    const isMobile = useMediaQuery("(max-width: 640px)");
    const isHourlyView = expensePeriod === "today" || expensePeriod === "yesterday";
    const isMonthlyView = expensePeriod === "3months" || (expensePeriod === "custom" && customFrom && customTo && (new Date(customTo) - new Date(customFrom) > 60 * 24 * 60 * 60 * 1000));
    // IST bounds for custom date picker (last 365 days only)
    const _istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const istTodayStr = _istNow.toISOString().split("T")[0];
    const _istMin = new Date(_istNow); _istMin.setDate(_istMin.getDate() - 365);
    const istMinDateStr = _istMin.toISOString().split("T")[0];
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const isClientAdmin = user?.role === "CLIENT_MASTER_ADMIN" || user?.role === "CLIENT_USER";

    const fabItems = [
        { label: "Beneficiaries", icon: Users, path: "/beneficiaries", state: { quickAction: 'add-beneficiary', returnToDashboard: true } },
        { label: "Tasks", icon: Landmark, path: "/tasks", state: { quickAction: 'add-task', returnToDashboard: true } },
        { label: "Invoices", icon: FileText, path: "/finance/invoices", state: { quickAction: 'add-invoice', returnToDashboard: true } },
        { label: "Vouchers", icon: Banknote, path: "/finance/vouchers", state: { quickAction: 'add-voucher', returnToDashboard: true } },
    ];

    const fetchDashboardData = useCallback(async () => {
        if (!entityId || !user?.access_token) return;
        setIsLoading(true);

        const now = new Date();
        let fromDate = null;
        let toDate = new Date(now);
        switch (expensePeriod) {
            case "custom":
                if (!customFrom || !customTo) { setIsLoading(false); return; }
                fromDate = new Date(customFrom);
                toDate = new Date(customTo + "T23:59:59");
                break;
            case "today":
                fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case "yesterday":
                fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
                break;
            case "7days":
                fromDate = new Date(now); fromDate.setDate(now.getDate() - 7); break;
            case "30days":
                fromDate = new Date(now); fromDate.setDate(now.getDate() - 30); break;
            case "this_month":
                fromDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case "last_month":
                fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
            case "3months":
                fromDate = new Date(now); fromDate.setMonth(now.getMonth() - 3); break;
            default:
                fromDate = new Date(now); fromDate.setDate(now.getDate() - 30);
        }

        const fromDateStr = fromDate ? fromDate.toISOString() : null;
        const toDateStr = toDate ? toDate.toISOString() : null;

        let daysToFetch = 30;
        switch (expensePeriod) {
            case "custom":
                if (customFrom && customTo) {
                    const diffMs = new Date(customTo) - new Date(customFrom);
                    daysToFetch = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
                } else { daysToFetch = 30; }
                break;
            case "today": daysToFetch = 1; break;
            case "yesterday": daysToFetch = 2; break;
            case "7days": daysToFetch = 7; break;
            case "30days": daysToFetch = 30; break;
            case "this_month": daysToFetch = 31; break;
            case "last_month": daysToFetch = 62; break;
            case "3months": daysToFetch = 90; break;
            default: daysToFetch = 30;
        }

        try {
            const [
                dashData,
                recentDashData,
                vouchersData,
                invoicesData,
                tasksData,
                noticesData,
                taskAnalytics,
                noticeAnalytics,
                invoiceAnalytics,
                voucherAnalytics
            ] = await Promise.all([
                getDashboardData(entityId, user.access_token, user.agency_id, fromDateStr, toDateStr),
                getDashboardData(entityId, user.access_token, user.agency_id, null, null),
                getVouchersList(entityId, user.access_token),
                getInvoicesList(entityId, user.access_token),
                listTasks(user.agency_id, user.access_token, { client_id: entityId }),
                getNotices(entityId, user.access_token),
                getTaskDashboardAnalytics(daysToFetch, user.agency_id, user.access_token, entityId).catch(() => ({})),
                getNoticeDashboardAnalytics(daysToFetch, user.agency_id, user.access_token, entityId).catch(() => ({})),
                getInvoiceAnalytics(daysToFetch, user.access_token, entityId).catch(() => ({})),
                getVoucherAnalytics(daysToFetch, user.access_token, entityId).catch(() => ({})),
            ]);

            setDashboardData(dashData);
            setRecentDashboardData(recentDashData);
            setVouchers(Array.isArray(vouchersData) ? vouchersData.filter(v => !v.is_deleted) : []);
            setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
            setTasks(Array.isArray(tasksData?.items) ? tasksData.items : (Array.isArray(tasksData) ? tasksData : []));
            setNotices(Array.isArray(noticesData) ? noticesData : []);

            setApiTrends({
                tasks: taskAnalytics?.activity_trend || [],
                notices: noticeAnalytics?.activity_trend || [],
                invoices: invoiceAnalytics?.activity_trend || [],
                vouchers: voucherAnalytics?.activity_trend || []
            });
        } catch (error) {
            toast({
                title: "Error fetching dashboard data",
                description: error.message,
                variant: "destructive",
            });
            setDashboardData(null);
            setVouchers([]);
        } finally {
            setIsLoading(false);
        }
    }, [entityId, user?.access_token, user?.agency_id, expensePeriod, customFrom, customTo, toast]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const fetchFundInHand = useCallback(async () => {
        if (!isClientAdmin || !entityId || !user?.access_token) return;
        const banks = Array.isArray(organisationBankAccounts) ? organisationBankAccounts.filter((b) => b.is_active !== false) : [];
        const bankIds = banks.map((b) => b.id).join(",");
        setFundInHandLoading(true);
        try {
            const data = await getFundInHand(entityId, bankIds || undefined, user.access_token);
            setFundInHand(data);
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to load Fund In Hand." });
            setFundInHand(null);
        } finally {
            setFundInHandLoading(false);
        }
    }, [isClientAdmin, entityId, user?.access_token, organisationBankAccounts, toast]);

    useEffect(() => {
        fetchFundInHand();
    }, [fetchFundInHand]);

    const fetchHandoverCard = useCallback(async () => {
        if (!isClientAdmin || !entityId || !user?.access_token) return;
        setHandoverCardLoading(true);
        try {
            const list = await listHandovers(entityId, user.access_token);
            const rows = Array.isArray(list) ? list : [];
            if (rows.length === 0) {
                setHandoverCard(null);
                return;
            }
            const lastDateRaw = rows[0].handover_date;
            const lastDate = typeof lastDateRaw === "string" ? lastDateRaw.slice(0, 10) : new Date(lastDateRaw).toISOString().slice(0, 10);
            const [summaryRes, pmList] = await Promise.all([
                handoversSummary(entityId, lastDate, user.access_token),
                listPaymentMethods(entityId, user.access_token),
            ]);
            const items = summaryRes?.items || [];
            let total = 0;
            const breakdown = {};
            items.forEach((item) => {
                total += Number(item.as_per_department) || 0;
                const b = item.as_per_department_breakdown || {};
                Object.entries(b).forEach(([pmId, amt]) => {
                    breakdown[pmId] = (breakdown[pmId] || 0) + Number(amt);
                });
            });
            setHandoverCard({
                lastDate,
                total,
                breakdown,
                paymentMethods: Array.isArray(pmList) ? pmList : [],
            });
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to load handover." });
            setHandoverCard(null);
        } finally {
            setHandoverCardLoading(false);
        }
    }, [isClientAdmin, entityId, user?.access_token, toast]);

    useEffect(() => {
        fetchHandoverCard();
    }, [fetchHandoverCard]);

    const todayStart = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const todayEnd = useMemo(() => {
        const d = new Date();
        d.setHours(23, 59, 59, 999);
        return d;
    }, []);
    const fundOutToday = useMemo(() => {
        if (!vouchers || vouchers.length === 0) return { total: 0, byCash: 0, byBank: 0 };
        let total = 0;
        let byCash = 0;
        let byBank = 0;
        vouchers.forEach((v) => {
            const vDate = new Date(v.created_date || v.created_at);
            if (vDate < todayStart || vDate > todayEnd) return;
            const amt = parseFloat(v.amount) || 0;
            total += amt;
            const type = (v.voucher_type || "").toLowerCase();
            if (type === "cash") byCash += amt;
            else if (type === "debit") byBank += amt;
        });
        return { total, byCash, byBank };
    }, [vouchers, todayStart, todayEnd]);

    // Calculate total expenses and stats based on selected time period
    const calculateExpenseStats = useCallback(() => {
        if (!vouchers || vouchers.length === 0) return { currentTotal: "0.00", percentageChange: 0, isIncrease: false };

        const now = new Date();
        let currentStartDate = null;
        let currentEndDate = new Date(now);
        let previousStartDate = null;
        let previousEndDate = null;

        switch (expensePeriod) {
            case "custom":
                if (!customFrom || !customTo) {
                    currentStartDate = null;
                } else {
                    currentStartDate = new Date(customFrom);
                    currentEndDate = new Date(customTo + "T23:59:59");
                    const diffMs = currentEndDate - currentStartDate;
                    previousEndDate = new Date(currentStartDate.getTime() - 1);
                    previousStartDate = new Date(previousEndDate.getTime() - diffMs);
                }
                break;
            case "today":
                currentStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
                break;
            case "yesterday":
                currentStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                currentEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
                previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
                previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 23, 59, 59, 999);
                break;
            case "7days":
                currentStartDate = new Date(now); currentStartDate.setDate(now.getDate() - 7);
                previousEndDate = new Date(currentStartDate);
                previousStartDate = new Date(now); previousStartDate.setDate(now.getDate() - 14);
                break;
            case "30days":
                currentStartDate = new Date(now); currentStartDate.setDate(now.getDate() - 30);
                previousEndDate = new Date(currentStartDate);
                previousStartDate = new Date(now); previousStartDate.setDate(now.getDate() - 60);
                break;
            case "this_month":
                currentStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
                previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
            case "last_month":
                currentStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                currentEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                previousEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
                break;
            case "3months":
                currentStartDate = new Date(now); currentStartDate.setMonth(now.getMonth() - 3);
                previousEndDate = new Date(currentStartDate);
                previousStartDate = new Date(now); previousStartDate.setMonth(now.getMonth() - 6);
                break;
            default:
                currentStartDate = new Date(now); currentStartDate.setDate(now.getDate() - 30);
        }

        const currentTotal = vouchers.reduce((sum, voucher) => {
            const voucherDate = new Date(voucher.created_date || voucher.created_at);
            const inRange = currentStartDate === null || (voucherDate >= currentStartDate && voucherDate <= currentEndDate);
            return inRange ? sum + (parseFloat(voucher.amount) || 0) : sum;
        }, 0);

        const previousTotal = (previousStartDate && previousEndDate) ? vouchers.reduce((sum, voucher) => {
            const voucherDate = new Date(voucher.created_date || voucher.created_at);
            if (voucherDate >= previousStartDate && voucherDate <= previousEndDate) {
                return sum + (parseFloat(voucher.amount) || 0);
            }
            return sum;
        }, 0) : 0;

        let percentageChange = 0;
        if (previousTotal > 0) {
            percentageChange = ((currentTotal - previousTotal) / previousTotal) * 100;
        } else if (currentTotal > 0) {
            percentageChange = 100;
        }

        return {
            currentTotal: currentTotal.toFixed(2),
            percentageChange: Math.abs(percentageChange).toFixed(1),
            isIncrease: currentTotal > previousTotal
        };
    }, [vouchers, expensePeriod]);

    const getPeriodLabel = () => {
        switch (expensePeriod) {
            case "custom": return "Custom Range";
            case "today": return "Today";
            case "yesterday": return "Yesterday";
            case "7days": return "Last 7 Days";
            case "30days": return "Last 30 Days";
            case "this_month": return "This Month";
            case "last_month": return "Last Month";
            case "3months": return "Last 3 Months";
            default: return "Last 30 Days";
        }
    };

    const expenseMenuItems = [
        { value: "today", label: "Today", selected: expensePeriod === "today" },
        { value: "yesterday", label: "Yesterday", selected: expensePeriod === "yesterday" },
        { value: "7days", label: "Last 7 Days", selected: expensePeriod === "7days" },
        { value: "30days", label: "Last 30 Days", selected: expensePeriod === "30days" },
        { value: "this_month", label: "This Month", selected: expensePeriod === "this_month" },
        { value: "last_month", label: "Last Month", selected: expensePeriod === "last_month" },
        { value: "3months", label: "Last 3 Months", selected: expensePeriod === "3months" },
        { value: "custom", label: "Custom", selected: expensePeriod === "custom" },
    ];
    const expenseStats = calculateExpenseStats();

    const topTransactions = React.useMemo(() => {
        if (dashboardData?.top_expenses) {
            return dashboardData.top_expenses;
        }
        return [...vouchers]
            .sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0))
            .slice(0, 10);
    }, [vouchers, dashboardData]);

    const chartData = React.useMemo(() => {
        const data = [];
        const now = new Date();

        if (isHourlyView) {
            for (let i = 23; i >= 0; i--) {
                const d = new Date();
                d.setHours(now.getHours() - i, 0, 0, 0);
                data.push({ name: d.toISOString(), amount: 0 });
            }
        } else if (isMonthlyView) {
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                data.push({ name: d.toISOString(), amount: 0, month: d.getMonth(), year: d.getFullYear() });
            }
        } else {
            const daysToShow = expensePeriod === "7days" ? 7 : 30;
            for (let i = daysToShow - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(now.getDate() - i);
                data.push({ name: d.toISOString().split("T")[0], amount: 0 });
            }
        }

        if (!vouchers.length) return data;

        vouchers.forEach((v) => {
            const vDate = new Date(v.created_date || v.created_at);

            if (isHourlyView) {
                if (now.getTime() - vDate.getTime() <= 24 * 60 * 60 * 1000) {
                    const item = data.find(d => {
                        const dObj = new Date(d.name);
                        return dObj.getDate() === vDate.getDate() && dObj.getHours() === vDate.getHours();
                    });
                    if (item) item.amount += parseFloat(v.amount) || 0;
                }
            } else if (isMonthlyView) {
                const item = data.find(d => d.month === vDate.getMonth() && d.year === vDate.getFullYear());
                if (item) item.amount += parseFloat(v.amount) || 0;
            } else {
                const vDateStr = vDate.toISOString().split("T")[0];
                const item = data.find((d) => d.name === vDateStr);
                if (item) {
                    item.amount += parseFloat(v.amount) || 0;
                }
            }
        });

        return data;
    }, [vouchers, expensePeriod]);

    const activityChartData = React.useMemo(() => {
        const data = [];
        const now = new Date();

        if (isHourlyView) {
            for (let i = 23; i >= 0; i--) {
                const d = new Date();
                d.setHours(now.getHours() - i, 0, 0, 0);
                data.push({ name: d.toISOString(), dateStr: d.toISOString().split("T")[0], vouchers: 0, invoices: 0, tasks: 0, notices: 0, total: 0 });
            }
        } else if (isMonthlyView) {
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                data.push({ name: d.toISOString(), dateStr: format(d, 'yyyy-MM'), vouchers: 0, invoices: 0, tasks: 0, notices: 0, total: 0, month: d.getMonth(), year: d.getFullYear() });
            }
        } else {
            const daysToShow = expensePeriod === "7days" ? 7 : 30;
            for (let i = daysToShow - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(now.getDate() - i);
                data.push({ name: d.toISOString().split("T")[0], dateStr: d.toISOString().split("T")[0], vouchers: 0, invoices: 0, tasks: 0, notices: 0, total: 0 });
            }
        }

        const mergeApiTrend = (trendData, key) => {
            if (!Array.isArray(trendData)) return;
            trendData.forEach(({ date, count }) => {
                if (!date || !count) return;

                // Usually the API returns `YYYY-MM-DD`
                let target;
                if (isHourlyView) {
                    // Fallback to manual if 1day because grouping by hour is unsupported by simple daily API trends
                } else if (isMonthlyView) {
                    const itemDate = new Date(date);
                    target = data.find(d => d.month === itemDate.getMonth() && d.year === itemDate.getFullYear());
                } else {
                    target = data.find(d => d.name === date || d.dateStr === date);
                }

                if (target) {
                    target[key] += count;
                    target.total += count;
                }
            });
        };

        if (!isHourlyView) {
            mergeApiTrend(apiTrends.tasks, 'tasks');
            mergeApiTrend(apiTrends.notices, 'notices');
            mergeApiTrend(apiTrends.invoices, 'invoices');
            mergeApiTrend(apiTrends.vouchers, 'vouchers');
            return data;
        }

        // For 1day, or if there's any gap (fallback), we use the manual calculation
        vouchers.forEach((v) => {
            const vDate = new Date(v.created_date || v.created_at);
            let item = data.find(d => {
                const dObj = new Date(d.name);
                return dObj.getDate() === vDate.getDate() && dObj.getHours() === vDate.getHours();
            });
            if (item) {
                item.vouchers += 1;
                item.total += 1;
            }
        });

        invoices.forEach((inv) => {
            const iDate = new Date(inv.created_at || inv.invoice_date);
            let item = data.find(d => {
                const dObj = new Date(d.name);
                return dObj.getDate() === iDate.getDate() && dObj.getHours() === iDate.getHours();
            });
            if (item) {
                item.invoices += 1;
                item.total += 1;
            }
        });

        tasks.forEach((t) => {
            const tDate = new Date(t.created_at);
            let item = data.find(d => {
                const dObj = new Date(d.name);
                return dObj.getDate() === tDate.getDate() && dObj.getHours() === tDate.getHours();
            });
            if (item) {
                item.tasks += 1;
                item.total += 1;
            }
        });

        notices.forEach((n) => {
            const nDate = new Date(n.created_at);
            let item = data.find(d => {
                const dObj = new Date(d.name);
                return dObj.getDate() === nDate.getDate() && dObj.getHours() === nDate.getHours();
            });
            if (item) {
                item.notices += 1;
                item.total += 1;
            }
        });

        return data;
    }, [apiTrends, vouchers, invoices, tasks, notices, expensePeriod]);

    const averageActivity = React.useMemo(() => {
        if (!activityChartData.length) return 0;
        const total = activityChartData.reduce((sum, item) => sum + item.total, 0);
        return total / activityChartData.length;
    }, [activityChartData]);

    const averageExpense = React.useMemo(() => {
        if (!chartData.length) return 0;
        const total = chartData.reduce((sum, item) => sum + item.amount, 0);
        return total / chartData.length;
    }, [chartData]);

    const stats = dashboardData
        ? [
            {
                title: "Expense Snapshot",
                value: `₹${Math.abs(expenseStats.currentTotal).toLocaleString("en-IN")}`,
                description: `${expenseStats.percentageChange}% ${expenseStats.isIncrease ? 'increase' : 'decrease'} vs last period`,
                icon: Banknote,
                color: "from-purple-500 to-indigo-600",
                trend: {
                    isUp: expenseStats.isIncrease,
                    isBad: expenseStats.isIncrease
                },
            },

            // {
            //     title: "Invoices",
            //     value: dashboardData.invoice_count,
            //     description: "Total invoices",
            //     icon: FileText,
            //     color: "from-sky-500 to-cyan-500",
            // },
            // {
            //     title: "Vouchers",
            //     value: dashboardData.voucher_count,
            //     description: "Total vouchers",
            //     icon: CreditCard,
            //     color: "from-violet-500 to-fuchsia-500",
            // },
            // {
            //     title: "Beneficiaries",
            //     value: dashboardData.beneficiary_count,
            //     description: "Active beneficiaries",
            //     icon: Users,
            //     color: "from-amber-500 to-orange-500",
            // },
        ]
        : [];

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <h1 className="page-title m-0">
                            {entityName}
                        </h1>
                        
                        {expensePeriod === "custom" && (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5"
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">From</span>
                                    <input 
                                        type="date" 
                                        value={customFrom} 
                                        onChange={(e) => setCustomFrom(e.target.value)}
                                        min={istMinDateStr}
                                        max={istTodayStr}
                                        className="bg-transparent text-white text-xs border-none focus:ring-0 p-0 cursor-pointer [color-scheme:dark]"
                                    />
                                </div>
                                <div className="w-[1px] h-4 bg-white/10 mx-1" />
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">To</span>
                                    <input 
                                        type="date" 
                                        value={customTo} 
                                        onChange={(e) => setCustomTo(e.target.value)}
                                        min={customFrom || istMinDateStr}
                                        max={istTodayStr}
                                        className="bg-transparent text-white text-xs border-none focus:ring-0 p-0 cursor-pointer [color-scheme:dark]"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white rounded-xl px-3 py-2 text-sm font-medium"
                            >
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>{getPeriodLabel()}</span>
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[160px]">
                            {expenseMenuItems.map((item) => (
                                <DropdownMenuItem
                                    key={item.value}
                                    onClick={() => setExpensePeriod(item.value)}
                                    className={item.selected ? "bg-primary/20 font-semibold" : ""}
                                >
                                    {item.selected && <span className="mr-2 text-blue-400">✓</span>}
                                    {item.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 animate-spin text-white" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-4 lg:gap-4 xl:gap-4 mb-6 sm:mb-8 lg:mb-10">
                            {stats.map((stat, index) => (
                                <StatCard
                                    key={stat.title}
                                    {...stat}
                                    trend={stat.trend}
                                    delay={index * 0.1}
                                />
                            ))}

                            {isClientAdmin && (
                                <>
                                    <Card className="glass-card border-white/5 overflow-hidden h-[160px] sm:h-[240px] flex flex-col">
                                        <div className="relative flex-1 flex flex-col min-h-0">
                                            {fundInHandLoading ? (
                                                <div className="flex items-center justify-center min-h-[160px] sm:min-h-[240px] py-6">
                                                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 z-10">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={() => setFundSlide(0)} disabled={fundSlide === 0}>
                                                            <ChevronLeft className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <span className="text-[10px] text-gray-500">{fundSlide + 1}/2</span>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={() => setFundSlide(1)} disabled={fundSlide === 1}>
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>

                                                    <div className="overflow-hidden w-full relative touch-pan-y cursor-grab active:cursor-grabbing flex-1">
                                                        <AnimatePresence mode="wait">
                                                            <motion.div
                                                                key={fundSlide}
                                                                initial={{ opacity: 0, x: fundSlide === 0 ? -20 : 20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: fundSlide === 0 ? 20 : -20 }}
                                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                                                drag="x"
                                                                dragConstraints={{ left: 0, right: 0 }}
                                                                dragElastic={0.1}
                                                                onDragEnd={(e, { offset }) => {
                                                                    const swipe = offset.x;
                                                                    if (swipe < -40 && fundSlide === 0) setFundSlide(1);
                                                                    else if (swipe > 40 && fundSlide === 1) setFundSlide(0);
                                                                }}
                                                                className="w-full will-change-transform"
                                                            >
                                                                {fundSlide === 0 ? (
                                                                    <div className="p-2 sm:p-3">
                                                                        <h3 className="text-xs sm:text-sm font-semibold text-gray-300 mb-1">Fund In Hand</h3>
                                                                        <div className="text-lg sm:text-xl font-bold text-white mb-2">
                                                                            {formatINR(fundInHand?.total ?? 0)}
                                                                        </div>

                                                                        <div className="border-t border-white/10 pt-2 space-y-2">
                                                                            <div className="flex justify-between items-start">
                                                                                <div>
                                                                                    <p className="text-xs font-medium text-gray-300">Cash Balance</p>
                                                                                    <p className="text-[10px] text-gray-500">
                                                                                        {formatDateDDMMYYYY(fundInHand?.cash_as_of_date)}
                                                                                    </p>
                                                                                </div>
                                                                                <span className="text-xs font-medium text-white">
                                                                                    {formatINR(fundInHand?.cash_balance ?? 0)}
                                                                                </span>
                                                                            </div>

                                                                            <div className="border-t border-white/10 pt-2 flex justify-between items-start">
                                                                                <div>
                                                                                    <p className="text-xs font-medium text-gray-300">Bank Balance</p>
                                                                                    <p className="text-[10px] text-gray-500">
                                                                                        {fundInHand?.bank_accounts?.length
                                                                                            ? formatDateDDMMYYYY(fundInHand.bank_accounts[0]?.as_of_date)
                                                                                            : "—"}
                                                                                    </p>
                                                                                </div>
                                                                                <span className="text-xs font-medium text-white">
                                                                                    {formatINR(fundInHand?.total_bank ?? 0)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-2 sm:p-3 h-full flex flex-col">
                                                                        <h3 className="text-xs sm:text-sm font-semibold text-gray-300 mb-1">
                                                                            {entityName || "Entity"} - Bank Balance
                                                                        </h3>

                                                                        <div className="text-lg sm:text-xl font-bold text-white mb-2">
                                                                            {formatINR(fundInHand?.total_bank ?? 0)}
                                                                        </div>

                                                                        <div
                                                                            className="max-h-[100px] sm:max-h-[160px] overflow-y-auto border-t border-white/10 pt-2 space-y-0 custom-scrollbar overscroll-contain"
                                                                            onPointerDown={(e) => e.stopPropagation()}
                                                                        >
                                                                            {(fundInHand?.bank_accounts ?? []).map((ba) => {
                                                                                const bank = (organisationBankAccounts || []).find(
                                                                                    (b) => String(b.id) === String(ba.bank_account_id)
                                                                                );

                                                                                return (
                                                                                    <div
                                                                                        key={ba.bank_account_id}
                                                                                        className="flex justify-between items-start py-2 border-b border-white/10 last:border-0"
                                                                                    >
                                                                                        <div>
                                                                                            <p className="text-xs font-medium text-white">
                                                                                                {bank?.bank_name ?? "—"}
                                                                                            </p>
                                                                                            <p className="text-[10px] text-gray-500">
                                                                                                {bank?.account_number ?? "—"}
                                                                                            </p>
                                                                                        </div>

                                                                                        <span className="text-xs font-medium text-white">
                                                                                            {formatINR(ba.closing_balance)}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            })}

                                                                            {(!fundInHand?.bank_accounts ||
                                                                                fundInHand.bank_accounts.length === 0) && (
                                                                                    <p className="text-xs text-gray-500 py-3">
                                                                                        No bank tally data yet.
                                                                                    </p>
                                                                                )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        </AnimatePresence>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </Card>

                                    <Card className="glass-card border-white/5 overflow-hidden h-[160px] sm:h-[240px] flex flex-col">
                                        {handoverCardLoading ? (
                                            <div className="flex items-center justify-center min-h-[160px] sm:min-h-[240px] py-6">
                                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                                            </div>
                                        ) : handoverCard ? (
                                            <div className="p-2 sm:p-3 flex-1 flex flex-col min-h-0">
                                                <h3 className="text-xs sm:text-sm font-semibold text-gray-300 mb-1">
                                                    {entityName || "Entity"} - Handover
                                                </h3>

                                                <div className="text-lg sm:text-xl font-bold text-white ">
                                                    {formatINR(handoverCard.total)}
                                                </div>

                                                <p className="text-[10px] text-gray-500 mb-2">
                                                    Last handover: {formatDateDDMMYYYY(handoverCard.lastDate)}
                                                </p>

                                                <div className="max-h-[90px] sm:max-h-[180px] overflow-y-auto border-t border-white/10 pt-2 space-y-0 custom-scrollbar">
                                                    {Object.entries(handoverCard.breakdown)
                                                        .filter(([, amt]) => Number(amt) > 0)
                                                        .map(([pmId, amt]) => {
                                                            const pm = (handoverCard.paymentMethods || []).find(
                                                                (p) => String(p.id) === String(pmId)
                                                            );

                                                            return (
                                                                <div
                                                                    key={pmId}
                                                                    className="flex justify-between items-center py-2 border-b border-white/10 last:border-0"
                                                                >
                                                                    <span className="text-xs font-medium text-gray-300">
                                                                        {pm?.name ?? pmId}
                                                                    </span>

                                                                    <span className="text-xs font-medium text-white">
                                                                        {formatINR(amt)}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}

                                                    {Object.keys(handoverCard.breakdown).filter(
                                                        (k) => Number(handoverCard.breakdown[k]) > 0
                                                    ).length === 0 && (
                                                            <p className="text-xs text-gray-500 py-2">
                                                                No breakdown
                                                            </p>
                                                        )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-2 sm:p-3 flex-1 flex flex-col">
                                                <h3 className="text-xs sm:text-sm font-semibold text-gray-300 mb-1">
                                                    {entityName || "Entity"} - Handover
                                                </h3>

                                                <p className="text-xs text-gray-500 py-4">
                                                    No handover data yet.
                                                </p>
                                            </div>
                                        )}
                                    </Card>

                                    <Card className="glass-card border-white/5 overflow-hidden h-[160px] sm:h-[240px] flex flex-col">
                                        <div className="p-2 sm:p-3">
                                            <h3 className="text-xs sm:text-sm font-semibold text-gray-300 mb-1">
                                                Fund Out
                                            </h3>

                                            <p className="text-[10px] text-gray-500 mb-1">
                                                Today&apos;s vouchers total
                                            </p>

                                            <div className="text-lg sm:text-xl font-bold text-white mb-2">
                                                {formatINR(fundOutToday.total)}
                                            </div>

                                            <div className="border-t border-white/10 pt-2 space-y-2">
                                                <div className="flex justify-between items-center py-1 border-b border-white/10">
                                                    <span className="text-xs font-medium text-gray-300">
                                                        By Cash
                                                    </span>
                                                    <span className="text-xs font-medium text-white">
                                                        {formatINR(fundOutToday.byCash)}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-center py-1">
                                                    <span className="text-xs font-medium text-gray-300">
                                                        By Bank
                                                    </span>
                                                    <span className="text-xs font-medium text-white">
                                                        {formatINR(fundOutToday.byBank)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </>
                            )}
                        </div>



                        <Card className="glass-card mb-8 relative overflow-hidden">
                            <div className="absolute right-4 top-4 flex items-center gap-2 z-10">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-400 hover:text-white rounded-full hover:bg-white/10"
                                    onClick={() => setTrendSlide(0)}
                                    disabled={trendSlide === 0}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                                <span className="text-xs font-medium text-gray-500 min-w-[24px] text-center">
                                    {trendSlide + 1}/2
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-400 hover:text-white rounded-full hover:bg-white/10"
                                    onClick={() => setTrendSlide(1)}
                                    disabled={trendSlide === 1}
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </Button>
                            </div>

                            <div className="touch-pan-y">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={trendSlide}
                                        initial={{ opacity: 0, x: trendSlide === 0 ? -20 : 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: trendSlide === 0 ? 20 : -20 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={0.1}
                                        onDragEnd={(e, { offset }) => {
                                            const swipe = offset.x;
                                            if (swipe < -50 && trendSlide === 0) setTrendSlide(1);
                                            else if (swipe > 50 && trendSlide === 1) setTrendSlide(0);
                                        }}
                                        className="w-full"
                                    >
                                        {trendSlide === 0 ? (
                                            <>
                                                <CardHeader className="p-4 sm:p-6 pb-0">
                                                    <CardTitle className="text-lg sm:text-xl">
                                                        Expense Trend
                                                    </CardTitle>
                                                    <CardDescription className="text-sm sm:text-base">
                                                        Spending for the {getPeriodLabel().toLowerCase()}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="p-4 sm:p-6 pl-0">
                                                    <div className="h-[175px] w-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart
                                                                data={chartData}
                                                                margin={{ top: 20, right: 20, left: 20, bottom: 0 }}
                                                            >
                                                                <XAxis
                                                                    dataKey="name"
                                                                    stroke="#9ca3af"
                                                                    fontSize={10}
                                                                    tickLine={false}
                                                                    axisLine={false}
                                                                    minTickGap={30}
                                                                    tickFormatter={(value) => {
                                                                        const date = new Date(value);
                                                                        if (isHourlyView) {
                                                                            return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
                                                                        } else if (isMonthlyView) {
                                                                            return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
                                                                        }
                                                                        return date.toLocaleDateString("en-IN", {
                                                                            day: "numeric",
                                                                            month: "short",
                                                                        });
                                                                    }}
                                                                />
                                                                <YAxis
                                                                    stroke="#9ca3af"
                                                                    fontSize={11}
                                                                    tickLine={false}
                                                                    axisLine={false}
                                                                    tickFormatter={(value) =>
                                                                        `₹${value.toLocaleString("en-IN")}`
                                                                    }
                                                                    width={isMobile ? 55 : 80}
                                                                />
                                                                <Tooltip
                                                                    contentStyle={{
                                                                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                                                                        border: "none",
                                                                        borderRadius: "8px",
                                                                        color: "#fff",
                                                                    }}
                                                                    itemStyle={{ color: "#fff" }}
                                                                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                                                                    formatter={(value) => [
                                                                        `₹${value.toLocaleString("en-IN")}`,
                                                                        "Amount",
                                                                    ]}
                                                                    labelFormatter={(label) => {
                                                                        const date = new Date(label);
                                                                        if (isHourlyView) {
                                                                            return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
                                                                        } else if (isMonthlyView) {
                                                                            return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                                                                        }
                                                                        return date.toLocaleDateString("en-IN", {
                                                                            day: "numeric",
                                                                            month: "short",
                                                                            year: "numeric"
                                                                        });
                                                                    }}
                                                                />
                                                                <CartesianGrid
                                                                    vertical={false}
                                                                    stroke="rgba(255,255,255,0.1)"
                                                                />
                                                                {averageExpense > 0 && (
                                                                    <ReferenceLine
                                                                        y={averageExpense}
                                                                        stroke="#f59e0b"
                                                                        strokeDasharray="3 3"
                                                                    />
                                                                )}
                                                                <Bar
                                                                    dataKey="amount"
                                                                    fill="#3b82f6"
                                                                    maxBarSize={isMobile ? 12 : 40}
                                                                    radius={[4, 4, 0, 0]}
                                                                >
                                                                    {!isMobile && (
                                                                        <LabelList
                                                                            dataKey="amount"
                                                                            position="top"
                                                                            formatter={(value) =>
                                                                                value > 0
                                                                                    ? value.toLocaleString("en-IN", {
                                                                                        maximumFractionDigits: 0,
                                                                                    })
                                                                                    : ""
                                                                            }
                                                                            style={{ fill: "#9ca3af", fontSize: "10px" }}
                                                                        />
                                                                    )}
                                                                </Bar>
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </CardContent>
                                            </>
                                        ) : (
                                            <>
                                                <CardHeader className="p-4 sm:p-6 pb-0">
                                                    <CardTitle className="text-lg sm:text-xl">
                                                        Activity Trend
                                                    </CardTitle>
                                                    <CardDescription className="text-sm sm:text-base">
                                                        Activity volume for the {getPeriodLabel().toLowerCase()}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="p-4 sm:p-6 pl-0">
                                                    <div className="h-[175px] w-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart
                                                                data={activityChartData}
                                                                margin={{ top: 20, right: 20, left: 20, bottom: 0 }}
                                                            >
                                                                <XAxis
                                                                    dataKey="name"
                                                                    stroke="#9ca3af"
                                                                    fontSize={10}
                                                                    tickLine={false}
                                                                    axisLine={false}
                                                                    minTickGap={30}
                                                                    tickFormatter={(value) => {
                                                                        const date = new Date(value);
                                                                        if (isHourlyView) {
                                                                            return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
                                                                        } else if (isMonthlyView) {
                                                                            return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
                                                                        }
                                                                        return date.toLocaleDateString("en-IN", {
                                                                            day: "numeric",
                                                                            month: "short",
                                                                        });
                                                                    }}
                                                                />
                                                                <YAxis
                                                                    stroke="#9ca3af"
                                                                    fontSize={11}
                                                                    tickLine={false}
                                                                    axisLine={false}
                                                                    width={isMobile ? 30 : 40}
                                                                />
                                                                <Tooltip
                                                                    contentStyle={{
                                                                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                                                                        border: "none",
                                                                        borderRadius: "12px",
                                                                        color: "#fff",
                                                                    }}
                                                                    itemStyle={{ fontSize: '12px' }}
                                                                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                                                                    labelFormatter={(label) => {
                                                                        const date = new Date(label);
                                                                        if (isHourlyView) {
                                                                            return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
                                                                        } else if (isMonthlyView) {
                                                                            return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                                                                        }
                                                                        return date.toLocaleDateString("en-IN", {
                                                                            day: "numeric",
                                                                            month: "short",
                                                                            year: "numeric"
                                                                        });
                                                                    }}
                                                                />
                                                                <Legend
                                                                    verticalAlign="top"
                                                                    align="right"
                                                                    iconType="circle"
                                                                    wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', top: -10 }}
                                                                />
                                                                <CartesianGrid
                                                                    vertical={false}
                                                                    stroke="rgba(255,255,255,0.1)"
                                                                />
                                                                {averageActivity > 0 && (
                                                                    <ReferenceLine
                                                                        y={averageActivity}
                                                                        stroke="#f59e0b"
                                                                        strokeDasharray="3 3"
                                                                    />
                                                                )}
                                                                <Bar dataKey="tasks" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={isMobile ? 12 : 32} name="Tasks" />
                                                                <Bar dataKey="vouchers" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={isMobile ? 12 : 32} name="Vouchers" />
                                                                <Bar dataKey="invoices" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} barSize={isMobile ? 12 : 32} name="Invoices" />
                                                                <Bar dataKey="notices" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={isMobile ? 12 : 32} name="Notices">
                                                                    <LabelList
                                                                        dataKey="total"
                                                                        position="top"
                                                                        style={{ fill: '#9ca3af', fontSize: '10px' }}
                                                                        formatter={(val) => val > 0 ? val : ''}
                                                                    />
                                                                </Bar>
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </CardContent>
                                            </>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4 lg:gap-4">
                            <Card className="glass-card flex flex-col">
                                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                                    <CardTitle className="text-lg sm:text-xl">
                                        Top cost Drivers-Beneficiaries wise
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                                    <div className="space-y-2 flex-1">
                                        <div className="grid grid-cols-12 text-xs text-gray-400 font-medium uppercase tracking-wider border-b border-white/10 pb-2 mb-2 pr-2">
                                            <div className="col-span-2">S.No</div>
                                            <div className="col-span-6">Beneficiaries</div>
                                            <div className="col-span-4 text-right">Amount</div>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {topTransactions.length > 0 ? (
                                                topTransactions.map((transaction, index) => (
                                                    <div
                                                        key={transaction.id || index}
                                                        onClick={() => {
                                                            const bId = transaction.beneficiary?.id ||
                                                                transaction.beneficiary_id ||
                                                                (typeof transaction.beneficiary === 'string' ? transaction.beneficiary : null) ||
                                                                transaction.id;
                                                            if (bId && bId !== 'undefined') {
                                                                navigate(`/beneficiaries/${bId}/ledger`);
                                                            }
                                                        }}
                                                        className="grid grid-cols-12 items-center text-sm py-2 hover:bg-white/10 transition-all rounded px-1 group cursor-pointer"
                                                    >
                                                        <div className="col-span-2 text-gray-400 font-mono">
                                                            {String(index + 1).padStart(2, "0")}
                                                        </div>
                                                        <div
                                                            className="col-span-6 text-white truncate pr-2 group-hover:scale-[1.02] transition-transform origin-left"
                                                            title={transaction.remarks}
                                                        >
                                                            {transaction.beneficiary_name || transaction.beneficiary?.name || transaction.beneficiary?.company_name}
                                                            {transaction.remarks && <div className=" text-xs text-gray-400 italic">  {transaction.remarks}</div>}
                                                            {/* <div className="text-xs text-gray-400 italic">  {transaction.date}</div> */}
                                                        </div>
                                                        <div className="col-span-4 text-right text-red-400 font-medium">
                                                            ₹
                                                            {Math.round(parseFloat(transaction.amount)).toLocaleString(
                                                                "en-IN"
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-6 text-gray-400 text-sm">
                                                    No transactions found
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pt-4 mt-auto border-t border-white/5">
                                        <Button
                                            variant="ghost"
                                            className="w-full text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-xl group transition-all text-sm py-2"
                                            onClick={() => navigate('/beneficiaries/ledger')}
                                        >
                                            View more
                                            <TrendingUp className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="glass-card flex flex-col">
                                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                                    <CardTitle className="text-lg sm:text-xl">
                                        Top cost Drivers-Finance Header wise
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                                    <div className="space-y-2 flex-1">
                                        <div className="grid grid-cols-12 text-xs text-gray-400 font-medium uppercase tracking-wider border-b border-white/10 pb-2 mb-2 pr-2">
                                            <div className="col-span-2">S.No</div>
                                            <div className="col-span-6">Header</div>
                                            <div className="col-span-4 text-right">Amount</div>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {dashboardData?.top_header_expenses && dashboardData.top_header_expenses.length > 0 ? (
                                                dashboardData.top_header_expenses.map((expense, index) => (
                                                    <div
                                                        key={index}
                                                        className="grid grid-cols-12 items-center text-sm py-2 hover:bg-white/10 transition-all rounded px-1 cursor-pointer group"
                                                        onClick={() => expense.header_id && navigate(`/dashboard/finance-headers/${expense.header_id}`)}
                                                    >
                                                        <div className="col-span-2 text-gray-400 font-mono">
                                                            {String(index + 1).padStart(2, "0")}
                                                        </div>
                                                        <div className="col-span-6 text-white truncate pr-2 group-hover:scale-[1.02] transition-transform origin-left">
                                                            {expense.header_name}
                                                        </div>
                                                        <div className="col-span-4 text-right text-red-400 font-medium">
                                                            ₹
                                                            {Math.round(parseFloat(expense.amount)).toLocaleString(
                                                                "en-IN"
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-6 text-gray-400 text-sm">
                                                    No expenses found
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pt-4 mt-auto border-t border-white/5">
                                        <Button
                                            variant="ghost"
                                            className="w-full text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-xl group transition-all text-sm py-2"
                                            onClick={() => navigate('/dashboard/finance-headers')}
                                        >
                                            View more
                                            <TrendingUp className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="glass-card flex flex-col">
                                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                                    <CardTitle className="text-lg sm:text-xl">
                                        Recent Transactions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                                    <div className="space-y-2 flex-1">
                                        <div className="grid grid-cols-12 text-xs text-gray-400 font-medium uppercase tracking-wider border-b border-white/10 pb-2 mb-2 pr-2">
                                            <div className="col-span-2">S.No</div>
                                            <div className="col-span-6">Beneficiaries</div>
                                            <div className="col-span-4 text-right">Amount</div>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {recentDashboardData?.recent_vouchers?.length > 0 ? (
                                                recentDashboardData.recent_vouchers.map((transaction, index) => (
                                                    <TransactionItem
                                                        key={transaction.id}
                                                        transaction={transaction}
                                                        index={index}
                                                        remarks={transaction.remarks}
                                                        onClick={() =>
                                                            navigate(`/finance/vouchers/${transaction.id}`)
                                                        }
                                                        name={transaction.beneficiary?.name || transaction.beneficiary?.company_name}
                                                    />
                                                ))
                                            ) : (
                                                <div className="text-center py-8 sm:py-10 text-gray-400 text-sm sm:text-base">
                                                    No recent transactions found.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pt-4 mt-auto border-t border-white/5">
                                        <Button
                                            variant="ghost"
                                            className="w-full text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-xl group transition-all text-sm py-2"
                                            onClick={() => navigate('/dashboard/recent-transactions')}
                                        >
                                            View more
                                            <TrendingUp className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>


                        </div>
                    </>
                )}
            </motion.div>


        </div>
    );
};

export default Dashboard;
