import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import {
  listPaymentMethods,
  listDepartments,
  listCashierReports,
  createCashierReport,
  handoversSummary,
  approveHandover,
  rejectHandover,
  approveHandoverAdmin,
  rejectHandoverAdmin,
  updateHandover,
  listBankTallyEntries,
  getBankTally,
  saveBankTally,
  listCashTallyEntries,
  getCashTally,
  saveCashTally,
  listCashDenominations,
} from '@/lib/api/settings';
import { listEntityUsers } from '@/lib/api/organisation';
import { getOrganisationBankAccounts } from '@/lib/api';
import { getVouchersCashTotalForDate, getVouchersReportByDate, getVoucherAttachment } from '@/lib/api/finance';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MoreVertical, Calendar, ArrowLeftRight, ArrowLeft, Loader2, Check, X, ChevronLeft, ChevronRight, Paperclip, Upload } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import AnimatedSearch from '@/components/ui/AnimatedSearch';

const toDDMMYYYY = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' && dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr);
    return format(d, 'dd/MM/yyyy');
  } catch { return dateStr; }
};

const ClientHandoverPage = ({ entityId, entityName }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const clientId = entityId;
  const isAdminOnly = user?.role === 'CLIENT_MASTER_ADMIN';

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
    <div className="p-4 sm:p-6 lg:p-8 text-white">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Handover</h1>
        <p className="text-gray-400 text-sm sm:text-base">
          {isAdminOnly ? 'Bank tally, cash tally and handover approval.' : 'Cashier report and handover approval.'}
        </p>
      </div>
      {isAdminOnly ? (
        <Tabs defaultValue="handover" className="w-full space-y-4">
          <TabsList className="text-xs sm:text-sm bg-white/5 border border-white/10">
            <TabsTrigger value="handover" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-white">Handover</TabsTrigger>
            <TabsTrigger value="bank-tally" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-white">Bank Tally</TabsTrigger>
            <TabsTrigger value="cash-tally" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-white">Cash Tally</TabsTrigger>
            <TabsTrigger value="report" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-white">Report</TabsTrigger>
          </TabsList>
          <TabsContent value="handover">
            <HandoverTab clientId={clientId} token={user?.access_token} toast={toast} isAdminView userRole={user?.role} />
          </TabsContent>
          <TabsContent value="bank-tally">
            <BankTallyTab clientId={clientId} token={user?.access_token} toast={toast} />
          </TabsContent>
          <TabsContent value="cash-tally">
            <CashTallyTab clientId={clientId} entityId={clientId} token={user?.access_token} toast={toast} />
          </TabsContent>
          <TabsContent value="report">
            <ReportTab clientId={clientId} entityId={clientId} entityName={entityName} token={user?.access_token} toast={toast} />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="cashier" className="w-full space-y-4">
          <TabsList className="text-xs sm:text-sm bg-white/5 border border-white/10">
            <TabsTrigger value="cashier" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-white">Cashier Report</TabsTrigger>
            <TabsTrigger value="handover" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-white">Handover</TabsTrigger>
          </TabsList>
          <TabsContent value="cashier">
            <CashierReportTab clientId={clientId} token={user?.access_token} toast={toast} />
          </TabsContent>
          <TabsContent value="handover">
            <HandoverTab clientId={clientId} token={user?.access_token} toast={toast} userRole={user?.role} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

/** Bank Tally: list only. Click row → navigate to entry page. Add from main Add New. */
function BankTallyListTab({ clientId, token, toast, readOnly = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [entriesList, setEntriesList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [banks, setBanks] = useState([]);
  const [banksLoaded, setBanksLoaded] = useState(false);
  const [datePreset, setDatePreset] = useState('all_time');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadBanks = useCallback(async () => {
    if (!clientId || !token) return;
    try {
      const list = await getOrganisationBankAccounts(clientId, token);
      setBanks(Array.isArray(list) ? list.filter(b => b.is_active !== false) : []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load bank accounts.' });
      setBanks([]);
    } finally {
      setBanksLoaded(true);
    }
  }, [clientId, token, toast]);

  const loadEntriesList = useCallback(async () => {
    if (!clientId || !token) return;
    setListLoading(true);
    try {
      const res = await listBankTallyEntries(clientId, token);
      setEntriesList(res?.entries || []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load list.' });
      setEntriesList([]);
    } finally {
      setListLoading(false);
    }
  }, [clientId, token, toast]);

  useEffect(() => { loadBanks(); }, [loadBanks]);
  useEffect(() => { loadEntriesList(); }, [loadEntriesList]);
  useEffect(() => {
    const isListRoute = !/\/entry\/|\/new$/.test(location.pathname);
    if (isListRoute) loadEntriesList();
  }, [location.pathname, loadEntriesList]);

  const filteredList = useMemo(() => {
    let list = entriesList;
    if (datePreset !== 'all_time') {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date();
      list = list.filter(e => {
        const d = (e.report_date || '').toString();
        if (datePreset === 'today') return d === today;
        if (datePreset === 'custom' && (dateFrom || dateTo)) {
          if (dateFrom && dateTo) return d >= dateFrom && d <= dateTo;
          if (dateFrom) return d >= dateFrom;
          if (dateTo) return d <= dateTo;
        }
        if (datePreset === 'last_7_days' || datePreset === 'last_30_days') {
          const n = datePreset === 'last_7_days' ? 7 : 30;
          const from = new Date(now);
          from.setDate(from.getDate() - n);
          return d >= from.toISOString().slice(0, 10) && d <= today;
        }
        return true;
      });
    }
    if (searchTerm && searchTerm.trim()) {
      const t = searchTerm.toLowerCase().trim();
      list = list.filter(e => toDDMMYYYY(e.report_date).toLowerCase().includes(t) || (e.report_date || '').toString().includes(t));
    }
    return list;
  }, [entriesList, datePreset, dateFrom, dateTo, searchTerm]);

  if (!banksLoaded) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (banks.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        No active bank accounts. Add banks under Organisation Bank.
      </div>
    );
  }

  return (
    <Card className="glass-card mt-4">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-between w-full">
            <CardTitle className="text-lg sm:text-xl text-white">Bank Tally</CardTitle>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-1 justify-end">
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm glass-input">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <SelectValue placeholder="All Time" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_time">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                <AnimatedSearch
                  placeholder="Date..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              {datePreset === 'custom' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:max-w-[130px] h-9 text-sm glass-input" />
                  <span className="text-gray-400 text-sm">-</span>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:max-w-[130px] h-9 text-sm glass-input" />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {listLoading ? (
          <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={1} className="text-center text-gray-400 py-8 text-sm">No entries found.</TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((entry) => (
                    <TableRow
                      key={entry.report_date}
                      className="cursor-pointer transition-colors hover:bg-white/5"
                      onClick={() => navigate('entry/' + encodeURIComponent(entry.report_date))}
                    >
                      <TableCell className="text-xs sm:text-sm">{toDDMMYYYY(entry.report_date)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Bank Tally form on its own page (add or view/update). */
function BankTallyFormPage({ clientId, token, toast, readOnly = false }) {
  const navigate = useNavigate();
  const { reportDate: reportDateParam } = useParams();
  const today = new Date().toISOString().slice(0, 10);
  const isNew = !reportDateParam || reportDateParam === 'new';
  const reportDate = isNew ? today : reportDateParam;

  const [banks, setBanks] = useState([]);
  const [banksLoaded, setBanksLoaded] = useState(false);
  const [tallyItems, setTallyItems] = useState([]);
  const [closingInputs, setClosingInputs] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadBanks = useCallback(async () => {
    if (!clientId || !token) return;
    try {
      const list = await getOrganisationBankAccounts(clientId, token);
      setBanks(Array.isArray(list) ? list.filter(b => b.is_active !== false) : []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load bank accounts.' });
      setBanks([]);
    } finally {
      setBanksLoaded(true);
    }
  }, [clientId, token, toast]);

  const loadTally = useCallback(async (date) => {
    if (!clientId || !token || banks.length === 0) return;
    setLoading(true);
    try {
      const ids = banks.map(b => b.id);
      const res = await getBankTally(clientId, date, ids, token);
      const items = res?.items || [];
      setTallyItems(items);
      const next = {};
      items.forEach((item) => {
        const id = item.bank_account_id;
        next[id] = item.closing_balance != null ? String(item.closing_balance) : '';
      });
      banks.forEach((b) => {
        if (next[b.id] === undefined) next[b.id] = '';
      });
      setClosingInputs(next);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load bank tally.' });
      setTallyItems([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, token, banks, toast]);

  useEffect(() => { loadBanks(); }, [loadBanks]);
  useEffect(() => {
    if (banks.length > 0 && reportDate) loadTally(reportDate);
  }, [reportDate, banks.length]);

  const setClosing = (bankId, value) => {
    setClosingInputs(prev => ({ ...prev, [bankId]: value }));
  };
  const getOpening = (bankId) => {
    const item = tallyItems.find(i => String(i.bank_account_id) === String(bankId));
    return item?.opening_balance ?? 0;
  };
  const getDifference = (bankId) => {
    const opening = getOpening(bankId);
    const closing = parseFloat(closingInputs[bankId]);
    if (closing === undefined || closing === '' || isNaN(closing)) return null;
    return closing - opening;
  };

  const isPastDate = reportDate < today;
  const isReadOnly = readOnly || isPastDate;

  const handleSave = async () => {
    if (!clientId || !token) return;
    setSaving(true);
    try {
      const items = banks.map((b) => ({
        bank_account_id: b.id,
        closing_balance: parseFloat(closingInputs[b.id]) || 0,
      }));
      await saveBankTally(clientId, { report_date: reportDate, items }, token);
      toast({ title: 'Saved', description: 'Bank tally saved.' });
      navigate('..', { relative: 'path' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  if (!banksLoaded) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (banks.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        No active bank accounts. Add banks under Organisation Bank.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white -ml-2" onClick={() => navigate('..', { relative: 'path' })}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
      </Button>
      <Card className="glass-card border-white/5 overflow-hidden">
        <CardHeader className="p-4 sm:p-6 flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg sm:text-xl text-white">{isNew ? 'New entry' : 'View / Update'}</CardTitle>
            <CardDescription className="text-sm text-gray-400">Opening and closing balance by bank account.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" className="glass-input max-w-[200px]" value={reportDate} readOnly />
            {!isReadOnly && (
              <Button onClick={handleSave} disabled={saving} className="h-9 sm:h-10 text-sm">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="glass-table">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/10">
                  <TableHead className="text-xs sm:text-sm text-gray-300">Bank</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Account</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Opening Balance</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Closing Balance</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !tallyItems.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-white" /></TableCell>
                  </TableRow>
                ) : (
                  <>
                    {banks.map((bank) => {
                      const opening = getOpening(bank.id);
                      const closingVal = closingInputs[bank.id];
                      const diff = getDifference(bank.id);
                      return (
                        <TableRow key={bank.id} className="border-white/10">
                          <TableCell className="text-xs sm:text-sm font-medium text-white">{bank.bank_name || '—'}</TableCell>
                          <TableCell className="text-xs sm:text-sm text-gray-300">{bank.account_number || '—'}</TableCell>
                          <TableCell>
                            <Input type="number" readOnly className="h-9 sm:h-10 text-sm glass-input w-28 sm:w-32 bg-white/5 text-white" value={opening} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} step={0.01} readOnly={isReadOnly} className={`h-9 sm:h-10 text-sm glass-input w-28 sm:w-32 text-white ${isReadOnly ? 'bg-white/5 cursor-default' : ''}`} value={closingVal} onChange={e => setClosing(bank.id, e.target.value)} placeholder="Closing" />
                          </TableCell>
                          <TableCell>
                            <Input type="text" readOnly className="h-9 sm:h-10 text-sm glass-input w-28 sm:w-32 bg-white/5 text-white" value={diff != null ? diff.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {banks.length > 0 && (() => {
                      const totalOpening = banks.reduce((s, b) => s + getOpening(b.id), 0);
                      const totalClosing = banks.reduce((s, b) => s + (parseFloat(closingInputs[b.id]) || 0), 0);
                      const totalDiff = totalClosing - totalOpening;
                      return (
                        <TableRow className="border-white/10 !bg-amber-500/20 font-medium">
                          <TableCell className="text-xs sm:text-sm text-white">Total</TableCell>
                          <TableCell className="text-xs sm:text-sm text-gray-300">—</TableCell>
                          <TableCell>
                            <Input type="text" readOnly className="h-9 sm:h-10 text-sm glass-input w-28 sm:w-32 bg-white/5 text-white font-medium" value={totalOpening.toLocaleString('en-IN', { minimumFractionDigits: 2 })} />
                          </TableCell>
                          <TableCell>
                            <Input type="text" readOnly className="h-9 sm:h-10 text-sm glass-input w-28 sm:w-32 bg-white/5 text-white font-medium" value={totalClosing.toLocaleString('en-IN', { minimumFractionDigits: 2 })} />
                          </TableCell>
                          <TableCell>
                            <Input type="text" readOnly className="h-9 sm:h-10 text-sm glass-input w-28 sm:w-32 bg-white/5 text-white font-medium" value={totalDiff.toLocaleString('en-IN', { minimumFractionDigits: 2 })} />
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Cash Tally: list only. Click row → entry page. Add from main Add New. */
function CashTallyListTab({ clientId, entityId, token, toast, readOnly = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [entriesList, setEntriesList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [datePreset, setDatePreset] = useState('all_time');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadEntriesList = useCallback(async () => {
    if (!clientId || !token) return;
    setListLoading(true);
    try {
      const res = await listCashTallyEntries(clientId, token);
      setEntriesList(res?.entries || []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load list.' });
      setEntriesList([]);
    } finally {
      setListLoading(false);
    }
  }, [clientId, token, toast]);

  useEffect(() => { loadEntriesList(); }, [loadEntriesList]);
  useEffect(() => {
    const isListRoute = !/\/entry\/|\/new$/.test(location.pathname);
    if (isListRoute) loadEntriesList();
  }, [location.pathname, loadEntriesList]);

  const filteredList = useMemo(() => {
    let list = entriesList;
    if (datePreset !== 'all_time') {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date();
      list = list.filter(e => {
        const d = (e.report_date || '').toString();
        if (datePreset === 'today') return d === today;
        if (datePreset === 'custom' && (dateFrom || dateTo)) {
          if (dateFrom && dateTo) return d >= dateFrom && d <= dateTo;
          if (dateFrom) return d >= dateFrom;
          if (dateTo) return d <= dateTo;
        }
        if (datePreset === 'last_7_days' || datePreset === 'last_30_days') {
          const n = datePreset === 'last_7_days' ? 7 : 30;
          const from = new Date(now);
          from.setDate(from.getDate() - n);
          return d >= from.toISOString().slice(0, 10) && d <= today;
        }
        return true;
      });
    }
    if (searchTerm && searchTerm.trim()) {
      const t = searchTerm.toLowerCase().trim();
      list = list.filter(e => toDDMMYYYY(e.report_date).toLowerCase().includes(t) || (e.report_date || '').toString().includes(t) || String(e.closing_balance || '').includes(t));
    }
    return list;
  }, [entriesList, datePreset, dateFrom, dateTo, searchTerm]);

  return (
    <Card className="glass-card mt-4">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-between w-full">
            <CardTitle className="text-lg sm:text-xl text-white">Cash Tally</CardTitle>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-1 justify-end">
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm glass-input">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <SelectValue placeholder="All Time" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_time">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                <AnimatedSearch
                  placeholder="Date, Closing..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              {datePreset === 'custom' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:max-w-[130px] h-9 text-sm glass-input" />
                  <span className="text-gray-400 text-sm">-</span>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:max-w-[130px] h-9 text-sm glass-input" />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {listLoading ? (
          <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Date</TableHead>
                  <TableHead className="text-xs sm:text-sm">Closing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-gray-400 py-8 text-sm">No entries found.</TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((entry) => (
                    <TableRow
                      key={entry.report_date}
                      className="cursor-pointer transition-colors hover:bg-white/5"
                      onClick={() => navigate('entry/' + encodeURIComponent(entry.report_date))}
                    >
                      <TableCell className="text-xs sm:text-sm">{toDDMMYYYY(entry.report_date)}</TableCell>
                      <TableCell className="text-xs sm:text-sm">₹ {(entry.closing_balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Cash Tally form on its own page (add or view/update). */
function CashTallyFormPage({ clientId, entityId, token, toast, readOnly = false }) {
  const navigate = useNavigate();
  const { reportDate: reportDateParam } = useParams();
  const today = new Date().toISOString().slice(0, 10);
  const isNew = !reportDateParam || reportDateParam === 'new';
  const reportDate = isNew ? today : reportDateParam;

  const [openingBalance, setOpeningBalance] = useState(0);
  const [cashInHandover, setCashInHandover] = useState(0);
  const [cashInOther, setCashInOther] = useState('');
  const [cashOut, setCashOut] = useState(0);
  const [denominationDetails, setDenominationDetails] = useState({});
  const [denominations, setDenominations] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const cashInOtherNum = parseFloat(cashInOther) || 0;
  const closingBalance = openingBalance + cashInHandover + cashInOtherNum - cashOut;
  const isPastDate = reportDate < today;
  const isReadOnly = readOnly || isPastDate;

  const loadData = useCallback(async (date) => {
    if (!clientId || !token) return;
    setLoading(true);
    try {
      const [tallyRes, cashTotal, denomList] = await Promise.all([
        getCashTally(clientId, date, token),
        entityId ? getVouchersCashTotalForDate(entityId, date, token) : Promise.resolve(0),
        listCashDenominations(clientId, token),
      ]);
      setOpeningBalance(Number(tallyRes?.opening_balance) || 0);
      setCashInHandover(Number(tallyRes?.cash_in_handover) || 0);
      setCashOut(Number(cashTotal) || 0);
      setDenominations(Array.isArray(denomList) ? denomList : []);
      if (tallyRes?.cash_in_other != null) setCashInOther(String(tallyRes.cash_in_other));
      else setCashInOther('');
      if (tallyRes?.denomination_details && typeof tallyRes.denomination_details === 'object') {
        const next = {};
        Object.entries(tallyRes.denomination_details).forEach(([k, v]) => { next[String(k)] = Number(v) || 0; });
        setDenominationDetails(next);
      } else setDenominationDetails({});
      if (tallyRes?.remarks != null) setRemarks(String(tallyRes.remarks));
      else setRemarks('');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load cash tally.' });
    } finally {
      setLoading(false);
    }
  }, [clientId, entityId, token, toast]);

  useEffect(() => {
    if (reportDate) loadData(reportDate);
  }, [reportDate]);

  const setUnits = (denomId, value) => {
    setDenominationDetails(prev => ({ ...prev, [String(denomId)]: value === '' ? 0 : (parseFloat(value) || 0) }));
  };
  const getUnits = (denomId) => denominationDetails[String(denomId)] ?? 0;
  const denominationTotal = denominations.reduce((sum, d) => {
    const units = getUnits(d.id);
    return sum + (Number(d.value) || 0) * (Number(units) || 0);
  }, 0);
  const varianceAmount = closingBalance - denominationTotal;

  const handleSubmit = async () => {
    if (!clientId || !token) return;
    setSaving(true);
    try {
      const payload = {
        report_date: reportDate,
        cash_in_handover: cashInHandover,
        cash_in_other: cashInOtherNum,
        cash_out: cashOut,
        closing_balance: closingBalance,
        denomination_details: Object.fromEntries(
          Object.entries(denominationDetails).filter(([, u]) => u != null && Number(u) !== 0)
        ),
        remarks: remarks.trim(),
      };
      await saveCashTally(clientId, payload, token);
      toast({ title: 'Saved', description: 'Cash tally saved.' });
      navigate('..', { relative: 'path' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white -ml-2" onClick={() => navigate('..', { relative: 'path' })}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
      </Button>
      <Card className="glass-card border-white/5">
        <CardHeader className="p-4 sm:p-6 flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg sm:text-xl text-white">{isNew ? 'New entry' : 'View / Update'}</CardTitle>
            <CardDescription className="text-sm text-gray-400">Cash in hand, denomination breakdown and remarks.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input type="date" className="glass-input max-w-[200px]" value={reportDate} readOnly />
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 border-b border-white/10 pb-2">Cash in hand</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
              <div>
                <Label className="text-gray-400 text-xs">Opening Balance</Label>
                <Input type="number" readOnly className="h-9 sm:h-10 text-sm glass-input mt-1 bg-white/5 text-white" value={openingBalance} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Cash In – Approved handover</Label>
                <Input type="number" readOnly className="h-9 sm:h-10 text-sm glass-input mt-1 bg-white/5 text-white" value={cashInHandover || ''} placeholder="—" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Cash In – Other</Label>
                <Input type="number" min={0} step={0.01} readOnly={isReadOnly} className={`h-9 sm:h-10 text-sm glass-input mt-1 text-white ${isReadOnly ? 'bg-white/5 cursor-default' : ''}`} value={cashInOther} onChange={e => setCashInOther(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Cash Out</Label>
                <Input type="number" readOnly className="h-9 sm:h-10 text-sm glass-input mt-1 bg-white/5 text-white" value={cashOut} />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Closing Balance</Label>
                <Input type="number" readOnly className="h-9 sm:h-10 text-sm glass-input mt-1 bg-white/5 text-white" value={closingBalance} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3 border-b border-white/10 pb-2">Cash denomination</h3>
            {loading && !denominations.length ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>
            ) : denominations.length === 0 ? (
              <p className="text-gray-400 py-4 text-sm">Add denominations in Settings → Cash Denomination.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-white/10">
                        <TableHead className="text-xs sm:text-sm text-gray-300">Denomination</TableHead>
                        <TableHead className="text-xs sm:text-sm text-gray-300">Units</TableHead>
                        <TableHead className="text-xs sm:text-sm text-gray-300">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {denominations.map((d) => {
                        const units = getUnits(d.id);
                        const total = (Number(d.value) || 0) * (Number(units) || 0);
                        return (
                          <TableRow key={d.id} className="border-white/10">
                            <TableCell className="text-xs sm:text-sm font-medium text-white">₹ {Number(d.value).toLocaleString('en-IN')} x</TableCell>
                            <TableCell>
                              <Input type="number" min={0} step={1} readOnly={isReadOnly} className={`h-9 sm:h-10 text-sm glass-input w-24 text-white ${isReadOnly ? 'bg-white/5 cursor-default' : ''}`} value={units || ''} onChange={e => setUnits(d.id, e.target.value)} placeholder="0" />
                            </TableCell>
                            <TableCell>
                              <Input type="text" readOnly className="h-9 sm:h-10 text-sm glass-input w-32 bg-white/5 text-white" value={total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                  <div>
                    <Label className="text-gray-400 text-sm">Total Amount ₹</Label>
                    <Input type="text" readOnly className="h-9 sm:h-10 text-sm glass-input mt-1 bg-amber-500/10 text-white" value={denominationTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Variance Amount ₹</Label>
                    <Input type="text" readOnly className="h-9 sm:h-10 text-sm glass-input mt-1 bg-amber-500/10 text-white" value={varianceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} />
                  </div>
                </div>
              </>
            )}
          </div>

          <div>
            <Label className="text-gray-400 text-sm">Remarks</Label>
            <Textarea readOnly={isReadOnly} className={`h-9 sm:min-h-[80px] text-sm glass-input !w-full !pl-3 mt-1 text-white ${isReadOnly ? 'bg-white/5 cursor-default' : ''}`} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Remarks..." />
          </div>

          {!isReadOnly && (
            <Button onClick={handleSubmit} disabled={saving || loading} className="h-9 sm:h-10 text-sm">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Cashier Report: list only. Click row → entry page. Add from main Add New. */
function CashierReportListTab({ clientId, token, toast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [entriesList, setEntriesList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [datePreset, setDatePreset] = useState('all_time');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const loadList = useCallback(async () => {
    if (!clientId || !token) return;
    setListLoading(true);
    try {
      const list = await listCashierReports(clientId, token, {});
      setEntriesList(Array.isArray(list) ? list : []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load list.' });
      setEntriesList([]);
    } finally {
      setListLoading(false);
    }
  }, [clientId, token, toast]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => {
    const isListRoute = !/\/entry\/|\/new$/.test(location.pathname);
    if (isListRoute) loadList();
  }, [location.pathname, loadList]);

  const filteredList = useMemo(() => {
    let list = entriesList;
    if (datePreset !== 'all_time') {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date();
      list = list.filter(e => {
        const d = (e.report_date || '').toString();
        if (datePreset === 'today') return d === today;
        if (datePreset === 'custom' && (dateFrom || dateTo)) {
          if (dateFrom && dateTo) return d >= dateFrom && d <= dateTo;
          if (dateFrom) return d >= dateFrom;
          if (dateTo) return d <= dateTo;
        }
        if (datePreset === 'last_7_days' || datePreset === 'last_30_days') {
          const n = datePreset === 'last_7_days' ? 7 : 30;
          const from = new Date(now);
          from.setDate(from.getDate() - n);
          return d >= from.toISOString().slice(0, 10) && d <= today;
        }
        return true;
      });
    }
    if (searchTerm && searchTerm.trim()) {
      const t = searchTerm.toLowerCase().trim();
      list = list.filter(e => toDDMMYYYY(e.report_date).toLowerCase().includes(t) || (e.report_date || '').toString().includes(t) || (e.remarks || '').toLowerCase().includes(t));
    }
    return list;
  }, [entriesList, datePreset, dateFrom, dateTo, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, datePreset, dateFrom, dateTo]);

  const totalPages = Math.ceil((filteredList?.length || 0) / ITEMS_PER_PAGE);
  const paginatedList = filteredList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <Card className="glass-card mt-4">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-between w-full">
            <CardTitle className="text-lg sm:text-xl text-white">Cashier Report</CardTitle>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-1 justify-end">
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm glass-input">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <SelectValue placeholder="All Time" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_time">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                <AnimatedSearch
                  placeholder="Date, Remarks..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              {datePreset === 'custom' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:max-w-[130px] h-9 text-sm glass-input" />
                  <span className="text-gray-400 text-sm">-</span>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:max-w-[130px] h-9 text-sm glass-input" />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {listLoading ? (
          <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Date</TableHead>
                  <TableHead className="text-xs sm:text-sm">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-gray-400 py-8 text-sm">No reports found.</TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((report) => (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer transition-colors hover:bg-white/5"
                      onClick={() => navigate('entry/' + encodeURIComponent(report.report_date))}
                    >
                      <TableCell className="text-xs sm:text-sm">{toDDMMYYYY(report.report_date)}</TableCell>
                      <TableCell className="text-xs sm:text-sm max-w-[200px] truncate" title={report.remarks || ''}>{report.remarks || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-row justify-center items-center gap-3 p-4 sm:p-6 border-t border-white/10">
        <div><p className="text-xs sm:text-sm text-gray-400">Page {currentPage} of {totalPages}</p></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/10 bg-transparent hover:bg-white/10 text-white">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/10 bg-transparent hover:bg-white/10 text-white">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function CashierReportFormPage({ clientId, token, toast }) {
  const navigate = useNavigate();
  const { reportDate: reportDateParam } = useParams();
  const today = new Date().toISOString().slice(0, 10);
  const isNew = !reportDateParam || reportDateParam === 'new';
  const reportDate = isNew ? today : reportDateParam;

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [remarks, setRemarks] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

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

  // Load cashier report and handover status when date changes
  useEffect(() => {
    if (!clientId || !token || departments.length === 0 || paymentMethods.length === 0) return;
    const loadReport = async () => {
      setLoadingReport(true);
      try {
        const [reports, summary] = await Promise.all([
          listCashierReports(clientId, token, { report_date: reportDate }),
          handoversSummary(clientId, reportDate, token).catch(() => ({ items: [] })),
        ]);
        const list = Array.isArray(reports) ? reports : [];
        if (list.length > 0) {
          const r = list[0];
          const details = r.details || {};
          const nextMatrix = {};
          departments.forEach(d => {
            nextMatrix[d.id] = {};
            paymentMethods.forEach(p => {
              const v = details[d.id]?.[p.id];
              nextMatrix[d.id][p.id] = v != null ? String(v) : '';
            });
          });
          setMatrix(nextMatrix);
          setRemarks(r.remarks || '');
          setAttachment(r.attachment_id || null);
        } else {
          setMatrix({});
          setRemarks('');
          setAttachment(null);
        }
        const items = summary?.items || [];
        const approved = items.length > 0 && items.every(i => i.status === 'approved');
        setReadOnly(approved);
      } catch (e) {
        setMatrix({});
        setRemarks('');
        setReadOnly(false);
      } finally {
        setLoadingReport(false);
      }
    };
    loadReport();
  }, [clientId, token, reportDate, departments, paymentMethods]);

  const setCell = (deptId, pmId, value) => {
    if (readOnly) return;
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
    if (!clientId || !token || readOnly) return;
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
      if (attachment && typeof attachment !== 'string') {
        const formData = new FormData();
        formData.append('report_date', reportDate);
        formData.append('remarks', remarks);
        formData.append('details', JSON.stringify(details));
        formData.append('attachment', attachment);
        await createCashierReport(clientId, formData, token);
      } else {
        await createCashierReport(clientId, { report_date: reportDate, details, remarks }, token);
      }
      toast({ title: 'Success', description: 'Cashier report submitted.' });
      navigate('..', { relative: 'path' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Submit failed.' });
    } finally {
      setSubmitting(false);
    }
  };
  const handleViewAttachment = async () => {
    if (!attachment || typeof attachment !== 'string') return;
    try {
      const res = await getVoucherAttachment(attachment, token);
      if (res && res.url) {
        window.open(res.url, '_blank');
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load attachment sheet.' });
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white -ml-2" onClick={() => navigate('..', { relative: 'path' })}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
      </Button>
      <Card className="glass-card border-white/5">
        <CardHeader className="p-4 sm:p-6 flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg sm:text-xl text-white">{isNew ? 'New report' : 'View / Update'}</CardTitle>
            <CardDescription className="text-sm text-gray-400">Enter amounts by department and payment method for the selected date.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" className="h-9 sm:h-10 text-sm glass-input w-40 text-white" value={reportDate} readOnly />
            <Button onClick={handleSubmit} disabled={submitting || readOnly} className="h-9 sm:h-10 text-sm">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit
            </Button>
            {readOnly && <span className="text-xs text-amber-400">Handover approved — view only</span>}
          </div>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          {loadingReport && (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>
          )}
          {!loadingReport && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/10">
                    <TableHead className="text-xs sm:text-sm text-gray-300 bg-white/5">Department</TableHead>
                    {paymentMethods.map(p => (
                      <TableHead key={p.id} className="text-xs sm:text-sm text-gray-300 bg-white/5">{p.name}</TableHead>
                    ))}
                    <TableHead className="text-xs sm:text-sm text-gray-300 !bg-amber-500/20">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map(d => (
                    <TableRow key={d.id} className="border-white/10">
                      <TableCell className="text-xs sm:text-sm font-medium text-white bg-white/5 ">{d.name}</TableCell>
                      {paymentMethods.map(p => (
                        <TableCell key={p.id}>
                          <Input type="number" min={0} step={0.01} readOnly={readOnly} className={`h-9 sm:h-10 text-sm glass-input !w-24 !pl-3 text-white ${readOnly ? 'cursor-default opacity-90' : ''}`} value={getCell(d.id, p.id)} onChange={e => setCell(d.id, p.id, e.target.value)} />
                        </TableCell>
                      ))}
                      <TableCell className="text-xs sm:text-sm font-medium text-white bg-amber-500/10">{rowTotal(d.id).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-white/10 bg-amber-500/10 font-medium">
                    <TableCell className="text-xs sm:text-sm text-gray-300">Total</TableCell>
                    {paymentMethods.map(p => (
                      <TableCell key={p.id} className="text-xs sm:text-sm text-white">{colTotal(p.id).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                    ))}
                    <TableCell className="text-xs sm:text-sm text-white">{grandTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
          <div className="px-4 sm:px-6">
            <Label className="text-gray-400 text-sm mb-2 block font-medium">Attachment Sheet</Label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                id="cashier-report-attachment"
                className="hidden"
                accept="image/*,application/pdf,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={readOnly}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setAttachment(e.target.files[0]);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 glass-input !w-auto !pl-3 bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-full transition-all"
                onClick={() => document.getElementById('cashier-report-attachment').click()}
                disabled={readOnly}
              >
                <Paperclip className="w-4 h-4 mr-2 text-primary" />
                {attachment ? (typeof attachment === 'string' ? `Change Attachment` : `Selected: ${attachment.name}`) : 'Add Attachment Sheet'}
              </Button>

              {attachment && typeof attachment === 'string' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 glass-input !w-auto !pl-3 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 text-blue-400 rounded-full transition-all"
                  onClick={handleViewAttachment}
                >
                  <Search className="w-4 h-4 mr-2" /> View Sheet
                </Button>
              )}
              {attachment && typeof attachment !== 'string' && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full animate-in fade-in slide-in-from-left-2 duration-300">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Ready to upload</span>
                </div>
              )}
            </div>
          </div>
          <div className="p-4 sm:p-6 pt-2">
            <Label className="text-gray-400 text-sm">Remarks</Label>
            <Input readOnly={readOnly} className={`h-9 sm:h-10 text-sm glass-input !w-full !pl-3 mt-1 text-white ${readOnly ? 'cursor-default opacity-90' : ''}`} value={remarks} onChange={e => !readOnly && setRemarks(e.target.value)} placeholder="Remarks" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CashierReportTab({ clientId, token, toast }) {
  return <CashierReportListTab clientId={clientId} token={token} toast={toast} />;
}

function HandoverTab({ clientId, token, toast, isAdminView = false, userRole, readOnly = false }) {
  const [viewMode, setViewMode] = useState('pending');
  const [datePreset, setDatePreset] = useState('all_time');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [breakdownModal, setBreakdownModal] = useState(null);
  const [actionRemark, setActionRemark] = useState('');
  const [actioning, setActioning] = useState(false);
  const [breakdownEdit, setBreakdownEdit] = useState({});
  const [savingBreakdown, setSavingBreakdown] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!clientId || !token) return;
    setLoading(true);
    try {
      const res = await handoversSummary(clientId, null, token);
      setItems(res?.items || []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load.' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, token, toast]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    if (!clientId || !token) return;
    listPaymentMethods(clientId, token).then(setPaymentMethods).catch(() => setPaymentMethods([]));
  }, [clientId, token]);

  useEffect(() => {
    if (!clientId || !token || items.length === 0) return;
    const ids = [...new Set(items.map(i => i.created_by_user_id))];
    if (ids.length === 0) return;
    listEntityUsers(clientId, token).then(data => {
      const joined = data?.joined_users || [];
      const map = {};
      joined.forEach(u => { map[u.user_id] = u.name || u.email; });
      setUsersMap(map);
    }).catch(() => { });
  }, [clientId, token, items]);

  const handleApprove = async () => {
    if (!actionModal || !clientId || !token) return;
    setActioning(true);
    try {
      if (isAdminView) {
        await approveHandoverAdmin(clientId, actionModal.handover_id, { remark: actionRemark }, token);
      } else {
        await approveHandover(clientId, actionModal.handover_id, { remark: actionRemark }, token);
      }
      toast({ title: 'Approved', description: 'Handover approved.' });
      setActionModal(null);
      setActionRemark('');
      fetchSummary();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed.' });
    } finally {
      setActioning(false);
    }
  };

  const handleReject = async () => {
    if (!actionModal || !actionRemark.trim() || !clientId || !token) {
      toast({ variant: 'destructive', title: 'Validation', description: 'Rejection remark is required.' });
      return;
    }
    setActioning(true);
    try {
      if (isAdminView) {
        await rejectHandoverAdmin(clientId, actionModal.handover_id, { remark: actionRemark }, token);
      } else {
        await rejectHandover(clientId, actionModal.handover_id, { remark: actionRemark }, token);
      }
      toast({ title: 'Rejected', description: 'Handover rejected.' });
      setActionModal(null);
      setActionRemark('');
      fetchSummary();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed.' });
    } finally {
      setActioning(false);
    }
  };

  const pmName = (id) => paymentMethods.find(p => p.id === id)?.name || id;
  const applyDateFilter = (list) => {
    if (datePreset === 'all_time') return list;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return list.filter(row => {
      const d = new Date(row.date);
      const vDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (datePreset === 'today') return vDate.getTime() === today.getTime();
      if (datePreset === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return vDate.getTime() === yesterday.getTime();
      }
      if (datePreset === 'last_7_days') {
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        return vDate >= last7 && vDate <= today;
      }
      if (datePreset === 'last_30_days') {
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        return vDate >= last30 && vDate <= today;
      }
      if (datePreset === 'this_month') {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        return vDate >= first && vDate <= today;
      }
      if (datePreset === 'last_month') {
        const firstLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastLast = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return vDate >= firstLast && vDate <= lastLast;
      }
      if (datePreset === 'custom' && (dateFrom || dateTo)) {
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (from && to) {
          const toEnd = new Date(to);
          toEnd.setHours(23, 59, 59, 999);
          return vDate >= from && vDate <= toEnd;
        }
        if (from) return vDate >= from;
        if (to) {
          const toEnd = new Date(to);
          toEnd.setHours(23, 59, 59, 999);
          return vDate <= toEnd;
        }
      }
      return true;
    });
  };
  const applySearch = (list) => {
    if (!searchTerm || !searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase().trim();
    return list.filter(row => {
      const created = (usersMap[row.created_by_user_id] || row.created_by_name || '').toLowerCase();
      const dept = (row.department_name || '').toLowerCase();
      const dateStr = (row.date || '').toLowerCase();
      return created.includes(term) || dept.includes(term) || dateStr.includes(term);
    });
  };
  const pendingItems = useMemo(() => applySearch(applyDateFilter(items.filter(row => row.status !== 'approved'))), [items, datePreset, dateFrom, dateTo, searchTerm, usersMap]);
  const historyItems = useMemo(() => applySearch(applyDateFilter(items.filter(row => row.status === 'approved'))), [items, datePreset, dateFrom, dateTo, searchTerm, usersMap]);
  const displayItems = viewMode === 'pending' ? pendingItems : historyItems;

  const ITEMS_PER_PAGE = 10;
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const currentPage = viewMode === 'pending' ? activePage : historyPage;
  const setCurrentPage = (val) => {
    if (viewMode === 'pending') setActivePage(val);
    else setHistoryPage(val);
  };

  useEffect(() => {
    setActivePage(1);
    setHistoryPage(1);
  }, [searchTerm, datePreset, dateFrom, dateTo, viewMode]);

  const totalPages = Math.ceil(displayItems.length / ITEMS_PER_PAGE);
  const paginatedItems = displayItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const showActionColumn = viewMode === 'pending' && !readOnly && (isAdminView ? displayItems.some(row => row.status === 'pending') : true);
  const canAct = (row) => !readOnly && (isAdminView ? row.status === 'pending' : row.client_user_status !== 'approved');
  const statusLabel = (row) => {
    if (row.status === 'approved') return 'Approved';
    if (row.status === 'rejected') return 'Rejected';
    if (!isAdminView) {
      if (row.client_user_status === 'pending') return 'Pending Approval';
      return 'Admin Pending Approval';
    }
    return 'Pending Admin';
  };
  const colSpan = showActionColumn ? 9 : 8;
  const isBreakdownEditable = (row) => {
    if (readOnly) return false;
    if (row.status === 'approved') return false;
    if (isAdminView) return true;
    if (userRole === 'CLIENT_HANDOVER') return true;
    return false;
  };
  const isBreakdownViewOnly = (row) => readOnly || (!isAdminView && userRole !== 'CLIENT_HANDOVER');

  return (
    <Card className="glass-card mt-4">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-between w-full">
            <div className="flex p-1 rounded-lg border border-white/10 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setViewMode('pending')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === 'pending'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}
              >
                Pending
              </button>

              <button
                type="button"
                onClick={() => setViewMode('history')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === 'history'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}
              >
                History
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-1 justify-end">
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm glass-input">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <SelectValue placeholder="All Time" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_time">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                <AnimatedSearch
                  placeholder="Date, Department, Created by..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              {datePreset === 'custom' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Input type="date" placeholder="From" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:max-w-[130px] h-9 text-sm glass-input" />
                  <span className="text-gray-400 text-sm">-</span>
                  <Input type="date" placeholder="To" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:max-w-[130px] h-9 text-sm glass-input" />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-xs sm:text-sm text-gray-300">Date</TableHead>
                <TableHead className="text-xs sm:text-sm text-gray-300">Created By</TableHead>
                <TableHead className="text-xs sm:text-sm text-gray-300">Department</TableHead>
                <TableHead className="text-xs sm:text-sm text-gray-300">As Per Department</TableHead>
                <TableHead className="text-xs sm:text-sm text-gray-300">As Per System</TableHead>
                <TableHead className="text-xs sm:text-sm text-gray-300">Variance</TableHead>
                <TableHead className="text-xs sm:text-sm text-gray-300">Status</TableHead>
                {showActionColumn && <TableHead className="text-right text-xs sm:text-sm text-gray-300">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="h-24 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-white" /></TableCell>
                </TableRow>
              ) : displayItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="h-24 text-center text-gray-400 text-sm">
                    {viewMode === 'pending' ? 'No pending handovers.' : 'No approved handovers.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((row) => (
                  <TableRow key={row.handover_id} className="border-white/10">
                    <TableCell className="text-xs sm:text-sm text-white">{toDDMMYYYY(row.date)}</TableCell>
                    <TableCell className="text-xs sm:text-sm text-white">{usersMap[row.created_by_user_id] || row.created_by_name || '—'}</TableCell>
                    <TableCell className="text-xs sm:text-sm text-white">{row.department_name || '—'}</TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <button type="button" className="text-left underline decoration-dotted hover:no-underline cursor-pointer text-white" onClick={() => setBreakdownModal({ type: 'department', row })}>
                        ₹ {Number(row.as_per_department).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <button type="button" className="text-left underline decoration-dotted hover:no-underline cursor-pointer text-white" onClick={() => setBreakdownModal({ type: 'system', row })}>
                        ₹ {Number(row.as_per_system).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-white">₹ {Number(row.variance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs sm:text-sm ${row.status === 'approved' ? 'bg-green-500/20 text-green-400' : row.status === 'rejected' ? 'bg-red-500/20 text-red-400' : '!bg-amber-500/20 text-amber-400'}`}>
                        {statusLabel(row)}
                      </span>
                    </TableCell>
                    {showActionColumn && (
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { if (canAct(row)) { setActionRemark(''); setActionModal(row); } }} disabled={!canAct(row)} title={canAct(row) ? 'Approve or Reject' : 'No action'}>
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex flex-row justify-center items-center gap-3 p-4 sm:p-6 border-t border-white/10">
        <div><p className="text-xs sm:text-sm text-gray-400">Page {currentPage} of {totalPages}</p></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/10 bg-transparent hover:bg-white/10 text-white">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/10 bg-transparent hover:bg-white/10 text-white">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>

      <Dialog open={!!actionModal} onOpenChange={(open) => { if (!open) { setActionModal(null); setActionRemark(''); } }}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl text-white">Approve or Reject Handover</DialogTitle>
            <DialogDescription className="text-sm text-gray-400">Optional remark for approval; rejection requires a reason.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="text-sm text-gray-300">Remark (optional for Approve, required for Reject)</Label>
              <Input className="mt-2 h-9 sm:h-10 text-sm glass-input !w-full !pl-3 text-white" value={actionRemark} onChange={e => setActionRemark(e.target.value)} placeholder="Remark" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" className="h-9 sm:h-10 text-sm text-white">Cancel</Button></DialogClose>
            <Button onClick={handleApprove} disabled={actioning} className="h-9 sm:h-10 text-sm text-green-400">{actioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Approve</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actioning || !actionRemark.trim()} className="h-9 sm:h-10 text-sm">{actioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!breakdownModal} onOpenChange={(open) => { if (!open) setBreakdownModal(null); setBreakdownEdit({}); }}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl text-white">
              {breakdownModal?.type === 'department' ? 'Update Handover Details' : 'As Per System – Breakdown'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              {breakdownModal?.type === 'system' ? 'Payment method wise amount (from system).' : breakdownModal?.row && (breakdownModal.row.status === 'approved' || isBreakdownViewOnly(breakdownModal.row)) ? 'Handover data (view only — already approved).' : 'Same as add handover data. Edit amounts and remarks below; save when status is not yet approved.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {breakdownModal?.row && breakdownModal?.type === 'system' && (
              <>
                <div className="border border-white/10 rounded p-2">
                  <Table className="w-full text-sm">
                    <TableHeader>
                      <TableRow className="text-gray-400 border-b border-white/10">
                        <TableHead className="text-left py-1">Method</TableHead>
                        <TableHead className="text-right py-1">Amount ₹</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(breakdownModal.row.as_per_system_breakdown || {}).map(([pmId, amt]) => (
                        <TableRow key={pmId} className="border-b border-white/5">
                          <TableCell className="py-1">{pmName(pmId)}</TableCell>
                          <TableCell className="text-right py-1">{Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-gray-400 text-sm"><span className="font-medium text-gray-300">Remark:</span> {breakdownModal.row.cashier_remarks || '—'}</p>
              </>
            )}
            {breakdownModal?.row && breakdownModal?.type === 'department' && (() => {
              const row = breakdownModal.row;
              const editable = isBreakdownEditable(row);
              const viewOnly = isBreakdownViewOnly(row);
              const breakdown = row.as_per_department_breakdown || {};
              const defaultEdit = {};
              paymentMethods.forEach(p => { defaultEdit[p.id] = breakdown[p.id] != null ? String(breakdown[p.id]) : ''; });
              const editValues = breakdownEdit[row.handover_id] ?? defaultEdit;
              const editRemarks = (breakdownEdit[row.handover_id + '_remarks'] !== undefined) ? breakdownEdit[row.handover_id + '_remarks'] : (row.handover_remarks || '');
              const setEdit = (pmId, value) => setBreakdownEdit(prev => ({ ...prev, [row.handover_id]: { ...(prev[row.handover_id] || {}), [pmId]: value } }));
              const setEditRem = (v) => setBreakdownEdit(prev => ({ ...prev, [row.handover_id + '_remarks']: v }));
              const handleSaveBreakdown = async () => {
                if (!clientId || !token || !editable) return;
                setSavingBreakdown(true);
                try {
                  const collection_details = {};
                  paymentMethods.forEach(p => { collection_details[p.id] = parseFloat(editValues[p.id]) || 0; });
                  await updateHandover(clientId, row.handover_id, { collection_details, remarks: editRemarks }, token);
                  toast({ title: 'Saved', description: 'Handover updated.' });
                  fetchSummary();
                  setBreakdownModal(null);
                  setBreakdownEdit({});
                } catch (e) {
                  toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to save.' });
                } finally {
                  setSavingBreakdown(false);
                }
              };
              return (
                <>
                  <p className="text-sm text-gray-400">Department: <span className="text-white">{row.department_name || '—'}</span></p>
                  <div className="border border-white/10 rounded p-2">
                    <Table className="w-full text-sm">
                      <TableHeader>
                        <TableRow className="text-gray-400 border-b border-white/10">
                          <TableHead className="text-left py-1">Method</TableHead>
                          <TableHead className="text-right py-1">Amount ₹</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentMethods.map(p => (
                          <TableRow key={p.id} className="border-b border-white/5">
                            <TableCell className="py-1">{p.name}</TableCell>
                            <TableCell className="text-right py-1">
                              {viewOnly || !editable ? (
                                <span>{Number(editValues[p.id] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              ) : (
                                <Input type="number" min={0} step={0.01} className="h-8 text-sm glass-input w-28 text-white inline-block text-right" value={editValues[p.id] ?? ''} onChange={e => setEdit(p.id, e.target.value)} />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400">Remarks</Label>
                    {viewOnly || !editable ? (
                      <p className="text-sm text-white mt-1">{editRemarks || '—'}</p>
                    ) : (
                      <Input className="mt-1 h-9 text-sm glass-input text-white" value={editRemarks} onChange={e => setEditRem(e.target.value)} placeholder="Remarks" />
                    )}
                  </div>
                  {editable && !viewOnly && (
                    <DialogFooter>
                      <Button onClick={handleSaveBreakdown} disabled={savingBreakdown}>{savingBreakdown && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
                    </DialogFooter>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ReportTab({ clientId, entityId, entityName, token, toast }) {
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [banks, setBanks] = useState([]);
  const [bankTallyItems, setBankTallyItems] = useState([]);
  const [cashTally, setCashTally] = useState(null);
  const [denominations, setDenominations] = useState([]);
  const [cashVouchers, setCashVouchers] = useState([]);
  const [debitVouchers, setDebitVouchers] = useState([]);

  const handleSearch = useCallback(async () => {
    if (!clientId || !entityId || !token) return;
    setLoading(true);
    setSearched(true);
    try {
      const bankAccounts = await getOrganisationBankAccounts(clientId, token);
      const activeBanks = Array.isArray(bankAccounts) ? bankAccounts.filter(b => b.is_active !== false) : [];
      setBanks(activeBanks);
      const bankIds = activeBanks.map(b => b.id).join(',');
      const [tally, cashData, denomList, cashList, debitList, cashOutTotal] = await Promise.all([
        bankIds ? getBankTally(clientId, reportDate, bankIds, token) : Promise.resolve({ items: [] }),
        getCashTally(clientId, reportDate, token),
        listCashDenominations(clientId, token),
        getVouchersReportByDate(entityId, reportDate, 'cash', token),
        getVouchersReportByDate(entityId, reportDate, 'debit', token),
        getVouchersCashTotalForDate(entityId, reportDate, token),
      ]);
      setBankTallyItems(tally?.items || []);
      setCashTally(cashData ? { ...cashData, cash_out: cashData.cash_out != null ? cashData.cash_out : cashOutTotal } : null);
      setDenominations(Array.isArray(denomList) ? denomList : []);
      setCashVouchers(Array.isArray(cashList) ? cashList : []);
      setDebitVouchers(Array.isArray(debitList) ? debitList : []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to load report.' });
    } finally {
      setLoading(false);
    }
  }, [clientId, entityId, token, reportDate, toast]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const displayName = entityName || 'Entity';
  const dateFormatted = reportDate ? format(parseISO(reportDate), 'dd/MM/yyyy') : '';

  const bankRows = banks.map(bank => {
    const item = bankTallyItems.find(i => String(i.bank_account_id) === String(bank.id));
    const opening = item?.opening_balance ?? 0;
    const closing = item?.closing_balance ?? opening;
    const variance = closing - opening;
    return { bank, opening, closing, variance };
  });
  const bankOpeningTotal = bankRows.reduce((s, r) => s + r.opening, 0);
  const bankClosingTotal = bankRows.reduce((s, r) => s + r.closing, 0);
  const bankVarianceTotal = bankClosingTotal - bankOpeningTotal;

  const openingBalance = Number(cashTally?.opening_balance) || 0;
  const cashInHandover = Number(cashTally?.cash_in_handover) || 0;
  const cashInOther = Number(cashTally?.cash_in_other) || 0;
  const cashOut = Number(cashTally?.cash_out) || 0;
  const closingBalance = openingBalance + cashInHandover + cashInOther - cashOut;
  const denomDetails = cashTally?.denomination_details && typeof cashTally.denomination_details === 'object' ? cashTally.denomination_details : {};
  const denomTotal = denominations.reduce((sum, d) => sum + (Number(d.value) || 0) * (Number(denomDetails[d.id]) || 0), 0);

  const cashVoucherTotal = cashVouchers.reduce((s, v) => s + (Number(v.amount) || 0), 0);
  const debitVoucherTotal = debitVouchers.reduce((s, v) => s + (Number(v.amount) || 0), 0);

  const formatTime = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return format(d, 'dd/MM/yyyy, hh:mm a');
    } catch { return iso; }
  };

  return (
    <Card className="glass-card border-white/5">
      <CardHeader className="p-4 sm:p-6 flex flex-row flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg sm:text-xl text-white">Finance Report</CardTitle>
          <CardDescription className="text-sm text-gray-400">Bank balance, physical cash tally, cash and debit vouchers for the selected date.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {/* <Label className="text-gray-400 text-sm">Date</Label> */}
          <Input type="date" className="glass-input max-w-[200px]" value={reportDate} onChange={e => setReportDate(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-8">
        {!searched ? (
          <p className="text-gray-400 py-8 text-center">Select a date to load the report.</p>
        ) : loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-10 w-10 animate-spin text-white" /></div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white text-center border-b border-white/10 pb-2">
              FINANCE REPORT | {displayName.toUpperCase()} | {dateFormatted}
            </h2>

            {/* BANK BALANCE */}
            <div>
              <h3 className="text-sm font-semibold text-white text-center mb-3">BANK BALANCE</h3>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-pink-500/20 hover:bg-pink-500/20 border-white/10">
                      <TableHead className="text-xs sm:text-sm text-white">Bank</TableHead>
                      <TableHead className="text-xs sm:text-sm text-white">Account</TableHead>
                      <TableHead className="text-xs sm:text-sm text-white text-right">Opening Balance</TableHead>
                      <TableHead className="text-xs sm:text-sm text-white text-right">Closing Balance</TableHead>
                      <TableHead className="text-xs sm:text-sm text-white text-right">Variance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankRows.map(({ bank, opening, closing, variance }) => (
                      <TableRow key={bank.id} className="border-white/10">
                        <TableCell className="text-xs sm:text-sm text-white">{bank.bank_name || '—'}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-white">{bank.account_number || '—'}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-white text-right">₹ {Number(opening).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-white text-right">₹ {Number(closing).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className={`text-xs sm:text-sm text-right ${variance >= 0 ? 'text-green-400' : 'text-white'}`}>₹ {Number(variance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="!bg-amber-500/20 border-white/10 font-medium">
                      <TableCell className="text-xs sm:text-sm text-white">Total</TableCell>
                      <TableCell className="text-xs sm:text-sm text-white">—</TableCell>
                      <TableCell className="text-xs sm:text-sm text-white text-right">₹ {bankOpeningTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-white text-right">₹ {bankClosingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className={`text-xs sm:text-sm text-right ${bankVarianceTotal >= 0 ? 'text-green-400' : 'text-white'}`}>₹ {bankVarianceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* PHYSICAL CASH TALLY */}
            <div>
              <h3 className="text-sm font-semibold text-white text-center mb-3">PHYSICAL CASH TALLY</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-pink-500/20 hover:bg-pink-500/20 border-white/10">
                        <TableHead className="text-xs sm:text-sm text-white">Particular</TableHead>
                        <TableHead className="text-xs sm:text-sm text-white text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-white/10"><TableCell className="text-xs sm:text-sm text-white">Opening Balance</TableCell><TableCell className="text-xs sm:text-sm text-white text-right">₹ {openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell></TableRow>
                      <TableRow className="border-white/10"><TableCell className="text-xs sm:text-sm text-white">Cash In - Collection</TableCell><TableCell className="text-xs sm:text-sm text-white text-right">₹ {cashInHandover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell></TableRow>
                      <TableRow className="border-white/10"><TableCell className="text-xs sm:text-sm text-white">Cash In - Others</TableCell><TableCell className="text-xs sm:text-sm text-white text-right">₹ {cashInOther.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell></TableRow>
                      <TableRow className="border-white/10"><TableCell className="text-xs sm:text-sm text-white">Cash Out</TableCell><TableCell className="text-xs sm:text-sm text-white text-right">₹ {cashOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell></TableRow>
                      <TableRow className="!bg-amber-500/20 border-white/10"><TableCell className="text-xs sm:text-sm font-medium text-white">Closing Balance</TableCell><TableCell className="text-xs sm:text-sm font-medium text-white text-right">₹ {closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                  <p className="text-gray-400 text-sm mt-2 px-2">Cash Tally Remarks: {cashTally?.remarks || 'No Remarks'}</p>
                </div>
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-pink-500/20 hover:bg-pink-500/20 border-white/10">
                        <TableHead className="text-xs sm:text-sm text-white">Denomination</TableHead>
                        <TableHead className="text-xs sm:text-sm text-white text-right">Units</TableHead>
                        <TableHead className="text-xs sm:text-sm text-white text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {denominations.map((d) => {
                        const units = Number(denomDetails[d.id]) || 0;
                        const total = (Number(d.value) || 0) * units;
                        return (
                          <TableRow key={d.id} className="border-white/10">
                            <TableCell className="text-xs sm:text-sm text-white">₹ {Number(d.value).toLocaleString('en-IN')} x</TableCell>
                            <TableCell className="text-xs sm:text-sm text-white text-right">{units}</TableCell>
                            <TableCell className="text-xs sm:text-sm text-white text-right">₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="!bg-amber-500/20 border-white/10 font-medium">
                        <TableCell className="text-xs sm:text-sm text-white">Total</TableCell>
                        <TableCell className="text-xs sm:text-sm text-white text-right">—</TableCell>
                        <TableCell className="text-xs sm:text-sm text-white text-right">₹ {denomTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* CASH VOUCHER */}
            <div>
              <h3 className="text-sm font-semibold text-white text-center mb-3">CASH VOUCHER</h3>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-pink-500/20 hover:bg-pink-500/20 border-white/10">
                      <TableHead className="text-xs sm:text-sm text-white">Date</TableHead>
                      <TableHead className="text-xs sm:text-sm text-white">V.No.</TableHead>
                      <TableHead className="text-xs sm:text-sm text-white">Beneficiary</TableHead>
                      <TableHead className="text-xs sm:text-sm text-white">Purpose</TableHead>
                      <TableHead className="text-xs sm:text-sm text-white text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashVouchers.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-4">No cash vouchers for this date.</TableCell></TableRow>
                    ) : (
                      cashVouchers.map((v, i) => (
                        <TableRow key={i} className={`border-white/10 ${i % 2 === 1 ? 'bg-white/5' : ''}`}>
                          <TableCell className="text-xs sm:text-sm text-white">{formatTime(v.created_date)}</TableCell>
                          <TableCell className="text-xs sm:text-sm text-white">{v.voucher_id || '—'}</TableCell>
                          <TableCell className="text-xs sm:text-sm text-white">{v.beneficiary_name || '—'}</TableCell>
                          <TableCell className="text-xs sm:text-sm text-white">{v.remarks || '—'}</TableCell>
                          <TableCell className="text-xs sm:text-sm text-blue-400 text-right">₹ {Number(v.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))
                    )}
                    {cashVouchers.length > 0 && (
                      <TableRow className="!bg-amber-500/20 border-white/10 font-medium">
                        <TableCell colSpan={4} className="text-xs sm:text-sm text-white">Total</TableCell>
                        <TableCell className="text-xs sm:text-sm text-white text-right">₹ {cashVoucherTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* DEBIT VOUCHER */}
            <div>
              <h3 className="text-sm font-semibold text-white text-center mb-3">DEBIT VOUCHER</h3>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-pink-500/20 hover:bg-pink-500/20 border-white/10">
                      <TableHead className="text-xs sm:text-sm text-white">Date</TableHead>
                      <TableHead className="text-xs sm:text-sm text-white">V.No.</TableHead>
                      <TableHead className="text-xs sm:text-sm text-white">Bank</TableHead>
                      <TableHead className="text-xs sm:text-sm text-white">From Account</TableHead>
                      <TableHead className="text-xs sm:text-sm text-white">Beneficiary</TableHead>
                      <TableHead className="text-xs sm:text-sm text-white">Purpose</TableHead>
                      <TableHead className="text-xs sm:text-sm text-white text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debitVouchers.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-4">No debit vouchers for this date.</TableCell></TableRow>
                    ) : (
                      debitVouchers.map((v, i) => (
                        <TableRow key={i} className={`border-white/10 ${i % 2 === 1 ? 'bg-white/5' : ''}`}>
                          <TableCell className="text-xs sm:text-sm text-white">{formatTime(v.created_date)}</TableCell>
                          <TableCell className="text-xs sm:text-sm text-white">{v.voucher_id || '—'}</TableCell>
                          <TableCell className="text-xs sm:text-sm text-white">{v.from_bank_account_name || '—'}</TableCell>
                          <TableCell className="text-xs sm:text-sm text-white">{v.from_bank_account_number || '—'}</TableCell>
                          <TableCell className="text-xs sm:text-sm text-white">{v.beneficiary_name || '—'}</TableCell>
                          <TableCell className="text-xs sm:text-sm text-white">{v.remarks || '—'}</TableCell>
                          <TableCell className="text-xs sm:text-sm text-blue-400 text-right">₹ {Number(v.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))
                    )}
                    {debitVouchers.length > 0 && (
                      <TableRow className="!bg-amber-500/20 border-white/10 font-medium">
                        <TableCell colSpan={6} className="text-xs sm:text-sm text-white">Total</TableCell>
                        <TableCell className="text-xs sm:text-sm text-white text-right">₹ {debitVoucherTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ClientHandoverPage;
// For FinancePage / Handover page: show list only (same as list tab).
const BankTallyTab = BankTallyListTab;
const CashTallyTab = CashTallyListTab;

export {
  HandoverTab,
  BankTallyTab,
  CashTallyTab,
  BankTallyListTab,
  BankTallyFormPage,
  CashTallyListTab,
  CashTallyFormPage,
  ReportTab,
  CashierReportTab,
  CashierReportListTab,
  CashierReportFormPage,
};
