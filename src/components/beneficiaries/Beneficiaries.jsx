import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Users, Banknote, Building, Search, Loader2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { 
  getBeneficiaries, 
  addBeneficiary, 
  deleteBeneficiary,
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
          <div className="md:col-span-2"><Label htmlFor="email">Email</Label><Input name="email" id="email" type="email" required /></div>
          <div><Label htmlFor="aadhar">Aadhar</Label><Input name="aadhar" id="aadhar" /></div>
          <div><Label htmlFor="pan">PAN</Label><Input name="pan" id="pan" /></div>
        </div>
      )}

      {beneficiaryType === 'company' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label htmlFor="company_name">Company Name</Label><Input name="company_name" id="company_name" required /></div>
            <div><Label htmlFor="phone">Phone</Label><Input name="phone" id="phone" type="tel" required /></div>
            <div className="md:col-span-2"><Label htmlFor="email">Email Address</Label><Input name="email" id="email" type="email" required /></div>
            <div><Label htmlFor="gstin">GSTIN</Label><Input name="gstin" id="gstin" /></div>
            <div><Label htmlFor="pan">PAN</Label><Input name="pan" id="pan" /></div>
            <div><Label htmlFor="aadhar">Aadhar (of Proprietor)</Label><Input name="aadhar" id="aadhar" /></div>
            <div><Label htmlFor="proprietor_name">Proprietor Name</Label><Input name="proprietor_name" id="proprietor_name" /></div>
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
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('individual');
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchBeneficiaries = useCallback(async (page = 1) => {
    if (!user?.access_token) return;
    setIsLoading(true);
    try {
      const organisationId = typeof user.organization_id === 'object' && user.organization_id !== null 
        ? user.organization_id.id 
        : user.organization_id;
      const data = await getBeneficiaries(organisationId, user.access_token, 0, 100);
      if (Array.isArray(data)) {
        const beneficiariesWithAccounts = await Promise.all(
          data.map(async (beneficiary) => {
            const bankAccounts = await getBankAccountsForBeneficiary(beneficiary.id, user.access_token);
            return { ...beneficiary, bank_accounts: bankAccounts };
          })
        );
        setBeneficiaries(beneficiariesWithAccounts);
        setTotalPages(1); // Assuming a single page for now
      } else {
        setBeneficiaries([]);
        setTotalPages(1);
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
    fetchBeneficiaries(currentPage);
  }, [fetchBeneficiaries, currentPage]);
  
  useEffect(() => {
    if (quickAction === 'add-beneficiary') {
      setShowAddDialog(true);
      clearQuickAction();
    }
  }, [quickAction, clearQuickAction]);

  const filteredBeneficiaries = useMemo(() => {
    const sortedBeneficiaries = [...beneficiaries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const filteredByType = sortedBeneficiaries.filter(b => b.beneficiary_type === activeTab);
    if (!searchTerm) return filteredByType;
    return filteredByType.filter(b => {
      const term = searchTerm.toLowerCase();
      const name = b.beneficiary_type === 'individual' ? b.name : b.company_name;
      return name?.toLowerCase().includes(term) ||
             b.email?.toLowerCase().includes(term) ||
             b.pan?.toLowerCase().includes(term) ||
             b.phone?.toLowerCase().includes(term);
    });
  }, [searchTerm, beneficiaries, activeTab]);

  const handleAdd = async (beneficiaryData) => {
    try {
      await addBeneficiary(beneficiaryData, user.access_token);
      toast({ title: 'Success', description: 'Beneficiary added successfully.' });
      setShowAddDialog(false);
      fetchBeneficiaries();
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

  const handleDelete = async (beneficiaryId) => {
    try {
      const organizationId = typeof user.organization_id === 'object' && user.organization_id !== null 
        ? user.organization_id.id 
        : user.organization_id;
      await deleteBeneficiary(beneficiaryId, organizationId, user.access_token);
      toast({ title: 'Success', description: 'Beneficiary deleted successfully.' });
      fetchBeneficiaries();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete beneficiary: ${error.message}`,
        variant: 'destructive',
      });
    }
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
                      {filteredBeneficiaries.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>{b.name}</TableCell>
                          <TableCell>{b.email}</TableCell>
                          <TableCell>{b.phone}</TableCell>
                          <TableCell>{b.pan || 'N/A'}</TableCell>
                          <TableCell>
                            <Link to={`/beneficiaries/${b.id}`}>
                              <Button size="icon" variant="ghost">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDelete(b.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="company">
              <Card className="glass-card">
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
                      {filteredBeneficiaries.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>{b.company_name}</TableCell>
                          <TableCell>{b.email}</TableCell>
                          <TableCell>{b.phone}</TableCell>
                          <TableCell>{b.pan || 'N/A'}</TableCell>
                          <TableCell>
                            <Link to={`/beneficiaries/${b.id}`}>
                              <Button size="icon" variant="ghost">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDelete(b.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        <CardFooter className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
        </CardFooter>
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
