import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const TaskManagement = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const tasks = [
        { id: 1, client: 'Innovate Inc.', task: 'Monthly GSTR-1', assignee: 'John Doe', dueDate: '2025-09-10', status: 'Pending' },
        { id: 2, client: 'Future Corp', task: 'Income Tax Return', assignee: 'Jane Smith', dueDate: '2025-09-15', status: 'In-Progress' },
        { id: 3, client: 'Tech Solutions', task: 'Quarterly GSTR-3B', assignee: 'Peter Jones', dueDate: '2025-09-20', status: 'Pending' },
        { id: 4, client: 'Global Exports', task: 'Tax Audit', assignee: 'Mary Jane', dueDate: '2025-08-30', status: 'Completed' },
        { id: 5, client: 'Innovate Inc.', task: 'CMP-08', assignee: 'John Doe', dueDate: '2025-09-05', status: 'Hold' },
        { id: 6, client: 'Future Corp', task: 'Monthly GSTR-3B', assignee: 'Jane Smith', dueDate: '2025-09-12', status: 'Pending' },
    ];

    const getStatusVariant = (status) => {
        switch (status) {
            case 'Pending': return 'default';
            case 'In-Progress': return 'secondary';
            case 'Completed': return 'success';
            case 'Hold': return 'destructive';
            default: return 'outline';
        }
    };

    const filteredTasks = tasks.filter(task => {
        const statusMatch = statusFilter === 'all' || task.status.toLowerCase() === statusFilter;
        const searchMatch = task.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.task.toLowerCase().includes(searchTerm.toLowerCase());
        return statusMatch && searchMatch;
    });

    return (
        <div className="p-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-5xl font-bold text-white">Task Management</h1>
                        <p className="text-gray-400 mt-1">Assign, track, and manage all client tasks.</p>
                    </div>
                    <Button>
                        <Plus className="w-5 h-5 mr-2" />
                        New Task
                    </Button>
                </header>

                <Card className="glass-card">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <CardTitle>All Tasks</CardTitle>
                                <CardDescription>A complete list of all tasks assigned.</CardDescription>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="in-progress">In-Progress</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="hold">Hold</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="relative w-full sm:w-auto sm:max-w-xs">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input placeholder="Search tasks..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Assignee</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTasks.map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">{task.client}</TableCell>
                                        <TableCell>{task.task}</TableCell>
                                        <TableCell>{task.assignee}</TableCell>
                                        <TableCell>{task.dueDate}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(task.status)}>{task.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {filteredTasks.length === 0 && <p className="text-center text-gray-400 py-8">No tasks found.</p>}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default TaskManagement;