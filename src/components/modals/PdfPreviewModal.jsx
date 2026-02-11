import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, X } from 'lucide-react';

const PdfPreviewModal = ({ isOpen, onClose, pdfUrl, title = 'Document Preview', fileName = 'document.pdf' }) => {
    const iframeRef = useRef(null);

    const handlePrint = () => {
        if (iframeRef.current) {
            iframeRef.current.contentWindow.print();
        }
    };

    const handleDownload = () => {
        if (!pdfUrl) return;
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-[95vw] h-[90vh] glass-card border-white/10 text-white flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b border-white/10 flex-shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>

                </DialogHeader>

                <div className="flex-grow bg-white/5 relative w-full h-full overflow-hidden">
                    {pdfUrl ? (
                        <iframe
                            ref={iframeRef}
                            src={`${pdfUrl}#toolbar=0`}
                            title="PDF Preview"
                            className="w-full h-full border-0"
                            type="application/pdf"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            Loading PDF...
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t border-white/10 bg-black/20 flex-shrink-0 gap-2 sm:gap-0">
                    <div className="flex w-full justify-end items-center">

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handlePrint}
                                className="border-white/20 hover:bg-white/10 text-white gap-2"
                            >
                                <Printer className="h-4 w-4" />
                                <span className="hidden sm:inline">Print</span>
                            </Button>
                            <Button
                                onClick={handleDownload}
                                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                            >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">Download</span>
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PdfPreviewModal;
