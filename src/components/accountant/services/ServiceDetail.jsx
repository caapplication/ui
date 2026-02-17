import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth.jsx';
import { deleteService as apiDeleteService, createActivityLog, getServiceDeletionStatus } from '@/lib/api';

import RecurringTaskTab from './RecurringTaskTab';
import AssignedClientsTab from "./AssignedClientsTab";
import ActivityLog from "@/components/finance/ActivityLog";

const ServiceDetail = ({ service, onBack, onDelete, onUpdate }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [activeSubTab, setActiveSubTab] = React.useState("Recurring tasks");
    const [deletionStatus, setDeletionStatus] = React.useState({ can_delete: true, reasons: [] });
    const [isLoadingDeletionStatus, setIsLoadingDeletionStatus] = React.useState(true);

    // Function to refresh deletion status
    const refreshDeletionStatus = React.useCallback(async () => {
        if (!user?.access_token || !user?.agency_id || !service?.id) return;
        setIsLoadingDeletionStatus(true);
        try {
            const status = await getServiceDeletionStatus(service.id, user.agency_id, user.access_token);
            setDeletionStatus(status);
        } catch (error) {
            console.error('Error fetching deletion status:', error);
            // Default to allowing deletion if check fails
            setDeletionStatus({ can_delete: true, reasons: [] });
        } finally {
            setIsLoadingDeletionStatus(false);
        }
    }, [service?.id, user?.access_token, user?.agency_id]);

    // Fetch deletion status when component mounts or service changes
    React.useEffect(() => {
        refreshDeletionStatus();
    }, [refreshDeletionStatus]);

    // Refresh deletion status when tab changes (in case data was modified)
    React.useEffect(() => {
        // Small delay to allow tab content to load/update
        const timer = setTimeout(() => {
            refreshDeletionStatus();
        }, 500);
        return () => clearTimeout(timer);
    }, [activeSubTab, refreshDeletionStatus]);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            // Log the activity before deletion (since we need the ID/Name)
            try {
                await createActivityLog({
                    action: "delete",
                    details: `Deleted service "${service.name}"`,
                    service_id: service.id,
                    user_id: user.id
                }, user.access_token);
            } catch (logError) {
                console.error("Failed to log service deletion:", logError);
            }

            await apiDeleteService(service.id, user.agency_id, user.access_token);
            toast({
                title: '✅ Service Deleted',
                description: `Service "${service.name}" has been successfully deleted.`,
            });
            onDelete(service.id);
            onBack();
        } catch (error) {
            toast({
                title: '❌ Error Deleting Service',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-white">
                        <span className="text-gray-400 cursor-pointer" onClick={onBack}>Services / </span>{service.name}
                    </h1>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button 
                                            variant="destructive" 
                                            disabled={isDeleting || isLoadingDeletionStatus || !deletionStatus.can_delete}
                                        >
                                            {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                            Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the service.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TooltipTrigger>
                        {!deletionStatus.can_delete && deletionStatus.reasons.length > 0 && (
                            <TooltipContent>
                                <p className="max-w-xs">
                                    Cannot delete: {deletionStatus.reasons.join(', ')}
                                </p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </div>

            <div className="flex-grow overflow-y-auto no-scrollbar pr-2 space-y-6">
                <div className="border-b border-white/10">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        {["Recurring tasks", "Assigned Clients", "Activity logs"].map((tab) => {
                            const isActive = activeSubTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveSubTab(tab)}
                                    className={`${isActive
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                                >
                                    {tab}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div>
                    {activeSubTab === "Recurring tasks" && (
                        <RecurringTaskTab service={service} onUpdate={onUpdate} onDataChange={refreshDeletionStatus} />
                    )}
                    {activeSubTab === "Assigned Clients" && (
                        <AssignedClientsTab service={service} onDataChange={refreshDeletionStatus} />
                    )}
                    {activeSubTab === "Activity logs" && (
                        <div className="glass-pane p-6 rounded-lg">
                            <ActivityLog itemId={service.id} itemType="service" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceDetail;
