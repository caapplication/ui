import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Loader2, RefreshCw, Eye, EyeOff, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, FilePen, CheckCircle, XCircle, Search, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from '@/hooks/useAuth.jsx';
import { getOrganisationBankAccounts, addOrganisationBankAccount, updateOrganisationBankAccount, deleteOrganisationBankAccount } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from 'react-router-dom';
import AnimatedSearch from '@/components/ui/AnimatedSearch';

const ITEMS_PER_PAGE = 10;

const OrganisationBank = ({ entityId, entityName, quickAction, clearQuickAction, organisationBankAccounts }) => {
  const [bankAccounts, setBankAccounts] = useState(organisationBankAccounts || []);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showToggleActiveDialog, setShowToggleActiveDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newAccountType, setNewAccountType] = useState("");
  const [visibleAccounts, setVisibleAccounts] = useState({});
  const [activeTab, setActiveTab] = useState("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchBankAccounts = useCallback(async () => {
    if (!entityId || !user?.access_token) return;
    setIsLoading(true);
    try {
      const data = await getOrganisationBankAccounts(entityId, user.access_token);
      setBankAccounts(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch bank accounts: ${error.message}`,
        variant: 'destructive',
      });
      setBankAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [entityId, user?.access_token, toast]);

  useEffect(() => {
    fetchBankAccounts();
  }, [entityId, fetchBankAccounts]);

  useEffect(() => {
    setBankAccounts(organisationBankAccounts || []);
  }, [organisationBankAccounts]);

  useEffect(() => {
    if (quickAction === 'add-organisation-bank') {
      setShowAddDialog(true);
      clearQuickAction();
    }
  }, [quickAction, clearQuickAction]);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!entityId || isSubmitting) return;
    setIsSubmitting(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const finalData = { ...data, entity_id: entityId, account_type: newAccountType };

    try {
      await addOrganisationBankAccount(finalData, user.access_token);
      toast({ title: "Success", description: "Bank account added successfully." });
      setShowAddDialog(false);
      fetchBankAccounts();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to add bank account: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleEditAccount = async (e) => {
    e.preventDefault();
    if (!selectedAccount || isSubmitting) return;
    setIsSubmitting(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const finalData = { ...data, account_type: newAccountType };

    try {
      await updateOrganisationBankAccount(selectedAccount.id, finalData, user.access_token);
      toast({ title: "Success", description: "Bank account updated successfully." });
      setShowEditDialog(false);
      fetchBankAccounts();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update bank account: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleDeleteAccount = async () => {
    if (!selectedAccount || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await deleteOrganisationBankAccount(selectedAccount.id, user.access_token);
      toast({ title: "Success", description: "Bank account deleted successfully." });
      setShowDeleteDialog(false);
      fetchBankAccounts();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete bank account: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const toggleMask = (accountId) => {
    setVisibleAccounts(prev => ({ ...prev, [accountId]: !prev[accountId] }));
  };

  const handleToggleActive = async () => {
    if (!selectedAccount || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateOrganisationBankAccount(selectedAccount.id, { is_active: !selectedAccount.is_active }, user.access_token);
      toast({ title: "Success", description: "Bank account status updated successfully." });
      setShowToggleActiveDialog(false);
      fetchBankAccounts();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update bank account status: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const activeAccounts = bankAccounts.filter(acc => acc.is_active);
  const inactiveAccounts = bankAccounts.filter(acc => !acc.is_active);

  const baseAccountsToDisplay = activeTab === 'active' ? activeAccounts : inactiveAccounts;

  const accountsToDisplay = baseAccountsToDisplay.filter(acc => {
    const term = searchTerm.toLowerCase();
    return (
      (acc.bank_name || '').toLowerCase().includes(term) ||
      (acc.account_number || '').toString().toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(accountsToDisplay.length / ITEMS_PER_PAGE);
  const paginatedAccounts = accountsToDisplay.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const renderTable = (accounts, title, description) => (
    <Card className="glass-card">
      <CardHeader className="p-4  flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="font-semibold tracking-tight text-lg text-white mb-0">{title}</CardTitle>
          <CardDescription className="text-sm sm:text-base mt-0">{description}</CardDescription>
        </div>

        <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
    <AnimatedSearch
        placeholder="Search accounts..."
        value={searchTerm}
        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
    />
</div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs sm:text-sm">Bank Name</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Account Number</TableHead>
                  <TableHead className="text-xs sm:text-sm">IFSC Code</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden md:table-cell">Branch Name</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Account Type</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length > 0 ? (
                  accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="flex flex-col sm:block">
                          <span className="font-medium">{account.bank_name}</span>
                          <div className="flex items-center gap-2 sm:hidden mt-1">
                            <span className="text-gray-400 text-xs">
                              {visibleAccounts[account.id] ? account.account_number : `************${String(account.account_number).slice(-4)}`}
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => toggleMask(account.id)} className="h-6 w-6">
                              {visibleAccounts[account.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                          </div>
                          <span className="text-gray-400 text-xs sm:hidden mt-1">Branch: {account.branch_name}</span>
                          <span className="text-gray-400 text-xs sm:hidden mt-1">Type: {account.account_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <span>
                            {visibleAccounts[account.id] ? account.account_number : `************${String(account.account_number).slice(-4)}`}
                          </span>
                          <Button variant="ghost" size="icon" onClick={() => toggleMask(account.id)} className="h-7 w-7 sm:h-8 sm:w-8">
                            {visibleAccounts[account.id] ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">{account.ifsc_code}</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden md:table-cell">{account.branch_name}</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden lg:table-cell">{account.account_type}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <Button size="icon" variant="ghost" onClick={() => {
                            setSelectedAccount(account);
                            setNewAccountType(account.account_type);
                            setShowEditDialog(true);
                          }} className="h-7 w-7 sm:h-8 sm:w-8">
                            <FilePen className="w-4 h-4 sm:w-6 sm:h-6 text-sky-400" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => {
                            setSelectedAccount(account);
                            setShowToggleActiveDialog(true);
                          }} className="h-7 w-7 sm:h-8 sm:w-8">
                            {account.is_active ? <ToggleRight className="w-4 h-4 sm:w-6 sm:h-6 text-green-400" /> : <ToggleLeft className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" />}
                          </Button>
                          {!account.is_active && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedAccount(account);
                                setShowDeleteDialog(true);
                              }}
                              className="h-7 w-7 sm:h-8 sm:w-8"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan="6" className="text-center text-gray-400 py-8 text-sm">
                      No {activeTab} bank accounts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-row justify-center items-center gap-3 p-4 sm:p-6 border-t border-white/10">
        <div>
          <p className="text-xs sm:text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/10 bg-transparent hover:bg-white/10 text-white">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/10 bg-transparent hover:bg-white/10 text-white">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card >
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="page-header">
          <Button variant="ghost" size="icon" onClick={() => navigate('/finance')} className="h-10 w-10 border border-white/10 hover:bg-white/10 rounded-full shrink-0">
            <ArrowLeft className="h-6 w-6 text-white" />
          </Button>
          <h1 className="page-title">Organisation Bank Accounts</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 flex-wrap w-full">
            <TabsList>
              <TabsTrigger value="active">
                <CheckCircle className="w-4 h-4 mr-2" />
                Active Bank Details
              </TabsTrigger>
              <TabsTrigger value="inactive">
                <XCircle className="w-4 h-4 mr-2" />
                Inactive Bank Details
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" size="icon" onClick={fetchBankAccounts} disabled={isLoading} className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={() => setShowAddDialog(true)} className="h-9 sm:h-10 text-sm sm:text-base flex-1 sm:flex-initial">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Add Bank Account</span>
                <span className="sm:hidden">Add Account</span>
              </Button>
            </div>
          </div>
          <TabsContent value="active">
            {renderTable(paginatedAccounts, `Active Bank Accounts for ${entityName}`)}
          </TabsContent>
          <TabsContent value="inactive">
            {renderTable(paginatedAccounts, `Inactive Bank Accounts for ${entityName}`)}
          </TabsContent>
        </Tabs>
      </motion.div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Add New Bank Account</DialogTitle>
            <DialogDescription className="text-sm">Entity: <span className="font-semibold text-sky-400">{entityName}</span></DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAccount} className="space-y-4 pt-4">
            <div>
              <Label htmlFor="bank_name" className="text-sm sm:text-base">Bank Name</Label>
              <Input id="bank_name" name="bank_name" required className="h-9 sm:h-10 text-sm" />
            </div>
            <div>
              <Label htmlFor="account_number" className="text-sm sm:text-base">Account Number</Label>
              <Input id="account_number" name="account_number" required className="h-9 sm:h-10 text-sm" />
            </div>
            <div>
              <Label htmlFor="ifsc_code" className="text-sm sm:text-base">IFSC Code</Label>
              <Input id="ifsc_code" name="ifsc_code" required className="h-9 sm:h-10 text-sm" />
            </div>
            <div>
              <Label htmlFor="branch_name" className="text-sm sm:text-base">Branch Name</Label>
              <Input id="branch_name" name="branch_name" required className="h-9 sm:h-10 text-sm" />
            </div>
            <div>
              <Label htmlFor="account_type" className="text-sm sm:text-base">Account Type</Label>
              <Select onValueChange={setNewAccountType} value={newAccountType} required>
                <SelectTrigger className="h-9 sm:h-10 text-sm">
                  <SelectValue placeholder="Select an account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Savings Account">Savings Account</SelectItem>
                  <SelectItem value="Recurring Deposit Account">Recurring Deposit Account</SelectItem>
                  <SelectItem value="Current Account">Current Account</SelectItem>
                  <SelectItem value="Fixed Deposit Account">Fixed Deposit Account</SelectItem>
                  <SelectItem value="NRI Account">NRI Account</SelectItem>
                  <SelectItem value="DEMAT Account">DEMAT Account</SelectItem>
                  <SelectItem value="Senior Citizens' Account">Senior Citizens' Account</SelectItem>
                  <SelectItem value="Salary Account">Salary Account</SelectItem>
                  <SelectItem value="Credit Cash">Credit Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost" className="h-9 sm:h-10 text-sm sm:text-base" disabled={isSubmitting}>Cancel</Button></DialogClose>
              <Button type="submit" className="h-9 sm:h-10 text-sm sm:text-base" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {isSubmitting ? "Adding..." : "Add Account"}
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Bank Account</DialogTitle>
            <DialogDescription className="text-sm">Entity: <span className="font-semibold text-sky-400">{entityName}</span></DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAccount} className="space-y-4 pt-4">
            <div>
              <Label htmlFor="edit_bank_name" className="text-sm sm:text-base">Bank Name</Label>
              <Input id="edit_bank_name" name="bank_name" defaultValue={selectedAccount?.bank_name} required className="h-9 sm:h-10 text-sm" />
            </div>
            <div>
              <Label htmlFor="edit_account_number" className="text-sm sm:text-base">Account Number</Label>
              <Input id="edit_account_number" name="account_number" defaultValue={selectedAccount?.account_number} required className="h-9 sm:h-10 text-sm" />
            </div>
            <div>
              <Label htmlFor="edit_ifsc_code" className="text-sm sm:text-base">IFSC Code</Label>
              <Input id="edit_ifsc_code" name="ifsc_code" defaultValue={selectedAccount?.ifsc_code} required className="h-9 sm:h-10 text-sm" />
            </div>
            <div>
              <Label htmlFor="edit_branch_name" className="text-sm sm:text-base">Branch Name</Label>
              <Input id="edit_branch_name" name="branch_name" defaultValue={selectedAccount?.branch_name} required className="h-9 sm:h-10 text-sm" />
            </div>
            <div>
              <Label htmlFor="edit_account_type" className="text-sm sm:text-base">Account Type</Label>
              <Select onValueChange={setNewAccountType} value={newAccountType} required>
                <SelectTrigger className="h-9 sm:h-10 text-sm">
                  <SelectValue placeholder="Select an account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Savings Account">Savings Account</SelectItem>
                  <SelectItem value="Recurring Deposit Account">Recurring Deposit Account</SelectItem>
                  <SelectItem value="Current Account">Current Account</SelectItem>
                  <SelectItem value="Fixed Deposit Account">Fixed Deposit Account</SelectItem>
                  <SelectItem value="NRI Account">NRI Account</SelectItem>
                  <SelectItem value="DEMAT Account">DEMAT Account</SelectItem>
                  <SelectItem value="Senior Citizens' Account">Senior Citizens' Account</SelectItem>
                  <SelectItem value="Salary Account">Salary Account</SelectItem>
                  <SelectItem value="Credit Cash">Credit Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost" className="h-9 sm:h-10 text-sm sm:text-base" disabled={isSubmitting}>Cancel</Button></DialogClose>
              <Button type="submit" className="h-9 sm:h-10 text-sm sm:text-base" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Are you sure?</DialogTitle>
            <DialogDescription className="text-sm">
              This action cannot be undone. This will permanently delete the bank account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} className="h-9 sm:h-10 text-sm sm:text-base" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} className="h-9 sm:h-10 text-sm sm:text-base" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      <Dialog open={showToggleActiveDialog} onOpenChange={setShowToggleActiveDialog}>
        <DialogContent className="w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Are you sure?</DialogTitle>
            <DialogDescription className="text-sm">
              You are about to {selectedAccount?.is_active ? 'deactivate' : 'activate'} this bank account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowToggleActiveDialog(false)} className="h-9 sm:h-10 text-sm sm:text-base" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleToggleActive} className="h-9 sm:h-10 text-sm sm:text-base" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isSubmitting ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganisationBank;
