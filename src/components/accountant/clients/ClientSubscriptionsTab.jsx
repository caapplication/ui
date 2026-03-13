import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, ShieldAlert, FolderKey, Calculator } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const MOCK_MODULES = [
    {
        id: 1,
        name: 'Core Basic & Tasks',
        description: 'Onboard Clients, Map Services, Configure billings, and Task Management.',
        is_default_free: true,
        monthly_price_inr: 0,
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        is_active: true
    },
    {
        id: 2,
        name: 'Document Repository',
        description: 'Give this client access to upload, share and manage documents securely.',
        is_default_free: false,
        monthly_price_inr: 500,
        icon: <FolderKey className="w-5 h-5 text-blue-400" />,
        is_active: true
    },
    {
        id: 3,
        name: 'Legal Notices Repository',
        description: 'Manage and track all legal notices related to this client in one place.',
        is_default_free: false,
        monthly_price_inr: 500,
        icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
        is_active: false
    },
    {
        id: 4,
        name: 'Finance Module',
        description: 'Vouchers, Purchase invoices, Bank tally, Cash tally, DFR management.',
        is_default_free: false,
        monthly_price_inr: 1000,
        icon: <Calculator className="w-5 h-5 text-purple-400" />,
        is_active: false
    }
];

const ClientSubscriptionsTab = ({ client }) => {
    const { toast } = useToast();
    const [modules, setModules] = useState(MOCK_MODULES);
    const [isSaving, setIsSaving] = useState(false);

    const handleToggle = (id) => {
        setModules(modules.map(mod => {
            if (mod.id === id && !mod.is_default_free) {
                const newStatus = !mod.is_active;
                if (newStatus) {
                    toast({
                        title: "Module Enabled",
                        description: `₹${mod.monthly_price_inr}/month will be added to your Fynivo Billing for this client.`,
                    });
                } else {
                    toast({
                        title: "Module Disabled",
                        description: "This module will be canceled from the next billing cycle.",
                    });
                }
                return { ...mod, is_active: newStatus };
            }
            return mod;
        }));
    };

    const handleSave = () => {
        setIsSaving(true);
        // Simulate API call
        setTimeout(() => {
            setIsSaving(false);
            toast({
                title: "Subscriptions Updated",
                description: "Client module access has been successfully updated.",
            });
        }, 1000);
    };

    const activePaidCount = modules.filter(m => !m.is_default_free && m.is_active).length;
    const totalAdditionalCost = modules.filter(m => !m.is_default_free && m.is_active).reduce((sum, mod) => sum + mod.monthly_price_inr, 0);

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4 flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-sky-400 shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-sky-400 font-medium">Manage Fynivo Modules</h3>
                    <p className="text-sm text-sky-400/80 mt-1">
                        Enable or disable add-on modules for <span className="font-semibold text-white">{client?.name || 'this client'}</span>.
                        Enabling a paid module will automatically attach the cost to your monthly CA Fynivo Software Billing.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {modules.map((mod) => (
                    <Card key={mod.id} className={`border-white/10 bg-gray-900/50 transition-colors ${mod.is_active && !mod.is_default_free ? 'border-primary/50 bg-primary/5' : ''}`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-800 rounded-md border border-white/5">
                                    {mod.icon}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg text-white">{mod.name}</CardTitle>
                                        {mod.is_default_free ? (
                                            <Badge variant="secondary" className="bg-gray-700 hover:bg-gray-600 text-xs">Included</Badge>
                                        ) : mod.is_active ? (
                                            <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0 text-xs">Active</Badge>
                                        ) : null}
                                    </div>
                                    <CardDescription className="text-sm text-gray-400 mt-1">
                                        {mod.description}
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {!mod.is_default_free ? (
                                    <>
                                        <div className="font-medium text-white">₹{mod.monthly_price_inr} <span className="text-xs text-gray-500 font-normal">/ mo</span></div>
                                        <Switch
                                            checked={mod.is_active}
                                            onCheckedChange={() => handleToggle(mod.id)}
                                            className={mod.is_active ? "data-[state=checked]:bg-primary" : "data-[state=unchecked]:bg-gray-600"}
                                        />
                                    </>
                                ) : (
                                    <div className="text-sm font-medium text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4" /> Default Free
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            <div className="glass-pane p-4 rounded-lg flex items-center justify-between mt-8 sticky bottom-0 border-t border-white/10 bg-gray-900/90 backdrop-blur-md">
                <div>
                    <h4 className="text-sm text-gray-400">Monthly Add-on Billing</h4>
                    <p className="text-xl font-bold text-white">₹{totalAdditionalCost} <span className="text-sm font-normal text-gray-500">/ month</span></p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
                    {isSaving ? 'Saving...' : 'Save Subscriptions'}
                </Button>
            </div>
        </div>
    );
};

export default ClientSubscriptionsTab;
