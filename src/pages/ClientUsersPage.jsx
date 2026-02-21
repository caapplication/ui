import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Filter, Loader2, Trash2, RefreshCw, UserCheck, History } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { listEntityUsers, inviteEntityUser, deleteEntityUser, deleteInvitedOrgUser, resendToken, listAllAccessibleEntityUsers, addEntityUsers } from '@/lib/api/organisation';
import { listDepartments } from '@/lib/api/settings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getActivityLog } from '@/lib/api/finance';
import { listTasks } from '@/lib/api/tasks';
import { getNotices } from '@/lib/api/notices';
import { getVouchers } from '@/lib/api/finance';
import { getInvoices } from '@/lib/api/finance';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    const [inviteRole, setInviteRole] = useState('CLIENT_USER');
    const [inviteDepartmentId, setInviteDepartmentId] = useState('');
    const [departmentsList, setDepartmentsList] = useState([]);
    const [isInviting, setIsInviting] = useState(false);

    // Add Existing Users State
    const [showAddExistingDialog, setShowAddExistingDialog] = useState(false);
    const [organizationUsers, setOrganizationUsers] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [isAddingUsers, setIsAddingUsers] = useState(false);
    const [existingUserSearchTerm, setExistingUserSearchTerm] = useState('');

    // Delete Confirmation State
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);

    // Action Loading States
    const [loadingUserId, setLoadingUserId] = useState(null);
    
    // Pending items check - map of user_id -> hasPending
    const [userPendingStatus, setUserPendingStatus] = useState({});

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

    // Fetch departments when invite dialog opens (for Client Handover role)
    useEffect(() => {
        if (!showInviteDialog || !entityId || !user?.access_token) return;
        const load = async () => {
            try {
                const list = await listDepartments(entityId, user.access_token);
                setDepartmentsList(Array.isArray(list) ? list : []);
            } catch {
                setDepartmentsList([]);
            }
        };
        load();
    }, [showInviteDialog, entityId, user?.access_token]);

    // Check if user has pending items (direct assignments only, not collaborators)
    const checkUserPendingItems = async (userId) => {
        if (!entityId || !userId || !user?.access_token || !user?.agency_id) return false;
        
        try {
            // Check pending tasks (assigned_to = userId, status != completed)
            // TaskStatus: pending, in_progress, hold, completed
            const tasks = await listTasks(user.agency_id, user.access_token, {
                assigned_to: userId,
                client_id: entityId,
                limit: 100  // Get more to filter by status
            }).catch(() => ({ items: [] }));
            
            const pendingTasks = tasks?.items?.filter(t => 
                t.status !== 'completed' && String(t.assigned_to) === String(userId)
            ) || [];
            if (pendingTasks.length > 0) return true;
            
            // Check pending notices (created_by = userId, status != closed)
            const notices = await getNotices(entityId, user.access_token).catch(() => []);
            const pendingNotices = Array.isArray(notices) ? notices.filter(n => 
                (String(n.created_by) === String(userId) || String(n.created_by_id) === String(userId) || String(n.owner_id) === String(userId)) &&
                n.status !== 'closed' && n.status !== 'completed'
            ) : [];
            if (pendingNotices.length > 0) return true;
            
            // Check pending vouchers (created_by/owner_id = userId, status != verified/closed)
            const vouchers = await getVouchers(entityId, user.access_token).catch(() => []);
            const pendingVouchers = Array.isArray(vouchers) ? vouchers.filter(v =>
                (String(v.created_by) === String(userId) || String(v.created_by_id) === String(userId) || String(v.owner_id) === String(userId)) &&
                v.status !== 'verified' && v.status !== 'closed' && v.status !== 'approved'
            ) : [];
            if (pendingVouchers.length > 0) return true;
            
            // Check pending invoices (created_by/owner_id = userId, status != verified/closed)
            const invoices = await getInvoices(entityId, user.access_token).catch(() => []);
            const pendingInvoices = Array.isArray(invoices) ? invoices.filter(i =>
                (String(i.created_by) === String(userId) || String(i.created_by_id) === String(userId) || String(i.owner_id) === String(userId)) &&
                i.status !== 'verified' && i.status !== 'closed' && i.status !== 'approved'
            ) : [];
            if (pendingInvoices.length > 0) return true;
            
            return false;
        } catch (error) {
            console.error('Error checking pending items:', error);
            return false; // Fail open - allow delete if check fails
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

    // Check pending items for all joined users (after allUsers is defined)
    useEffect(() => {
        const checkAllUsersPending = async () => {
            if (!entityId || !user?.access_token || !allUsers || allUsers.length === 0) return;
            
            const pendingMap = {};
            for (const u of allUsers) {
                if (u.status === 'Joined' && u.user_id) {
                    const hasPending = await checkUserPendingItems(u.user_id);
                    pendingMap[u.user_id] = hasPending;
                }
            }
            setUserPendingStatus(pendingMap);
        };
        
        checkAllUsersPending();
    }, [allUsers, entityId, user?.access_token, user?.agency_id]);

    const handleInviteUser = async () => {
        if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
            toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
            return;
        }

        if (!entityId) {
            toast({ title: "No Entity Selected", description: "Please select an entity from the sidebar.", variant: "destructive" });
            return;
        }

        if (inviteRole === 'CLIENT_HANDOVER' && !inviteDepartmentId) {
            toast({ title: "Department Required", description: "Please select a department for Client Handover role.", variant: "destructive" });
            return;
        }

        setIsInviting(true);
        try {
            await inviteEntityUser(entityId, inviteEmail, user.access_token, inviteRole, inviteDepartmentId || null);
            toast({ title: "Invitation Sent", description: `Invited ${inviteEmail} successfully.` });
            setShowInviteDialog(false);
            setInviteEmail('');
            setInviteRole('CLIENT_USER');
            setInviteDepartmentId('');
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
            setExistingUserSearchTerm('');
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

    const handleDeleteUser = (userObj) => {
        setDeleteConfirmation(userObj);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation) return;

        const userObj = deleteConfirmation;
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
            setDeleteConfirmation(null);
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

    const [activeTab, setActiveTab] = useState('members');

    return (
        <div className="p-4 md:p-8 h-full flex flex-col text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Manage Team</h1>
                    <p className="text-gray-400 mt-1">Add and manage members of your entity.</p>
                </div>

                {/* Actions moved to tabs row */}
            </div>

            <Tabs defaultValue="members" className="flex-1 flex flex-col min-h-0 h-full" onValueChange={setActiveTab}>
                <div className="mb-6 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <TabsList>
                        <TabsTrigger value="members">Team Members</TabsTrigger>
                        <TabsTrigger value="activity">Activity Log</TabsTrigger>
                    </TabsList>

                    {/* Actions only visible when on members tab */}
                    {activeTab === 'members' && user?.role !== 'CLIENT_USER' && (
                        <div className="flex gap-2">
                            <Button onClick={handleAddExisting} variant="outline" className="gap-2">
                                <UserCheck className="w-4 h-4" /> Add Existing
                            </Button>
                            <Button onClick={() => setShowInviteDialog(true)} className="bg-primary hover:bg-primary/90 gap-2">
                                <UserPlus className="w-4 h-4" /> Invite New
                            </Button>
                        </div>
                    )}
                </div>

                <TabsContent value="members" className="flex-1 flex flex-col min-h-0 !mt-0 h-full">
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
                                        <TableHead className="text-gray-300">Last Login</TableHead>
                                        {user?.role !== 'CLIENT_USER' && <TableHead className="text-right text-gray-300">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading && filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={user?.role !== 'CLIENT_USER' ? 4 : 3} className="h-24 text-center">
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
                                                    {u.role === 'CLIENT_MASTER_ADMIN'
                                                        ? 'Client Admin'
                                                        : u.role === 'CLIENT_ADMIN' || u.role === 'ENTITY_ADMIN'
                                                            ? 'Organization Owner'
                                                            : u.role === 'CLIENT_HANDOVER'
                                                                ? 'Client Handover'
                                                                : u.role === 'ENTITY_USER'
                                                                    ? 'Entity User'
                                                                    : 'Member'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={u.status === 'Joined' ? 'default' : 'secondary'} className={u.status === 'Joined' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'}>
                                                        {u.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-gray-400">
                                                    {u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : <span className="text-gray-500 italic">Never</span>}
                                                </TableCell>
                                                {user?.role !== 'CLIENT_USER' && (
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {/* Resend Invite */}
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

                                                            {/* Delete Button */}
                                                            {(() => {
                                                                const isSelf = user?.email === u.email;
                                                                const userRole = user?.role;
                                                                const hasPending = u.user_id && userPendingStatus[u.user_id];

                                                                if (userRole === 'CLIENT_USER') {
                                                                    return null;
                                                                }

                                                                if (userRole === 'CLIENT_MASTER_ADMIN' && isSelf) {
                                                                    return null;
                                                                }

                                                                return (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className={`${hasPending ? 'text-gray-500 cursor-not-allowed' : 'text-red-400 hover:text-red-300 hover:bg-red-500/20'}`}
                                                                        onClick={() => !hasPending && handleDeleteUser(u)}
                                                                        disabled={loadingUserId === (u.user_id || u.email) || hasPending}
                                                                        title={hasPending ? 'Cannot delete: User has pending tasks, notices, vouchers, or invoices' : 'Delete user'}
                                                                    >
                                                                        {loadingUserId === (u.user_id || u.email) ? (
                                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                                        ) : (
                                                                            <Trash2 className="w-4 h-4" />
                                                                        )}
                                                                    </Button>
                                                                );
                                                            })()}
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={user?.role !== 'CLIENT_USER' ? 4 : 3} className="h-24 text-center text-gray-400">
                                                No users found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="activity" className="flex-1 flex flex-col min-h-0 !mt-0 h-full">
                    <TeamActivityLog entityId={entityId} />
                </TabsContent>
            </Tabs>

            {/* Invite New User Dialog */}
            <Dialog open={showInviteDialog} onOpenChange={(open) => { setShowInviteDialog(open); if (!open) { setInviteRole('CLIENT_USER'); setInviteDepartmentId(''); } }}>
                <DialogContent className="glass-pane border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Invite New User</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
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
                        <div>
                            <Label className="text-gray-300">User Role</Label>
                            <Select value={inviteRole} onValueChange={(v) => { setInviteRole(v); if (v !== 'CLIENT_HANDOVER') setInviteDepartmentId(''); }}>
                                <SelectTrigger className="mt-2 glass-input border-white/10 text-white">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#181C2A] border-gray-700">
                                    <SelectItem value="CLIENT_USER">Client User</SelectItem>
                                    <SelectItem value="CLIENT_HANDOVER">Client Handover</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {inviteRole === 'CLIENT_HANDOVER' && (
                            <div>
                                <Label className="text-gray-300">Department</Label>
                                <Select value={inviteDepartmentId} onValueChange={setInviteDepartmentId}>
                                    <SelectTrigger className="mt-2 glass-input border-white/10 text-white">
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#181C2A] border-gray-700">
                                        {departmentsList.map((d) => (
                                            <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                        ))}
                                        {departmentsList.length === 0 && (
                                            <span className="px-2 py-1.5 text-sm text-gray-500">No departments — add in Settings</span>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
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
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search users by name or email..."
                                className="glass-input pl-10"
                                value={existingUserSearchTerm}
                                onChange={(e) => setExistingUserSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="max-h-96 overflow-y-auto border border-white/10 rounded-md">
                            {organizationUsers
                                .filter(u =>
                                    (u.name || '').toLowerCase().includes(existingUserSearchTerm.toLowerCase()) ||
                                    (u.email || '').toLowerCase().includes(existingUserSearchTerm.toLowerCase())
                                )
                                .length > 0 ? (
                                organizationUsers
                                    .filter(u =>
                                        (u.name || '').toLowerCase().includes(existingUserSearchTerm.toLowerCase()) ||
                                        (u.email || '').toLowerCase().includes(existingUserSearchTerm.toLowerCase())
                                    )
                                    .map(orgUser => (
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
                                    <p>No available users matching your search.</p>
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteConfirmation} onOpenChange={(open) => !open && setDeleteConfirmation(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove {deleteConfirmation?.email} from this entity?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            {loadingUserId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// Activity Log Component
const TeamActivityLog = ({ entityId }) => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!entityId || !user?.access_token) return;

            setIsLoading(true);
            try {
                // Fetch all client logs
                const allLogs = await getActivityLog(entityId, 'client', user.access_token);

                // Filter for team member activities only
                // Keywords based on the actions we implemented: "Invited", "Revoked", "Removed", "Added", "Accepted"
                const teamKeywords = ['invited', 'revoked', 'removed', 'added', 'accepted', 'managed', 'team'];
                const filtered = Array.isArray(allLogs) ? allLogs.filter(log => {
                    const actionLower = (log.action || '').toLowerCase();
                    const detailsLower = (log.details || '').toLowerCase();
                    return teamKeywords.some(keyword => actionLower.includes(keyword) || detailsLower.includes(keyword));
                }) : [];

                // Sort by timestamp desc
                filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setLogs(filtered);
            } catch (error) {
                console.error("Failed to fetch activity logs:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLogs();
    }, [entityId, user?.access_token]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full glass-pane rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="flex justify-center items-center h-full glass-pane rounded-lg text-gray-400">
                No team activity logs found.
            </div>
        );
    }

    return (
        <div className="glass-pane rounded-lg h-full overflow-y-auto custom-scrollbar p-4 space-y-4">
            {logs.map((log) => {
                // Formatting logic adapted from ActivityLog.jsx
                let userDisplay = 'Unknown User';
                if (log.name && log.email) {
                    userDisplay = `${log.name} (${log.email})`;
                } else if (log.name) {
                    userDisplay = log.name;
                } else if (log.email) {
                    userDisplay = log.email;
                }

                return (
                    <div key={log.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                                <History className="w-4 h-4 text-gray-300" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">
                                <span className="font-semibold">{userDisplay}</span> {log.action}
                            </p>
                            {log.details && (
                                <p className="text-xs text-gray-300 mt-1 ml-4 pl-2 border-l-2 border-gray-600">
                                    {formatLogDetails(log.details)}
                                </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                                {new Date(log.timestamp).toLocaleString('en-IN', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Helper function to format log details (duplicated from ActivityLog.jsx for now)
const formatLogDetails = (details) => {
    if (!details) return '';
    return details
        .replace(/Role.CLIENT_MASTER_ADMIN/g, 'Client Admin')
        .replace(/Role.CLIENT_ADMIN/g, 'Organization Owner')
        .replace(/Role.ENTITY_ADMIN/g, 'Organization Owner')
        .replace(/Role.ENTITY_USER/g, 'Entity User')
        .replace(/Role.CLIENT_USER/g, 'Member')
        .replace(/Role.CA_ACCOUNTANT/g, 'Accountant')
        .replace(/Role.CA_ADMIN/g, 'Agency Admin');
};

export default ClientUsersPage;
