import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronRight, Plus, Filter, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getClientCountForService } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth.jsx';

const ServiceRow = ({ service, onSelectService, index }) => {
    const [clientCount, setClientCount] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        const fetchClientCount = async () => {
            if (!user || !service.id) return;
            try {
                const data = await getClientCountForService(service.id, user.agency_id, user.access_token);
                setClientCount(data.count);
            } catch (error) {
                console.error(`Failed to fetch client count for service ${service.id}:`, error);
                setClientCount(0); // Default to 0 on error
            }
        };

        fetchClientCount();
    }, [service.id, user, user?.access_token, user?.agency_id]);

    return (
        <motion.tr
            key={service.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="border-none hover:bg-white/5 cursor-pointer"
            onClick={() => onSelectService(service)}
        >
            <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                    <span>{service.name}</span>
                    {service.is_gst_complied && <Badge variant="outline" className="border-green-400 text-green-400">GST COMPLIED</Badge>}
                </div>
            </TableCell>
            <TableCell className="text-gray-300">{service.auto_task_creation_frequency || 'As Per Need'}</TableCell>
            <TableCell className="text-center">
                {clientCount === null ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                    <span className="text-blue-400 font-semibold">{clientCount}</span>
                )}
            </TableCell>
            <TableCell className="text-center">
                <Badge variant={service.is_enabled ? 'success' : 'destructive'}>
                    {service.is_enabled ? 'Active' : 'Inactive'}
                </Badge>
            </TableCell>
            <TableCell>
                <ChevronRight className="w-4 h-4 text-gray-500" />
            </TableCell>
        </motion.tr>
    );
};

const ServiceList = ({ services, onSelectService, onAddService }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredServices = services.filter(service => {
        const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && service.is_enabled) || (statusFilter === 'inactive' && !service.is_enabled);
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Services</h1>
                <div className="flex items-center gap-4">
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            placeholder="Search Services..."
                            className="pl-10 glass-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] glass-input">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-gray-400" />
                                <SelectValue placeholder="Filter by status" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={onAddService}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                    </Button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto glass-pane p-1 rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-white/10">
                            <TableHead className="w-[40%]">Service</TableHead>
                            <TableHead>Recurring</TableHead>
                            <TableHead className="text-center">Assigned Clients</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredServices.map((service, index) => (
                           <ServiceRow key={service.id} service={service} onSelectService={onSelectService} index={index} />
                        ))}
                    </TableBody>
                </Table>
                 {filteredServices.length === 0 && (
                    <div className="text-center py-16 text-gray-500">
                        <p className="text-lg">No services found.</p>
                        <p>Try adjusting your search or filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ServiceList;