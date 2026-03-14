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
  deleteCashierReportAttachment,
  getCashierReportAttachment,
} from '@/lib/api/settings';
import { listEntityUsers } from '@/lib/api/organisation';
import { getOrganisationBankAccounts } from '@/lib/api';
import { getVouchersCashTotalForDate, getVouchersReportByDate, getVoucherAttachment, downloadFinanceReportPDF } from '@/lib/api/finance';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MoreVertical, Calendar, ArrowLeftRight, ArrowLeft, Loader2, Check, X, ChevronLeft, ChevronRight, Paperclip, Upload, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import AnimatedSearch from '@/components/ui/AnimatedSearch';
import { DatePicker } from '@/components/ui/date-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';

const toDDMMYYYY = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' && dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr);
    return format(d, 'dd/MM/yyyy');
  } catch { return dateStr; }
};

const formatTime = (utcString) => {
  if (!utcString) return '—';
  try {
    const d = new Date(utcString);
    return format(d, 'hh:mm a');
  } catch { return utcString; }
};

const getVarianceColor = (val) => {
  const num = Number(val) || 0;
  if (num < -0.001) return 'text-red-400';
  if (num > 0.001) return 'text-yellow-400';
  return 'text-green-400';
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
  const [datePreset, setDatePreset] = useState('last_30_days');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

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
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      list = list.filter(e => {
        const d = new Date(e.report_date);
        const vDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

        if (datePreset === 'all_time' || datePreset === 'last_year') {
          const lastYear = new Date(today);
          lastYear.setDate(lastYear.getDate() - 365);
          return vDate >= lastYear && vDate <= today;
        }
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
        if (datePreset === 'last_3_months') {
          const last3 = new Date(today);
          last3.setMonth(last3.getMonth() - 3);
          return vDate >= last3 && vDate <= today;
        }
        if (datePreset === 'last_6_months') {
          const last6 = new Date(today);
          last6.setMonth(last6.getMonth() - 6);
          return vDate >= last6 && vDate <= today;
        }
        if (datePreset === 'custom') {
          const from = dateRange?.from ? new Date(dateRange.from) : null;
          const to = dateRange?.to ? new Date(dateRange.to) : null;
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
    }
    if (searchTerm && searchTerm.trim()) {
      const t = searchTerm.toLowerCase().trim();
      list = list.filter(e => toDDMMYYYY(e.report_date).toLowerCase().includes(t) || (e.report_date || '').toString().includes(t));
    }
    return list;
  }, [entriesList, datePreset, dateRange, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, datePreset, dateRange]);

  const totalPages = Math.ceil((filteredList?.length || 0) / itemsPerPage);
  const paginatedList = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
                <SelectTrigger className="w-full sm:w-[190px] h-11 rounded-full glass-input px-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <SelectValue placeholder="Last Year" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10 text-white rounded-2xl">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {datePreset === 'custom' && (
                <DateRangePicker
                  dateRange={dateRange}
                  onChange={setDateRange}
                  className="w-full sm:w-auto"
                />
              )}

              <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                <AnimatedSearch
                  placeholder="Date..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
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
                <TableRow className="hover:bg-transparent border-white/10">
                  <TableHead className="text-xs sm:text-sm text-gray-300">Date & Time</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Updated By</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Opening Balance</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Closing Balance</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 py-8 text-sm">No entries found.</TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((entry) => (
                    <TableRow
                      key={entry.report_date}
                      className="cursor-pointer transition-colors hover:bg-white/5 border-white/10"
                      onClick={() => navigate('entry/' + encodeURIComponent(entry.report_date))}
                    >
                      <TableCell className="text-xs sm:text-sm text-white whitespace-nowrap">
                        {toDDMMYYYY(entry.report_date)}
                        <span className="block text-xs text-gray-400 mt-0.5">{formatTime(entry.updated_at)}</span>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-white whitespace-nowrap">{entry.updated_by_name || '—'}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-white whitespace-nowrap">
                        ₹ {(entry.opening_balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-white whitespace-nowrap">
                        ₹ {(entry.closing_balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-xs sm:text-sm font-bold whitespace-nowrap ${
                        (entry.variance ?? 0) > 0 ? 'text-green-400' : (entry.variance ?? 0) < 0 ? 'text-red-400' : 'text-white'
                      }`}>
                        {entry.variance != null ? Math.round(entry.variance).toLocaleString('en-IN') : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-6 p-4 sm:p-6 border-t border-white/10">
        <div className="flex items-center gap-4">
          <p className="text-xs sm:text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:inline">Rows per page:</span>
            <Select value={String(itemsPerPage)} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[70px] bg-transparent border-white/10 text-white text-xs">
                <SelectValue placeholder={String(itemsPerPage)} />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10 text-white">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
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
      const backPath = isNew ? '..' : '../..';
      navigate(backPath, { relative: 'path' });
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
      <Card className="glass-card border-white/5 overflow-hidden">
        <CardHeader className="p-4 sm:p-6 flex flex-row flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
              onClick={() => navigate(isNew ? '..' : '../..', { relative: 'path' })}
              title="Back to list"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <CardTitle className="text-lg sm:text-xl text-white">{isNew ? 'New entry' : 'View / Update'}</CardTitle>
              <CardDescription className="text-sm text-gray-400">Opening and closing balance by bank account.</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              value={reportDate}
              onChange={(newDate) => {
                if (!newDate) return;
                const dateStr = format(newDate, 'yyyy-MM-dd');
                if (isNew) {
                  navigate(`../entry/${encodeURIComponent(dateStr)}`, { relative: 'path', replace: true });
                } else {
                  navigate(`../${encodeURIComponent(dateStr)}`, { relative: 'path', replace: true });
                }
              }}
              className="w-40"
            />
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
                  <TableHead className="text-xs sm:text-sm text-gray-300 text-center">Account No.</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300 text-center">Opening Balance</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300 text-center">Closing Balance</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300 text-center">Variance</TableHead>
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
                          <TableCell className="text-xs sm:text-sm text-gray-300 text-center">{bank.account_number || '—'}</TableCell>
                          <TableCell className="text-center">
                            <Input type="text" readOnly className="h-9 sm:h-10 text-sm glass-input w-32 sm:w-44 bg-white/5 text-white text-center mx-auto" value={opening.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input 
                              type="text" 
                              readOnly={isReadOnly} 
                              className={`h-9 sm:h-10 text-sm glass-input w-32 sm:w-44 text-white text-center mx-auto ${isReadOnly ? 'bg-white/5 cursor-default' : ''}`} 
                              value={closingVal !== '' && closingVal != null && !isNaN(closingVal) ? Number(closingVal).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : closingVal} 
                              onChange={(e) => {
                                const raw = e.target.value.replace(/,/g, '');
                                if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                                  setClosing(bank.id, raw);
                                }
                              }} 
                              placeholder="Closing" 
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input 
                              type="text" 
                              readOnly 
                              className={`h-9 sm:h-10 text-sm glass-input w-32 sm:w-44 bg-white/5 text-center font-bold mx-auto ${
                                diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-white'
                              }`} 
                              value={diff != null ? Math.round(diff).toLocaleString('en-IN') : '—'} 
                            />
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
                          <TableCell className="text-xs sm:text-sm text-gray-300 text-center">—</TableCell>
                          <TableCell className="text-center">
                            <Input type="text" readOnly className="h-9 sm:h-10 text-sm glass-input w-32 sm:w-44 bg-white/5 text-white font-medium text-center mx-auto" value={totalOpening.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input type="text" readOnly className="h-9 sm:h-10 text-sm glass-input w-32 sm:w-44 bg-white/5 text-white font-medium text-center mx-auto" value={totalClosing.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input 
                              type="text" 
                              readOnly 
                              className={`h-9 sm:h-10 text-sm glass-input w-32 sm:w-44 bg-white/5 font-bold text-center mx-auto ${
                                totalDiff > 0 ? 'text-green-400' : totalDiff < 0 ? 'text-red-400' : 'text-white'
                              }`} 
                              value={Math.round(totalDiff).toLocaleString('en-IN')} 
                            />
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
  const [datePreset, setDatePreset] = useState('last_30_days');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

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
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      list = list.filter(e => {
        const d = new Date(e.report_date);
        const vDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

        if (datePreset === 'all_time' || datePreset === 'last_year') {
          const lastYear = new Date(today);
          lastYear.setDate(lastYear.getDate() - 365);
          return vDate >= lastYear && vDate <= today;
        }
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
        if (datePreset === 'last_3_months') {
          const last3 = new Date(today);
          last3.setMonth(last3.getMonth() - 3);
          return vDate >= last3 && vDate <= today;
        }
        if (datePreset === 'last_6_months') {
          const last6 = new Date(today);
          last6.setMonth(last6.getMonth() - 6);
          return vDate >= last6 && vDate <= today;
        }
        if (datePreset === 'custom') {
          const from = dateRange?.from ? new Date(dateRange.from) : null;
          const to = dateRange?.to ? new Date(dateRange.to) : null;
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
    }
    if (searchTerm && searchTerm.trim()) {
      const t = searchTerm.toLowerCase().trim();
      list = list.filter(e => toDDMMYYYY(e.report_date).toLowerCase().includes(t) || (e.report_date || '').toString().includes(t) || String(e.closing_balance || '').includes(t));
    }
    return list;
  }, [entriesList, datePreset, dateRange, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, datePreset, dateRange]);

  const totalPages = Math.ceil((filteredList?.length || 0) / itemsPerPage);
  const paginatedList = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Card className="glass-card mt-4">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-between w-full">
            <CardTitle className="text-lg sm:text-xl text-white">Cash Tally</CardTitle>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-1 justify-end">
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="w-full sm:w-[190px] h-11 rounded-full glass-input px-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <SelectValue placeholder="Last Year" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10 text-white rounded-2xl">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {datePreset === 'custom' && (
                <DateRangePicker
                  dateRange={dateRange}
                  onChange={setDateRange}
                  className="w-full sm:w-auto"
                />
              )}

              <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                <AnimatedSearch
                  placeholder="Date, Closing..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
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
                <TableRow className="hover:bg-transparent border-white/10">
                  <TableHead className="text-xs sm:text-sm text-gray-300">Date & Time</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Updated By</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Opening Balance</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Cash In</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Cash Out</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Closing Balance</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400 py-8 text-sm">No entries found.</TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((entry) => (
                    <TableRow
                      key={entry.report_date}
                      className="cursor-pointer transition-colors hover:bg-white/5 border-white/10"
                      onClick={() => navigate('entry/' + encodeURIComponent(entry.report_date))}
                    >
                      <TableCell className="text-xs sm:text-sm text-white whitespace-nowrap">
                        {toDDMMYYYY(entry.report_date)}
                        <span className="block text-xs text-gray-400 mt-0.5">{formatTime(entry.updated_at)}</span>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-white whitespace-nowrap">{entry.updated_by_name || '—'}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-white whitespace-nowrap">
                        ₹ {(entry.opening_balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-white whitespace-nowrap">
                        ₹ {(entry.cash_in ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-white whitespace-nowrap">
                        ₹ {(entry.cash_out ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-white whitespace-nowrap">
                        ₹ {(entry.closing_balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-xs sm:text-sm whitespace-nowrap font-medium ${
                        (entry.variance ?? 0) > 0 ? 'text-green-400' : (entry.variance ?? 0) < 0 ? 'text-red-400' : 'text-white'
                      }`}>
                        ₹ {(entry.variance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-6 p-4 sm:p-6 border-t border-white/10">
        <div className="flex items-center gap-4">
          <p className="text-xs sm:text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:inline">Rows per page:</span>
            <Select value={String(itemsPerPage)} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[70px] bg-transparent border-white/10 text-white text-xs">
                <SelectValue placeholder={String(itemsPerPage)} />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10 text-white">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
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
  const varianceAmount = denominationTotal - closingBalance;

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
      const backPath = isNew ? '..' : '../..';
      navigate(backPath, { relative: 'path' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card border-white/5">
        <CardHeader className="p-4 sm:p-6 flex flex-row flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
              onClick={() => navigate(isNew ? '..' : '../..', { relative: 'path' })}
              title="Back to list"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <CardTitle className="text-lg sm:text-xl text-white">{isNew ? 'New entry' : 'View / Update'}</CardTitle>
              <CardDescription className="text-sm text-gray-400">Cash in hand, denomination breakdown and remarks.</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DatePicker
              value={reportDate}
              onChange={(newDate) => {
                if (!newDate) return;
                const dateStr = format(newDate, 'yyyy-MM-dd');
                if (isNew) {
                  navigate(`../entry/${encodeURIComponent(dateStr)}`, { relative: 'path', replace: true });
                } else {
                  navigate(`../${encodeURIComponent(dateStr)}`, { relative: 'path', replace: true });
                }
              }}
              className="w-40"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 border-b border-white/10 pb-2">Cash in hand</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-gray-400 text-xs min-h-[32px] flex items-end">Opening Balance</Label>
                <Input type="text" readOnly className="h-9 sm:h-10 text-sm glass-input !w-auto bg-white/5 text-white" value={(openingBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-gray-400 text-xs min-h-[32px] flex items-end">Cash In – Approved handover</Label>
                <Input type="text" readOnly className="h-9 sm:h-10 text-sm glass-input !w-auto bg-white/5 text-white" value={(cashInHandover ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} placeholder="—" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-gray-400 text-xs min-h-[32px] flex items-end">Cash In – Other</Label>
                <Input type="text" readOnly={isReadOnly} className={`h-9 sm:h-10 text-sm glass-input !w-auto text-white ${isReadOnly ? 'bg-white/5 cursor-default' : ''}`} value={isReadOnly ? (parseFloat(cashInOther) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : cashInOther} onChange={e => setCashInOther(e.target.value)} placeholder="0" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-gray-400 text-xs min-h-[32px] flex items-end">Cash Out</Label>
                <Input type="text" readOnly className="h-9 sm:h-10 text-sm glass-input !w-auto bg-white/5 text-white" value={(cashOut ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-gray-400 text-xs min-h-[32px] flex items-end">Closing Balance</Label>
                <Input type="text" readOnly className="h-9 sm:h-10 text-sm glass-input !w-auto bg-white/5 text-white" value={(closingBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
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
                      <TableRow className="border-t-2 border-white/10 hover:bg-transparent">
                        <TableCell className="py-8"></TableCell>
                        <TableCell className="py-8"></TableCell>
                        <TableCell className="py-8">
                          <div className="flex flex-col items-start">
                            <div className="w-64 space-y-3">
                               <Input 
                                type="text" 
                                readOnly 
                                className="h-10 sm:h-12 text-lg glass-input w-full bg-white/5 text-white font-bold text-center border-white/10" 
                                value={denominationTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} 
                              />
                              <div className="text-left pl-1">
                                <span className={`text-xs font-bold whitespace-nowrap ${
                                  Math.abs(varianceAmount) < 0.01 ? 'text-green-400' : varianceAmount > 0 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  Variance: ₹ {varianceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
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
  const [datePreset, setDatePreset] = useState('last_30_days');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [searchTerm, setSearchTerm] = useState('');

  // removed static ITEMS_PER_PAGE
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'

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

    // Filter by active tab (Pending vs History)
    if (activeTab === 'pending') {
      list = list.filter(e => e.status !== 'Verified');
    } else {
      list = list.filter(e => e.status === 'Verified');
    }

    if (datePreset !== 'all_time') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayTime = today.getTime();
      list = list.filter(e => {
        const d = (e.report_date || '').toString();
        const vDate = new Date(d);
        vDate.setHours(0, 0, 0, 0);

        if (datePreset === 'all_time' || datePreset === 'last_year') {
          const lastYear = new Date(today);
          lastYear.setDate(lastYear.getDate() - 365);
          return vDate >= lastYear && vDate <= today;
        }
        if (datePreset === 'today') return vDate.getTime() === todayTime;
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
        if (datePreset === 'last_3_months') {
          const last3 = new Date(today);
          last3.setMonth(last3.getMonth() - 3);
          return vDate >= last3 && vDate <= today;
        }
        if (datePreset === 'last_6_months') {
          const last6 = new Date(today);
          last6.setMonth(last6.getMonth() - 6);
          return vDate >= last6 && vDate <= today;
        }
        if (datePreset === 'custom') {
          const from = dateRange?.from ? new Date(dateRange.from) : null;
          const to = dateRange?.to ? new Date(dateRange.to) : null;
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
    }
    if (searchTerm && searchTerm.trim()) {
      const t = searchTerm.toLowerCase().trim();
      list = list.filter(e => toDDMMYYYY(e.report_date).toLowerCase().includes(t) || (e.report_date || '').toString().includes(t) || (e.remarks || '').toLowerCase().includes(t));
    }
    return list;
  }, [entriesList, datePreset, dateRange, searchTerm, activeTab]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, datePreset, dateRange, activeTab]);

  const totalPages = Math.ceil((filteredList?.length || 0) / itemsPerPage);
  const paginatedList = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Card className="glass-card mt-4">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-between w-full">
            <div className="flex p-1 rounded-lg border border-white/10 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${activeTab === 'pending'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${activeTab === 'history'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}
              >
                History
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-1 justify-end">
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="w-full sm:w-[190px] h-11 rounded-full glass-input px-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <SelectValue placeholder="Last Year" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10 text-white rounded-2xl">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {datePreset === 'custom' && (
                <DateRangePicker
                  dateRange={dateRange}
                  onChange={setDateRange}
                  className="w-full sm:w-auto"
                />
              )}

              <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                <AnimatedSearch
                  placeholder="Date, Remarks..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
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
                  <TableHead className="text-xs sm:text-sm text-gray-300">Date</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Created By</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Handover Total</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Cashier Report Total</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Variance</TableHead>
                  <TableHead className="text-xs sm:text-sm text-gray-300">Remarks</TableHead>
                  <TableHead className="text-left text-xs sm:text-sm text-gray-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400 py-8 text-sm">No reports found.</TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((report) => (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer transition-colors hover:bg-white/5"
                      onClick={() => navigate('entry/' + encodeURIComponent(report.report_date))}
                    >
                      <TableCell className="text-xs sm:text-sm text-white">
                        <div>{toDDMMYYYY(report.report_date)}</div>
                        <div className="text-[10px] text-gray-400">{formatTime(report.created_at)}</div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-white">{report.created_by_name || '—'}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-white">₹ {Number(report.handover_total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-white">₹ {Number(report.cashier_report_total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className={`text-xs sm:text-sm font-medium ${getVarianceColor(report.variance)}`}>
                        ₹ {Number(report.variance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-white max-w-[200px] truncate" title={report.remarks || ''}>{report.remarks || '—'}</TableCell>
                      <TableCell className="text-left">
                        <span className={`inline-flex items-center justify-center text-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border h-auto min-h-[1.5rem] whitespace-normal leading-tight ${
                          report.status === 'Verified' 
                            ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                        }`}>
                          {activeTab === 'history' ? 'Verified' : 'Pending Approval'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-6 p-4 sm:p-6 border-t border-white/10">
        <div className="flex items-center gap-4">
          <p className="text-xs sm:text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:inline">Rows per page:</span>
            <Select value={String(itemsPerPage)} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[70px] bg-transparent border-white/10 text-white text-xs">
                <SelectValue placeholder={String(itemsPerPage)} />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10 text-white">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
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
  const [selectedDate, setSelectedDate] = useState(isNew ? today : reportDateParam);
  const reportDate = selectedDate;

  useEffect(() => {
    if (reportDateParam && reportDateParam !== 'new') {
      setSelectedDate(reportDateParam);
    } else if (reportDateParam === 'new') {
      setSelectedDate(new Date().toISOString().slice(0, 10));
    }
  }, [reportDateParam]);

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [remarks, setRemarks] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { url, name, index }

  const formatIST = (utcString) => {
    if (!utcString) return '-';
    try {
      const date = new Date(utcString);
      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return utcString;
    }
  };

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
          setExistingAttachments(r.attachment_urls || []);
          setAttachments([]);
        } else {
          setMatrix({});
          setRemarks('');
          setExistingAttachments([]);
          setAttachments([]);
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
      const formData = new FormData();
      formData.append('report_date', reportDate);
      formData.append('remarks', remarks);
      formData.append('details', JSON.stringify(details));
      formData.append('existing_attachments', JSON.stringify(existingAttachments));
      attachments.forEach(file => {
        formData.append('attachments', file);
      });
      await createCashierReport(clientId, formData, token);
      toast({ title: 'Success', description: 'Cashier report submitted.' });
      const backPath = isNew ? '..' : '../..';
      navigate(backPath, { relative: 'path' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Submit failed.' });
    } finally {
      setSubmitting(false);
    }
  };
  const handleViewAttachment = async (url) => {
    if (!url) return;
    try {
      const res = await getCashierReportAttachment(clientId, url, token);
      if (res && res.url) {
        window.open(res.url, '_blank');
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load attachment.' });
    }
  };

  const handleDeleteAttachment = async () => {
    if (!deleteConfirm || !clientId || !token) return;
    try {
      await deleteCashierReportAttachment(clientId, reportDate, deleteConfirm.url, token);
      setExistingAttachments(prev => prev.filter((_, i) => i !== deleteConfirm.index));
      toast({ title: 'Success', description: 'Attachment deleted.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Delete failed.' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card border-white/5">
        <CardHeader className="p-4 sm:p-6 flex flex-row flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
              onClick={() => navigate(isNew ? '..' : '../..', { relative: 'path' })}
              title="Back to list"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg sm:text-xl text-white">{isNew ? 'New report' : 'View / Update'}</CardTitle>
                {readOnly && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">Handover approved — view only</span>}
              </div>
              <CardDescription className="text-sm text-gray-400">Enter amounts by department and payment method for the selected date.</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              value={reportDate}
              onChange={(newDate) => {
                if (!newDate) return;
                const dateStr = format(newDate, 'yyyy-MM-dd');
                setSelectedDate(dateStr);
                if (!isNew) {
                  navigate(`../${encodeURIComponent(dateStr)}`, { relative: 'path', replace: true });
                }
              }}
              className="w-40"
            />
            <Button onClick={handleSubmit} disabled={submitting || readOnly} className="h-9 sm:h-10 text-sm">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit
            </Button>
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
                      <TableCell className="text-xs sm:text-sm font-medium text-white bg-amber-500/10">{Math.round(rowTotal(d.id)).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-white/10 bg-amber-500/10 font-medium">
                    <TableCell className="text-xs sm:text-sm text-gray-300">Total</TableCell>
                    {paymentMethods.map(p => (
                      <TableCell key={p.id} className="text-xs sm:text-sm text-white">{Math.round(colTotal(p.id)).toLocaleString('en-IN')}</TableCell>
                    ))}
                    <TableCell className="text-xs sm:text-sm text-white">{Math.round(grandTotal()).toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex flex-col md:flex-row items-start gap-x-12 gap-y-4 p-4 sm:p-6 pt-0">
            <div className="w-full md:w-80 lg:w-96 space-y-2">
              <Label className="text-gray-400 text-sm block font-medium">Remarks</Label>
              <Input readOnly={readOnly} className={`h-9 sm:h-10 text-sm glass-input !w-full !pl-3 text-white ${readOnly ? 'cursor-default opacity-90' : ''}`} value={remarks} onChange={e => !readOnly && setRemarks(e.target.value)} placeholder="Remarks" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400 text-sm block font-medium whitespace-nowrap">Attachment Sheet</Label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  id="cashier-report-attachment"
                  className="hidden"
                  accept="image/*,application/pdf,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={readOnly}
                  multiple
                  onChange={(e) => {
                    if (e.target.files?.length > 0) {
                      setAttachments(prev => [...prev, ...Array.from(e.target.files)]);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 glass-input !w-auto !pl-3 bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-full transition-all whitespace-nowrap"
                  onClick={() => document.getElementById('cashier-report-attachment').click()}
                  disabled={readOnly}
                >
                  <Paperclip className="w-4 h-4 mr-2 text-primary" />
                  Add Attachments
                </Button>

                {attachments.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {attachments.map((file, idx) => (
                      <div key={`new-${idx}`} className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs text-green-400 font-medium max-w-[120px] truncate">{file.name}</span>
                        {!readOnly && (
                          <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-red-500/20" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}>
                            <X className="w-3 h-3 text-red-400" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {(existingAttachments.length > 0 || attachments.length > 0) && (
            <div className="px-4 sm:px-6 pb-6">
              <div className="rounded-xl border border-white/10 overflow-hidden bg-white/5">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="hover:bg-transparent border-white/10">
                      <TableHead className="text-xs text-gray-400 h-10">Date & Time (IST)</TableHead>
                      <TableHead className="text-xs text-gray-400 h-10">Uploaded By</TableHead>
                      <TableHead className="text-xs text-gray-400 h-10">File Name</TableHead>
                      <TableHead className="text-xs text-gray-400 h-10 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {existingAttachments.map((att, idx) => (
                      <TableRow key={`existing-${idx}`} className="border-white/10 hover:bg-white/5 transition-colors">
                        <TableCell className="text-xs text-white py-3">{formatIST(att.uploaded_at)}</TableCell>
                        <TableCell className="text-xs text-white py-3">{att.uploaded_by || '-'}</TableCell>
                        <TableCell className="text-xs text-white py-3 max-w-[200px] truncate">{att.name || att.url?.split('/').pop() || 'File'}</TableCell>
                        <TableCell className="text-right py-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-500/10 text-blue-400" onClick={() => handleViewAttachment(att.url)}>
                              <Search className="w-4 h-4" />
                            </Button>
                            {!readOnly && (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-500/10 text-red-400" onClick={() => setDeleteConfirm({ url: att.url, name: att.name || 'File', index: idx })}>
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {attachments.map((file, idx) => (
                      <TableRow key={`new-row-${idx}`} className="border-white/10 bg-green-500/5 hover:bg-green-500/10 transition-colors">
                        <TableCell className="text-xs text-green-400 py-3 italic">Pending Submit</TableCell>
                        <TableCell className="text-xs text-green-400 py-3">You</TableCell>
                        <TableCell className="text-xs text-green-400 py-3 max-w-[200px] truncate">{file.name}</TableCell>
                        <TableCell className="text-right py-3">
                          {!readOnly && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-500/10 text-red-400" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}>
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Attachment?</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete <span className="text-white font-medium">{deleteConfirm?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="text-gray-400 hover:text-white hover:bg-white/5">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAttachment} className="bg-red-500 hover:bg-red-600 text-white">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CashierReportTab({ clientId, token, toast }) {
  return <CashierReportListTab clientId={clientId} token={token} toast={toast} />;
}

function HandoverTab({ clientId, token, toast, isAdminView = false, userRole, readOnly = false }) {
  const [viewMode, setViewMode] = useState('pending');
  const [datePreset, setDatePreset] = useState('last_30_days');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
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
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return list.filter(row => {
      const d = new Date(row.date);
      const vDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      if (datePreset === 'all_time' || datePreset === 'last_year') {
        const lastYear = new Date(today);
        lastYear.setDate(lastYear.getDate() - 365);
        return vDate >= lastYear && vDate <= today;
      }
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
      if (datePreset === 'last_3_months') {
        const last3 = new Date(today);
        last3.setMonth(last3.getMonth() - 3);
        return vDate >= last3 && vDate <= today;
      }
      if (datePreset === 'last_6_months') {
        const last6 = new Date(today);
        last6.setMonth(last6.getMonth() - 6);
        return vDate >= last6 && vDate <= today;
      }
      if (datePreset === 'custom') {
        const from = dateRange?.from ? new Date(dateRange.from) : null;
        const to = dateRange?.to ? new Date(dateRange.to) : null;
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
  const pendingItems = useMemo(() => applySearch(applyDateFilter(items.filter(row => row.status !== 'approved'))), [items, datePreset, dateRange, searchTerm, usersMap]);
  const historyItems = useMemo(() => applySearch(applyDateFilter(items.filter(row => row.status === 'approved'))), [items, datePreset, dateRange, searchTerm, usersMap]);
  const displayItems = viewMode === 'pending' ? pendingItems : historyItems;

  const [itemsPerPage, setItemsPerPage] = useState(10);
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
  }, [searchTerm, datePreset, dateRange, viewMode]);

  const totalPages = Math.ceil(displayItems.length / itemsPerPage);
  const paginatedItems = displayItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
  const getHandoverStatusColor = (row) => {
    if (row.status === 'approved') return 'bg-green-500/20 text-green-400 border-green-500/50';
    if (row.status === 'rejected') return 'bg-red-500/20 text-red-400 border-red-500/50';
    if (!isAdminView) {
      if (row.client_user_status === 'pending') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    }
    return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
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
                <SelectTrigger className="w-full sm:w-[190px] h-11 rounded-full glass-input px-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <SelectValue placeholder="Last Year" />
                  </div>
                </SelectTrigger>
                <SelectContent>
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
                  className="w-full sm:w-auto"
                />
              )}

              <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                <AnimatedSearch
                  placeholder="Date, Department, Created by..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
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
                    <TableCell className="text-xs sm:text-sm text-white">
                      <div>{toDDMMYYYY(row.date)}</div>
                      <div className="text-[10px] text-gray-400">{formatTime(row.created_at)}</div>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-white">{usersMap[row.created_by_user_id] || row.created_by_name || '—'}</TableCell>
                    <TableCell className="text-xs sm:text-sm text-white">{row.department_name || '—'}</TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <button type="button" className="text-left underline decoration-dotted hover:no-underline cursor-pointer text-white" onClick={() => setBreakdownModal({ type: 'department', row })}>
                        ₹ {Number(row.as_per_department).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <button type="button" className="text-left underline decoration-dotted hover:no-underline cursor-pointer text-white" onClick={() => setBreakdownModal({ type: 'system', row })}>
                        ₹ {Number(row.as_per_system).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </button>
                    </TableCell>
                    <TableCell className={`text-xs sm:text-sm ${getVarianceColor(row.variance)}`}>₹ {Number(row.variance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <span className={`inline-flex items-center justify-center text-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium border h-auto min-h-[1.5rem] whitespace-normal leading-tight ${getHandoverStatusColor(row)}`}>
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
      <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-6 p-4 sm:p-6 border-t border-white/10">
        <div className="flex items-center gap-4">
          <p className="text-xs sm:text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:inline">Rows per page:</span>
            <Select value={String(itemsPerPage)} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[70px] bg-transparent border-white/10 text-white text-xs">
                <SelectValue placeholder={String(itemsPerPage)} />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10 text-white">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
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
        <DialogContent className="max-w-lg w-[95vw] sm:w-full">
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
            <Button onClick={handleApprove} disabled={actioning} className="h-9 sm:h-10 text-sm text-white">{actioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Approve</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actioning || !actionRemark.trim()} className="h-9 sm:h-10 text-sm">{actioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!breakdownModal} onOpenChange={(open) => { if (!open) setBreakdownModal(null); setBreakdownEdit({}); }}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
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
              const defaultEdit = {
                physical_cash_at_desk: row.physical_cash_at_desk != null ? String(row.physical_cash_at_desk) : '',
                imprest_amount: row.imprest_amount != null ? String(row.imprest_amount) : '',
                less_payment: row.less_payment != null ? String(row.less_payment) : '',
              };
              paymentMethods.forEach(p => { defaultEdit[p.id] = breakdown[p.id] != null ? String(breakdown[p.id]) : ''; });
              const editValues = breakdownEdit[row.handover_id] ?? defaultEdit;
              const editRemarks = (breakdownEdit[row.handover_id + '_remarks'] !== undefined) ? breakdownEdit[row.handover_id + '_remarks'] : (row.handover_remarks || '');
              
              const setEdit = (key, value) => setBreakdownEdit(prev => ({ 
                ...prev, 
                [row.handover_id]: { ...(prev[row.handover_id] || defaultEdit), [key]: value } 
              }));
              const setEditRem = (v) => setBreakdownEdit(prev => ({ ...prev, [row.handover_id + '_remarks']: v }));
              const handleSaveBreakdown = async () => {
                if (!clientId || !token || !editable) return;
                setSavingBreakdown(true);
                try {
                  const collection_details = {};
                  paymentMethods.forEach(p => { collection_details[p.id] = parseFloat(editValues[p.id]) || 0; });
                  const payload = {
                    collection_details,
                    remarks: editRemarks,
                    physical_cash_at_desk: editValues.physical_cash_at_desk !== '' ? parseFloat(editValues.physical_cash_at_desk) : null,
                    imprest_amount: editValues.imprest_amount !== '' ? parseFloat(editValues.imprest_amount) : null,
                    less_payment: editValues.less_payment !== '' ? parseFloat(editValues.less_payment) : null,
                  };
                  await updateHandover(clientId, row.handover_id, payload, token);
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
                  <div className="border border-white/10 rounded overflow-hidden">
                    <Table className="w-full text-sm">
                      <TableHeader>
                        <TableRow className="bg-white/5 border-b border-white/10">
                          <TableHead className="text-left py-1 text-gray-400">Method</TableHead>
                          <TableHead className="text-right py-1 text-gray-400">Amount ₹</TableHead>
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

                  {/* Cash Tally Section */}
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Cash Tally</h4>
                    <div className="border border-white/10 rounded overflow-hidden">
                      <Table className="w-full text-sm">
                        <TableBody>
                          <TableRow className="border-b border-white/5">
                            <TableCell className="py-1">Cash Collection</TableCell>
                            <TableCell className="text-right py-1 font-medium italic">
                              ₹ {Number(row.cash_collection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                          <TableRow className="border-b border-white/5">
                            <TableCell className="py-1">Physical Cash at Desk</TableCell>
                            <TableCell className="text-right py-1">
                              {viewOnly || !editable ? (
                                <span>₹ {Number(editValues.physical_cash_at_desk || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              ) : (
                                <Input type="number" min={0} step={0.01} className="h-8 text-sm glass-input w-28 text-white inline-block text-right" value={editValues.physical_cash_at_desk ?? ''} onChange={e => setEdit('physical_cash_at_desk', e.target.value)} />
                              )}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-white/5">
                            <TableCell className="py-1 font-medium">Difference</TableCell>
                            <TableCell className={`text-right py-1 font-medium ${getVarianceColor(parseFloat(editValues.physical_cash_at_desk || 0) - (row.cash_collection || 0))}`}>
                              ₹ {(parseFloat(editValues.physical_cash_at_desk || 0) - (row.cash_collection || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Imprest Cash Section */}
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Imprest Cash</h4>
                    <div className="border border-white/10 rounded overflow-hidden">
                      <Table className="w-full text-sm">
                        <TableBody>
                          <TableRow className="border-b border-white/5">
                            <TableCell className="py-1">Imprest Amount</TableCell>
                            <TableCell className="text-right py-1">
                              {viewOnly || !editable ? (
                                <span>₹ {Number(editValues.imprest_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              ) : (
                                <Input type="number" min={0} step={0.01} className="h-8 text-sm glass-input w-28 text-white inline-block text-right" value={editValues.imprest_amount ?? ''} onChange={e => setEdit('imprest_amount', e.target.value)} />
                              )}
                            </TableCell>
                          </TableRow>
                          <TableRow className="border-b border-white/5">
                            <TableCell className="py-1">Less Payment</TableCell>
                            <TableCell className="text-right py-1">
                              {viewOnly || !editable ? (
                                <span>₹ {Number(editValues.less_payment || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              ) : (
                                <Input type="number" min={0} step={0.01} className="h-8 text-sm glass-input w-28 text-white inline-block text-right" value={editValues.less_payment ?? ''} onChange={e => setEdit('less_payment', e.target.value)} />
                              )}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-white/5">
                            <TableCell className="py-1 font-medium">Net Imprest Amount</TableCell>
                            <TableCell className="text-right py-1 font-medium">
                              ₹ {(parseFloat(editValues.imprest_amount || 0) - parseFloat(editValues.less_payment || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
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
  const cashVariance = denomTotal - closingBalance;

  const cashVoucherTotal = cashVouchers.reduce((s, v) => s + (Number(v.amount) || 0), 0);
  const debitVoucherTotal = debitVouchers.reduce((s, v) => s + (Number(v.amount) || 0), 0);

  const formatTime = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return format(d, 'dd/MM/yyyy, hh:mm a');
    } catch { return iso; }
  };

  const [pdfDownloading, setPdfDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!searched || loading) return;
    setPdfDownloading(true);
    try {
      const payload = {
        entity_name: displayName,
        report_date: dateFormatted,
        bank_rows: bankRows.map(({ bank, opening, closing, variance }) => ({
          bank_name: bank.bank_name || '—',
          account_number: bank.account_number || '—',
          opening,
          closing,
          variance,
        })),
        bank_opening_total: bankOpeningTotal,
        bank_closing_total: bankClosingTotal,
        bank_variance_total: bankVarianceTotal,
        cash_tally: {
          opening_balance: openingBalance,
          cash_in_handover: cashInHandover,
          cash_in_other: cashInOther,
          cash_out: cashOut,
          closing_balance: closingBalance,
          variance: cashVariance,
          remarks: cashTally?.remarks || '',
        },
        denominations: denominations.map(d => {
          const units = Number(denomDetails[d.id]) || 0;
          const total = (Number(d.value) || 0) * units;
          return { label: `Rs. ${Number(d.value).toLocaleString('en-IN')} x`, units, total };
        }),
        denom_total: denomTotal,
        cash_vouchers: cashVouchers.map(v => ({
          created_date: formatTime(v.created_date),
          voucher_id: v.voucher_id || '—',
          beneficiary_name: v.beneficiary_name || '—',
          remarks: v.remarks || '—',
          amount: Number(v.amount || 0),
        })),
        cash_voucher_total: cashVoucherTotal,
        debit_vouchers: debitVouchers.map(v => ({
          created_date: formatTime(v.created_date),
          voucher_id: v.voucher_id || '—',
          from_bank_account_name: v.from_bank_account_name || '—',
          from_bank_account_number: v.from_bank_account_number || '—',
          beneficiary_name: v.beneficiary_name || '—',
          remarks: v.remarks || '—',
          amount: Number(v.amount || 0),
        })),
        debit_voucher_total: debitVoucherTotal,
      };
      await downloadFinanceReportPDF(payload, token);
      toast({ title: 'Success', description: 'Finance report PDF downloaded.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to download PDF.' });
    } finally {
      setPdfDownloading(false);
    }
  };

  return (
    <Card className="glass-card border-white/5">
      <CardHeader className="p-4 sm:p-6 flex flex-row flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg sm:text-xl text-white">Finance Report</CardTitle>
          <CardDescription className="text-sm text-gray-400">Bank balance, physical cash tally, cash and debit vouchers for the selected date.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {searched && !loading && (
            <Button
              onClick={handleDownloadPDF}
              disabled={pdfDownloading}
              className="h-9 rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 gap-2 px-4 shadow-sm"
              variant="outline"
            >
              {pdfDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download PDF
            </Button>
          )}
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
                        <TableCell className={`text-xs sm:text-sm text-right ${getVarianceColor(variance)}`}>₹ {Number(variance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="!bg-amber-500/20 border-white/10 font-medium">
                      <TableCell className="text-xs sm:text-sm text-white">Total</TableCell>
                      <TableCell className="text-xs sm:text-sm text-white">—</TableCell>
                      <TableCell className="text-xs sm:text-sm text-white text-right">₹ {bankOpeningTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-white text-right">₹ {bankClosingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className={`text-xs sm:text-sm text-right ${getVarianceColor(bankVarianceTotal)}`}>₹ {bankVarianceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
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
                      <TableRow className="border-white/10">
                        <TableCell className="text-xs sm:text-sm font-medium text-white">Variance</TableCell>
                        <TableCell className={`text-xs sm:text-sm font-medium text-right ${getVarianceColor(cashVariance)}`}>₹ {cashVariance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
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
                          <TableCell className="text-xs sm:text-sm text-white text-right">₹ {Number(v.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
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
                          <TableCell className="text-xs sm:text-sm text-white text-right">₹ {Number(v.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
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
