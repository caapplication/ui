import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Users, Banknote, Building, Search, Loader2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import {
  getBeneficiaries,
  addBeneficiary,
  addBankAccount,
  deleteBankAccount,
  getBankAccountsForBeneficiary,
  updateBeneficiary,
  getProfile
} from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';

const BeneficiaryForm = ({ onAdd, onCancel, isEdit, beneficiary, isSaving }) => {
  const [beneficiaryType, setBeneficiaryType] = useState(beneficiary?.beneficiary_type || 'individual');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSaving) return; // Prevent submission if already saving

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Convert empty email strings to null/undefined to allow saving without email
    if (data.email && data.email.trim() === '') {
      data.email = null;
    } else if (data.email) {
      data.email = data.email.trim();
    }

    if (isEdit) {
      onAdd({ ...beneficiary, ...data, beneficiary_type: beneficiaryType });
    } else {
      onAdd({ ...data, beneficiary_type: beneficiaryType });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <div>
        <Label>Beneficiary Type</Label>
        <Select value={beneficiaryType} onValueChange={setBeneficiaryType} name="beneficiary_type">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="company">Company</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {beneficiaryType === 'individual' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label htmlFor="name">Name</Label><Input name="name" id="name" required /></div>
          <div><Label htmlFor="phone">Phone</Label><Input name="phone" id="phone" type="tel" required /></div>
          <div className="md:col-span-2"><Label htmlFor="email">Email <span className="text-gray-400 text-xs">(Optional)</span></Label><Input name="email" id="email" type="email" /></div>
          <div><Label htmlFor="aadhar">Aadhar</Label><Input name="aadhar" id="aadhar" required /></div>
          <div><Label htmlFor="pan">PAN</Label><Input name="pan" id="pan" required /></div>
        </div>
      )}

      {beneficiaryType === 'company' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label htmlFor="company_name">Company Name</Label><Input name="company_name" id="company_name" required /></div>
          <div><Label htmlFor="phone">Phone</Label><Input name="phone" id="phone" type="tel" required /></div>
          <div className="md:col-span-2"><Label htmlFor="email">Email Address <span className="text-gray-400 text-xs">(Optional)</span></Label><Input name="email" id="email" type="email" /></div>
          <div><Label htmlFor="gstin">GSTIN</Label><Input name="gstin" id="gstin" required /></div>
          <div><Label htmlFor="pan">PAN</Label><Input name="pan" id="pan" required /></div>
          <div><Label htmlFor="aadhar">Aadhar (of Proprietor)</Label><Input name="aadhar" id="aadhar" required /></div>
          <div><Label htmlFor="proprietor_name">Proprietor Name</Label><Input name="proprietor_name" id="proprietor_name" required /></div>
        </div>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost" type="button" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Save Beneficiary
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
};

const AddBankAccountForm = ({ beneficiary, onAddBankAccount, onCancel }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    onAddBankAccount(beneficiary.id, data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label htmlFor="bank_name">Bank Name</Label><Input name="bank_name" id="bank_name" required /></div>
        <div><Label htmlFor="branch_name">Branch Name</Label><Input name="branch_name" id="branch_name" required /></div>
        <div><Label htmlFor="ifsc_code">IFSC</Label><Input name="ifsc_code" id="ifsc_code" required /></div>
        <div><Label htmlFor="account_number">Account Number</Label><Input name="account_number" id="account_number" required /></div>
      </div>
      <DialogFooter>
        <DialogClose asChild><Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button></DialogClose>
        <Button type="submit"><Plus className="w-4 h-4 mr-2" /> Add Account</Button>
      </DialogFooter>
    </form>
  );
};


