import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Search, Filter, Plus, FileText, Eye, Trash2, Loader2, UploadCloud, Bell } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { listClients, listClientsByOrganization } from '@/lib/api/clients';
import { getNotices, uploadNotice } from '@/lib/api/notices';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow, formatDistance } from 'date-fns';

const NoticesPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const token = user?.access_token;
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [notices, setNotices] = useState([]);
    const [clients, setClients] = useState([]);

    // Filters
    const [selectedClient, setSelectedClient] = useState('all');
    const [noticeTitle, setNoticeTitle] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    // Handle Quick Action from Global FAB
    useEffect(() => {
        if (location.state?.quickAction === 'add-notice') {
            setIsUploadModalOpen(true);
            // Clear state after handling
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    // Fetch Clients (using Client Service)
    useEffect(() => {
        const fetchClients = async () => {
            if (!token) return;
            try {
                let clientsData = [];
                if (user.organizations && user.organizations.length > 0) {
                    clientsData = await Promise.all(
                        user.organizations.map(org =>
                            listClientsByOrganization(org.id, token)
                                .catch(err => {
                                    console.error(`Failed to fetch clients for org ${org.id}`, err);
                                    return [];
                                })
                        )
                    ).then(results => results.flat());
                } else if (user.agency_id) {
                    clientsData = await listClients(user.agency_id, token);
                } else if (user.organization_id) {
                    clientsData = await listClientsByOrganization(user.organization_id, token);
                }

                console.log("Fetched Clients for Notices:", clientsData);
                const safeClients = Array.isArray(clientsData) ? clientsData : (clientsData.results || []);
                setClients(safeClients);

                // Default to 'all' if no client selected (already handled by useState, but ensuring consistency)
                if (!selectedClient) {
                    setSelectedClient('all');
                }

            } catch (error) {
                console.error("Failed to fetch clients", error);
                toast({ title: "Error", description: "Failed to load clients", variant: "destructive" });
            }
        };
        fetchClients();
    }, [token, user]);

    useEffect(() => {
        if (!token) {
            setNotices([]);
            return;
        }

        let isCurrent = true;

        const fetchNotices = async () => {
            setIsLoading(true);
            try {
                const data = await getNotices(selectedClient, token);
                if (isCurrent) {
                    setNotices(data);
                }
            } catch (error) {
                if (isCurrent) {
                    console.error("Failed to fetch notices", error);
                    toast({ title: "Error", description: "Failed to load notices", variant: "destructive" });
                }
            } finally {
                if (isCurrent) {
                    setIsLoading(false);
                }
            }
        };

        fetchNotices();

        return () => {
            isCurrent = false;
        };
    }, [selectedClient, token]);


    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        // Prevent upload if 'all' is selected
        if (!selectedClient || selectedClient === 'all' || !selectedFile || !noticeTitle) {
            toast({ title: "Error", description: "Please select a specific client to upload", variant: "destructive" });
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('entity_id', selectedClient);
            formData.append('title', noticeTitle);
            // Defaut notice_type -> other, date_received -> null handled by backend
            formData.append('file', selectedFile);

            await uploadNotice(formData, token);

            toast({ title: "Success", description: "Notice uploaded successfully" });

            // Refund/Refresh list
            const updatedNotices = await getNotices(selectedClient, token);
            setNotices(updatedNotices);

            setIsUploadModalOpen(false);
            setNoticeTitle('');
            setSelectedFile(null);
            // Don't reset selectedClient to keep the view active
        } catch (error) {
            console.error("Upload failed", error);
            toast({ title: "Failed", description: "Failed to upload notice", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const [viewMode, setViewMode] = useState('active'); // 'active' or 'history'

    const filteredNotices = notices.filter(notice => {
        // Filter out unknown clients (not in our fetched list)
        const isKnownClient = clients.some(c => c.id === notice.entity_id);
        if (!isKnownClient) return false;

        // Status Filtering
        const isClosed = notice.status === 'closed';
        if (viewMode === 'active' && isClosed) return false;
        if (viewMode === 'history' && !isClosed) return false;

        // Search and Client Filtering (Client already filtered by API if specific, but double check for 'all')
        return filterNotice(notice, searchTerm);
    });

    function filterNotice(notice, term) {
        if (!term) return true;
        const lowerTerm = term.toLowerCase();
        // Client name matching might be tricky if notice doesn't contain it directly, check backend response schema
        // NoticeResponse has 'entity_id', we might need to lookup name from 'clients' map
        const clientName = clients.find(c => c.id === notice.entity_id)?.name || '';

        return (
            (notice.title && notice.title.toLowerCase().includes(lowerTerm)) ||
            (clientName && clientName.toLowerCase().includes(lowerTerm)) ||
            (notice.notice_type && notice.notice_type.toLowerCase().includes(lowerTerm))
        );
    }

    // Helper to get client name
    const getClientName = (entityId) => {
        if (entityId === 'all') return 'All Entities';
        return clients.find(c => c.id === entityId)?.name || 'Unknown Client';
    };

    return (
        <div className="p-4 md:p-8 text-white relative overflow-hidden h-full flex flex-col pt-20 lg:pt-8">
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold">
                    Notices
                </h1>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Filter Dropdown for Main View if needed, or just Upload */}
                    {/* Filter Dropdown for Main View if needed, or just Upload */}
                    <Combobox
                        options={[
                            { value: 'all', label: 'All Entities' },
                            ...clients.map(client => ({ value: client.id, label: client.name }))
                        ]}
                        value={selectedClient}
                        onValueChange={setSelectedClient}
                        placeholder="Select Client"
                        searchPlaceholder="Search client..."
                        className="w-[250px] border-white/10 bg-black/20 text-white"
                    />

                    {user?.role === 'CA_ACCOUNTANT' && (
                        <Button onClick={() => setIsUploadModalOpen(true)} className="rounded-lg flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Upload Notice</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Content Card */}
            <div className="glass-pane rounded-lg flex-grow flex flex-col overflow-hidden">
                {/* Card Header */}
                {/* Content Header with Toggle */}
                <div className="p-4 border-b border-white/10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-semibold">
                                {selectedClient
                                    ? `${getClientName(selectedClient)} - Notices`
                                    : 'Select a Client to View Notices'}
                            </h2>
                            {/* Toggle Button Group */}
                            <div className="flex p-1 bg-black/20 rounded-lg border border-white/10 backdrop-blur-sm">
                                <button
                                    onClick={() => setViewMode('active')}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === 'active'
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => setViewMode('history')}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === 'history'
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    History
                                </button>
                            </div>
                        </div>

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
                                <TableHead className="w-[40px]"></TableHead>
                                <TableHead className="text-gray-300 w-[20%]">Client</TableHead>
                                <TableHead className="text-gray-300 w-[25%]">Notice</TableHead>
                                <TableHead className="text-gray-300 w-[20%]">Uploaded Date</TableHead>
                                {viewMode === 'history' && (
                                    <>
                                        <TableHead className="text-gray-300 w-[15%]">Completed Date</TableHead>
                                        <TableHead className="text-gray-300 w-[10%]">Duration</TableHead>
                                    </>
                                )}
                                <TableHead className="text-gray-300 w-[15%]">Uploaded By</TableHead>
                                <TableHead className="text-gray-300 w-[15%]">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        Loading notices...
                                    </TableCell>
                                </TableRow>
                            ) : filteredNotices.length > 0 ? (
                                filteredNotices.map((notice) => (
                                    <TableRow key={notice.id} className="border-white/5 hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => navigate(`/notices/${notice.id}`)}>
                                        <TableCell className="w-[40px] px-2 text-center">
                                            {notice.has_unread_messages && (
                                                <div className="relative inline-flex items-center justify-center">
                                                    <Bell className="w-4 h-4 text-orange-500 fill-orange-500/20" />
                                                    <span className="flex h-2 w-2 absolute -top-1 -right-1">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-600"></span>
                                                    </span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium text-white">{getClientName(notice.entity_id)}</TableCell>
                                        <TableCell className="text-gray-300">
                                            <div className="flex items-center">
                                                <FileText className="w-4 h-4 mr-2 text-blue-400 shrink-0" />
                                                <span className="truncate">{notice.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-300">
                                            {(() => {
                                                if (!notice.created_at) return 'N/A';
                                                const dateObj = new Date(notice.created_at);
                                                const datePart = dateObj.toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                });
                                                let duration = '';
                                                try {
                                                    duration = formatDistanceToNow(dateObj, { addSuffix: true });
                                                } catch (e) { console.error(e); }

                                                return (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-white">{datePart}</span>
                                                        <span className="text-xs text-gray-400">{duration}</span>
                                                    </div>
                                                );
                                            })()}
                                        </TableCell>
                                        {viewMode === 'history' && (
                                            <>
                                                <TableCell className="text-gray-300">
                                                    {(() => {
                                                        if (!notice.reviewed_at) return 'N/A';
                                                        const dateObj = new Date(notice.reviewed_at);
                                                        const datePart = dateObj.toLocaleDateString('en-IN', {
                                                            day: 'numeric', month: 'short', year: 'numeric'
                                                        });
                                                        return <span className="font-medium text-white">{datePart}</span>;
                                                    })()}
                                                </TableCell>
                                                <TableCell className="text-gray-300">
                                                    {(() => {
                                                        if (!notice.created_at || !notice.reviewed_at) return 'N/A';
                                                        try {
                                                            return formatDistance(new Date(notice.created_at), new Date(notice.reviewed_at));
                                                        } catch (e) { return 'N/A'; }
                                                    })()}
                                                </TableCell>
                                            </>
                                        )}
                                        <TableCell className="text-gray-300">
                                            {notice.created_by_name || 'Unknown'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                notice.status === 'pending' ? 'destructive' :
                                                    notice.status === 'closure_requested' ? 'warning' :
                                                        notice.status === 'closed' ? 'success' : 'secondary'
                                            } className="capitalize relative max-w-fit whitespace-nowrap">
                                                {notice.status === 'closed' ? 'Verified' : notice.status?.replace('_', ' ')}
                                            </Badge>
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
                                placeholder="Enter notice title"
                                value={noticeTitle}
                                onChange={(e) => setNoticeTitle(e.target.value)}
                                className="glass-input border-white/10 bg-black/20"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="file">Document</Label>
                            <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center hover:bg-white/5 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    id="file"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    required
                                />
                                <div className="flex flex-col items-center gap-2 pointer-events-none">
                                    <UploadCloud className="w-8 h-8 text-blue-400" />
                                    <span className="text-sm text-gray-400">
                                        {selectedFile ? selectedFile.name : "Click to upload file (PDF, Images)"}
                                    </span>
                                </div>
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
