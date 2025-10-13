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
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entities.length > 0 ? (
                        entities.map(entity => (
                            <TableRow key={entity.id || entity.entity_id}>
                                <TableCell>{entity.name}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan="1" className="text-center">
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
