import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Search, Plus, Upload, Download, Phone, MessageSquare, Settings2, MoreVertical, RefreshCw, ArrowRight, ArrowLeft, Filter, Check, X, UserCheck, Trash2, Loader2, List as ListIcon, Grid as GridIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { getAllClientTeamMembers } from '@/lib/api/clients';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Mapping between business type enum values and display names (same as detail page)
const businessTypeToEnum = {
    'Individual': 'individual',
    'Sole Proprietorship': 'sole_proprietorship',
    'Partnership': 'partnership',
    'LLP': 'llp',
    'HUF': 'huf',
    'Private Limited Company': 'private_limited',
    'Public Limited Company': 'limited_company',
    'Joint Venture': 'joint_venture',
    'One Person Company': 'one_person_company',
    'NGO\'s': 'ngo',
    'NGO': 'ngo',
    'Trust': 'trust',
    'Section 8 Company': 'section_8_company',
    'Government Entity': 'government_entity',
    'Cooperative Society': 'cooperative_society',
    'Branch Office': 'branch_office',
    'AOP': 'aop',
    'Society': 'society',
};

// Reverse mapping: enum value to display name
const enumToBusinessType = Object.fromEntries(
    Object.entries(businessTypeToEnum).map(([key, value]) => [value, key])
);

