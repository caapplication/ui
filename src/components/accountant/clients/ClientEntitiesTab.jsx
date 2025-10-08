import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ClientEntitiesTab = ({ entities = [] }) => {
    return (
        <div className="glass-pane p-4 rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entities.length > 0 ? (
                        entities.map(entity => (
                            <TableRow key={entity.id || entity.entity_id}>
                                <TableCell>{entity.name}</TableCell>
                                <TableCell>
                                    {/* Placeholder for edit/delete actions */}
                                    <span className="text-gray-400">Edit</span>
                                    <span className="mx-2 text-gray-300">|</span>
                                    <span className="text-red-400">Delete</span>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan="2" className="text-center">
                                No entities found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default ClientEntitiesTab;
