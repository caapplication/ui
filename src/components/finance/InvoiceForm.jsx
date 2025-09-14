import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

const InvoiceForm = ({ entityId, beneficiaries, isLoading, onAdd, onCancel }) => {
    const today = new Date().toISOString().split('T')[0];
    const [amount, setAmount] = useState(0);
    const [cgst, setCgst] = useState(0);
    const [sgst, setSgst] = useState(0);
    const [igst, setIgst] = useState(0);
    const [total, setTotal] = useState(0);

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        formData.append('entity_id', entityId);
        onAdd(formData);
    };

    useEffect(() => {
        const preTaxAmount = parseFloat(amount) || 0;
        const cgstAmount = parseFloat(cgst) || 0;
        const sgstAmount = parseFloat(sgst) || 0;
        const igstAmount = parseFloat(igst) || 0;
        setTotal(preTaxAmount + cgstAmount + sgstAmount + igstAmount);
    }, [amount, cgst, sgst, igst]);

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Add New Invoice</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="beneficiary_id">Beneficiary</Label>
                      <Select name="beneficiary_id" required>
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

                    <div><Label htmlFor="bill_number">Bill Number</Label><Input name="bill_number" id="bill_number" required /></div>
                    <div><Label htmlFor="date">Date</Label><Input name="date" id="date" type="date" required defaultValue={today} /></div>
                    <div>
                        <Label htmlFor="amount">Amount (excl. tax)</Label>
                        <Input name="amount" id="amount" type="number" step="0.01" required onChange={(e) => setAmount(e.target.value)} />
                    </div>
                     <div><Label htmlFor="attachment">Attachment</Label><Input id="attachment" name="attachment" type="file" /></div>
                </div>

                <div className="space-y-2">
                    <Label>Taxes</Label>
                    <div className="grid grid-cols-3 gap-4">
                       <div><Label htmlFor="cgst" className="text-xs">CGST</Label><Input name="cgst" id="cgst" type="number" step="0.01" defaultValue="0" onChange={(e) => setCgst(e.target.value)} /></div>
                       <div><Label htmlFor="sgst" className="text-xs">SGST</Label><Input name="sgst" id="sgst" type="number" step="0.01" defaultValue="0" onChange={(e) => setSgst(e.target.value)} /></div>
                       <div><Label htmlFor="igst" className="text-xs">IGST</Label><Input name="igst" id="igst" type="number" step="0.01" defaultValue="0" onChange={(e) => setIgst(e.target.value)} /></div>
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

                <div><Label htmlFor="remarks">Remarks</Label><Textarea name="remarks" id="remarks" /></div>
               
                <DialogFooter>
                  <DialogClose asChild><Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isLoading}><Plus className="w-4 h-4 mr-2" /> Add Invoice</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
};

export default InvoiceForm;