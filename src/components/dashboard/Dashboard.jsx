import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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
    FileWarning,
    Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "@/hooks/useMediaQuery.jsx";
import { useAuth } from "@/hooks/useAuth.jsx";
import { useToast } from "@/components/ui/use-toast.js";
import { getDashboardData, getVouchersList } from "@/lib/api.js";
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
} from "recharts";
import { listExpiringDocuments } from '@/lib/api/documents';
import { differenceInDays, format } from 'date-fns';

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


    console.log(trend);
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            <Card className="glass-card card-hover overflow-hidden h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
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
                            className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r ${color} rounded-lg flex items-center justify-center shadow-lg shadow-black/20 flex-shrink-0`}
                        >
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
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
                            className={`${hideValue ? "mt-2" : "mt-4 pt-3 border-t border-white/10"
                                } space-y-2 text-sm text-gray-400`}
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

    const amount = parseFloat(transaction.amount).toFixed(2);
    return (
        <div
            onClick={onClick}
            className="grid grid-cols-12 items-center text-sm py-2 hover:bg-white/5 transition-colors rounded px-1 cursor-pointer"
        >
            <div className="col-span-2 text-gray-400 font-mono">
                {String(index + 1).padStart(2, "0")}
            </div>
            <div className="col-span-6 text-white truncate pr-2">
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
                <div className={`text-xs font-normal mt-1 capitalize ${transaction.voucher_type === 'cash' ? 'text-green-400' : 'text-red-400'
                    }`}>
                    {transaction.voucher_type}
                </div>
            </div>
        </div>
    );
};

const Dashboard = ({
    entityId,
    entityName,
    onQuickAction,
    organisationBankAccounts,
}) => {
    const [dashboardData, setDashboardData] = useState(null);
    console.log(dashboardData, "data");
    const [isLoading, setIsLoading] = useState(true);
    const [vouchers, setVouchers] = useState([]);
    const [expiringDocs, setExpiringDocs] = useState([]);
    const [expensePeriod, setExpensePeriod] = useState("1month"); // Default to 1 month

    const isMobile = useMediaQuery("(max-width: 640px)");
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const fabItems = [
        { label: "Beneficiaries", icon: Users, path: "/beneficiaries", state: { quickAction: 'add-beneficiary', returnToDashboard: true } },
        { label: "Tasks", icon: Landmark, path: "/tasks", state: { quickAction: 'add-task', returnToDashboard: true } },
        { label: "Invoices", icon: FileText, path: "/finance/invoices", state: { quickAction: 'add-invoice', returnToDashboard: true } },
        { label: "Vouchers", icon: Banknote, path: "/finance/vouchers", state: { quickAction: 'add-voucher', returnToDashboard: true } },
    ];

    const fetchDashboardData = useCallback(async () => {
        if (!entityId || !user?.access_token) return;
        setIsLoading(true);
        try {
            const [dashData, vouchersData, docs] = await Promise.all([
                getDashboardData(entityId, user.access_token, user.agency_id),
                getVouchersList(entityId, user.access_token),
                listExpiringDocuments(user.access_token, user.role === 'CLIENT_USER' ? entityId : null)
            ]);
            setDashboardData(dashData);
            setVouchers(Array.isArray(vouchersData) ? vouchersData : []);
            setExpiringDocs(docs || []);
        } catch (error) {
            toast({
                title: "Error fetching dashboard data",
                description: error.message,
                variant: "destructive",
            });
            setDashboardData(null);
            setVouchers([]);
            setExpiringDocs([]);
        } finally {
            setIsLoading(false);
        }
    }, [entityId, user?.access_token, user?.agency_id, toast]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Calculate total expenses and stats based on selected time period
    const calculateExpenseStats = useCallback(() => {
        if (!vouchers || vouchers.length === 0) return { currentTotal: "0.00", percentageChange: 0, isIncrease: false };

        const now = new Date();
        let currentStartDate = new Date();
        let previousStartDate = new Date();
        let currentEndDate = new Date(); // usually now
        let previousEndDate = new Date();

        switch (expensePeriod) {
            case "1day":
                currentStartDate.setDate(now.getDate() - 1);
                previousEndDate.setDate(now.getDate() - 1);
                previousStartDate.setDate(now.getDate() - 2);
                break;
            case "1week":
                currentStartDate.setDate(now.getDate() - 7);
                previousEndDate.setDate(now.getDate() - 7);
                previousStartDate.setDate(now.getDate() - 14);
                break;
            case "1month":
                currentStartDate.setMonth(now.getMonth() - 1);
                previousEndDate.setMonth(now.getMonth() - 1);
                previousStartDate.setMonth(now.getMonth() - 2);
                break;
            case "1year":
                currentStartDate.setFullYear(now.getFullYear() - 1);
                previousEndDate.setFullYear(now.getFullYear() - 1);
                previousStartDate.setFullYear(now.getFullYear() - 2);
                break;
            default:
                currentStartDate.setMonth(now.getMonth() - 1);
                previousEndDate.setMonth(now.getMonth() - 1);
                previousStartDate.setMonth(now.getMonth() - 2);
        }

        const currentTotal = vouchers.reduce((sum, voucher) => {
            const voucherDate = new Date(voucher.created_date || voucher.created_at);
            if (voucherDate >= currentStartDate && voucherDate <= now) {
                return sum + (parseFloat(voucher.amount) || 0);
            }
            return sum;
        }, 0);

        const previousTotal = vouchers.reduce((sum, voucher) => {
            const voucherDate = new Date(voucher.created_date || voucher.created_at);
            if (voucherDate >= previousStartDate && voucherDate <= previousEndDate) {
                return sum + (parseFloat(voucher.amount) || 0);
            }
            return sum;
        }, 0);

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
            case "1day":
                return "Last 24 hours";
            case "1week":
                return "Last 7 days";
            case "1month":
                return "Last 30 days";
            case "1year":
                return "Last 365 days";
            default:
                return "Last 30 days";
        }
    };

    const expenseMenuItems = [
        {
            value: "1day",
            label: "Last 24 Hours",
            selected: expensePeriod === "1day",
        },
        {
            value: "1week",
            label: "Last 7 Days",
            selected: expensePeriod === "1week",
        },
        {
            value: "1month",
            label: "Last 30 Days",
            selected: expensePeriod === "1month",
        },
        {
            value: "1year",
            label: "Last 1 Year",
            selected: expensePeriod === "1year",
        },
    ];
    const expenseStats = calculateExpenseStats();

    const topTransactions = React.useMemo(() => {
        return [...vouchers]
            .sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0))
            .slice(0, 50);
    }, [vouchers]);

    const chartData = React.useMemo(() => {
        const data = [];
        const now = new Date();
        const daysToShow = 23; // Show last 23 days as requested

        // Initialize last 23 days with 0
        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split("T")[0]; // Format: YYYY-MM-DD
            data.push({
                name: dateStr,
                amount: 0,
            });
        }

        if (!vouchers.length) return data;

        vouchers.forEach((v) => {
            const vDate = new Date(v.created_date || v.created_at);
            const vDateStr = vDate.toISOString().split("T")[0];

            // Only aggregate if date is within our range
            const item = data.find((d) => d.name === vDateStr);
            if (item) {
                item.amount += parseFloat(v.amount) || 0;
            }
        });

        return data;
    }, [vouchers]);

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
                showMenu: true,
                menuItems: expenseMenuItems,
                onMenuSelect: setExpensePeriod,
                trend: {
                    isUp: expenseStats.isIncrease,
                    isBad: expenseStats.isIncrease
                },
            },

            {
                title: "Tasks",
                value: dashboardData.beneficiary_count,
                hideValue: true,
                // description: 'Active beneficiaries',
                icon: Users,
                color: "from-sky-500 to-cyan-500",
                meta: {
                    createdByMe: 24,
                    lastYear: 18,
                    collaboration: 7,
                },
            },
            {
                title: "Beneficiaries",
                value: dashboardData.invoice_count,
                description: "Total invoices",
                icon: FileText,
                color: "from-violet-500 to-fuchsia-500",
            },
            {
                title: "Approvals",
                value: organisationBankAccounts.length,
                description: "Organization bank accounts",
                icon: Landmark,
                color: "from-amber-500 to-orange-500",
            },
        ]
        : [];

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex items-center space-x-4 mb-6 sm:mb-8 lg:mb-10">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white break-words">
                        {entityName}
                    </h1>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 animate-spin text-white" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 lg:mb-10">
                            {stats.map((stat, index) => (
                                <StatCard
                                    key={stat.title}
                                    {...stat}
                                    trend={stat.trend}
                                    delay={index * 0.1}
                                />
                            ))}
                            <Card className="glass-card h-full">
                                <CardHeader className="p-4 sm:p-6 pb-2">
                                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-300 flex items-center gap-2">
                                        <FileWarning className="w-4 h-4 text-yellow-500" />
                                        Expiring Documents
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 pt-2">
                                    {expiringDocs.length === 0 ? (
                                        <div className="text-center py-4 text-gray-400 text-xs">None expiring soon.</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {expiringDocs.slice(0, 3).map(doc => {
                                                const daysLeft = differenceInDays(new Date(doc.expiry_date), new Date());
                                                return (
                                                    <div key={doc.id} className="cursor-pointer group rounded bg-white/5 p-2 hover:bg-white/10 transition-colors"
                                                        onClick={() => navigate(`/documents?folderId=${doc.folder_id || 'root'}&clientId=${doc.entity_id || ''}`)}>
                                                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                                                            <div className="flex items-center gap-2 truncate">
                                                                <FileText className="w-3 h-3 text-blue-400 shrink-0" />
                                                                <span className="text-sm font-medium text-white truncate">{doc.name}</span>
                                                            </div>
                                                            <span className={`text-[10px] whitespace-nowrap ${daysLeft < 5 ? 'text-red-400' : 'text-yellow-400'}`}>
                                                                {daysLeft}d left
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {expiringDocs.length > 3 && (
                                                <div className="text-center pt-1">
                                                    <span className="text-xs text-blue-400 cursor-pointer hover:underline" onClick={() => navigate('/documents')}>View All ({expiringDocs.length})</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="glass-card mb-8">
                            <CardHeader className="p-4 sm:p-6">
                                <CardTitle className="text-lg sm:text-xl">
                                    Expense Trend
                                </CardTitle>
                                <CardDescription className="text-sm sm:text-base">
                                    Spending for the last 30 days
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
                                                fill="#3b82f6" // Blue color
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
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                            <Card className="glass-card ">
                                <CardHeader className="p-4 sm:p-6">
                                    <CardTitle className="text-lg sm:text-xl">
                                        Top transactions
                                    </CardTitle>
                                    <CardDescription className="text-sm sm:text-base">
                                        Highest value expenses
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6">
                                    <div className="space-y-2">
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
                                                        onClick={() =>
                                                            navigate(`/finance/vouchers/${transaction.id}`)
                                                        }
                                                        className="grid grid-cols-12 items-center text-sm py-2 hover:bg-white/5 transition-colors rounded px-1 cursor-pointer"
                                                    >
                                                        <div className="col-span-2 text-gray-400 font-mono">
                                                            {String(index + 1).padStart(2, "0")}
                                                        </div>
                                                        <div
                                                            className="col-span-6 text-white truncate pr-2"
                                                            title={transaction.remarks}
                                                        >
                                                            {transaction.beneficiary_name || transaction.beneficiary?.name}
                                                            <div className=" text-xs text-gray-400 italic">  {transaction.remarks}</div>
                                                            {/* <div className="text-xs text-gray-400 italic">  {transaction.date}</div> */}
                                                        </div>
                                                        <div className="col-span-4 text-right text-red-400 font-medium">
                                                            ₹
                                                            {parseFloat(transaction.amount).toLocaleString(
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
                                </CardContent>
                            </Card>

                            <Card className="glass-card ">
                                <CardHeader className="p-4 sm:p-6">
                                    <CardTitle className="text-lg sm:text-xl">
                                        Top transactions
                                    </CardTitle>
                                    <CardDescription className="text-sm sm:text-base">
                                        Highest value expenses
                                    </CardDescription>
                                </CardHeader>
                            </Card>

                            <Card className="glass-card ">
                                <CardHeader className="p-4 sm:p-6">
                                    <CardTitle className="text-lg sm:text-xl">
                                        Recent Transactions
                                    </CardTitle>
                                    <CardDescription className="text-sm sm:text-base">
                                        Your latest financial activities for {entityName}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6">
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-12 text-xs text-gray-400 font-medium uppercase tracking-wider border-b border-white/10 pb-2 mb-2 pr-2">
                                            <div className="col-span-2">S.No</div>
                                            <div className="col-span-6">Beneficiaries</div>
                                            <div className="col-span-4 text-right">Amount</div>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {dashboardData?.recent_vouchers?.length > 0 ? (
                                                dashboardData.recent_vouchers.map((transaction, index) => (
                                                    <TransactionItem
                                                        key={transaction.id}
                                                        transaction={transaction}
                                                        index={index}
                                                        remarks={transaction.remarks}
                                                        onClick={() =>
                                                            navigate(`/finance/vouchers/${transaction.id}`)
                                                        }
                                                        name={transaction.beneficiary?.name}
                                                    />
                                                ))
                                            ) : (
                                                <div className="text-center py-8 sm:py-10 text-gray-400 text-sm sm:text-base">
                                                    No recent transactions found.
                                                </div>
                                            )}
                                        </div>
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
