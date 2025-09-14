import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Plus, FileText, Eye, Trash2, Paperclip } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';

const Invoices = ({ beneficiaries, invoices, onAddInvoice, onDeleteInvoice }) => {
  const [showUpload, setShowUpload] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const { toast } = useToast();

  const handleUploadInvoice = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const file = data.invoiceFile;
    
    const newInvoice = {
        id: Date.now(),
        beneficiary: data.beneficiary,
        billNumber: data.billNumber,
        date: data.date,
        amount: parseFloat(data.amount),
        cgst: parseFloat(data.cgst) || 0,
        sgst: parseFloat(data.sgst) || 0,
        igst: parseFloat(data.igst) || 0,
        remarks: data.remarks,
        fileName: file.name,
        fileUrl: URL.createObjectURL(file) // For demo purposes
    };
    
    onAddInvoice(newInvoice);
    setShowUpload(false);
    e.target.reset();
    toast({
      title: "Invoice Uploaded",
      description: "New invoice has been successfully captured."
    });
  };

  const handleDelete = (id) => {
    onDeleteInvoice(id);
    toast({
      title: "Invoice Deleted",
      description: "The invoice has been successfully removed."
    })
  }
  
  const handleView = (invoice) => {
    setViewInvoice(invoice);
  }
  
  const handleViewAttachment = (invoice) => {
      window.open(invoice.fileUrl, '_blank');
  };

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold gradient-text">Invoices</h1>
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Upload Invoice
          </Button>
        </div>

        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <Card className="liquid-glass">
              <CardHeader>
                <CardTitle className="text-white">Capture Invoice Details</CardTitle>
                <CardDescription className="text-gray-400">
                  Upload a PDF and fill in the details. Please verify below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUploadInvoice}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Label htmlFor="beneficiary">Beneficiary</Label>
                      <Select name="beneficiary" required>
                        <SelectTrigger><SelectValue placeholder="Select beneficiary" /></SelectTrigger>
                        <SelectContent>
                          {beneficiaries.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="invoiceFile">Invoice File (PDF)</Label>
                      <Input id="invoiceFile" name="invoiceFile" type="file" accept=".pdf" required />
                    </div>
                    <div>
                      <Label htmlFor="billNumber">Bill Number</Label>
                      <Input id="billNumber" name="billNumber" required />
                    </div>
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input id="date" name="date" type="date" required />
                    </div>
                    <div>
                      <Label htmlFor="amount">Total Amount</Label>
                      <Input id="amount" name="amount" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label htmlFor="cgst">CGST Amount</Label>
                      <Input id="cgst" name="cgst" type="number" step="0.01" />
                    </div>
                     <div>
                      <Label htmlFor="sgst">SGST Amount</Label>
                      <Input id="sgst" name="sgst" type="number" step="0.01" />
                    </div>
                    <div>
                      <Label htmlFor="igst">IGST Amount</Label>
                      <Input id="igst" name="igst" type="number" step="0.01" />
                    </div>
                    <div className="md:col-span-2">
                        <Label htmlFor="remarks">Remarks</Label>
                        <Textarea id="remarks" name="remarks" placeholder="Add any notes for this invoice..."/>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-6">
                    <Button type="submit">
                      <Upload className="w-4 h-4 mr-2" />
                      Capture & Save
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setShowUpload(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="space-y-4">
          {invoices.map((invoice, index) => (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <Card className="liquid-glass card-hover">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="font-semibold text-white text-lg">{invoice.billNumber}</p>
                            <p className="text-sm text-gray-400">To: {invoice.beneficiary} | Date: {invoice.date}</p>
                        </div>
                    </div>
                     <div className="hidden md:block">
                        <p className="text-lg text-gray-300">Amount: <span className="font-semibold text-white">${invoice.amount.toFixed(2)}</span></p>
                    </div>
                    <div className="flex items-center space-x-2">
                         <Button size="icon" variant="outline" onClick={() => handleView(invoice)}>
                            <Eye className="w-5 h-5" />
                        </Button>
                         <Button size="icon" variant="outline" onClick={() => handleViewAttachment(invoice)}>
                            <Paperclip className="w-5 h-5" />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => handleDelete(invoice.id)}>
                            <Trash2 className="w-5 h-5" />
                        </Button>
                    </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

      </motion.div>

      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="liquid-glass text-white">
          <DialogHeader>
            <DialogTitle>Invoice Details: {viewInvoice?.billNumber}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-3 py-4 text-base">
              <p><strong>Beneficiary:</strong> {viewInvoice.beneficiary}</p>
              <p><strong>Date:</strong> {viewInvoice.date}</p>
              <p><strong>File Name:</strong> {viewInvoice.fileName}</p>
              <p><strong>Total Amount:</strong> ${viewInvoice.amount.toFixed(2)}</p>
              <p><strong>CGST:</strong> ${viewInvoice.cgst.toFixed(2)}</p>
              <p><strong>SGST:</strong> ${viewInvoice.sgst.toFixed(2)}</p>
              <p><strong>IGST:</strong> ${viewInvoice.igst.toFixed(2)}</p>
              <p><strong>Remarks:</strong> {viewInvoice.remarks || 'N/A'}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setViewInvoice(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;