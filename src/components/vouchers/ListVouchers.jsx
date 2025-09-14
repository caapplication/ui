import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Edit, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ListVouchers = ({ vouchers, onDeleteVoucher }) => {
  const { toast } = useToast();

  const handleDelete = (id) => {
    onDeleteVoucher(id);
    toast({ title: "Voucher Deleted", description: "The voucher has been removed." });
  };

  const handleEdit = (voucher) => {
    toast({ title: "🚧 Feature in progress", description: "Editing vouchers will be available soon!" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="liquid-glass mt-8">
          <CardHeader>
            <CardTitle className="text-white">Transaction History (Cash & Debit)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-white">Date</TableHead>
                  <TableHead className="text-white">Type</TableHead>
                  <TableHead className="text-white">Beneficiary</TableHead>
                  <TableHead className="text-white">Amount</TableHead>
                  <TableHead className="text-white">Remarks</TableHead>
                  <TableHead className="text-right text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="text-gray-300 font-medium">{voucher.date}</TableCell>
                    <TableCell className="text-gray-300 capitalize">{voucher.type}</TableCell>
                    <TableCell className="text-gray-300">{voucher.beneficiaryName}</TableCell>
                    <TableCell className="text-gray-300 font-semibold">{voucher.amount ? `$${voucher.amount}` : 'N/A'}</TableCell>
                    <TableCell className="text-gray-400 truncate max-w-xs">{voucher.remarks || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button size="icon" variant="outline" onClick={() => handleEdit(voucher)}><Edit className="w-4 h-4" /></Button>
                        <Button size="icon" variant="destructive" onClick={() => handleDelete(voucher.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
  );
};

export default ListVouchers;