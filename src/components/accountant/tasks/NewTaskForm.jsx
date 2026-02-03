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

const NewTaskForm = ({ onSave, onCancel, clients, services, teamMembers, tags, task, stages = [], selectedOrg, isRecurringOnly = false, fixedServiceId = null }) => {
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
    recurrence_start_month: null,
    recurrence_start_date: null,
    due_date_offset: 0,
    target_date_offset: null
  });

  const [isSaving, setIsSaving] = useState(false);

  // =========================
  // Fetch CA Team Members for "Assign To"
  // =========================
  useEffect(() => {
    const fetchTeamUsers = async () => {
      // If teamMembers prop is provided and valid, use it. 
      // This is especially important for Client Users where API might fail or be restricted,
      // and the parent (TaskManagementPage) has already fetched the correct list (combined with Entity Users).
      if (teamMembers && Array.isArray(teamMembers) && teamMembers.length > 0) {
        setTeamUsers(teamMembers);
        setLoadingUsers(false);
        // If we have prop data, we might not need to fetch, but for CA users we might want to ensure fresh data?
        // Actually, for CA users, listTeamMembers fetches "My Team".
        // If the prop is passed, it takes precedence in current logic?
        // Let's refine:
        // If CA User -> Fetch from API (listTeamMembers) to get "My Agency Team"
        // If Client User -> Rely on `teamMembers` prop which contains "My Entity/Org Users"
      }

      if (!user?.access_token) {
        setLoadingUsers(false);
        return;
      }

      const isCAUser = user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM';

      if (isCAUser) {
        setLoadingUsers(true);
        try {
          const res = await listTeamMembers(user.access_token, 'joined');
          const membersData = Array.isArray(res) ? res : (res?.members || res?.data || []);

          const usersList = [];
          if (Array.isArray(membersData)) {
            membersData.forEach(member => {
              const memberId = member.user_id || member.id;
              if (memberId && !usersList.find(u => u.id === memberId)) {
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
          setTeamUsers(usersList);
        } catch (error) {
          console.error('[AssignTo][fetchTeamUsers] CA fetch FAILED:', error);
          // Fallback to prop if available
          if (teamMembers && Array.isArray(teamMembers)) {
            setTeamUsers(teamMembers);
          }
        } finally {
          setLoadingUsers(false);
        }
      } else {
        // For Non-CA Users (Client Admin/User)
        // If prop is missing or empty, fetch from new API
        if ((!teamMembers || teamMembers.length === 0)) {
          setLoadingUsers(true);
          try {
            // Use the new API for Client Users to list their team
            const { listAllClientUsers } = await import('@/lib/api');

            // Pass selectedOrg (which acts as the current Entity ID context) to filter users
            // selectedOrg prop is passed from TaskManagementPage as `entityId || selectedOrg`
            const res = await listAllClientUsers(user.access_token, selectedOrg);

            // Normalize data
            const usersList = [];
            const membersData = Array.isArray(res) ? res : (res?.users || []);

            membersData.forEach(u => {
              // Ensure we have an ID
              const uid = u.id || u.user_id;
              if (uid) {
                usersList.push({
                  id: uid,
                  user_id: uid,
                  name: u.name || u.full_name || u.email,
                  email: u.email,
                  role: u.role
                });
              }
            });

            setTeamUsers(usersList);
          } catch (e) {
            console.warn('[AssignTo] Client user list fetch failed', e);
          } finally {
            setLoadingUsers(false);
          }
        } else {
          setLoadingUsers(false);
        }
      }
    };

    fetchTeamUsers();
  }, [user?.access_token, user?.role, teamMembers]); // Added teamMembers to dependency

  // =========================
  // Fetch users for the selected client when client_id changes
  // =========================
  useEffect(() => {
    const fetchClientUsers = async () => {
      // Allow CA roles AND Client roles to fetch specific entity users if client_id is set
      const isCAUser = user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM';
      const isClientUser = user?.role === 'CLIENT_MASTER_ADMIN' || user?.role === 'CLIENT_ADMIN' || user?.role === 'CLIENT_USER';

      if (!user?.access_token || (!isCAUser && !isClientUser)) {
        return;
      }

      if (!formData.client_id) {
        setSelectedClientUsers([]);
        return;
      }

      setLoadingClientUsers(true);
      try {
        const { listEntityUsers } = await import('@/lib/api');

        const response = await listEntityUsers(formData.client_id, user.access_token);

        let usersList = [];
        if (Array.isArray(response)) {
          usersList = response;
        } else if (response?.joined_users || response?.invited_users) {
          // Only show joined users
          usersList = response.joined_users || [];
        } else if (response?.users) {
          usersList = response.users;
        }

        const formattedUsers = (usersList || [])
          .map(u => ({
            id: u.user_id || u.id,
            name: u.name || u.full_name || u.email,
            email: u.email,
            role: u.role || u.target_role
          }))
          .filter(u => !!u.id);

        setSelectedClientUsers(formattedUsers);
      } catch (error) {
        console.error("[ClientUsers] fetch failed:", error);
        setSelectedClientUsers([]);
      } finally {
        setLoadingClientUsers(false);
      }
    };

    fetchClientUsers();
  }, [formData.client_id, user?.access_token, user?.role]);

  // =========================
  // Prefill for edit / selectedOrg
  // =========================
  useEffect(() => {
    if (task) {
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
        recurrence_start_month: task.recurrence_start_date ? new Date(task.recurrence_start_date).getMonth() : null,
        recurrence_start_date: task.recurrence_start_date ? new Date(task.recurrence_start_date) : null,
        client_user_id: task.client_user_id || '',
        due_time: task.due_time || '12:00',
        due_date_offset: task.due_date_offset || 0,
        target_date_offset: task.target_date_offset || null
      });
    } else if (isRecurringOnly) {
      setFormData(prev => ({
        ...prev,
        is_recurring: true,
        service_id: fixedServiceId || prev.service_id,
        recurrence_frequency: 'daily' // Default for recurring only
      }));
    } else if (selectedOrg) {
      // Auto-select client if we are in a client context
      // Validate if selectedOrg exists in clients list to avoid phantom client selection
      const clientExists = clients && clients.some(c => String(c.id) === String(selectedOrg));
      if (clientExists) {
        setFormData(prev => ({ ...prev, client_id: selectedOrg }));
      }
    }
  }, [task, selectedOrg, isRecurringOnly, fixedServiceId, clients]);

  // =========================
  // Simple handlers
  // =========================
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

  // =========================
  // Compute Assign To options
  // =========================
  const assignToOptions = useMemo(() => {
    const isCAUser = user?.role === 'CA_ACCOUNTANT' || user?.role === 'CA_TEAM';
    const isClientUser = user?.role === 'CLIENT_MASTER_ADMIN' || user?.role === 'CLIENT_ADMIN' || user?.role === 'CLIENT_USER';

    // CA + client selected => client users
    // OR Client User + client selected => client users (Strict filtering)
    if ((isCAUser || isClientUser) && formData.client_id) {
      const currentUserId = user?.user_id || user?.id; // Get current user ID to hide from list

      const options = (selectedClientUsers || [])
        .filter(u => {
          if (!u?.id) return false;
          // Hide logged-in user
          if (currentUserId && String(u.id) === String(currentUserId)) {
            return false;
          }
          return true;
        })
        .map(u => {
          let roleLabel = '(Client User)';
          if (u.role === 'CLIENT_MASTER_ADMIN') {
            roleLabel = '(Client Admin)';
          }
          return {
            value: String(u.id),
            label: `${u.name || u.email} ${roleLabel}`
          };
        });
      return options;
    }

    // Otherwise => team users (exclude logged-in user)
    const options = (teamUsers || [])
      .filter(u => {
        const userId = u.user_id || u.id;
        // Filter out the logged-in user
        if (user?.user_id && String(userId) === String(user.user_id)) {
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
  // Submit
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredFields = ['title', 'assigned_user_id'];
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
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
      service_id: formData.service_id && formData.service_id !== 'none' ? formData.service_id : null,
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
      recurrence_frequency: formData.is_recurring ? (
        ['quarterly', 'half_yearly'].includes(formData.recurrence_frequency) ? 'monthly' : formData.recurrence_frequency
      ) : null,
      recurrence_interval: formData.is_recurring ? (
        formData.recurrence_frequency === 'quarterly' ? 3 :
          formData.recurrence_frequency === 'half_yearly' ? 6 :
            1 // Default interval (e.g., daily, weekly, monthly, yearly)
      ) : 1,
      recurrence_time: formData.is_recurring && formData.recurrence_frequency === 'daily' ? formData.recurrence_time : null,
      recurrence_day_of_week: formData.is_recurring && formData.recurrence_frequency === 'weekly' ? formData.recurrence_day_of_week : null,
      // For Yearly, we set start_date based on month/day, so recurrence_date (legacy) is not strictly needed if backend uses start_date for anchoring.
      // However, if backend expects recurrence_date for yearly, we should populate it.
      // Based on CRUD logic: Yearly checks: check_date.month == start_date.month && check_date.day == start_date.day.
      // So setting start_date correctly is the KEY.
      recurrence_date: null,
      recurrence_day_of_month:
        formData.is_recurring &&
          ['monthly', 'quarterly', 'half_yearly'].includes(formData.recurrence_frequency)
          ? formData.recurrence_day_of_month
          : null,
      recurrence_start_date: (() => {
        if (!formData.is_recurring) return null;
        if (formData.recurrence_start_date) return format(formData.recurrence_start_date, 'yyyy-MM-dd'); // Manual override if we keep the field (we might hide it)

        // For Q/H/Y, calculate start date from Month/Day
        if (['quarterly', 'half_yearly', 'yearly'].includes(formData.recurrence_frequency)) {
          if (formData.recurrence_start_month !== null && formData.recurrence_day_of_month !== null) {
            const now = new Date();
            const currentYear = now.getFullYear();
            // Create candidate date for this year
            let candidateDate = new Date(currentYear, formData.recurrence_start_month, formData.recurrence_day_of_month);

            // Handle invalid dates (e.g. Feb 30 -> Mar 2), strictly speaking we want to avoid this or handle it.
            // JS Date auto-corrects. If we want strict "Day 31", and month has 30, it goes to next month.
            // For now, assume JS behavior is acceptable or user selects valid day.

            // If candidate is in past, move to next year (for Yearly) OR next valid cycle (for Q/H)?
            // Actually, for Q/H, the "Start Month" is just the anchor.
            // Example: Today Feb 2024. User selects "Jan" "1" for Quarterly.
            // We want first run: Jan 1 2024 (Past) -> Next run Apr 1 2024.
            // IF we set start_date to Jan 1 2024, backend "days_since_start % interval" logic needs to handle it.
            // Backend checking:
            // Monthly (Interval 3): months_since_start % 3 == 0.
            // If start_date = Jan 1 2024. Check Apr 1 2024.
            // (2024-2024)*12 + (4-1) = 3. 3 % 3 == 0. Match!
            // So setting start_date to PAST is fine for anchoring.

            // However, if we set start_date to Jan 1 2024, and today is Feb 2024.
            // The backend `should_create_task_today` checks: `if check_date < recurring_task.start_date: return False`.
            // So if we set start_date to TODAY (or future), it works.
            // If we set start_date to PAST, it works for future dates.

            // STRATEGY: Find the *next* occurrence >= Today.

            // Case 1: Yearly.
            // Today: Feb 10. Selected: Jan 1. Next: Jan 1 NEXT YEAR.
            // Today: Feb 10. Selected: Mar 1. Next: Mar 1 THIS YEAR.
            if (formData.recurrence_frequency === 'yearly') {
              if (candidateDate < now.setHours(0, 0, 0, 0)) {
                candidateDate.setFullYear(currentYear + 1);
              }
              return format(candidateDate, 'yyyy-MM-dd');
            }

            // Case 2: Quarterly.
            // Today: Feb 10. Selected: Jan 1.
            // If we set Start Date = Jan 1 (Past).
            // Next run logic in backend: (MonthDiff % 3 == 0).
            // Apr 1 (Month 4). Diff vs Month 1 = 3. OK.
            // So we can just set the "Anchor Date". 
            // BUT, `should_create_task_today` enforces `check_date >= start_date`.
            // So we should probably set start_date to the first *future* run?
            // OR, set start_date to the anchor date, provided it's "close enough"?
            // user request: "today is feb 10 2026 -> q set to apr 28" (if anchor was jan 28??)
            // User said: "if user select back month or date from current date like in this case 1jan then show first on 1 march then may 1." -> Wait.
            // "Example: Today Feb 10. Q set to Apr 28 [implies Q starting, say, Jan 28?]"
            // "if user select back month ... 1 jan ... then show first on 1 march" -> This suggests Interval 2?
            // No, Quarterly is Interval 3.
            // If User selects "Jan 1" as start.
            // Runs: Jan 1, Apr 1, Jul 1, Oct 1.
            // If Today is Feb 10.
            // Jan 1 is past. Next is Apr 1.
            // So we should set start_date to Jan 1 (past) ?
            // If we set start_date = Jan 1.
            // Check Date = Apr 1. Diff = 3. 3%3==0. CREATE.
            // Check Date = Feb 10. Diff = 1. 1%3!=0. SKIP.
            // This works perfectly! We SHOULD set the anchor date, even if it's in the past (this year).

            // EXCEPTION: If the user selects a month/day that hasn't happened yet this year, use this year.
            // If user selects a month/day that passed, use this year's date (past) as anchor.
            // Backend logic handles "start_date" as the "reference point".

            return format(candidateDate, 'yyyy-MM-dd');
          }
        }

        return formData.recurrence_start_date ? format(formData.recurrence_start_date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      })(),
      due_date_offset: formData.is_recurring ? (formData.due_date_offset || 0) : 0,
      target_date_offset: formData.is_recurring ? formData.target_date_offset : null
    };

    try {
      await onSave(taskData, !!task);
    } catch (err) {
      console.error('[Submit] Error saving task', err);
    } finally {
      setIsSaving(false);
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


            {user?.role === 'CA_ACCOUNTANT' && (
              <div>
                <Label htmlFor="service_id" className="mb-2">Service</Label>
                <Select name="service_id" onValueChange={(v) => handleSelectChange('service_id', v)} value={formData.service_id || ''} disabled={isSaving || !!fixedServiceId}>
                  <SelectTrigger><SelectValue placeholder="Select a service (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
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
            )}

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
                placeholder={
                  loadingUsers || loadingClientUsers
                    ? "Loading users..."
                    : formData.client_id
                      ? (assignToOptions.length === 0 ? "No users found for this client" : "Select a client user")
                      : "Select a user"
                }
                searchPlaceholder="Search users..."
                emptyText={
                  loadingUsers || loadingClientUsers
                    ? "Loading users..."
                    : formData.client_id && assignToOptions.length === 0
                      ? "No users found for this client."
                      : "No users found."
                }
                disabled={isSaving || loadingUsers || loadingClientUsers || (formData.client_id && assignToOptions.length === 0)}
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
            {!isRecurringOnly && (
              <Checkbox
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(c) => handleSwitchChange('is_recurring', c)}
                disabled={isSaving}
              />
            )}
            <Label htmlFor="is_recurring" className="text-xl font-semibold cursor-pointer">
              {isRecurringOnly ? 'Recurrence Configuration' : 'Make this task recurring'}
            </Label>
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
                      if (!['monthly', 'quarterly', 'half_yearly', 'yearly'].includes(v)) {
                        handleSelectChange('recurrence_day_of_month', null);
                      }
                      if (!['quarterly', 'half_yearly', 'yearly'].includes(v)) {
                        handleSelectChange('recurrence_start_month', null);
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
              </div>

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
                ['monthly'].includes(formData.recurrence_frequency) && (
                  <div>
                    <Label htmlFor="recurrence_day_of_month">Day of Month (1-31)</Label>
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




              {
                ['quarterly', 'half_yearly', 'yearly'].includes(formData.recurrence_frequency) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="recurrence_start_month">
                        {formData.recurrence_frequency === 'yearly' ? 'Month' : 'Start Month'}
                      </Label>
                      <Select
                        name="recurrence_start_month"
                        onValueChange={(v) => handleSelectChange('recurrence_start_month', parseInt(v))}
                        value={formData.recurrence_start_month !== null ? String(formData.recurrence_start_month) : ''}
                        disabled={isSaving}
                      >
                        <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                        <SelectContent>
                          {[
                            { value: 0, label: 'January' },
                            { value: 1, label: 'February' },
                            { value: 2, label: 'March' },
                            { value: 3, label: 'April' },
                            { value: 4, label: 'May' },
                            { value: 5, label: 'June' },
                            { value: 6, label: 'July' },
                            { value: 7, label: 'August' },
                            { value: 8, label: 'September' },
                            { value: 9, label: 'October' },
                            { value: 10, label: 'November' },
                            { value: 11, label: 'December' }
                          ].map(month => (
                            <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                  </div>
                )
              }

              {/* Offset fields for Recurring Tasks */}

            </div>
          )
          }
        </div>

        <div className="flex justify-end pt-6 border-t border-white/10">
          <Button onClick={handleSubmit} disabled={isSaving} style={isSaving ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {task ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewTaskForm;
