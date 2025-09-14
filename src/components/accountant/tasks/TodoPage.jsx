import React, { useState, useEffect, useCallback } from 'react';
    import { motion } from 'framer-motion';
    import { useAuth } from '@/hooks/useAuth.jsx';
    import { useToast } from '@/components/ui/use-toast';
    import { Loader2 } from 'lucide-react';
    import { listTodos, createTodo, updateTodo, deleteTodo, listTeamMembers } from '@/lib/api';
    import TodoList from '@/components/accountant/tasks/TodoList';
    import NewTodoForm from '@/components/accountant/tasks/NewTodoForm';

    const TodoPage = () => {
        const { user } = useAuth();
        const { toast } = useToast();

        const [view, setView] = useState('list');
        const [todos, setTodos] = useState([]);
        const [teamMembers, setTeamMembers] = useState([]);
        
        const [editingTodo, setEditingTodo] = useState(null);
        const [isLoading, setIsLoading] = useState(true);

        const fetchData = useCallback(async () => {
            setIsLoading(true);
            try {
                if (!user?.agency_id || !user?.access_token) {
                    throw new Error("User information is not available.");
                }
                const [todosData, teamMembersData] = await Promise.all([
                    listTodos(user.agency_id, user.access_token),
                    listTeamMembers(user.access_token),
                ]);
                setTodos(todosData?.items || []);
                setTeamMembers(teamMembersData?.items || []);
            } catch (error) {
                toast({
                    title: 'Error fetching data',
                    description: error.message,
                    variant: 'destructive',
                });
                setTodos([]);
                setTeamMembers([]);
            } finally {
                setIsLoading(false);
            }
        }, [user?.agency_id, user?.access_token, toast]);

        useEffect(() => {
            fetchData();
        }, [fetchData]);

        const handleAddNew = () => {
            setEditingTodo(null);
            setView('form');
        };

        const handleEditTodo = (todo) => {
            setEditingTodo(todo);
            setView('form');
        };

        const handleBackToList = () => {
            setView('list');
            setEditingTodo(null);
            fetchData(); 
        };

        const handleDeleteTodo = async (todoId) => {
            try {
                await deleteTodo(todoId, user.agency_id, user.access_token);
                toast({ title: "✅ To-do Deleted", description: "The to-do item has been successfully removed." });
                setTodos(prev => prev.filter(t => t.id !== todoId));
            } catch (error) {
                toast({ title: 'Error deleting to-do', description: error.message, variant: 'destructive' });
            }
        };

        const handleSaveTodo = async (todoData) => {
            try {
                if (editingTodo) {
                    await updateTodo(editingTodo.id, todoData, user.agency_id, user.access_token);
                    toast({ title: "✅ To-do Updated", description: "The to-do item has been successfully updated." });
                } else {
                    await createTodo(todoData, user.agency_id, user.access_token);
                    toast({ title: "✅ To-do Created", description: "The new to-do item has been added." });
                }
                handleBackToList();
            } catch (error) {
                toast({ title: 'Error saving to-do', description: error.message, variant: 'destructive' });
            }
        };

        const renderContent = () => {
            if (isLoading) {
                return (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    </div>
                );
            }
            
            if (view === 'form') {
                return (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                        <NewTodoForm
                            onBack={handleBackToList}
                            onSave={handleSaveTodo}
                            todo={editingTodo}
                            teamMembers={teamMembers}
                        />
                    </motion.div>
                );
            }

            return (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    <TodoList
                        todos={todos}
                        teamMembers={teamMembers}
                        onAddNew={handleAddNew}
                        onEditTodo={handleEditTodo}
                        onDeleteTodo={handleDeleteTodo}
                    />
                </motion.div>
            );
        };

        return (
            <div className="p-4 md:p-8 text-white relative overflow-hidden h-full">
                {renderContent()}
            </div>
        );
    };

    export default TodoPage;