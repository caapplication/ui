import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { resendToken, deleteOrgUser, inviteOrganizationUser } from '@/lib/api/organisation';
import { useToast } from '@/components/ui/use-toast';

const ClientUsersTab = ({ client }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loadingUserId, setLoadingUserId] = useState(null);

    const invitedUsers = (client.orgUsers?.invited_users || []).map(user => ({ ...user, status: 'Invited', role: 'CLIENT user' }));
    const joinedUsers = (client.orgUsers?.joined_users || []).map(user => ({ ...user, status: 'Joined', role: 'ENTITY USER' }));
    const allUsers = [...invitedUsers, ...joinedUsers];

    const [userFilter, setUserFilter] = useState('all'); // all, joined, invited

    const filteredUsers = allUsers.filter(user => {
        if (userFilter === 'all') return true;
        if (userFilter === 'joined') return user.status === 'Joined';
        if (userFilter === 'invited') return user.status === 'Invited';
        return true;
    });

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
        setLoadingUserId(userObj.user_id);
        try {
            if (client.organization_id && userObj.user_id && user?.access_token) {
                await deleteOrgUser(client.organization_id, userObj.user_id, user.access_token);
                toast({ title: "User deleted", description: `User ${userObj.email} deleted.` });
                // Optionally, trigger a refresh here (parent should refetch client/orgUsers)
            }
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoadingUserId(null);
        }
    };

    return (
        <div className="glass-pane p-4 rounded-lg">
            <div className="flex justify-end mb-2">
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
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                            <TableRow key={user.user_id}>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    {user.role === 'ENTITY USER'
                                        ? 'Organization Owner'
                                        : user.role === 'CLIENT user'
                                            ? 'Member'
                                            : user.role}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.status === 'Joined' ? 'success' : 'default'}>
                                        {user.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {user.status === 'Invited' ? (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            disabled={loadingUserId === user.user_id}
                                            onClick={e => {
                                                e.stopPropagation();
                                                handleResendInvite(user);
                                            }}
                                        >
                                            {loadingUserId === user.user_id ? "Sending..." : "Resend Invite"}
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={loadingUserId === user.user_id}
                                            onClick={e => {
                                                e.stopPropagation();
                                                handleDeleteUser(user);
                                            }}
                                        >
                                            <span className="sr-only">Delete</span>
                                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                                                <path d="M6 7h12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan="4" className="text-center">
                                No users found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default ClientUsersTab;
