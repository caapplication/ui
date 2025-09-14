import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth.jsx';
import { deleteService as apiDeleteService } from '@/lib/api';

import SettingsTab from './SettingsTab';
import ChecklistTab from './ChecklistTab';
import SubtasksTab from './SubtasksTab';
import SupportingFilesTab from './SupportingFilesTab';

const ServiceDetail = ({ service, onBack, onDelete, onUpdate }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
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
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Delete
                </Button>
            </div>

            <Tabs defaultValue="settings" className="w-full flex-grow flex flex-col overflow-hidden">
                <TabsList className="glass-tab-list mb-4 flex-shrink-0">
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="checklist">Checklist</TabsTrigger>
                    <TabsTrigger value="subtasks">Subtasks</TabsTrigger>
                    <TabsTrigger value="supporting_files">Supporting Files</TabsTrigger>
                </TabsList>
                <div className="flex-grow overflow-y-auto no-scrollbar">
                    <TabsContent value="settings" className="h-full">
                        <SettingsTab service={service} onUpdate={onUpdate} />
                    </TabsContent>
                    <TabsContent value="checklist">
                        <ChecklistTab service={service} onUpdate={onUpdate} />
                    </TabsContent>
                    <TabsContent value="subtasks">
                        <SubtasksTab service={service} onUpdate={onUpdate} />
                    </TabsContent>
                    <TabsContent value="supporting_files">
                        <SupportingFilesTab service={service} onUpdate={onUpdate}/>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default ServiceDetail;