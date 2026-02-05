
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { getBankAccountsForBeneficiaryDropdown, getOrganisationBankAccountsDropdown } from '@/lib/api';
import { compressImageIfNeeded } from '@/lib/imageCompression';

const VoucherForm = ({ beneficiaries, isLoading, organisationBankAccounts, onSave, onCancel, entityId, voucher, financeHeaders }) => {
    const isEditing = !!voucher;
    const { user } = useAuth();
    const [orgBankAccounts, setOrgBankAccounts] = useState(organisationBankAccounts || []);

    const [voucherType, setVoucherType] = useState(voucher?.voucher_type || 'debit');
    const [paymentType, setPaymentType] = useState(voucher?.payment_type || '');
    const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState(voucher?.beneficiary_id || '');
    const [fromBankAccountId, setFromBankAccountId] = useState(voucher?.from_bank_account_id || '');
    const [toBankAccountId, setToBankAccountId] = useState(voucher?.to_bank_account_id || '');

    useEffect(() => {
        if (voucher) {
            setVoucherType(voucher.voucher_type);
            setPaymentType(voucher.payment_type);
            setSelectedBeneficiaryId(voucher.beneficiary_id);
            setFromBankAccountId(voucher.from_bank_account_id || '');
            setToBankAccountId(voucher.to_bank_account_id || '');
        }
    }, [voucher])

    useEffect(() => {
        if (voucherType === 'cash') {
            setPaymentType('cash');
        } else if (!isEditing) {
            setPaymentType('');
        }
    }, [voucherType, isEditing]);

    // Cache for beneficiary bank accounts to avoid refetching
    const [beneficiaryBankAccountsCache, setBeneficiaryBankAccountsCache] = useState({});
    const [isLoadingOrgAccounts, setIsLoadingOrgAccounts] = useState(false);
    const [isLoadingBeneficiaryAccounts, setIsLoadingBeneficiaryAccounts] = useState(false);

    // Lazy load organisation bank accounts when payment type is selected (for all payment types)
    useEffect(() => {
        const fetchOrgAccounts = async () => {
            // Fetch if: not editing, entityId exists, payment type is selected (not empty), and we don't have accounts yet
            if (!isEditing && entityId && user?.access_token && paymentType && paymentType !== '' && orgBankAccounts.length === 0) {
                setIsLoadingOrgAccounts(true);
                try {
                    // Use optimized dropdown endpoint - much faster
                    const accounts = await getOrganisationBankAccountsDropdown(entityId, user.access_token);
                    setOrgBankAccounts(accounts || []);
                } catch (error) {
                    setOrgBankAccounts([]);
                } finally {
                    setIsLoadingOrgAccounts(false);
                }
            }
        };
        fetchOrgAccounts();
    }, [entityId, isEditing, user?.access_token, paymentType, orgBankAccounts.length]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        if (!isEditing) {
            formData.append('entity_id', entityId);
        }

        // Update form data with state values for combobox fields
        formData.set('beneficiary_id', selectedBeneficiaryId);
        if (voucherType === 'debit' && paymentType && paymentType !== '') {
            // For all payment types (not just bank_transfer), allow bank account selection
            formData.set('from_bank_account_id', fromBankAccountId || '');
            formData.set('to_bank_account_id', toBankAccountId || '');
        } else {
            formData.set('from_bank_account_id', '0');
            formData.set('to_bank_account_id', '0');
        }

        // Handle multiple attachments - compress images if needed
        const attachmentInput = e.target.querySelector('input[name="attachment"]');
        const files = attachmentInput?.files;

        // Remove any existing attachment entries
        formData.delete('attachment');

        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file && file.size > 0) {
                    try {
                        const compressedFile = await compressImageIfNeeded(file, 1); // Compress if > 1MB
                        formData.append('attachment', compressedFile);
                    } catch (error) {
                        console.error('Failed to compress image:', error);
                        // Continue with original file if compression fails
                        formData.append('attachment', file);
                    }
                }
            }
        } else if (isEditing) {
            // Keep existing attachments when editing and no new files selected
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

    // Fetch beneficiary bank accounts with caching (when beneficiary is selected and payment type is selected)
    // Using optimized dropdown endpoint for faster loading
    useEffect(() => {
        const fetchAccounts = async () => {
            // Fetch if: not editing, beneficiary selected, payment type is selected (not empty), and not already cached
            if (selectedBeneficiaryId && !isEditing && user?.access_token && paymentType && paymentType !== '') {
                // Check cache first
                if (beneficiaryBankAccountsCache[selectedBeneficiaryId]) {
                    return; // Already cached, no need to fetch
                }

                setIsLoadingBeneficiaryAccounts(true);
                try {
                    // Use optimized dropdown endpoint - much faster, returns only essential fields
                    const accounts = await getBankAccountsForBeneficiaryDropdown(selectedBeneficiaryId, user.access_token);
                    const accountsList = accounts || [];
                    // Cache the accounts
                    setBeneficiaryBankAccountsCache(prev => ({
                        ...prev,
                        [selectedBeneficiaryId]: accountsList
                    }));
                } catch (error) {
                    // Cache empty array on error
                    setBeneficiaryBankAccountsCache(prev => ({
                        ...prev,
                        [selectedBeneficiaryId]: []
                    }));
                } finally {
                    setIsLoadingBeneficiaryAccounts(false);
                }
            }
        };
        fetchAccounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBeneficiaryId, isEditing, user?.access_token, paymentType]);

    const selectedBeneficiaryBankAccounts = useMemo(() => {
        const accounts = isEditing
            ? (() => {
                if (!selectedBeneficiaryId || !beneficiaries) return [];
                const beneficiary = beneficiaries.find(b => String(b.id) === String(selectedBeneficiaryId));
                return beneficiary?.bank_accounts || [];
            })()
            : (beneficiaryBankAccountsCache[selectedBeneficiaryId] || []);

        // Only show active accounts in voucher bank transfer dropdown
        return (accounts || []).filter((acc) => acc?.is_active !== false);
    }, [selectedBeneficiaryId, beneficiaries, isEditing, beneficiaryBankAccountsCache]);

    return (
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto px-4 py-6 sm:p-6" closeDisabled={isLoading}>
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Voucher' : 'Add New Voucher'}</DialogTitle>
                <DialogDescription>
                    {isEditing ? 'Update the details of the existing voucher.' : 'Fill in the details to add a new voucher.'}
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div
                    className="space-y-6"
                    style={isLoading ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="voucherType" className="mb-2">Voucher Type</Label>
                            <Select name="voucher_type" required onValueChange={setVoucherType} value={voucherType} disabled={isLoading}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="debit">Debit</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="amount" className="mb-2">Amount</Label>
                            <Input name="amount" id="amount" type="number" step="0.01" required defaultValue={voucher?.amount} disabled={isLoading} />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="beneficiary_id" className="mb-2">Beneficiary</Label>
                        {isLoading ? (
                            <div className="flex items-center justify-center p-2 border border-white/20 bg-white/10 rounded-lg h-11">
                                <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                        ) : (
                            <Combobox
                                options={(beneficiaries || []).map(b => ({
                                    value: String(b.id),
                                    label: b.beneficiary_type === 'individual' ? b.name : b.company_name
                                }))}
                                value={selectedBeneficiaryId ? String(selectedBeneficiaryId) : ''}
                                onValueChange={(value) => setSelectedBeneficiaryId(value)}
                                placeholder="Select beneficiary..."
                                searchPlaceholder="Search beneficiaries..."
                                emptyText="No beneficiaries found."
                                disabled={isLoading}
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="payment_type" className="mb-2">Payment Type</Label>
                            {voucherType === 'debit' ? (
                                <Select name="payment_type" required onValueChange={setPaymentType} value={paymentType} disabled={isLoading}>
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

                        {voucherType === 'debit' && paymentType && paymentType !== '' && (
                            <>
                                <div>
                                    <Label htmlFor="from_bank_account_id" className="mb-2">From (Organisation Bank)</Label>
                                    {isLoadingOrgAccounts ? (
                                        <div className="flex items-center justify-center p-2 border border-white/20 bg-white/10 rounded-lg h-11">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        </div>
                                    ) : (
                                        <Combobox
                                            options={(isEditing ? (organisationBankAccounts || []) : orgBankAccounts).map(acc => ({
                                                value: String(acc.id),
                                                label: `${acc.bank_name} - ...${String(acc.account_number).slice(-4)}`
                                            }))}
                                            value={fromBankAccountId ? String(fromBankAccountId) : ''}
                                            onValueChange={(value) => setFromBankAccountId(value)}
                                            placeholder="Select your bank account..."
                                            searchPlaceholder="Search bank accounts..."
                                            emptyText="No bank accounts found."
                                            disabled={isLoading || isLoadingOrgAccounts}
                                        />
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <Label htmlFor="to_bank_account_id" className="mb-2">To (Beneficiary Bank)</Label>
                                    {isLoadingBeneficiaryAccounts ? (
                                        <div className="flex items-center justify-center p-2 border border-white/20 bg-white/10 rounded-lg h-11">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        </div>
                                    ) : !selectedBeneficiaryId ? (
                                        <div className="flex items-center justify-center p-2 border border-white/20 bg-white/10 rounded-lg h-11 text-gray-400">
                                            First select a beneficiary
                                        </div>
                                    ) : selectedBeneficiaryBankAccounts.length === 0 ? (
                                        <div className="flex items-center justify-center p-2 border border-white/20 bg-white/10 rounded-lg h-11 text-gray-400">
                                            No bank accounts for this beneficiary
                                        </div>
                                    ) : (
                                        <Combobox
                                            options={selectedBeneficiaryBankAccounts.map(acc => ({
                                                value: String(acc.id),
                                                label: `${acc.bank_name} - ${acc.account_number}`
                                            }))}
                                            value={toBankAccountId ? String(toBankAccountId) : ''}
                                            onValueChange={(value) => setToBankAccountId(value)}
                                            placeholder="Select beneficiary's account..."
                                            searchPlaceholder="Search beneficiary accounts..."
                                            emptyText="No bank accounts found."
                                            disabled={isLoading || isLoadingBeneficiaryAccounts}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="attachment" className="mb-2">Attachments (Multiple files allowed)</Label>
                        <Input id="attachment" name="attachment" type="file" multiple disabled={isLoading} />
                        {isEditing && voucher?.attachment_id && <p className="text-xs text-gray-400 mt-1">Leave empty to keep existing attachments.</p>}
                    </div>

                    {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                        <div>
                            <Label htmlFor="finance_header_id" className="mb-2">Finance Header</Label>
                            <Select name="finance_header_id" defaultValue={voucher?.finance_header_id} disabled={isLoading}>
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
                        <Label htmlFor="remarks" className="mb-2">Remarks</Label>
                        <Textarea name="remarks" id="remarks" defaultValue={voucher?.remarks} disabled={isLoading} />
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={onCancel}
                            disabled={isLoading}
                            style={isLoading ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        style={isLoading ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                    >
                        {isEditing ? 'Save Changes' : <><Plus className="w-4 h-4 mr-2" /> Add Voucher</>}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
};

export default VoucherForm;
