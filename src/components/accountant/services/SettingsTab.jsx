import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Briefcase, FileText, Settings as SettingsIcon, Bell, IndianRupee, Percent, FilePlus, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from '@/hooks/useAuth.jsx';
import { updateServiceSettings, getServiceDetails } from '@/lib/api';

const SectionWrapper = ({ icon, title, children, className }) => {
    const IconComponent = icon;
    return (
        <motion.div 
            className={cn("glass-pane p-6 rounded-2xl border-l-4 border-primary/50", className)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/30 to-primary/10 rounded-xl flex items-center justify-center shadow-inner-glow">
                    <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-white tracking-wider">{title}</h3>
            </div>
            <div className="space-y-6">
                {children}
            </div>
        </motion.div>
    );
};

const SettingsTab = ({ service, onUpdate }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    
    const [isRecurring, setIsRecurring] = useState(service?.is_recurring || false);
    const [createDocRequest, setCreateDocRequest] = useState(service?.create_document_collection_request_automatically || false);
    const [targetDate, setTargetDate] = useState(service?.target_date_creation_date ? new Date(service.target_date_creation_date) : null);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        const payload = {
            name: data.serviceName,
            is_enabled: data.isEnabled === 'on',
            is_checklist_completion_required: data.isChecklistRequired === 'on',
            is_recurring: data.isRecurring === 'on',
            auto_task_creation_frequency: data.isRecurring === 'on' ? data.frequency : null,
            target_date_creation_date: targetDate ? targetDate.toISOString() : null,
            assign_auto_tasks_to_users_of_respective_clients: data.assignToClients === 'on',
            // assign_auto_tasks_to_users: data.assignToClients !== 'on' ? data.assignToUsers : [],
            create_document_collection_request_automatically: data.createDocRequest === 'on',
            document_request_default_message: data.createDocRequest === 'on' ? data.docRequestMessage : null,
            billing_sac_code: data.sacCode,
            billing_gst_percent: data.gst,
            billing_default_rate: data.billingRate,
            billing_default_billable: data.markBillable === 'on',
        };

        try {
            await updateServiceSettings(service.id, payload, user.agency_id, user.access_token);
            const updatedService = await getServiceDetails(service.id, user.agency_id, user.access_token);
            onUpdate(updatedService);
            toast({
                title: "✅ Success",
                description: "Service settings saved successfully.",
            });
        } catch(error) {
            toast({
                title: "❌ Error",
                description: `Failed to save settings: ${error.message}`,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <form onSubmit={handleSave} className="flex-grow space-y-8 overflow-y-auto no-scrollbar p-2">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <SectionWrapper icon={Briefcase} title="Basic Details">
                            <div>
                                <Label htmlFor="serviceName">Service Name <span className="text-red-500">*</span></Label>
                                <Input id="serviceName" name="serviceName" defaultValue={service?.name} className="glass-input mt-2" required />
                            </div>
                        </SectionWrapper>

                        <SectionWrapper icon={SettingsIcon} title="Service Configuration">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                                    <Label htmlFor="isChecklistRequired" className="flex items-center gap-2">Is Checklist Completion Required? <Info className="w-4 h-4 text-gray-400" /></Label>
                                    <Switch id="isChecklistRequired" name="isChecklistRequired" defaultChecked={service?.is_checklist_completion_required} />
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                                    <Label htmlFor="isRecurring">Is Recurring?</Label>
                                    <Switch id="isRecurring" name="isRecurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
                                </div>
                            </div>
                        </SectionWrapper>
                    </div>
                    <div className="lg:col-span-1 space-y-8">
                         <SectionWrapper icon={FileText} title="Status">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                                <Label htmlFor="isEnabled">Is Enabled?</Label>
                                <Switch id="isEnabled" name="isEnabled" defaultChecked={service?.is_enabled ?? true} />
                            </div>
                        </SectionWrapper>
                        <SectionWrapper icon={FilePlus} title="Document Request">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="createDocRequest" className="text-sm">Auto-create Request?</Label>
                                <Switch id="createDocRequest" name="createDocRequest" checked={createDocRequest} onCheckedChange={setCreateDocRequest} />
                            </div>
                            <AnimatePresence>
                                {createDocRequest && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <Label htmlFor="docRequestMessage">Default Message <span className="text-red-500">*</span></Label>
                                        <Textarea id="docRequestMessage" name="docRequestMessage" className="glass-input mt-2" placeholder="Please upload documents..." defaultValue={service?.document_request_default_message}/>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </SectionWrapper>
                    </div>
                </div>
                
                <AnimatePresence>
                    {isRecurring && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="overflow-hidden"
                        >
                            <SectionWrapper icon={Bell} title="Recurring Task Settings">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <div>
                                        <Label htmlFor="frequency">Auto Task Creation Frequency <span className="text-red-500">*</span></Label>
                                        <Select name="frequency" defaultValue={service?.auto_task_creation_frequency}>
                                            <SelectTrigger id="frequency" className="glass-input mt-2"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                                <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                                                <SelectItem value="yearly">Yearly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Target Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal glass-input mt-2",
                                                        !targetDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {targetDate ? format(targetDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 glass-pane">
                                                <Calendar
                                                    mode="single"
                                                    selected={targetDate}
                                                    onSelect={setTargetDate}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-3 p-3 rounded-lg bg-black/20">
                                        <Switch id="assignToClients" name="assignToClients" defaultChecked={service?.assign_auto_tasks_to_users_of_respective_clients}/>
                                        <Label htmlFor="assignToClients">Assign Auto Tasks to Users of Respective Clients</Label>
                                    </div>
                                </div>
                            </SectionWrapper>
                        </motion.div>
                    )}
                </AnimatePresence>

                <SectionWrapper icon={IndianRupee} title="Billing Settings">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <Label htmlFor="sacCode">SAC Code</Label>
                            <Input id="sacCode" name="sacCode" className="glass-input mt-2" defaultValue={service?.billing_sac_code} />
                        </div>
                        <div>
                             <Label htmlFor="gst">GST % <span className="text-red-500">*</span></Label>
                            <div className="relative mt-2">
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Select name="gst" defaultValue={service?.billing_gst_percent?.toString()}>
                                    <SelectTrigger id="gst" className="glass-input pl-10"><SelectValue placeholder="Select GST" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">0%</SelectItem>
                                        <SelectItem value="5">5%</SelectItem>
                                        <SelectItem value="12">12%</SelectItem>
                                        <SelectItem value="18">18%</SelectItem>
                                        <SelectItem value="28">28%</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="col-span-2">
                            <Label htmlFor="billingRate">Default Billing Rate (Excl. of Tax)</Label>
                            <div className="relative mt-2">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input id="billingRate" name="billingRate" type="number" className="glass-input pl-10" placeholder="0.00" defaultValue={service?.billing_default_rate} />
                            </div>
                        </div>
                        <div className="col-span-2 flex items-center space-x-3 pt-2 p-3 rounded-lg bg-black/20">
                            <Checkbox id="markBillable" name="markBillable" defaultChecked={service?.billing_default_billable} />
                            <Label htmlFor="markBillable" className="text-sm font-normal">Mark its tasks billable by default</Label>
                        </div>
                    </div>
                </SectionWrapper>
                
                <div className="flex-grow"></div>
            </form>
            <div className="sticky bottom-0 -mx-8 -mb-8 mt-8 px-8 py-4 border-t border-white/10 flex-shrink-0">
                <Button onClick={(e) => document.querySelector('form').requestSubmit()} disabled={isLoading} className="w-full md:w-auto" size="lg">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
};

export default SettingsTab;