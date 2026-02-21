import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import {
  listPaymentMethods,
  listDepartments,
  createCashierReport,
  handoversSummary,
  approveHandover,
  rejectHandover,
} from '@/lib/api/settings';
import { listEntityUsers } from '@/lib/api/organisation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeftRight, Loader2, Check, X } from 'lucide-react';

const ClientHandoverPage = ({ entityId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const clientId = entityId;

  if (!clientId) {
    return (
      <div className="p-8 flex items-center justify-center text-white">
        <div className="text-center">
          <ArrowLeftRight className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">No entity selected</h2>
          <p className="text-gray-400">Select an entity from the sidebar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 text-white">
      <h1 className="text-3xl font-bold mb-2">Handover</h1>
      <p className="text-gray-400 mb-6">Cashier report and handover approval.</p>
      <Tabs defaultValue="cashier" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cashier">Cashier Report</TabsTrigger>
          <TabsTrigger value="handover">Handover</TabsTrigger>
        </TabsList>
        <TabsContent value="cashier">
          <CashierReportTab clientId={clientId} token={user?.access_token} toast={toast} />
        </TabsContent>
        <TabsContent value="handover">
          <HandoverTab clientId={clientId} token={user?.access_token} toast={toast} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

function CashierReportTab({ clientId, token, toast }) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [matrix, setMatrix] = useState({});
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!clientId || !token) return;
    try {
      const [pm, dept] = await Promise.all([
        listPaymentMethods(clientId, token),
        listDepartments(clientId, token),
      ]);
      setPaymentMethods(Array.isArray(pm) ? pm : []);
      setDepartments(Array.isArray(dept) ? dept : []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load.' });
    }
  }, [clientId, token, toast]);

  useEffect(() => { load(); }, [load]);

  const setCell = (deptId, pmId, value) => {
    setMatrix(prev => ({
      ...prev,
      [deptId]: { ...(prev[deptId] || {}), [pmId]: value },
    }));
  };
  const getCell = (deptId, pmId) => matrix[deptId]?.[pmId] ?? '';

  const rowTotal = (deptId) =>
    paymentMethods.reduce((s, p) => s + (parseFloat(getCell(deptId, p.id)) || 0), 0);
  const colTotal = (pmId) =>
    departments.reduce((s, d) => s + (parseFloat(getCell(d.id, pmId)) || 0), 0);
  const grandTotal = () =>
    departments.reduce((s, d) => s + rowTotal(d.id), 0);

  const handleSubmit = async () => {
    if (!clientId || !token) return;
    const details = {};
    departments.forEach(d => {
      details[d.id] = {};
      paymentMethods.forEach(p => {
        const v = getCell(d.id, p.id);
        if (v !== '' && v != null) details[d.id][p.id] = parseFloat(v) || 0;
      });
    });
    setSubmitting(true);
    try {
      await createCashierReport(clientId, { report_date: reportDate, details, remarks }, token);
      toast({ title: 'Success', description: 'Cashier report submitted.' });
      setMatrix({});
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Submit failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <Label className="text-gray-400 mr-2">Date</Label>
          <Input type="date" className="glass-input w-40 inline-block" value={reportDate} onChange={e => setReportDate(e.target.value)} />
        </div>
      </div>
      <div className="overflow-x-auto glass-pane rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-gray-300 bg-white/5">Department</TableHead>
              {paymentMethods.map(p => (
                <TableHead key={p.id} className="text-gray-300 bg-white/5">{p.name}</TableHead>
              ))}
              <TableHead className="text-gray-300 bg-amber-500/20">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map(d => (
              <TableRow key={d.id} className="border-white/10">
                <TableCell className="font-medium bg-white/5">{d.name}</TableCell>
                {paymentMethods.map(p => (
                  <TableCell key={p.id}>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      className="glass-input w-24 h-9"
                      value={getCell(d.id, p.id)}
                      onChange={e => setCell(d.id, p.id, e.target.value)}
                    />
                  </TableCell>
                ))}
                <TableCell className="font-medium bg-amber-500/10">{rowTotal(d.id).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-white/10 bg-amber-500/10 font-medium">
              <TableCell className="text-gray-300">Total</TableCell>
              {paymentMethods.map(p => (
                <TableCell key={p.id}>{colTotal(p.id).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
              ))}
              <TableCell>{grandTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div>
        <Label className="text-gray-400">Remarks</Label>
        <Input className="glass-input mt-1" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Remarks" />
      </div>
      <Button onClick={handleSubmit} disabled={submitting}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit
      </Button>
    </div>
  );
}

function HandoverTab({ clientId, token, toast }) {
  const [summaryDate, setSummaryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [approveRemark, setApproveRemark] = useState('');
  const [rejectRemark, setRejectRemark] = useState('');
  const [actioning, setActioning] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!clientId || !token) return;
    setLoading(true);
    try {
      const res = await handoversSummary(clientId, summaryDate, token);
      setItems(res?.items || []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load.' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, summaryDate, token, toast]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    if (!clientId || !token || items.length === 0) return;
    const ids = [...new Set(items.map(i => i.created_by_user_id))];
    if (ids.length === 0) return;
    listEntityUsers(clientId, token).then(data => {
      const joined = data?.joined_users || [];
      const map = {};
      joined.forEach(u => { map[u.user_id] = u.name || u.email; });
      setUsersMap(map);
    }).catch(() => {});
  }, [clientId, token, items]);

  const handleApprove = async () => {
    if (!approveModal || !clientId || !token) return;
    setActioning(true);
    try {
      await approveHandover(clientId, approveModal.handover_id, { remark: approveRemark }, token);
      toast({ title: 'Approved', description: 'Handover approved.' });
      setApproveModal(null);
      setApproveRemark('');
      fetchSummary();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed.' });
    } finally {
      setActioning(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectRemark.trim() || !clientId || !token) {
      toast({ variant: 'destructive', title: 'Validation', description: 'Rejection remark is required.' });
      return;
    }
    setActioning(true);
    try {
      await rejectHandover(clientId, rejectModal.handover_id, { remark: rejectRemark }, token);
      toast({ title: 'Rejected', description: 'Handover rejected.' });
      setRejectModal(null);
      setRejectRemark('');
      fetchSummary();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed.' });
    } finally {
      setActioning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label className="text-gray-400">Date</Label>
        <Input type="date" className="glass-input w-40" value={summaryDate} onChange={e => setSummaryDate(e.target.value)} />
      </div>
      <div className="glass-pane rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-gray-300">Date</TableHead>
              <TableHead className="text-gray-300">Created By</TableHead>
              <TableHead className="text-gray-300">Department</TableHead>
              <TableHead className="text-gray-300">As Per Department</TableHead>
              <TableHead className="text-gray-300">As Per System</TableHead>
              <TableHead className="text-gray-300">Variance</TableHead>
              <TableHead className="text-gray-300">Status</TableHead>
              <TableHead className="text-right text-gray-300">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-gray-400">No handovers for this date.</TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.handover_id} className="border-white/10">
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{usersMap[row.created_by_user_id] || row.created_by_name || '—'}</TableCell>
                  <TableCell>{row.department_name || '—'}</TableCell>
                  <TableCell>₹ {Number(row.as_per_department).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>₹ {Number(row.as_per_system).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>₹ {Number(row.variance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded text-sm ${
                      row.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      row.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {row.status === 'pending' ? 'Pending Approval' : row.status === 'approved' ? 'Approved' : 'Rejected'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300" onClick={() => setApproveModal(row)}><Check className="w-4 h-4" /> Approve</Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => setRejectModal(row)}><X className="w-4 h-4" /> Reject</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!approveModal} onOpenChange={() => setApproveModal(null)}>
        <DialogContent className="glass-pane border-white/10 text-white">
          <DialogHeader><DialogTitle>Approve Handover</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label className="text-gray-300">Remark (optional)</Label>
            <Input className="mt-2 glass-input" value={approveRemark} onChange={e => setApproveRemark(e.target.value)} placeholder="Remark" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button onClick={handleApprove} disabled={actioning}>{actioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectModal} onOpenChange={() => setRejectModal(null)}>
        <DialogContent className="glass-pane border-white/10 text-white">
          <DialogHeader><DialogTitle>Reject Handover</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label className="text-gray-300">Remark (required)</Label>
            <Input className="mt-2 glass-input" value={rejectRemark} onChange={e => setRejectRemark(e.target.value)} placeholder="Reason for rejection" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleReject} disabled={actioning || !rejectRemark.trim()}>{actioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ClientHandoverPage;
