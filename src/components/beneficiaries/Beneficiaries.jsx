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
import { Link } from 'react-router-dom';
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

const BeneficiaryForm = ({ onAdd, onCancel, isEdit, beneficiary }) => {
  const [beneficiaryType, setBeneficiaryType] = useState(beneficiary?.beneficiary_type || 'individual');

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
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
          <div className="md:col-span-2"><Label htmlFor="email">Email</Label><Input name="email" id="email" type="email" /></div>
          <div><Label htmlFor="aadhar">Aadhar</Label><Input name="aadhar" id="aadhar" required /></div>
          <div><Label htmlFor="pan">PAN</Label><Input name="pan" id="pan" required /></div>
        </div>
      )}

      {beneficiaryType === 'company' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label htmlFor="company_name">Company Name</Label><Input name="company_name" id="company_name" required /></div>
            <div><Label htmlFor="phone">Phone</Label><Input name="phone" id="phone" type="tel" required /></div>
            <div className="md:col-span-2"><Label htmlFor="email">Email Address</Label><Input name="email" id="email" type="email" /></div>
            <div><Label htmlFor="gstin">GSTIN</Label><Input name="gstin" id="gstin" required /></div>
            <div><Label htmlFor="pan">PAN</Label><Input name="pan" id="pan" required /></div>
            <div><Label htmlFor="aadhar">Aadhar (of Proprietor)</Label><Input name="aadhar" id="aadhar" required /></div>
            <div><Label htmlFor="proprietor_name">Proprietor Name</Label><Input name="proprietor_name" id="proprietor_name" required /></div>
        </div>
      )}

      <DialogFooter>
        <DialogClose asChild><Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button></DialogClose>
        <Button type="submit"><Plus className="w-4 h-4 mr-2" /> Save Beneficiary</Button>
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
                <Button type="submit"><Plus className="w-4 h-4 mr-2"/> Add Account</Button>
            </DialogFooter>
        </form>
    );
};


