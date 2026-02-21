import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  RefreshCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getAgencyDetails, lockUser, unlockUser } from '@/lib/api/admin';
import { useToast } from '@/components/ui/use-toast';

const AgencyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeUserFilter, setActiveUserFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  const consolidatedUsers = React.useMemo(() => {
    if (!data) return [];
    const { users, invites } = data;
    const list = [];

    // Non-admin roles
    users.ca_accountants.forEach(u => list.push({ ...u, category: 'CA Accountant', role_key: 'ca' }));
    users.ca_team_members.forEach(u => list.push({ ...u, category: 'CA Team Member', role_key: 'team' }));
    users.client_master_admins.forEach(u => list.push({ ...u, category: 'Client Admin', role_key: 'client_admin' }));
    users.client_users.forEach(u => list.push({ ...u, category: 'Client User', role_key: 'client_user' }));

    // Pending invites (mapping them to user-like objects)
    invites.forEach(inv => {
      let category = inv.role.replace('_', ' ');
      let role_key = 'invite';
      if (inv.role === 'CA_ACCOUNTANT') role_key = 'ca';
      if (inv.role === 'CA_TEAM') role_key = 'team';
      if (inv.role === 'CLIENT_MASTER_ADMIN') role_key = 'client_admin';
      if (inv.role === 'CLIENT_USER') role_key = 'client_user';

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
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-[10px] uppercase tracking-wider">
            <th className="px-6 py-4 font-semibold">User Info</th>
            <th className="px-6 py-4 font-semibold">Email</th>
            {showRole && <th className="px-6 py-4 font-semibold">Role</th>}
            <th className="px-6 py-4 font-semibold">Status</th>
            <th className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {users.length === 0 ? (
            <tr>
              <td colSpan={showRole ? 5 : 4} className="px-6 py-8 text-center text-gray-500 italic">
                No records found.
              </td>
            </tr>
          ) : (
            users.map((u) => (
              <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border ${u.is_pending ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                      {(u.name && u.name !== 'Pending Invitation') ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className={`font-medium ${u.is_pending ? 'text-gray-400 italic' : 'text-white'}`}>{u.name}</div>
                      {u.is_pending && <div className="text-[10px] text-yellow-500/50 uppercase tracking-tight font-semibold">Invitation Sent</div>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400">{u.email}</td>
                {showRole && (
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-[9px] border-white/10 uppercase tracking-tight text-gray-400">
                      {u.category}
                    </Badge>
                  </td>
                )}
                <td className="px-6 py-4">
                  {u.is_pending ? (
                    <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 px-2 py-0 text-[10px]">
                      Pending
                    </Badge>
                  ) : (
                    <Badge variant={u.is_locked ? "destructive" : "outline"} className={!u.is_locked ? "bg-green-500/10 text-green-500 border-green-500/20 px-2 py-0 text-[10px]" : "bg-red-500/10 text-red-500 border-red-500/20 px-2 py-0 text-[10px]"}>
                      {u.is_locked ? "Locked" : "Active"}
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {!u.is_pending && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 mr-2 ${u.is_locked ? 'text-green-500 hover:text-green-400' : 'text-red-500 hover:text-red-400'} hover:bg-white/5`}
                      onClick={() => handleToggleLock(u)}
                      disabled={actionLoading === u.id}
                      title={u.is_locked ? "Unlock User" : "Lock User"}
                    >
                      {actionLoading === u.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : u.is_locked ? (
                        <Unlock className="w-3.5 h-3.5" />
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white bg-white/5 border border-white/10"
          onClick={() => navigate('/super-admin/agencies')}
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

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1 text-gray-400">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white px-6">Overview</TabsTrigger>
          <TabsTrigger value="admins" className="data-[state=active]:bg-primary data-[state=active]:text-white px-6">Admins</TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-white px-6">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatsCard
              label="AGENCY ADMINS"
              value={users.agency_admins.length}
              icon={<ShieldCheck className="w-4 h-4 text-blue-400" />}
              color="blue"
            />
            <StatsCard
              label="CA ACCOUNTANTS"
              value={users.ca_accountants.length}
              icon={<Briefcase className="w-4 h-4 text-purple-400" />}
              color="purple"
            />
            <StatsCard
              label="TEAM MEMBERS"
              value={users.ca_team_members.length}
              icon={<Users className="w-4 h-4 text-pink-400" />}
              color="pink"
            />
            <StatsCard
              label="CLIENT MASTERS"
              value={users.client_master_admins.length}
              icon={<UserCheck className="w-4 h-4 text-green-400" />}
              color="green"
            />
            <StatsCard
              label="PENDING INVITES"
              value={invites.length}
              icon={<Mail className="w-4 h-4 text-yellow-400" />}
              color="yellow"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card className="glass-effect border-white/5 overflow-hidden">
              <CardHeader className="bg-white/2 border-b border-white/5">
                <CardTitle className="text-base font-semibold text-white">Recent Activity</CardTitle>
                <CardDescription>Latest users joined or invited.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-6 text-center text-gray-500 text-sm italic">
                  Activity tracking scheduled for next release.
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border-white/5 overflow-hidden">
              <CardHeader className="bg-white/2 border-b border-white/5">
                <CardTitle className="text-base font-semibold text-white">System Usage</CardTitle>
                <CardDescription>Resource utilization for this agency.</CardDescription>
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
          <Card className="glass-effect border-white/5 overflow-hidden">
            <UserTable users={users.agency_admins} roleLabel="Agency Admins" />
          </Card>
        </TabsContent>

        <TabsContent value="users" className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Users' },
              { id: 'ca', label: 'CA Accountants' },
              { id: 'team', label: 'Team Members' },
              { id: 'client_admin', label: 'Client Admins' },
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

          <Card className="glass-effect border-white/5 overflow-hidden">
            <UserTable users={consolidatedUsers} roleLabel="Users" showRole={true} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatsCard = ({ label, value, icon, color }) => {
  const colorMap = {
    blue: "bg-blue-500/5 text-blue-400 border-blue-500/10",
    purple: "bg-purple-500/5 text-purple-400 border-purple-500/10",
    pink: "bg-pink-500/5 text-pink-400 border-pink-500/10",
    green: "bg-green-500/5 text-green-400 border-green-500/10",
    yellow: "bg-yellow-500/5 text-yellow-400 border-yellow-500/10"
  };

  return (
    <Card className={`glass-effect border-white/5 ${colorMap[color]}`}>
      <CardHeader className="p-4">
        <div className="flex justify-between items-start mb-1">
          <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-80">
            {icon}
            {label}
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-white tracking-tight">{value}</CardTitle>
      </CardHeader>
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
