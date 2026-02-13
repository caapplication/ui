import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Minus, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { addServicesToClient, removeServicesFromClient, createActivityLog } from '@/lib/api';

const ServiceItem = ({ service, onToggle, isAvailed }) => (
    <motion.div
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: isAvailed ? 20 : -20 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between p-3 bg-black/20 rounded-lg"
    >
        <span className="font-medium text-sm">{service.name}</span>
        <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => onToggle(service)}>
            {isAvailed ? <Minus className="w-4 h-4 text-red-400" /> : <Plus className="w-4 h-4 text-green-400" />}
        </Button>
    </motion.div>
);

const ClientServicesTab = ({ client, allServices, onUpdateClient }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    const getInitialAvailedIds = useCallback(() => new Set((client.availedServices || []).map(s => s.service_id)), [client.availedServices]);

    const [availedServiceIds, setAvailedServiceIds] = useState(getInitialAvailedIds);
    const [initialAvailedServiceIds, setInitialAvailedServiceIds] = useState(getInitialAvailedIds);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const newAvailedIds = getInitialAvailedIds();
        setAvailedServiceIds(newAvailedIds);
        setInitialAvailedServiceIds(newAvailedIds);
    }, [client.availedServices, getInitialAvailedIds]);


    const handleToggleService = (service) => {
        setAvailedServiceIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(service.id)) {
                newSet.delete(service.id);
            } else {
                newSet.add(service.id);
            }
            return newSet;
        });
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const currentServiceIds = Array.from(availedServiceIds);
            const initialServiceIds = Array.from(initialAvailedServiceIds);

            const servicesToAdd = currentServiceIds.filter(id => !initialServiceIds.includes(id));
            const servicesToRemove = initialServiceIds.filter(id => !currentServiceIds.includes(id));

            let promises = [];
            if (servicesToAdd.length > 0) {
                promises.push(addServicesToClient(client.id, servicesToAdd, user.agency_id, user.access_token));
            }
            if (servicesToRemove.length > 0) {
                promises.push(removeServicesFromClient(client.id, servicesToRemove, user.agency_id, user.access_token));
            }

            if (promises.length > 0) {
                await Promise.all(promises);

                // Log activity
                try {
                    const logPromises = [];
                    servicesToAdd.forEach(id => {
                        const service = allServices.find(s => s.id === id);
                        logPromises.push(createActivityLog({
                            action: "update",
                            details: `Availed service "${service?.name}"`,
                            client_id: client.id,
                            service_id: id,
                            user_id: user.id
                        }, user.access_token));
                    });
                    servicesToRemove.forEach(id => {
                        const service = allServices.find(s => s.id === id);
                        logPromises.push(createActivityLog({
                            action: "update",
                            details: `Removed service "${service?.name}"`,
                            client_id: client.id,
                            service_id: id,
                            user_id: user.id
                        }, user.access_token));
                    });
                    await Promise.all(logPromises);
                } catch (logError) {
                    console.error("Failed to log service changes:", logError);
                }
            }

            const updatedClientServices = currentServiceIds.map(id => ({ service_id: id }));
            onUpdateClient({ ...client, availedServices: updatedClientServices });
            setInitialAvailedServiceIds(new Set(currentServiceIds));

            toast({
                title: '✅ Services Updated',
                description: `Services for ${client.name} have been saved.`,
            });
        } catch (error) {
            toast({
                title: 'Error updating services',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const filteredAvailable = useMemo(() => {
        return allServices.filter(s =>
            !availedServiceIds.has(s.id) &&
            s.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allServices, availedServiceIds, searchTerm]);

    const currentAvailed = useMemo(() => {
        return allServices.filter(s => availedServiceIds.has(s.id));
    }, [allServices, availedServiceIds]);

    const hasChanges = useMemo(() => {
        if (availedServiceIds.size !== initialAvailedServiceIds.size) return true;
        for (const id of availedServiceIds) {
            if (!initialAvailedServiceIds.has(id)) return true;
        }
        return false;
    }, [availedServiceIds, initialAvailedServiceIds]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Available Services */}
                <div className="glass-pane p-4 rounded-lg flex flex-col">
                    <h3 className="text-lg font-semibold mb-4 px-2">Available Services</h3>
                    <div className="relative mb-4 px-2">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search available..."
                            className="glass-input pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2 flex-grow overflow-y-auto max-h-[400px] p-2">
                        <AnimatePresence>
                            {filteredAvailable.map(service => (
                                <ServiceItem key={service.id} service={service} onToggle={handleToggleService} isAvailed={false} />
                            ))}
                        </AnimatePresence>
                        {filteredAvailable.length === 0 && <p className="text-center text-gray-500 py-4 text-sm">No other services available.</p>}
                    </div>
                </div>

                {/* Availed Services */}
                <div className="glass-pane p-4 rounded-lg flex flex-col">
                    <h3 className="text-lg font-semibold mb-4 px-2">Availed Services</h3>
                    <div className="space-y-2 flex-grow overflow-y-auto max-h-[468px] p-2">
                        <AnimatePresence>
                            {currentAvailed.map(service => (
                                <ServiceItem key={service.id} service={service} onToggle={handleToggleService} isAvailed={true} />
                            ))}
                        </AnimatePresence>
                        {currentAvailed.length === 0 && <p className="text-center text-gray-500 py-4 text-sm">No services availed yet.</p>}
                    </div>
                </div>
            </div>
            <div className="flex justify-end mt-4">
                <Button onClick={handleSaveChanges} disabled={!hasChanges || isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
};

export default ClientServicesTab;