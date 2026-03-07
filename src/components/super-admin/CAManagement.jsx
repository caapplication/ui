import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  Users,
  Search,
  Mail,
  Calendar,
  Shield,
  Lock,
  Unlock,
  Building,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Combobox } from "@/components/ui/combobox";
import { useAuth } from '@/hooks/useAuth.jsx';
import { listAllUsers, lockUser, unlockUser, inviteCA, listAgencies, resendCAInvite } from '@/lib/api/admin';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const CAManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cas, setCas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // stores userId currently being toggled
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [agencies, setAgencies] = useState([]);
  const [inviteData, setInviteData] = useState({ email: '', agencyId: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchCAs = async () => {
    try {
      setLoading(true);
      const data = await listAllUsers(user.access_token);

      // Extract registered CA Accountants
      const allUsers = Array.isArray(data) ? data : (data?.users || []);
      const registeredCAs = allUsers.filter(u => u.role === 'CA_ACCOUNTANT');

      // Extract pending invitations
      const pendingInvites = data?.pending_ca_invites || [];

      // Merge them
      setCas([...registeredCAs, ...pendingInvites]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch CA Accountants.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAgencies = async () => {
    try {
      const data = await listAgencies(user.access_token);
      setAgencies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch agencies", error);
    }
  };

  useEffect(() => {
    if (user?.access_token) {
      fetchCAs();
      fetchAgencies();
    }
  }, [user]);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.quickAction === 'invite-ca') {
      setIsInviteModalOpen(true);
    }
  }, [location.state]);

  const handleInviteCA = async (e) => {
    e.preventDefault();
    if (!inviteData.agencyId) {
      toast({
        title: "Missing Information",
        description: "Please select an agency.",
        variant: "destructive"
      });
      return;
    }

    try {
      setInviteLoading(true);
      await inviteCA(inviteData.email, inviteData.agencyId, user.access_token);
      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${inviteData.email}.`,
      });
      setIsInviteModalOpen(false);
      setInviteData({ email: '', agencyId: '' });
      fetchCAs();
    } catch (error) {
      toast({
        title: "Invitation Failed",
        description: error.message || "Failed to send invitation.",
        variant: "destructive"
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (email) => {
    try {
      setActionLoading(email); // Borrowing actionLoading for resend status
      await resendCAInvite(email, user.access_token);
      toast({
        title: "Invite Resent",
        description: `Invitation email sent again to ${email}.`,
      });
    } catch (error) {
      toast({
        title: "Resend Failed",
        description: error.message || "Failed to resend invitation.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleLock = async (targetUser) => {
    try {
      setActionLoading(targetUser.id);
      if (targetUser.is_locked) {
        await unlockUser(targetUser.id, user.access_token);
        toast({ title: "User Unlocked", description: `${targetUser.name} can now login.` });
      } else {
        await lockUser(targetUser.id, user.access_token);
        toast({ title: "User Locked", description: `${targetUser.name}'s access has been revoked.` });
      }
      fetchCAs();
    } catch (error) {
      toast({
        title: "Action Failed",
        description: error.message || "Failed to update user status.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredCAs = cas.filter(ca =>
    ca.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ca.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredCAs.length / itemsPerPage);
  const paginatedCAs = filteredCAs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1 text-gradient">CA Accountants</h1>
          <p className="text-gray-400 text-sm">Monitor and manage all Chartered Accountants registered on the platform.</p>
        </div>

        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
              <Plus className="w-4 h-4" />
              Invite New CA
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-effect border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Invite CA Accountant</DialogTitle>
              <DialogDescription className="text-gray-400">
                Send an email invitation to a new Chartered Accountant and assign them to an agency.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInviteCA} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">CA Email Address</label>
                <Input
                  type="email"
                  placeholder="ca@example.com"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign to Agency</label>
                <Combobox
                  options={agencies.map(a => ({ value: a.id, label: a.name }))}
                  value={inviteData.agencyId}
                  onValueChange={(value) => setInviteData({ ...inviteData, agencyId: value })}
                  placeholder="Select an agency"
                  searchPlaceholder="Search agencies..."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={inviteLoading}
                  className="bg-primary text-white"
                >
                  {inviteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send Invitation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-3 text-white">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search CAs by name or email..."
                className="pl-10 bg-white/5 border-white/10 text-white h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-sm text-gray-500">
              Total CAs: {filteredCAs.length}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">CA Name & Email</TableHead>
                  <TableHead className="text-xs sm:text-sm">Agency</TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="text-xs sm:text-sm">Joined At</TableHead>
                  <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap">Access Control</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan="5" className="py-12 text-center text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                      Loading CA list...
                    </TableCell>
                  </TableRow>
                ) : paginatedCAs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="5" className="py-12 text-center text-gray-500 italic">
                      No CA Accountants found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCAs.map((ca) => (
                    <TableRow key={ca.id}>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold border border-purple-500/20">
                            {ca.name ? ca.name.charAt(0).toUpperCase() : ca.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{ca.name || 'Invited User'}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {ca.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="text-sm text-gray-400 flex items-center gap-2">
                          <Building className="w-4 h-4 text-purple-500/50" />
                          {ca.agency_name || 'Individual / Unknown'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {ca.is_invited ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1">
                            <Mail className="w-3 h-3" />
                            Pending Invite
                          </Badge>
                        ) : ca.is_locked ? (
                          <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
                            <XCircle className="w-3 h-3" />
                            Locked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="text-sm text-gray-400 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {ca.created_at ? new Date(ca.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 pr-6">
                          {!ca.is_invited && (
                            <Button
                              variant="outline"
                              size="sm"
                              className={ca.is_locked
                                ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                                : "bg-red-600 text-white border-red-600 hover:bg-red-700"}
                              onClick={() => handleToggleLock(ca)}
                              disabled={actionLoading === ca.id}
                            >
                              {actionLoading === ca.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : ca.is_locked ? (
                                <Unlock className="w-4 h-4 mr-2" />
                              ) : (
                                <Lock className="w-4 h-4 mr-2" />
                              )}
                              {ca.is_locked ? "Unlock User" : "Lock Access"}
                            </Button>
                          )}
                          {ca.is_invited && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 font-medium"
                              onClick={() => handleResendInvite(ca.email)}
                              disabled={actionLoading === ca.email}
                            >
                              {actionLoading === ca.email ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <RefreshCcw className="w-4 h-4 mr-2" />
                              )}
                              Resend Invite
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-0 p-4 sm:p-6 pb-4 border-t border-white/10">
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/10 bg-transparent hover:bg-white/10 text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/10 bg-transparent hover:bg-white/10 text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CAManagement;
