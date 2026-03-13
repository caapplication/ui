import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, CreditCard, AlertCircle, FileText, CheckCircle2, Calculator, ShieldAlert, FolderKey } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const MOCK_CURRENT_BILL = {
    month: "March 2026",
    status: "Unbilled (Current)",
    base_fee: 0,
    modules: [
        { name: "Finance Module", count: 3, price: 1000, total: 3000 },
        { name: "Document Repository", count: 4, price: 500, total: 2000 },
        { name: "Legal Notices", count: 1, price: 500, total: 500 }
    ],
    total: 5500
};

const MOCK_CLIENT_BREAKDOWN = [
    { id: 1, name: "The Abduz", modules: ["Finance", "Documents"], total: 1500 },
    { id: 2, name: "Dev 2", modules: ["Documents", "Legal Notices"], total: 1000 },
    { id: 3, name: "B.R Sobti and Co.", modules: ["Finance"], total: 1000 },
    { id: 4, name: "Spic N Span", modules: ["Finance", "Documents"], total: 1500 },
    { id: 5, name: "Crystalakmo", modules: ["Documents"], total: 500 },
];

const MOCK_INVOICE_HISTORY = [
    { id: "INV-2026-02", date: "01 Mar 2026", amount: 4500, status: "Paid", paidOn: "03 Mar 2026" },
    { id: "INV-2026-01", date: "01 Feb 2026", amount: 4000, status: "Paid", paidOn: "02 Feb 2026" },
    { id: "INV-2025-12", date: "01 Jan 2026", amount: 3500, status: "Paid", paidOn: "05 Jan 2026" },
];

const FynivoBillingContent = () => {
    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Alert for upcoming/overdue payments (Hidden by default, shown for demo) */}
            {/* <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-red-400 font-medium">Payment Overdue</h3>
                    <p className="text-sm text-red-400/80 mt-1">
                        Your bill for February 2026 (₹4,500) is overdue. Please pay immediately to avoid service interruption for your clients.
                    </p>
                    <Button variant="destructive" size="sm" className="mt-3">Pay ₹4,500 Now</Button>
                </div>
            </div> */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Current Month Overview */}
                <Card className="lg:col-span-2 border-white/10 bg-gray-900/50">
                    <CardHeader className="pb-4 border-b border-white/5">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl text-white">Current Month Estimate</CardTitle>
                                <CardDescription className="text-gray-400">
                                    Billing cycle: 01 {MOCK_CURRENT_BILL.month.split(' ')[0]} - 31 {MOCK_CURRENT_BILL.month.split(' ')[0]}
                                </CardDescription>
                            </div>
                            <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                                Unbilled
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Estimated Total (Due on 1st Next Month)</p>
                                <h2 className="text-4xl font-bold text-white">₹{MOCK_CURRENT_BILL.total}</h2>
                            </div>
                            <div className="hidden sm:block text-right">
                                <p className="text-sm text-gray-400 mb-1">Total Active Add-ons</p>
                                <p className="text-xl font-semibold text-white">
                                    {MOCK_CURRENT_BILL.modules.reduce((acc, curr) => acc + curr.count, 0)} Modules
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Usage Breakdown</h4>
                            <div className="space-y-3">
                                {MOCK_CURRENT_BILL.modules.map((mod, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            {mod.name === "Finance Module" && <Calculator className="w-5 h-5 text-purple-400" />}
                                            {mod.name === "Document Repository" && <FolderKey className="w-5 h-5 text-blue-400" />}
                                            {mod.name === "Legal Notices" && <ShieldAlert className="w-5 h-5 text-amber-400" />}
                                            <div>
                                                <p className="font-medium text-white">{mod.name}</p>
                                                <p className="text-xs text-gray-400">{mod.count} Clients × ₹{mod.price}/mo</p>
                                            </div>
                                        </div>
                                        <p className="font-medium text-white">₹{mod.total}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions & Payment Method */}
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
                                    <p className="font-medium text-white">HDFC Bank ****4589</p>
                                    <p className="text-xs text-gray-400">Primary Method</p>
                                </div>
                            </div>
                            <Button className="w-full" variant="outline">Update Payment Method</Button>
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-gradient-to-br from-primary/20 to-indigo-900/20">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Need more modules?</CardTitle>
                            <CardDescription className="text-gray-300">
                                You can enable features for specific clients directly from their profile pages.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full bg-primary hover:bg-primary/90">Go to Clients List</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Client Wise Breakdown & Invoice History Tabs (Simplified as stacked sections for static UI) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Client-wise Breakdown */}
                <Card className="border-white/10 bg-gray-900/50">
                    <CardHeader>
                        <CardTitle className="text-xl text-white">Client-wise Cost (This Month)</CardTitle>
                        <CardDescription className="text-gray-400">Track which clients are driving your Fynivo costs to bill them accordingly.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/10 hover:bg-transparent">
                                        <TableHead className="text-gray-400">Client Name</TableHead>
                                        <TableHead className="text-gray-400">Active Modules</TableHead>
                                        <TableHead className="text-right text-gray-400">Total Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {MOCK_CLIENT_BREAKDOWN.map((client) => (
                                        <TableRow key={client.id} className="border-white/5 hover:bg-white/5">
                                            <TableCell className="font-medium text-white">{client.name}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {client.modules.map((m, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs border-white/10 text-gray-300 bg-gray-800">
                                                            {m}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-white">₹{client.total}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Invoice History */}
                <Card className="border-white/10 bg-gray-900/50">
                    <CardHeader>
                        <CardTitle className="text-xl text-white">Invoice History</CardTitle>
                        <CardDescription className="text-gray-400">Past billing statements and payment receipts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {MOCK_INVOICE_HISTORY.map((invoice, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-gray-800/30 hover:bg-gray-800/80 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-emerald-500/10 rounded-full shrink-0">
                                            <FileText className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{invoice.date}</p>
                                            <p className="text-sm text-gray-400">{invoice.id} • Paid on {invoice.paidOn}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="font-bold text-white">₹{invoice.amount}</p>
                                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default FynivoBillingContent;
