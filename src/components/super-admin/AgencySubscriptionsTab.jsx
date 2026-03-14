import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getAgencyBillingDetails, getAdminModules, toggleAgencyModule, getAgencySubscriptions, getAdminPlans, assignPlanToAgency } from '@/lib/api/admin';
import { Loader2, PackageX, PackageCheck, Power, Component, ShieldCheck, Zap, Users, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const AgencySubscriptionsTab = ({ agencyId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [billingDetails, setBillingDetails] = useState(null);
  const [modules, setModules] = useState([]);
  const [plans, setPlans] = useState([]);
  const [agencyLevelSubs, setAgencyLevelSubs] = useState([]);
  const [activePlanSubs, setActivePlanSubs] = useState([]);
  
  const [toggleLoading, setToggleLoading] = useState(false);
  const [actionModule, setActionModule] = useState(null);
  
  // Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    plan_id: '',
    custom_price: '',
    is_free: false
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billingRes, modulesRes, subsRes, plansRes] = await Promise.all([
        getAgencyBillingDetails(agencyId, user.access_token),
        getAdminModules(user.access_token),
        getAgencySubscriptions(agencyId, user.access_token),
        getAdminPlans(user.access_token)
      ]);
      setBillingDetails(billingRes);
      setModules(modulesRes);
      setAgencyLevelSubs(subsRes.filter(s => s.entity_id === null && s.status === 'active'));
      setPlans(plansRes.filter(p => p.plan_type === 'CA' || p.plan_type === 'CLIENT'));
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

  const handleToggle = async (moduleId, currentSub = null) => {
    try {
      setToggleLoading(true);
      const params = { module_id: moduleId };
      if (currentSub?.custom_price_inr !== undefined) params.custom_price = currentSub.custom_price_inr;
      if (currentSub?.is_free_override !== undefined) params.is_free = currentSub.is_free_override;

      const res = await toggleAgencyModule(agencyId, params, user.access_token);
      toast({ title: 'Status Updated', description: res.message });
      fetchData();
    } catch (err) {
      toast({ title: 'Toggle Failed', description: err.message, variant: 'destructive' });
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
      <Card className="glass-card h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (!billingDetails) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card md:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-white">Current Billing Estimate</CardTitle>
              <CardDescription className="text-gray-400">Projected cost for the current month.</CardDescription>
            </div>
            <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white gap-2 h-8 text-xs">
                  <Zap className="w-3.5 h-3.5" /> Assign Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-effect border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Assign Plan to Agency</DialogTitle>
                  <DialogDescription className="text-gray-400">Select a bundle to activate for this agency.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAssignPlan} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Plan</label>
                    <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {plans.map(p => (
                        <div 
                          key={p.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${assignmentData.plan_id === p.id ? 'bg-primary/20 border-primary/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                          onClick={() => setAssignmentData({...assignmentData, plan_id: p.id})}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm">{p.name}</span>
                            <span className="font-mono text-xs text-blue-400">₹{p.monthly_price_inr}/mo</span>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">{p.modules.map(m => m.name).join(', ')}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Custom Price Override (₹)</label>
                      <Input 
                        type="number" 
                        placeholder="Leave blank for default"
                        value={assignmentData.custom_price}
                        onChange={e => setAssignmentData({...assignmentData, custom_price: e.target.value})}
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-md w-full">
                        <Checkbox 
                          id="is_free_plan" 
                          checked={assignmentData.is_free} 
                          onCheckedChange={v => setAssignmentData({...assignmentData, is_free: v})}
                        />
                        <label htmlFor="is_free_plan" className="text-sm cursor-pointer whitespace-nowrap">Grant for Free</label>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={!assignmentData.plan_id || toggleLoading} className="bg-primary text-white">
                      {toggleLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Assign Now
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="flex items-center justify-between h-[100px]">
             <div className="flex items-baseline gap-2">
               <div className="text-5xl font-bold text-white">₹{billingDetails.total_addon_fee}</div>
               <div className="text-gray-400 text-sm">/ {billingDetails.current_month}</div>
             </div>
             <div className="text-right space-y-1">
               <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Breakdown</div>
               <div className="text-xs text-white bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded flex items-center gap-1 justify-end">
                 <ShieldCheck className="w-3 h-3 text-blue-400" /> Agency Level: ₹{billingDetails.total_plan_fee || 0}
               </div>
               <div className="text-xs text-white bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded flex items-center gap-1 justify-end">
                 <Users className="w-3 h-3 text-green-400" /> Client Level: ₹{billingDetails.client_breakdown.reduce((a,b)=>a+b.total,0)}
               </div>
             </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">Global Modules</CardTitle>
            <CardDescription className="text-gray-400">Total usage across platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {billingDetails.module_breakdown.map((mb, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <span className="text-gray-300">{mb.name}</span>
                <Badge variant="outline" className="border-white/10 h-5 px-1.5 font-mono text-blue-400">{mb.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
               <Component className="w-5 h-5 text-primary" /> Agency-Level Subscriptions
            </CardTitle>
            <CardDescription className="text-gray-400">Modules or plans applied directly to the CA agency.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-2">
            {modules.map(m => {
               const sub = agencyLevelSubs.find(s => s.module_id === m.id);
               const isActive = !!sub;
               return (
                 <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all">
                   <div className="flex-grow">
                     <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                       {m.name}
                       {m.is_default_free && <Badge className="text-[9px] uppercase bg-green-500/10 text-green-400 border-green-400/20">Free Core</Badge>}
                       {sub?.plan_id && <Badge className="text-[9px] uppercase bg-blue-500/10 text-blue-400 border-blue-500/20">Part of Plan</Badge>}
                     </h4>
                     <p className="text-[11px] text-gray-400 mt-0.5 max-w-[200px] truncate">{m.description}</p>
                     {sub?.custom_price_inr !== null && sub?.custom_price_inr !== undefined && (
                        <div className="text-[10px] text-amber-500 mt-1 font-medium italic">Custom Price: ₹{sub.custom_price_inr}</div>
                     )}
                     {sub?.is_free_override && (
                        <div className="text-[10px] text-green-500 mt-1 font-medium italic">Granted for Free</div>
                     )}
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="text-right mr-2">
                        <div className="text-xs font-mono text-gray-500">₹{m.monthly_price_inr}/mo</div>
                     </div>
                     <Button 
                       variant={isActive ? "destructive" : "default"}
                       size="sm"
                       className={`h-8 text-xs font-bold ${isActive ? "bg-red-500/20 text-red-500 border border-red-500/30" : "bg-primary text-white"}`}
                       disabled={toggleLoading}
                       onClick={() => handleToggle(m.id, sub)}
                     >
                       {isActive ? "Revoke" : "Grant"}
                     </Button>
                   </div>
                 </div>
               )
            })}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
               <FileText className="w-5 h-5 text-green-500" /> Recent Billing Records
            </CardTitle>
            <CardDescription className="text-gray-400">Audit trail of generated invoices.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 border-t border-white/5">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10 px-4">Invoice</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10">Month</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10">Total</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingDetails.invoice_history.map(inv => (
                  <TableRow key={inv.id} className="h-12 border-white/5 hover:bg-white/5">
                    <TableCell className="font-mono text-xs text-white px-4">{inv.invoice_number}</TableCell>
                    <TableCell className="text-xs text-gray-400 truncate max-w-[100px]">
                      {inv.billing_month ? new Date(inv.billing_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-'}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-white">₹{inv.total_amount}</TableCell>
                    <TableCell>
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
      </div>

      <Card className="glass-card">
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
    </div>
  );
};

export default AgencySubscriptionsTab;
