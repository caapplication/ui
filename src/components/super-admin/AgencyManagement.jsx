import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  Plus,
  Trash2,
  Search,
  ExternalLink,
  MoreVertical,
  Mail,
  Calendar,
  Shield,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { useAuth } from '@/hooks/useAuth.jsx';
import { listAgencies, createAgency, deleteAgency } from '@/lib/api/admin';
import { useToast } from '@/components/ui/use-toast';

const AgencyManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAgency, setNewAgency] = useState({ name: '', email: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [agencyToDelete, setAgencyToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      const data = await listAgencies(user.access_token);
      setAgencies(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch agencies.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.access_token) {
      fetchAgencies();
    }
  }, [user]);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.quickAction === 'add-agency') {
      setIsCreateModalOpen(true);
    }
  }, [location.state]);

  const handleCreateAgency = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await createAgency(newAgency, user.access_token);
      toast({
        title: "Success",
        description: `Agency "${newAgency.name}" created and invite sent.`,
      });
      setIsCreateModalOpen(false);
      setNewAgency({ name: '', email: '' });
      fetchAgencies();
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: error.message || "Something went wrong.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAgency = async () => {
    if (!agencyToDelete) return;
    try {
      setActionLoading(true);
      await deleteAgency(agencyToDelete.id, user.access_token);
      toast({
        title: "Agency Deleted",
        description: `Successfully removed ${agencyToDelete.name}.`,
      });
      setAgencyToDelete(null);
      fetchAgencies();
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: error.message || "Could not delete agency.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAgencies = agencies.filter(agency =>
    agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agency.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredAgencies.length / itemsPerPage);
  const paginatedAgencies = filteredAgencies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Agency Management</h1>
          <p className="text-gray-400 text-sm">Create and manage partner agencies across the platform.</p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
              <Plus className="w-4 h-4" />
              New Agency
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-effect border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Create New Agency</DialogTitle>
              <DialogDescription className="text-gray-400">
                This will create an agency and send an invitation to the Agency Admin.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAgency} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Agency Name</label>
                <Input
                  placeholder="e.g. Premium Accounting Services"
                  value={newAgency.name}
                  onChange={(e) => setNewAgency({ ...newAgency, name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Agency Admin Email</label>
                <Input
                  type="email"
                  placeholder="admin@agency.com"
                  value={newAgency.email}
                  onChange={(e) => setNewAgency({ ...newAgency, email: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-primary text-white"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create & Invite
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
                placeholder="Search agencies by name or code..."
                className="pl-10 bg-white/5 border-white/10 text-white h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-sm text-gray-500">
              Total: {filteredAgencies.length}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Agency Info</TableHead>
                  <TableHead className="text-xs sm:text-sm">Code / ID</TableHead>
                  <TableHead className="text-xs sm:text-sm">Registered At</TableHead>
                  <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan="4" className="py-12 text-center text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                      Loading agencies...
                    </TableCell>
                  </TableRow>
                ) : paginatedAgencies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="4" className="py-12 text-center text-gray-500 italic">
                      No agencies found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAgencies.map((agency) => (
                    <TableRow
                      key={agency.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/agencies/${agency.id}`)}
                    >
                      <TableCell className="text-xs sm:text-sm">
                        <Link
                          to={`/agencies/${agency.id}`}
                          className="flex items-center gap-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                            <Building className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white group-hover:text-primary-light transition-colors">{agency.name}</div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded w-fit">
                          {agency.code || agency.id.substring(0, 8)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="text-sm text-gray-400 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(agency.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      {/* Hide Delete for now as requested */}
                      {/* <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-red-500 hover:bg-red-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAgencyToDelete(agency);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent
                            className="glass-effect border-red-500/20 text-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 text-red-500">
                                <AlertTriangle className="w-5 h-5" />
                                Confirm Deletion
                              </DialogTitle>
                              <DialogDescription className="text-gray-400 font-medium">
                                Are you sure you want to delete <span className="text-white">"{agencyToDelete?.name}"</span>?
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 text-sm text-gray-400">
                              This action is irreversible. All CA accounts, team members, and client data associated with this agency will be affected.
                            </div>
                            <DialogFooter>
                              <Button variant="ghost" onClick={() => setAgencyToDelete(null)}>Cancel</Button>
                              <Button
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAgency();
                                }}
                                disabled={actionLoading}
                              >
                                {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Delete Agency
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell> */}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 p-4 sm:p-6 pb-4 border-t border-white/10">
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

export default AgencyManagement;
