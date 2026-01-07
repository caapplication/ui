import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Filter, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { listOrgUsers, inviteOrganizationUser, deleteOrgUser, deleteInvitedOrgUser, resendToken } from '@/lib/api/organisation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const ClientUsersPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [userFilter, setUserFilter] = useState('all'); // all, joined, invited

    // Invite Dialog State
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);

    // Action Loading States
    const [loadingUserId, setLoadingUserId] = useState(null);

    const fetchUsers = async () => {
        if (!user?.organization_id || !user?.access_token) return;

        setIsLoading(true);
        try {
            const data = await listOrgUsers(user.organization_id, user.access_token);

            const invited = (data.invited_users || []).map(u => ({
                ...u,
                status: 'Invited',
                role: u.target_role || 'CLIENT_USER'
            }));

            const joined = (data.joined_users || []).map(u => ({
                ...u,
                status: 'Joined'
            }));

            setUsers([...invited, ...joined]);
        } catch (error) {
            console.error("Failed to fetch users:", error);
            toast({
                title: "Error fetching users",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [user?.organization_id, user?.access_token]);

    const filteredUsers = useMemo(() => {
        let filtered = users.filter(u => {
            if (userFilter === 'all') return true;
            return u.status.toLowerCase() === userFilter.toLowerCase();
        });

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(u =>
                (u.email || '').toLowerCase().includes(term) ||
                (u.name || '').toLowerCase().includes(term) ||
                (u.role || '').toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [users, userFilter, searchTerm]);

    const handleInviteUser = async () => {
        if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
            toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
            return;
        }

        setIsInviting(true);
        try {
            // Ensure we have agency_id. If client user doesn't have it directly, 
            // the backend might need to infer it or we might need to get it from context.
            // Assuming current user context has agency_id if they are a client user created by an agency.
            // If not, we might need to rely on the backend to look it up from the organization.

            await inviteOrganizationUser(user.organization_id, inviteEmail, user.agency_id, user.access_token);

            toast({ title: "Invitation Sent", description: `Invited ${inviteEmail} successfully.` });
            setShowInviteDialog(false);
            setInviteEmail('');
            fetchUsers();
        } catch (error) {
            toast({ title: "Invitation Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsInviting(false);
        }
    };

    const handleResendInvite = async (userObj) => {
        setLoadingUserId(userObj.user_id || userObj.email);
        try {
            await resendToken(userObj.email);
            toast({ title: "Invite Resent", description: `Invitation resent to ${userObj.email}` });
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoadingUserId(null);
        }
    };

    const handleDeleteUser = async (userObj) => {
        if (!confirm(`Are you sure you want to remove ${userObj.email}?`)) return;

        setLoadingUserId(userObj.user_id || userObj.email);
        try {
            if (userObj.status === 'Invited') {
                await deleteInvitedOrgUser(userObj.email, user.access_token);
            } else {
                await deleteOrgUser(user.organization_id, userObj.user_id, user.access_token);
            }
            toast({ title: "User Removed", description: `${userObj.email} has been removed.` });
            fetchUsers();
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoadingUserId(null);
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Manage Users</h1>
                    <p className="text-gray-400 mt-1">Add and manage members of your organization.</p>
                </div>
                <Button onClick={() => setShowInviteDialog(true)} className="bg-primary hover:bg-primary/90">
                    <UserPlus className="w-4 h-4 mr-2" /> Invite User
                </Button>
            </div>

            <div className="glass-pane p-4 rounded-lg flex-1 flex flex-col min-h-0">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search users..."
                            className="glass-input pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                                    <Filter className="w-4 h-4" />
                                    Filter: {userFilter === 'all' ? 'All' : userFilter === 'joined' ? 'Joined' : 'Invited'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-0 bg-[#181C2A] border-gray-700">
                                <div className="flex flex-col p-1">
                                    {['all', 'joined', 'invited'].map(f => (
                                        <Button
                                            key={f}
                                            variant="ghost"
                                            className="justify-start capitalize"
                                            onClick={() => setUserFilter(f)}
                                        >
                                            {f}
                                        </Button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="icon" onClick={fetchUsers} disabled={isLoading}>
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                <div className="overflow-auto flex-1 no-scrollbar">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/10 hover:bg-white/5">
                                <TableHead className="text-gray-300">User</TableHead>
                                <TableHead className="text-gray-300">Role</TableHead>
                                <TableHead className="text-gray-300">Status</TableHead>
                                <TableHead className="text-right text-gray-300">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((u) => (
                                    <TableRow key={u.user_id || u.email} className="border-white/10 hover:bg-white/5">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-white">{u.name || u.email}</span>
                                                {u.name && <span className="text-xs text-gray-400">{u.email}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-300">
                                            {u.role === 'CLIENT_ADMIN' ? 'Admin' : 'Member'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={u.status === 'Joined' ? 'default' : 'secondary'} className={u.status === 'Joined' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'}>
                                                {u.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {u.status === 'Invited' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleResendInvite(u)}
                                                        disabled={loadingUserId === (u.user_id || u.email)}
                                                        title="Resend Invite"
                                                    >
                                                        <RefreshCw className={`w-4 h-4 ${loadingUserId === (u.user_id || u.email) ? 'animate-spin' : ''}`} />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                                    onClick={() => handleDeleteUser(u)}
                                                    disabled={loadingUserId === (u.user_id || u.email)}
                                                >
                                                    {loadingUserId === (u.user_id || u.email) ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-gray-400">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogContent className="glass-pane border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Invite New User</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="colleague@company.com"
                            className="mt-2 glass-input"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost" disabled={isInviting}>Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleInviteUser} disabled={isInviting}>
                            {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Invitation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ClientUsersPage;
