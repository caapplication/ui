import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, CreditCard, FileText, Calculator, ShieldAlert, FolderKey, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getAgencyBillingSummary } from '@/lib/api/finance';
import { format, parseISO } from 'date-fns';

const MODULE_ICON_MAP = {
    'Finance Module': <Calculator className="w-5 h-5 text-purple-400" />,
    'Document Repository': <FolderKey className="w-5 h-5 text-blue-400" />,
    'Legal Notices Repository': <ShieldAlert className="w-5 h-5 text-amber-400" />,
};

const FynivoBillingContent = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchBillingSummary = useCallback(async () => {
        if (!user?.access_token) return;
        setIsLoading(true);
        try {
            const result = await getAgencyBillingSummary(user.access_token);
            setData(result);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load Fynivo billing summary.' });
        } finally {
            setIsLoading(false);
        }
    }, [user?.access_token, toast]);

    useEffect(() => {
        fetchBillingSummary();
    }, [fetchBillingSummary]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-400">
                <AlertCircle className="w-10 h-10" />
                <p>Could not load billing information.</p>
                <Button variant="outline" size="sm" onClick={fetchBillingSummary}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Current Month Overview */}
                <Card className="lg:col-span-2 border-white/10 bg-gray-900/50">
                    <CardHeader className="pb-4 border-b border-white/5">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl text-white">Current Month Estimate</CardTitle>
                                <CardDescription className="text-gray-400">
                                    Billing cycle: {data.current_month}
                                </CardDescription>
                            </div>
                            <Badge className="bg-primary/20 text-primary hover:bg-primary/30">Unbilled</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Estimated Total (Due 1st Next Month)</p>
                                <h2 className="text-4xl font-bold text-white">₹{data.total_addon_fee.toFixed(0)}</h2>
                            </div>
                            <div className="hidden sm:block text-right">
                                <p className="text-sm text-gray-400 mb-1">Total Active Add-ons</p>
                                <p className="text-xl font-semibold text-white">{data.total_active_modules} Modules</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Usage Breakdown</h4>
                            {data.module_breakdown.length > 0 ? (
                                <div className="space-y-3">
                                    {data.module_breakdown.map((mod, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-white/5">
                                            <div className="flex items-center gap-3">
                                                {MODULE_ICON_MAP[mod.name] || <Calculator className="w-5 h-5 text-gray-400" />}
                                                <div>
                                                    <p className="font-medium text-white">{mod.name}</p>
                                                    <p className="text-xs text-gray-400">{mod.count} Client{mod.count > 1 ? 's' : ''} × ₹{mod.price}/mo</p>
                                                </div>
                                            </div>
                                            <p className="font-medium text-white">₹{mod.total.toFixed(0)}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-gray-500 border border-dashed border-white/10 rounded-lg">
                                    No paid add-on modules active this month.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column */}
                <div className="space-y-6">
                    <Card className="border-white/10 bg-gray-900/50">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Payment Method</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-800 border border-white/10 mb-4">
                                <div className="p-2 bg-white rounded">
                                    <CreditCard className="w-6 h-6 text-gray-900" />
                                </div>
                                <div>
                                    <p className="font-medium text-white">Offline / Bank Transfer</p>
                                    <p className="text-xs text-gray-400">Contact Fynivo admin</p>
                                </div>
                            </div>
                            <Button className="w-full" variant="outline" disabled>
                                Update Payment Method (Soon)
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-gradient-to-br from-primary/20 to-indigo-900/20">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Need more modules?</CardTitle>
                            <CardDescription className="text-gray-300">
                                Enable features for specific clients from their profile's Subscriptions tab.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>

            {/* Client-wise Breakdown & Invoice History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Client-wise Breakdown */}
                <Card className="border-white/10 bg-gray-900/50">
                    <CardHeader>
                        <CardTitle className="text-xl text-white">Client-wise Cost (This Month)</CardTitle>
                        <CardDescription className="text-gray-400">Track which clients drive your Fynivo add-on costs.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.client_breakdown.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-white/10 hover:bg-transparent">
                                            <TableHead className="text-gray-400">Client</TableHead>
                                            <TableHead className="text-gray-400">Active Modules</TableHead>
                                            <TableHead className="text-right text-gray-400">Cost</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.client_breakdown.map((c, i) => (
                                            <TableRow key={i} className="border-white/5 hover:bg-white/5">
                                                <TableCell className="font-medium text-white">{c.client_name || c.entity_id?.slice(0, 8) + '…'}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {c.modules.map((m, j) => (
                                                            <Badge key={j} variant="outline" className="text-xs border-white/10 text-gray-300 bg-gray-800">{m}</Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-white">₹{c.total.toFixed(0)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-gray-500">
                                No client-level modules active.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Invoice History */}
                <Card className="border-white/10 bg-gray-900/50">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl text-white">Invoice History</CardTitle>
                                <CardDescription className="text-gray-400">Past billing statements from Fynivo.</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={fetchBillingSummary} className="text-gray-400 hover:text-white">
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {data.invoice_history.length > 0 ? (
                            <div className="space-y-3">
                                {data.invoice_history.map((inv, i) => {
                                    const isPaid = inv.status === 'paid';
                                    const billingDate = inv.billing_month ? format(parseISO(inv.billing_month), 'MMM yyyy') : '—';
                                    const paidDate = inv.paid_at ? format(parseISO(inv.paid_at), 'dd MMM yyyy') : null;
                                    return (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-gray-800/30 hover:bg-gray-800/80 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full shrink-0 ${isPaid ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                                    <FileText className={`w-5 h-5 ${isPaid ? 'text-emerald-400' : 'text-red-400'}`} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{billingDate}</p>
                                                    <p className="text-sm text-gray-400">
                                                        {inv.invoice_number}
                                                        {paidDate && <span className="ml-1">• Paid {paidDate}</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="font-bold text-white">₹{Number(inv.total_amount).toFixed(0)}</p>
                                                    <Badge className={`text-xs border-0 ${isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {inv.status}
                                                    </Badge>
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" disabled>
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-gray-500">
                                No invoices yet. Your first bill will appear here after the end of this month.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default FynivoBillingContent;
