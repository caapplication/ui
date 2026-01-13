import React, { useState, useMemo, useEffect, useTransition, Suspense } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { getAllClientTeamMembers } from '@/lib/api/clients';
import {
    Search,
    Plus,
    RefreshCw,
    ArrowRight,
    ArrowLeft,
    Filter,
    Check,
    X,
    Trash2,
    Loader2,
    List as ListIcon,
    Grid as GridIcon,
} from 'lucide-react';

const businessTypeToEnum = {
    Individual: 'individual',
    'Sole Proprietorship': 'sole_proprietorship',
    Partnership: 'partnership',
    LLP: 'llp',
    HUF: 'huf',
    'Private Limited Company': 'private_limited',
    'Public Limited Company': 'limited_company',
    'Joint Venture': 'joint_venture',
    'One Person Company': 'one_person_company',
    "NGO's": 'ngo',
    NGO: 'ngo',
    Trust: 'trust',
    'Section 8 Company': 'section_8_company',
    'Government Entity': 'government_entity',
    'Cooperative Society': 'cooperative_society',
    'Branch Office': 'branch_office',
    AOP: 'aop',
    Society: 'society',
};

const enumToBusinessType = Object.fromEntries(
    Object.entries(businessTypeToEnum).map(([key, value]) => [value, key])
);

