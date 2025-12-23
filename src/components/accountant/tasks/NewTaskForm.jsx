import React, { useState, useEffect } from 'react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Textarea } from '@/components/ui/textarea';
    import { Switch } from '@/components/ui/switch';
    import { Checkbox } from '@/components/ui/checkbox';
    import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
    import { Calendar } from '@/components/ui/calendar';
    import { Calendar as CalendarIcon, Loader2, Plus, Trash2, X } from 'lucide-react';
    import { useToast } from '@/components/ui/use-toast';
    import { format } from 'date-fns';
    import { cn } from '@/lib/utils';
    import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
      AlertDialogTrigger,
    } from "@/components/ui/alert-dialog";
    
    const NewTaskForm = ({ onSave, onCancel, clients, services, teamMembers, tags, task, stages = [] }) => {
      const { toast } = useToast();
      const [formData, setFormData] = useState({
        title: '',
        client_id: '',
        service_id: '',
        stage_id: '',
        due_date: null,
        target_date: null,
        description: '',
        document_request_enabled: false,
        document_request_items: [],
        checklist_enabled: false,
        checklist_items: [],
        assigned_user_id: '',
        priority: '',
        tag_id: '',
        is_recurring: false,
        recurrence_frequency: 'weekly', // 'weekly' or 'monthly'
        recurrence_day_of_week: null, // 0-6 (Monday-Sunday)
        recurrence_day_of_month: null, // 1-31
        recurrence_start_date: null
      });
      const [isSaving, setIsSaving] = useState(false);
    
      useEffect(() => {
        if (task) {
          setFormData({
            title: task.title || '',
            client_id: task.client_id || '',
            service_id: task.service_id || '',
            stage_id: task.stage_id || task.stage?.id || '',
            due_date: task.due_date ? new Date(task.due_date) : null,
            target_date: task.target_date ? new Date(task.target_date) : null,
            description: task.description || '',
            document_request_enabled: task.document_request?.enabled || false,
            document_request_items: task.document_request?.items || [],
            checklist_enabled: task.checklist?.enabled || false,
            checklist_items: task.checklist?.items || [],
            assigned_user_id: task.assigned_to || task.assigned_user_id || '',
            priority: task.priority || '',
            tag_id: task.tag_id || ''
          });
        }
      }, [task]);
    
      const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
      };
    
      const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
      };
    
      const handleDateChange = (name, date) => {
        setFormData(prev => ({ ...prev, [name]: date }));
      };
    
      const handleSwitchChange = (name, checked) => {
        setFormData(prev => ({ ...prev, [name]: checked }));
      };
    
      const addDocRequestItem = () => {
        setFormData(prev => ({
          ...prev,
          document_request_items: [...prev.document_request_items, { name: '', required: true }]
        }));
      };
    
      const updateDocRequestItem = (index, field, value) => {
        setFormData(prev => {
          const items = [...prev.document_request_items];
          items[index] = { ...items[index], [field]: value };
          return { ...prev, document_request_items: items };
        });
      };
    
      const removeDocRequestItem = (index) => {
        setFormData(prev => ({
          ...prev,
          document_request_items: prev.document_request_items.filter((_, i) => i !== index)
        }));
      };

      const addChecklistItem = () => {
        setFormData(prev => ({
          ...prev,
          checklist_items: [...prev.checklist_items, { name: '', is_completed: false, assigned_to: null }]
        }));
      };

      const updateChecklistItem = (index, field, value) => {
        setFormData(prev => {
          const items = [...prev.checklist_items];
          items[index] = { ...items[index], [field]: value };
          return { ...prev, checklist_items: items };
        });
      };

      const removeChecklistItem = (index) => {
        setFormData(prev => ({
          ...prev,
          checklist_items: prev.checklist_items.filter((_, i) => i !== index)
        }));
      };
    
      const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.client_id || !formData.service_id) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields: Task Title, Client, and Service.",
                variant: "destructive"
            });
            return;
        }
        
        if (formData.is_recurring) {
          if (!formData.recurrence_start_date) {
            toast({
                title: "Validation Error",
                description: "Please select a start date for the recurring task.",
                variant: "destructive"
            });
            return;
          }
          if (formData.recurrence_frequency === 'weekly' && formData.recurrence_day_of_week === null) {
            toast({
                title: "Validation Error",
                description: "Please select a day of the week for weekly recurrence.",
                variant: "destructive"
            });
            return;
          }
          if (formData.recurrence_frequency === 'monthly' && formData.recurrence_day_of_month === null) {
            toast({
                title: "Validation Error",
                description: "Please select a day of the month for monthly recurrence.",
                variant: "destructive"
            });
            return;
          }
        }
        
        setIsSaving(true);
        
        const taskData = {
          title: formData.title,
          client_id: formData.client_id,
          service_id: formData.service_id,
          stage_id: formData.stage_id || null,
          due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
          target_date: formData.target_date ? format(formData.target_date, 'yyyy-MM-dd') : null,
          description: formData.description,
          priority: formData.priority || null,
          tag_id: formData.tag_id || null,
          document_request: {
            enabled: formData.document_request_enabled,
            items: formData.document_request_items
          },
          checklist: {
            enabled: formData.checklist_enabled,
            items: formData.checklist_items.filter(item => item.name.trim() !== '')
          },
          assigned_to: formData.assigned_user_id || null,
          // Recurring task data
          is_recurring: formData.is_recurring || false,
          recurrence_frequency: formData.is_recurring ? formData.recurrence_frequency : null,
          recurrence_day_of_week: formData.is_recurring && formData.recurrence_frequency === 'weekly' ? formData.recurrence_day_of_week : null,
          recurrence_day_of_month: formData.is_recurring && formData.recurrence_frequency === 'monthly' ? formData.recurrence_day_of_month : null,
          recurrence_start_date: formData.is_recurring && formData.recurrence_start_date ? format(formData.recurrence_start_date, 'yyyy-MM-dd') : null
        };
    
        await onSave(taskData, !!task);
        setIsSaving(false);
      };
    
      return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 text-white">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">
              <span className="text-gray-400 cursor-pointer hover:underline" onClick={onCancel}>Tasks / </span> 
              {task ? 'Edit Task' : 'Create New Task'}
            </h1>
            <div className="flex gap-2">
<Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button>
<Button onClick={handleSubmit} disabled={isSaving} style={isSaving ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
    {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
    {task ? 'Save Changes' : 'Create Task'}
</Button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="glass-pane p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-2">Task Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Task Title*</Label>
<Input id="title" name="title" placeholder="e.g., File annual tax returns" value={formData.title} onChange={handleChange} required disabled={isSaving} />
                </div>
                <div>
                  <Label htmlFor="client_id">Client*</Label>
<Select name="client_id" onValueChange={(v) => handleSelectChange('client_id', v)} value={formData.client_id} required disabled={isSaving}>
                    <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                    <SelectContent>
                      {clients && clients.length > 0 ? (
                        clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-clients" disabled>No clients found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="service_id">Service*</Label>
<Select name="service_id" onValueChange={(v) => handleSelectChange('service_id', v)} value={formData.service_id} required disabled={isSaving}>
                    <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
                    <SelectContent>
                      {services && services.length > 0 ? (
                        services.map(service => (
                          <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-services" disabled>No services found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="stage_id">Stage</Label>
<Select name="stage_id" onValueChange={(v) => handleSelectChange('stage_id', v)} value={formData.stage_id} disabled={isSaving}>
                    <SelectTrigger><SelectValue placeholder="Select a stage" /></SelectTrigger>
                    <SelectContent>
                      {stages && stages.length > 0 ? (
                        stages.map(stage => (
                          <SelectItem key={stage.id} value={stage.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color || '#3b82f6' }} />
                              {stage.name}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-stages" disabled>No stages found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.due_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.due_date ? format(formData.due_date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.due_date} onSelect={(d) => handleDateChange('due_date', d)} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="target_date">Target Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.target_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.target_date ? format(formData.target_date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.target_date} onSelect={(d) => handleDateChange('target_date', d)} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
<Textarea id="description" name="description" placeholder="Add a detailed description for the task..." value={formData.description} onChange={handleChange} disabled={isSaving} />
                </div>
                <div className="md:col-span-2 flex items-center space-x-2">
<Switch id="document_request_enabled" checked={formData.document_request_enabled} onCheckedChange={(c) => handleSwitchChange('document_request_enabled', c)} disabled={isSaving} />
                  <Label htmlFor="document_request_enabled">Enable Document Collection Request</Label>
                </div>
              </div>
            </div>
    
            {formData.document_request_enabled && (
              <div className="glass-pane p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-2">Document Request Items</h2>
                <div className="space-y-4">
                  {formData.document_request_items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-2 rounded-md bg-black/20">
<Input 
    value={item.name} 
    onChange={(e) => updateDocRequestItem(index, 'name', e.target.value)} 
    placeholder="e.g., PAN Card Copy"
    className="flex-grow"
    disabled={isSaving}
/>
                      <div className="flex items-center space-x-2">
<Switch id={`doc-req-${index}`} checked={item.required} onCheckedChange={(c) => updateDocRequestItem(index, 'required', c)} disabled={isSaving} />
                        <Label htmlFor={`doc-req-${index}`}>Required</Label>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
<Button variant="destructive" size="icon" disabled={isSaving}><Trash2 className="w-4 h-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will remove the document request item.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeDocRequestItem(index)} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
<Button type="button" variant="outline" onClick={addDocRequestItem} className="mt-4" disabled={isSaving}><Plus className="w-4 h-4 mr-2" />Add Document Item</Button>
              </div>
            )}

            <div className="glass-pane p-6 rounded-lg">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox 
                  id="checklist_enabled" 
                  checked={formData.checklist_enabled} 
                  onCheckedChange={(c) => handleSwitchChange('checklist_enabled', c)} 
                  disabled={isSaving}
                />
                <Label htmlFor="checklist_enabled" className="text-xl font-semibold cursor-pointer">Checklist</Label>
              </div>
              
              {formData.checklist_enabled && (
                <>
                  <div className="flex gap-2 mb-4">
                    <Input 
                      id="new-checklist-item"
                      placeholder="Add checklist item"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          const itemName = e.target.value.trim();
                          setFormData(prev => ({
                            ...prev,
                            checklist_items: [...prev.checklist_items, { name: itemName, is_completed: false, assigned_to: null }]
                          }));
                          e.target.value = '';
                        }
                      }}
                      disabled={isSaving}
                      className="flex-grow"
                    />
                    <Button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const input = document.getElementById('new-checklist-item');
                        if (input && input.value.trim()) {
                          const itemName = input.value.trim();
                          setFormData(prev => ({
                            ...prev,
                            checklist_items: [...prev.checklist_items, { name: itemName, is_completed: false, assigned_to: null }]
                          }));
                          input.value = '';
                          setTimeout(() => input.focus(), 0);
                        }
                      }} 
                      disabled={isSaving}
                    >
                      Add
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {formData.checklist_items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-md bg-white/5 border border-white/10">
                        <Checkbox 
                          checked={item.is_completed || false}
                          onCheckedChange={(checked) => updateChecklistItem(index, 'is_completed', checked)}
                          disabled={isSaving}
                        />
                        <Input 
                          value={item.name} 
                          onChange={(e) => updateChecklistItem(index, 'name', e.target.value)} 
                          placeholder="Checklist item name"
                          className="flex-grow bg-transparent border-none focus-visible:ring-0"
                          disabled={isSaving}
                          style={{ textDecoration: item.is_completed ? 'line-through' : 'none', opacity: item.is_completed ? 0.6 : 1 }}
                        />
                        <Select
                          value={item.assigned_to ? String(item.assigned_to) : 'unassigned'}
                          onValueChange={(v) => updateChecklistItem(index, 'assigned_to', v === 'unassigned' ? null : v)}
                          disabled={isSaving}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {teamMembers && teamMembers.length > 0 && teamMembers.map(member => {
                              const memberId = String(member.user_id || member.id);
                              return (
                                <SelectItem key={memberId} value={memberId}>
                                  {member.name || member.email}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeChecklistItem(index)}
                          disabled={isSaving}
                          className="h-8 w-8 text-red-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {formData.checklist_items.length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-4">No checklist items yet. Add one above.</p>
                    )}
                  </div>
                </>
              )}
            </div>
    
            <div className="glass-pane p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-2">Assignment & Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="assigned_user_id">Assign To</Label>
<Select name="assigned_user_id" onValueChange={(v) => handleSelectChange('assigned_user_id', v)} value={formData.assigned_user_id} disabled={isSaving}>
                    <SelectTrigger><SelectValue placeholder="Select a team member" /></SelectTrigger>
                    <SelectContent>
                       {teamMembers && teamMembers.length > 0 ? (
                          teamMembers.map(member => {
                              const memberId = member.user_id || member.id;
                              return (
                                  <SelectItem key={memberId} value={memberId}>{member.name || member.email}</SelectItem>
                              );
                          })
                      ) : (
                          <SelectItem value="no-members" disabled>No team members found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
<Select name="priority" onValueChange={(v) => handleSelectChange('priority', v)} value={formData.priority} disabled={isSaving}>
                    <SelectTrigger><SelectValue placeholder="Set priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P1">P1 - Urgent</SelectItem>
                      <SelectItem value="P2">P2 - High</SelectItem>
                      <SelectItem value="P3">P3 - Medium</SelectItem>
                      <SelectItem value="P4">P4 - Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tag_id">Tag</Label>
<Select name="tag_id" onValueChange={(v) => handleSelectChange('tag_id', v)} value={formData.tag_id} disabled={isSaving}>
                    <SelectTrigger><SelectValue placeholder="Select a tag" /></SelectTrigger>
                    <SelectContent>
                      {tags && tags.length > 0 ? (
                        tags.map(tag => (
                          <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-tags" disabled>No tags found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="glass-pane p-6 rounded-lg">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox 
                  id="is_recurring" 
                  checked={formData.is_recurring} 
                  onCheckedChange={(c) => {
                    handleSwitchChange('is_recurring', c);
                    if (c && !formData.recurrence_start_date) {
                      handleDateChange('recurrence_start_date', new Date());
                    }
                  }} 
                  disabled={isSaving}
                />
                <Label htmlFor="is_recurring" className="text-xl font-semibold cursor-pointer">Make this task recurring</Label>
              </div>
              
              {formData.is_recurring && (
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="recurrence_frequency">Frequency</Label>
                      <Select 
                        name="recurrence_frequency" 
                        onValueChange={(v) => handleSelectChange('recurrence_frequency', v)} 
                        value={formData.recurrence_frequency} 
                        disabled={isSaving}
                      >
                        <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="recurrence_start_date">Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.recurrence_start_date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.recurrence_start_date ? format(formData.recurrence_start_date, "PPP") : <span>Pick a start date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar 
                            mode="single" 
                            selected={formData.recurrence_start_date} 
                            onSelect={(d) => handleDateChange('recurrence_start_date', d)} 
                            initialFocus 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  {formData.recurrence_frequency === 'weekly' && (
                    <div>
                      <Label htmlFor="recurrence_day_of_week">Day of Week</Label>
                      <Select 
                        name="recurrence_day_of_week" 
                        onValueChange={(v) => handleSelectChange('recurrence_day_of_week', parseInt(v))} 
                        value={formData.recurrence_day_of_week !== null ? String(formData.recurrence_day_of_week) : ''} 
                        disabled={isSaving}
                      >
                        <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Monday</SelectItem>
                          <SelectItem value="1">Tuesday</SelectItem>
                          <SelectItem value="2">Wednesday</SelectItem>
                          <SelectItem value="3">Thursday</SelectItem>
                          <SelectItem value="4">Friday</SelectItem>
                          <SelectItem value="5">Saturday</SelectItem>
                          <SelectItem value="6">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {formData.recurrence_frequency === 'monthly' && (
                    <div>
                      <Label htmlFor="recurrence_day_of_month">Day of Month</Label>
                      <Select 
                        name="recurrence_day_of_month" 
                        onValueChange={(v) => handleSelectChange('recurrence_day_of_month', parseInt(v))} 
                        value={formData.recurrence_day_of_month !== null ? String(formData.recurrence_day_of_month) : ''} 
                        disabled={isSaving}
                      >
                        <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>
      );
    };
    
    export default NewTaskForm;
