import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Mail,
  User,
  Users,
  Briefcase,
  ShieldCheck,
  UserCheck,
  Clock,
  Loader2,
  ExternalLink,
  ChevronRight,
  Lock,
  Unlock,
  RefreshCcw,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuth } from '@/hooks/useAuth.jsx';
import { getAgencyDetails, lockUser, unlockUser, inviteCA } from '@/lib/api/admin';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AgencySubscriptionsTab from '@/components/super-admin/AgencySubscriptionsTab.jsx';
import AgencyClientsTab from '@/components/super-admin/AgencyClientsTab.jsx';

const AgencyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const activeTab = searchParams.get('tab') || 'overview';
  const activeUserFilter = searchParams.get('filter') || 'all';

  const setActiveTab = (tab) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    // Only keep 'filter' if we are on the 'users' tab
    if (tab !== 'users') {
      newParams.delete('filter');
    }
    setSearchParams(newParams);
  };

  const setActiveUserFilter = (filter) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('filter', filter);
    setSearchParams(newParams);
  };

  // Ensure default tab/filter is set in URL and cleanup invalid combinations
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    let changed = false;
    
    if (!searchParams.get('tab')) {
      newParams.set('tab', 'overview');
      changed = true;
    }

    const currentTab = newParams.get('tab');
    if (currentTab !== 'users' && searchParams.get('filter')) {
      newParams.delete('filter');
      changed = true;
    }

    if (changed) {
      setSearchParams(newParams, { replace: true });
    }
  }, []);

  const [actionLoading, setActionLoading] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);


  const consolidatedAdmins = React.useMemo(() => {
    if (!data) return [];
    const { users, invites } = data;
    const list = [...users.agency_admins.map(u => ({ ...u, category: 'Agency Admin', role_key: 'admin' }))];

    invites.forEach(inv => {
      if (inv.role === 'AGENCY_ADMIN') {
        list.push({
          id: `invite-${inv.email}`,
          email: inv.email,
          name: 'Pending Invitation',
          is_pending: true,
          is_active: false,
          category: 'Agency Admin',
          role_key: 'admin',
          created_at: inv.created_at
        });
      }
    });

    return list;
  }, [data]);

  const consolidatedUsers = React.useMemo(() => {
    if (!data) return [];
    const { users, invites } = data;
    const list = [];

    // Non-admin roles
    users.ca_accountants.forEach(u => list.push({ ...u, category: 'CA Accountant', role_key: 'ca' }));
    users.ca_team_members.forEach(u => list.push({ ...u, category: 'CA Team Member', role_key: 'team' }));
    users.client_master_admins.forEach(u => list.push({ ...u, category: 'Client Admin', role_key: 'client_user' }));
    users.client_users.forEach(u => list.push({ ...u, category: 'Client User', role_key: 'client_user' }));

    // Pending invites (mapping them to user-like objects)
    invites.forEach(inv => {
      if (inv.role === 'AGENCY_ADMIN') return; // Skip agency admins in Users tab

      let role_key = 'invite';
      let category = inv.role.replace('_', ' ');

      if (inv.role === 'CA_ACCOUNTANT') {
        role_key = 'ca';
        category = 'CA Accountant';
      } else if (inv.role === 'CA_TEAM') {
        role_key = 'team';
        category = 'CA Team Member';
      } else if (inv.role === 'CLIENT_MASTER_ADMIN') {
        role_key = 'client_user';
        category = 'Client Admin';
      } else if (inv.role === 'CLIENT_USER') {
        role_key = 'client_user';
        category = 'Client User';
      }

      list.push({
        id: `invite-${inv.email}`,
        email: inv.email,
        name: 'Pending Invitation',
        is_pending: true,
        is_active: false,
        category: category,
        role_key: role_key,
        created_at: inv.created_at
      });
    });

    if (activeUserFilter === 'all') return list;
    return list.filter(u => {
      if (activeUserFilter === 'invites') return u.is_pending;
      return u.role_key === activeUserFilter;
    });
  }, [data, activeUserFilter]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getAgencyDetails(id, user.access_token);
        setData(result);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch agency details.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.access_token && id) {
      fetchData();
    }
  }, [id, user]);

  const handleToggleLock = async (targetUser) => {
    try {
      setActionLoading(targetUser.id);
      if (targetUser.is_locked) {
        await unlockUser(targetUser.id, user.access_token);
        toast({ title: "User Unlocked", description: `${targetUser.name || targetUser.email} can now login.` });
      } else {
        await lockUser(targetUser.id, user.access_token);
        toast({ title: "User Locked", description: `${targetUser.name || targetUser.email}'s access has been revoked.` });
      }

      // Refresh data
      const result = await getAgencyDetails(id, user.access_token);
      setData(result);
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

  const handleInviteCA = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      setInviteLoading(true);
      await inviteCA(inviteEmail, id, user.access_token);
      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${inviteEmail}.`,
      });
      setIsInviteModalOpen(false);
      setInviteEmail('');

      // Refresh data to show the new invite
      const result = await getAgencyDetails(id, user.access_token);
      setData(result);
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


  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const { agency, users, invites } = data;

  const UserTable = ({ users, roleLabel, showRole = false }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs sm:text-sm">User Info</TableHead>
            <TableHead className="text-xs sm:text-sm">Email</TableHead>
            {showRole && <TableHead className="text-xs sm:text-sm">Role</TableHead>}
            <TableHead className="text-xs sm:text-sm">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showRole ? 4 : 3} className="py-8 text-center text-gray-500 italic">
                No records found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border ${u.is_pending ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                      {(u.name && u.name !== 'Pending Invitation') ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className={`font-medium ${u.is_pending ? 'text-gray-400 italic' : 'text-white'}`}>{u.name}</div>
                      {u.is_pending && <div className="text-[10px] text-yellow-500/50 uppercase tracking-tight font-semibold">Invitation Sent</div>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs sm:text-sm text-gray-400">{u.email}</TableCell>
                {showRole && (
                  <TableCell className="text-xs sm:text-sm">
                    <Badge variant="outline" className="text-[9px] border-white/10 uppercase tracking-tight text-gray-400">
                      {u.category}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="text-xs sm:text-sm">
                  {u.is_pending ? (
                    <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 px-2 py-0 text-[10px]">
                      Pending
                    </Badge>
                  ) : (
                    <Badge variant={u.is_locked ? "destructive" : "outline"} className={!u.is_locked ? "bg-green-500/10 text-green-500 border-green-500/20 px-2 py-0 text-[10px]" : "bg-red-500/10 text-red-500 border-red-500/20 px-2 py-0 text-[10px]"}>
                      {u.is_locked ? "Locked" : "Active"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const ClientTable = ({ clients }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs sm:text-sm">Client Name</TableHead>
            <TableHead className="text-xs sm:text-sm">Customer ID</TableHead>
            <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-gray-500 italic">No clients found.</TableCell>
            </TableRow>
          ) : (
            clients.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border bg-primary/10 text-primary border-primary/20">
                      {(c.name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="font-medium text-white">{c.name}</div>
                  </div>
                </TableCell>
                <TableCell className="text-xs sm:text-sm text-gray-400 font-mono">{c.customer_id}</TableCell>
                <TableCell className="text-xs sm:text-sm">
                  <Badge variant={c.is_active ? "outline" : "destructive"} className={c.is_active ? "bg-green-500/10 text-green-500 border-green-500/20 px-2 py-0 text-[10px]" : "bg-red-500/10 text-red-500 border-red-500/20 px-2 py-0 text-[10px]"}>
                    {c.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white bg-white/5 border border-white/10"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Building className="w-8 h-8 text-blue-500" />
            {agency.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-1">
            <span className="text-sm text-gray-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400/50" />
              Agency Code: <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">{agency.code}</span>
            </span>
            <span className="text-sm text-gray-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-400/50" />
              Registered: <span className="text-white">{new Date(agency.created_at).toLocaleDateString()}</span>
            </span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex gap-2 sm:gap-4 mb-6 w-fit justify-start bg-white/5 border border-white/10 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="clients_tab">Clients</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <StatsCard
              label="AGENCY ADMINS"
              value={users.agency_admins.length}
              icon={<ShieldCheck className="w-4 h-4 " />}
              color="blue"
            />
            <StatsCard
              label="CA ACCOUNTANTS"
              value={users.ca_accountants.length}
              icon={<Briefcase className="w-4 h-4 " />}
              color="purple"
            />
            <StatsCard
              label="TEAM MEMBERS"
              value={users.ca_team_members.length}
              icon={<Users className="w-4 h-4   " />}
              color="pink"
            />
            <StatsCard
              label="CLIENT USERS"
              value={users.client_master_admins.length + users.client_users.length}
              icon={<UserCheck className="w-4 h-4 " />}
              color="green"
            />
            <StatsCard
              label="PENDING INVITES"
              value={invites.length}
              icon={<Mail className="w-4 h-4 " />}
              color="yellow"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-4 xl:gap-8 mt-6">
            <Card className="glass-card overflow-hidden border-white/5">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl">
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-gray-400 text-xs sm:text-sm">
                  Latest users joined or invited.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-6 text-center text-gray-500 text-sm italic">
                  Activity tracking scheduled for next release.
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card overflow-hidden border-white/5">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl">
                  System Usage
                </CardTitle>
                <CardDescription className="text-gray-400 text-xs sm:text-sm">
                  Resource utilization for this agency.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <UsageItem label="Client Limit" current={users.client_master_admins.length} total={100} color="bg-green-500" />
                  <UsageItem label="User Seats" current={Object.values(users).reduce((a, b) => a + b.length, 0)} total={50} color="bg-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="admins" className="pt-6">
          <Card className="glass-card overflow-hidden">
            <UserTable users={consolidatedAdmins} roleLabel="Agency Admins" showRole={true} />
          </Card>
        </TabsContent>


        <TabsContent value="users" className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All Users' },
                { id: 'ca', label: 'CA Accountants' },
                { id: 'team', label: 'Team Members' },
                { id: 'client_user', label: 'Client Users' },
                { id: 'invites', label: 'Invitations' },
              ].map(filter => (
                <Button
                  key={filter.id}
                  variant={activeUserFilter === filter.id ? "default" : "outline"}
                  size="sm"
                  className={`text-[10px] h-7 px-3 uppercase tracking-wider font-semibold ${activeUserFilter === filter.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                    }`}
                  onClick={() => setActiveUserFilter(filter.id)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white gap-2 text-xs h-8">
                  <Plus className="w-3.5 h-3.5" />
                  Add CA
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-effect border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Invite CA Accountant</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Send an email invitation to a new Chartered Accountant and assign them to {agency.name}.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInviteCA} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CA Email Address</label>
                    <Input
                      type="email"
                      placeholder="ca@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                      required
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
            <UserTable users={consolidatedUsers} roleLabel="Users" showRole={true} />
          </Card>
        </TabsContent>

        <TabsContent value="clients_tab" className="pt-6">
          <AgencyClientsTab agencyId={id} />
        </TabsContent>

        <TabsContent value="subscriptions" className="pt-6">
          <AgencySubscriptionsTab agencyId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatsCard = ({ label, value, icon, color }) => {
  const colorMap = {
    blue: "from-blue-500 to-blue-700",
    purple: "from-purple-500 to-purple-700",
    pink: "from-pink-500 to-pink-700",
    green: "from-green-500 to-green-700",
    yellow: "from-yellow-500 to-amber-600"
  };

  return (
    <Card className="glass-card card-hover overflow-hidden h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-gray-300">
          {label}
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r ${colorMap[color]} rounded-lg flex items-center justify-center shadow-lg shadow-black/20 flex-shrink-0`}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const UsageItem = ({ label, current, total, color }) => {
  const percentage = Math.min(100, (current / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400 font-medium uppercase tracking-wider">{label}</span>
        <span className="text-white font-mono">{current} / {total}</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default AgencyDetails;
