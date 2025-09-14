import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

const VoucherForm = ({ beneficiaries, isLoading, organisationBankAccounts, onAdd, onCancel, entityId }) => {
    const [voucherType, setVoucherType] = useState('debit');
    const [paymentType, setPaymentType] = useState('');
    const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState('');
    
    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.entity_id = entityId;

        if (data.voucher_type === 'cash' || data.payment_type !== 'bank') {
            data.from_bank_account_id = '0';
            data.to_bank_account_id = '0';
        }
        if (data.voucher_type === 'cash') {
            data.payment_type = 'cash';
        }

        onAdd(data);
    };

    const selectedBeneficiaryBankAccounts = useMemo(() => {
        if (!selectedBeneficiaryId || !beneficiaries) return [];
        const beneficiary = beneficiaries.find(b => String(b.id) === selectedBeneficiaryId);
        return beneficiary?.bank_accounts || [];
    }, [selectedBeneficiaryId, beneficiaries]);

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Add New Voucher</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="voucherType">Voucher Type</Label>
                        <Select name="voucher_type" required onValueChange={setVoucherType} value={voucherType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="debit">Debit</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input name="amount" id="amount" type="number" step="0.01" required />
                    </div>
                </div>

                <div>
                    <Label htmlFor="beneficiary_id">Beneficiary</Label>
                    <Select name="beneficiary_id" required onValueChange={setSelectedBeneficiaryId} value={selectedBeneficiaryId}>
                        <SelectTrigger>
                            <SelectValue placeholder={isLoading ? "Loading..." : "Select beneficiary"} />
                        </SelectTrigger>
                        <SelectContent>
                           {isLoading ? (
                            <div className="flex items-center justify-center p-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                           ) : (
                            (beneficiaries || []).map(b => (
                                <SelectItem key={b.id} value={String(b.id)}>
                                    {b.beneficiary_type === 'individual' ? b.name : b.company_name}
                                </SelectItem>
                            ))
                           )}
                        </SelectContent>
                    </Select>
                </div>

                {voucherType === 'debit' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="payment_type">Payment Type</Label>
                            <Select name="payment_type" required onValueChange={setPaymentType} value={paymentType}>
                                <SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="upi">UPI</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="bank">Bank</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {paymentType === 'bank' && (
                            <>
                                <div>
                                    <Label htmlFor="from_bank_account_id">From (Organisation Bank)</Label>
                                    <Select name="from_bank_account_id" required>
                                        <SelectTrigger><SelectValue placeholder="Select your bank account" /></SelectTrigger>
                                        <SelectContent>
                                            {(organisationBankAccounts || []).map(acc => (
                                                <SelectItem key={acc.id} value={String(acc.id)}>
                                                   {acc.bank_name} - ...{String(acc.account_number).slice(-4)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="md:col-span-2">
                                    <Label htmlFor="to_bank_account_id">To (Beneficiary Bank)</Label>
                                    <Select name="to_bank_account_id" required disabled={!selectedBeneficiaryId || selectedBeneficiaryBankAccounts.length === 0}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={
                                                !selectedBeneficiaryId 
                                                ? "First select a beneficiary" 
                                                : selectedBeneficiaryBankAccounts.length === 0 
                                                ? "No bank accounts for this beneficiary" 
                                                : "Select beneficiary's account"
                                            } />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedBeneficiaryBankAccounts.map(acc => (
                                                <SelectItem key={acc.id} value={String(acc.id)}>
                                                    {acc.bank_name} - {acc.account_number}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div>
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea name="remarks" id="remarks" />
                </div>
               
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isLoading}><Plus className="w-4 h-4 mr-2" /> Add Voucher</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
};

export default VoucherForm;