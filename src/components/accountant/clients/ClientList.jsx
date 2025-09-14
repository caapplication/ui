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
import { Search, Plus, Upload, Download, Phone, MessageSquare, Settings2, MoreVertical, RefreshCw, ArrowRight, ArrowLeft, Filter, Check, X, UserCheck, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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


const ClientList = ({ clients, onAddNew, onViewClient, onEditClient, allServices, onDeleteClient, onRefresh, businessTypes, onBulkDelete }) => {
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
    const ITEMS_PER_PAGE = 10;

    const handleNotImplemented = () => {
        toast({
            title: "🚧 Feature Not Implemented",
            description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
        });
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({...prev, [key]: value}));
        setCurrentPage(1);
    };
    
    const hasActiveFilters = Object.values(filters).some(v => v);

    const clearFilters = () => {
        setFilters({ service: '', type: '', status: '' });
        setCurrentPage(1);
    }

    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = (
                client.name?.toLowerCase().includes(searchLower) ||
                client.pan?.toLowerCase().includes(searchLower) ||
                client.mobile?.toLowerCase().includes(searchLower) ||
                client.email?.toLowerCase().includes(searchLower) ||
                client.customer_id?.toLowerCase().includes(searchLower)
            );

            const matchesService = !filters.service || client.availedServices?.some(s => s.id === filters.service);
            const matchesType = !filters.type || client.client_type?.toLowerCase() === filters.type.toLowerCase();
            const matchesStatus = !filters.status || (filters.status === 'active' && client.is_active) || (filters.status === 'inactive' && !client.is_active);

            return matchesSearch && matchesService && matchesType && matchesStatus;
        });
    }, [clients, searchTerm, filters]);

    const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
    const paginatedClients = filteredClients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useEffect(() => {
        setSelectedClients([]);
    }, [currentPage, filters, searchTerm]);

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
                    <Button variant="outline" onClick={handleNotImplemented}><Upload className="w-4 h-4 mr-2" /> Import</Button>
                    <Button variant="outline" onClick={handleNotImplemented}><Download className="w-4 h-4 mr-2" /> Export</Button>
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
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-white/10">
                            <TableHead className="w-[50px]">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="p-0 h-auto">
                                            <Checkbox 
                                                checked={headerCheckboxState}
                                                onCheckedChange={handleSelectAllOnPage}
                                            />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={handleSelectAllOnPage.bind(null, true)}>Select all on this page</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={handleSelectAllMatchingFilters}>Select all matching filters ({filteredClients.length})</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={handleDeselectAll} className="text-red-500">Select none</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableHead>
                            <TableHead>Photo</TableHead>
                            <TableHead>Customer ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Mobile</TableHead>
                            <TableHead>Organisation</TableHead>
                            <TableHead>Tags</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Users</TableHead>
                            <TableHead className="w-[50px]"><Button variant="ghost" size="icon"><Settings2 className="w-5 h-5" /></Button></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedClients.map(client => (
                            <TableRow 
                                key={client.id} 
                                className={cn("border-none hover:bg-white/5 cursor-pointer", selectedClients.includes(client.id) && "bg-primary/10")}
                                onClick={() => onViewClient(client)}
                            >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Checkbox 
                                        checked={selectedClients.includes(client.id)}
                                        onCheckedChange={() => handleSelectClient(client.id)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Avatar>
                                        <AvatarImage src={client.photo} />
                                        <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </TableCell>
                                <TableCell>{client.customer_id || 'N/A'}</TableCell>
                                <TableCell><span className="text-blue-400 hover:underline">{client.name}</span></TableCell>
                                <TableCell>{client.client_type}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {client.mobile}
                                        <Phone className="w-3 h-3 text-green-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleNotImplemented(); }} />
                                        <MessageSquare className="w-3 h-3 text-blue-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleNotImplemented(); }} />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>{client.organization_name || '-'}</span>
                                        {client.user_id && (
                                            <span className="text-xs text-green-400 flex items-center gap-1">
                                                <UserCheck className="w-3 h-3" /> User Assigned
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {Array.isArray(client.tags) && client.tags.length > 0
                                        ? client.tags.map(tag => (
                                            <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="mr-1 text-black">{tag.name}</Badge>
                                          ))
                                        : '-'}
                                </TableCell>
                                <TableCell><Badge variant={client.is_active ? 'success' : 'destructive'}>{client.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                                <TableCell>
                                    <div className="flex -space-x-2">
                                        {/* This needs to be populated from API */}
                                    </div>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => onViewClient(client)}>View Details</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onEditClient(client)}>Edit</DropdownMenuItem>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500">Delete</DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the client <span className="font-bold text-white">{client.name}</span>.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => onDeleteClient(client.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
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
                                            {isBulkDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
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