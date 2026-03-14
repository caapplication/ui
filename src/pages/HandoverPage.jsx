import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { listHandovers, createHandover, updateHandover } from '@/lib/api/settings';
import { listPaymentMethods } from '@/lib/api/settings';
import { ArrowLeftRight, Plus, Loader2, Calendar, Search, Eye, ChevronLeft, ChevronRight, FilterX, Check } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays, startOfToday } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatedSearch } from '@/components/ui/AnimatedSearch';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

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
  
  // Filtering and Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [datePreset, setDatePreset] = useState('last_30_days');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [skip, setSkip] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const maxRows = 100;

  const fetchList = useCallback(async () => {
    if (!entityId || !user?.access_token) return;
    setLoading(true);

    let from = null;
    let to = null;

    // Resolve date range based on preset
    const now = new Date();
    const today = startOfToday();
    
    if (datePreset === 'today') {
      from = format(today, 'yyyy-MM-dd');
      to = format(today, 'yyyy-MM-dd');
    } else if (datePreset === 'yesterday') {
      const yesterday = subDays(today, 1);
      from = format(yesterday, 'yyyy-MM-dd');
      to = format(yesterday, 'yyyy-MM-dd');
    } else if (datePreset === 'last_7_days') {
      from = format(subDays(today, 7), 'yyyy-MM-dd');
      to = format(today, 'yyyy-MM-dd');
    } else if (datePreset === 'last_30_days') {
      from = format(subDays(today, 30), 'yyyy-MM-dd');
      to = format(today, 'yyyy-MM-dd');
    } else if (datePreset === 'this_month') {
      from = format(startOfMonth(now), 'yyyy-MM-dd');
      to = format(now, 'yyyy-MM-dd');
    } else if (datePreset === 'last_month') {
      const lm = subDays(startOfMonth(now), 1);
      from = format(startOfMonth(lm), 'yyyy-MM-dd');
      to = format(endOfMonth(lm), 'yyyy-MM-dd');
    } else if (datePreset === 'last_3_months') {
      from = format(subDays(today, 90), 'yyyy-MM-dd');
      to = format(today, 'yyyy-MM-dd');
    } else if (datePreset === 'last_6_months') {
      from = format(subDays(today, 180), 'yyyy-MM-dd');
      to = format(today, 'yyyy-MM-dd');
    } else if (datePreset === 'last_year') {
      from = format(subDays(today, 365), 'yyyy-MM-dd');
      to = format(today, 'yyyy-MM-dd');
    } else if (datePreset === 'custom') {
      from = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : null;
      to = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : null;
    }

    try {
      const data = await listHandovers(entityId, user.access_token, {
        from_date: from,
        to_date: to,
        skip: 0, // Reset to 0 since we'll filter/paginate on frontend for search support
        limit: maxRows
      });
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load handovers.' });
    } finally {
      setLoading(false);
    }
  }, [entityId, user?.access_token, toast, datePreset, dateRange]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // Client-side filtering for search
  const filteredList = useMemo(() => {
    let result = [...list];
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(item => 
        (item.created_by_name || '').toLowerCase().includes(term) ||
        (item.department_name || '').toLowerCase().includes(term) ||
        (item.remarks || '').toLowerCase().includes(term) ||
        (item.status || '').toLowerCase().includes(term)
      );
    }
    return result;
  }, [list, searchTerm]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = useMemo(() => {
    const start = skip;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, skip, itemsPerPage]);

  const currentPage = Math.floor(skip / itemsPerPage) + 1;

  // Reset skip when filters change
  useEffect(() => {
    setSkip(0);
  }, [searchTerm, datePreset, dateRange, itemsPerPage]);

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
          <h1 className="text-3xl font-bold tracking-tight">Handover</h1>
          <p className="text-gray-400 mt-1">Submit and view your department handovers.</p>
        </div>
        <Button onClick={openAddModal} className="bg-primary hover:bg-primary/90 gap-2 px-6 h-11">
          <Plus className="w-5 h-5" /> Submit Handover
        </Button>
      </div>

      <Card className="glass-card mb-6 border-white/10 shadow-lg border-0 border-b border-t">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-end gap-4">
            <div className="flex flex-wrap items-center justify-end gap-3 w-full lg:w-auto">
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="w-full sm:w-[190px] h-11 rounded-full glass-input px-4 border-white/10">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <SelectValue placeholder="Last 30 days" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10 text-white">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last_7_days">Last 7 days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 days</SelectItem>
                  <SelectItem value="this_month">This month</SelectItem>
                  <SelectItem value="last_month">Last month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 month</SelectItem>
                  <SelectItem value="last_6_months">Last 6 month</SelectItem>
                  <SelectItem value="last_year">Last year</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {datePreset === 'custom' && (
                <DateRangePicker
                  dateRange={dateRange}
                  onChange={setDateRange}
                  className="w-full sm:w-[260px]"
                />
              )}
              <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                <AnimatedSearch
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search Handovers..."
                  expandedWidth="sm:w-[300px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 border-t border-white/10">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-gray-300 font-bold h-12">Date</TableHead>
                  <TableHead className="text-gray-300 font-bold h-12">Created By</TableHead>
                  <TableHead className="text-gray-300 font-bold h-12 text-center">Department</TableHead>
                  <TableHead className="text-gray-300 font-bold h-12">Amount</TableHead>
                  <TableHead className="text-gray-300 font-bold h-12 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-gray-400 text-sm">Loading handovers...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-1">
                        <Calendar className="w-8 h-8 mb-2 opacity-20" />
                        <span>No handovers found for the selected criteria.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((row) => (
                    <TableRow key={row.id} className="border-white/10 hover:bg-white/5 transition-colors group">
                      <TableCell className="font-medium text-blue-100">
                        {format(new Date(row.handover_date), 'dd/MM/yyyy')}
                        <div className="text-[10px] text-gray-500 font-normal">
                          {format(new Date(row.created_at || row.handover_date), 'hh:mm a')}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{row.created_by_name || user?.name || '—'}</TableCell>
                      <TableCell className="text-center">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs text-gray-400 uppercase tracking-tighter">
                          {row.department_name || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="text-white font-bold hover:underline decoration-white/30 underline-offset-4 cursor-pointer flex items-center gap-1"
                          onClick={() => openEditModal(row)}
                        >
                          ₹ {Number(row.grand_total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </button>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full font-bold tracking-widest uppercase border transition-all ${
                          row.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20 group-hover:bg-green-500/20' :
                          row.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20 group-hover:bg-red-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20 group-hover:bg-amber-500/20'
                        }`}>
                          {row.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-6 p-4 border-t border-white/10 mt-0">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 font-medium">Page {currentPage} of {totalPages || 1}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden sm:inline">Rows per page:</span>
              <Select value={String(itemsPerPage)} onValueChange={(val) => { setItemsPerPage(Number(val)); setSkip(0); }}>
                <SelectTrigger className="h-8 w-[70px] bg-transparent border-white/10 text-white text-xs">
                  <SelectValue placeholder={String(itemsPerPage)} />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10 text-white">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => { setSkip(Math.max(0, skip - itemsPerPage)); window.scrollTo(0, 0); }} 
              disabled={skip === 0} 
              className="h-9 w-9 rounded-full border border-white/10 bg-transparent hover:bg-white/10 text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => { setSkip(skip + itemsPerPage); window.scrollTo(0, 0); }} 
              disabled={skip + itemsPerPage >= filteredList.length} 
              className="h-9 w-9 rounded-full border border-white/10 bg-transparent hover:bg-white/10 text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) setEditingRow(null); }}>
        <DialogContent className="glass-pane border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between pr-8">
            <div className="flex-1">
              <DialogTitle className="text-2xl">Update Handover Details</DialogTitle>
              {editingRow && <p className="text-sm text-gray-400 mt-1">{isViewOnly ? 'View only — handover already approved.' : 'Edit amounts and save when not yet approved.'}</p>}
            </div>
            {editingRow && (
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${
                editingRow.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                editingRow.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                'bg-amber-500/20 text-amber-400 border-amber-500/50'
              }`}>
                {editingRow.status === 'pending' ? 'PENDING' : editingRow.status === 'approved' ? 'APPROVED' : 'REJECTED'}
              </span>
            )}
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div className="flex flex-col gap-2 w-full">
                <Label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider pl-1">Date</Label>
                <DatePicker
                  value={handoverDate}
                  onChange={(d) => d && !editingRow && setHandoverDate(format(d, 'yyyy-MM-dd'))}
                  disabled={isViewOnly || !!editingRow}
                  className="w-full h-10 sm:h-11"
                />
              </div>
              <div className="flex flex-col gap-2 w-full">
                <Label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider pl-1">Departmen</Label>
                <Input
                  readOnly
                  className="cursor-default opacity-90 h-10 sm:h-11 w-full font-medium"
                  value={editingRow?.department_name || user?.department_name || 'Department Name'}
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">Collection Details</h3>
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-white/5">
                      <TableHead className="text-left py-3 px-4 text-gray-400 text-[10px] font-bold uppercase">S.NO</TableHead>
                      <TableHead className="text-left py-3 px-4 text-gray-400 text-[10px] font-bold uppercase">MODE</TableHead>
                      <TableHead className="text-left py-3 px-4 text-gray-400 text-[10px] font-bold uppercase">AMOUNT ₹</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods.map((p, i) => (
                      <TableRow key={p.id} className="border-t border-white/10 ">
                        <TableCell className="p-2">{String.fromCharCode(65 + i)}</TableCell>
                        <TableCell className="p-2">{p.name}</TableCell>
                        <TableCell className="p-2">
                          {isViewOnly ? (
                            <span className="font-medium text-white">₹ {Number(collectionAmounts[p.id] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                    <TableRow className="border-t border-white/10 bg-white/5 font-semibold">
                      <TableCell className="p-3" colSpan={2}>GRAND TOTAL</TableCell>
                      <TableCell className="p-3">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
                      <TableHead className="text-left py-3 px-4 text-gray-400 text-[10px] font-bold uppercase">S.NO</TableHead>
                      <TableHead className="text-left py-3 px-4 text-gray-400 text-[10px] font-bold uppercase">PARTICULAR</TableHead>
                      <TableHead className="text-right py-3 px-4 text-gray-400 text-[10px] font-bold uppercase">AMOUNT ₹</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-t border-white/10">
                      <TableCell className="py-3 px-4">A</TableCell>
                      <TableCell className="py-3 px-4">CASH COLLECTION</TableCell>
                      <TableCell className="py-3 px-4 font-medium text-right font-mono">₹ {numCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                    <TableRow className="border-t border-white/10">
                      <TableCell className="py-3 px-4">B</TableCell>
                      <TableCell className="py-3 px-4">PHYSICAL CASH AT DESK</TableCell>
                      <TableCell className="py-3 px-4 flex justify-end">
                        {isViewOnly ? <span className="font-medium text-white font-mono">₹ {physicalNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : <Input type="number" min={0} step={0.01} className="glass-input w-32 text-right" value={physicalCashAtDesk} onChange={e => setPhysicalCashAtDesk(e.target.value)} />}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t border-white/10">
                      <TableCell className="py-3 px-4">C</TableCell>
                      <TableCell className="py-3 px-4">DIFFERENCE (B - A)</TableCell>
                      <TableCell className={`py-3 px-4 font-bold text-right font-mono ${difference > 0 ? 'text-yellow-400' : difference < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        ₹ {difference.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
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
                      <TableCell className="p-3">IMPREST AMOUNT</TableCell>
                      <TableCell className="p-3">
                        {isViewOnly ? <span className="font-medium text-white">₹ {imprestNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : <Input type="number" min={0} step={0.01} className="glass-input w-32" value={imprestAmount} onChange={e => setImprestAmount(e.target.value)} />}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t border-white/10">
                      <TableCell className="p-2">B</TableCell>
                      <TableCell className="p-3">LESS PAYMENT</TableCell>
                      <TableCell className="p-3">
                        {isViewOnly ? <span className="font-medium text-white">₹ {lessNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : <Input type="number" min={0} step={0.01} className="glass-input w-32" value={lessPayment} onChange={e => setLessPayment(e.target.value)} />}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t border-white/10 bg-white/5 font-bold">
                      <TableCell className="p-3">C</TableCell>
                      <TableCell className="p-3">NET IMPREST AMOUNT (A - B)</TableCell>
                      <TableCell className="p-3">₹ {netImprest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="w-full">
              <Label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider pl-1 font-semibold">Remarks</Label>
              {isViewOnly ? (
                <div className="mt-2 w-full text-sm text-white p-4 min-h-[120px] rounded-md border border-white/10 whitespace-pre-wrap leading-relaxed">
                  {remarks || '—'}
                </div>
              ) : (
                <Textarea
                  className="mt-2 w-full min-h-[120px]  text-white p-4 text-base focus:border-primary/50"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Enter remarks here..."
                />
              )}
            </div>

            {isViewOnly && (editingRow?.approval_remark || editingRow?.rejection_remark) && (
              <div className="w-full">
                <Label className="text-blue-400 text-[10px] font-bold uppercase tracking-wider pl-1">Finance (Review) Remarks</Label>
                <div className="mt-2 w-full text-sm text-white p-4 rounded-md border border-blue-500/20 bg-blue-500/5 whitespace-pre-wrap leading-relaxed">
                  {editingRow?.approval_remark || editingRow?.rejection_remark || '—'}
                </div>
              </div>
            )}

            {isViewOnly && (editingRow?.approval_remark_admin || editingRow?.rejection_remark_admin) && (
              <div className="w-full">
                <Label className="text-purple-400 text-[10px] font-bold uppercase tracking-wider pl-1">Admin (Review) Remarks</Label>
                <div className="mt-2 w-full text-sm text-white p-4 rounded-md border border-purple-500/20 bg-purple-500/5 whitespace-pre-wrap leading-relaxed">
                  {editingRow?.approval_remark_admin || editingRow?.rejection_remark_admin || '—'}
                </div>
              </div>
            )}
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
