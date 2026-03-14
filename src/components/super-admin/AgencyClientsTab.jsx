import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { listAgencyEntities, getAdminModules, getAgencySubscriptions, getAdminPlans, assignPlanToAgency, toggleAgencyModule } from '@/lib/api/admin';
import { Loader2, Zap, ShieldCheck, User, Package, Power, CheckCircle2 } from 'lucide-react';

const AgencyClientsTab = ({ agencyId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [entities, setEntities] = useState([]);
  const [modules, setModules] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  
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
      const [entitiesRes, modulesRes, subsRes, plansRes] = await Promise.all([
        listAgencyEntities(agencyId, user.access_token),
        getAdminModules(user.access_token),
        getAgencySubscriptions(agencyId, user.access_token),
        getAdminPlans(user.access_token)
      ]);
      setEntities(entitiesRes);
      setModules(modulesRes);
      setSubscriptions(subsRes);
      setPlans(plansRes.filter(p => p.plan_type === 'CLIENT'));
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load client data.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.access_token && agencyId) {
      fetchData();
    }
  }, [user, agencyId]);

  const handleToggleModule = async (moduleId, entityId, currentSub = null) => {
    try {
      setToggleLoading(true);
      const params = { module_id: moduleId, entity_id: entityId };
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
    if (!assignmentData.plan_id || !selectedEntity) return;
    try {
      setToggleLoading(true);
      const res = await assignPlanToAgency(agencyId, {
        plan_id: assignmentData.plan_id,
        entity_id: selectedEntity.id,
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

  return (
    <div className="space-y-6">
      <Card className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client / Entity</TableHead>
              <TableHead>Active Modules</TableHead>
              <TableHead>Price Adjustments</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-gray-500 italic">No clients found for this agency.</TableCell>
              </TableRow>
            ) : (
              entities.map(entity => {
                const entitySubs = subscriptions.filter(s => s.entity_id === entity.id && s.status === 'active');
                return (
                  <TableRow key={entity.id} className="group transition-colors hover:bg-white/[0.02]">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-white">{entity.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{entity.customer_id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[300px]">
                        {entitySubs.length === 0 ? (
                          <span className="text-xs text-gray-600 italic">N/A</span>
                        ) : (
                          entitySubs.map(s => (
                            <Badge key={s.id} variant="outline" className="text-[9px] bg-white/5 border-white/10 text-gray-300 h-5">
                              {s.module_name}
                              {s.plan_id && <Zap className="w-2 h-2 ml-1 text-blue-400 fill-current" />}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="space-y-1">
                         {entitySubs.some(s => s.custom_price_inr !== null) && (
                            <div className="text-[9px] text-amber-500 flex items-center gap-1">
                               <ShieldCheck className="w-2.5 h-2.5" /> Price Overrides Active
                            </div>
                         )}
                         {entitySubs.some(s => s.is_free_override) && (
                            <div className="text-[9px] text-green-500 flex items-center gap-1">
                               <CheckCircle2 className="w-2.5 h-2.5" /> Free Access Granted
                            </div>
                         )}
                       </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                         <Dialog open={isAssignModalOpen && selectedEntity?.id === entity.id} onOpenChange={(open) => {
                           if (!open) setSelectedEntity(null);
                           setIsAssignModalOpen(open);
                         }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                                onClick={() => {
                                  setSelectedEntity(entity);
                                  setIsAssignModalOpen(true);
                                }}
                              >
                                <Zap className="w-3.5 h-3.5 mr-1" /> Assign Plan
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="glass-effect border-white/10 text-white">
                              <DialogHeader>
                                <DialogTitle>Assign Plan: {entity.name}</DialogTitle>
                                <DialogDescription className="text-gray-400">Select a client-focused bundle for this entity.</DialogDescription>
                              </DialogHeader>
                              <form onSubmit={handleAssignPlan} className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Select Plan</label>
                                  <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                    {plans.map(p => (
                                      <div 
                                        key={p.id}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all ${assignmentData.plan_id === p.id ? 'bg-blue-500/20 border-blue-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                        onClick={() => setAssignmentData({...assignmentData, plan_id: p.id})}
                                      >
                                        <div className="flex justify-between items-center text-sm">
                                          <span className="font-semibold">{p.name}</span>
                                          <span className="font-mono text-blue-400">₹{p.monthly_price_inr}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Custom Price (₹)</label>
                                    <Input 
                                      type="number" 
                                      value={assignmentData.custom_price}
                                      onChange={e => setAssignmentData({...assignmentData, custom_price: e.target.value})}
                                      className="bg-white/5 border-white/10 h-9"
                                    />
                                  </div>
                                  <div className="flex items-end pb-1.5">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-md w-full">
                                      <Checkbox 
                                        id="cf_free" 
                                        checked={assignmentData.is_free} 
                                        onCheckedChange={v => setAssignmentData({...assignmentData, is_free: v})}
                                      />
                                      <label htmlFor="cf_free" className="text-xs cursor-pointer">Set Free</label>
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                                  <Button type="submit" size="sm" disabled={!assignmentData.plan_id || toggleLoading} className="bg-primary text-white">
                                    {toggleLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Assign
                                  </Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                         </Dialog>

                         <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 text-gray-400 hover:text-white hover:bg-white/10">
                                <Package className="w-3.5 h-3.5 mr-1" /> Modules
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="glass-effect border-white/10 text-white max-w-lg">
                               <DialogHeader>
                                 <DialogTitle>Individual Module Control: {entity.name}</DialogTitle>
                                 <DialogDescription className="text-gray-400">Manually grant or revoke individual modules.</DialogDescription>
                               </DialogHeader>
                               <div className="grid grid-cols-1 gap-2 py-4 max-h-[350px] overflow-y-auto pr-1">
                                 {modules.map(mod => {
                                   const sub = entitySubs.find(s => s.module_id === mod.id);
                                   const isActive = !!sub;
                                   return (
                                     <div key={mod.id} className="flex justify-between items-center p-3 rounded bg-white/5 border border-white/5">
                                       <div className="flex-grow">
                                         <div className="text-sm font-medium text-white">{mod.name}</div>
                                         <div className="text-[10px] text-gray-500 font-mono">₹{mod.monthly_price_inr}/mo</div>
                                       </div>
                                       <Button 
                                         variant={isActive ? "destructive" : "default"} 
                                         size="sm" 
                                         className={`h-7 text-[10px] font-bold ${isActive ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-primary text-white'}`}
                                         disabled={toggleLoading}
                                         onClick={() => handleToggleModule(mod.id, entity.id, sub)}
                                       >
                                         {isActive ? 'Revoke' : 'Grant'}
                                       </Button>
                                     </div>
                                   )
                                 })}
                               </div>
                            </DialogContent>
                         </Dialog>
                       </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AgencyClientsTab;
