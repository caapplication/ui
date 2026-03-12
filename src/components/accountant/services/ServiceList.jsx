import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronRight, Plus, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AnimatedSearch from '@/components/ui/AnimatedSearch';
import SettingsHeader from '@/components/common/SettingsHeader';

const ServiceRow = ({ service, onSelectService, index }) => {
    const clientCount = typeof service.assigned_clients === 'number' ? service.assigned_clients : 0;
    return (
        <motion.tr
            key={service.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="border-b border-white/10 hover:bg-white/5 cursor-pointer w-full"
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
                <span className="text-blue-400 font-semibold">{clientCount}</span>
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
            <SettingsHeader title="Services">
                <Button onClick={onAddService} className="h-9 rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 gap-2 px-4 shadow-sm w-full sm:w-auto justify-center">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add
                </Button>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 h-9 glass-input text-sm">
                        <div className="flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5 text-gray-400" />
                            <SelectValue placeholder="All Statuses" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>

                <AnimatedSearch
                    placeholder="Search Services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </SettingsHeader>

            <div className="flex-grow glass-pane rounded-lg overflow-hidden flex flex-col min-h-0">
                <div className="flex-grow overflow-y-auto  custom-scrollbar">
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
        </div>
    );
};

export default ServiceList;
