import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Eye, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { getVoucherAttachment, updateVoucher } from '@/lib/api';
import { getFinanceHeaders } from '@/lib/api/settings';

const ITEMS_PER_PAGE = 10;

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
};

import { Check } from 'lucide-react';

const VoucherHistory = ({ vouchers, onDeleteVoucher, onEditVoucher, onViewVoucher, isAccountantView, onRefresh }) => {
  const [voucherSearchTerm, setVoucherSearchTerm] = useState('');
  const [voucherToDelete, setVoucherToDelete] = useState(null);
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [financeHeaders, setFinanceHeaders] = useState([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHeaders = async () => {
      if (user && (user.role === 'CA_ACCOUNTANT' || user.role === 'CA_TEAM')) {
        try {
          const headers = await getFinanceHeaders(user.agency_id, user.access_token);
          setFinanceHeaders(headers);
        } catch (error) {
          toast({
            title: 'Error',
            description: `Failed to fetch finance headers: ${error.message}`,
            variant: 'destructive',
          });
        }
      }
    };
    fetchHeaders();
  }, [user, toast]);

  const sortedAndFilteredVouchers = useMemo(() => {
    let sortableVouchers = [...(vouchers || [])];

    sortableVouchers.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    const unexportedVouchers = sortableVouchers.filter(v => !v.is_exported);

    return unexportedVouchers.filter(v => {
      const searchTermMatch = (v.beneficiaryName && v.beneficiaryName.toLowerCase().includes(voucherSearchTerm.toLowerCase()));
      const typeFilterMatch = voucherTypeFilter === 'all' || v.voucher_type === voucherTypeFilter;
      return searchTermMatch && typeFilterMatch;
    });
  }, [vouchers, voucherSearchTerm, voucherTypeFilter]);

  const totalPages = Math.ceil(sortedAndFilteredVouchers.length / ITEMS_PER_PAGE);
  const paginatedVouchers = sortedAndFilteredVouchers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

  return (
    <Card className="glass-card mt-4">
        <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Beneficiary</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Remarks</TableHead>
                        {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && <TableHead>Header</TableHead>}
                        {isAccountantView && <TableHead>Ready for Export</TableHead>}
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedVouchers.map(voucher => {
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
                                {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                  <TableCell>
                                    {voucher.is_ready ? (
                                      <span>{financeHeaders.find(h => h.id === voucher.finance_header_id)?.name || 'N/A'}</span>
                                    ) : (
                                      <Select
                                        value={voucher.finance_header_id || ''}
                                        onValueChange={(value) => {
                                          const selectedHeader = financeHeaders.find(h => h.id === value);
                                          updateVoucher(voucher.id, { finance_header_id: selectedHeader.id }, user.access_token)
                                            .then(() => {
                                              toast({ title: 'Success', description: 'Voucher header updated.' });
                                              if (onRefresh) onRefresh();
                                            })
                                            .catch(err => {
                                              toast({ title: 'Error', description: `Failed to update voucher header: ${err.message}`, variant: 'destructive' });
                                            });
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select header" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {financeHeaders.map(header => (
                                            <SelectItem key={header.id} value={header.id}>
                                              {header.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </TableCell>
                                )}
                                {isAccountantView && (
                                    <TableCell>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${voucher.is_ready ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                            {voucher.is_ready ? 'Yes' : 'No'}
                                        </span>
                                    </TableCell>
                                )}
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => onViewVoucher(voucher)} className="text-gray-400 hover:text-gray-300">
                                            <Eye className="w-5 h-5" />
                                        </Button>
                                        {!voucher.is_ready && voucher.finance_header_id && (user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            className="text-green-400 hover:text-green-300"
                                            onClick={() => {
                                              updateVoucher(voucher.id, { is_ready: true }, user.access_token)
                                                .then(() => {
                                                  toast({ title: 'Success', description: 'Voucher marked as ready.' });
                                                  if (onRefresh) onRefresh();
                                                })
                                                .catch(err => {
                                                  toast({ title: 'Error', description: `Failed to mark voucher as ready: ${err.message}`, variant: 'destructive' });
                                                });
                                            }}
                                          >
                                            <Check className="w-4 h-4" />
                                          </Button>
                                        )}
                                        {!voucher.is_exported && (
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setVoucherToDelete(voucher.id)}>
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  This action cannot be undone. This will permanently delete the voucher.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel onClick={() => setVoucherToDelete(null)}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => { onDeleteVoucher(voucherToDelete); setVoucherToDelete(null); }}>Delete</AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            {paginatedVouchers.length === 0 && <p className="text-center text-gray-400 py-8">No vouchers found.</p>}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            <div>
                <p className="text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </CardFooter>
    </Card>
  );
};

export default VoucherHistory;
