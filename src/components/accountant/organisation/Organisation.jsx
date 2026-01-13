import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, ArrowLeft, Users, UserPlus, Loader2, RefreshCw, Briefcase, Send, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth.jsx';
import {
    listOrganisations,
    createOrganisation,
    updateOrganisation,
    deleteOrganisation,
    listEntities,
    createEntity,
    updateEntity,
    deleteEntity,
    listOrgUsers,
    resendToken,
    inviteOrganizationUser,
    deleteOrgUser
} from '@/lib/api';
import { deleteCaTeamMember } from '@/lib/api/organisation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ORG_LIST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ORG_ENTITIES_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const ORG_USERS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

const orgListCache = {
    data: null,
    timestamp: 0,
};

// Per-org caches to avoid re-fetching while navigating back/forth between orgs.
const orgEntitiesCache = new Map();
const orgUsersCache = new Map();

// Request de-dupe so rapid re-renders / tab switches don’t trigger duplicate calls.
const entitiesInFlight = new Map();
const usersInFlight = new Map();

const isCacheValid = (timestamp, ttl) => !!timestamp && Date.now() - timestamp < ttl;

const getFromCache = (cache, orgId, ttl) => {
    if (!cache.has(orgId)) return null;
    const cached = cache.get(orgId);
    if (isCacheValid(cached?.timestamp, ttl)) return cached?.data;
    cache.delete(orgId);
    return null;
};

const setCache = (cache, orgId, data) => {
    cache.set(orgId, { data, timestamp: Date.now() });
};

const invalidateOrgDetailsCache = (orgId) => {
    if (orgId) {
        orgEntitiesCache.delete(orgId);
        orgUsersCache.delete(orgId);
    } else {
        orgEntitiesCache.clear();
        orgUsersCache.clear();
    }
};

const invalidateOrgListCache = () => {
    orgListCache.data = null;
    orgListCache.timestamp = 0;
};

