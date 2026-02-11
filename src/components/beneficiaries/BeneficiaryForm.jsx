import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';

const BeneficiaryForm = ({ onAdd, onCancel, isEdit, beneficiary, isSaving }) => {
    const [beneficiaryType, setBeneficiaryType] = useState(beneficiary?.beneficiary_type || 'individual');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isSaving) return; // Prevent submission if already saving

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Convert empty email strings to null/undefined to allow saving without email
        if (data.email && data.email.trim() === '') {
            data.email = null;
        } else if (data.email) {
            data.email = data.email.trim();
        }

        if (isEdit) {
            onAdd({ ...beneficiary, ...data, beneficiary_type: beneficiaryType });
        } else {
            onAdd({ ...data, beneficiary_type: beneficiaryType });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div>
                <Label>Beneficiary Type</Label>
                <Select value={beneficiaryType} onValueChange={setBeneficiaryType} name="beneficiary_type">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {beneficiaryType === 'individual' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="name">Name</Label><Input name="name" id="name" required /></div>
                    <div><Label htmlFor="phone">Phone</Label><Input name="phone" id="phone" type="tel" required /></div>
                    <div className="md:col-span-2"><Label htmlFor="email">Email <span className="text-gray-400 text-xs">(Optional)</span></Label><Input name="email" id="email" type="email" /></div>
                    <div><Label htmlFor="aadhar">Aadhar</Label><Input name="aadhar" id="aadhar" required /></div>
                    <div><Label htmlFor="pan">PAN</Label><Input name="pan" id="pan" required /></div>
                </div>
            )}

            {beneficiaryType === 'company' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="company_name">Company Name</Label><Input name="company_name" id="company_name" required /></div>
                    <div><Label htmlFor="phone">Phone</Label><Input name="phone" id="phone" type="tel" required /></div>
                    <div className="md:col-span-2"><Label htmlFor="email">Email Address <span className="text-gray-400 text-xs">(Optional)</span></Label><Input name="email" id="email" type="email" /></div>
                    <div><Label htmlFor="gstin">GSTIN</Label><Input name="gstin" id="gstin" required /></div>
                    <div><Label htmlFor="pan">PAN</Label><Input name="pan" id="pan" required /></div>
                    <div><Label htmlFor="aadhar">Aadhar (of Proprietor)</Label><Input name="aadhar" id="aadhar" required /></div>
                    <div><Label htmlFor="proprietor_name">Proprietor Name</Label><Input name="proprietor_name" id="proprietor_name" required /></div>
                </div>
            )}

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
                            Save Beneficiary
                        </>
                    )}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default BeneficiaryForm;
