import React, { useState, useEffect, useMemo } from 'react';
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
import { Combobox } from '@/components/ui/combobox';
import { useAuth } from '@/hooks/useAuth';
import { listOrgUsers, listTeamMembers } from '@/lib/api';
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

const NewTaskForm = ({ onSave, onCancel, clients, services, teamMembers, tags, task, stages = [], selectedOrg }) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [teamUsers, setTeamUsers] = useState([]);
  const [selectedClientUsers, setSelectedClientUsers] = useState([]); // Users for the currently selected client
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingClientUsers, setLoadingClientUsers] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    client_user_id: '',
    service_id: '',
    stage_id: '',
    due_date: null,
    due_time: '12:00',
    description: '',
    checklist_enabled: false,
    checklist_items: [],
    assigned_user_id: '',
    priority: '',
    tag_id: '',
    is_recurring: false,
    recurrence_frequency: 'weekly',
    recurrence_time: '09:00',
    recurrence_day_of_week: null,
    recurrence_date: null,
    recurrence_day_of_month: null,
    recurrence_start_date: null
  });

  const [isSaving, setIsSaving] = useState(false);

  // =========================
  // DEBUG: base render snapshot
  // =========================
  useEffect(() => {
    console.log('[NewTaskForm][mount] initial', {
      role: user?.role,
      hasToken: !!user?.access_token,
      clientsCount: Array.isArray(clients) ? clients.length : 'NA',
      teamMembersPropCount: Array.isArray(teamMembers) ? teamMembers.length : 'NA',
      selectedOrg,
      taskMode: task ? 'edit' : 'create',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // Fetch CA Team Members for "Assign To"
  // =========================
  useEffect(() => {
    const fetchTeamUsers = async () => {
      console.log('[AssignTo][fetchTeamUsers] start', {
        hasToken: !!user?.access_token,
        role: user?.role,
        teamMembersPropCount: Array.isArray(teamMembers) ? teamMembers.length : 'NA',
      });

      if (!user?.access_token) {
        console.log('[AssignTo][fetchTeamUsers] no token -> stop');
        setLoadingUsers(false);
        return;
      }

      const isCAUser = user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM';

      setLoadingUsers(true);
      try {
        let membersData = [];

        if (isCAUser) {
          try {
            console.log('[AssignTo][fetchTeamUsers] CA user -> calling listTeamMembers...');
            const res = await listTeamMembers(user.access_token, 'joined');
            console.log('[AssignTo][fetchTeamUsers] listTeamMembers raw response:', res);
            membersData = Array.isArray(res) ? res : (res?.members || res?.data || []);
          } catch (e) {
            console.error('[AssignTo][fetchTeamUsers] API error -> fallback prop', e);
            membersData = Array.isArray(teamMembers) ? teamMembers : [];
          }
        } else {
          if (teamMembers && Array.isArray(teamMembers) && teamMembers.length > 0) {
            console.log('[AssignTo][fetchTeamUsers] non-CA -> using teamMembers prop');
            membersData = teamMembers;
          } else {
            try {
              console.log('[AssignTo][fetchTeamUsers] non-CA -> calling listTeamMembers...');
              const res = await listTeamMembers(user.access_token, 'joined');
              console.log('[AssignTo][fetchTeamUsers] listTeamMembers raw response:', res);
              membersData = Array.isArray(res) ? res : (res?.members || res?.data || []);
            } catch (e) {
              console.error('[AssignTo][fetchTeamUsers] non-CA API error', e);
              membersData = [];
            }
          }
        }

        console.log('[AssignTo][fetchTeamUsers] membersData normalized:', {
          count: Array.isArray(membersData) ? membersData.length : 'NA',
          sample: Array.isArray(membersData) ? membersData.slice(0, 3) : membersData
        });

        const usersList = [];

        if (Array.isArray(membersData)) {
          membersData.forEach(member => {
            const memberId = member.user_id || member.id;
            if (!memberId) {
              console.warn('[AssignTo][fetchTeamUsers] skipped member (no id):', member);
              return;
            }

            if (!usersList.find(u => u.id === memberId)) {
              usersList.push({
                id: memberId,
                user_id: memberId,
                name: member.name || member.full_name || member.email,
                email: member.email,
                role: member.role
              });
            }
          });
        }

        console.log('[AssignTo][fetchTeamUsers] usersList mapped:', usersList.length, usersList);

        setTeamUsers(usersList);
      } catch (error) {
        console.error('[AssignTo][fetchTeamUsers] FAILED:', error);
        toast({
          title: "Error",
          description: "Failed to load team members.",
          variant: "destructive"
        });
      } finally {
        setLoadingUsers(false);
        console.log('[AssignTo][fetchTeamUsers] done (loadingUsers=false)');
      }
    };

    fetchTeamUsers();
  }, [user?.access_token, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // =========================
  // Fetch users for the selected client when client_id changes
  // =========================
  useEffect(() => {
    const fetchClientUsers = async () => {
      const isCAUser = user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM';

      console.log('[ClientUsers][effect] triggered', {
        isCAUser,
        client_id: formData.client_id,
        hasToken: !!user?.access_token
      });

      if (!user?.access_token || !isCAUser) {
        console.log('[ClientUsers][effect] skip (no token or not CA user)');
        return;
      }

      if (!formData.client_id) {
        console.log('[ClientUsers][effect] no client selected -> clear selectedClientUsers');
        setSelectedClientUsers([]);
        return;
      }

      setLoadingClientUsers(true);
      try {
        const { listEntityUsers } = await import('@/lib/api');

        console.log('[ClientUsers] calling listEntityUsers...', {
          client_id: formData.client_id
        });

        const response = await listEntityUsers(formData.client_id, user.access_token);

        console.log('[ClientUsers] listEntityUsers raw response:', response);

        let usersList = [];
        if (Array.isArray(response)) {
          usersList = response;
        } else if (response?.joined_users || response?.invited_users) {
          usersList = [
            ...(response.joined_users || []),
            ...(response.invited_users || [])
          ];
        } else if (response?.users) {
          usersList = response.users;
        }

        console.log('[ClientUsers] usersList normalized:', {
          count: Array.isArray(usersList) ? usersList.length : 'NA',
          sample: Array.isArray(usersList) ? usersList.slice(0, 3) : usersList
        });

        const formattedUsers = (usersList || [])
          .map(u => ({
            id: u.user_id || u.id,
            name: u.name || u.full_name || u.email,
            email: u.email,
            role: u.role || u.target_role
          }))
          .filter(u => !!u.id);

        console.log('[ClientUsers] formattedUsers mapped:', formattedUsers.length, formattedUsers);

        setSelectedClientUsers(formattedUsers);
      } catch (error) {
        console.error("[ClientUsers] fetch failed:", error);
        setSelectedClientUsers([]);
      } finally {
        setLoadingClientUsers(false);
        console.log('[ClientUsers] done (loadingClientUsers=false)');
      }
    };

    fetchClientUsers();
  }, [formData.client_id, user?.access_token, user?.role]);

  // =========================
  // Prefill for edit / selectedOrg
  // =========================
  useEffect(() => {
    if (task) {
      console.log('[Prefill] edit mode -> setting formData from task', task);
      setFormData({
        title: task.title || '',
        client_id: task.client_id || '',
        service_id: task.service_id || '',
        stage_id: task.stage_id || task.stage?.id || '',
        due_date: task.due_date ? new Date(task.due_date) : null,
        description: task.description || '',
        checklist_enabled: task.checklist?.enabled || false,
        checklist_items: (task.checklist?.items || []).map(item => ({
          name: item.name || '',
          is_completed: item.is_completed || false
        })),
        assigned_user_id: task.assigned_to || task.assigned_user_id || '',
        priority: task.priority || '',
        tag_id: task.tag_id || '',
        is_recurring: task.is_recurring || false,
        recurrence_frequency: task.recurrence_frequency || 'weekly',
        recurrence_time: task.recurrence_time || '09:00',
        recurrence_day_of_week: task.recurrence_day_of_week || null,
        recurrence_date: task.recurrence_date ? new Date(task.recurrence_date) : null,
        recurrence_day_of_month: task.recurrence_day_of_month || null,
        recurrence_start_date: task.recurrence_start_date ? new Date(task.recurrence_start_date) : null,
        client_user_id: task.client_user_id || '',
        due_time: task.due_time || '12:00',
      });
    } else if (selectedOrg) {
      // ✅ DO NOT auto-select client for create task modal
      // Keep client empty by default so Assign To shows team members
      console.log('[Prefill] selectedOrg exists but NOT auto-prefilling client_id');
    } else {
      console.log('[Prefill] create mode + no selectedOrg');
    }
  }, [task, selectedOrg]);

  // =========================
  // Simple handlers
  // =========================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    console.log('[Form] handleSelectChange', { name, value });
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name, date) => {
    console.log('[Form] handleDateChange', { name, date });
    setFormData(prev => ({ ...prev, [name]: date }));
  };

  const handleSwitchChange = (name, checked) => {
    console.log('[Form] handleSwitchChange', { name, checked });
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // =========================
  // ✅ Compute Assign To options (with debug)
  // =========================
  const assignToOptions = useMemo(() => {
    const isCAUser = user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM';

    console.log('[AssignTo][useMemo] compute', {
      role: user?.role,
      isCAUser,
      client_id: formData.client_id,
      loadingUsers,
      loadingClientUsers,
      teamUsersCount: teamUsers?.length || 0,
      selectedClientUsersCount: selectedClientUsers?.length || 0,
      currentUserId: user?.user_id,
    });

    // CA + client selected => client users
    if (isCAUser && formData.client_id) {
      const options = (selectedClientUsers || [])
        .filter(u => u?.id)
        .map(u => ({
          value: String(u.id),
          label: `${u.name || u.email} (Client User)`
        }));

      console.log('[AssignTo][useMemo] returning CLIENT users options:', options.length, options);
      return options;
    }

    // Otherwise => team users (exclude logged-in user)
    const options = (teamUsers || [])
      .filter(u => {
        const userId = u.user_id || u.id;
        // Filter out the logged-in user
        if (user?.user_id && String(userId) === String(user.user_id)) {
          console.log('[AssignTo][useMemo] filtering out logged-in user:', userId);
          return false;
        }
        return !!userId;
      })
      .map(teamUser => {
        const userId = teamUser.user_id || teamUser.id;
        let displayRole = '';
        if (teamUser.role) {
          displayRole = ` (${String(teamUser.role).replace('CA_', '').replaceAll('_', ' ')})`;
        }
        return {
          value: String(userId),
          label: `${teamUser.name || teamUser.email || 'Unnamed User'}${displayRole}`
        };
      });

    console.log('[AssignTo][useMemo] returning TEAM users options:', options.length, options);
    return options;
  }, [
    formData.client_id,
    teamUsers,
    selectedClientUsers,
    user?.role,
    user?.user_id,
    loadingUsers,
    loadingClientUsers
  ]);

  // =========================
  // Optional: watch state changes to catch unexpected resets
  // =========================
  useEffect(() => {
    console.log('[StateWatch] teamUsers changed:', teamUsers.length, teamUsers);
  }, [teamUsers]);

  useEffect(() => {
    console.log('[StateWatch] selectedClientUsers changed:', selectedClientUsers.length, selectedClientUsers);
  }, [selectedClientUsers]);

  useEffect(() => {
    console.log('[StateWatch] client_id changed:', formData.client_id);
  }, [formData.client_id]);

  useEffect(() => {
    console.log('[StateWatch] assigned_user_id changed:', formData.assigned_user_id);
  }, [formData.assigned_user_id]);

  // =========================
  // Submit
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('[Submit] start', { formData });

    const requiredFields = ['title', 'assigned_user_id'];
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      console.warn('[Submit] missing required fields:', missingFields);

      const fieldNames = missingFields.map(f => {
        if (f === 'assigned_user_id') return 'Assign To';
        return 'Task Title';
      });

      toast({
        title: "Validation Error",
        description: `Please fill in all required fields: ${fieldNames.join(', ')}.`,
        variant: "destructive"
      });
      return;
    }

    let stageId = formData.stage_id;
    if (!task && !stageId && stages.length > 0) {
      const toDoStage = stages.find(s => s.name?.toLowerCase() === 'to do' || s.name?.toLowerCase() === 'todo');
      stageId = toDoStage?.id || stages[0]?.id;
    }

    setIsSaving(true);

    const isCAUser = user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM';

    const taskData = {
      title: formData.title,
      client_id: isCAUser ? (formData.client_id || null) : null,
      client_user_id: isCAUser ? (formData.client_user_id || null) : null,
      service_id: null,
      stage_id: stageId || null,
      due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
      description: formData.description,
      priority: formData.priority || null,
      tag_id: formData.tag_id || null,
      checklist: {
        enabled: formData.checklist_enabled,
        items: formData.checklist_items
          .filter(item => item.name.trim() !== '')
          .map(item => ({
            name: item.name,
            is_completed: item.is_completed || false
          }))
      },
      assigned_to: formData.assigned_user_id || null,

      is_recurring: formData.is_recurring || false,
      recurrence_frequency: formData.is_recurring ? formData.recurrence_frequency : null,
      recurrence_time: formData.is_recurring && formData.recurrence_frequency === 'daily' ? formData.recurrence_time : null,
      recurrence_day_of_week: formData.is_recurring && formData.recurrence_frequency === 'weekly' ? formData.recurrence_day_of_week : null,
      recurrence_date:
        formData.is_recurring &&
          ['monthly', 'yearly'].includes(formData.recurrence_frequency) &&
          formData.recurrence_date
          ? format(formData.recurrence_date, 'yyyy-MM-dd')
          : null,
      recurrence_day_of_month:
        formData.is_recurring &&
          ['quarterly', 'half_yearly'].includes(formData.recurrence_frequency)
          ? formData.recurrence_day_of_month
          : null,
      recurrence_start_date:
        formData.is_recurring && formData.recurrence_start_date
          ? format(formData.recurrence_start_date, 'yyyy-MM-dd')
          : null
    };

    console.log('[Submit] payload prepared:', taskData);

    try {
      await onSave(taskData, !!task);
      console.log('[Submit] onSave success');
    } catch (err) {
      console.error('[Submit] onSave error', err);
    } finally {
      setIsSaving(false);
      console.log('[Submit] done (isSaving=false)');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 text-white">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="glass-pane p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-2">Task Details</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="title">Task Title*</Label>
                <Input id="title" name="title" placeholder="e.g., File annual tax returns" value={formData.title} onChange={handleChange} required disabled={isSaving} />
              </div>
              <div>
                <Label htmlFor="due_date" className="mb-2">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.due_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.due_date ? format(formData.due_date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.due_date} onSelect={(d) => handleDateChange('due_date', d)} disabled={(date) => date < new Date().setHours(0, 0, 0, 0)} initialFocus /></PopoverContent>
                </Popover>
              </div>
            </div>

            {(user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM') && (
              <div>
                <Label htmlFor="client_id" className="mb-2">Client</Label>
                <Combobox
                  options={clients.map(c => ({
                    value: String(c.id),
                    label: c.name || c.email
                  }))}
                  value={formData.client_id ? String(formData.client_id) : ''}
                  onValueChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      client_id: value || '', // Allow clearing the client
                      assigned_user_id: '' // Reset assignee when client changes
                    }));
                  }}
                  placeholder="Select a client (optional)"
                  searchPlaceholder="Search clients..."
                  emptyText="No clients found."
                  disabled={isSaving}
                />
              </div>
            )}

            <div>
              <Label htmlFor="assigned_user_id" className="mb-2 flex items-center gap-2">
                Assign To*
                {(loadingUsers || loadingClientUsers) && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                )}
              </Label>
              <Combobox
                options={assignToOptions}
                value={formData.assigned_user_id ? String(formData.assigned_user_id) : ''}
                onValueChange={(value) => handleSelectChange('assigned_user_id', value)}
                placeholder={loadingUsers || loadingClientUsers ? "Loading users..." : "Select a user"}
                searchPlaceholder="Search users..."
                emptyText={loadingUsers || loadingClientUsers ? "Loading users..." : "No users found."}
                disabled={isSaving || loadingUsers || loadingClientUsers}
              />
            </div>
            <div>
              {/* <Label htmlFor="description">Description</Label> */}
              {/* <Textarea id="description" name="description" placeholder="Add a detailed description for the task..." value={formData.description} onChange={handleChange} disabled={isSaving} /> */}
            </div>
          </div>
        </div>

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
                        checklist_items: [...prev.checklist_items, { name: itemName, is_completed: false }]
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
                        checklist_items: [...prev.checklist_items, { name: itemName, is_completed: false }]
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
                    {/* <Checkbox
                      checked={item.is_completed || false}
                      onCheckedChange={(checked) => updateChecklistItem(index, 'is_completed', checked)}
                      disabled={isSaving}
                    /> */}
                    <Input
                      value={item.name}
                      onChange={(e) => updateChecklistItem(index, 'name', e.target.value)}
                      placeholder="Checklist item name"
                      className="flex-grow bg-transparent border-none focus-visible:ring-0"
                      disabled={isSaving}
                      style={{ textDecoration: item.is_completed ? 'line-through' : 'none', opacity: item.is_completed ? 0.6 : 1 }}
                    />
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
        {/* 
        <div className="glass-pane p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-2">Assignment & Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      
            <div>
            
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
        </div> */}

        <div className="glass-pane p-6 rounded-lg">
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="is_recurring"
              checked={formData.is_recurring}
              onCheckedChange={(c) => {
                handleSwitchChange('is_recurring', c);
              }}
              disabled={isSaving}
            />
            <Label htmlFor="is_recurring" className="text-xl font-semibold cursor-pointer">Make this task recurring</Label>
          </div>

          {formData.is_recurring && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-1  gap-4">
                <div>
                  <Label htmlFor="recurrence_frequency">Frequency</Label>
                  <Select
                    name="recurrence_frequency"
                    onValueChange={(v) => {
                      handleSelectChange('recurrence_frequency', v);
                      // Reset selections when frequency changes
                      if (v !== 'daily') {
                        handleSelectChange('recurrence_time', '09:00');
                      }
                      if (v !== 'weekly') {
                        handleSelectChange('recurrence_day_of_week', null);
                      }
                      if (!['monthly', 'yearly'].includes(v)) {
                        handleDateChange('recurrence_date', null);
                      }
                      if (!['quarterly', 'half_yearly'].includes(v)) {
                        handleSelectChange('recurrence_day_of_month', null);
                      }
                    }}
                    value={formData.recurrence_frequency}
                    disabled={isSaving}
                  >
                    <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="half_yearly">Half Yearly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  {/* <Label htmlFor="recurrence_start_date">Start Date</Label>
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
                  </Popover> */}
                </div>
              </div >

              {
                formData.recurrence_frequency === 'daily' && (
                  <div>
                    <Label htmlFor="recurrence_time">Time</Label>
                    <Input
                      id="recurrence_time"
                      name="recurrence_time"
                      type="time"
                      value={formData.recurrence_time || '09:00'}
                      onChange={(e) => handleSelectChange('recurrence_time', e.target.value)}
                      disabled={isSaving}
                      className="w-full"
                    />
                  </div>
                )
              }

              {
                formData.recurrence_frequency === 'weekly' && (
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
                )
              }

              {
                ['monthly', 'yearly'].includes(formData.recurrence_frequency) && (
                  <div>
                    <Label htmlFor="recurrence_date">
                      {formData.recurrence_frequency === 'monthly' ? 'Date (Day of Month)' : 'Date'}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.recurrence_date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.recurrence_date ? format(formData.recurrence_date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.recurrence_date}
                          onSelect={(d) => handleDateChange('recurrence_date', d)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )
              }

              {
                ['quarterly', 'half_yearly'].includes(formData.recurrence_frequency) && (
                  <div>
                    <Label htmlFor="recurrence_day_of_month">
                      Day of Month (repeats every {formData.recurrence_frequency === 'quarterly' ? '3 months' : '6 months'})
                    </Label>
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
                )
              }
            </div >
          )}
        </div >

        <div className="flex justify-end pt-6 border-t border-white/10">
          <Button onClick={handleSubmit} disabled={isSaving} style={isSaving ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {task ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form >
    </div >
  );
};

export default NewTaskForm;
