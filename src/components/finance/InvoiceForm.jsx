import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { compressImageIfNeeded } from '@/lib/imageCompression';

const InvoiceForm = ({ entityId, beneficiaries, isLoading, onSave, onCancel, invoice, financeHeaders }) => {
    const { user } = useAuth();
    const isEditing = !!invoice;
    const today = new Date().toISOString().split('T')[0];

    const [amount, setAmount] = useState(invoice?.amount || 0);
    const [cgst, setCgst] = useState(invoice?.cgst || 0);
    const [sgst, setSgst] = useState(invoice?.sgst || 0);
    const [igst, setIgst] = useState(invoice?.igst || 0);
    const [total, setTotal] = useState(0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (cgst !== sgst) {
            alert('CGST and SGST must be equal.');
            return;
        }
        const formData = new FormData(e.target);
        if (!isEditing) {
            formData.append('entity_id', entityId);
        }
        
        // Compress image attachment if it's an image
        const attachment = formData.get('attachment');
        if (attachment && attachment.size > 0) {
            try {
                const compressedFile = await compressImageIfNeeded(attachment, 1); // Compress if > 1MB
                formData.set('attachment', compressedFile);
            } catch (error) {
                console.error('Failed to compress image:', error);
                // Continue with original file if compression fails
            }
        } else if (isEditing && (!attachment || attachment.size === 0)) {
            formData.delete('attachment');
        }
        
        onSave(formData, invoice?.id);
    };

    useEffect(() => {
        const preTaxAmount = parseFloat(amount) || 0;
        const cgstAmount = parseFloat(cgst) || 0;
        const sgstAmount = parseFloat(sgst) || 0;
        const igstAmount = parseFloat(igst) || 0;
        setTotal(preTaxAmount + cgstAmount + sgstAmount + igstAmount);
    }, [amount, cgst, sgst, igst]);

    return (
        <DialogContent className="max-w-3xl" closeDisabled={isLoading}>
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Invoice' : 'Add New Invoice'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div
                    style={isLoading ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="beneficiary_id">Beneficiary</Label>
                      <Select name="beneficiary_id" required defaultValue={invoice?.beneficiary_id} disabled={isLoading}>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoading ? "Loading beneficiaries..." : "Select beneficiary"} />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoading ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                          ) : (
                            (beneficiaries || []).map(b => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.beneficiary_type === 'individual' ? b.name : b.company_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                        <Label htmlFor="bill_number">Bill Number</Label>
                        <Input name="bill_number" id="bill_number" required defaultValue={invoice?.bill_number} disabled={isLoading} />
                    </div>
                    <div>
                        <Label htmlFor="date">Date</Label>
                        <Input name="date" id="date" type="date" required defaultValue={invoice ? new Date(invoice.date).toISOString().split('T')[0] : today} disabled={isLoading} />
                    </div>
                    <div>
                        <Label htmlFor="amount">Amount (excl. tax)</Label>
                        <Input name="amount" id="amount" type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} disabled={isLoading} />
                    </div>
                     <div>
                        <Label htmlFor="attachment">Attachment</Label>
                        <Input id="attachment" name="attachment" type="file" disabled={isLoading} />
                        {isEditing && invoice?.attachment_id && <p className="text-xs text-gray-400 mt-1">Leave empty to keep existing attachment.</p>}
                     </div>
                </div>

                {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
                  <div>
                      <Label htmlFor="finance_header_id">Finance Header</Label>
                      <Select name="finance_header_id" defaultValue={invoice?.finance_header_id} disabled={isLoading}>
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

                <div className="space-y-2">
                    <Label>Taxes</Label>
                    <div className="grid grid-cols-3 gap-4">
                       <div><Label htmlFor="cgst" className="text-xs">CGST</Label><Input name="cgst" id="cgst" type="number" step="0.01" value={cgst} onChange={(e) => { setCgst(e.target.value); setSgst(e.target.value); }} disabled={isLoading} /></div>
                       <div><Label htmlFor="sgst" className="text-xs">SGST</Label><Input name="sgst" id="sgst" type="number" step="0.01" value={sgst} onChange={(e) => { setSgst(e.target.value); setCgst(e.target.value); }} disabled={isLoading} /></div>
                       <div><Label htmlFor="igst" className="text-xs">IGST</Label><Input name="igst" id="igst" type="number" step="0.01" value={igst} onChange={(e) => setIgst(e.target.value)} disabled={isLoading} /></div>
                    </div>
                </div>
                
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                    <div>
                        <p className="text-sm text-gray-400">Pre-Tax Amount</p>
                        <p className="text-lg font-semibold text-white">₹{parseFloat(amount || 0).toFixed(2)}</p>
                    </div>
                     <div>
                        <p className="text-sm text-gray-400">Total (inc. GST)</p>
                        <p className="text-lg font-bold text-white">₹{total.toFixed(2)}</p>
                    </div>
                </div>

                <div>
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea name="remarks" id="remarks" defaultValue={invoice?.remarks} disabled={isLoading}/>
                </div>
                </div>
               
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost" type="button" onClick={onCancel} disabled={isLoading} style={isLoading ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isLoading} style={isLoading ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                    {isEditing ? 'Save Changes' : <><Plus className="w-4 h-4 mr-2" /> Add Invoice</>}
                  </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
};

export default InvoiceForm;