const Beneficiaries = ({ quickAction, clearQuickAction }) => {
  const PAGE_SIZE = 10;

  const [beneficiaries, setBeneficiaries] = useState([]);
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
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchBeneficiaries = useCallback(async () => {
    if (!user?.access_token) return;
    setIsLoading(true);
    try {
      const organisationId =
        typeof user.organization_id === 'object' && user.organization_id !== null
          ? user.organization_id.id
          : user.organization_id;

      // Fetch a larger list once, then paginate client-side (10 per page)
      const data = await getBeneficiaries(organisationId, user.access_token, 0, 1000);

      if (Array.isArray(data)) {
        const beneficiariesWithAccounts = await Promise.all(
          data.map(async (beneficiary) => {
            const bankAccounts = await getBankAccountsForBeneficiary(beneficiary.id, user.access_token);
            return { ...beneficiary, bank_accounts: bankAccounts };
          })
        );
        setBeneficiaries(beneficiariesWithAccounts);
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
  }, [user?.organization_id, user?.access_token, toast]);

  useEffect(() => {
    fetchBeneficiaries();
  }, [fetchBeneficiaries]);
  
  useEffect(() => {
    if (quickAction === 'add-beneficiary') {
      setShowAddDialog(true);
      clearQuickAction();
    }
  }, [quickAction, clearQuickAction]);

  const filteredBeneficiaries = useMemo(() => {
    const getTimestamp = (b) => {
      const candidates = [
        b?.created_at,
        b?.createdAt,
        b?.created_on,
        b?.createdOn,
        b?.updated_at,
        b?.updatedAt,
      ];

      for (const value of candidates) {
        if (!value) continue;
        const t = Date.parse(value);
        if (!Number.isNaN(t)) return t;
      }
      return null;
    };

    // Sort beneficiaries: newest first
    const sortedBeneficiaries = [...beneficiaries].sort((a, b) => {
      // First, try to sort by timestamp (newest first)
      const ta = getTimestamp(a);
      const tb = getTimestamp(b);

      if (ta !== null && tb !== null) {
        return tb - ta; // Newest first (descending)
      }
      if (ta !== null) return -1; // a has timestamp, b doesn't - a comes first
      if (tb !== null) return 1;  // b has timestamp, a doesn't - b comes first

      // Fallback: Sort by UUID string comparison (newer UUIDs typically come later in string sort)
      // This is not perfect but provides some ordering when timestamps aren't available
      const idA = a?.id?.toString() || '';
      const idB = b?.id?.toString() || '';
      
      // Reverse string comparison to put "newer" UUIDs first
      // UUIDs are typically generated sequentially, so later UUIDs in string sort are newer
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
    try {
      const newBeneficiary = await addBeneficiary(beneficiaryData, user.access_token);
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
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to add beneficiary: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (beneficiaryData) => {
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
    }
  };

  const handleView = (beneficiary) => {
    // Ensure the selected beneficiary has the correct organization_id from user context
    setSelectedBeneficiary({
      ...beneficiary,
      organization_id: user?.organization_id
    });
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
    <CardFooter className="flex justify-between items-center pt-4">
      <div>
        <p className="text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </CardFooter>
  );

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-5xl font-bold text-white">Beneficiaries</h1>
           <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input placeholder="Search..." className="pl-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Add New
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual">Individual</TabsTrigger>
              <TabsTrigger value="company">Company</TabsTrigger>
            </TabsList>
            <TabsContent value="individual">
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 flex-wrap">
                      <Select
                        value=""
                        onValueChange={filter => {
                          if (!activeFilters.includes(filter)) {
                            setActiveFilters([...activeFilters, filter]);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
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
                        <div key={filter} className="flex items-center gap-2">
                          {filter === 'name' && (
                            <Input
                              placeholder="Search by name..."
                              value={filterValues.name || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, name: e.target.value }))}
                              className="max-w-xs"
                            />
                          )}
                          {filter === 'email' && (
                            <Input
                              placeholder="Search by email..."
                              value={filterValues.email || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, email: e.target.value }))}
                              className="max-w-xs"
                            />
                          )}
                          {filter === 'phone' && (
                            <Input
                              placeholder="Search by phone..."
                              value={filterValues.phone || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, phone: e.target.value }))}
                              className="max-w-xs"
                            />
                          )}
                          {filter === 'pan' && (
                            <Input
                              placeholder="Search by PAN..."
                              value={filterValues.pan || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, pan: e.target.value }))}
                              className="max-w-xs"
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
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>PAN</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBeneficiaries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-400">
                            No beneficiaries found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedBeneficiaries.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell>{b.name}</TableCell>
                            <TableCell>{b.email || '-'}</TableCell>
                            <TableCell>{b.phone}</TableCell>
                            <TableCell>{b.pan || 'N/A'}</TableCell>
                            <TableCell>
                              <Link to={`/beneficiaries/${b.id}`}>
                                <Button size="icon" variant="ghost">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
                <PaginationFooter />
              </Card>
            </TabsContent>
            <TabsContent value="company">
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 flex-wrap">
                      <Select
                        value=""
                        onValueChange={filter => {
                          if (!activeFilters.includes(filter)) {
                            setActiveFilters([...activeFilters, filter]);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
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
                        <div key={filter} className="flex items-center gap-2">
                          {filter === 'name' && (
                            <Input
                              placeholder="Search by company name..."
                              value={filterValues.name || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, name: e.target.value }))}
                              className="max-w-xs"
                            />
                          )}
                          {filter === 'email' && (
                            <Input
                              placeholder="Search by email..."
                              value={filterValues.email || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, email: e.target.value }))}
                              className="max-w-xs"
                            />
                          )}
                          {filter === 'phone' && (
                            <Input
                              placeholder="Search by phone..."
                              value={filterValues.phone || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, phone: e.target.value }))}
                              className="max-w-xs"
                            />
                          )}
                          {filter === 'pan' && (
                            <Input
                              placeholder="Search by PAN..."
                              value={filterValues.pan || ''}
                              onChange={e => setFilterValues(fv => ({ ...fv, pan: e.target.value }))}
                              className="max-w-xs"
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
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>PAN</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBeneficiaries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-400">
                            No beneficiaries found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedBeneficiaries.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell>{b.company_name}</TableCell>
                            <TableCell>{b.email || '-'}</TableCell>
                            <TableCell>{b.phone}</TableCell>
                            <TableCell>{b.pan || 'N/A'}</TableCell>
                            <TableCell>
                              <Link to={`/beneficiaries/${b.id}`}>
                                <Button size="icon" variant="ghost">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
                <PaginationFooter />
              </Card>
            </TabsContent>
          </Tabs>
        )}

      </motion.div>
      
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Beneficiary</DialogTitle>
            <CardDescription>Enter the details for the new beneficiary.</CardDescription>
          </DialogHeader>
          <BeneficiaryForm onAdd={handleAdd} onCancel={() => setShowAddDialog(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <CardDescription>For: <span className="font-semibold text-sky-400">{selectedBeneficiary?.beneficiary_type === 'individual' ? selectedBeneficiary.name : selectedBeneficiary?.company_name}</span></CardDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedBeneficiary && <AddBankAccountForm beneficiary={selectedBeneficiary} onAddBankAccount={handleAddAccountSubmit} onCancel={() => setShowAddAccountDialog(false)}/>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Beneficiary Details</DialogTitle>
          </DialogHeader>
          {selectedBeneficiary && (
            <div className="space-y-4 pt-4">
              <BeneficiaryForm onAdd={handleUpdate} onCancel={() => setShowViewDialog(false)} isEdit={true} beneficiary={selectedBeneficiary} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Beneficiaries;
