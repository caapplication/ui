import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getAgencyBillingDetails, getAdminModules, toggleAgencyModule, getAgencySubscriptions, getAdminPlans, assignPlanToAgency, listAgencyEntities } from '@/lib/api/admin';
import { Loader2, PackageX, PackageCheck, Power, Component, ShieldCheck, Zap, Users, FileText, CheckCircle2, ChevronRight, Search, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AgencySubscriptionsTab = ({ agencyId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [billingDetails, setBillingDetails] = useState(null);
  const [modules, setModules] = useState([]);
  const [plans, setPlans] = useState([]);
  const [agencyLevelSubs, setAgencyLevelSubs] = useState([]);
  const [entities, setEntities] = useState([]);
  
  const [toggleLoading, setToggleLoading] = useState(false);
  
  // Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    plan_id: '',
    custom_price: '',
    is_free: false
  });

  // Grant Modal State (New)
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [grantData, setGrantData] = useState({
    module: null,
    entity_id: 'agency', // 'agency' or UUID
    custom_price: '',
    is_free: false
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billingRes, modulesRes, subsRes, plansRes, entitiesRes] = await Promise.all([
        getAgencyBillingDetails(agencyId, user.access_token),
        getAdminModules(user.access_token),
        getAgencySubscriptions(agencyId, user.access_token),
        getAdminPlans(user.access_token),
        listAgencyEntities(agencyId, user.access_token)
      ]);
      setBillingDetails(billingRes);
      setModules(modulesRes);
      setAgencyLevelSubs(subsRes.filter(s => s.status === 'active'));
      setPlans(plansRes);
      setEntities(entitiesRes || []);
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

  const handleGrantModule = (module) => {
    setGrantData({
      module,
      entity_id: module.module_type === 'CA' ? 'agency' : '',
      custom_price: '',
      is_free: false
    });
    setIsGrantModalOpen(true);
  };

  const submitGrant = async (e) => {
    e.preventDefault();
    if (!grantData.module) return;
    if (grantData.module.module_type === 'CLIENT' && !grantData.entity_id) {
       toast({ title: 'Input Required', description: 'Please select a client.', variant: 'destructive' });
       return;
    }

    try {
      setToggleLoading(true);
      const params = { 
        module_id: grantData.module.id,
        entity_id: grantData.entity_id === 'agency' ? undefined : grantData.entity_id,
        custom_price: grantData.custom_price || undefined,
        is_free: grantData.is_free
      };

      const res = await toggleAgencyModule(agencyId, params, user.access_token);
      toast({ title: 'Access Granted', description: res.message });
      setIsGrantModalOpen(false);
      fetchData();
    } catch (err) {
      toast({ title: 'Grant Failed', description: err.message, variant: 'destructive' });
    } finally {
      setToggleLoading(false);
    }
  };

  const handleRevoke = async (sub) => {
    try {
      setToggleLoading(true);
      const params = { 
        module_id: sub.module_id,
        entity_id: sub.entity_id
      };
      const res = await toggleAgencyModule(agencyId, params, user.access_token);
      toast({ title: 'Access Revoked', description: res.message });
      fetchData();
    } catch (err) {
      toast({ title: 'Revoke Failed', description: err.message, variant: 'destructive' });
    } finally {
      setToggleLoading(false);
    }
  };

  const handleAssignPlan = async (e) => {
    e.preventDefault();
    if (!assignmentData.plan_id) return;
    try {
      setToggleLoading(true);
      const res = await assignPlanToAgency(agencyId, {
        plan_id: assignmentData.plan_id,
        custom_price: assignmentData.custom_price || undefined,
        is_free: assignmentData.is_free
      }, user.access_token);
      toast({ title: 'Plan Assigned', description: res.message });
      setIsAssignModalOpen(false);
      fetchData();
    } catch (err) {
      toast({ title: 'Assignment Failed', description: err.message, variant: 'destructive' });
    } finally {
      setToggleLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card h-64 flex items-center justify-center border-white/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (!billingDetails) return null;

  const agencyModules = modules.filter(m => m.module_type === 'CA');
  const clientModules = modules.filter(m => m.module_type === 'CLIENT');
  const activePlanIds = billingDetails.plan_costs.map(p => p.id);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card md:col-span-2 border-white/5">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-white font-bold">Billing Architecture</CardTitle>
              <CardDescription className="text-gray-400">Manage plans and view projected costs.</CardDescription>
            </div>
            <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/80 text-white gap-2 h-9 px-4 rounded-xl shadow-lg shadow-primary/20">
                  <Zap className="w-4 h-4" /> Assign New Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-effect border-white/10 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl">Assign Plan to Agency</DialogTitle>
                  <DialogDescription className="text-gray-400">Activate a bundled plan for this CA agency.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAssignPlan} className="space-y-5 py-2">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-300">Select Available Plan</label>
                    <div className="grid grid-cols-1 gap-2.5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                      {plans.filter(p => p.plan_type === 'CA').map(p => {
                        const isActive = activePlanIds.includes(p.id);
                        return (
                          <div 
                            key={p.id}
                            className={`group p-4 rounded-2xl border transition-all relative overflow-hidden ${
                              isActive ? 'border-green-500/50 bg-green-500/5 cursor-default' : 
                              assignmentData.plan_id === p.id ? 'bg-primary/20 border-primary/50 shadow-inner' : 
                              'bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer'
                            }`}
                            onClick={() => !isActive && setAssignmentData({...assignmentData, plan_id: p.id})}
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-white">{p.name}</span>
                                  {isActive && <Badge className="bg-green-500/20 text-green-400 border-green-500/20 text-[10px] py-0 h-4">ACTIVE</Badge>}
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-tight font-medium">
                                  {p.modules.length} Modules Included
                                </div>
                              </div>
                              <span className="font-mono text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">
                                ₹{p.monthly_price_inr}/mo
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                               {p.modules.slice(0, 3).map(m => (
                                 <span key={m.id} className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md text-gray-400 whitespace-nowrap">{m.name}</span>
                               ))}
                               {p.modules.length > 3 && <span className="text-[9px] text-gray-500">+{p.modules.length - 3} more</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] uppercase tracking-wide font-bold text-gray-500">Custom Price Override</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                        <Input 
                          type="number" 
                          placeholder="Default"
                          value={assignmentData.custom_price}
                          onChange={e => setAssignmentData({...assignmentData, custom_price: e.target.value})}
                          className="bg-white/5 border-white/10 pl-7 h-10 rounded-xl focus:ring-primary/40"
                        />
                      </div>
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center gap-3 px-4 h-10 bg-white/5 border border-white/10 rounded-xl w-full group hover:border-white/20 transition-colors">
                        <Checkbox 
                          id="is_free_plan" 
                          checked={assignmentData.is_free} 
                          onCheckedChange={v => setAssignmentData({...assignmentData, is_free: v})}
                          className="border-white/20 data-[state=checked]:bg-primary"
                        />
                        <label htmlFor="is_free_plan" className="text-xs font-medium cursor-pointer text-gray-300 group-hover:text-white">Grant for Free</label>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="pt-4 border-t border-white/5">
                    <Button type="button" variant="ghost" onClick={() => setIsAssignModalOpen(false)} className="text-gray-400 hover:text-white">Cancel</Button>
                    <Button type="submit" disabled={!assignmentData.plan_id || toggleLoading} className="bg-primary text-white px-8 rounded-xl">
                      {toggleLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirm Assignment
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="flex items-center justify-between h-[120px] bg-gradient-to-br from-primary/5 to-transparent rounded-b-2xl">
             <div className="flex items-baseline gap-3">
               <div className="text-6xl font-black text-white tracking-tighter">₹{billingDetails.total_addon_fee}</div>
               <div className="text-gray-500 text-lg font-medium">/ month</div>
             </div>
             <div className="text-right space-y-1.5 bg-white/5 p-4 rounded-2xl border border-white/5">
               <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black pb-1 border-b border-white/5 mb-2">Cost Breakdown</div>
               <div className="text-xs text-white flex items-center gap-2 justify-end font-medium">
                 <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Agency Core: <span className="text-blue-400">₹{billingDetails.total_plan_fee || 0}</span>
               </div>
               <div className="text-xs text-white flex items-center gap-2 justify-end font-medium">
                 <Users className="w-3.5 h-3.5 text-green-400" /> Per-Client Extras: <span className="text-green-400">₹{billingDetails.client_breakdown.reduce((a,b)=>a+b.total,0)}</span>
               </div>
             </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-white/5 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white font-bold">Platform Stats</CardTitle>
            <CardDescription className="text-gray-400">Usage across active modules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {billingDetails.module_breakdown.length > 0 ? (
              billingDetails.module_breakdown.map((mb, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
                    <span className="text-[11px] font-medium text-gray-300">{mb.name}</span>
                  </div>
                  <Badge variant="outline" className="border-primary/20 h-5 px-2 bg-primary/10 font-mono text-primary text-[10px]">{mb.count}</Badge>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-gray-600">
                <PackageX className="w-8 h-8 mb-2 opacity-20" />
                <span className="text-[10px]">No active modules</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* NEW SECTION: Module categorization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-white/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                   <Component className="w-5 h-5 text-blue-400" /> Core Infrastructure
                </CardTitle>
                <CardDescription className="text-gray-400 text-xs text-balance">Essential agency-wide tools enabling master control for the CA team.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-3 pb-6">
            {agencyModules.map(m => {
               const isActive = agencyLevelSubs.some(s => s.module_id === m.id && s.entity_id === null);
               const sub = agencyLevelSubs.find(s => s.module_id === m.id && s.entity_id === null);
               
               return (
                 <div key={m.id} className="group flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all">
                   <div className="flex-grow">
                     <div className="flex items-center gap-2">
                       <h4 className="text-white font-bold text-sm tracking-tight">{m.name}</h4>
                       {m.is_default_free && <Badge className="text-[8px] bg-green-500/10 text-green-400 border-green-400/20">Core</Badge>}
                       {sub?.plan_id && <Badge className="text-[8px] bg-blue-500/10 text-blue-400 border-blue-500/20">Add-on</Badge>}
                     </div>
                     <p className="text-[10px] text-gray-500 mt-1 max-w-[220px] leading-relaxed line-clamp-2">{m.description}</p>
                     
                     {isActive && (
                       <div className="mt-2 flex gap-3">
                         {sub?.custom_price_inr !== null && sub?.custom_price_inr !== undefined && (
                            <span className="text-[9px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded italic border border-amber-500/20">₹{sub.custom_price_inr} Custom</span>
                         )}
                         {sub?.is_free_override && (
                            <span className="text-[9px] text-green-500 font-bold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 uppercase tracking-tighter">Complimentary</span>
                         )}
                       </div>
                     )}
                   </div>
                   <div className="flex items-center gap-4 pl-4 border-l border-white/5">
                     <div className="text-right">
                        <div className="text-[10px] font-black font-mono text-gray-500">₹{m.monthly_price_inr}</div>
                        <div className="text-[8px] uppercase text-gray-600 font-bold">per month</div>
                     </div>
                     <Button 
                       variant={isActive ? "destructive" : "default"}
                       size="sm"
                       className={`h-9 px-4 rounded-xl font-bold transition-all ${isActive ? "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20" : "bg-primary shadow-lg shadow-primary/20 text-white"}`}
                       disabled={toggleLoading}
                       onClick={() => isActive ? handleRevoke(sub) : handleGrantModule(m)}
                     >
                       {isActive ? "Revoke" : "Activate"}
                     </Button>
                   </div>
                 </div>
               )
            })}
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5">
          <CardHeader>
            <div className="space-y-1">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                 <Zap className="w-5 h-5 text-amber-400" /> Service Add-ons
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs text-balance">Client-facing features that can be allocated to individual accounts.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-3 pb-6">
            {clientModules.map(m => {
               // A client module is "active at agency level" if there's a sub with entity_id null
               const isAgencyActive = agencyLevelSubs.some(s => s.module_id === m.id && s.entity_id === null);
               const sub = agencyLevelSubs.find(s => s.module_id === m.id && s.entity_id === null);

               return (
                 <div key={m.id} className="group flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all relative overflow-hidden">
                   {isAgencyActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500/40" />}
                   <div className="flex-grow">
                     <div className="flex items-center gap-2">
                       <h4 className="text-white font-bold text-sm tracking-tight">{m.name}</h4>
                       {isAgencyActive && <Badge className="text-[8px] bg-amber-500/10 text-amber-400 border-amber-400/20 uppercase">Global Add-on</Badge>}
                     </div>
                     <p className="text-[10px] text-gray-500 mt-1 max-w-[220px] leading-relaxed line-clamp-2">{m.description}</p>
                   </div>
                   <div className="flex items-center gap-4 pl-4 border-l border-white/5">
                     <div className="text-right">
                        <div className="text-[10px] font-black font-mono text-gray-500">₹{m.monthly_price_inr}</div>
                        <div className="text-[8px] uppercase text-gray-600 font-bold">per unit</div>
                     </div>
                     <div className="flex flex-col gap-1.5">
                       <Button 
                         variant="default"
                         size="sm"
                         className="h-8 px-4 rounded-lg font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 text-[10px]"
                         disabled={toggleLoading}
                         onClick={() => handleGrantModule(m)}
                       >
                         {isAgencyActive ? "Add More" : "Grant Access"}
                       </Button>
                       {isAgencyActive && (
                         <Button
                           variant="ghost"
                           size="sm"
                           className="h-6 text-[9px] text-red-500/70 hover:text-red-500 hover:bg-red-500/5 transition-colors"
                           onClick={() => handleRevoke(sub)}
                         >
                           Revoke Global
                         </Button>
                       )}
                     </div>
                   </div>
                 </div>
               )
            })}
          </CardContent>
        </Card>
      </div>

        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
               <FileText className="w-5 h-5 text-green-500" /> Recent Billing Records
            </CardTitle>
            <CardDescription className="text-gray-400">Audit trail of generated invoices.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 border-t border-white/5">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10 px-4">Invoice</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10">Month</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10">Total</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingDetails.invoice_history.map(inv => (
                  <TableRow key={inv.id} className="h-12 border-white/5 hover:bg-white/5">
                    <TableCell className="font-mono text-xs text-white px-4">{inv.invoice_number}</TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {inv.billing_month ? new Date(inv.billing_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-'}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-white">₹{inv.total_amount}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`h-5 text-[9px] px-1.5 ${inv.status === 'paid' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"}`}>
                        {inv.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      <Card className="glass-card border-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white text-lg">Active Clients Coverage</CardTitle>
            <CardDescription className="text-gray-400">Summary of modules currently subscribed per client.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 border-t border-white/5">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6">Client Name</TableHead>
                <TableHead>Subscribed Modules</TableHead>
                <TableHead>Current Cost</TableHead>
                <TableHead className="text-right pr-6">Management</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingDetails.client_breakdown.map(client => (
                <TableRow key={client.entity_id} className="border-white/5">
                  <TableCell className="px-6 font-semibold text-white">{client.client_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {client.modules.map((m, i) => <Badge key={i} variant="outline" className="text-[10px] text-gray-400 border-white/10 bg-white/5">{m}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-blue-400 text-sm font-bold">₹{client.total}</TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" className="h-8 text-white hover:bg-white/10" onClick={() => navigate(`/agencies/${agencyId}?tab=clients_tab`)}>
                       Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isGrantModalOpen} onOpenChange={setIsGrantModalOpen}>
        <DialogContent className="glass-effect border-white/10 text-white max-w-md">
           <DialogHeader>
             <DialogTitle>Grant Module Access</DialogTitle>
             <DialogDescription>
               Configure access for {grantData.module?.name}
             </DialogDescription>
           </DialogHeader>
           <form onSubmit={submitGrant} className="space-y-4 py-2">
             {grantData.module?.module_type === 'CLIENT' ? (
               <div className="space-y-2">
                 <label className="text-sm font-medium">Select Target Client</label>
                 <Select 
                    value={grantData.entity_id} 
                    onValueChange={(v) => setGrantData({...grantData, entity_id: v})}
                 >
                   <SelectTrigger className="bg-white/5 border-white/10">
                     <SelectValue placeholder="Select a client account" />
                   </SelectTrigger>
                   <SelectContent className="glass-effect border-white/10 text-white">
                     {entities.map(e => (
                       <SelectItem key={e.id} value={e.id} className="hover:bg-white/10">{e.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                 <p className="text-[10px] text-gray-500">This module will be activated specifically for this client.</p>
               </div>
             ) : (
               <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-400 flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4" /> This is an agency-wide infrastructure module.
               </div>
             )}

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Custom Price (₹)</label>
                  <Input 
                    type="number"
                    placeholder={`Default: ₹${grantData.module?.monthly_price_inr}`}
                    value={grantData.custom_price}
                    onChange={(e) => setGrantData({...grantData, custom_price: e.target.value})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="flex items-end">
                   <div className="flex items-center gap-2 px-3 h-10 bg-white/5 border border-white/10 rounded-lg w-full">
                      <Checkbox 
                        id="is_free_grant" 
                        checked={grantData.is_free} 
                        onCheckedChange={(v) => setGrantData({...grantData, is_free: v})}
                      />
                      <label htmlFor="is_free_grant" className="text-xs cursor-pointer">Free access</label>
                   </div>
                </div>
             </div>

             <DialogFooter className="pt-4 border-t border-white/5 gap-2">
               <Button type="button" variant="ghost" onClick={() => setIsGrantModalOpen(false)}>Cancel</Button>
               <Button 
                type="submit" 
                className="bg-primary text-white" 
                disabled={toggleLoading || (grantData.module?.module_type === 'CLIENT' && !grantData.entity_id)}
               >
                 {toggleLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Grant Access
               </Button>
             </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgencySubscriptionsTab;
