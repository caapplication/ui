import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Users, Banknote, Building, Search, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth.jsx';
import { 
  getBeneficiaries, 
  addBeneficiary, 
  deleteBeneficiary,
  addBankAccount,
  deleteBankAccount,
  getBankAccountsForBeneficiary
} from '@/lib/api';

const BeneficiaryForm = ({ onAdd, onCancel }) => {
  const [beneficiaryType, setBeneficiaryType] = useState('individual');

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    onAdd({ ...data, beneficiary_type: beneficiaryType });
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
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchBeneficiaries = useCallback(async () => {
    if (!user?.access_token) return;
    setIsLoading(true);
    try {
      const beneficiariesList = await getBeneficiaries(user.access_token);
      const beneficiariesWithAccounts = await Promise.all(
        beneficiariesList.map(async (beneficiary) => {
          const bankAccounts = await getBankAccountsForBeneficiary(beneficiary.id, user.access_token);
          return { ...beneficiary, bank_accounts: bankAccounts };
        })
      );
      setBeneficiaries(beneficiariesWithAccounts);
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
  }, [user?.access_token, toast]);

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
    if (!searchTerm) return beneficiaries;
    return beneficiaries.filter(b => {
      const term = searchTerm.toLowerCase();
      const name = b.beneficiary_type === 'individual' ? b.name : b.company_name;
      return name?.toLowerCase().includes(term) ||
             b.email?.toLowerCase().includes(term) ||
             b.pan?.toLowerCase().includes(term);
    });
  }, [searchTerm, beneficiaries]);

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

  const handleDelete = async (beneficiaryId) => {
    try {
      await deleteBeneficiary(beneficiaryId, user.access_token);
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
          <div className="space-y-6">
            {filteredBeneficiaries.map((b, index) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.05 }}>
                <Card className="glass-card card-hover">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${b.beneficiary_type === 'individual' ? 'bg-gradient-to-br from-sky-500 to-indigo-500' : 'bg-gradient-to-br from-amber-500 to-orange-600'}`}>
                          {b.beneficiary_type === 'individual' ? <Users className="w-6 h-6 text-white" /> : <Building className="w-6 h-6 text-white" />}
                        </div>
                        <div>
                          <CardTitle className="text-white">{b.beneficiary_type === 'individual' ? b.name : b.company_name}</CardTitle>
                          <CardDescription className="text-gray-400">{b.email}</CardDescription>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDelete(b.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                    <p><strong>Phone:</strong> {b.phone}</p>
                    <p><strong>Aadhar:</strong> {b.aadhar || 'N/A'}</p>
                    <p><strong>PAN:</strong> {b.pan || 'N/A'}</p>
                    {b.beneficiary_type === 'company' && <>
                      <p><strong>GSTIN:</strong> {b.gstin || 'N/A'}</p>
                      <p><strong>Proprietor:</strong> {b.proprietor_name || 'N/A'}</p>
                    </>}
                  </CardContent>
                  <CardFooter className="flex-col items-start">
                      <div className="w-full flex justify-between items-center mb-4">
                          <h4 className="text-lg font-semibold text-white">Bank Accounts</h4>
                          <Button variant="secondary" size="sm" onClick={() => handleAddAccountClick(b)}><Plus className="w-4 h-4 mr-2"/>Add Account</Button>
                      </div>
                      <div className="w-full space-y-2">
                          {b.bank_accounts && b.bank_accounts.length > 0 ? (
                              b.bank_accounts.map(acc => (
                                  <div key={acc.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                          <Banknote className="w-5 h-5 text-sky-400"/>
                                          <div>
                                              <p className="font-semibold text-white">{acc.bank_name} - {acc.branch_name}</p>
                                              <p className="text-xs text-gray-400">Acc No: {acc.account_number} • IFSC: {acc.ifsc_code}</p>
                                          </div>
                                      </div>
                                      <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDeleteAccountClick(b.id, acc.id)}><Trash2 className="w-4 h-4"/></Button>
                                  </div>
                              ))
                          ) : <p className="text-gray-400 text-sm">No bank accounts added yet.</p>}
                      </div>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
            {filteredBeneficiaries.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400">No beneficiaries found.</p>
              </div>
            )}
          </div>
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
    </div>
  );
};

export default Beneficiaries;