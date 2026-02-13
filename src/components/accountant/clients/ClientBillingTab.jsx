import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Save, Zap } from 'lucide-react';
import { getClientBillingSetup, createOrUpdateClientBilling, bulkUpdateServiceBillings, generateInvoicesNow } from '@/lib/api';

const ClientBillingTab = ({ client, allServices }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingInvoices, setIsGeneratingInvoices] = useState(false);
    // Billing setup state
    const [billingData, setBillingData] = useState({
        billing_head: '',
        monthly_charges_ex_gst: 0,
        gst_percent: 0,
        gst_amount: 0,
        invoice_amount: 0,
        hsn_sac_code: '',
        invoice_generate_day: null,
    });
    
    // Service billings state - map of service_id -> bill_amount
    const [serviceBillings, setServiceBillings] = useState(new Map());
    const [initialServiceBillings, setInitialServiceBillings] = useState(new Map());

    useEffect(() => {
        const loadData = async () => {
            if (!user?.agency_id || !user?.access_token || !client?.id) return;
            setIsLoading(true);
            try {
                const billingSetup = await getClientBillingSetup(client.id, user.agency_id, user.access_token).catch(() => ({ billing: null, service_billings: [] }));
                
                if (billingSetup?.billing) {
                    setBillingData({
                        billing_head: billingSetup.billing.billing_head || '',
                        monthly_charges_ex_gst: parseFloat(billingSetup.billing.monthly_charges_ex_gst || 0),
                        gst_percent: parseFloat(billingSetup.billing.gst_percent || 0),
                        gst_amount: parseFloat(billingSetup.billing.gst_amount || 0),
                        invoice_amount: parseFloat(billingSetup.billing.invoice_amount || 0),
                        hsn_sac_code: billingSetup.billing.hsn_sac_code || '',
                        invoice_generate_day: billingSetup.billing.invoice_generate_day || null,
                    });
                }
                
                // Initialize service billings from availed services
                const billingsMap = new Map();
                if (billingSetup?.service_billings) {
                    billingSetup.service_billings.forEach(sb => {
                        billingsMap.set(sb.service_id, parseFloat(sb.bill_amount || 0));
                    });
                }
                
                // Also add any availed services that don't have billing yet
                if (client.availedServices) {
                    client.availedServices.forEach(service => {
                        if (!billingsMap.has(service.service_id || service.id)) {
                            billingsMap.set(service.service_id || service.id, 0);
                        }
                    });
                }
                
                setServiceBillings(new Map(billingsMap));
                setInitialServiceBillings(new Map(billingsMap));
            } catch (error) {
                toast({
                    title: 'Error loading billing setup',
                    description: error.message,
                    variant: 'destructive',
                });
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [client?.id, client?.availedServices, user?.agency_id, user?.access_token, toast]);

    // Calculate total monthly charges from service billings
    const totalServiceBillings = useMemo(() => {
        let total = 0;
        serviceBillings.forEach(amount => {
            total += amount || 0;
        });
        return total;
    }, [serviceBillings]);

    // Update monthly charges when service billings change
    useEffect(() => {
        if (totalServiceBillings > 0) {
            setBillingData(prev => ({
                ...prev,
                monthly_charges_ex_gst: totalServiceBillings,
            }));
        }
    }, [totalServiceBillings]);

    // Calculate GST and Invoice amounts when monthly charges or GST% changes
    useEffect(() => {
        const monthlyCharges = billingData.monthly_charges_ex_gst || 0;
        const gstPercent = billingData.gst_percent || 0;
        const gstAmount = (monthlyCharges * gstPercent) / 100;
        const invoiceAmount = monthlyCharges + gstAmount;
        
        setBillingData(prev => ({
            ...prev,
            gst_amount: parseFloat(gstAmount.toFixed(2)),
            invoice_amount: parseFloat(invoiceAmount.toFixed(2)),
        }));
    }, [billingData.monthly_charges_ex_gst, billingData.gst_percent]);

    const handleBillingChange = (field, value) => {
        setBillingData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleServiceBillingChange = (serviceId, amount) => {
        const numAmount = parseFloat(amount) || 0;
        setServiceBillings(prev => {
            const newMap = new Map(prev);
            newMap.set(serviceId, numAmount);
            return newMap;
        });
    };

    const hasChanges = useMemo(() => {
        // Check billing data changes
        const hasBillingChanges = billingData.monthly_charges_ex_gst !== 0 || 
                                 billingData.gst_percent !== 0 ||
                                 billingData.billing_head !== '' ||
                                 billingData.hsn_sac_code !== '' ||
                                 billingData.invoice_generate_day !== null;
        
        // Check service billing changes
        if (serviceBillings.size !== initialServiceBillings.size) return true;
        for (const [serviceId, amount] of serviceBillings) {
            const initialAmount = initialServiceBillings.get(serviceId) || 0;
            if (amount !== initialAmount) return true;
        }
        
        return hasBillingChanges;
    }, [billingData, serviceBillings, initialServiceBillings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save billing setup
            if (hasChanges) {
                await createOrUpdateClientBilling(
                    client.id,
                    {
                        billing_head: billingData.billing_head || null,
                        monthly_charges_ex_gst: billingData.monthly_charges_ex_gst,
                        gst_percent: billingData.gst_percent,
                        hsn_sac_code: billingData.hsn_sac_code || null,
                        invoice_generate_day: billingData.invoice_generate_day || null,
                    },
                    user.agency_id,
                    user.access_token
                );
            }
            
            // Save service billings
            const serviceBillingArray = Array.from(serviceBillings.entries()).map(([service_id, bill_amount]) => ({
                service_id,
                bill_amount,
            }));
            
            if (serviceBillingArray.length > 0) {
                await bulkUpdateServiceBillings(
                    client.id,
                    serviceBillingArray,
                    user.agency_id,
                    user.access_token
                );
            }
            
            setInitialServiceBillings(new Map(serviceBillings));
            toast({
                title: '✅ Billing Setup Saved',
                description: 'Billing configuration has been saved successfully.',
            });
        } catch (error) {
            toast({
                title: 'Error saving billing setup',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateInvoicesNow = async () => {
        if (!user?.access_token || !user?.agency_id || !client?.id) return;
        
        setIsGeneratingInvoices(true);
        try {
            const result = await generateInvoicesNow(client.id, user.agency_id, user.access_token);
            toast({
                title: 'Success',
                description: `Generated ${result.invoices_created || 0} invoice(s) successfully`,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to generate invoices',
                variant: 'destructive',
            });
        } finally {
            setIsGeneratingInvoices(false);
        }
    };

    const availedServices = useMemo(() => {
        if (!client?.availedServices || !allServices) return [];
        const serviceIds = new Set(client.availedServices.map(s => s.service_id || s.id));
        return allServices.filter(s => serviceIds.has(s.id));
    }, [client?.availedServices, allServices]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Box 1: Availed Services with Bill Amounts */}
                <div className="glass-pane p-4 rounded-lg flex flex-col">
                    <h3 className="text-lg font-semibold mb-4 px-2">Availed Services</h3>
                    <div className="space-y-3 flex-grow overflow-y-auto max-h-[500px] p-2">
                        {availedServices.length === 0 ? (
                            <p className="text-center text-gray-500 py-4 text-sm">No services availed yet. Add services in the Services tab.</p>
                        ) : (
                            availedServices.map(service => (
                                <div key={service.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-white truncate">{service.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <span className="text-xs text-gray-400">₹</span>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={serviceBillings.get(service.id) || 0}
                                            onChange={(e) => handleServiceBillingChange(service.id, e.target.value)}
                                            className="w-24 h-8 text-sm"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Box 2: Billing Calculations */}
                <div className="glass-pane p-4 rounded-lg flex flex-col">
                    <h3 className="text-lg font-semibold mb-4 px-2">Billing Setup</h3>
                    <div className="space-y-4 flex-grow">
                        <div>
                            <Label htmlFor="billing_head" className="text-sm">Billing Head</Label>
                            <Input
                                id="billing_head"
                                type="text"
                                placeholder="Enter billing head"
                                value={billingData.billing_head || ''}
                                onChange={(e) => handleBillingChange('billing_head', e.target.value)}
                                className="glass-input"
                            />
                        </div>

                        <div>
                            <Label htmlFor="monthly_charges" className="text-sm">Monthly Charges (Ex GST)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                                <Input
                                    id="monthly_charges"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={billingData.monthly_charges_ex_gst}
                                    onChange={(e) => handleBillingChange('monthly_charges_ex_gst', parseFloat(e.target.value) || 0)}
                                    className="glass-input pl-8"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                Total from services: ₹{totalServiceBillings.toFixed(2)}
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="gst_percent" className="text-sm">GST%</Label>
                            <Select
                                value={String(billingData.gst_percent)}
                                onValueChange={(v) => handleBillingChange('gst_percent', parseFloat(v))}
                            >
                                <SelectTrigger className="glass-input">
                                    <SelectValue placeholder="Select GST%" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">0%</SelectItem>
                                    <SelectItem value="5">5%</SelectItem>
                                    <SelectItem value="12">12%</SelectItem>
                                    <SelectItem value="18">18%</SelectItem>
                                    <SelectItem value="28">28%</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="gst_amount" className="text-sm">GST Amount</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                                <Input
                                    id="gst_amount"
                                    type="number"
                                    value={billingData.gst_amount.toFixed(2)}
                                    readOnly
                                    className="glass-input pl-8 bg-white/5"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Calculated: Monthly Charges × GST%</p>
                        </div>

                        <div>
                            <Label htmlFor="invoice_amount" className="text-sm">Invoice Amount</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                                <Input
                                    id="invoice_amount"
                                    type="number"
                                    value={billingData.invoice_amount.toFixed(2)}
                                    readOnly
                                    className="glass-input pl-8 bg-white/5"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Calculated: Monthly Charges + GST Amount</p>
                        </div>

                        <div>
                            <Label htmlFor="hsn_sac_code" className="text-sm">HSN/SAC Code</Label>
                            <Input
                                id="hsn_sac_code"
                                value={billingData.hsn_sac_code}
                                onChange={(e) => handleBillingChange('hsn_sac_code', e.target.value)}
                                className="glass-input"
                                placeholder="Enter HSN/SAC code"
                            />
                        </div>

                        <div>
                            <Label htmlFor="invoice_generate_day" className="text-sm">Invoice Generate Date</Label>
                            <Select
                                value={billingData.invoice_generate_day ? String(billingData.invoice_generate_day) : 'not-set'}
                                onValueChange={(v) => handleBillingChange('invoice_generate_day', v && v !== 'not-set' ? parseInt(v) : null)}
                            >
                                <SelectTrigger className="glass-input">
                                    <SelectValue placeholder="Select day of month" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="not-set">Not set</SelectItem>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                        <SelectItem key={day} value={String(day)}>
                                            Day {day}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-400 mt-1">Day of month when invoice should auto-generate</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mt-4">
                {/* Development button - Create Bill Right Now */}
                {billingData.invoice_generate_day && (
                    <Button 
                        onClick={handleGenerateInvoicesNow} 
                        disabled={isGeneratingInvoices || isSaving}
                        variant="outline"
                        className="bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/50 text-yellow-400"
                    >
                        {isGeneratingInvoices && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {!isGeneratingInvoices && <Zap className="mr-2 h-4 w-4" />}
                        Create Bill Right Now
                        <span className="ml-2 text-xs opacity-75">(Dev Only)</span>
                    </Button>
                )}
                
                <div className="flex gap-2 ml-auto">
                    <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Billing Setup
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ClientBillingTab;
