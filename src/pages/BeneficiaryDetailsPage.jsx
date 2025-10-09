import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getBeneficiary, updateBeneficiary, getBankAccountsForBeneficiary, addBankAccount, deleteBankAccount } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Plus, Trash2, ArrowLeft, Edit } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Switch } from "@/components/ui/switch";

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
                <div>
                    <Label htmlFor="account_type">Account Type</Label>
                    <Select name="account_type" id="account_type" required>
                        <SelectTrigger>
                            <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="savings">Savings</SelectItem>
                            <SelectItem value="current">Current</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button></DialogClose>
                <Button type="submit"><Plus className="w-4 h-4 mr-2"/> Add Account</Button>
            </DialogFooter>
        </form>
    );
};

const BeneficiaryDetailsPage = () => {
  const { beneficiaryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [beneficiary, setBeneficiary] = useState(null);
  const [editableBeneficiary, setEditableBeneficiary] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const fetchBeneficiaryData = useCallback(async () => {
    if (!user?.access_token || !user?.organization_id) return;
    setIsLoading(true);
    try {
      const [beneficiaryData, bankAccountsData] = await Promise.all([
        getBeneficiary(beneficiaryId, user.organization_id, user.access_token),
        getBankAccountsForBeneficiary(beneficiaryId, user.access_token)
      ]);
      setBeneficiary(beneficiaryData);
      setEditableBeneficiary(beneficiaryData);
      setBankAccounts(bankAccountsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch beneficiary: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [beneficiaryId, user?.organization_id, user?.access_token, toast]);

  useEffect(() => {
    fetchBeneficiaryData();
  }, [fetchBeneficiaryData]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const finalData = { ...data, beneficiary_type: editableBeneficiary.beneficiary_type };
    try {
      await updateBeneficiary(beneficiaryId, finalData, user.access_token);
      toast({ title: 'Success', description: 'Beneficiary updated successfully.' });
      setIsEditing(false);
      fetchBeneficiaryData();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to update beneficiary: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleAddAccountSubmit = async (beneficiaryId, bankAccountData) => {
    try {
      await addBankAccount(beneficiaryId, bankAccountData, user.access_token);
      toast({ title: 'Success', description: 'Bank account added successfully.' });
      setShowAddAccountDialog(false);
      fetchBeneficiaryData();
    } catch (error) {
       toast({
        title: 'Error',
        description: `Failed to add bank account: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccountClick = async (accountId) => {
      try {
        await deleteBankAccount(beneficiaryId, accountId, user.access_token);
        toast({ title: 'Success', description: 'Bank account deleted successfully.' });
        fetchBeneficiaryData();
      } catch (error) {
         toast({
          title: 'Error',
          description: `Failed to delete bank account: ${error.message}`,
          variant: 'destructive',
        });
      }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!beneficiary) {
    return <div className="p-8 text-white">Beneficiary not found.</div>;
  }

  const beneficiaryName = beneficiary.beneficiary_type === 'individual' ? beneficiary.name : beneficiary.company_name;

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/beneficiaries')}>
            <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-3xl font-bold text-white">Beneficiary Details</h1>
        </div>
        <Button onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Beneficiary
        </Button>
      </div>

      <Card className="glass-card mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>{beneficiaryName}</CardTitle>
                <CardDescription>{beneficiary.beneficiary_type === 'individual' ? 'Individual' : 'Company'}</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
                <Label htmlFor="show-details" className="text-white">Show Details</Label>
                <Switch id="show-details" checked={showDetails} onCheckedChange={setShowDetails} />
            </div>
        </CardHeader>
        {showDetails && (
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                    <div className="space-y-1"><p className="text-gray-400">Email</p><p>{beneficiary.email}</p></div>
                    <div className="space-y-1"><p className="text-gray-400">Phone</p><p>{beneficiary.phone}</p></div>
                    <div className="space-y-1"><p className="text-gray-400">PAN</p><p>{beneficiary.pan || 'N/A'}</p></div>
                    <div className="space-y-1"><p className="text-gray-400">Aadhar</p><p>{beneficiary.aadhar || 'N/A'}</p></div>
                    {beneficiary.beneficiary_type === 'company' && (
                        <>
                            <div className="space-y-1"><p className="text-gray-400">GSTIN</p><p>{beneficiary.gstin || 'N/A'}</p></div>
                            <div className="space-y-1"><p className="text-gray-400">Proprietor Name</p><p>{beneficiary.proprietor_name || 'N/A'}</p></div>
                        </>
                    )}
                </div>
            </CardContent>
        )}
      </Card>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-white">Bank Accounts</CardTitle>
            <CardDescription>Manage beneficiary's bank accounts.</CardDescription>
          </div>
          <Button onClick={() => setShowAddAccountDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Bank Account
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank Name</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>IFSC Code</TableHead>
                <TableHead>Branch Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.bank_name}</TableCell>
                  <TableCell>{account.account_number}</TableCell>
                  <TableCell>{account.account_type}</TableCell>
                  <TableCell>{account.ifsc_code}</TableCell>
                  <TableCell>{account.branch_name}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="text-red-400" onClick={() => handleDeleteAccountClick(account.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Edit Beneficiary</DialogTitle>
                <DialogDescription>Make changes to the beneficiary details below.</DialogDescription>
            </DialogHeader>
            {editableBeneficiary && (
                <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                    <div>
                        <Label>Beneficiary Type</Label>
                        <Select
                        value={editableBeneficiary.beneficiary_type}
                        onValueChange={(value) => setEditableBeneficiary({ ...editableBeneficiary, beneficiary_type: value })}
                        >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="company">Company</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>
                    {editableBeneficiary.beneficiary_type === 'individual' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label htmlFor="name">Name</Label><Input name="name" id="name" defaultValue={editableBeneficiary.name} required /></div>
                        <div><Label htmlFor="phone">Phone</Label><Input name="phone" id="phone" type="tel" defaultValue={editableBeneficiary.phone} required /></div>
                        <div className="md:col-span-2"><Label htmlFor="email">Email</Label><Input name="email" id="email" type="email" defaultValue={editableBeneficiary.email} required /></div>
                        <div><Label htmlFor="aadhar">Aadhar</Label><Input name="aadhar" id="aadhar" defaultValue={editableBeneficiary.aadhar} /></div>
                        <div><Label htmlFor="pan">PAN</Label><Input name="pan" id="pan" defaultValue={editableBeneficiary.pan} /></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label htmlFor="company_name">Company Name</Label><Input name="company_name" id="company_name" defaultValue={editableBeneficiary.company_name} required /></div>
                        <div><Label htmlFor="phone">Phone</Label><Input name="phone" id="phone" type="tel" defaultValue={editableBeneficiary.phone} required /></div>
                        <div className="md:col-span-2"><Label htmlFor="email">Email Address</Label><Input name="email" id="email" type="email" defaultValue={editableBeneficiary.email} required /></div>
                        <div><Label htmlFor="gstin">GSTIN</Label><Input name="gstin" id="gstin" defaultValue={editableBeneficiary.gstin} /></div>
                        <div><Label htmlFor="pan">PAN</Label><Input name="pan" id="pan" defaultValue={editableBeneficiary.pan} /></div>
                        <div><Label htmlFor="aadhar">Aadhar (of Proprietor)</Label><Input name="aadhar" id="aadhar" defaultValue={editableBeneficiary.aadhar} /></div>
                        <div><Label htmlFor="proprietor_name">Proprietor Name</Label><Input name="proprietor_name" id="proprietor_name" defaultValue={editableBeneficiary.proprietor_name} /></div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" type="button" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button type="submit"><Save className="w-4 h-4 mr-2" />Save Changes</Button>
                    </DialogFooter>
                </form>
            )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {beneficiary && <AddBankAccountForm beneficiary={beneficiary} onAddBankAccount={handleAddAccountSubmit} onCancel={() => setShowAddAccountDialog(false)}/>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BeneficiaryDetailsPage;
