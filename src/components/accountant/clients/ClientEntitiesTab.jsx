import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Button } from '@/components/ui/button';

const ClientEntitiesTab = ({ entities = [], onEditEntity, onDeleteEntity, isMutating }) => {
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
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-400 hover:text-blue-600"
                                        onClick={() => onEditEntity && onEditEntity(entity)}
                                        disabled={isMutating}
                                    >
                                        Edit
                                    </Button>
                                    <span className="mx-2 text-gray-300">|</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-400 hover:text-red-600"
                                        onClick={() => onDeleteEntity && onDeleteEntity(entity)}
                                        disabled={isMutating}
                                    >
                                        Delete
                                    </Button>
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
