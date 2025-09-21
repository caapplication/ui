
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Trash2, Eye, ArrowUp, ArrowDown, Edit, FileText, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { getVoucherAttachment, updateVoucher } from '@/lib/api';

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
};

const VoucherHistory = ({ vouchers, onDeleteVoucher, onViewVoucher, onEditVoucher, financeHeaders, onRefresh }) => {
  const [voucherSearchTerm, setVoucherSearchTerm] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'created_date', direction: 'desc' });
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const sortedAndFilteredVouchers = useMemo(() => {
    let sortableVouchers = [...(vouchers || [])];

    sortableVouchers.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    return sortableVouchers.filter(v => {
      const searchTermMatch = (v.beneficiaryName && v.beneficiaryName.toLowerCase().includes(voucherSearchTerm.toLowerCase()));
      const typeFilterMatch = voucherTypeFilter === 'all' || v.voucher_type === voucherTypeFilter;
      return searchTermMatch && typeFilterMatch;
    });
  }, [vouchers, voucherSearchTerm, voucherTypeFilter]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return null;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="w-4 h-4 ml-2" />;
    }
    return <ArrowDown className="w-4 h-4 ml-2" />;
  };

  const handleViewAttachment = async (voucher) => {
    if (!voucher.attachment_id) {
        toast({ title: 'No Attachment', description: 'This voucher does not have an attachment.', variant: 'destructive' });
        return;
    }
    try {
        const attachmentUrl = await getVoucherAttachment(voucher.attachment_id, user.access_token);
        navigate(`/vouchers/${voucher.id}`, { state: { attachmentUrl, voucher } });
    } catch (error) {
       toast({ title: 'Error', description: `Could not fetch attachment: ${error.message}`, variant: 'destructive' });
    }
  };

  const handleHeaderChange = async (voucherId, headerId) => {
    try {
      await updateVoucher(voucherId, { finance_header_id: headerId }, user.access_token);
      toast({ title: 'Success', description: 'Voucher header updated.' });
      onRefresh(true);
    } catch (error) {
      const errorMessage = error.message || 'An unexpected error occurred.';
      toast({ title: 'Error', description: `Failed to update header: ${String(errorMessage)}`, variant: 'destructive' });
    }
  };

  const handleMarkAsReady = async (voucherId) => {
    try {
      await updateVoucher(voucherId, { is_ready: true }, user.access_token);
      toast({ title: 'Success', description: 'Voucher marked as ready.' });
      onRefresh(true);
    } catch (error) {
      const errorMessage = error.message || 'An unexpected error occurred.';
      toast({ title: 'Error', description: `Failed to mark as ready: ${String(errorMessage)}`, variant: 'destructive' });
    }
  };

  return (
    <Card className="glass-card mt-4">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <CardTitle>Voucher History</CardTitle>
                    <CardDescription>Review all cash and debit transactions.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Select value={voucherTypeFilter} onValueChange={setVoucherTypeFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="debit">Debit</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="relative w-full sm:w-auto sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input placeholder="Search vouchers..." className="pl-10" value={voucherSearchTerm} onChange={(e) => setVoucherSearchTerm(e.target.value)} />
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                          <Button variant="ghost" onClick={() => requestSort('created_date')} className="px-0 hover:bg-transparent">
                            Date
                            {getSortIcon('created_date')}
                          </Button>
                        </TableHead>
                        <TableHead>Beneficiary</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedAndFilteredVouchers.map(voucher => {
                        const { date, time } = formatDate(voucher.created_date);
                        return (
                            <TableRow key={voucher.id} className={`transition-colors ${voucher.is_ready ? 'bg-green-500/10' : ''}`}>
                                <TableCell>
                                    <div>{date}</div>
                                    <div className="text-xs text-gray-400">{time}</div>
                                </TableCell>
                                <TableCell>{voucher.beneficiaryName}</TableCell>
                                <TableCell><span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${voucher.voucher_type === 'cash' ? 'bg-green-500/20 text-green-300' : 'bg-pink-500/20 text-pink-300'}`}>{voucher.voucher_type}</span></TableCell>
                                <TableCell>₹{parseFloat(voucher.amount).toFixed(2)}</TableCell>
                                <TableCell>{voucher.remarks || 'N/A'}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => onEditVoucher(voucher)} className="text-blue-400 hover:text-blue-300">
                                            <Edit className="w-5 h-5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onViewVoucher(voucher)} className="text-gray-400 hover:text-gray-300">
                                            <Eye className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            {sortedAndFilteredVouchers.length === 0 && <p className="text-center text-gray-400 py-8">No vouchers found.</p>}
        </CardContent>
    </Card>
  );
};

export default VoucherHistory;