const Beneficiaries = ({ entityId, quickAction, clearQuickAction }) => {
  const PAGE_SIZE = 10;

  const [beneficiaries, setBeneficiaries] = useState([]);
  const [allBeneficiaries, setAllBeneficiaries] = useState([]); // Store all fetched data
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterValues, setFilterValues] = useState({ name: '', email: '', phone: '', pan: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('individual');
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const organisationId = useCurrentOrganization(entityId);
  const location = useLocation();
  const navigate = useNavigate();

  const handleDialogChange = (open) => {
    setShowAddDialog(open);
    if (!open && location.state?.returnToDashboard) {
      navigate('/');
    }
  };

  const fetchBeneficiaries = useCallback(async () => {
    if (!user?.access_token || !organisationId) return;
    setIsLoading(true);
    try {
      // Fetch a larger list once, then paginate client-side (10 per page)
      const data = await getBeneficiaries(organisationId, user.access_token, 0, 1000);

      if (Array.isArray(data)) {
        // Sort by created_at (newest first) - beneficiaries should already be sorted by backend
        // but we'll ensure proper sorting here
        const sortedData = [...data].sort((a, b) => {
          const dateA = a?.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b?.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA; // Newest first
        });

        // Don't fetch bank accounts for all beneficiaries - only fetch when needed (lazy loading)
        // This prevents multiple API calls on initial load
        // Bank accounts will be fetched when viewing beneficiary details
        const beneficiariesWithEmptyAccounts = sortedData.map(beneficiary => ({
          ...beneficiary,
          bank_accounts: [] // Initialize empty, will be fetched when needed
        }));

        setBeneficiaries(beneficiariesWithEmptyAccounts);
      } else {
        setBeneficiaries([]);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch beneficiaries: ${error.message}`,
        variant: 'destructive',
      });
      setBeneficiaries([]);
    } finally {
      setIsLoading(false);
    }
  }, [organisationId, user?.access_token, toast]);

  useEffect(() => {
    // Only fetch if user is available
    if (user?.access_token) {
      fetchBeneficiaries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.access_token, organisationId]); // Only depend on user data, not the entire callback

  useEffect(() => {
    if (quickAction === 'add-beneficiary') {
      setShowAddDialog(true);
      clearQuickAction();
    }
    if (location.state?.quickAction === 'add-beneficiary') {
      setShowAddDialog(true);
    }
  }, [quickAction, clearQuickAction, location.state]);

  const filteredBeneficiaries = useMemo(() => {
    // Sort beneficiaries: newest first (beneficiaries are already sorted in fetchBeneficiaries)
    // But we'll ensure proper sorting here as well for consistency
    const sortedBeneficiaries = [...beneficiaries].sort((a, b) => {
      // Prioritize created_at timestamp
      const dateA = a?.created_at ? new Date(a.created_at).getTime() : (a?.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b?.created_at ? new Date(b.created_at).getTime() : (b?.createdAt ? new Date(b.createdAt).getTime() : 0);

      if (dateA !== 0 && dateB !== 0) {
        return dateB - dateA; // Newest first (descending)
      }
      if (dateA !== 0) return -1; // a has date, b doesn't - a comes first
      if (dateB !== 0) return 1;  // b has date, a doesn't - b comes first

      // Fallback: Sort by updated_at if available
      const updatedA = a?.updated_at ? new Date(a.updated_at).getTime() : (a?.updatedAt ? new Date(a.updatedAt).getTime() : 0);
      const updatedB = b?.updated_at ? new Date(b.updated_at).getTime() : (b?.updatedAt ? new Date(b.updatedAt).getTime() : 0);

      if (updatedA !== 0 && updatedB !== 0) {
        return updatedB - updatedA;
      }

      // Final fallback: Sort by ID (newer UUIDs typically come later)
      const idA = a?.id?.toString() || '';
      const idB = b?.id?.toString() || '';
      return idB.localeCompare(idA);
    });

    const filteredByType = sortedBeneficiaries.filter((b) => b.beneficiary_type === activeTab);

    // Apply active filters
    return filteredByType.filter((b) => {
      let match = true;
      for (const filter of activeFilters) {
        if (filter === 'name') {
          const searchTerm = (filterValues.name || '').toLowerCase().trim();
          const name = b.beneficiary_type === 'individual' ? b.name : b.company_name;
          match = match && (!searchTerm || (name && name.toLowerCase().includes(searchTerm)));
        }
        if (filter === 'email') {
          const searchTerm = (filterValues.email || '').toLowerCase().trim();
          match = match && (!searchTerm || (b.email && b.email.toLowerCase().includes(searchTerm)));
        }
        if (filter === 'phone') {
          const searchTerm = (filterValues.phone || '').toLowerCase().trim();
          match = match && (!searchTerm || (b.phone && b.phone.toLowerCase().includes(searchTerm)));
        }
        if (filter === 'pan') {
          const searchTerm = (filterValues.pan || '').toLowerCase().trim();
          match = match && (!searchTerm || (b.pan && b.pan.toLowerCase().includes(searchTerm)));
        }
      }
      // Also apply general search term if no filters are active
      if (activeFilters.length === 0 && searchTerm) {
        const term = searchTerm.toLowerCase();
        const name = b.beneficiary_type === 'individual' ? b.name : b.company_name;
        match = match && (
          name?.toLowerCase().includes(term) ||
          b.email?.toLowerCase().includes(term) ||
          b.pan?.toLowerCase().includes(term) ||
          b.phone?.toLowerCase().includes(term)
        );
      }
      return match;
    });
  }, [searchTerm, beneficiaries, activeTab, activeFilters, filterValues]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredBeneficiaries.length / PAGE_SIZE));
  }, [filteredBeneficiaries.length, PAGE_SIZE]);

  const paginatedBeneficiaries = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredBeneficiaries.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredBeneficiaries, currentPage, PAGE_SIZE]);

  // Reset pagination when switching tab, searching, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, activeFilters, filterValues]);

  // Clamp current page if results shrink (e.g. after search)
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleAdd = async (beneficiaryData) => {
    setIsSaving(true);
    try {
      const newBeneficiary = await addBeneficiary({ ...beneficiaryData, organisation_id: organisationId }, user.access_token);
      toast({ title: 'Success', description: 'Beneficiary added successfully.' });

      // Make sure the latest-added record is visible immediately
      setShowAddDialog(false);
      setSearchTerm('');
      setActiveFilters([]);
      setFilterValues({ name: '', email: '', phone: '', pan: '' });
      if (beneficiaryData?.beneficiary_type) setActiveTab(beneficiaryData.beneficiary_type);
      setCurrentPage(1);

      // Fetch updated list - the new beneficiary will appear first due to sorting
      await fetchBeneficiaries();

      if (location.state?.returnToDashboard) {
        navigate('/');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to add beneficiary: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (beneficiaryData) => {
    setIsSaving(true);
    try {
      const organizationId = typeof user.organization_id === 'object' && user.organization_id !== null
        ? user.organization_id.id
        : user.organization_id;
      await updateBeneficiary(selectedBeneficiary.id, organizationId, beneficiaryData, user.access_token);
      toast({ title: 'Success', description: 'Beneficiary updated successfully.' });
      setShowViewDialog(false);
      fetchBeneficiaries();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to update beneficiary: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleView = async (beneficiary) => {
    // Fetch bank accounts when viewing beneficiary details (lazy loading)
    try {
      const bankAccounts = await getBankAccountsForBeneficiary(beneficiary.id, user.access_token);
      setSelectedBeneficiary({
        ...beneficiary,
        bank_accounts: bankAccounts || [],
        organization_id: user?.organization_id
      });
    } catch (error) {
      console.warn(`Failed to fetch bank accounts for beneficiary:`, error);
      // Still show beneficiary even if bank accounts fail to load
      setSelectedBeneficiary({
        ...beneficiary,
        bank_accounts: [],
        organization_id: user?.organization_id
      });
    }
    setShowViewDialog(true);
  };


  const handleAddAccountClick = (beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setShowAddAccountDialog(true);
  };

  const handleAddAccountSubmit = async (beneficiaryId, bankAccountData) => {
    try {
      await addBankAccount(beneficiaryId, bankAccountData, user.access_token);
      toast({ title: 'Success', description: 'Bank account added successfully.' });
      setShowAddAccountDialog(false);
      setSelectedBeneficiary(null);
      fetchBeneficiaries();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to add bank account: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccountClick = async (beneficiaryId, accountId) => {
    try {
      await deleteBankAccount(beneficiaryId, accountId, user.access_token);
      toast({ title: 'Success', description: 'Bank account deleted successfully.' });
      fetchBeneficiaries();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete bank account: ${error.message}`,
        variant: 'destructive',
      });
    }
  }

  const PaginationFooter = () => (
    <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 pt-4 px-4 sm:px-6 pb-4 sm:pb-6">
      <div>
        <p className="text-xs sm:text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="h-8 w-8 sm:h-9 sm:w-9"
        >
          <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="h-8 w-8 sm:h-9 sm:w-9"
        >
          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
      </div>
    </CardFooter>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">Beneficiaries</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <TabsList className="text-xs sm:text-sm h-9 sm:h-10">
                <TabsTrigger value="individual" className="text-xs sm:text-sm">Individual</TabsTrigger>
                <TabsTrigger value="company" className="text-xs sm:text-sm">Company</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search..."
                    className="pl-9 h-9 sm:h-10 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button onClick={() => setShowAddDialog(true)} className="h-9 sm:h-10 text-sm sm:text-base whitespace-nowrap">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Add New</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>
            <TabsContent value="individual">
              <Card className="glass-card">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 flex-wrap">
                      <Select
                        value=""
                        onValueChange={filter => {
                          if (!activeFilters.includes(filter)) {
                            setActiveFilters([...activeFilters, filter]);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10">
                          <SelectValue placeholder="Add Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          {!activeFilters.includes('name') && <SelectItem value="name">Name</SelectItem>}
                          {!activeFilters.includes('email') && <SelectItem value="email">Email</SelectItem>}
                          {!activeFilters.includes('phone') && <SelectItem value="phone">Phone</SelectItem>}
                          {!activeFilters.includes('pan') && <SelectItem value="pan">PAN</SelectItem>}
                        </SelectContent>
                      </Select>
                      {activeFilters.map(filter => (
                        <div key={filter} className="flex items-center gap-2 w-full sm:w-auto">
                          {filter === 'name' && (
                            <Input
                              placeholder="Search by name..."
                              value={filterValues.name || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, name: e.target.value }))}
                              className="flex-1 sm:max-w-xs h-9 sm:h-10 text-sm"
                            />
                          )}
                          {filter === 'email' && (
                            <Input
                              placeholder="Search by email..."
                              value={filterValues.email || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, email: e.target.value }))}
                              className="flex-1 sm:max-w-xs h-9 sm:h-10 text-sm"
                            />
                          )}
                          {filter === 'phone' && (
                            <Input
                              placeholder="Search by phone..."
                              value={filterValues.phone || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, phone: e.target.value }))}
                              className="flex-1 sm:max-w-xs h-9 sm:h-10 text-sm"
                            />
                          )}
                          {filter === 'pan' && (
                            <Input
                              placeholder="Search by PAN..."
                              value={filterValues.pan || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, pan: e.target.value }))}
                              className="flex-1 sm:max-w-xs h-9 sm:h-10 text-sm"
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setActiveFilters(activeFilters.filter(f => f !== filter));
                              setFilterValues(fv => {
                                const newFv = { ...fv };
                                delete newFv[filter];
                                return newFv;
                              });
                            }}
                            title="Remove filter"
                            className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Name</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Email</TableHead>
                          <TableHead className="text-xs sm:text-sm">Phone</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden md:table-cell">PAN</TableHead>
                          <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedBeneficiaries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-400 text-sm">
                              No beneficiaries found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedBeneficiaries.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell className="text-xs sm:text-sm">
                                <div className="flex flex-col sm:block">
                                  <span className="font-medium">{b.name}</span>
                                  <span className="text-gray-400 text-xs sm:hidden mt-1">{b.email || '-'}</span>
                                  <span className="text-gray-400 text-xs sm:hidden mt-1">PAN: {b.pan || 'N/A'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{b.email || '-'}</TableCell>
                              <TableCell className="text-xs sm:text-sm">{b.phone}</TableCell>
                              <TableCell className="text-xs sm:text-sm hidden md:table-cell">{b.pan || 'N/A'}</TableCell>
                              <TableCell>
                                <Link to={`/beneficiaries/${b.id}`}>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9">
                                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
                <PaginationFooter />
              </Card>
            </TabsContent>
            <TabsContent value="company">
              <Card className="glass-card">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 flex-wrap">
                      <Select
                        value=""
                        onValueChange={filter => {
                          if (!activeFilters.includes(filter)) {
                            setActiveFilters([...activeFilters, filter]);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10">
                          <SelectValue placeholder="Add Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          {!activeFilters.includes('name') && <SelectItem value="name">Company Name</SelectItem>}
                          {!activeFilters.includes('email') && <SelectItem value="email">Email</SelectItem>}
                          {!activeFilters.includes('phone') && <SelectItem value="phone">Phone</SelectItem>}
                          {!activeFilters.includes('pan') && <SelectItem value="pan">PAN</SelectItem>}
                        </SelectContent>
                      </Select>
                      {activeFilters.map(filter => (
                        <div key={filter} className="flex items-center gap-2 w-full sm:w-auto">
                          {filter === 'name' && (
                            <Input
                              placeholder="Search by company name..."
                              value={filterValues.name || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, name: e.target.value }))}
                              className="flex-1 sm:max-w-xs h-9 sm:h-10 text-sm"
                            />
                          )}
                          {filter === 'email' && (
                            <Input
                              placeholder="Search by email..."
                              value={filterValues.email || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, email: e.target.value }))}
                              className="flex-1 sm:max-w-xs h-9 sm:h-10 text-sm"
                            />
                          )}
                          {filter === 'phone' && (
                            <Input
                              placeholder="Search by phone..."
                              value={filterValues.phone || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, phone: e.target.value }))}
                              className="flex-1 sm:max-w-xs h-9 sm:h-10 text-sm"
                            />
                          )}
                          {filter === 'pan' && (
                            <Input
                              placeholder="Search by PAN..."
                              value={filterValues.pan || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, pan: e.target.value }))}
                              className="flex-1 sm:max-w-xs h-9 sm:h-10 text-sm"
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setActiveFilters(activeFilters.filter(f => f !== filter));
                              setFilterValues(fv => {
                                const newFv = { ...fv };
                                delete newFv[filter];
                                return newFv;
                              });
                            }}
                            title="Remove filter"
                            className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Company Name</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Email</TableHead>
                          <TableHead className="text-xs sm:text-sm">Phone</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden md:table-cell">PAN</TableHead>
                          <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedBeneficiaries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-400 text-sm">
                              No beneficiaries found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedBeneficiaries.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell className="text-xs sm:text-sm">
                                <div className="flex flex-col sm:block">
                                  <span className="font-medium">{b.company_name}</span>
                                  <span className="text-gray-400 text-xs sm:hidden mt-1">{b.email || '-'}</span>
                                  <span className="text-gray-400 text-xs sm:hidden mt-1">PAN: {b.pan || 'N/A'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{b.email || '-'}</TableCell>
                              <TableCell className="text-xs sm:text-sm">{b.phone}</TableCell>
                              <TableCell className="text-xs sm:text-sm hidden md:table-cell">{b.pan || 'N/A'}</TableCell>
                              <TableCell>
                                <Link to={`/beneficiaries/${b.id}`}>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9">
                                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
                <PaginationFooter />
              </Card>
            </TabsContent>
          </Tabs>
        )}

      </motion.div>

      <Dialog open={showAddDialog} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Add New Beneficiary</DialogTitle>
            <CardDescription className="text-sm">Enter the details for the new beneficiary.</CardDescription>
          </DialogHeader>
          <BeneficiaryForm onAdd={handleAdd} onCancel={() => handleDialogChange(false)} isSaving={isSaving} />
        </DialogContent>
      </Dialog>

      <Dialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Add Bank Account</DialogTitle>
            <CardDescription className="text-sm">For: <span className="font-semibold text-sky-400">{selectedBeneficiary?.beneficiary_type === 'individual' ? selectedBeneficiary.name : selectedBeneficiary?.company_name}</span></CardDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedBeneficiary && <AddBankAccountForm beneficiary={selectedBeneficiary} onAddBankAccount={handleAddAccountSubmit} onCancel={() => setShowAddAccountDialog(false)} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Beneficiary Details</DialogTitle>
          </DialogHeader>
          {selectedBeneficiary && (
            <div className="space-y-4 pt-4">
              <BeneficiaryForm onAdd={handleUpdate} onCancel={() => setShowViewDialog(false)} isEdit={true} beneficiary={selectedBeneficiary} isSaving={isSaving} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Beneficiaries;