const FilterPopover = ({ title, options, selectedValue, onSelect, children }) => {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder={`Search ${title.toLowerCase()}...`} />
                    <CommandList>
                        <CommandEmpty>No {title.toLowerCase()} found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={(currentValue) => {
                                        onSelect(currentValue === selectedValue ? '' : currentValue);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            selectedValue === option.value ? 'opacity-100' : 'opacity-0'
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

const ClientList = ({
    clients,
    onAddNew,
    onViewClient,
    allServices,
    onRefresh,
    businessTypes,
    teamMembers = [],
}) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ service: '', type: '', status: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [clientTeamMembers, setClientTeamMembers] = useState({});
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
    const [isRefreshing, startRefreshTransition] = useTransition();
    const ITEMS_PER_PAGE = 10;

    const hasActiveFilters = Object.values(filters).some(Boolean);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilters({ service: '', type: '', status: '' });
        setCurrentPage(1);
    };

    const filteredClients = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();

        const filtered = clients.filter((client) => {
            const matchesSearch =
                client.name?.toLowerCase().includes(searchLower) ||
                client.pan?.toLowerCase().includes(searchLower) ||
                client.mobile?.toLowerCase().includes(searchLower) ||
                client.email?.toLowerCase().includes(searchLower) ||
                client.customer_id?.toLowerCase().includes(searchLower);

            const matchesService =
                !filters.service || client.availedServices?.some((s) => String(s.id) === String(filters.service));

            const clientTypeDisplay = enumToBusinessType[client.client_type] || client.client_type;
            const matchesType =
                !filters.type || clientTypeDisplay?.toLowerCase() === filters.type.toLowerCase();

            const matchesStatus =
                !filters.status ||
                (filters.status === 'active' && client.is_active) ||
                (filters.status === 'inactive' && !client.is_active);

            return matchesSearch && matchesService && matchesType && matchesStatus;
        });

        return filtered.sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || 0);
            const dateB = new Date(b.updated_at || b.created_at || 0);
            return dateB - dateA;
        });
    }, [clients, searchTerm, filters]);

    const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
    const paginatedClients = filteredClients.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [filters, searchTerm]);

    useEffect(() => {
        const fetchAllAssignments = async () => {
            if (!user?.access_token || !user?.agency_id) return;
            setIsLoadingAssignments(true);
            try {
                const results = await getAllClientTeamMembers(user.agency_id, user.access_token);
                setClientTeamMembers(results || {});
            } catch (error) {
                console.error('Failed to fetch client team members:', error);
            } finally {
                setIsLoadingAssignments(false);
            }
        };

        fetchAllAssignments();
    }, [user?.access_token, user?.agency_id]);

    const filterOptions = {
        type: businessTypes.map((bt) => ({ value: bt.name, label: bt.name })),
        status: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
        ],
        service: allServices.map((s) => ({ value: s.id, label: s.name })),
    };

    const headerCheckboxState = React.useMemo(() => {
        if (paginatedClients.length === 0) return 'unchecked';
        return 'unchecked';
    }, [paginatedClients]);

    const renderClientUsers = (client) => {
        const orgUsers = client.orgUsers;
        const users = [...(orgUsers?.invited_users || []), ...(orgUsers?.joined_users || [])];
        if (!users.length) return <span>-</span>;

        return (
            <div className="flex -space-x-2">
                {users.slice(0, 3).map((orgUser) => (
                    <TooltipProvider key={orgUser.user_id}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Avatar className="w-8 h-8 border-2 border-gray-800 cursor-help">
                                    <AvatarFallback>{orgUser.email?.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{orgUser.email}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
                {users.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-800 flex items-center justify-center text-xs">
                        +{users.length - 3}
                    </div>
                )}
            </div>
        );
    };

    const renderTeamMembers = (client) => {
        if (isLoadingAssignments) {
            return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;
        }
        const assignedTeamMembers = clientTeamMembers[client.id] || [];
        if (!assignedTeamMembers.length) {
            return '-';
        }

        const memberDetails = assignedTeamMembers
            .map((assigned) =>
                teamMembers.find((m) => String(m.user_id || m.id) === String(assigned.team_member_user_id))
            )
            .filter(Boolean);

        if (!memberDetails.length) return '-';

        return (
            <div className="flex -space-x-2">
                {memberDetails.slice(0, 3).map((member, idx) => (
                    <TooltipProvider key={`${client.id}-${idx}`}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Avatar className="w-8 h-8 border-2 border-gray-800 cursor-help">
                                    <AvatarFallback>
                                        {member.name ? member.name.charAt(0) : member.email?.charAt(0)}
                                    </AvatarFallback>
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
    };

    const renderTableView = () => (
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
                {paginatedClients.map((client) => (
                    <TableRow
                        key={client.id}
                        className="border-none hover:bg-white/5 cursor-pointer"
                        onClick={() => onViewClient(client)}
                    >
                        <TableCell>
                            <Avatar>
                                <AvatarImage
                                    src={`${
                                        import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002'
                                    }/clients/${client.id}/photo?token=${user?.access_token}&v=$
{client.updated_at ? new Date(client.updated_at).getTime() : 0}`}
                                />
                                <AvatarFallback>{client.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </TableCell>
                        <TableCell>
                            <span className="text-blue-400 hover:underline">{client.name}</span>
                        </TableCell>
                        <TableCell>{client.organization_name || '-'}</TableCell>
                        <TableCell>{client.mobile || '-'}</TableCell>
                        <TableCell>{client.email || '-'}</TableCell>
                        <TableCell>{renderClientUsers(client)}</TableCell>
                        <TableCell>{renderTeamMembers(client)}</TableCell>
                        <TableCell>
                            {client.is_active ? (
                                <Badge variant="success">Active</Badge>
                            ) : (
                                <Badge variant="destructive">Inactive</Badge>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    const renderGridView = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
            {paginatedClients.map((client) => (
                <div
                    key={client.id}
                    className={cn(
                        'bg-white/5 rounded-lg p-4 flex flex-col gap-3 cursor-pointer hover:bg-primary/10 border border-white/10 transition-all'
                    )}
                    onClick={() => onViewClient(client)}
                >
                    <div className="flex items-center gap-3">
                        <Avatar className="w-14 h-14">
                            <AvatarImage
                                src={`${
                                    import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002'
                                }/clients/${client.id}/photo?token=${user?.access_token}&v=$
{client.updated_at ? new Date(client.updated_at).getTime() : 0}`}
                            />
                            <AvatarFallback>{client.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-bold text-lg text-white">{client.name}</div>
                            <div className="text-xs text-gray-400">{client.customer_id || 'N/A'}</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                            {enumToBusinessType[client.client_type] || client.client_type || 'N/A'}
                        </Badge>
                        {client.is_active ? (
                            <Badge variant="success">Active</Badge>
                        ) : (
                            <Badge variant="destructive">Inactive</Badge>
                        )}
                    </div>
                    <div className="text-sm text-gray-300">
                        <span className="font-semibold">Org:</span> {client.organization_name || '-'}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="h-full flex flex-col relative">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="w-3 h-8 bg-primary rounded-full" />
                    Client
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
                    <Button onClick={onAddNew}>
                        <Plus className="w-4 h-4 mr-2" /> New
                    </Button>
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
                    <Button
                        variant={showFilters ? 'secondary' : 'outline'}
                        onClick={() => setShowFilters((prev) => !prev)}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                        {hasActiveFilters && <span className="ml-2 w-2 h-2 rounded-full bg-green-400" />}
                    </Button>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            onClick={clearFilters}
                            className="text-red-400 hover:text-red-300"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Clear Filters
                        </Button>
                    )}

                    <div className="flex-grow flex justify-end items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startRefreshTransition(() => onRefresh?.())}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm">
                            {currentPage} / {totalPages > 0 ? totalPages : 1}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
                {showFilters && (
                    <div className="mt-4 flex flex-wrap gap-4 border-t border-white/10 pt-4">
                        <FilterPopover
                            title="Recurring Service"
                            options={filterOptions.service}
                            selectedValue={filters.service}
                            onSelect={(v) => handleFilterChange('service', v)}
                        >
                            <Button variant="outline" className="justify-between">
                                {filters.service
                                    ? filterOptions.service.find((o) => String(o.value) === String(filters.service))?.label
                                    : 'Recurring Service'}
                            </Button>
                        </FilterPopover>
                        <FilterPopover
                            title="Type"
                            options={filterOptions.type}
                            selectedValue={filters.type}
                            onSelect={(v) => handleFilterChange('type', v)}
                        >
                            <Button variant="outline" className="justify-between">
                                {filters.type || 'Type'}
                            </Button>
                        </FilterPopover>
                        <FilterPopover
                            title="Status"
                            options={filterOptions.status}
                            selectedValue={filters.status}
                            onSelect={(v) => handleFilterChange('status', v)}
                        >
                            <Button variant="outline" className="justify-between">
                                {filters.status
                                    ? filterOptions.status.find((o) => o.value === filters.status)?.label
                                    : 'Status'}
                            </Button>
                        </FilterPopover>
                    </div>
                )}
            </div>

            <div className="flex-grow overflow-y-auto glass-pane p-1 rounded-lg min-h-0">
                <Suspense fallback={<div className="py-10 flex justify-center"><Loader2 className="animate-spin" /></div>}>
                    {viewMode === 'list' ? renderTableView() : renderGridView()}
                </Suspense>
                {paginatedClients.length === 0 && (
                    <div className="text-center py-16 text-gray-500">
                        <p className="text-lg">No clients found.</p>
                        {clients.length > 0 ? (
                            <p>Try adjusting your filters.</p>
                        ) : (
                            <p>Click "New" to get started.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientList;
