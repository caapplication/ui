import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  XCircle
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
import { listAllUsers, lockUser, unlockUser, inviteCA, listAgencies } from '@/lib/api/admin';
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

  return (
    <div className="p-6 space-y-6">
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
                  placeholder="Search and select an agency..."
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

      <Card className="glass-effect border-white/5">
        <CardHeader className="pb-3 text-white border-b border-white/5">
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
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">CA Name & Email</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Joined At</th>
                  <th className="px-6 py-4 font-semibold text-right">Access Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                      Loading CA list...
                    </td>
                  </tr>
                ) : filteredCAs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500 italic">
                      No CA Accountants found.
                    </td>
                  </tr>
                ) : (
                  filteredCAs.map((ca) => (
                    <tr key={ca.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
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
                      </td>
                      <td className="px-6 py-4">
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
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-400 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {ca.created_at ? new Date(ca.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!ca.is_invited && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={ca.is_locked ? "text-green-500 hover:bg-green-500/10" : "text-red-500 hover:bg-red-500/10"}
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
                            {ca.is_locked ? "Unlock" : "Lock Access"}
                          </Button>
                        )}
                        {ca.is_invited && (
                          <span className="text-xs text-gray-500 italic">Registration Pending</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CAManagement;
