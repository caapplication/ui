import React, { useState, useEffect, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, ShieldAlert, FolderKey, Calculator, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getClientSubscriptions, toggleClientModule } from '@/lib/api/finance';

const MODULE_ICONS = {
    'Core Basic & Tasks': <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    'Document Repository': <FolderKey className="w-5 h-5 text-blue-400" />,
    'Legal Notices Repository': <ShieldAlert className="w-5 h-5 text-amber-400" />,
    'Finance Module': <Calculator className="w-5 h-5 text-purple-400" />,
};

const ClientSubscriptionsTab = ({ client }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [modules, setModules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [togglingId, setTogglingId] = useState(null);

    const fetchSubscriptions = useCallback(async () => {
        if (!client?.id || !user?.access_token) return;
        setIsLoading(true);
        try {
            const data = await getClientSubscriptions(client.id, user.access_token);
            setModules(Array.isArray(data) ? data : []);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load module subscriptions.' });
        } finally {
            setIsLoading(false);
        }
    }, [client?.id, user?.access_token, toast]);

    useEffect(() => {
        fetchSubscriptions();
    }, [fetchSubscriptions]);

    const handleToggle = async (mod) => {
        if (mod.is_default_free || togglingId) return;
        setTogglingId(mod.id);
        try {
            const result = await toggleClientModule(client.id, mod.id, user.access_token);

            // Optimistically update the local state
            setModules(prev => prev.map(m => {
                if (m.id !== mod.id) return m;
                // If action was "activated" → is_active = true
                // If action was "scheduled_cancel" or "reactivated" → keep active but flip cancel flag
                const isNowActive = result.action === 'activated' || result.action === 'reactivated';
                const isNowInactive = result.action === 'scheduled_cancel';
                return {
                    ...m,
                    is_active: isNowInactive ? m.is_active : isNowActive,
                    cancel_at_period_end: result.action === 'scheduled_cancel',
                };
            }));

            const isPositive = result.action === 'activated' || result.action === 'reactivated';
            toast({
                title: isPositive ? 'Module Enabled ✅' : 'Module Scheduled for Removal',
                description: result.message,
            });
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Failed to toggle module',
                description: err?.message || 'Please try again.',
            });
        } finally {
            setTogglingId(null);
        }
    };

    const activePaidModules = modules.filter(m => !m.is_default_free && m.is_active);
    const totalAdditionalCost = activePaidModules.reduce((sum, m) => sum + (m.monthly_price_inr || 0), 0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Info Banner */}
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

            {/* Modules List */}
            <div className="space-y-4">
                {modules.map((mod) => {
                    const isToggling = togglingId === mod.id;
                    const cancelPending = mod.cancel_at_period_end;
                    return (
                        <Card
                            key={mod.id}
                            className={`border-white/10 bg-gray-900/50 transition-colors 
                                ${mod.is_active && !mod.is_default_free ? 'border-primary/40 bg-primary/5' : ''}
                                ${cancelPending ? 'border-amber-500/30 bg-amber-500/5' : ''}
                            `}
                        >
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-800 rounded-md border border-white/5">
                                        {MODULE_ICONS[mod.name] || <CheckCircle2 className="w-5 h-5 text-gray-400" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <CardTitle className="text-lg text-white">{mod.name}</CardTitle>
                                            {mod.is_default_free ? (
                                                <Badge variant="secondary" className="bg-gray-700 hover:bg-gray-600 text-xs">Included</Badge>
                                            ) : mod.is_active && !cancelPending ? (
                                                <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0 text-xs">Active</Badge>
                                            ) : cancelPending ? (
                                                <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-0 text-xs">Cancels End of Cycle</Badge>
                                            ) : null}
                                        </div>
                                        <CardDescription className="text-sm text-gray-400 mt-1">{mod.description}</CardDescription>
                                        {cancelPending && (
                                            <p className="text-xs text-amber-400/80 mt-1">
                                                ⚠️ This module will remain active until the end of the current billing cycle.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    {!mod.is_default_free ? (
                                        <>
                                            <div className="font-medium text-white">
                                                ₹{mod.monthly_price_inr} <span className="text-xs text-gray-500 font-normal">/ mo</span>
                                            </div>
                                            {isToggling ? (
                                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                            ) : (
                                                <Switch
                                                    checked={mod.is_active}
                                                    onCheckedChange={() => handleToggle(mod)}
                                                    disabled={!!togglingId}
                                                    className={mod.is_active ? 'data-[state=checked]:bg-primary' : 'data-[state=unchecked]:bg-gray-600'}
                                                />
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-sm font-medium text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Default Free
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                        </Card>
                    );
                })}
            </div>

            {/* Billing Footer */}
            <div className="p-4 rounded-lg flex items-center justify-between sticky bottom-0 border-t border-white/10 bg-gray-900/90 backdrop-blur-md">
                <div>
                    <h4 className="text-sm text-gray-400">Monthly Add-on Billing for this Client</h4>
                    <p className="text-xl font-bold text-white">
                        ₹{totalAdditionalCost} <span className="text-sm font-normal text-gray-500">/ month</span>
                    </p>
                    {activePaidModules.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">{activePaidModules.length} paid module{activePaidModules.length > 1 ? 's' : ''} active</p>
                    )}
                </div>
                <Button onClick={fetchSubscriptions} variant="outline" size="sm">
                    Refresh
                </Button>
            </div>
        </div>
    );
};

export default ClientSubscriptionsTab;
