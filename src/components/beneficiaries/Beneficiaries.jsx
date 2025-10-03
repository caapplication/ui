import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Search, Loader2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { 
  getBeneficiaries, 
  addBeneficiary, 
  deleteBeneficiary,
  addBankAccount,
  deleteBankAccount,
  getBankAccountsForBeneficiary
} from '@/lib/api';
import { useOrganisation } from '@/hooks/useOrganisation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ITEMS_PER_PAGE = 10;

const BeneficiaryForm = ({ onAdd, onCancel, organisationId, isMutating }) => {
  const [beneficiaryType, setBeneficiaryType] = useState('individual');

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    onAdd({ ...data, beneficiary_type: beneficiaryType, organisation_id: organisationId });
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
        <DialogClose asChild><Button variant="ghost" type="button" onClick={onCancel} disabled={isMutating}>Cancel</Button></DialogClose>
        <Button type="submit" disabled={isMutating}>
          {isMutating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Save Beneficiary
        </Button>
      </DialogFooter>
    </form>
  );
};

const Beneficiaries = ({ quickAction, clearQuickAction }) => {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [beneficiaryToDelete, setBeneficiaryToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('individual');
  const { toast } = useToast();
  const { user } = useAuth();
  const { organisationId } = useOrganisation();

  const fetchBeneficiaries = useCallback(async () => {
    if (!user?.access_token || !organisationId) return;

    setIsLoading(true);
    try {
      const response = await getBeneficiaries(organisationId, user.access_token);
      if (response && Array.isArray(response.beneficiaries)) {
        setBeneficiaries(response.beneficiaries);
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
  }, [organisationId, user, toast]);

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

  const totalPages = Math.ceil(filteredBeneficiaries.length / ITEMS_PER_PAGE);
  const paginatedBeneficiaries = filteredBeneficiaries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleAdd = async (beneficiaryData) => {
    setIsMutating(true);
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
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!organisationId || !beneficiaryToDelete) return;
    setIsMutating(true);
    try {
      await deleteBeneficiary(beneficiaryToDelete, organisationId, user.access_token);
      toast({ title: 'Success', description: 'Beneficiary deleted successfully.' });
      fetchBeneficiaries();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete beneficiary: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setBeneficiaryToDelete(null);
      setIsMutating(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

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
            <Button onClick={() => setShowAddDialog(true)} disabled={!organisationId}>
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
            <TabsList>
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
                      {paginatedBeneficiaries.map((b) => (
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setBeneficiaryToDelete(b.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the beneficiary.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setBeneficiaryToDelete(null)} disabled={isMutating}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDelete} disabled={isMutating}>
                                    {isMutating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                   {paginatedBeneficiaries.length === 0 && <p className="text-center text-gray-400 py-8">No beneficiaries found.</p>}
                </CardContent>
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
                      {paginatedBeneficiaries.map((b) => (
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setBeneficiaryToDelete(b.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the beneficiary.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setBeneficiaryToDelete(null)} disabled={isMutating}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDelete} disabled={isMutating}>
                                    {isMutating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {paginatedBeneficiaries.length === 0 && <p className="text-center text-gray-400 py-8">No beneficiaries found.</p>}
                </CardContent>
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
          <BeneficiaryForm onAdd={handleAdd} onCancel={() => setShowAddDialog(false)} organisationId={organisationId} isMutating={isMutating} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Beneficiaries;
