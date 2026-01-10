import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Filter, Loader2, Trash2, RefreshCw, UserCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { listEntityUsers, inviteEntityUser, deleteEntityUser, deleteInvitedOrgUser, resendToken, listAllAccessibleEntityUsers, addEntityUsers } from '@/lib/api/organisation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const ClientUsersPage = ({ entityId }) => {
    const { user } = useAuth();
    const { toast } = useToast();

    // User Lists
    const [users, setUsers] = useState({ invited_users: [], joined_users: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [userFilter, setUserFilter] = useState('all'); // all, joined, invited

    // Invite Dialog State
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);

    // Add Existing Users State
    const [showAddExistingDialog, setShowAddExistingDialog] = useState(false);
    const [organizationUsers, setOrganizationUsers] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [isAddingUsers, setIsAddingUsers] = useState(false);

    // Action Loading States
    const [loadingUserId, setLoadingUserId] = useState(null);

    const fetchUsers = async () => {
        if (!entityId || !user?.access_token) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const data = await listEntityUsers(entityId, user.access_token);
            setUsers(data || { invited_users: [], joined_users: [] });
        } catch (error) {
            console.error("Failed to fetch entity users:", error);
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
    }, [entityId, user?.access_token]);

    // Format users for display
    const allUsers = useMemo(() => {
        const uniqueUsersMap = new Map();

        // Process joined users first to prioritize their 'Joined' status
        (users.joined_users || []).forEach(u => {
            if (u.email && !uniqueUsersMap.has(u.email)) {
                uniqueUsersMap.set(u.email, { ...u, status: 'Joined' });
            }
        });

        // Process invited users, adding only if not already present (as Joined)
        (users.invited_users || []).forEach(u => {
            if (u.email && !uniqueUsersMap.has(u.email)) {
                uniqueUsersMap.set(u.email, {
                    ...u,
                    status: 'Invited',
                    role: u.target_role || 'ENTITY_USER'
                });
            }
        });

        return Array.from(uniqueUsersMap.values());
    }, [users]);

    const filteredUsers = useMemo(() => {
        let filtered = allUsers.filter(u => {
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
    }, [allUsers, userFilter, searchTerm]);

    const handleInviteUser = async () => {
        if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
            toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
            return;
        }

        if (!entityId) {
            toast({ title: "No Entity Selected", description: "Please select an entity from the sidebar.", variant: "destructive" });
            return;
        }

        setIsInviting(true);
        try {
            await inviteEntityUser(entityId, inviteEmail, user.access_token);
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

    const fetchOrganizationUsers = async () => {
        if (!user?.access_token) return;

        try {
            // Using listAllAccessibleEntityUsers instead of listOrgUsers
            // This ensures users who are not direct Organization Members but are Entity Users (like 'om') can still see/add available users
            const data = await listAllAccessibleEntityUsers(user.access_token);
            const joined = data.joined_users || [];

            // Filter out users who are already in this entity
            const currentEntityUserIds = allUsers.map(u => u.user_id);

            // Deduplicate joined users returned (though API handles it, safety check)
            const uniqueJoinedUsers = Array.from(new Map(joined.map(item => [item.user_id, item])).values());

            const availableUsers = uniqueJoinedUsers.filter(u => !currentEntityUserIds.includes(u.user_id));

            setOrganizationUsers(availableUsers);
        } catch (error) {
            console.error("Failed to fetch available users:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleAddExisting = async () => {
        if (!showAddExistingDialog) {
            await fetchOrganizationUsers();
            setShowAddExistingDialog(true);
            setSelectedUserIds([]);
        } else {
            if (selectedUserIds.length === 0) {
                toast({ title: "No Users Selected", description: "Please select at least one user.", variant: "warning" });
                return;
            }

            setIsAddingUsers(true);
            try {
                await addEntityUsers(entityId, selectedUserIds, user.access_token);
                toast({ title: "Users Added", description: `${selectedUserIds.length} user(s) added successfully.` });
                setShowAddExistingDialog(false);
                setSelectedUserIds([]);
                fetchUsers();
            } catch (error) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            } finally {
                setIsAddingUsers(false);
            }
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
        if (!confirm(`Are you sure you want to remove ${userObj.email} from this entity?`)) return;

        setLoadingUserId(userObj.user_id || userObj.email);
        try {
            if (userObj.status === 'Invited') {
                await deleteInvitedOrgUser(userObj.email, user.access_token);
            } else {
                await deleteEntityUser(entityId, userObj.user_id, user.access_token);
            }
            toast({ title: "User Removed", description: `${userObj.email} has been removed.` });
            await fetchUsers();
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoadingUserId(null);
        }
    };

    if (!entityId) {
        return (
            <div className="p-8 h-full flex items-center justify-center text-white">
                <div className="text-center">
                    <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h2 className="text-2xl font-bold mb-2">No Entity Selected</h2>
                    <p className="text-gray-400">Please select an entity from the sidebar to manage users.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full flex flex-col text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Manage Team</h1>
                    <p className="text-gray-400 mt-1">Add and manage members of your entity.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleAddExisting} variant="outline" className="gap-2">
                        <UserCheck className="w-4 h-4" /> Add Existing
                    </Button>
                    <Button onClick={() => setShowInviteDialog(true)} className="bg-primary hover:bg-primary/90 gap-2">
                        <UserPlus className="w-4 h-4" /> Invite New
                    </Button>
                </div>
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
                            {isLoading && filteredUsers.length === 0 ? (
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
                                            {u.role === 'ENTITY_ADMIN' ? 'Admin' : 'Member'}
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

            {/* Invite New User Dialog */}
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
                            onKeyDown={(e) => e.key === 'Enter' && handleInviteUser()}
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

            {/* Add Existing Users Dialog */}
            <Dialog open={showAddExistingDialog} onOpenChange={setShowAddExistingDialog}>
                <DialogContent className="glass-pane border-white/10 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add Existing Organization Users</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-gray-400 mb-4">
                            Select users from your organization to add to this entity.
                        </p>
                        <div className="max-h-96 overflow-y-auto border border-white/10 rounded-md">
                            {organizationUsers.length > 0 ? (
                                organizationUsers.map(orgUser => (
                                    <label
                                        key={orgUser.user_id}
                                        className="flex items-center gap-3 p-3 hover:bg-white/5 border-b border-white/10 last:border-0 cursor-pointer"
                                    >
                                        <Checkbox
                                            checked={selectedUserIds.includes(orgUser.user_id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedUserIds([...selectedUserIds, orgUser.user_id]);
                                                } else {
                                                    setSelectedUserIds(selectedUserIds.filter(id => id !== orgUser.user_id));
                                                }
                                            }}
                                        />
                                        <Avatar className="w-8 h-8">
                                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                                {(orgUser.name || orgUser.email).charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">{orgUser.name || orgUser.email}</p>
                                            {orgUser.name && <p className="text-xs text-gray-400">{orgUser.email}</p>}
                                        </div>
                                    </label>
                                ))
                            ) : (
                                <div className="p-8 text-center text-gray-400">
                                    <p>No available users to add.</p>
                                    <p className="text-sm mt-1">All organization users are already in this entity.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost" disabled={isAddingUsers}>Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleAddExisting} disabled={isAddingUsers || selectedUserIds.length === 0}>
                            {isAddingUsers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''} Users
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ClientUsersPage;
