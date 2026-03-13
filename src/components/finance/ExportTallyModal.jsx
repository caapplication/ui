import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { exportVouchers, exportInvoices } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ExportTallyModal = ({ isOpen, onClose, entityId, entityName }) => {
  const [exportType, setExportType] = useState('vouchers');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleExport = async () => {
    if (!entityId) {
      toast({
        title: "Error",
        description: "No entity selected for export.",
        variant: "destructive",
      });
      return;
    }

    if (fromDate && toDate && fromDate > toDate) {
      toast({
        title: "Invalid Date Range",
        description: "From Date cannot be after To Date.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const formattedFromDate = fromDate ? format(fromDate, 'yyyy-MM-dd') : null;
      const formattedToDate = toDate ? format(toDate, 'yyyy-MM-dd') : null;

      if (exportType === 'vouchers') {
        await exportVouchers(entityId, user.access_token, formattedFromDate, formattedToDate, entityName);
      } else {
        await exportInvoices(entityId, user.access_token, formattedFromDate, formattedToDate, entityName);
      }

      toast({
        title: "Success",
        description: `${exportType === 'vouchers' ? 'Vouchers' : 'Invoices'} exported successfully.`,
      });
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: error.message || "An error occurred during export.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Helper to disable past dates in To Date picker based on From Date
  const isDateDisabled = (date) => {
    if (!fromDate) return false;
    // Disable dates before fromDate
    return date < fromDate;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export to Tally</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Entity Name Display */}
          <div className="flex flex-col gap-2">
            <Label className="text-gray-400">Exporting for Entity</Label>
            <div className="font-semibold text-lg">{entityName || "Unknown Entity"}</div>
          </div>

          {/* Export Type Selection */}
          <div className="flex flex-col gap-3">
            <Label>Export Type</Label>
            <RadioGroup defaultValue="vouchers" value={exportType} onValueChange={setExportType} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vouchers" id="r-vouchers" className="border-white text-primary" />
                <Label htmlFor="r-vouchers">Vouchers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="invoices" id="r-invoices" className="border-white text-primary" />
                <Label htmlFor="r-invoices">Invoices</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Range Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>From Date</Label>
              <DatePicker
                value={fromDate}
                onChange={setFromDate}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>To Date</Label>
              <DatePicker
                value={toDate}
                onChange={setToDate}
                disabled={isDateDisabled} // Block dates before From Date
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="bg-transparent border-gray-500 text-white hover:bg-gray-800">
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="bg-primary hover:bg-primary/90">
            {isExporting ? "Exporting..." : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportTallyModal;
