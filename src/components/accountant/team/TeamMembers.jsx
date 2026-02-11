import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { listTeamMembers, inviteTeamMember, updateTeamMember, deleteTeamMember, resendInvite } from '@/lib/api';

const TeamMembers = () => {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const { toast } = useToast();
    const { user } = useAuth();

    const fetchTeamMembers = useCallback(async () => {
        if (!user?.access_token) return;
        setLoading(true);
        try {
            const members = await listTeamMembers(user.access_token, 'joined');
            // Filter out current user
            const filteredMembers = members.filter(member => member.email !== user.email);
            setTeam(filteredMembers);
        } catch (error) {
            toast({ title: "Error", description: `Failed to fetch team members: ${error.message}`, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [user?.access_token, toast]);

    useEffect(() => {
        fetchTeamMembers();
    }, [fetchTeamMembers]);

    const handleInvite = () => {
        setFormData({ name: '', email: '', password: '' });
        setShowInviteDialog(true);
    };

    const handleSendInvite = async () => {
        if (!formData.email.trim() || !formData.email.includes('@')) {
            toast({ title: "Error", description: "Please enter a valid email.", variant: "destructive" });
            return;
        }

        // Check for duplicates
        if (team.some(member => member.email.toLowerCase() === formData.email.toLowerCase().trim())) {
            toast({ title: "Error", description: "User already exists in the team.", variant: "destructive" });
            return;
        }

        try {
            await inviteTeamMember(formData.email, user.id, user.access_token);
            toast({ title: "Success", description: `Invitation sent to ${formData.email}.` });
            setShowInviteDialog(false);
            fetchTeamMembers();
        } catch (error) {
            toast({ title: "Error", description: `Failed to send invite: ${error.message}`, variant: "destructive" });
        }
    };

    const handleResendInvite = async (email) => {
        try {
            await resendInvite(email, user.access_token);
            toast({ title: "Success", description: `Invitation resent to ${email}.` });
        } catch (error) {
            toast({ title: "Error", description: `Failed to resend invite: ${error.message}`, variant: "destructive" });
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({ name: user.name, email: user.email, password: '' });
        setShowEditDialog(true);
    };

    const handleUpdateUser = async () => {
        if (!formData.email.trim() || !formData.email.includes('@')) {
            toast({ title: "Error", description: "Please enter a valid email.", variant: "destructive" });
            return;
        }
        try {
            const payload = { name: formData.name, email: formData.email };
            if (formData.password) {
                payload.password = formData.password;
            }
            await updateTeamMember(editingUser.id, payload, user.access_token);
            toast({ title: "Success", description: "User updated successfully." });
            setShowEditDialog(false);
            fetchTeamMembers();
        } catch (error) {
            toast({ title: "Error", description: `Failed to update user: ${error.message}`, variant: "destructive" });
        }
    };

    const handleDelete = async (member) => {
        try {
            await deleteTeamMember(member, user.access_token);
            toast({ title: "Success", description: "User deleted successfully." });
            fetchTeamMembers();
        } catch (error) {
            toast({ title: "Error", description: `Failed to delete user: ${error.message}`, variant: "destructive" });
        }
    };

    const handleStatusChange = async (member, newStatus) => {
        if (!member.id) return;
        const originalTeam = [...team];
        const updatedTeam = team.map(m =>
            m.id === member.id ? { ...m, is_active: newStatus } : m
        );
        setTeam(updatedTeam);

        try {
            await updateTeamMember(member.id, { is_active: newStatus }, user.access_token);
            toast({ title: "Success", description: "User status updated." });
        } catch (error) {
            setTeam(originalTeam);
            toast({ title: "Error", description: `Failed to update status: ${error.message}`, variant: "destructive" });
        }
    };

    return (
        <div className="p-8 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Team Members</h1>
                <Button onClick={handleInvite}><UserPlus className="w-4 h-4 mr-2" /> Invite User</Button>
            </div>
            <div className="glass-pane p-4 rounded-lg flex-grow overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-white/10">
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {team.map(member => (
                                <TableRow key={member.id || member.email} className="border-none hover:bg-white/5">
                                    <TableCell className="font-medium">{member.name}</TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell>
                                        {member.id ? (
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={member.is_active}
                                                    onCheckedChange={(checked) => handleStatusChange(member, checked)}
                                                />
                                                <span className={member.is_active ? 'text-green-400' : 'text-gray-400'}>
                                                    {member.status_message}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className='text-yellow-400'>Invited</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {member.id ? (
                                            <>
                                               <div className="flex items-center justify-end gap-1 sm:gap-2">
  <Button
    variant="ghost"
    size="icon"
    className="h-9 w-9 sm:h-8 sm:w-8"
    onClick={() => handleEdit(member)}
  >
    <Edit className="h-4 w-4" />
  </Button>

  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 sm:h-8 sm:w-8 text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </AlertDialogTrigger>

    <AlertDialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
      <AlertDialogHeader>
        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete the user.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="gap-2 sm:gap-0">
        <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
        <AlertDialogAction
          className="w-full sm:w-auto"
          onClick={() => handleDelete(member)}
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</div>

                                            </>
                                        ) : (
                                            <>
                                                <Button variant="outline" size="sm" onClick={() => handleResendInvite(member.email)}>Resend Invite</Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the user.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(member)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite New Team Member</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="inviteEmail">Email Address</Label>
                            <Input id="inviteEmail" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-2" placeholder="user@example.com" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={handleSendInvite}>Send Invite</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Team Member</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="editName">Full Name</Label>
                            <Input id="editName" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-2" />
                        </div>
                        <div>
                            <Label htmlFor="editEmail">Email Address</Label>
                            <Input id="editEmail" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-2" />
                        </div>
                        <div>
                            <Label htmlFor="editPassword">New Password (optional)</Label>
                            <Input id="editPassword" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="mt-2" placeholder="Leave blank to keep current password" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={handleUpdateUser}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeamMembers;
