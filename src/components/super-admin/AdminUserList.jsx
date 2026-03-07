import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Mail,
  Shield,
  Lock,
  Unlock,
  Loader2,
  CheckCircle2,
  XCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth.jsx';
import { listAllUsers, lockUser, unlockUser } from '@/lib/api/admin';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import AnimatedSearch from '../ui/AnimatedSearch';

const AdminUserList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await listAllUsers(user.access_token);
      // Backend returns { users: [...] }
      const usersArray = Array.isArray(data) ? data : (data?.users || []);
      setUsers(usersArray);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.access_token) {
      fetchUsers();
    }
  }, [user]);

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
      fetchUsers();
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

  const filteredUsers = Array.isArray(users) ? users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  }) : [];

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const roles = Array.isArray(users) ? [...new Set(users.map(u => u.role))] : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Global User Management</h1>
        <p className="text-gray-400 text-sm">View and control every user account across all agencies and clients.</p>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-3 text-white">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
    <AnimatedSearch
        placeholder="Search by name or email..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
    />
</div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <SelectValue placeholder="Filter by Role" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1 text-right text-sm text-gray-500 self-center">
              Total Found: {filteredUsers.length}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">User</TableHead>
                  <TableHead className="text-xs sm:text-sm">Role</TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan="4" className="py-12 text-center text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                      Loading system users...
                    </TableCell>
                  </TableRow>
                ) : paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="4" className="py-12 text-center text-gray-500 italic">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{u.name}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{u.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-gray-400 border-white/10">
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {u.is_locked ? (
                          <div className="flex items-center text-red-500 gap-1.5 text-xs font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            Locked
                          </div>
                        ) : (
                          <div className="flex items-center text-green-500 gap-1.5 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={u.is_locked ? "text-green-500 hover:bg-green-500/10" : "text-red-500 hover:bg-red-500/10"}
                          onClick={() => handleToggleLock(u)}
                          disabled={actionLoading === u.id}
                        >
                          {actionLoading === u.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : u.is_locked ? (
                            <Unlock className="w-4 h-4" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex flex-row justify-center items-center gap-3 p-4 sm:p-6 border-t border-white/10">
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

export default AdminUserList;
