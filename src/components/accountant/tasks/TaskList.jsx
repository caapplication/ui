import React, { useState, useMemo } from 'react';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
    import { Input } from '@/components/ui/input';
    import { Button } from '@/components/ui/button';
    import { Search, Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Badge } from '@/components/ui/badge';
    import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
    import { format } from 'date-fns';
    import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
    } from "@/components/ui/alert-dialog";
    import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog';
    
    const TaskList = ({ tasks, clients, services, teamMembers, onAddNew, onEditTask, onDeleteTask, onViewTask }) => {
        const [searchTerm, setSearchTerm] = useState('');
        const [statusFilter, setStatusFilter] = useState('all');
    
        const getStatusVariant = (status) => {
            switch (status) {
                case 'Pending': return 'default';
                case 'In Progress': return 'secondary';
                case 'Completed': return 'success';
                case 'Hold': return 'destructive';
                default: return 'outline';
            }
        };
        
        const getPriorityVariant = (priority) => {
            switch (priority) {
                case 'P1': return 'destructive';
                case 'P2': return 'warning';
                case 'P3': return 'secondary';
                case 'P4': return 'outline';
                default: return 'outline';
            }
        };
    
        const getClientName = (clientId) => clients.find(c => c.id === clientId)?.name || 'N/A';
        const getServiceName = (serviceId) => services.find(s => s.id === serviceId)?.name || 'N/A';
        const getAssigneeName = (userId) => teamMembers.find(m => m.user_id === userId)?.name || 'N/A';
    
        const filteredTasks = useMemo(() => {
            if (!Array.isArray(tasks)) return [];
            return tasks.filter(task => {
                const statusMatch = statusFilter === 'all' || task.status?.toLowerCase() === statusFilter;
                const clientName = getClientName(task.client_id) || '';
                const taskTitle = task.title || '';
                const searchMatch = clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    taskTitle.toLowerCase().includes(searchTerm.toLowerCase());
                return statusMatch && searchMatch;
            })
        }, [tasks, statusFilter, searchTerm, clients]);
    
        return (
            <div className="h-full flex flex-col">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 flex-shrink-0">
                    <div>
                        <h1 className="text-4xl font-bold text-white">Task Management</h1>
                        <p className="text-gray-400 mt-1">Assign, track, and manage all client tasks.</p>
                    </div>
                    <Button onClick={onAddNew}>
                        <Plus className="w-5 h-5 mr-2" />
                        New Task
                    </Button>
                </header>
    
                <div className="glass-pane rounded-lg flex-grow flex flex-col">
                    <div className="p-4 border-b border-white/10">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h2 className="text-xl font-semibold">All Tasks</h2>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="in progress">In Progress</SelectItem>
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
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Assignee</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Tag</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTasks.map(task => (
                                    <TableRow key={task.id} className="hover:bg-white/5 cursor-pointer" onClick={() => onViewTask(task.id)}>
                                        <TableCell className="font-medium">{task.title}</TableCell>
                                        <TableCell>{getClientName(task.client_id)}</TableCell>
                                        <TableCell>{task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy') : 'N/A'}</TableCell>
                                        <TableCell>{getAssigneeName(task.assignee_id)}</TableCell>
                                        <TableCell>
                                            {task.priority && <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {task.tags && task.tags.map(tag => (
                                                    <Badge key={tag.id} style={{ backgroundColor: tag.color, color: 'hsl(var(--foreground))' }}>
                                                        {tag.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(task.status)}>{task.status || 'N/A'}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => onEditTask(task)}><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-500"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>This will permanently delete the task.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => onDeleteTask(task.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
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
                         {filteredTasks.length === 0 && <p className="text-center text-gray-400 py-8">No tasks found.</p>}
                    </div>
                </div>
            </div>
        );
    };
    
    export default TaskList;