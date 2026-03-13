import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getAgencyBillingDetails, getAdminModules, toggleAgencyModule, getAgencySubscriptions } from '@/lib/api/admin';
import { Loader2, PackageX, PackageCheck, Power } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';

const AgencySubscriptionsTab = ({ agencyId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [billingDetails, setBillingDetails] = useState(null);
  const [modules, setModules] = useState([]);
  const [agencyLevelSubs, setAgencyLevelSubs] = useState([]);
  
  const [toggleLoading, setToggleLoading] = useState(false);
  const [actionModule, setActionModule] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billingRes, modulesRes, subsRes] = await Promise.all([
        getAgencyBillingDetails(agencyId, user.access_token),
        getAdminModules(user.access_token),
        getAgencySubscriptions(agencyId, user.access_token)
      ]);
      setBillingDetails(billingRes);
      setModules(modulesRes);
      setAgencyLevelSubs(subsRes.filter(s => s.entity_id === null && s.status === 'active'));
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load subscription details.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.access_token && agencyId) {
      fetchData();
    }
  }, [user, agencyId]);

  const handleToggle = async () => {
    if (!actionModule) return;
    try {
      setToggleLoading(true);
      const res = await toggleAgencyModule(agencyId, { module_id: actionModule.moduleId, entity_id: actionModule.entityId }, user.access_token);
      toast({ title: 'Status Updated', description: res.message });
      setActionModule(null);
      fetchData();
    } catch (err) {
      toast({ title: 'Toggle Failed', description: err.message, variant: 'destructive' });
    } finally {
      setToggleLoading(false);
    }
  };

  const handleAgencyToggle = async (moduleId, isActive) => {
    try {
      setToggleLoading(true);
      const res = await toggleAgencyModule(agencyId, { module_id: moduleId }, user.access_token);
      toast({ title: 'Status Updated', description: res.message });
      fetchData();
    } catch (err) {
      toast({ title: 'Toggle Failed', description: err.message, variant: 'destructive' });
    } finally {
      setToggleLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="h-48 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!billingDetails) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">Current Unbilled Estimate</CardTitle>
            <CardDescription className="text-gray-400">Total addon fees for the current month so far.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white mb-2">₹{billingDetails.total_addon_fee}</div>
            <p className="text-sm text-gray-400">Month: {billingDetails.current_month}</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">Active Modules Overview</CardTitle>
            <CardDescription className="text-gray-400">Which modules does this agency use?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {billingDetails.module_breakdown.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No active paid modules.</p>
            ) : (
              billingDetails.module_breakdown.map((mb, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-white font-medium">{mb.name}</span>
                  <div className="text-right">
                    <div className="text-gray-300">{mb.count} Clients</div>
                    <div className="text-blue-400 font-mono">₹{mb.total}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card mb-6">
        <CardHeader>
          <CardTitle className="text-white text-lg">Agency-Level Access</CardTitle>
          <CardDescription className="text-gray-400">Manage base structural modules directly applied to this agency (independent of clients).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {modules.map(m => {
             const isActive = agencyLevelSubs.some(sub => sub.module_id === m.id);
             return (
               <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                 <div>
                   <h4 className="text-white font-medium flex items-center gap-2">
                     {m.name}
                     {m.is_default_free && <Badge variant="outline" className="text-[10px] uppercase text-green-400 border-green-400/30">Free Default</Badge>}
                   </h4>
                   <p className="text-sm text-gray-400">{m.description}</p>
                 </div>
                 <Button 
                   variant={isActive ? "destructive" : "default"}
                   className={isActive ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50" : "bg-primary text-primary-foreground"}
                   disabled={toggleLoading}
                   onClick={() => handleAgencyToggle(m.id, isActive)}
                 >
                   {isActive ? "Turn Off" : "Turn On"}
                 </Button>
               </div>
             )
          })}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white text-lg">Client-wise Access</CardTitle>
          <CardDescription className="text-gray-400">Force-toggle module access for specific clients under this agency.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Modules Acquired</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="text-right">Admin Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingDetails.client_breakdown.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500 italic">No clients have active modules.</TableCell></TableRow>
              ) : (
                billingDetails.client_breakdown.map(client => (
                  <TableRow key={client.entity_id}>
                    <TableCell className="font-medium text-white">{client.client_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {client.modules.map((m, i) => <Badge key={i} variant="outline" className="text-xs text-gray-300 border-white/10 bg-white/5">{m}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-blue-400">₹{client.total}</TableCell>
                    <TableCell className="text-right">
                      <Dialog open={actionModule?.entityId === client.entity_id} onOpenChange={(open) => !open && setActionModule(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={() => setActionModule({entityId: client.entity_id, clientName: client.client_name})}>
                            <Power className="w-3.5 h-3.5 mr-1" /> Revoke Module
                          </Button>
                        </DialogTrigger>
                        {actionModule?.entityId === client.entity_id && (
                          <DialogContent className="glass-effect border-red-500/20">
                            <DialogHeader>
                              <DialogTitle className="text-red-400">Revoke Access from {actionModule.clientName}</DialogTitle>
                              <DialogDescription className="text-gray-400">Select which module to forcefully turn off.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-2">
                              {modules.filter(m => !m.is_default_free).map(m => (
                                <Button 
                                  key={m.id} 
                                  variant="outline" 
                                  className={`w-full justify-start ${actionModule.moduleId === m.id ? 'bg-red-500/20 border-red-500/50 text-white' : 'border-white/10 text-gray-300 hover:text-white hover:bg-white/5'}`}
                                  onClick={() => setActionModule({...actionModule, moduleId: m.id})}
                                >
                                  {m.name}
                                </Button>
                              ))}
                            </div>
                            <DialogFooter>
                              <Button variant="ghost" className="text-gray-400" onClick={() => setActionModule(null)}>Cancel</Button>
                              <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={!actionModule.moduleId || toggleLoading} onClick={handleToggle}>
                                {toggleLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Revoke Now
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        )}
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white text-lg">Billing History</CardTitle>
          <CardDescription className="text-gray-400">Recent invoices for this agency.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Billing Month</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingDetails.invoice_history.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-500 italic">No past invoices available.</TableCell></TableRow>
              ) : (
                billingDetails.invoice_history.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs text-white">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm text-gray-300">
                      {inv.billing_month ? new Date(inv.billing_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-white">₹{inv.total_amount}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={inv.status === 'paid' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"}>
                        {inv.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
};

export default AgencySubscriptionsTab;
