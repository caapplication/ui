import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
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

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

const NewRecurringTaskForm = ({ onSave, onCancel, clients, services, teamMembers, tags, recurringTask }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    service_id: '',
    description: '',
    document_request_enabled: false,
    document_request_items: [],
    assigned_user_id: '',
    priority: '',
    tag_id: '',
    frequency: 'daily',
    interval: 1,
    start_date: new Date(),
    end_date: null,
    day_of_week: null,
    day_of_month: null,
    week_of_month: null,
    due_date_offset: 0,
    target_date_offset: null,
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (recurringTask) {
      setFormData({
        title: recurringTask.title || '',
        client_id: recurringTask.client_id || '',
        service_id: recurringTask.service_id || '',
        description: recurringTask.description || '',
        document_request_enabled: recurringTask.document_request?.enabled || false,
        document_request_items: recurringTask.document_request?.items || [],
        assigned_user_id: recurringTask.assigned_to || '',
        priority: recurringTask.priority || '',
        tag_id: recurringTask.tag_id || '',
        frequency: recurringTask.frequency || 'daily',
        interval: recurringTask.interval || 1,
        start_date: recurringTask.start_date ? new Date(recurringTask.start_date) : new Date(),
        end_date: recurringTask.end_date ? new Date(recurringTask.end_date) : null,
        day_of_week: recurringTask.day_of_week ?? null,
        day_of_month: recurringTask.day_of_month ?? null,
        week_of_month: recurringTask.week_of_month ?? null,
        due_date_offset: recurringTask.due_date_offset || 0,
        target_date_offset: recurringTask.target_date_offset ?? null,
        is_active: recurringTask.is_active !== undefined ? recurringTask.is_active : true,
      });
    }
  }, [recurringTask]);

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

  const handleNumberChange = (name, value) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setFormData(prev => ({ ...prev, [name]: numValue }));
    }
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
    setIsSaving(true);

    const taskData = {
      title: formData.title,
      client_id: formData.client_id,
      service_id: formData.service_id,
      description: formData.description,
      priority: formData.priority || null,
      tag_id: formData.tag_id || null,
      document_request: {
        enabled: formData.document_request_enabled,
        items: formData.document_request_items
      },
      assigned_to: formData.assigned_user_id || null,
      frequency: formData.frequency,
      interval: formData.interval,
      start_date: format(formData.start_date, 'yyyy-MM-dd'),
      end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
      day_of_week: formData.frequency === 'weekly' ? (formData.day_of_week !== null ? parseInt(formData.day_of_week) : null) : null,
      day_of_month: formData.frequency === 'monthly' ? (formData.day_of_month !== null ? parseInt(formData.day_of_month) : null) : null,
      week_of_month: formData.frequency === 'monthly' ? (formData.week_of_month !== null ? parseInt(formData.week_of_month) : null) : null,
      due_date_offset: formData.due_date_offset,
      target_date_offset: formData.target_date_offset !== null ? formData.target_date_offset : null,
      is_active: formData.is_active,
    };

    await onSave(taskData);
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          <span className="text-gray-400 cursor-pointer hover:underline" onClick={onCancel}>Recurring Tasks / </span>
          {recurringTask ? 'Edit Recurring Task' : 'Create New Recurring Task'}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {recurringTask ? 'Save Changes' : 'Create Recurring Task'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Task Details Section - Same as NewTaskForm */}
        <div className="glass-pane p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-2">Task Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="title">Task Title*</Label>
              <Input id="title" name="title" placeholder="e.g., Monthly GST Filing" value={formData.title} onChange={handleChange} required disabled={isSaving} />
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
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Add a detailed description..." value={formData.description} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="md:col-span-2 flex items-center space-x-2">
              <Switch id="document_request_enabled" checked={formData.document_request_enabled} onCheckedChange={(c) => handleSwitchChange('document_request_enabled', c)} disabled={isSaving} />
              <Label htmlFor="document_request_enabled">Enable Document Collection Request</Label>
            </div>
          </div>
        </div>

        {/* Recurrence Configuration Section */}
        <div className="glass-pane p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-2">Recurrence Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="frequency">Frequency*</Label>
              <Select name="frequency" onValueChange={(v) => handleSelectChange('frequency', v)} value={formData.frequency} required disabled={isSaving}>
                <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="interval">Repeat Every (N {formData.frequency})*</Label>
              <Input 
                id="interval" 
                name="interval" 
                type="number" 
                min="1" 
                value={formData.interval} 
                onChange={(e) => handleNumberChange('interval', e.target.value)} 
                required 
                disabled={isSaving} 
              />
            </div>
            <div>
              <Label htmlFor="start_date">Start Date*</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.start_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? format(formData.start_date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={formData.start_date} onSelect={(d) => handleDateChange('start_date', d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="end_date">End Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.end_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.end_date ? format(formData.end_date, "PPP") : <span>No end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={formData.end_date} onSelect={(d) => handleDateChange('end_date', d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Weekly specific options */}
            {formData.frequency === 'weekly' && (
              <div>
                <Label htmlFor="day_of_week">Day of Week (Optional)</Label>
                <Select name="day_of_week" onValueChange={(v) => handleSelectChange('day_of_week', v === 'none' ? null : v)} value={formData.day_of_week !== null ? String(formData.day_of_week) : 'none'} disabled={isSaving}>
                  <SelectTrigger><SelectValue placeholder="Any day" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any day</SelectItem>
                    {DAYS_OF_WEEK.map(day => (
                      <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Monthly specific options */}
            {formData.frequency === 'monthly' && (
              <>
                <div>
                  <Label htmlFor="day_of_month">Day of Month (1-31, Optional)</Label>
                  <Input 
                    id="day_of_month" 
                    name="day_of_month" 
                    type="number" 
                    min="1" 
                    max="31" 
                    value={formData.day_of_month !== null ? formData.day_of_month : ''} 
                    onChange={(e) => handleSelectChange('day_of_month', e.target.value === '' ? null : parseInt(e.target.value))} 
                    placeholder="e.g., 15" 
                    disabled={isSaving} 
                  />
                </div>
                <div>
                  <Label htmlFor="week_of_month">Week of Month (1-4, Optional)</Label>
                  <Input 
                    id="week_of_month" 
                    name="week_of_month" 
                    type="number" 
                    min="1" 
                    max="4" 
                    value={formData.week_of_month !== null ? formData.week_of_month : ''} 
                    onChange={(e) => handleSelectChange('week_of_month', e.target.value === '' ? null : parseInt(e.target.value))} 
                    placeholder="e.g., 1 (first week)" 
                    disabled={isSaving} 
                  />
                </div>
                {formData.week_of_month && (
                  <div>
                    <Label htmlFor="day_of_week_monthly">Day of Week (for weekly pattern)</Label>
                    <Select name="day_of_week_monthly" onValueChange={(v) => handleSelectChange('day_of_week', v === 'none' ? null : parseInt(v))} value={formData.day_of_week !== null ? String(formData.day_of_week) : 'none'} disabled={isSaving}>
                      <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Any day</SelectItem>
                        {DAYS_OF_WEEK.map(day => (
                          <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div>
              <Label htmlFor="due_date_offset">Due Date Offset (Days)</Label>
              <Input 
                id="due_date_offset" 
                name="due_date_offset" 
                type="number" 
                value={formData.due_date_offset} 
                onChange={(e) => handleNumberChange('due_date_offset', e.target.value)} 
                placeholder="0" 
                disabled={isSaving} 
              />
              <p className="text-xs text-gray-400 mt-1">Days to add to creation date for due date</p>
            </div>
            <div>
              <Label htmlFor="target_date_offset">Target Date Offset (Days, Optional)</Label>
              <Input 
                id="target_date_offset" 
                name="target_date_offset" 
                type="number" 
                value={formData.target_date_offset !== null ? formData.target_date_offset : ''} 
                onChange={(e) => handleSelectChange('target_date_offset', e.target.value === '' ? null : parseInt(e.target.value))} 
                placeholder="Optional" 
                disabled={isSaving} 
              />
              <p className="text-xs text-gray-400 mt-1">Days to add to creation date for target date</p>
            </div>
            <div className="md:col-span-2 flex items-center space-x-2">
              <Switch id="is_active" checked={formData.is_active} onCheckedChange={(c) => handleSwitchChange('is_active', c)} disabled={isSaving} />
              <Label htmlFor="is_active">Active (Enable this recurring task)</Label>
            </div>
          </div>
        </div>

        {/* Document Request and Assignment sections - Same as NewTaskForm */}
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
            <Button type="button" variant="outline" onClick={addDocRequestItem} className="mt-4" disabled={isSaving}>
              <Plus className="w-4 h-4 mr-2" />
              Add Document Item
            </Button>
          </div>
        )}

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
      </form>
    </div>
  );
};

export default NewRecurringTaskForm;

