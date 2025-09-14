import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from '@/hooks/useAuth.jsx';
import { getOrganisationBankAccounts, addOrganisationBankAccount, deleteOrganisationBankAccount } from '@/lib/api';

const OrganisationBank = ({ entityId, entityName, quickAction, clearQuickAction }) => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
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
    const finalData = { ...data, entity_id: entityId };

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

  const handleDelete = async (accountId) => {
    try {
      await deleteOrganisationBankAccount(accountId, user.access_token);
      toast({ title: "Success", description: "Bank account deleted successfully." });
      fetchBankAccounts();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete bank account: ${error.message}`,
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

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Bank Accounts for {entityName}</CardTitle>
            <CardDescription>Manage bank accounts associated with this entity.</CardDescription>
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankAccounts && bankAccounts.length > 0 ? (
                    bankAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>{account.bank_name}</TableCell>
                        <TableCell>...{String(account.account_number).slice(-4)}</TableCell>
                        <TableCell>{account.ifsc_code}</TableCell>
                        <TableCell>{account.branch_name}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDelete(account.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan="5" className="text-center text-gray-400 py-8">
                        No bank accounts found for this organisation.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
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
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
              <Button type="submit"><Plus className="w-4 h-4 mr-2" />Add Account</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganisationBank;