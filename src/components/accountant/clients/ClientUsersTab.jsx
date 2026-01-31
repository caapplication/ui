import React, { useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Filter, UserPlus, Search, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { resendToken, inviteEntityUser, listEntityUsers, deleteEntityUser, deleteInvitedOrgUser, listOrgUsers, addEntityUsers, listAllAccessibleEntityUsers } from '@/lib/api/organisation';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { formatToIST } from '@/lib/dateUtils';

const ClientUsersTab = ({ client, onUserInvited, onUserDeleted }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loadingUserId, setLoadingUserId] = useState(null);
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [userFilter, setUserFilter] = useState('all'); // all, joined, invited

    // State to store users fetched for this entity
    const [users, setUsers] = useState({ invited_users: [], joined_users: [] });
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Add Existing Users State
    const [showAddExistingDialog, setShowAddExistingDialog] = useState(false);
    const [organizationUsers, setOrganizationUsers] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [isAddingUsers, setIsAddingUsers] = useState(false);
    const [loadingOrgUsers, setLoadingOrgUsers] = useState(false);
    const [existingUserSearch, setExistingUserSearch] = useState('');

    // Fetch users for the current client (entity)
    const fetchUsers = async () => {
        if (!client.id && !client.entity_id) return;

        setLoadingUsers(true);
        try {
            const entityId = client.id || client.entity_id;
            const data = await listEntityUsers(entityId, user.access_token);
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch entity users:", error);
            // Fallback or just show empty if access denied or error
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [client.id, client.entity_id, user.access_token]);

    // Format users for display
    const invitedUsers = (users.invited_users || []).map(u => ({
        ...u,
        status: 'Invited',
        role: u.target_role || 'ENTITY_USER'
    }));
    const joinedUsers = (users.joined_users || []).map(u => ({
        ...u,
        status: 'Joined'
    }));
    const allUsers = [...invitedUsers, ...joinedUsers];

    const filteredUsers = useMemo(() => {
        let filtered = allUsers.filter(u => {
            if (userFilter === 'all') return true;
            if (userFilter === 'joined') return u.status === 'Joined';
            if (userFilter === 'invited') return u.status === 'Invited';
            return true;
        });

        // Apply search filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(u => {
                const email = (u.email || '').toLowerCase();
                const role = (u.role || '').toLowerCase();
                const status = (u.status || '').toLowerCase();
                return email.includes(term) || role.includes(term) || status.includes(term);
            });
        }

        return filtered;
    }, [allUsers, userFilter, searchTerm]);

    // Handler for Resend Invite
    const handleResendInvite = async (userObj) => {
        setLoadingUserId(userObj.user_id);
        try {
            await resendToken(userObj.email);
            toast({ title: "Invite resent", description: `Invite resent to ${userObj.email}` });
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoadingUserId(null);
        }
    };

    // Handler for Delete User
    const handleDeleteUser = async (userObj) => {
        setLoadingUserId(userObj.user_id || userObj.email);
        const entityId = client.id || client.entity_id;
        try {
            if (userObj.status === 'Invited') {
                // If invite, we delete the token. 
                // Note: deleteInvitedOrgUser deletes based on email. 
                // If inviting to entity uses same InviteToken table, this might delete invite across board if email key?
                // InviteTokens are unique by token, but deleteInvitedOrgUser looks up by email.
                // Depending on backend implementation, it might delete the first one it finds.
                // But generally users are invited once.

                // Ideally we should have deleteEntityInvite but for now using existing if compatible
                await deleteInvitedOrgUser(userObj.email, user.access_token);
            } else {
                // Determine if we deleting from Organization or Entity
                // Since this tab is for Entity users, we should use deleteEntityUser
                await deleteEntityUser(entityId, userObj.user_id, user.access_token);
            }
            toast({ title: "User deleted", description: `User ${userObj.email} deleted.` });

            // Reload users locally
            fetchUsers();

            // Notify parent to update counter
            if (onUserDeleted) onUserDeleted();
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoadingUserId(null);
        }
    };

    // Handler for Invite User
    const handleInviteUser = async () => {
        if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
            toast({ title: "Error", description: "Please enter a valid email.", variant: "destructive" });
            return;
        }

        try {
            const entityId = client.id || client.entity_id;
            await inviteEntityUser(entityId, inviteEmail, user.access_token);
            toast({ title: "Success", description: `Invitation sent to ${inviteEmail}.` });
            setShowInviteDialog(false);
            setInviteEmail('');

            // Refresh local list
            fetchUsers();

            if (onUserInvited) {
                onUserInvited();
            }
        } catch (error) {
            toast({ title: "Error", description: `Failed to send invite: ${error.message}`, variant: "destructive" });
        }
    };

    const handleOpenAddExisting = async () => {
        setShowAddExistingDialog(true);
        setLoadingOrgUsers(true);
        setSelectedUserIds([]);
        try {
            // Fetch all entity users from all accessible entities
            const res = await listAllAccessibleEntityUsers(user.access_token);

            // Filter out users already in the entity (either joined or invited)
            const existingEntityUserIds = new Set([
                ...(users.joined_users || []).map(u => u.user_id),
                ...(users.invited_users || []).map(u => u.user_id)
            ]);

            // Allow adding any entity user who isn't already in this entity
            const available = (res.joined_users || []).filter(u => !existingEntityUserIds.has(u.user_id));
            setOrganizationUsers(available);
        } catch (e) {
            console.error("Failed to fetch entity users:", e);
            toast({ title: "Error", description: "Failed to load available users.", variant: "destructive" });
        } finally {
            setLoadingOrgUsers(false);
        }
    };

    const handleToggleSelectUser = (userId) => {
        setSelectedUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleAddSelectedUsers = async () => {
        if (selectedUserIds.length === 0) return;

        setIsAddingUsers(true);
        try {
            const entityId = client.id || client.entity_id;
            await addEntityUsers(entityId, selectedUserIds, user.access_token);

            toast({ title: "Success", description: `${selectedUserIds.length} users added to client.` });
            setShowAddExistingDialog(false);
            fetchUsers(); // Refresh list

            if (onUserInvited) {
                onUserInvited(); // Trigger parent refresh if needed
            }
        } catch (error) {
            console.error("Failed to add users:", error);
            toast({ title: "Error", description: "Failed to add selected users.", variant: "destructive" });
        } finally {
            setIsAddingUsers(false);
        }
    };

    return (
        <div className="glass-pane p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search users..."
                        className="glass-input pl-10 bg-gray-700/50 border-gray-600 text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleOpenAddExisting}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Existing
                    </Button>
                    <Button onClick={() => setShowInviteDialog(true)}><UserPlus className="w-4 h-4 mr-2" /> Invite New</Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="secondary" className="flex items-center gap-2">
                                <Filter className="w-4 h-4" />
                                Filter
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-0 bg-[#181C2A] text-white rounded-lg shadow-lg border border-[#2A2E3A]">
                            <div className="px-4 py-3 border-b border-[#23263A] font-semibold text-sm">Filter by Status</div>
                            <div className="flex flex-col gap-1 py-2">
                                <button
                                    className={`flex items-center gap-2 px-4 py-2 text-left hover:bg-[#23263A] transition-colors w-full ${userFilter === 'all' ? 'font-bold' : ''}`}
                                    onClick={() => setUserFilter('all')}
                                >
                                    <span className="inline-block w-3 h-3 rounded-full border border-white flex items-center justify-center">
                                        {userFilter === 'all' && <span className="w-2 h-2 bg-white rounded-full block"></span>}
                                    </span>
                                    All
                                </button>
                                <button
                                    className={`flex items-center gap-2 px-4 py-2 text-left hover:bg-[#23263A] transition-colors w-full ${userFilter === 'invited' ? 'font-bold' : ''}`}
                                    onClick={() => setUserFilter('invited')}
                                >
                                    <span className="inline-block w-3 h-3 rounded-full border border-white flex items-center justify-center">
                                        {userFilter === 'invited' && <span className="w-2 h-2 bg-white rounded-full block"></span>}
                                    </span>
                                    Invited
                                </button>
                                <button
                                    className={`flex items-center gap-2 px-4 py-2 text-left hover:bg-[#23263A] transition-colors w-full ${userFilter === 'joined' ? 'font-bold' : ''}`}
                                    onClick={() => setUserFilter('joined')}
                                >
                                    <span className="inline-block w-3 h-3 rounded-full border border-white flex items-center justify-center">
                                        {userFilter === 'joined' && <span className="w-2 h-2 bg-white rounded-full block"></span>}
                                    </span>
                                    Joined
                                </button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {loadingUsers ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Login</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                                <TableRow key={u.user_id}>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>
                                        {u.role === 'CLIENT_USER' || u.role === 'CLIENT user'
                                            ? 'Member'
                                            : u.role === 'CLIENT_MASTER_ADMIN'
                                                ? 'Client Admin'
                                                : u.role === 'CLIENT_ADMIN'
                                                    ? 'Organization Owner'
                                                    : u.role === 'ENTITY_USER'
                                                        ? 'Entity User'
                                                        : u.role}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={u.status === 'Joined' ? 'success' : 'default'}>
                                            {u.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-gray-400">
                                        {formatToIST(u.last_login)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2 justify-end">
                                            {u.status === 'Invited' ? (
                                                <>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        disabled={loadingUserId === u.user_id}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            handleResendInvite(u);
                                                        }}
                                                    >
                                                        {loadingUserId === u.user_id ? "Sending..." : "Resend Invite"}
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        disabled={loadingUserId === u.user_id}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            handleDeleteUser(u);
                                                        }}
                                                    >
                                                        <span className="sr-only">Delete</span>
                                                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                                                            <path d="M6 7h12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    disabled={loadingUserId === u.user_id}
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        handleDeleteUser(u);
                                                    }}
                                                >
                                                    <span className="sr-only">Delete</span>
                                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                                                        <path d="M6 7h12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan="4" className="text-center py-8">
                                    {searchTerm.trim() ? (
                                        <span className="text-gray-400">No users found matching "{searchTerm}"</span>
                                    ) : (
                                        <span className="text-gray-400">No users found for this entity.</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}

            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite New User</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="inviteEmail">Email Address</Label>
                            <Input id="inviteEmail" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="mt-2" placeholder="user@example.com" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={handleInviteUser}>Send Invite</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showAddExistingDialog} onOpenChange={setShowAddExistingDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Team Members to Client</DialogTitle>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search users..."
                                className="pl-10"
                                value={existingUserSearch}
                                onChange={(e) => setExistingUserSearch(e.target.value)}
                            />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                            {loadingOrgUsers ? (
                                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-400" /></div>
                            ) : organizationUsers.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">No other organization members available.</p>
                            ) : (
                                organizationUsers
                                    .filter(u => {
                                        if (!existingUserSearch) return true;
                                        const term = existingUserSearch.toLowerCase();
                                        return (u.email || '').toLowerCase().includes(term) ||
                                            (u.first_name || '').toLowerCase().includes(term) ||
                                            (u.last_name || '').toLowerCase().includes(term);
                                    })
                                    .map(u => (
                                        <div key={u.user_id} className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer" onClick={() => handleToggleSelectUser(u.user_id)}>
                                            <Checkbox
                                                checked={selectedUserIds.includes(u.user_id)}
                                                onCheckedChange={() => handleToggleSelectUser(u.user_id)}
                                            />
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={u.photo_url || u.photo} />
                                                <AvatarFallback>{(u.email || '?').charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.email.split('@')[0]}</span>
                                                <span className="text-xs text-gray-400">{u.email}</span>
                                            </div>
                                        </div>
                                    ))
                            )}
                            {organizationUsers.length > 0 && organizationUsers.filter(u => {
                                if (!existingUserSearch) return true;
                                const term = existingUserSearch.toLowerCase();
                                return (u.email || '').toLowerCase().includes(term) ||
                                    (u.first_name || '').toLowerCase().includes(term) ||
                                    (u.last_name || '').toLowerCase().includes(term);
                            }).length === 0 && (
                                    <p className="text-gray-400 text-center py-4">No users found matching "{existingUserSearch}"</p>
                                )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowAddExistingDialog(false)}>Cancel</Button>
                        <Button onClick={handleAddSelectedUsers} disabled={selectedUserIds.length === 0 || isAddingUsers}>
                            {isAddingUsers ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Add Selected ({selectedUserIds.length})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ClientUsersTab;
