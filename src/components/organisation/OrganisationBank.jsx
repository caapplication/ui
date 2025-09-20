import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Loader2, RefreshCw, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from '@/hooks/useAuth.jsx';
import { getOrganisationBankAccounts, addOrganisationBankAccount, updateOrganisationBankAccount, deleteOrganisationBankAccount } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const OrganisationBank = ({ entityId, entityName, quickAction, clearQuickAction }) => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [newAccountType, setNewAccountType] = useState("");
  const [visibleAccounts, setVisibleAccounts] = useState({});
  const [activeTab, setActiveTab] = useState("active");
  const { user } = useAuth();
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
  }, [fetchBankAccounts]);

  useEffect(() => {
    if (quickAction === 'add-organisation-bank') {
      setShowAddDialog(true);
      clearQuickAction();
    }
  }, [quickAction, clearQuickAction]);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!entityId) return;
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
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;
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
    }
  };

  const toggleMask = (accountId) => {
    setVisibleAccounts(prev => ({ ...prev, [accountId]: !prev[accountId] }));
  };

  const handleToggleActive = async (account) => {
    try {
      await updateOrganisationBankAccount(account.id, { is_active: !account.is_active }, user.access_token);
      toast({ title: "Success", description: "Bank account status updated successfully." });
      fetchBankAccounts();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update bank account status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-5xl font-bold text-white">Organisation Bank Accounts</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchBankAccounts} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-5 h-5 mr-2" /> Add Bank Account
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active Bank Details</TabsTrigger>
            <TabsTrigger value="inactive">Inactive Bank Details</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Active Bank Accounts for {entityName}</CardTitle>
                <CardDescription>Manage active bank accounts associated with this entity.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Bank Name</TableHead>
                        <TableHead>Account Number</TableHead>
                        <TableHead>IFSC Code</TableHead>
                        <TableHead>Branch Name</TableHead>
                        <TableHead>Account Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankAccounts && bankAccounts.filter(acc => acc.is_active).length > 0 ? (
                        bankAccounts.filter(acc => acc.is_active).map((account) => (
                          <TableRow key={account.id}>
                            <TableCell>{account.bank_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>
                                  {visibleAccounts[account.id] ? account.account_number : `************${String(account.account_number).slice(-4)}`}
                                </span>
                                <Button variant="ghost" size="icon" onClick={() => toggleMask(account.id)}>
                                  {visibleAccounts[account.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{account.ifsc_code}</TableCell>
                            <TableCell>{account.branch_name}</TableCell>
                            <TableCell>{account.account_type}</TableCell>
                            <TableCell className="text-right">
                              <Button size="icon" variant="ghost" onClick={() => handleToggleActive(account)}>
                                {account.is_active ? <ToggleRight className="w-6 h-6 text-green-400" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan="5" className="text-center text-gray-400 py-8">
                            No active bank accounts found for this organisation.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="inactive">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Inactive Bank Accounts for {entityName}</CardTitle>
                <CardDescription>Manage inactive bank accounts associated with this entity.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Bank Name</TableHead>
                        <TableHead>Account Number</TableHead>
                        <TableHead>IFSC Code</TableHead>
                        <TableHead>Branch Name</TableHead>
                        <TableHead>Account Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankAccounts && bankAccounts.filter(acc => !acc.is_active).length > 0 ? (
                        bankAccounts.filter(acc => !acc.is_active).map((account) => (
                          <TableRow key={account.id}>
                            <TableCell>{account.bank_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>
                                  {visibleAccounts[account.id] ? account.account_number : `************${String(account.account_number).slice(-4)}`}
                                </span>
                                <Button variant="ghost" size="icon" onClick={() => toggleMask(account.id)}>
                                  {visibleAccounts[account.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{account.ifsc_code}</TableCell>
                            <TableCell>{account.branch_name}</TableCell>
                            <TableCell>{account.account_type}</TableCell>
                            <TableCell className="text-right">
                              <Button size="icon" variant="ghost" onClick={() => handleToggleActive(account)}>
                                {account.is_active ? <ToggleRight className="w-6 h-6 text-green-400" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                              </Button>
                              {!account.is_active && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedAccount(account);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan="5" className="text-center text-gray-400 py-8">
                            No inactive bank accounts found for this organisation.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Bank Account</DialogTitle>
            <DialogDescription>Entity: <span className="font-semibold text-sky-400">{entityName}</span></DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAccount} className="space-y-4 pt-4">
            <div>
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input id="bank_name" name="bank_name" required />
            </div>
            <div>
              <Label htmlFor="account_number">Account Number</Label>
              <Input id="account_number" name="account_number" required />
            </div>
            <div>
              <Label htmlFor="ifsc_code">IFSC Code</Label>
              <Input id="ifsc_code" name="ifsc_code" required />
            </div>
            <div>
              <Label htmlFor="branch_name">Branch Name</Label>
              <Input id="branch_name" name="branch_name" required />
            </div>
            <div>
              <Label htmlFor="account_type">Account Type</Label>
              <Select onValueChange={setNewAccountType} value={newAccountType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select an account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Savings Account">Savings Account</SelectItem>
                  <SelectItem value="Recurring Deposit Account">Recurring Deposit Account</SelectItem>
                  <SelectItem value="Current Account">Current Account</SelectItem>
                  <SelectItem value="Fixed Deposit Account">Fixed Deposit Account</SelectItem>
                  <SelectItem value="NRI Account">NRI Account</SelectItem>
                  <SelectItem value="DEMAT Account">DEMAT Account</SelectItem>
                  <SelectItem value="Senior Citizens’ Account">Senior Citizens’ Account</SelectItem>
                  <SelectItem value="Salary Account">Salary Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
              <Button type="submit"><Plus className="w-4 h-4 mr-2" />Add Account</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the bank account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganisationBank;
