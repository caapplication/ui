import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, File, Download, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth.jsx';
import { addSupportingFile, deleteSupportingFile, getServiceDetails } from '@/lib/api';

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const SupportingFilesTab = ({ service, onUpdate }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [uploadedFiles, setUploadedFiles] = useState(service.supporting_files || []);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);
    const fileInputRef = useRef(null);
    
    useEffect(() => {
        setUploadedFiles(service.supporting_files || []);
    }, [service]);


    const handleFileSelect = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        
        setIsLoading(true);
        try {
            const file = files[0];
            await addSupportingFile(service.id, file, user.agency_id, user.access_token);
            
            const updatedService = await getServiceDetails(service.id, user.agency_id, user.access_token);
            onUpdate(updatedService);

            toast({
                title: '✅ File Uploaded',
                description: `"${file.name}" has been uploaded successfully.`,
            });
        } catch (error) {
            toast({
                title: '❌ Upload Failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    
    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const removeFile = async (fileId) => {
        setIsDeleting(fileId);
        try {
            await deleteSupportingFile(fileId, user.access_token);
            const updatedService = await getServiceDetails(service.id, user.agency_id, user.access_token);
            onUpdate(updatedService);
            toast({ title: "✅ Success", description: "File removed." });
        } catch (error) {
            toast({ title: "❌ Error", description: `Failed to remove file: ${error.message}`, variant: "destructive" });
        } finally {
            setIsDeleting(null);
        }
    };
    
    const handleDownload = (file) => {
        toast({
            title: "🚧 Action not implemented",
            description: "Downloading files via the API is not specified.",
        });
        console.log("Download requested for:", file.file_url)
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Upload</h3>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".csv, .xls, .doc, .pptx, .pdf, .jpg, .jpeg, .png, .json, .xml, .zip"
                />
                <div
                    onClick={handleUploadClick}
                    className={`border-2 border-dashed border-gray-600 rounded-xl p-12 text-center transition-all duration-300 ${isLoading ? 'cursor-not-allowed bg-black/20' : 'cursor-pointer hover:border-primary hover:bg-primary/10'}`}
                >
                    <div className="flex flex-col items-center justify-center text-gray-400">
                        {isLoading ? (
                            <>
                                <Loader2 className="w-12 h-12 mb-4 animate-spin" />
                                <p className="font-semibold">Uploading...</p>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-12 h-12 mb-4" />
                                <p className="font-semibold">Drop a file here or click to upload.</p>
                                <p className="text-xs mt-1">Maximum file size: 10 MB.</p>
                                <p className="text-xs mt-1">File Format: CSV, XLS, DOC, PPTX, PDF, JPG, JSON, XML, ZIP</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Uploaded Files</h3>
                <div className="space-y-3">
                    <AnimatePresence>
                        {uploadedFiles.map((file) => (
                            <motion.div
                                key={file.id}
                                layout
                                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -50, scale: 0.9 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <File className="w-6 h-6 text-primary flex-shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="font-medium text-white truncate">{file.name}</p>
                                        <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleDownload(file)}>
                                        <Download className="w-5 h-5 text-gray-400 hover:text-white" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)} disabled={isDeleting === file.id}>
                                        {isDeleting === file.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5 text-red-500 hover:text-red-400" />}
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {uploadedFiles.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No files uploaded yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupportingFilesTab;