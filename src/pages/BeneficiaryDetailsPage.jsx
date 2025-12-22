import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import {
  getBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  getBankAccountsForBeneficiary,
  addBankAccount,
  deactivateBankAccount,
  reactivateBankAccount,
  deleteBankAccount,
} from '@/lib/api';
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showDeleteBankDialog, setShowDeleteBankDialog] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState(null);
  const [isDeletingBank, setIsDeletingBank] = useState(false);

  const [togglingBankAccountId, setTogglingBankAccountId] = useState(null);

  const fetchBeneficiaryData = useCallback(async () => {
    if (!user?.access_token || !user?.organization_id) return;
    setIsLoading(true);
    try {
      const organizationId = typeof user.organization_id === 'object' && user.organization_id !== null
        ? user.organization_id.id
        : user.organization_id;
      const [beneficiaryData, bankAccountsData] = await Promise.all([
        getBeneficiary(beneficiaryId, organizationId, user.access_token),
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
      const organizationId = typeof user.organization_id === 'object' && user.organization_id !== null
        ? user.organization_id.id
        : user.organization_id;
      await updateBeneficiary(beneficiaryId, organizationId, finalData, user.access_token);
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

  const handleDeleteAccountClick = (account) => {
    setSelectedBankAccount(account);
    setShowDeleteBankDialog(true);
  };

  const handleToggleBankAccountStatus = async (account, nextIsActive) => {
    if (!account?.id) return;

    try {
      setTogglingBankAccountId(account.id);

      if (nextIsActive) {
        await reactivateBankAccount(beneficiaryId, account.id, user.access_token);
        toast({ title: 'Success', description: 'Bank account activated successfully.' });
      } else {
        await deactivateBankAccount(beneficiaryId, account.id, user.access_token);
        toast({ title: 'Success', description: 'Bank account moved to inactive.' });
      }

      fetchBeneficiaryData();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to update bank account status: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setTogglingBankAccountId(null);
    }
  };

  const handleConfirmDeleteBankAccount = async () => {
    if (!selectedBankAccount?.id) return;

    try {
      setIsDeletingBank(true);

      // If active -> move to inactive (soft delete)
      if (selectedBankAccount?.is_active !== false) {
        await deactivateBankAccount(beneficiaryId, selectedBankAccount.id, user.access_token);
        toast({ title: 'Success', description: 'Bank account moved to inactive.' });
      } else {
        // Inactive -> permanent delete
        await deleteBankAccount(beneficiaryId, selectedBankAccount.id, user.access_token);
        toast({ title: 'Success', description: 'Bank account deleted permanently.' });
      }

      setShowDeleteBankDialog(false);
      setSelectedBankAccount(null);
      fetchBeneficiaryData();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete bank account: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsDeletingBank(false);
    }
  };

  const handleDeleteBeneficiary = async () => {
    try {
      setIsDeleting(true);
      const organizationId =
        typeof user.organization_id === 'object' && user.organization_id !== null
          ? user.organization_id.id
          : user.organization_id;

      await deleteBeneficiary(beneficiaryId, organizationId, user.access_token);

      toast({
        title: 'Deleted',
        description: 'Beneficiary deleted successfully.',
      });
      setShowDeleteDialog(false);
      navigate('/beneficiaries');
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete beneficiary: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };


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

  const activeBankAccounts = bankAccounts.filter((acc) => acc?.is_active !== false);
  const inactiveBankAccounts = bankAccounts.filter((acc) => acc?.is_active === false);

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/beneficiaries')} className="h-9 w-9 sm:h-10 sm:w-10">
            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Beneficiary Details</h1>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="h-9 sm:h-10 text-sm sm:text-base flex-1 sm:flex-initial">
            <Trash2 className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Delete Beneficiary</span>
            <span className="sm:hidden">Delete</span>
          </Button>
          <Button onClick={() => setIsEditing(true)} className="h-9 sm:h-10 text-sm sm:text-base flex-1 sm:flex-initial">
            <Edit className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Edit Beneficiary</span>
            <span className="sm:hidden">Edit</span>
          </Button>
        </div>
      </div>

      <Card className="glass-card mb-6 sm:mb-8">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6">
            <div>
                <CardTitle className="text-lg sm:text-xl md:text-2xl">{beneficiaryName}</CardTitle>
                <CardDescription className="text-sm sm:text-base">{beneficiary.beneficiary_type === 'individual' ? 'Individual' : 'Company'}</CardDescription>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Label htmlFor="show-details" className="text-white text-sm sm:text-base">Show Details</Label>
                <Switch id="show-details" checked={showDetails} onCheckedChange={setShowDetails} />
            </div>
        </CardHeader>
        {showDetails && (
            <CardContent className="p-4 sm:p-6 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-sm">
                    <div className="space-y-1"><p className="text-gray-400 text-xs sm:text-sm">Email</p><p className="text-sm sm:text-base">{beneficiary.email || 'No email'}</p></div>
                    <div className="space-y-1"><p className="text-gray-400 text-xs sm:text-sm">Phone</p><p className="text-sm sm:text-base">{beneficiary.phone}</p></div>
                    <div className="space-y-1"><p className="text-gray-400 text-xs sm:text-sm">PAN</p><p className="text-sm sm:text-base">{beneficiary.pan || 'N/A'}</p></div>
                    <div className="space-y-1"><p className="text-gray-400 text-xs sm:text-sm">Aadhar</p><p className="text-sm sm:text-base">{beneficiary.aadhar || 'N/A'}</p></div>
                    {beneficiary.beneficiary_type === 'company' && (
                        <>
                            <div className="space-y-1"><p className="text-gray-400 text-xs sm:text-sm">GSTIN</p><p className="text-sm sm:text-base">{beneficiary.gstin || 'N/A'}</p></div>
                            <div className="space-y-1"><p className="text-gray-400 text-xs sm:text-sm">Proprietor Name</p><p className="text-sm sm:text-base">{beneficiary.proprietor_name || 'N/A'}</p></div>
                        </>
                    )}
                </div>
            </CardContent>
        )}
      </Card>

      {/* Active bank accounts */}
      <Card className="glass-card">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6">
          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-white">Bank Accounts</CardTitle>
            <CardDescription className="text-sm sm:text-base">Manage beneficiary's active bank accounts.</CardDescription>
          </div>
          <Button onClick={() => setShowAddAccountDialog(true)} className="h-9 sm:h-10 text-sm sm:text-base w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1 sm:mr-2" /> 
            <span className="hidden sm:inline">Add Bank Account</span>
            <span className="sm:hidden">Add Account</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Bank Name</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Account Number</TableHead>
                  <TableHead className="text-xs sm:text-sm">Account Type</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden md:table-cell">IFSC Code</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Branch Name</TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeBankAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400 py-6 text-sm">
                      No active bank accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeBankAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="flex flex-col sm:block">
                          <span className="font-medium">{account.bank_name}</span>
                          <span className="text-gray-400 text-xs sm:hidden mt-1">Acc: {account.account_number}</span>
                          <span className="text-gray-400 text-xs sm:hidden mt-1">IFSC: {account.ifsc_code}</span>
                          <span className="text-gray-400 text-xs sm:hidden mt-1">Branch: {account.branch_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{account.account_number}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{account.account_type}</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden md:table-cell">{account.ifsc_code}</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden lg:table-cell">{account.branch_name}</TableCell>
                      <TableCell>
                        <Switch
                          checked={account?.is_active !== false}
                          onCheckedChange={(checked) => handleToggleBankAccountStatus(account, checked)}
                          disabled={togglingBankAccountId === account.id}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Inactive bank accounts */}
      <Card className="glass-card mt-4 sm:mt-6">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl font-bold text-white">Inactive Bank Accounts</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Deactivated bank accounts appear here. You can permanently delete them.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Bank Name</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Account Number</TableHead>
                  <TableHead className="text-xs sm:text-sm">Account Type</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden md:table-cell">IFSC Code</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Branch Name</TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveBankAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400 py-6 text-sm">
                      No inactive bank accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  inactiveBankAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="flex flex-col sm:block">
                          <span className="font-medium">{account.bank_name}</span>
                          <span className="text-gray-400 text-xs sm:hidden mt-1">Acc: {account.account_number}</span>
                          <span className="text-gray-400 text-xs sm:hidden mt-1">IFSC: {account.ifsc_code}</span>
                          <span className="text-gray-400 text-xs sm:hidden mt-1">Branch: {account.branch_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{account.account_number}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{account.account_type}</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden md:table-cell">{account.ifsc_code}</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden lg:table-cell">{account.branch_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Switch
                            checked={account?.is_active !== false}
                            onCheckedChange={(checked) => handleToggleBankAccountStatus(account, checked)}
                            disabled={togglingBankAccountId === account.id}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-400 h-8 w-8 sm:h-9 sm:w-9"
                            onClick={() => handleDeleteAccountClick(account)}
                            title="Delete permanently"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Edit Beneficiary</DialogTitle>
                <DialogDescription className="text-sm">Make changes to the beneficiary details below.</DialogDescription>
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
                        <div className="md:col-span-2"><Label htmlFor="email">Email</Label><Input name="email" id="email" type="email" defaultValue={editableBeneficiary.email} /></div>
                        <div><Label htmlFor="aadhar">Aadhar</Label><Input name="aadhar" id="aadhar" defaultValue={editableBeneficiary.aadhar} required /></div>
                        <div><Label htmlFor="pan">PAN</Label><Input name="pan" id="pan" defaultValue={editableBeneficiary.pan} required /></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label htmlFor="company_name">Company Name</Label><Input name="company_name" id="company_name" defaultValue={editableBeneficiary.company_name} required /></div>
                        <div><Label htmlFor="phone">Phone</Label><Input name="phone" id="phone" type="tel" defaultValue={editableBeneficiary.phone} required /></div>
                        <div className="md:col-span-2"><Label htmlFor="email">Email Address</Label><Input name="email" id="email" type="email" defaultValue={editableBeneficiary.email} /></div>
                        <div><Label htmlFor="gstin">GSTIN</Label><Input name="gstin" id="gstin" defaultValue={editableBeneficiary.gstin} required /></div>
                        <div><Label htmlFor="pan">PAN</Label><Input name="pan" id="pan" defaultValue={editableBeneficiary.pan} required /></div>
                        <div><Label htmlFor="aadhar">Aadhar (of Proprietor)</Label><Input name="aadhar" id="aadhar" defaultValue={editableBeneficiary.aadhar} required /></div>
                        <div><Label htmlFor="proprietor_name">Proprietor Name</Label><Input name="proprietor_name" id="proprietor_name" defaultValue={editableBeneficiary.proprietor_name} required /></div>
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

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Delete Beneficiary</DialogTitle>
            <DialogDescription className="text-sm">
              This will permanently delete the entire beneficiary <span className="font-semibold">{beneficiaryName}</span>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button" disabled={isDeleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteBeneficiary}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteBankDialog} onOpenChange={setShowDeleteBankDialog}>
        <DialogContent className="w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {selectedBankAccount?.is_active === false ? 'Delete Bank Account (Permanent)' : 'Move Bank Account to Inactive'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selectedBankAccount?.is_active === false
                ? 'This will permanently delete the bank account. This action cannot be undone.'
                : <>Are you sure you want to move this bank account to <span className="font-semibold">Inactive Bank Accounts</span>?</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                variant="ghost"
                type="button"
                disabled={isDeletingBank}
                onClick={() => setSelectedBankAccount(null)}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteBankAccount}
              disabled={isDeletingBank}
            >
              {isDeletingBank ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {selectedBankAccount?.is_active === false ? 'Delete Permanently' : 'Move to Inactive'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Add Bank Account</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {beneficiary && (
              <AddBankAccountForm
                beneficiary={beneficiary}
                onAddBankAccount={handleAddAccountSubmit}
                onCancel={() => setShowAddAccountDialog(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BeneficiaryDetailsPage;
