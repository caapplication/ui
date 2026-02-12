import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth.jsx";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { listAssignedClientIdsForService, listClients, getAllClientTeamMembers, listTeamMembers } from "@/lib/api";

const AssignedClientsTab = ({ service }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [clientIds, setClientIds] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [clientTeamMembers, setClientTeamMembers] = useState({});
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!user?.agency_id || !user?.access_token || !service?.id) return;
      setIsLoading(true);
      try {
        const [ids, allClients] = await Promise.all([
          listAssignedClientIdsForService(service.id, user.agency_id, user.access_token),
          listClients(user.agency_id, user.access_token),
        ]);
        setClientIds(Array.isArray(ids) ? ids : []);
        setClients(Array.isArray(allClients) ? allClients : (allClients?.items || []));
      } catch (e) {
        toast({
          title: "Error loading assigned clients",
          description: e?.message || "Failed to load assigned clients.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [service?.id, user?.agency_id, user?.access_token, toast]);

  useEffect(() => {
    const fetchAllAssignments = async () => {
      if (!user?.access_token || !user?.agency_id) return;
      setIsLoadingAssignments(true);
      try {
        const [results, members] = await Promise.all([
          getAllClientTeamMembers(user.agency_id, user.access_token),
          listTeamMembers(user.access_token, 'joined'),
        ]);
        setClientTeamMembers(results || {});
        setTeamMembers(Array.isArray(members) ? members : (members?.members || members?.data || []));
      } catch (error) {
        console.error('Failed to fetch client team members:', error);
      } finally {
        setIsLoadingAssignments(false);
      }
    };
    fetchAllAssignments();
  }, [user?.access_token, user?.agency_id]);

  const renderClientUsers = (client) => {
    const orgUsers = client.orgUsers;
    const users = [...(orgUsers?.invited_users || []), ...(orgUsers?.joined_users || [])];
    if (!users.length) return <span>-</span>;

    return (
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((orgUser) => (
          <TooltipProvider key={orgUser.user_id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="w-8 h-8 border-2 border-gray-800 cursor-help">
                  <AvatarFallback>
                    {orgUser.email?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{orgUser.email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {users.length > 3 && (
          <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-800 flex items-center justify-center text-xs">
            +{users.length - 3}
          </div>
        )}
      </div>
    );
  };

  const renderTeamMembers = (client, teamMembers = []) => {
    if (isLoadingAssignments) {
      return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;
    }
    const assignedTeamMembers = clientTeamMembers[client.id] || [];
    if (!assignedTeamMembers.length) {
      return '-';
    }

    const memberDetails = assignedTeamMembers
      .map((assigned) =>
        teamMembers.find((m) => String(m.user_id || m.id) === String(assigned.team_member_user_id))
      )
      .filter(Boolean);

    if (!memberDetails.length) return '-';

    return (
      <div className="flex -space-x-2">
        {memberDetails.slice(0, 3).map((member, idx) => (
          <TooltipProvider key={`${client.id}-${idx}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="w-8 h-8 border-2 border-gray-800 cursor-help">
                  <AvatarFallback>
                    {member.name ? member.name.charAt(0) : member.email?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{member.email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {memberDetails.length > 3 && (
          <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-800 flex items-center justify-center text-xs">
            +{memberDetails.length - 3}
          </div>
        )}
      </div>
    );
  };

  const assignedClients = useMemo(() => {
    const ids = new Set((clientIds || []).map((id) => String(id)));
    const term = search.trim().toLowerCase();

    const filtered = (clients || [])
      .filter((c) => c && ids.has(String(c.id)))
      .filter((c) => {
        if (!term) return true;
        return (
          (c.name || "").toLowerCase().includes(term) ||
          (c.pan || "").toLowerCase().includes(term) ||
          (c.mobile || "").toLowerCase().includes(term) ||
          (c.email || "").toLowerCase().includes(term) ||
          (c.customer_id || "").toLowerCase().includes(term)
        );
      });

    // Most recently updated first (same as client list behavior)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || 0);
      const dateB = new Date(b.updated_at || b.created_at || 0);
      return dateB - dateA;
    });
  }, [clientIds, clients, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (assignedClients.length === 0) {
    return (
      <div className="glass-pane rounded-lg overflow-hidden border border-white/10 p-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <p className="text-lg font-semibold text-white mb-2">No clients assigned</p>
        <p className="text-gray-400">Assign this service to a client to see them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-white">Assigned Clients</h3>
          <p className="text-sm text-gray-400">Clients that currently have this service.</p>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name / PAN / mobile / email..."
          className="glass-input sm:max-w-sm"
        />
      </div>

      <div className="glass-pane rounded-lg overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10">
                <TableHead>Photo</TableHead>
                <TableHead>Entity Name</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Contact No.</TableHead>
                <TableHead>Mail ID</TableHead>
                <TableHead>Client Users</TableHead>
                <TableHead>My Team</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedClients.map((client) => (
                <TableRow
                  key={client.id}
                  className="border-none hover:bg-white/5"
                >
                  <TableCell>
                    <Avatar>
                      <AvatarImage
                        src={`${import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002'}/clients/${client.id}/photo?token=${user?.access_token}&v=${client.updated_at ? new Date(client.updated_at).getTime() : 0}`}
                      />
                      <AvatarFallback>{client.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <span className="text-blue-400 hover:underline">{client.name}</span>
                  </TableCell>
                  <TableCell>{client.organization_name || '-'}</TableCell>
                  <TableCell>{client.mobile || '-'}</TableCell>
                  <TableCell>{client.email || '-'}</TableCell>
                  <TableCell>{renderClientUsers(client)}</TableCell>
                  <TableCell>{renderTeamMembers(client, teamMembers)}</TableCell>
                  <TableCell>
                    {client.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AssignedClientsTab;

