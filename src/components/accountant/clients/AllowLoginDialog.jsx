import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { inviteOrganizationUser } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Loader2 } from 'lucide-react';

const AllowLoginDialog = ({ isOpen, onClose, client }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isSending, setIsSending] = useState(false);

    const handleSendInvite = async () => {
        if (!client?.email || !client?.organization_id) {
            toast({
                title: "❌ Missing Information",
                description: "Client email or organization ID is missing.",
                variant: "destructive",
            });
            return;
        }

        setIsSending(true);
        try {
            await inviteOrganizationUser(client.organization_id, client.email, user.agency_id, user.access_token);
            toast({
                title: "✅ Invite Sent!",
                description: `A password setup link has been sent to ${client.email}.`,
            });
        } catch (error) {
            toast({
                title: "❌ Error",
                description: error.message || "Failed to send the invitation. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSending(false);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Allow Client Login?</DialogTitle>
                    <DialogDescription>
                        This will send an email to <span className="font-semibold text-white">{client?.email}</span> with a link to set up their password and access their personal dashboard.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost" disabled={isSending}>Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSendInvite} disabled={isSending}>
                        {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm & Send Invite
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AllowLoginDialog;