const FilterPopover = ({ title, options, selectedValue, onSelect, children }) => {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder={`Search ${title.toLowerCase()}...`} />
                    <CommandList>
                        <CommandEmpty>No ${title.toLowerCase()} found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={(currentValue) => {
                                        onSelect(currentValue === selectedValue ? "" : currentValue);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedValue === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


const ClientList = ({ clients, onAddNew, onViewClient, onEditClient, allServices, onDeleteClient, onRefresh, businessTypes, onBulkDelete, teamMembers = [] }) => {
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        service: '',
        type: '',
        status: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedClients, setSelectedClients] = useState([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [clientTeamMembers, setClientTeamMembers] = useState({});
    const { user } = useAuth();
    const ITEMS_PER_PAGE = 10;

    const handleNotImplemented = () => {
        toast({
            title: "🚧 Feature Not Implemented",
            description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
        });
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const hasActiveFilters = Object.values(filters).some(v => v);

    const clearFilters = () => {
        setFilters({ service: '', type: '', status: '' });
        setCurrentPage(1);
    }

    const filteredClients = useMemo(() => {
        const filtered = clients.filter(client => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = (
                client.name?.toLowerCase().includes(searchLower) ||
                client.pan?.toLowerCase().includes(searchLower) ||
                client.mobile?.toLowerCase().includes(searchLower) ||
                client.email?.toLowerCase().includes(searchLower) ||
                client.customer_id?.toLowerCase().includes(searchLower)
            );

            const matchesService = !filters.service || client.availedServices?.some(s => s.id === filters.service);
            // Match by display name (filter uses display name, but client.client_type is enum)
            const clientTypeDisplay = enumToBusinessType[client.client_type] || client.client_type;
            const matchesType = !filters.type || clientTypeDisplay?.toLowerCase() === filters.type.toLowerCase();
            const matchesStatus = !filters.status || (filters.status === 'active' && client.is_active) || (filters.status === 'inactive' && !client.is_active);

            return matchesSearch && matchesService && matchesType && matchesStatus;
        });

        // Sort by updated_at (or created_at) descending - newest first (updated last comes on top)
        return filtered.sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || 0);
            const dateB = new Date(b.updated_at || b.created_at || 0);
            return dateB - dateA;
        });
    }, [clients, searchTerm, filters]);

    const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
    const paginatedClients = filteredClients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useEffect(() => {
        setSelectedClients([]);
    }, [currentPage, filters, searchTerm]);

    // Fetch team members for all clients using batch endpoint
    useEffect(() => {
        const fetchAllAssignments = async () => {
            if (!user?.access_token || !user?.agency_id) return;
            try {
                const results = await getAllClientTeamMembers(user.agency_id, user.access_token);
                setClientTeamMembers(results || {});
            } catch (error) {
                console.error("Failed to fetch client team members:", error);
            }
        };

        // Fetch all assignments once when the component mounts or user changes
        // This is much more efficient than fetching per client
        fetchAllAssignments();
    }, [user?.access_token, user?.agency_id]);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleSelectClient = (clientId) => {
        setSelectedClients(prev =>
            prev.includes(clientId)
                ? prev.filter(id => id !== clientId)
                : [...prev, clientId]
        );
    };

    const handleSelectAllOnPage = (checked) => {
        if (checked) {
            const pageClientIds = paginatedClients.map(c => c.id);
            setSelectedClients(prev => [...new Set([...prev, ...pageClientIds])]);
        } else {
            const pageClientIds = paginatedClients.map(c => c.id);
            setSelectedClients(prev => prev.filter(id => !pageClientIds.includes(id)));
        }
    };

    const handleSelectAllMatchingFilters = () => {
        const allFilteredIds = filteredClients.map(c => c.id);
        setSelectedClients(allFilteredIds);
    };

    const handleDeselectAll = () => {
        setSelectedClients([]);
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true);
        await onBulkDelete(selectedClients);
        setSelectedClients([]);
        setIsBulkDeleting(false);
    };

    const filterOptions = {
        type: businessTypes.map(bt => ({ value: bt.name, label: bt.name })),
        status: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
        ],
        service: allServices.map(s => ({ value: s.id, label: s.name })),
    };

    const isAllOnPageSelected = paginatedClients.length > 0 && paginatedClients.every(c => selectedClients.includes(c.id));
    const headerCheckboxState = isAllOnPageSelected ? 'checked' : selectedClients.some(id => paginatedClients.find(c => c.id === id)) ? 'indeterminate' : 'unchecked';

    return (
        <div className="h-full flex flex-col relative">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="w-3 h-8 bg-primary rounded-full" />
                    Clients
                </h1>
                <div className="flex items-center gap-2">
                    <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('list')}
                        title="List View"
                    >
                        <ListIcon className="w-5 h-5" />
                    </Button>
                    <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('grid')}
                        title="Grid View"
                    >
                        <GridIcon className="w-5 h-5" />
                    </Button>
                    <Button onClick={onAddNew}><Plus className="w-4 h-4 mr-2" /> New</Button>
                </div>
            </div>

            <div className="glass-pane p-4 rounded-lg mb-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-grow min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search Client, PAN, Mobile, Email, Customer ID..."
                            className="glass-input pl-10"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                    <Button variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters(!showFilters)}>
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                        {hasActiveFilters && <span className="ml-2 w-2 h-2 rounded-full bg-green-400" />}
                    </Button>

                    {hasActiveFilters && (
                        <Button variant="ghost" onClick={clearFilters} className="text-red-400 hover:text-red-300">
                            <X className="w-4 h-4 mr-2" />
                            Clear Filters
                        </Button>
                    )}

                    <div className="flex-grow flex justify-end items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onRefresh}><RefreshCw className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={handlePrevPage} disabled={currentPage === 1}><ArrowLeft className="w-4 h-4" /></Button>
                        <span className="text-sm">{currentPage} / {totalPages > 0 ? totalPages : 1}</span>
                        <Button variant="ghost" size="icon" onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0}><ArrowRight className="w-4 h-4" /></Button>
                    </div>
                </div>
                {showFilters && (
                    <div className="mt-4 flex flex-wrap gap-4 border-t border-white/10 pt-4">
                        <FilterPopover title="Recurring Service" options={filterOptions.service} selectedValue={filters.service} onSelect={(v) => handleFilterChange('service', v)}>
                            <Button variant="outline" className="justify-between">
                                {filters.service ? filterOptions.service.find(o => o.value === filters.service)?.label : 'Recurring Service'}
                            </Button>
                        </FilterPopover>
                        <FilterPopover title="Type" options={filterOptions.type} selectedValue={filters.type} onSelect={(v) => handleFilterChange('type', v)}>
                            <Button variant="outline" className="justify-between">
                                {filters.type ? filters.type : 'Type'}
                            </Button>
                        </FilterPopover>
                        <FilterPopover title="Status" options={filterOptions.status} selectedValue={filters.status} onSelect={(v) => handleFilterChange('status', v)}>
                            <Button variant="outline" className="justify-between">
                                {filters.status ? filterOptions.status.find(o => o.value === filters.status)?.label : 'Status'}
                            </Button>
                        </FilterPopover>
                    </div>
                )}
            </div>

            <div className="flex-grow overflow-y-auto glass-pane p-1 rounded-lg">
                {viewMode === 'list' ? (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-white/10">
                                    <TableHead>Photo</TableHead>
                                    <TableHead>Entity Name</TableHead>
                                    <TableHead>Organisation</TableHead>
                                    <TableHead>Contact No.</TableHead>
                                    <TableHead>Mail ID</TableHead>
                                    <TableHead>Client Users</TableHead>
                                    <TableHead>My Team</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedClients.map(client => (
                                    <TableRow
                                        key={client.id}
                                        className={cn("border-none hover:bg-white/5 cursor-pointer", selectedClients.includes(client.id) && "bg-primary/10")}
                                        onClick={() => onViewClient(client)}
                                    >
                                        <TableCell>
                                            <Avatar>
                                                <AvatarImage
                                                    src={`${import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002'}/clients/${client.id}/photo?token=${user?.access_token}&v=${client.updated_at ? new Date(client.updated_at).getTime() : 0}`}
                                                />
                                                <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell><span className="text-blue-400 hover:underline">{client.name}</span></TableCell>
                                        <TableCell>
                                            {client.organization_name || '-'}
                                        </TableCell>
                                        <TableCell>{client.mobile || '-'}</TableCell>
                                        <TableCell>{client.email || '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex -space-x-2">
                                                {client.orgUsers &&
                                                    [...(client.orgUsers.invited_users || []), ...(client.orgUsers.joined_users || [])].map(orgUser => (
                                                        <TooltipProvider key={orgUser.user_id}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Avatar className="w-8 h-8 border-2 border-gray-800 cursor-help">
                                                                        <AvatarImage
                                                                            src={(orgUser.photo_url || orgUser.photo) && (orgUser.photo_url || orgUser.photo).includes('.s3.amazonaws.com/')
                                                                                ? `${import.meta.env.VITE_LOGIN_API_URL || 'http://127.0.0.1:8001'}/profile/${orgUser.user_id}/photo?token=${user?.access_token}&v=${Date.now()}`
                                                                                : (orgUser.photo_url || orgUser.photo)}
                                                                        />
                                                                        <AvatarFallback>{orgUser.email.charAt(0)}</AvatarFallback>
                                                                    </Avatar>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>{orgUser.email}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    ))
                                                }
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                const assignedTeamMembers = clientTeamMembers[client.id] || [];
                                                if (assignedTeamMembers.length === 0) {
                                                    return '-';
                                                }

                                                // Find full team member data
                                                const memberDetails = assignedTeamMembers.map(assigned =>
                                                    teamMembers.find(m => String(m.user_id || m.id) === String(assigned.team_member_user_id))
                                                ).filter(Boolean);

                                                return (
                                                    <div className="flex -space-x-2">
                                                        {memberDetails.slice(0, 3).map((member, idx) => (
                                                            <TooltipProvider key={idx}>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Avatar className="w-8 h-8 border-2 border-gray-800 cursor-help">
                                                                            <AvatarImage
                                                                                src={(member.photo_url || member.photo) && (member.photo_url || member.photo).includes('.s3.amazonaws.com/')
                                                                                    ? `${import.meta.env.VITE_LOGIN_API_URL || 'http://127.0.0.1:8001'}/profile/${member.id || member.user_id}/photo?token=${user?.access_token}&v=${Date.now()}`
                                                                                    : (member.photo_url || member.photo)}
                                                                            />
                                                                            <AvatarFallback>{member.name ? member.name.charAt(0) : member.email.charAt(0)}</AvatarFallback>
                                                                        </Avatar>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>{member.email}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        ))}
                                                        {memberDetails.length > 3 && (
                                                            <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-800 flex items-center justify-center text-xs">
                                                                +{memberDetails.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell>
                                            {client.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {paginatedClients.length === 0 && (
                            <div className="text-center py-16 text-gray-500">
                                <p className="text-lg">No clients found.</p>
                                {clients.length > 0 ? <p>Try adjusting your filters.</p> : <p>Click "New" to get started.</p>}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
                        {paginatedClients.map(client => (
                            <div
                                key={client.id}
                                className={cn(
                                    "bg-white/5 rounded-lg p-4 flex flex-col gap-3 cursor-pointer hover:bg-primary/10 border border-white/10 transition-all",
                                    selectedClients.includes(client.id) && "ring-2 ring-primary"
                                )}
                                onClick={() => onViewClient(client)}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-14 h-14">
                                        <AvatarImage
                                            src={`${import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002'}/clients/${client.id}/photo?token=${user?.access_token}&v=${client.updated_at ? new Date(client.updated_at).getTime() : 0}`}
                                        />
                                        <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-bold text-lg text-white">{client.name}</div>
                                        <div className="text-xs text-gray-400">{client.customer_id || 'N/A'}</div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">{enumToBusinessType[client.client_type] || client.client_type || 'N/A'}</Badge>
                                    {client.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}
                                </div>
                                <div className="text-sm text-gray-300">
                                    <span className="font-semibold">Org:</span> {client.organization_name || '-'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs text-gray-400">Assigned:</span>
                                    {(() => {
                                        const assignedMember = teamMembers.find(
                                            (member) => String(member.user_id) === String(client.assigned_ca_user_id)
                                        );
                                        return assignedMember ? (
                                            <div className="flex items-center gap-1">
                                                <Avatar className="w-6 h-6">
                                                    <AvatarImage src={assignedMember.photo} />
                                                    <AvatarFallback>{assignedMember.name ? assignedMember.name.charAt(0) : assignedMember.email.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs">{assignedMember.name || assignedMember.email}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs">-</span>
                                        );
                                    })()}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {client.tags && client.tags.length > 0 ? (
                                        client.tags.map(tag => (
                                            <Badge key={tag.id} variant="secondary" style={{ backgroundColor: tag.color, color: '#fff' }}>
                                                {tag.name}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400">No tags</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {paginatedClients.length === 0 && (
                            <div className="col-span-full text-center py-16 text-gray-500">
                                <p className="text-lg">No clients found.</p>
                                {clients.length > 0 ? <p>Try adjusting your filters.</p> : <p>Click "New" to get started.</p>}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <AnimatePresence>
                {selectedClients.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-auto"
                    >
                        <div className="glass-pane p-2 rounded-lg flex items-center gap-4 shadow-lg">
                            <span className="text-sm font-medium px-2">{selectedClients.length} client(s) selected</span>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Selected
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete {selectedClients.length} clients?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the selected clients and all their associated data.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
                                            {isBulkDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                            Yes, delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Button variant="ghost" size="sm" onClick={handleDeselectAll}>Clear selection</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClientList;
