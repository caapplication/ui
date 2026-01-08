import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Plus, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { getClientTeamMembers, assignTeamMembers, removeTeamMember } from '@/lib/api/clients';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const ClientTeamMembersTab = ({ client, teamMembers = [], onTeamMemberChanged }) => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [assignedMembers, setAssignedMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAssigning, setIsAssigning] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState([]);

    // Fetch assigned team members
    const fetchAssignedMembers = async () => {
        setIsLoading(true);
        try {
            const result = await getClientTeamMembers(client.id, user.agency_id, user.access_token);

            // Match team member IDs with full team member data
            const memberDetails = result.team_members.map(assigned => {
                const memberData = teamMembers.find(m =>
                    String(m.user_id || m.id) === String(assigned.team_member_user_id)
                );
                return {
                    ...assigned,
                    ...memberData
                };
            });

            setAssignedMembers(memberDetails);
        } catch (error) {
            console.error('Failed to fetch team members:', error);
            toast({
                title: 'Error',
                description: 'Failed to load team members',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (client?.id && user?.access_token) {
            fetchAssignedMembers();
        }
    }, [client?.id, user?.access_token]);

    const handleAddTeamMembers = async () => {
        if (selectedMembers.length === 0) {
            toast({
                title: 'No Selection',
                description: 'Please select at least one team member',
                variant: 'destructive'
            });
            return;
        }

        setIsAssigning(true);
        try {
            await assignTeamMembers(client.id, selectedMembers, user.agency_id, user.access_token);
            toast({
                title: 'Success',
                description: `Added ${selectedMembers.length} team member(s)`
            });
            setShowAddDialog(false);
            setSelectedMembers([]);
            fetchAssignedMembers();
            if (onTeamMemberChanged) onTeamMemberChanged();
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to assign team members',
                variant: 'destructive'
            });
        } finally {
            setIsAssigning(false);
        }
    };

    const handleRemoveTeamMember = async (userId) => {
        try {
            await removeTeamMember(client.id, userId, user.agency_id, user.access_token);
            toast({
                title: 'Success',
                description: 'Team member removed'
            });
            fetchAssignedMembers();
            if (onTeamMemberChanged) onTeamMemberChanged();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to remove team member',
                variant: 'destructive'
            });
        }
    };

    const handleSelectMember = (memberId) => {
        setSelectedMembers(prev =>
            prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    };

    // Available members (not yet assigned)
    const availableMembers = teamMembers.filter(member =>
        !assignedMembers.some(assigned =>
            String(assigned.team_member_user_id) === String(member.user_id || member.id)
        )
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Card className="glass-pane border-none shadow-none">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-white">Team Members ({assignedMembers.length})</CardTitle>
                        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                            <DialogTrigger asChild>
                                <Button>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Add Team Member
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Add Team Members</DialogTitle>
                                </DialogHeader>
                                <div className="max-h-[400px] overflow-y-auto space-y-2 py-4">
                                    {availableMembers.length === 0 ? (
                                        <p className="text-gray-400 text-center py-4">All team members are already assigned</p>
                                    ) : (
                                        availableMembers.map(member => (
                                            <div key={member.user_id || member.id} className="flex items-center space-x-2 p-3 rounded hover:bg-gray-700/30">
                                                <Checkbox
                                                    id={`member-${member.user_id || member.id}`}
                                                    checked={selectedMembers.includes(member.user_id || member.id)}
                                                    onCheckedChange={() => handleSelectMember(member.user_id || member.id)}
                                                />
                                                <Label htmlFor={`member-${member.user_id || member.id}`} className="flex-1 cursor-pointer">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="w-8 h-8">
                                                            <AvatarFallback className="bg-gradient-to-br from-sky-500 to-indigo-600 text-white text-xs">
                                                                {member.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium">{member.name || 'Unknown'}</div>
                                                            <div className="text-sm text-gray-400">{member.email}</div>
                                                        </div>
                                                    </div>
                                                </Label>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                                    <Button onClick={handleAddTeamMembers} disabled={isAssigning || selectedMembers.length === 0}>
                                        {isAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        Add Selected ({selectedMembers.length})
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {assignedMembers.length === 0 ? (
                        <div className="text-center py-12">
                            <User className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No Team Members Assigned</h3>
                            <p className="text-gray-400 mb-4">This client has no team members assigned yet.</p>
                            <Button onClick={() => setShowAddDialog(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Team Members
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Team Member</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignedMembers.map(member => (
                                    <TableRow key={member.team_member_user_id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarFallback className="bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
                                                        {member.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{member.name || 'Unknown'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{member.email || 'N/A'}</TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-sm">
                                                {member.role || 'Team Member'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-400 hover:text-red-300"
                                                onClick={() => handleRemoveTeamMember(member.team_member_user_id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ClientTeamMembersTab;
