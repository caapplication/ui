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
    Plus,
    X,
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
                        <div className="flex items-center gap-2">
                            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                                {value}
                            </div>

                            {trend &&
                                (trend.isPositive ? (
                                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                                ) : (
                                    <ArrowDownRight className="w-5 h-5 text-red-500" />
                                ))}
                        </div>
                    )}

                    {description && (
                        <p className="text-xs text-gray-400 mt-1">{description}</p>
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

const TransactionItem = ({ transaction, onClick }) => {
    const amount = parseFloat(transaction.amount).toFixed(2);
    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors duration-300 gap-3 cursor-pointer"
        >
            <div className="flex-1 min-w-0">
                <p className="text-white font-medium capitalize text-sm sm:text-base truncate">
                    {transaction.remarks || `${transaction.voucher_type} voucher`}
                </p>
                <p className="text-gray-400 text-xs sm:text-sm">
                    {new Date(transaction.created_date).toLocaleDateString()}
                </p>
            </div>
            <div
                className={`font-semibold text-base sm:text-lg text-red-400 flex-shrink-0`}
            >
                ₹{amount}
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
    const [isLoading, setIsLoading] = useState(true);
    const [vouchers, setVouchers] = useState([]);
    const [expensePeriod, setExpensePeriod] = useState("1month"); // Default to 1 month
    const [isFabOpen, setIsFabOpen] = useState(false);
    const isMobile = useMediaQuery("(max-width: 640px)");
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const fabItems = [
        { label: "Beneficiaries", icon: Users, path: "/beneficiaries", state: { quickAction: 'add-beneficiary', returnToDashboard: true } },
        { label: "Tasks", icon: Landmark, path: "/tasks", state: { quickAction: 'add-task', returnToDashboard: true } },
        { label: "Invoices", icon: FileText, path: "/finance/invoices", state: { quickAction: 'add-invoice', returnToDashboard: true } },
        { label: "Vouchers", icon: Banknote, path: "/finance", state: { quickAction: 'add-voucher', returnToDashboard: true } },
    ];

    const fetchDashboardData = useCallback(async () => {
        if (!entityId || !user?.access_token) return;
        setIsLoading(true);
        try {
            const [dashData, vouchersData] = await Promise.all([
                getDashboardData(entityId, user.access_token, user.agency_id),
                getVouchersList(entityId, user.access_token),
            ]);
            setDashboardData(dashData);
            setVouchers(Array.isArray(vouchersData) ? vouchersData : []);
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
    }, [entityId, user?.access_token, user?.agency_id, toast]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Calculate total expenses based on selected time period
    const calculateExpenseTotal = useCallback(() => {
        if (!vouchers || vouchers.length === 0) return 0;

        const now = new Date();
        let cutoffDate = new Date();

        switch (expensePeriod) {
            case "1day":
                cutoffDate.setDate(now.getDate() - 1);
                break;
            case "1week":
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case "1month":
                cutoffDate.setMonth(now.getMonth() - 1);
                break;
            case "1year":
                cutoffDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                cutoffDate.setMonth(now.getMonth() - 1);
        }

        const filteredVouchers = vouchers.filter((voucher) => {
            const voucherDate = new Date(voucher.created_date || voucher.created_at);
            return voucherDate >= cutoffDate;
        });

        const total = filteredVouchers.reduce((sum, voucher) => {
            return sum + (parseFloat(voucher.amount) || 0);
        }, 0);

        return total.toFixed(2);
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
    const expenseTotal = calculateExpenseTotal();
    const isPositive = expenseTotal >= 0;

    const topTransactions = React.useMemo(() => {
        return [...vouchers]
            .sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0))
            .slice(0, 5);
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
                value: `₹${Math.abs(expenseTotal).toLocaleString("en-IN")}`,
                description: getPeriodLabel(),
                icon: Banknote,
                color: "from-purple-500 to-indigo-600",
                showMenu: true,
                menuItems: expenseMenuItems,
                onMenuSelect: setExpensePeriod,
                trend: {
                    isPositive,
                    value: expenseTotal,
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 lg:mb-10">
                            {stats.map((stat, index) => (
                                <StatCard
                                    key={stat.title}
                                    {...stat}
                                    trend={stat.trend}
                                    delay={index * 0.1}
                                />
                            ))}
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
                                        <div className="grid grid-cols-12 text-xs text-gray-400 font-medium uppercase tracking-wider border-b border-white/10 pb-2 mb-2">
                                            <div className="col-span-2">S.No</div>
                                            <div className="col-span-6">Description</div>
                                            <div className="col-span-4 text-right">Amount</div>
                                        </div>
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
                                                        {transaction.remarks ||
                                                            `${transaction.voucher_type} voucher`}
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
                                    <div className="space-y-3 sm:space-y-4">
                                        {dashboardData?.recent_vouchers?.length > 0 ? (
                                            dashboardData.recent_vouchers.map((transaction) => (
                                                <TransactionItem
                                                    key={transaction.id}
                                                    transaction={transaction}
                                                    onClick={() =>
                                                        navigate(`/finance/vouchers/${transaction.id}`)
                                                    }
                                                />
                                            ))
                                        ) : (
                                            <div className="text-center py-8 sm:py-10 text-gray-400 text-sm sm:text-base">
                                                No recent transactions found.
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* <Card className="glass-card">
                                <CardHeader className="p-4 sm:p-6">
                                    <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
                                    <CardDescription className="text-sm sm:text-base">Frequently used features</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6">
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        {[
                                            { label: 'Add Beneficiary', icon: Users, action: 'add-beneficiary' },
                                            { label: 'Add Invoice', icon: FileText, action: 'add-invoice' },
                                            { label: 'Add Voucher', icon: Banknote, action: 'add-voucher' },
                                            { label: 'Add Org. Bank', icon: Landmark, action: 'add-organisation-bank' }
                                        ].map((action) => {
                                            const Icon = action.icon;
                                            return (
                                                <motion.button
                                                    key={action.label}
                                                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="p-3 sm:p-4 bg-white/10 rounded-lg border border-white/20 transition-all duration-300 text-center flex flex-col items-center justify-center space-y-2 h-24 sm:h-28"
                                                    onClick={() => onQuickAction(action.action)}
                                                >
                                                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-sky-400" />
                                                    <p className="text-white text-xs sm:text-sm font-medium text-center leading-tight">{action.label}</p>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card> */}
                        </div>
                    </>
                )}
            </motion.div>

            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
                {isFabOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="flex flex-col gap-3 mb-2"
                    >
                        {fabItems.map((item, index) => {
                            const Icon = item.icon;
                            return (
                                <motion.button
                                    key={item.label}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => {
                                        navigate(item.path, { state: item.state });
                                        setIsFabOpen(false);
                                    }}
                                    className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full shadow-lg hover:bg-white/20 transition-all group justify-between"
                                >
                                    <span className="text-sm font-medium text-white whitespace-nowrap px-2">
                                        {item.label}
                                    </span>
                                    <div className="bg-white/10 p-2 rounded-full group-hover:bg-white/20 transition-colors">
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                </motion.button>
                            );
                        })}
                    </motion.div>
                )}

                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsFabOpen(!isFabOpen)}
                    className={`p-4 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 ${isFabOpen
                        ? "bg-red-500 hover:bg-red-600 rotate-90"
                        : "bg-blue-600 hover:bg-blue-700"
                        }`}
                >
                    {isFabOpen ? (
                        <X className="w-6 h-6 text-white" />
                    ) : (
                        <Plus className="w-6 h-6 text-white" />
                    )}
                </motion.button>
            </div>
        </div>
    );
};

export default Dashboard;