const Organisation = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [organisations, setOrganisations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMutating, setIsMutating] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [showOrgForm, setShowOrgForm] = useState(false);
    const [editingOrg, setEditingOrg] = useState(null);
    const [orgName, setOrgName] = useState('');
    const [orgToDelete, setOrgToDelete] = useState(null);
    const [entities, setEntities] = useState([]);
    const [orgUsers, setOrgUsers] = useState([]);
    const [showEntityForm, setShowEntityForm] = useState(false);
    const [editingEntity, setEditingEntity] = useState(null);
    const [entityName, setEntityName] = useState('');
    const [activeTab, setActiveTab] = useState('entities');
    const [isEntitiesLoading, setIsEntitiesLoading] = useState(false);
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [showInviteUserDialog, setShowInviteUserDialog] = useState(false);
    const [inviteUserEmail, setInviteUserEmail] = useState('');
    const [isSendingInvite, setIsSendingInvite] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'email', direction: 'ascending' });
    const [statusFilter, setStatusFilter] = useState('all');


    const fetchOrganisations = useCallback(async (force = false) => {
    if (!user) return;

    if (!force && isCacheValid(orgListCache.timestamp, ORG_LIST_CACHE_TTL) && orgListCache.data) {
        setOrganisations(orgListCache.data);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    try {
        const data = await listOrganisations(user.access_token);
        setOrganisations(data || []);
        orgListCache.data = data || [];
        orgListCache.timestamp = Date.now();
    } catch (error) {
        toast({
            title: 'Error fetching data',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
    }, [user, toast]);

    useEffect(() => {
        fetchOrganisations();
    }, [fetchOrganisations]);

    const normalizeOrgUsers = useCallback((orgUsersData) => {
        const invited = orgUsersData?.invited_users || [];
        const joined = orgUsersData?.joined_users || [];

        // Filter out invited users who have already joined
        const joinedEmails = new Set(joined.map(u => u.email));
        const uniqueInvited = invited.filter(u => !joinedEmails.has(u.email));

        return [...uniqueInvited, ...joined];
    }, []);

    const fetchOrgEntities = useCallback(async (orgId, { force = false } = {}) => {
        if (!orgId || !user?.access_token) return;

        if (!force) {
            const cached = getFromCache(orgEntitiesCache, orgId, ORG_ENTITIES_CACHE_TTL);
            if (cached) {
                setEntities(cached);
                return;
            }
        }

        if (entitiesInFlight.has(orgId)) {
            setIsEntitiesLoading(true);
            try {
                const data = await entitiesInFlight.get(orgId);
                setEntities(data || []);
            } finally {
                setIsEntitiesLoading(false);
            }
            return;
        }

        setIsEntitiesLoading(true);
        const promise = listEntities(orgId, user.access_token);
        entitiesInFlight.set(orgId, promise);
        try {
            const data = await promise;
            const normalized = data || [];
            setEntities(normalized);
            setCache(orgEntitiesCache, orgId, normalized);
        } catch (error) {
            toast({
                title: 'Error fetching entities',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            entitiesInFlight.delete(orgId);
            setIsEntitiesLoading(false);
        }
    }, [user, toast]);

    const fetchOrgUsers = useCallback(async (orgId, { force = false } = {}) => {
        if (!orgId || !user?.access_token) return;

        if (!force) {
            const cached = getFromCache(orgUsersCache, orgId, ORG_USERS_CACHE_TTL);
            if (cached) {
                setOrgUsers(cached);
                return;
            }
        }

        if (usersInFlight.has(orgId)) {
            setIsUsersLoading(true);
            try {
                const data = await usersInFlight.get(orgId);
                setOrgUsers(data || []);
            } finally {
                setIsUsersLoading(false);
            }
            return;
        }

        setIsUsersLoading(true);
        const promise = listOrgUsers(orgId, user.access_token).then(normalizeOrgUsers);
        usersInFlight.set(orgId, promise);
        try {
            const data = await promise;
            const normalized = data || [];
            setOrgUsers(normalized);
            setCache(orgUsersCache, orgId, normalized);
        } catch (error) {
            toast({
                title: 'Error fetching users',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            usersInFlight.delete(orgId);
            setIsUsersLoading(false);
        }
    }, [user, toast, normalizeOrgUsers]);

    useEffect(() => {
        if (!selectedOrg) return;

        // New org selected: reset tab to entities and fetch entities immediately.
        setActiveTab('entities');
        setEntities([]);
        setOrgUsers([]);

        fetchOrgEntities(selectedOrg.id);
        // Users are lazy-loaded when user switches to the Users tab.
    }, [selectedOrg, fetchOrgEntities]);

    useEffect(() => {
        if (!selectedOrg) return;
        if (activeTab !== 'users') return;

        fetchOrgUsers(selectedOrg.id);
    }, [activeTab, selectedOrg, fetchOrgUsers]);

    const sortedAndFilteredUsers = useMemo(() => {
        let filteredUsers = [...orgUsers];

        if (statusFilter !== 'all') {
            filteredUsers = filteredUsers.filter(user => user.status.toLowerCase() === statusFilter);
        }

        if (sortConfig.key) {
            filteredUsers.sort((a, b) => {
                const key = sortConfig.key;
                let valA = a[key];
                let valB = b[key];

                if (key === 'role') {
                    valA = a.status.toLowerCase() === 'joined' ? (a.role === 'CLIENT_USER' ? 'Organisation Owner' : 'Member') : 'N/A';
                    valB = b.status.toLowerCase() === 'joined' ? (b.role === 'CLIENT_USER' ? 'Organisation Owner' : 'Member') : 'N/A';
                }

                if (valA < valB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        return filteredUsers;
    }, [orgUsers, sortConfig, statusFilter]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleAddOrg = () => {
        setEditingOrg(null);
        setOrgName('');
        setShowOrgForm(true);
    };

    const handleEditOrg = (org) => {
        setEditingOrg(org);
        setOrgName(org.name);
        setShowOrgForm(true);
    };

    const handleSaveOrg = async () => {
        if (!orgName.trim()) {
            toast({ title: "Error", description: "Organisation name cannot be empty.", variant: "destructive" });
            return;
        }
        setIsMutating(true);
        try {
            if (editingOrg) {
                await updateOrganisation(editingOrg.id, { name: orgName }, user.access_token);
                toast({ title: "Success", description: "Organisation updated." });

                // Keep details header in sync when editing the currently selected org.
                if (selectedOrg?.id === editingOrg.id) {
                    setSelectedOrg(prev => prev ? { ...prev, name: orgName } : prev);
                }
            } else {
                if (!user.id) throw new Error("CA Account ID missing.");
                await createOrganisation({ name: orgName, ca_account_id: user.id }, user.access_token);
                toast({ title: "Success", description: "Organisation added." });
            }
            setShowOrgForm(false);
            invalidateOrgListCache();
            fetchOrganisations(true);
        } catch (error) {
            toast({ title: "Error saving organisation", description: error.message, variant: "destructive" });
        } finally {
            setIsMutating(false);
        }
    };

    const handleDeleteOrg = async () => {
        if (!orgToDelete) return;
        setIsMutating(true);
        try {
            await deleteOrganisation(orgToDelete.id, user.access_token);
            toast({ title: "Success", description: "Organisation deleted." });
            setOrgToDelete(null);
            invalidateOrgDetailsCache(orgToDelete.id);
            invalidateOrgListCache();
            fetchOrganisations(true);
            if (selectedOrg && selectedOrg.id === orgToDelete.id) {
                setSelectedOrg(null);
            }
        } catch (error) {
            toast({ title: "Error deleting organisation", description: error.message, variant: "destructive" });
        } finally {
            setIsMutating(false);
        }
    };

    const handleAddEntity = () => {
        setEditingEntity(null);
        setEntityName('');
        setShowEntityForm(true);
    };

    const handleEditEntity = (entity) => {
        setEditingEntity(entity);
        setEntityName(entity.name);
        setShowEntityForm(true);
    };

    const handleSaveEntity = async () => {
        if (!entityName.trim()) {
            toast({ title: "Error", description: "Entity name cannot be empty.", variant: "destructive" });
            return;
        }
        setIsMutating(true);
        try {
            if (editingEntity) {
                await updateEntity(editingEntity.id, { name: entityName }, user.access_token);
                toast({ title: "Success", description: "Entity updated." });
            } else {
                await createEntity({ name: entityName, organization_id: selectedOrg.id }, user.access_token);
                toast({ title: "Success", description: "Entity created." });
            }
            setShowEntityForm(false);
            invalidateOrgDetailsCache(selectedOrg.id);
            fetchOrgEntities(selectedOrg.id, { force: true });
        } catch (error) {
            toast({ title: "Error saving entity", description: error.message, variant: "destructive" });
        } finally {
            setIsMutating(false);
        }
    };

    const handleDeleteEntity = async (entityId) => {
        setIsMutating(entityId);
        try {
            await deleteEntity(entityId, user.access_token);
            toast({ title: "Success", description: "Entity deleted." });
            invalidateOrgDetailsCache(selectedOrg.id);
            fetchOrgEntities(selectedOrg.id, { force: true });
        } catch (error) {
            toast({ title: "Error deleting entity", description: error.message, variant: "destructive" });
        } finally {
            setIsMutating(false);
        }
    };

    const handleResendToken = async (email) => {
        setIsMutating(email);
        try {
            await resendToken(email);
            toast({ title: "Success", description: `Token resent to ${email}.` });
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsMutating(false);
        }
    };

    const handleDeleteOrgUser = async (u) => {
        setIsMutating(u.user_id || u.email);
        try {
            // If user is a CA team member (by role or explicit property), use the CA team member delete API (by email)
            if (
                u.is_ca_team_member ||
                u.ca_team_member_token ||
                u.role === 'CA_TEAM_MEMBER' ||
                u.role === 'CA_ACCOUNTANT' // adjust as needed for your data
            ) {
                await deleteCaTeamMember(u.email, user.access_token);
            } else {
                // fallback to org user delete
                await deleteOrgUser(selectedOrg.id, u.user_id, user.access_token);
            }
            toast({ title: "Success", description: `User ${u.email} deleted.` });
            // Always refresh the user list after deletion
            if (selectedOrg?.id) {
                orgUsersCache.delete(selectedOrg.id);
                fetchOrgUsers(selectedOrg.id, { force: true });
            }
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsMutating(false);
        }
    };

    const handleInviteUser = () => {
        setInviteUserEmail('');
        setShowInviteUserDialog(true);
    };

    const handleSendUserInvite = async () => {
        if (!inviteUserEmail.trim()) {
            toast({ title: "Error", description: "Email cannot be empty.", variant: "destructive" });
            return;
        }
        if (!selectedOrg?.id || !user?.access_token) {
            toast({
                title: "❌ Missing Information",
                description: "Organisation ID or access token is missing.",
                variant: "destructive",
            });
            return;
        }

        setIsSendingInvite(true);
        try {
            await inviteOrganizationUser(selectedOrg.id, inviteUserEmail, user.agency_id, user.access_token);
            toast({
                title: "✅ Invite Sent!",
                description: `An invitation has been sent to ${inviteUserEmail}.`,
            });
            setShowInviteUserDialog(false);
            orgUsersCache.delete(selectedOrg.id);
            fetchOrgUsers(selectedOrg.id, { force: true });
        } catch (error) {
            toast({
                title: "❌ Error",
                description: error.message || "Failed to send the invitation. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSendingInvite(false);
        }
    };

    const renderOrgList = () => (
        <motion.div key="list" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Organisations</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fetchOrganisations(true)} disabled={isLoading}><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></Button>
                    <Button onClick={handleAddOrg}><Plus className="w-4 h-4 mr-2" /> Add Organisation</Button>
                </div>
            </div>
            <div className="glass-pane p-4 rounded-lg flex-grow">
                {isLoading ? <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>
                    : organisations.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow className="border-b-white/10"><TableHead>Name</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {organisations.map(org => (
                                    <TableRow key={org.id} className="border-none hover:bg-white/5 cursor-pointer" onClick={() => setSelectedOrg(org)}>
                                        <TableCell className="font-medium">{org.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditOrg(org); }} disabled={isMutating}><Edit className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400" onClick={(e) => { e.stopPropagation(); setOrgToDelete(org); }} disabled={isMutating}>
                                                {isMutating && orgToDelete?.id === org.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-16 text-gray-500"><p className="text-lg">No organisations found.</p><p>Click "Add Organisation" to get started.</p></div>
                    )}
            </div>
        </motion.div>
    );

    const SortableHeader = ({ children, sortKey }) => (
        <TableHead>
            <Button variant="ghost" onClick={() => requestSort(sortKey)} className="px-0 hover:bg-transparent">
                {children}
                {sortConfig.key === sortKey && (
                    sortConfig.direction === 'ascending' ? <ArrowUp className="w-4 h-4 ml-2" /> : <ArrowDown className="w-4 h-4 ml-2" />
                )}
            </Button>
        </TableHead>
    );

    const renderOrgDetails = () => (
        <motion.div key="details" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="icon" onClick={() => setSelectedOrg(null)}><ArrowLeft className="w-4 h-4" /></Button>
                <h1 className="text-3xl font-bold text-white">{selectedOrg.name}</h1>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                        if (!selectedOrg?.id) return;
                        if (activeTab === 'users') {
                            orgUsersCache.delete(selectedOrg.id);
                            fetchOrgUsers(selectedOrg.id, { force: true });
                        } else {
                            orgEntitiesCache.delete(selectedOrg.id);
                            fetchOrgEntities(selectedOrg.id, { force: true });
                        }
                    }}
                    disabled={activeTab === 'users' ? isUsersLoading : isEntitiesLoading}
                >
                    <RefreshCw className={`w-4 h-4 ${(activeTab === 'users' ? isUsersLoading : isEntitiesLoading) ? 'animate-spin' : ''}`} />
                </Button>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                    <TabsTrigger value="entities"><Briefcase className="w-4 h-4 mr-2" />Entities ({entities.length})</TabsTrigger>
                    <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Users ({orgUsers.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="entities">
                    <div className="glass-pane p-4 rounded-lg">
                        <Button onClick={handleAddEntity} className="mb-4"><Plus className="w-4 h-4 mr-2" />Add Entity</Button>
                        {isEntitiesLoading ? <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
                            : entities.length > 0 ? (
                                <Table>
                                    <TableHeader><TableRow className="border-b-white/10"><TableHead>Name</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {entities.map(entity => (
                                            <TableRow key={entity.id} className="border-none">
                                                <TableCell className="font-medium">{entity.name}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditEntity(entity)} disabled={isMutating === entity.id}><Edit className="w-4 h-4" /></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-red-500" disabled={isMutating === entity.id}>{isMutating === entity.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. This will permanently delete the entity.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteEntity(entity.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : <div className="text-center py-16 text-gray-500"><p>No entities found for this organisation.</p></div>}
                    </div>
                </TabsContent>
                <TabsContent value="users">
                    <div className="glass-pane p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <Button onClick={handleInviteUser}><UserPlus className="w-4 h-4 mr-2" />Invite User</Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline"><Filter className="w-4 h-4 mr-2" />Filter</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                                        <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="invited">Invited</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="joined">Joined</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        {isUsersLoading ? <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
                            : sortedAndFilteredUsers.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b-white/10">
                                            <SortableHeader sortKey="email">Email</SortableHeader>
                                            <SortableHeader sortKey="role">Role</SortableHeader>
                                            <SortableHeader sortKey="status">Status</SortableHeader>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedAndFilteredUsers.map(u => (
                                            <TableRow key={u.email} className="border-none">
                                                <TableCell>{u.email}</TableCell>
                                                <TableCell>
                                                    {u.status.toLowerCase() === 'joined' ? (
                                                        u.role === 'CLIENT_USER' ? 'Organisation Owner' : 'Member'
                                                    ) : (
                                                        <span className="text-gray-500">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell><Badge variant={u.status.toLowerCase() === 'joined' ? 'success' : 'secondary'}>{u.status}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    {u.status.toLowerCase() === 'invited' && <Button onClick={() => handleResendToken(u.email)} disabled={isMutating === u.email}>{isMutating === u.email ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Resend Invite</>}</Button>}
                                                    {u.status.toLowerCase() === 'joined' &&
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="destructive" size="icon" disabled={isMutating === u.user_id}>{isMutating === u.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</Button>
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
                                                                    <AlertDialogAction onClick={() => handleDeleteOrgUser(u)}>Delete</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : <div className="text-center py-16 text-gray-500"><p>No users found matching the criteria.</p></div>}
                    </div>
                </TabsContent>
            </Tabs>
        </motion.div>
    );

    return (
        <div className="p-8 h-full">
            <AnimatePresence mode="wait">
                {selectedOrg ? renderOrgDetails() : renderOrgList()}
            </AnimatePresence>

            <Dialog open={showOrgForm} onOpenChange={setShowOrgForm}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingOrg ? 'Edit' : 'Add'} Organisation</DialogTitle></DialogHeader>
                    <div className="py-4"><Label htmlFor="orgName">Organisation Name</Label><Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="mt-2" /></div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" disabled={isMutating}>Cancel</Button></DialogClose>
                        <Button onClick={handleSaveOrg} disabled={isMutating}>{isMutating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showEntityForm} onOpenChange={setShowEntityForm}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingEntity ? 'Edit' : 'Add'} Entity</DialogTitle></DialogHeader>
                    <div className="py-4"><Label htmlFor="entityName">Entity Name</Label><Input id="entityName" value={entityName} onChange={(e) => setEntityName(e.target.value)} className="mt-2" /></div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" disabled={isMutating}>Cancel</Button></DialogClose>
                        <Button onClick={handleSaveEntity} disabled={isMutating}>{isMutating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showInviteUserDialog} onOpenChange={setShowInviteUserDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Invite Organisation User</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="inviteEmail">User Email</Label>
                        <Input id="inviteEmail" type="email" value={inviteUserEmail} onChange={(e) => setInviteUserEmail(e.target.value)} className="mt-2" placeholder="user@example.com" />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" disabled={isSendingInvite}>Cancel</Button></DialogClose>
                        <Button onClick={handleSendUserInvite} disabled={isSendingInvite}>
                            {isSendingInvite && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Send Invite
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!orgToDelete} onOpenChange={() => setOrgToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the organisation "{orgToDelete?.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setOrgToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteOrg} disabled={isMutating}>
                            {isMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Organisation;
