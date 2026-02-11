import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';

const AddBankAccountForm = ({ beneficiary, onAddBankAccount, onCancel, isSaving }) => {
    const [accountType, setAccountType] = useState('savings');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isSaving) return;

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.account_type = accountType; // Add account type to data
        onAddBankAccount(beneficiary.id, data);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="bank_name">Bank Name</Label><Input name="bank_name" id="bank_name" required /></div>
                <div><Label htmlFor="branch_name">Branch Name</Label><Input name="branch_name" id="branch_name" required /></div>
                <div><Label htmlFor="account_type">Account Type</Label>
                    <Select value={accountType} onValueChange={setAccountType} name="account_type" required>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="savings">Savings</SelectItem>
                            <SelectItem value="current">Current</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div><Label htmlFor="ifsc_code">IFSC</Label><Input name="ifsc_code" id="ifsc_code" required /></div>
                <div className="md:col-span-2"><Label htmlFor="account_number">Account Number</Label><Input name="account_number" id="account_number" required /></div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="ghost" type="button" onClick={onCancel} disabled={isSaving}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Account
                        </>
                    )}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default AddBankAccountForm;
