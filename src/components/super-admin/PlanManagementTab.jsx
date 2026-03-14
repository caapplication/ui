import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getAdminPlans, createAdminPlan, getAdminModules } from '@/lib/api/admin';
import { Loader2, Plus, Info, CheckCircle2 } from 'lucide-react';

const PlanManagementTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [plans, setPlans] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const initialPlanState = {
    name: '',
    description: '',
    plan_type: 'CLIENT',
    monthly_price: 0,
    one_time_price: 0,
    is_recurring: true,
    module_ids: []
  };

  const [newPlan, setNewPlan] = useState(initialPlanState);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [plansRes, modulesRes] = await Promise.all([
        getAdminPlans(user.access_token),
        getAdminModules(user.access_token)
      ]);
      setPlans(plansRes);
      setModules(modulesRes);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load plans.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.access_token, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uniqueModules = useMemo(() => {
    const seen = new Set();
    return modules.filter(mod => {
      if (!mod.id || seen.has(mod.id)) return false;
      seen.add(mod.id);
      return true;
    });
  }, [modules]);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!newPlan.name.trim()) {
      toast({ title: 'Validation Error', description: 'Plan name is required.', variant: 'destructive' });
      return;
    }
    if (!newPlan.description.trim()) {
      toast({ title: 'Validation Error', description: 'Description is required.', variant: 'destructive' });
      return;
    }
    if (newPlan.module_ids.length === 0) {
      toast({ title: 'Validation Error', description: 'At least one module must be selected.', variant: 'destructive' });
      return;
    }

    try {
      setCreateLoading(true);
      await createAdminPlan(newPlan, user.access_token);
      toast({ title: 'Success', description: `Plan "${newPlan.name}" created successfully.` });
      setIsCreateModalOpen(false);
      setNewPlan(initialPlanState);
      fetchData();
    } catch (err) {
      toast({ title: 'Creation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setCreateLoading(false);
    }
  };

  const toggleModuleSelection = useCallback((moduleId) => {
    setNewPlan(prev => ({
      ...prev,
      module_ids: prev.module_ids.includes(moduleId)
        ? prev.module_ids.filter(id => id !== moduleId)
        : [...prev.module_ids, moduleId]
    }));
  }, []);

  const handleOpenChange = (open) => {
    setIsCreateModalOpen(open);
    if (!open) {
      setNewPlan(initialPlanState);
    }
  };

  return (
    <div className="space-y-6">
      {loading && plans.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Bundled Plans</h2>
          <p className="text-gray-400 text-sm">Create pre-defined module packages for agencies and clients.</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-white gap-2">
              <Plus className="w-4 h-4" /> Create New Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-effect border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Bundled Plan</DialogTitle>
              <DialogDescription className="text-gray-400">
                Define a set of modules and pricing for this plan.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePlan} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan Name <span className="text-red-400">*</span></label>
                  <Input 
                    placeholder="e.g. Basic CA Suite" 
                    value={newPlan.name} 
                    onChange={e => setNewPlan({...newPlan, name: e.target.value})}
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Type <span className="text-red-400">*</span></label>
                  <Select value={newPlan.plan_type} onValueChange={v => setNewPlan({...newPlan, plan_type: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10 text-white">
                      <SelectItem value="CA">CA (Agency Level)</SelectItem>
                      <SelectItem value="CLIENT">Client (Entity Level)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description <span className="text-red-400">*</span></label>
                <Input 
                  placeholder="What does this plan include?" 
                  value={newPlan.description} 
                  onChange={e => setNewPlan({...newPlan, description: e.target.value})}
                  className="bg-white/5 border-white/10"
                />
              </div>

              <div className="p-4 rounded-lg border border-white/5 bg-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">Subscription Type</div>
                    <div className="text-xs text-gray-400">{newPlan.is_recurring ? 'Recurring Monthly Billing' : 'One-Time Payment'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">One-time</span>
                    <Switch 
                      checked={newPlan.is_recurring} 
                      onCheckedChange={v => setNewPlan({...newPlan, is_recurring: v})}
                    />
                    <span className="text-xs text-white">Recurring</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {newPlan.is_recurring ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-400">Monthly Price (₹)</label>
                      <Input 
                        type="number" 
                        value={newPlan.monthly_price} 
                        onChange={e => setNewPlan({...newPlan, monthly_price: e.target.value})}
                        className="bg-white/5 border-white/10 font-mono"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-amber-500">One-Time Fee (₹)</label>
                      <Input 
                        type="number" 
                        value={newPlan.one_time_price} 
                        onChange={e => setNewPlan({...newPlan, one_time_price: e.target.value})}
                        className="bg-white/5 border-white/10 font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  Include Modules <span className="text-red-400">*</span>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    {newPlan.module_ids.length} Selected
                  </Badge>
                </label>
                <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                  {/* CA Modules */}
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                       <div className="h-px flex-1 bg-white/5"></div>
                       Core Infrastructure
                       <div className="h-px flex-1 bg-white/5"></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {uniqueModules.filter(m => m.module_type === 'CA').map(mod => (
                        <label 
                          key={mod.id}
                          className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                            newPlan.module_ids.includes(mod.id) 
                            ? 'bg-primary/20 border-primary/50 text-white' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          <Checkbox 
                            checked={newPlan.module_ids.includes(mod.id)} 
                            onCheckedChange={() => toggleModuleSelection(mod.id)}
                            className="mt-0.5 border-white/20"
                          />
                          <div className="overflow-hidden flex-1">
                            <div className="text-[11px] font-semibold truncate leading-tight" title={mod.name}>{mod.name}</div>
                            <div className="text-[9px] text-gray-500 truncate">₹{mod.monthly_price_inr}/mo</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Client Modules */}
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                       <div className="h-px flex-1 bg-white/5"></div>
                       Service Add-ons
                       <div className="h-px flex-1 bg-white/5"></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {uniqueModules.filter(m => m.module_type !== 'CA').map(mod => (
                        <label 
                          key={mod.id}
                          className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                            newPlan.module_ids.includes(mod.id) 
                            ? 'bg-primary/20 border-primary/50 text-white' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          <Checkbox 
                            checked={newPlan.module_ids.includes(mod.id)} 
                            onCheckedChange={() => toggleModuleSelection(mod.id)}
                            className="mt-0.5 border-white/20"
                          />
                          <div className="overflow-hidden flex-1">
                            <div className="text-[11px] font-semibold truncate leading-tight" title={mod.name}>{mod.name}</div>
                            <div className="text-[9px] text-gray-500 truncate">₹{mod.monthly_price_inr}/mo</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createLoading} className="bg-primary text-white">
                  {createLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create Plan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Details</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead>Included Modules</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-gray-500 italic">No plans created yet.</TableCell>
              </TableRow>
            ) : (
              plans.map(plan => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="font-semibold text-white">{plan.name}</div>
                    <div className="text-xs text-gray-400 max-w-[200px] truncate">{plan.description || "No description"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-white/5 text-gray-300 border-white/10 text-[10px]">
                      {plan.plan_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {plan.is_recurring ? (
                      <div className="text-sm font-mono text-blue-400">₹{plan.monthly_price_inr}<span className="text-[10px] text-gray-500">/mo</span></div>
                    ) : (
                      <div className="text-sm font-mono text-amber-500">₹{plan.one_time_price_inr}<span className="text-[10px] text-gray-500 underline decoration-dotted ml-1">One-time</span></div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div 
                      className="flex flex-wrap gap-1 max-w-[250px] cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setViewingPlan(plan)}
                      title="Click to view all modules"
                    >
                      {plan.modules.slice(0, 3).map(m => (
                        <Badge key={m.id} className="text-[9px] bg-white/5 border-white/10 text-gray-300 h-4 px-1.5">{m.name}</Badge>
                      ))}
                      {plan.modules.length > 3 && (
                        <Badge className="text-[9px] bg-primary/10 border-primary/20 text-primary h-4 px-1.5">+{plan.modules.length - 3} more</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={plan.is_active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}>
                      {plan.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Plan Details Modal */}
      <Dialog open={!!viewingPlan} onOpenChange={(open) => !open && setViewingPlan(null)}>
        <DialogContent className="glass-effect border-white/10 text-white max-w-2xl">
          {viewingPlan && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle className="text-2xl font-bold text-white">{viewingPlan.name}</DialogTitle>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {viewingPlan.plan_type}
                  </Badge>
                </div>
                <DialogDescription className="text-gray-400 mt-2 text-base">
                  {viewingPlan.description || "No description provided."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pricing Model</div>
                    <div className="text-lg font-semibold flex items-center gap-2">
                       {viewingPlan.is_recurring ? (
                         <>
                           <span className="text-blue-400">₹{viewingPlan.monthly_price_inr}</span>
                           <span className="text-xs text-gray-500 font-normal">/ month per agency</span>
                         </>
                       ) : (
                         <>
                           <span className="text-amber-500">₹{viewingPlan.one_time_price_inr}</span>
                           <span className="text-xs text-gray-500 font-normal">one-time setup fee</span>
                         </>
                       )}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</div>
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${viewingPlan.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                       <span className={viewingPlan.is_active ? "text-green-500" : "text-red-500"}>
                         {viewingPlan.is_active ? "Currently Active" : "Disabled"}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium flex items-center gap-2 text-white">
                    Included Modules
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                      {viewingPlan.modules.length} Total
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {viewingPlan.modules.map(mod => (
                      <div key={mod.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 group hover:border-primary/30 transition-colors">
                        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white group-hover:text-primary transition-colors">{mod.name}</div>
                          <div className="text-[10px] text-gray-500">Full Access Included</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewingPlan(null)} className="w-full border-white/10 text-white hover:bg-white/5">
                  Close Details
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
};

export default PlanManagementTab;
