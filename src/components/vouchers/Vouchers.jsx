import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Plus } from 'lucide-react';

const Vouchers = ({ beneficiaries, entityName, onAddVoucher }) => {
  const [voucherType, setVoucherType] = useState('cash');
  const { toast } = useToast();

  const handleAddVoucher = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    onAddVoucher(formData);
    toast({
      title: "Voucher Created",
      description: `New voucher has been successfully created for entity: ${entityName}.`
    });
    e.target.reset();
    setVoucherType('cash');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle className="text-white">New Transaction Voucher</CardTitle>
            <CardDescription className="text-gray-400">
              Entity: <span className="font-semibold text-sky-400">{entityName}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddVoucher}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="beneficiaryName">Select Beneficiary</Label>
                  <Select name="beneficiaryName" required>
                    <SelectTrigger><SelectValue placeholder="Select beneficiary" /></SelectTrigger>
                    <SelectContent>{beneficiaries.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {voucherType === 'cash' && (
                  <>
                    <div><Label htmlFor="amount">Amount</Label><Input name="amount" id="amount" type="number" required /></div>
                    <div><Label htmlFor="transferMethod">Transfer Method</Label><Input name="transferMethod" id="transferMethod" defaultValue="Cash" readOnly className="bg-white/10 border-white/20" /></div>
                    <input type="hidden" name="type" value="cash" />
                  </>
                )}

                {voucherType === 'debit' && (
                  <>
                    <div>
                      <Label htmlFor="paymentType">Payment Type</Label>
                      <Select name="paymentType" required>
                        <SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger>
                        <SelectContent><SelectItem value="bank">Bank</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="card">Card</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="account">Select Account</Label>
                      <Select name="account" required>
                        <SelectTrigger><SelectValue placeholder="Select beneficiary's account" /></SelectTrigger>
                        <SelectContent>{beneficiaries.map(b => <SelectItem key={b.id} value={b.aadharNumber}>{b.name} - ****{b.aadharNumber.slice(-4)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                     <input type="hidden" name="type" value="debit" />
                  </>
                )}
                <div className="md:col-span-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea name="remarks" id="remarks" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="attachment">Attachment</Label>
                  <Input id="attachment" name="attachment" type="file" required />
                </div>
              </div>
              <div className="flex space-x-2 mt-6">
                <Button type="submit"><Plus className="w-5 h-5 mr-2" /> Create Voucher</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
  );
};

export default Vouchers;
