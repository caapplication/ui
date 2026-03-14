import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getAdminModules, updateAdminModule, getAdminInvoices, markInvoicePaid, generateMonthlyInvoices } from '@/lib/api/admin';
import { Loader2, Receipt, Package, DollarSign, Calendar, Edit2, PlayCircle, CheckCircle, Component } from 'lucide-react';
import PlanManagementTab from '@/components/super-admin/PlanManagementTab.jsx';

const SuperAdminBilling = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('invoices');
  
  // Modules State
  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [moduleActionLoading, setModuleActionLoading] = useState(false);

  // Invoices State
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [generatingInvoices, setGeneratingInvoices] = useState(false);
  const [invoiceToMarkPaid, setInvoiceToMarkPaid] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('offline_bank');
  const [markPaidLoading, setMarkPaidLoading] = useState(false);

  const fetchModules = async () => {
    try {
      setModulesLoading(true);
      const data = await getAdminModules(user.access_token);
      setModules(data);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load modules', variant: 'destructive' });
    } finally {
      setModulesLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const data = await getAdminInvoices({ limit: 50 }, user.access_token);
      setInvoices(data.invoices || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load invoices', variant: 'destructive' });
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    if (user?.access_token) {
      if (activeTab === 'modules') fetchModules();
      if (activeTab === 'invoices') fetchInvoices();
    }
  }, [user, activeTab]);

  const handleUpdateModule = async (e) => {
    e.preventDefault();
    try {
      setModuleActionLoading(true);
      await updateAdminModule(editingModule.id, {
        name: editingModule.name,
        description: editingModule.description,
        monthly_price_inr: parseFloat(editingModule.monthly_price_inr),
        is_active: editingModule.is_active
      }, user.access_token);
      toast({ title: 'Success', description: 'Module updated correctly.' });
      setEditingModule(null);
      fetchModules();
    } catch (err) {
      toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
    } finally {
      setModuleActionLoading(false);
    }
  };

  const handleGenerateInvoices = async () => {
    try {
      setGeneratingInvoices(true);
      const res = await generateMonthlyInvoices(null, user.access_token);
      toast({ 
        title: 'Invoices Generated', 
        description: `Generated ${res.generated_count} invoices. Skipped ${res.skipped_count}.` 
      });
      fetchInvoices();
    } catch (err) {
      toast({ title: 'Generation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingInvoices(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!invoiceToMarkPaid) return;
    try {
      setMarkPaidLoading(true);
      await markInvoicePaid(invoiceToMarkPaid.id, paymentMethod, user.access_token);
      toast({ title: 'Invoice Paid', description: `Invoice ${invoiceToMarkPaid.invoice_number} marked as paid successfully.` });
      setInvoiceToMarkPaid(null);
      fetchInvoices();
    } catch (err) {
      toast({ title: 'Action Failed', description: err.message, variant: 'destructive' });
    } finally {
      setMarkPaidLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Billing & Modules</h1>
        <p className="text-gray-400 text-sm">Manage global module pricing and agency invoices.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Package className="w-4 h-4" /> App Modules
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Component className="w-4 h-4" /> Bundled Plans
          </TabsTrigger>
        </TabsList>

        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Platform Invoices</h2>
            <Button 
              onClick={handleGenerateInvoices} 
              disabled={generatingInvoices}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {generatingInvoices ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
              Generate Last Month's Invoices
            </Button>
          </div>

          <Card className="glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Agency</TableHead>
                    <TableHead>Billing Month</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500 italic">No invoices found.</TableCell></TableRow>
                  ) : invoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs text-white">{inv.invoice_number}</TableCell>
                      <TableCell className="text-sm font-medium text-blue-400">{inv.agency_name}</TableCell>
                      <TableCell className="text-sm text-gray-300">
                        {inv.billing_month ? new Date(inv.billing_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-white">₹{inv.total_amount}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === 'paid' ? "outline" : "destructive"} className={inv.status === 'paid' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"}>
                          {inv.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {inv.status !== 'paid' && (
                          <Dialog open={invoiceToMarkPaid?.id === inv.id} onOpenChange={(open) => !open && setInvoiceToMarkPaid(null)}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => setInvoiceToMarkPaid(inv)}>
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Paid
                              </Button>
                            </DialogTrigger>
                            {invoiceToMarkPaid?.id === inv.id && (
                              <DialogContent className="glass-effect border-white/10 text-white">
                                <DialogHeader>
                                  <DialogTitle>Mark Invoice as Paid</DialogTitle>
                                  <DialogDescription className="text-gray-400">
                                    Confirm that offline payment has been received for <b>{inv.invoice_number}</b> ({inv.agency_name}).
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <p className="text-2xl font-bold text-center text-white pb-2">₹{inv.total_amount}</p>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Payment Method</label>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                        <SelectValue placeholder="Select method" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-gray-900 border-white/10 text-white">
                                        <SelectItem value="offline_bank">Bank Transfer (Offline)</SelectItem>
                                        <SelectItem value="offline_cash">Cash (Offline)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="ghost" onClick={() => setInvoiceToMarkPaid(null)}>Cancel</Button>
                                  <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleMarkPaid} disabled={markPaidLoading}>
                                    {markPaidLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirm Payment Received
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            )}
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MODULES TAB */}
        <TabsContent value="modules" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg text-white">Global Module Pricing</CardTitle>
              <CardDescription className="text-gray-400">View and edit the baseline pricing for all platform modules.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Monthly Price (₹)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modulesLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : modules.map(mod => (
                    <TableRow key={mod.id}>
                      <TableCell className="font-semibold text-white">{mod.name}</TableCell>
                      <TableCell className="text-sm text-gray-400 max-w-[200px] truncate" title={mod.description}>{mod.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-white/5 text-gray-300 border-white/10 text-[10px] uppercase">
                          {mod.is_default_free ? 'Free Core' : 'Paid Add-on'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-blue-400 font-medium">₹{mod.monthly_price_inr}</TableCell>
                      <TableCell>
                        <Badge className={mod.is_active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}>
                          {mod.is_active ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog open={editingModule?.id === mod.id} onOpenChange={(open) => !open && setEditingModule(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingModule({...mod})} className="text-gray-400 hover:text-white hover:bg-white/10">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          {editingModule?.id === mod.id && (
                            <DialogContent className="glass-effect border-white/10 text-white">
                              <DialogHeader>
                                <DialogTitle>Edit Module: {mod.name}</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleUpdateModule} className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Name</label>
                                  <Input value={editingModule.name} onChange={e => setEditingModule({...editingModule, name: e.target.value})} className="bg-white/5 border-white/10" required />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Description</label>
                                  <Input value={editingModule.description} onChange={e => setEditingModule({...editingModule, description: e.target.value})} className="bg-white/5 border-white/10" required />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium flex items-center gap-1"><DollarSign className="w-3.5 h-3.5"/> Monthly Price (INR)</label>
                                  <Input type="number" step="0.01" value={editingModule.monthly_price_inr} onChange={e => setEditingModule({...editingModule, monthly_price_inr: e.target.value})} className="bg-white/5 border-white/10 font-mono" required disabled={mod.is_default_free} />
                                </div>
                                <DialogFooter>
                                  <Button type="button" variant="ghost" onClick={() => setEditingModule(null)}>Cancel</Button>
                                  <Button type="submit" disabled={moduleActionLoading} className="bg-primary text-white">
                                    {moduleActionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Changes
                                  </Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          )}
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        {/* PLANS TAB */}
        <TabsContent value="plans" className="space-y-4">
          <PlanManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminBilling;
