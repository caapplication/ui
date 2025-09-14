import React, { useState, useEffect, useCallback } from 'react';
    import { AnimatePresence, motion } from 'framer-motion';
    import { useAuth } from '@/hooks/useAuth.jsx';
    import { useToast } from '@/components/ui/use-toast';
    import { Loader2 } from 'lucide-react';
    import { listTasks, createTask, updateTask, deleteTask, listClients, listServices, listTeamMembers, getTags, listDepartments, listTodos, createTodo, updateTodo, deleteTodo } from '@/lib/api';
    import TaskList from '@/components/accountant/tasks/TaskList';
    import NewTaskForm from '@/components/accountant/tasks/NewTaskForm';
    import TodoList from '@/components/accountant/tasks/TodoList';
    import NewTodoForm from '@/components/accountant/tasks/NewTodoForm';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

    const TaskManagement = ({ defaultActiveTab = 'tasks' }) => {
        const { user } = useAuth();
        const { toast } = useToast();

        const [activeTab, setActiveTab] = useState(defaultActiveTab);
        const [view, setView] = useState('list');
        
        const [tasks, setTasks] = useState([]);
        const [todos, setTodos] = useState([]);
        
        const [clients, setClients] = useState([]);
        const [services, setServices] = useState([]);
        const [teamMembers, setTeamMembers] = useState([]);
        const [tags, setTags] = useState([]);
        const [departments, setDepartments] = useState([]);
        
        const [editingItem, setEditingItem] = useState(null);
        const [isLoading, setIsLoading] = useState(true);

        const fetchData = useCallback(async () => {
            setIsLoading(true);
            try {
                if (!user?.agency_id || !user?.access_token) {
                    throw new Error("User information is not available.");
                }
                const [tasksData, clientsData, servicesData, teamMembersData, tagsData, departmentsData, todosData] = await Promise.all([
                    listTasks(user.agency_id, user.access_token),
                    listClients(user.agency_id, user.access_token),
                    listServices(user.agency_id, user.access_token),
                    listTeamMembers(user.access_token),
                    getTags(user.agency_id, user.access_token),
                    listDepartments(user.agency_id, user.access_token),
                    listTodos(user.agency_id, user.access_token)
                ]);
                setTasks(tasksData?.items || []);
                setClients(clientsData?.items || []);
                setServices(servicesData?.items || []);
                setTeamMembers(teamMembersData?.items || []);
                setTags(tagsData?.items || []);
                setDepartments(departmentsData?.items || []);
                setTodos(todosData?.items || []);
            } catch (error) {
                toast({
                    title: 'Error fetching data',
                    description: error.message,
                    variant: 'destructive',
                });
                setTasks([]);
                setClients([]);
                setServices([]);
                setTeamMembers([]);
                setTags([]);
                setDepartments([]);
                setTodos([]);
            } finally {
                setIsLoading(false);
            }
        }, [user?.agency_id, user?.access_token, toast]);

        useEffect(() => {
            fetchData();
        }, [fetchData]);

        useEffect(() => {
            setActiveTab(defaultActiveTab);
        }, [defaultActiveTab]);

        const handleAddNew = () => {
            setEditingItem(null);
            setView('form');
        };

        const handleEditItem = (item) => {
            setEditingItem(item);
            setView('form');
        };

        const handleBackToList = () => {
            setView('list');
            setEditingItem(null);
            fetchData(); 
        };

        const handleDeleteTask = async (taskId) => {
            try {
                await deleteTask(taskId, user.agency_id, user.access_token);
                toast({ title: "✅ Task Deleted", description: "The task has been successfully removed." });
                setTasks(prev => prev.filter(t => t.id !== taskId));
            } catch (error) {
                toast({ title: 'Error deleting task', description: error.message, variant: 'destructive' });
            }
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

        const handleSaveTask = async (taskData) => {
            try {
                if (editingItem) {
                    await updateTask(editingItem.id, taskData, user.agency_id, user.access_token);
                    toast({ title: "✅ Task Updated", description: "The task has been successfully updated." });
                } else {
                    await createTask(taskData, user.agency_id, user.access_token);
                    toast({ title: "✅ Task Created", description: "The new task has been added." });
                }
                setView('list');
                setEditingItem(null);
                fetchData();
            } catch (error) {
                toast({ title: 'Error saving task', description: error.message, variant: 'destructive' });
            }
        };
        
        const handleSaveTodo = async (todoData) => {
            try {
                if (editingItem) {
                    await updateTodo(editingItem.id, todoData, user.agency_id, user.access_token);
                    toast({ title: "✅ To-do Updated", description: "The to-do item has been successfully updated." });
                } else {
                    await createTodo(todoData, user.agency_id, user.access_token);
                    toast({ title: "✅ To-do Created", description: "The new to-do item has been added." });
                }
                setView('list');
                setEditingItem(null);
                fetchData();
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
                        {activeTab === 'tasks' ? (
                            <NewTaskForm
                                onBack={handleBackToList}
                                onSave={handleSaveTask}
                                task={editingItem}
                                clients={clients}
                                services={services}
                                teamMembers={teamMembers}
                                tags={tags}
                                departments={departments}
                            />
                        ) : (
                            <NewTodoForm
                                onBack={handleBackToList}
                                onSave={handleSaveTodo}
                                todo={editingItem}
                                teamMembers={teamMembers}
                            />
                        )}
                    </motion.div>
                );
            }

            return (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 flex-shrink-0">
                        <div>
                            <h1 className="text-4xl font-bold text-white">Task & To-do Management</h1>
                            <p className="text-gray-400 mt-1">Assign, track, and manage all client tasks and internal to-dos.</p>
                        </div>
                        <TabsList>
                            <TabsTrigger value="tasks">Tasks</TabsTrigger>
                            <TabsTrigger value="todos">To-dos</TabsTrigger>
                        </TabsList>
                    </header>
                    <AnimatePresence mode="wait">
                        <TabsContent value="tasks" asChild>
                            <motion.div key="tasks-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex-grow">
                                <TaskList
                                    tasks={tasks}
                                    clients={clients}
                                    teamMembers={teamMembers}
                                    tags={tags}
                                    onAddNew={handleAddNew}
                                    onEditTask={handleEditItem}
                                    onDeleteTask={handleDeleteTask}
                                />
                            </motion.div>
                        </TabsContent>
                        <TabsContent value="todos" asChild>
                            <motion.div key="todos-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex-grow">
                                <TodoList
                                    todos={todos}
                                    teamMembers={teamMembers}
                                    onAddNew={handleAddNew}
                                    onEditTodo={handleEditItem}
                                    onDeleteTodo={handleDeleteTodo}
                                />
                            </motion.div>
                        </TabsContent>
                    </AnimatePresence>
                </Tabs>
            );
        };

        return (
            <div className="p-4 md:p-8 text-white relative overflow-hidden h-full">
                {renderContent()}
            </div>
        );
    };

    export default TaskManagement;