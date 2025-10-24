
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { getBankAccountsForBeneficiary } from '@/lib/api';

const VoucherForm = ({ beneficiaries, isLoading, organisationBankAccounts, onSave, onCancel, entityId, voucher, financeHeaders }) => {
    const isEditing = !!voucher;
    const { user } = useAuth();
    const [orgBankAccounts, setOrgBankAccounts] = useState(organisationBankAccounts || []);

    const [voucherType, setVoucherType] = useState(voucher?.voucher_type || 'debit');
    const [paymentType, setPaymentType] = useState(voucher?.payment_type || '');
    const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState(voucher?.beneficiary_id || '');

    useEffect(() => {
        if(voucher){
            setVoucherType(voucher.voucher_type);
            setPaymentType(voucher.payment_type);
            setSelectedBeneficiaryId(voucher.beneficiary_id);
        }
    }, [voucher])

    useEffect(() => {
        if (voucherType === 'cash') {
            setPaymentType('cash');
        } else if (!isEditing) { 
            setPaymentType('');
        }
    }, [voucherType, isEditing]);

    // Fetch organisation bank accounts when entityId changes (add flow)
    useEffect(() => {
        const fetchOrgAccounts = async () => {
            if (!isEditing && entityId && user?.access_token) {
                try {
                    const accounts = await import('@/lib/api').then(api => api.getOrganisationBankAccounts(entityId, user.access_token));
                    setOrgBankAccounts(accounts || []);
                } catch (error) {
                    setOrgBankAccounts([]);
                }
            }
        };
        fetchOrgAccounts();
    }, [entityId, isEditing, user?.access_token]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        if (!isEditing) {
            formData.append('entity_id', entityId);
        }

        const attachment = formData.get('attachment');
        if (isEditing && (!attachment || attachment.size === 0)) {
            formData.delete('attachment');
        }

        if (formData.get('voucher_type') === 'cash' || formData.get('payment_type') !== 'bank_transfer') {
            formData.set('from_bank_account_id', '0');
            formData.set('to_bank_account_id', '0');
        }
        if (formData.get('voucher_type') === 'cash') {
            formData.set('payment_type', 'cash');
        }

        // Remove finance_header_id for CLIENT_USER
        if (user?.role === 'CLIENT_USER') {
            formData.delete('finance_header_id');
        }
        
        onSave(formData, voucher?.id);
    };

    // Local state for beneficiary bank accounts (for add flow)
    const [beneficiaryBankAccounts, setBeneficiaryBankAccounts] = useState([]);

    useEffect(() => {
        // Fetch beneficiary bank accounts when a beneficiary is selected (add flow)
        const fetchAccounts = async () => {
            if (selectedBeneficiaryId && !isEditing && user?.access_token) {
                try {
                    const accounts = await getBankAccountsForBeneficiary(selectedBeneficiaryId, user.access_token);
                    setBeneficiaryBankAccounts(accounts || []);
                } catch (error) {
                    setBeneficiaryBankAccounts([]);
                }
            }
        };
        fetchAccounts();
    }, [selectedBeneficiaryId, isEditing, user?.access_token]);

    const selectedBeneficiaryBankAccounts = useMemo(() => {
        if (isEditing) {
            if (!selectedBeneficiaryId || !beneficiaries) return [];
            const beneficiary = beneficiaries.find(b => String(b.id) === String(selectedBeneficiaryId));
            return beneficiary?.bank_accounts || [];
        } else {
            return beneficiaryBankAccounts;
        }
    }, [selectedBeneficiaryId, beneficiaries, isEditing, beneficiaryBankAccounts]);

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Voucher' : 'Add New Voucher'}</DialogTitle>
                <DialogDescription>
                    {isEditing ? 'Update the details of the existing voucher.' : 'Fill in the details to add a new voucher.'}
                </DialogDescription>
            </DialogHeader>
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
                        <Input name="amount" id="amount" type="number" step="0.01" required defaultValue={voucher?.amount}/>
                    </div>
                </div>

                <div>
                    <Label htmlFor="beneficiary_id">Beneficiary</Label>
                    <Select name="beneficiary_id" required onValueChange={setSelectedBeneficiaryId} value={String(selectedBeneficiaryId)}>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="payment_type">Payment Type</Label>
                        {voucherType === 'debit' ? (
                            <Select name="payment_type" required onValueChange={setPaymentType} value={paymentType}>
                                <SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="upi">UPI</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="cheque">Cheque</SelectItem>
                                    <SelectItem value="demand_draft">Demand Draft</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input value="Cash" disabled />
                        )}
                    </div>

                    {voucherType === 'debit' && paymentType === 'bank_transfer' && (
                        <>
                            <div>
                                <Label htmlFor="from_bank_account_id">From (Organisation Bank)</Label>
                                <Select name="from_bank_account_id" required defaultValue={voucher?.from_bank_account_id}>
                                    <SelectTrigger><SelectValue placeholder="Select your bank account" /></SelectTrigger>
                                    <SelectContent>
                                        {(isEditing ? (organisationBankAccounts || []) : orgBankAccounts).map(acc => (
                                            <SelectItem key={acc.id} value={String(acc.id)}>
                                               {acc.bank_name} - ...{String(acc.account_number).slice(-4)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-2">
                                <Label htmlFor="to_bank_account_id">To (Beneficiary Bank)</Label>
                                <Select name="to_bank_account_id" required disabled={!selectedBeneficiaryId || selectedBeneficiaryBankAccounts.length === 0} defaultValue={voucher?.to_bank_account_id}>
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

                <div>
                    <Label htmlFor="attachment">Attachment</Label>
                    <Input id="attachment" name="attachment" type="file" />
                    {isEditing && voucher?.attachment_id && <p className="text-xs text-gray-400 mt-1">Leave empty to keep existing attachment.</p>}
                </div>

                {user?.role !== 'CLIENT_USER' && (
                <div>
                    <Label htmlFor="finance_header_id">Finance Header</Label>
                    <Select name="finance_header_id" defaultValue={voucher?.finance_header_id}>
                        <SelectTrigger><SelectValue placeholder="Select a header" /></SelectTrigger>
                        <SelectContent>
                            {(financeHeaders || []).map(header => (
                                <SelectItem key={header.id} value={String(header.id)}>
                                    {header.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                )}

                <div>
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea name="remarks" id="remarks" defaultValue={voucher?.remarks}/>
                </div>
               
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isLoading}>
                      {isEditing ? 'Save Changes' : <><Plus className="w-4 h-4 mr-2" /> Add Voucher</>}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
};

export default VoucherForm;
