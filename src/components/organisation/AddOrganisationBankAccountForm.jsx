import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';

const AddOrganisationBankAccountForm = ({ entityId, onAdd, onCancel, isSaving }) => {
    const [accountType, setAccountType] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isSaving) return;

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const finalData = { ...data, entity_id: entityId, account_type: accountType };
        onAdd(finalData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="bank_name">Bak Name</Label>
                    <Input id="bank_name" name="bank_name" required />
                </div>
                <div>
                    <Label htmlFor="branch_name">Branch Name</Label>
                    <Input id="branch_name" name="branch_name" required />
                </div>
                <div>
                    <Label htmlFor="account_type">Account Type</Label>
                    <Select value={accountType} onValueChange={setAccountType} required>
                        <SelectTrigger>
                            <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Savings Account">Savings Account</SelectItem>
                            <SelectItem value="Current Account">Current Account</SelectItem>
                            <SelectItem value="Recurring Deposit Account">Recurring Deposit Account</SelectItem>
                            <SelectItem value="Fixed Deposit Account">Fixed Deposit Account</SelectItem>
                            <SelectItem value="NRI Account">NRI Account</SelectItem>
                            <SelectItem value="DEMAT Account">DEMAT Account</SelectItem>
                            <SelectItem value="Senior Citizens' Account">Senior Citizens' Account</SelectItem>
                            <SelectItem value="Salary Account">Salary Account</SelectItem>
                            <SelectItem value="Credit Cash">Credit Cash</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="ifsc_code">IFSC Code</Label>
                    <Input id="ifsc_code" name="ifsc_code" required />
                </div>
                <div className="md:col-span-2">
                    <Label htmlFor="account_number">Account Number</Label>
                    <Input id="account_number" name="account_number" required />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="ghost" type="button" onClick={onCancel} disabled={isSaving}>
                        Cancel
                    </Button>
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

export default AddOrganisationBankAccountForm;
