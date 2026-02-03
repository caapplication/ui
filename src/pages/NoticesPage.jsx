import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Plus, FileText, Eye, Trash2, Loader2, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const NoticesPage = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Mock Data
    const [notices, setNotices] = useState([
        { id: 1, clientName: 'The Abduz Group', title: 'GST Notice - Q3', date: '2025-01-15', status: 'Pending', type: 'Tax' },
        { id: 2, clientName: 'Tech Solutions Inc.', title: 'Income Tax Demand', date: '2025-01-10', status: 'Reviewed', type: 'Compliance' },
        { id: 3, clientName: 'Global Ventures', title: 'Assessment Order', date: '2025-01-05', status: 'Closed', type: 'Legal' },
    ]);

    const [selectedClient, setSelectedClient] = useState('');
    const [noticeTitle, setNoticeTitle] = useState('');

    // Mock Clients for Dropdown
    const clients = [
        { id: '1', name: 'The Abduz Group' },
        { id: '2', name: 'Tech Solutions Inc.' },
        { id: '3', name: 'Global Ventures' },
        { id: '4', name: 'Alpha Traders' },
    ];

    const handleUpload = (e) => {
        e.preventDefault();
        setIsUploading(true);

        // Simulate API call
        setTimeout(() => {
            const newNotice = {
                id: notices.length + 1,
                clientName: clients.find(c => c.id === selectedClient)?.name || 'Unknown',
                title: noticeTitle,
                date: new Date().toISOString().split('T')[0],
                status: 'Pending',
                type: 'General'
            };

            setNotices([newNotice, ...notices]);
            setIsUploading(false);
            setIsUploadModalOpen(false);
            setNoticeTitle('');
            setSelectedClient('');
        }, 1500);
    };

    const filteredNotices = notices.filter(notice =>
        notice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notice.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 text-white relative overflow-hidden h-full flex flex-col pt-20 lg:pt-8">
            {/* Top Page Header - Matching TaskManagementPage */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold">
                    Notices
                </h1>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button onClick={() => setIsUploadModalOpen(true)} className="rounded-lg flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Upload Notice</span>
                    </Button>
                </div>
            </div>

            {/* Main Content Card - Matching TaskList structure */}
            <div className="glass-pane rounded-lg flex-grow flex flex-col overflow-hidden">
                {/* Card Header */}
                <div className="p-4 border-b border-white/10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-xl font-semibold">All Notices</h2>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-wrap items-center">
                            <div className="relative w-full sm:w-auto sm:max-w-xs">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search notices..."
                                    className="pl-10 glass-input border-white/10 bg-black/20 text-white placeholder:text-gray-500 focus:ring-blue-500/50"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-grow overflow-auto relative min-h-0">
                    <Table className="min-w-full">
                        <TableHeader className="sticky top-0 z-10 border-b border-white/10">
                            <TableRow className="border-white/10 hover:bg-white/5">
                                <TableHead className="text-gray-300 w-[25%]">Client</TableHead>
                                <TableHead className="text-gray-300 w-[25%]">Notice Title</TableHead>
                                <TableHead className="text-gray-300 w-[15%]">Type</TableHead>
                                <TableHead className="text-gray-300 w-[15%]">Date Received</TableHead>
                                <TableHead className="text-gray-300 w-[10%]">Status</TableHead>
                                <TableHead className="text-right text-gray-300 w-[10%]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredNotices.length > 0 ? (
                                filteredNotices.map((notice) => (
                                    <TableRow key={notice.id} className="border-white/5 hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => navigate(`/notices/${notice.id}`)}>
                                        <TableCell className="font-medium text-white">{notice.clientName}</TableCell>
                                        <TableCell className="text-gray-300">
                                            <div className="flex items-center">
                                                <FileText className="w-4 h-4 mr-2 text-blue-400" />
                                                {notice.title}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-300">{notice.type}</TableCell>
                                        <TableCell className="text-gray-300">{notice.date}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                notice.status === 'Pending' ? 'destructive' :
                                                    notice.status === 'Reviewed' ? 'warning' : 'success'
                                            } className="capitalize">
                                                {notice.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end gap-2 transition-opacity">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20" onClick={() => navigate(`/notices/${notice.id}`)}>
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                                        No notices found based on your search.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                <DialogContent className="glass-card border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Upload Notice</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Select a client and upload the notice document.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpload} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="client">Client</Label>
                            <Select value={selectedClient} onValueChange={setSelectedClient} required>
                                <SelectTrigger className="glass-input border-white/10 bg-black/20">
                                    <SelectValue placeholder="Select a client" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map(client => (
                                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Notice Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g. GST Demand Notice"
                                className="glass-input border-white/10 bg-black/20"
                                value={noticeTitle}
                                onChange={(e) => setNoticeTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="file">Document</Label>
                            <div className="border-2 border-dashed border-white/10 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                                <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-400">Click to upload or drag and drop</span>
                                <span className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 10MB</span>
                                <Input id="file" type="file" className="hidden" required />
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                <Button variant="ghost" type="button" className="hover:bg-white/10">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isUploading} className="bg-blue-600 hover:bg-blue-700">
                                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Upload Notice
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default NoticesPage;
