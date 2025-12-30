import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Phone, MessageSquare, ExternalLink, UserPlus } from 'lucide-react';
import AllowLoginDialog from './AllowLoginDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { updateClient, inviteTeamMember } from '@/lib/api';

const StatCard = ({ title, value, valueClassName }) => (
    <Card className="bg-white/5 border-white/10 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
        </CardContent>
    </Card>
);

const DetailItem = ({ label, value, children }) => (
    <div>
        <p className="text-sm text-gray-400">{label}</p>
        <div className="font-medium text-white">{children || value}</div>
    </div>
);

const ClientDashboardDetails = ({ client, teamMembers = [], onUpdateClient, onTeamMemberInvited }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [showLoginDialog, setShowLoginDialog] = useState(false);
    const [showTeamMemberDialog, setShowTeamMemberDialog] = useState(false);
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [selectedTeamMemberId, setSelectedTeamMemberId] = useState('none');
    const [isUpdating, setIsUpdating] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);

    const handleNotImplemented = () => {
        toast({
            title: "🚧 Feature Not Implemented",
            description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const ledgerBalance = client.opening_balance?.amount || client.opening_balance_amount || 0;
    const ledgerBalanceType = client.opening_balance?.opening_balance_type || client.opening_balance_type;
    const balanceColor = ledgerBalanceType === 'credit' ? 'text-green-400' : ledgerBalanceType === 'debit' ? 'text-red-400' : 'text-white';
    
    const clientEmail = client.email;

    const handleSaveTeamMember = async () => {
        if (!user?.agency_id || !user?.access_token) {
            toast({
                title: "Error",
                description: "User information is not available.",
                variant: "destructive",
            });
            return;
        }

        setIsUpdating(true);
        try {
            // Convert 'none' to null for unassignment
            const teamMemberId = selectedTeamMemberId === 'none' ? null : selectedTeamMemberId;
            const updatedClient = await updateClient(
                client.id,
                { assigned_ca_user_id: teamMemberId },
                user.agency_id,
                user.access_token
            );
            
            if (onUpdateClient) {
                onUpdateClient(updatedClient);
            }
            
            toast({
                title: "✅ Team Member Updated",
                description: "Team member assignment has been updated successfully.",
            });
            
            setShowTeamMemberDialog(false);
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to update team member assignment.",
                variant: "destructive",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleInviteTeamMember = () => {
        setInviteEmail('');
        setShowInviteDialog(true);
    };

    const handleSendInvite = async () => {
        if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
            toast({
                title: "Error",
                description: "Please enter a valid email.",
                variant: "destructive",
            });
            return;
        }

        if (!user?.id || !user?.access_token) {
            toast({
                title: "Error",
                description: "User information is not available.",
                variant: "destructive",
            });
            return;
        }

        setIsInviting(true);
        try {
            await inviteTeamMember(inviteEmail, user.id, user.access_token);
            toast({
                title: "Success",
                description: `Invitation sent to ${inviteEmail}.`,
            });
            setShowInviteDialog(false);
            setInviteEmail('');
            
            // Notify parent to refresh team members
            if (onTeamMemberInvited) {
                onTeamMemberInvited();
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to send invite.",
                variant: "destructive",
            });
        } finally {
            setIsInviting(false);
        }
    };

    const assignedTeamMember = teamMembers.find(m => {
        const memberUserId = m.user_id || m.id;
        return memberUserId && String(memberUserId) === String(client.assigned_ca_user_id);
    });

    // Update selectedTeamMemberId when client changes
    useEffect(() => {
        if (client?.assigned_ca_user_id) {
            setSelectedTeamMemberId(String(client.assigned_ca_user_id));
        } else {
            setSelectedTeamMemberId('none');
        }
    }, [client?.assigned_ca_user_id]);

    return (
        <div className="space-y-6">
            <div className="glass-pane p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DetailItem label="Status">
                        <Badge variant={client.is_active ? 'success' : 'destructive'}>{client.is_active ? 'Active' : 'Inactive'}</Badge>
                    </DetailItem>
                    <DetailItem label="Type" value={client.client_type} />
                    <DetailItem label="Contact Person" value={client.contact_person_name || 'N/A'} />
                    <DetailItem label="Date of Establishment" value={client.dob || client.date_of_birth ? format(new Date(client.dob || client.date_of_birth), 'dd-MM-yyyy') : 'N/A'} />
                    <DetailItem label="PAN" value={client.pan || 'N/A'} />
                    <DetailItem label="Organization" value={client.organization_name || 'N/A'} />
                    <DetailItem label="GSTIN" value={client.gstin || 'N/A'} />
                    <DetailItem label="Secondary Phone" value={client.secondary_phone || 'N/A'} />
                    <DetailItem label="Address Line 1" value={client.address_line1 || 'N/A'} />
                    <DetailItem label="Address Line 2" value={client.address_line2 || 'N/A'} />
                    <DetailItem label="Mobile No.">
                        <div className="flex items-center gap-2">
                            {client.mobile || 'N/A'}
                            {client.mobile && <>
                                
                            </>}
                        </div>
                    </DetailItem>
                    <DetailItem label="Email">
                         {clientEmail ? (
                            <a href={`mailto:${clientEmail}`} className="flex items-center gap-1 text-blue-400 hover:underline">
                                {clientEmail}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                         ) : 'N/A'}
                    </DetailItem>
                    <DetailItem label="City" value={client.city || 'N/A'} />
                    <DetailItem label="Pincode" value={client.postal_code || 'N/A'} />
                    <DetailItem label="State" value={client.state || 'N/A'} />
                </div>
                
                <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <DetailItem label="Created By" value={teamMembers.find(m => m.user_id === client.created_by)?.name || 'Admin'} />
                    <DetailItem label="Created On" value={client.created_at ? format(new Date(client.created_at), 'dd MMM, yyyy') : 'N/A'} />
                    <div>
                        <p className="text-sm text-gray-400 mb-2">Team Members</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleInviteTeamMember}
                            className="w-full justify-start gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            {assignedTeamMember 
                                ? assignedTeamMember.name || assignedTeamMember.email || 'Team Member Assigned'
                                : 'Add Team Member'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Team Member Assignment Dialog */}
            <Dialog open={showTeamMemberDialog} onOpenChange={setShowTeamMemberDialog}>
                <DialogContent className="bg-gray-800 border-gray-700 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white">Assign Team Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label className="text-gray-300 mb-2 block">Select Team Member</Label>
                            <Select
                                value={selectedTeamMemberId || 'none'}
                                onValueChange={setSelectedTeamMemberId}
                                disabled={isUpdating}
                            >
                                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                    <SelectValue placeholder="Select a team member" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    <SelectItem value="none" className="text-white hover:bg-gray-700">
                                        None (Remove assignment)
                                    </SelectItem>
                                    {teamMembers && teamMembers.length > 0 ? (
                                        teamMembers.map((member) => {
                                            const memberUserId = member.user_id || member.id;
                                            if (!memberUserId) return null;
                                            return (
                                                <SelectItem
                                                    key={memberUserId}
                                                    value={String(memberUserId)}
                                                    className="text-white hover:bg-gray-700"
                                                >
                                                    {member.name || member.email || 'Unknown'}
                                                </SelectItem>
                                            );
                                        })
                                    ) : (
                                        <SelectItem value="no-members" disabled className="text-gray-500">
                                            No team members found
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowTeamMemberDialog(false)}
                            disabled={isUpdating}
                            className="border-gray-600 text-white hover:bg-gray-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveTeamMember}
                            disabled={isUpdating}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isUpdating ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Invite Team Member Dialog */}
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogContent className="bg-gray-800 border-gray-700 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white">Invite New Team Member</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="inviteEmail" className="text-gray-300">Email Address</Label>
                            <Input
                                id="inviteEmail"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="mt-2 bg-gray-700 border-gray-600 text-white"
                                placeholder="user@example.com"
                                disabled={isInviting}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button
                                variant="ghost"
                                disabled={isInviting}
                                className="border-gray-600 text-white hover:bg-gray-700"
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            onClick={handleSendInvite}
                            disabled={isInviting}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isInviting ? 'Sending...' : 'Send Invite'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ClientDashboardDetails;
