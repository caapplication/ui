import React, { useState, useEffect, useCallback } from 'react';
import ServiceList from '@/components/accountant/services/ServiceList';
import ServiceDetail from '@/components/accountant/services/ServiceDetail';
import AddServiceModal from '@/components/accountant/services/AddServiceModal';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth.jsx';
import { listServices, getServiceDetails } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const Services = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchServices = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const servicesData = await listServices(user.agency_id, user.access_token);
            setServices(servicesData || []);
        } catch (error) {
            toast({
                title: "❌ Error fetching services",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (!selectedService) {
            fetchServices();
        }
    }, [fetchServices, selectedService]);

    const handleSelectService = async (serviceStub) => {
        try {
             setIsLoading(true);
             const detailedService = await getServiceDetails(serviceStub.id, user.agency_id, user.access_token);
             setSelectedService(detailedService);
        } catch (error) {
            toast({
                title: "❌ Error fetching service details",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToList = () => {
        setSelectedService(null);
        fetchServices();
    };
    
    const handleUpdateService = (updatedService) => {
        setSelectedService(updatedService);
        setServices(prev => prev.map(s => s.id === updatedService.id ? updatedService : s));
    }
    
    const handleDeleteService = (serviceId) => {
        setServices(prev => prev.filter(s => s.id !== serviceId));
    };

    const handleAddService = (newService) => {
        setServices([newService, ...services]);
        handleSelectService(newService);
    };

    if (isLoading && !selectedService) {
        return (
            <div className="p-4 md:p-8 text-white h-full flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 text-white relative overflow-hidden h-full">
            <AnimatePresence mode="wait">
                {selectedService ? (
                    <motion.div
                        key="detail"
                        initial={{ opacity: 0, x: 300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -300 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="h-full"
                    >
                        <ServiceDetail service={selectedService} onBack={handleBackToList} onDelete={handleDeleteService} onUpdate={handleUpdateService}/>
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, x: 0 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 300 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="h-full"
                    >
                        <ServiceList services={services} onSelectService={handleSelectService} onAddService={() => setIsAddModalOpen(true)} />
                    </motion.div>
                )}
            </AnimatePresence>
            <AddServiceModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)}
                onAddService={handleAddService}
            />
        </div>
    );
};

export default Services;
