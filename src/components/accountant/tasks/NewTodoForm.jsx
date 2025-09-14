import React, { useState, useEffect } from 'react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
    import { Calendar } from '@/components/ui/calendar';
    import { Textarea } from '@/components/ui/textarea';
    import { ArrowLeft, CalendarPlus as CalendarIcon, Loader2 } from 'lucide-react';
    import { format } from 'date-fns';
    import { cn } from '@/lib/utils';
    import { Switch } from '@/components/ui/switch';

    const NewTodoForm = ({ onBack, onSave, todo, teamMembers }) => {
        const [formData, setFormData] = useState({
            title: '',
            details: '',
            due_date: null,
            assigned_to: '',
            is_completed: false,
            repeat_interval: '',
            repeat_every: 'day',
        });
        const [isSaving, setIsSaving] = useState(false);

        useEffect(() => {
            if (todo) {
                setFormData({
                    title: todo.title || '',
                    details: todo.details || '',
                    due_date: todo.due_date ? new Date(todo.due_date) : null,
                    assigned_to: todo.assigned_to || '',
                    is_completed: todo.is_completed || false,
                    repeat_interval: todo.repeat_interval || '',
                    repeat_every: todo.repeat_every || 'day',
                });
            }
        }, [todo]);
        
        const handleSelectChange = (name, value) => {
            setFormData(prev => ({ ...prev, [name]: value }));
        };

        const handleDateChange = (name, date) => {
            setFormData(prev => ({ ...prev, [name]: date }));
        };
        
        const handleChange = (e) => {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: value }));
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            setIsSaving(true);
            
            const dataToSave = {
                ...formData,
                due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
                repeat_interval: formData.repeat_interval ? parseInt(formData.repeat_interval, 10) : null,
            };
            
            await onSave(dataToSave);
            setIsSaving(false);
        };

        return (
            <div className="h-full flex flex-col">
                <header className="flex justify-between items-center mb-6 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onBack}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="text-2xl font-bold text-white">
                            {todo ? 'Edit To-do' : 'Create New To-do'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onBack}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {todo ? 'Save Changes' : 'Create To-do'}
                        </Button>
                    </div>
                </header>

                <div className="flex-grow overflow-y-auto no-scrollbar pr-2">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="glass-pane p-6 rounded-lg">
                            <h2 className="text-xl font-semibold mb-4 text-white">To-do Details</h2>
                            <div className="space-y-6">
                                <div>
                                    <Label htmlFor="title">To-do*</Label>
                                    <Input id="title" name="title" value={formData.title} onChange={handleChange} placeholder="What needs to be done?" required />
                                </div>
                                <div>
                                    <Label htmlFor="details">Details</Label>
                                    <Textarea id="details" name="details" value={formData.details} onChange={handleChange} placeholder="Add more details..." />
                                </div>
                                <div>
                                    <Label htmlFor="due_date">Due Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.due_date && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {formData.due_date ? format(formData.due_date, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.due_date} onSelect={(d) => handleDateChange('due_date', d)} initialFocus /></PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>
                        
                        <div className="glass-pane p-6 rounded-lg">
                            <h2 className="text-xl font-semibold mb-4 text-white">Assignment & Repetition</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="assigned_to">Assign User</Label>
                                    <Select name="assigned_to" onValueChange={(v) => handleSelectChange('assigned_to', v)} value={formData.assigned_to}>
                                        <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
                                        <SelectContent>
                                            {teamMembers.map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center space-x-2 pt-6">
                                    <Switch id="is_completed" checked={formData.is_completed} onCheckedChange={(c) => setFormData(p => ({...p, is_completed: c}))} />
                                    <Label htmlFor="is_completed">Mark as Completed</Label>
                                </div>
                                <div className="md:col-span-2">
                                    <Label>Repeat</Label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Input 
                                            type="number" 
                                            name="repeat_interval" 
                                            value={formData.repeat_interval} 
                                            onChange={handleChange} 
                                            placeholder="Interval" 
                                            className="w-24"
                                        />
                                        <Select name="repeat_every" onValueChange={(v) => handleSelectChange('repeat_every', v)} value={formData.repeat_every}>
                                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="day">Days</SelectItem>
                                                <SelectItem value="week">Weeks</SelectItem>
                                                <SelectItem value="month">Months</SelectItem>
                                                <SelectItem value="year">Years</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    export default NewTodoForm;