import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createService, createActivityLog } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth.jsx';

const AddServiceModal = ({ isOpen, onClose, onAddService }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [serviceName, setServiceName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!serviceName.trim()) {
            toast({
                title: "⚠️ Validation Error",
                description: "Service name cannot be empty.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const newService = await createService({ name: serviceName }, user.agency_id, user.access_token);

            // Log the activity
            try {
                await createActivityLog({
                    action: "create",
                    details: `Created service "${newService.name}"`,
                    service_id: newService.id,
                    user_id: user.id
                }, user.access_token);
            } catch (logError) {
                console.error("Failed to log service creation:", logError);
            }

            onAddService(newService);
            toast({
                title: "✅ Service Added",
                description: `The service "${newService.name}" has been created. You can now configure its details.`,
            });
            setServiceName('');
            onClose();
        } catch (error) {
            console.error("Failed to create service:", error);
            toast({
                title: "❌ Error",
                description: `Failed to create service: ${error.message}`,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="glass-pane text-white max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Add New Service</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="serviceName">Service Name <span className="text-red-500">*</span></Label>
                    <Input
                        id="serviceName"
                        name="serviceName"
                        className="glass-input mt-2"
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        placeholder="e.g., Monthly Accounting"
                        required
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? 'Creating...' : 'Create Service'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddServiceModal;