import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { listHandovers, createHandover, updateHandover } from '@/lib/api/settings';
import { listPaymentMethods } from '@/lib/api/settings';
import { ArrowLeftRight, Plus, Loader2 } from 'lucide-react';

const HandoverPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const entityId = user?.entity_id;
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [handoverDate, setHandoverDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [collectionAmounts, setCollectionAmounts] = useState({});
  const [physicalCashAtDesk, setPhysicalCashAtDesk] = useState('');
  const [imprestAmount, setImprestAmount] = useState('');
  const [lessPayment, setLessPayment] = useState('');
  const [remarks, setRemarks] = useState('');

  const fetchList = useCallback(async () => {
    if (!entityId || !user?.access_token) return;
    setLoading(true);
    try {
      const data = await listHandovers(entityId, user.access_token);
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load handovers.' });
    } finally {
      setLoading(false);
    }
  }, [entityId, user?.access_token, toast]);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    if (!entityId || !user?.access_token) return;
    listPaymentMethods(entityId, user.access_token).then(pm => setPaymentMethods(Array.isArray(pm) ? pm : [])).catch(() => setPaymentMethods([]));
  }, [entityId, user?.access_token]);

  const openAddModal = async () => {
    setEditingRow(null);
    setShowModal(true);
    setHandoverDate(new Date().toISOString().slice(0, 10));
    setCollectionAmounts({});
    setPhysicalCashAtDesk('');
    setImprestAmount('');
    setLessPayment('');
    setRemarks('');
    if (entityId && user?.access_token) {
      try {
        const pm = await listPaymentMethods(entityId, user.access_token);
        setPaymentMethods(Array.isArray(pm) ? pm : []);
      } catch {
        setPaymentMethods([]);
      }
    }
  };

  const openEditModal = (row) => {
    const dateStr = row.handover_date ? (typeof row.handover_date === 'string' ? row.handover_date.slice(0, 10) : new Date(row.handover_date).toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10);
    setHandoverDate(dateStr);
    const amounts = {};
    Object.entries(row.collection_details || {}).forEach(([k, v]) => { amounts[k] = v != null ? String(v) : ''; });
    setCollectionAmounts(amounts);
    setPhysicalCashAtDesk(row.physical_cash_at_desk != null ? String(row.physical_cash_at_desk) : '');
    setImprestAmount(row.imprest_amount != null ? String(row.imprest_amount) : '');
    setLessPayment(row.less_payment != null ? String(row.less_payment) : '');
    setRemarks(row.remarks || '');
    setEditingRow(row);
    setShowModal(true);
  };

  const isViewOnly = editingRow && editingRow.status === 'approved';

  const cashPm = paymentMethods.find(p => p.name && p.name.toUpperCase() === 'CASH');
  const cashId = cashPm?.id ?? paymentMethods[0]?.id;
  const cashValue = cashId != null ? (collectionAmounts[cashId] ?? '') : '';
  const numCash = parseFloat(cashValue) || 0;
  const grandTotal = Object.values(collectionAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const physicalNum = parseFloat(physicalCashAtDesk) || 0;
  const difference = physicalNum - numCash;
  const imprestNum = parseFloat(imprestAmount) || 0;
  const lessNum = parseFloat(lessPayment) || 0;
  const netImprest = imprestNum - lessNum;

  const handleSubmit = async () => {
    if (!entityId || !user?.access_token) return;
    const details = {};
    paymentMethods.forEach(p => {
      const v = collectionAmounts[p.id];
      if (v != null && String(v).trim() !== '') details[p.id] = parseFloat(v) || 0;
    });
    if (grandTotal < 0 && !editingRow) {
      toast({ variant: 'destructive', title: 'Validation', description: 'Collection amount cannot be negative.' });
      return;
    }
    setSubmitting(true);
    try {
      if (editingRow) {
        await updateHandover(entityId, editingRow.id, {
          collection_details: details,
          remarks: remarks || null,
          physical_cash_at_desk: physicalCashAtDesk ? physicalNum : null,
          imprest_amount: imprestAmount ? imprestNum : null,
          less_payment: lessPayment ? lessNum : null,
        }, user.access_token);
        toast({ title: 'Success', description: 'Handover updated.' });
      } else {
        await createHandover(entityId, {
          handover_date: handoverDate,
          collection_details: details,
          grand_total: grandTotal,
          cash_collection: numCash,
          physical_cash_at_desk: physicalCashAtDesk ? physicalNum : null,
          imprest_amount: imprestAmount ? imprestNum : null,
          less_payment: lessPayment ? lessNum : null,
          remarks: remarks || null,
          ...(user?.department_id && { department_id: user.department_id }),
        }, user.access_token);
        toast({ title: 'Success', description: 'Handover submitted.' });
      }
      setShowModal(false);
      setEditingRow(null);
      fetchList();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || (editingRow ? 'Update failed.' : 'Submit failed.') });
    } finally {
      setSubmitting(false);
    }
  };

  if (!entityId) {
    return (
      <div className="p-8 flex items-center justify-center text-white">
        <div className="text-center">
          <ArrowLeftRight className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">No entity assigned</h2>
          <p className="text-gray-400">You are not assigned to an entity.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 text-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Handover</h1>
          <p className="text-gray-400 mt-1">Submit and view your department handovers.</p>
        </div>
        <Button onClick={openAddModal} className="bg-primary hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Handover
        </Button>
      </div>

      <div className="glass-pane rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-gray-300">Date</TableHead>
              <TableHead className="text-gray-300">Created By</TableHead>
              <TableHead className="text-gray-300">Department</TableHead>
              <TableHead className="text-gray-300">Amount</TableHead>
              <TableHead className="text-gray-300">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-gray-400">No handovers yet.</TableCell>
              </TableRow>
            ) : (
              list.map((row) => (
                <TableRow key={row.id} className="border-white/10 hover:bg-white/5">
                  <TableCell>{new Date(row.handover_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</TableCell>
                  <TableCell>{row.created_by_name || user?.name || '—'}</TableCell>
                  <TableCell>{row.department_name || '—'}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="underline decoration-dotted hover:no-underline cursor-pointer"
                      onClick={() => openEditModal(row)}
                    >
                      ₹ {Number(row.grand_total || 0).toLocaleString('en-IN')}
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded text-sm ${row.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        row.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                      {row.status === 'pending' ? 'Pending' : row.status === 'approved' ? 'Approved' : 'Rejected'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) setEditingRow(null); }}>
        <DialogContent className="glass-pane border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Handover Details</DialogTitle>
            {editingRow && <p className="text-sm text-gray-400 mt-1">{isViewOnly ? 'View only — handover already approved.' : 'Edit amounts and save when not yet approved.'}</p>}
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <Label className="text-gray-300">Date</Label>
              <Input type="date" readOnly={isViewOnly || !!editingRow} className={`mt-2 glass-input ${(isViewOnly || editingRow) ? 'cursor-default opacity-90' : ''}`} value={handoverDate} onChange={e => !editingRow && setHandoverDate(e.target.value)} />
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">Collection Details</h3>
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-white/5">
                      <TableHead className="text-left p-2 text-gray-400">S.NO</TableHead>
                      <TableHead className="text-left p-2 text-gray-400">MODE</TableHead>
                      <TableHead className="text-left p-2 text-gray-400">AMOUNT ₹</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods.map((p, i) => (
                      <TableRow key={p.id} className="border-t border-white/10">
                        <TableCell className="p-2">{String.fromCharCode(65 + i)}</TableCell>
                        <TableCell className="p-2">{p.name}</TableCell>
                        <TableCell className="p-2">
                          {isViewOnly ? (
                            <span>{Number(collectionAmounts[p.id] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="glass-input w-32"
                              value={collectionAmounts[p.id] ?? ''}
                              onChange={e => setCollectionAmounts(prev => ({ ...prev, [p.id]: e.target.value }))}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t border-white/10 bg-white/5 font-medium">
                      <TableCell className="p-2" colSpan={2}>GRAND TOTAL</TableCell>
                      <TableCell className="p-2">{grandTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">Cash Tally</h3>
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-white/5">
                      <TableHead className="text-left p-2 text-gray-400">S.NO</TableHead>
                      <TableHead className="text-left p-2 text-gray-400">PARTICULAR</TableHead>
                      <TableHead className="text-left p-2 text-gray-400">AMOUNT ₹</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-t border-white/10">
                      <TableCell className="p-2">A</TableCell>
                      <TableCell className="p-2">CASH COLLECTION</TableCell>
                      <TableCell className="p-2">{numCash.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t border-white/10">
                      <TableCell className="p-2">B</TableCell>
                      <TableCell className="p-2">PHYSICAL CASH AT DESK</TableCell>
                      <TableCell className="p-2">
                        {isViewOnly ? <span>{physicalNum.toFixed(2)}</span> : <Input type="number" min={0} step={0.01} className="glass-input w-32" value={physicalCashAtDesk} onChange={e => setPhysicalCashAtDesk(e.target.value)} />}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t border-white/10">
                      <TableCell className="p-2">C</TableCell>
                      <TableCell className="p-2">DIFFERENCE (B - A)</TableCell>
                      <TableCell className="p-2">{difference.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">Imprest Cash</h3>
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-white/5">
                      <TableHead className="text-left p-2 text-gray-400">S.NO</TableHead>
                      <TableHead className="text-left p-2 text-gray-400">PARTICULAR</TableHead>
                      <TableHead className="text-left p-2 text-gray-400">AMOUNT ₹</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-t border-white/10">
                      <TableCell className="p-2">A</TableCell>
                      <TableCell className="p-2">IMPREST AMOUNT</TableCell>
                      <TableCell className="p-2">
                        {isViewOnly ? <span>{imprestNum.toFixed(2)}</span> : <Input type="number" min={0} step={0.01} className="glass-input w-32" value={imprestAmount} onChange={e => setImprestAmount(e.target.value)} />}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t border-white/10">
                      <TableCell className="p-2">B</TableCell>
                      <TableCell className="p-2">LESS PAYMENT</TableCell>
                      <TableCell className="p-2">
                        {isViewOnly ? <span>{lessNum.toFixed(2)}</span> : <Input type="number" min={0} step={0.01} className="glass-input w-32" value={lessPayment} onChange={e => setLessPayment(e.target.value)} />}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t border-white/10">
                      <TableCell className="p-2">C</TableCell>
                      <TableCell className="p-2">NET IMPREST AMOUNT (A - B)</TableCell>
                      <TableCell className="p-2">{netImprest.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Remarks</Label>
              {isViewOnly ? <p className="mt-2 text-sm text-white">{remarks || '—'}</p> : <textarea className="mt-2 w-full min-h-[80px] glass-input rounded-md p-2" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Remarks..." />}
            </div>
          </div>
          {!isViewOnly && (
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost" disabled={submitting}>Cancel</Button></DialogClose>
              <Button onClick={handleSubmit} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingRow ? 'Save' : 'Submit'}</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HandoverPage;
