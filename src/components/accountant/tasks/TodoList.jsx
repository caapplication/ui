import React, { useState, useMemo } from 'react';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
    import { Input } from '@/components/ui/input';
    import { Button } from '@/components/ui/button';
    import { Search, Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';
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

    const TodoList = ({ todos, teamMembers, onAddNew, onEditTodo, onDeleteTodo }) => {
        const [searchTerm, setSearchTerm] = useState('');
        const [isAlertOpen, setIsAlertOpen] = useState(false);
        const [todoToDelete, setTodoToDelete] = useState(null);

        const getAssigneeName = (userId) => {
            const member = (teamMembers || []).find(m => m.user_id === userId);
            return member ? member.name : 'N/A';
        };

        const filteredTodos = useMemo(() => (todos || []).filter(todo => {
            return todo.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   todo.details?.toLowerCase().includes(searchTerm.toLowerCase());
        }), [todos, searchTerm]);

        const getRepeatText = (todo) => {
            if (!todo.repeat_interval || !todo.repeat_every) return 'No';
            return `Every ${todo.repeat_interval} ${todo.repeat_every}(s)`;
        };

        const handleDeleteClick = (todo) => {
            setTodoToDelete(todo);
            setIsAlertOpen(true);
        };

        const confirmDelete = () => {
            if (todoToDelete) {
                onDeleteTodo(todoToDelete.id);
            }
            setIsAlertOpen(false);
            setTodoToDelete(null);
        };

        return (
            <div className="h-full flex flex-col">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 flex-shrink-0">
                    <div>
                        <h1 className="text-4xl font-bold text-white">To-do List</h1>
                        <p className="text-gray-400 mt-1">Create, assign, and track all your to-dos.</p>
                    </div>
                    <Button onClick={onAddNew}>
                        <Plus className="w-5 h-5 mr-2" />
                        New To-do
                    </Button>
                </header>

                <div className="glass-pane rounded-lg flex-grow flex flex-col">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-white">All To-dos</h2>
                        <div className="relative w-full sm:w-auto sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input placeholder="Search to-dos..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Assignee</TableHead>
                                    <TableHead>Repeats</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTodos.map(todo => (
                                    <TableRow key={todo.id} className="hover:bg-white/5">
                                        <TableCell className="font-medium">{todo.title}</TableCell>
                                        <TableCell>{todo.due_date ? format(new Date(todo.due_date), 'dd MMM yyyy') : 'N/A'}</TableCell>
                                        <TableCell>{getAssigneeName(todo.assigned_to)}</TableCell>
                                        <TableCell>{getRepeatText(todo)}</TableCell>
                                        <TableCell>
                                            <Badge variant={todo.is_completed ? 'success' : 'default'}>
                                                {todo.is_completed ? 'Completed' : 'Pending'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => onEditTodo(todo)}><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleDeleteClick(todo)} className="text-red-500"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         {filteredTodos.length === 0 && <p className="text-center text-gray-400 py-8">No to-dos found.</p>}
                    </div>
                </div>
                <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete the to-do item.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setTodoToDelete(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    };

    export default TodoList;