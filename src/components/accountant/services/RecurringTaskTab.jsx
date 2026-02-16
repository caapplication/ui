import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NewTaskForm from '@/components/accountant/tasks/NewTaskForm.jsx';
// Note: Service detail uses a service-specific recurring table layout.
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createRecurringTask,
  updateRecurringTask,
  deleteRecurringTask,
  listRecurringTasks,
  listClients,
  listServices,
  listTeamMembers,
  getTags,
  listAllClientUsers
} from '@/lib/api';
import ServiceRecurringTasksTable from "@/components/accountant/services/ServiceRecurringTasksTable.jsx";

const RecurringTaskTab = ({ service, onUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Data for form
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [tags, setTags] = useState([]);

  // Data for list
  const [recurringTasks, setRecurringTasks] = useState([]);

  const fetchData = async () => {
    if (!user?.agency_id || !user?.access_token) return;
    setIsLoading(true);
    try {
      const results = await Promise.allSettled([
        listClients(user.agency_id, user.access_token),
        listServices(user.agency_id, user.access_token),
        listTeamMembers(user.access_token),
        getTags(user.agency_id, user.access_token),
        listRecurringTasks(user.agency_id, user.access_token, null, 1, 100, service.id), // Filter by service_id
        listAllClientUsers(user.access_token)
      ]);

      if (results[0].status === 'fulfilled') {
        setClients(Array.isArray(results[0].value) ? results[0].value : (results[0].value?.items || []));
      }
      if (results[1].status === 'fulfilled') {
        setServices(Array.isArray(results[1].value) ? results[1].value : (results[1].value?.items || []));
      }
      if (results[2].status === 'fulfilled') {
        const membersData = Array.isArray(results[2].value) ? results[2].value : (results[2].value?.items || []);
        setTeamMembers(membersData);
      }
      // Handle Entity Users (Client Users)
      let entityUsers = [];
      if (results[5].status === 'fulfilled') {
        // Assuming listAllEntityUsers returns a list or { items: [] }
        const res = results[5].value;
        entityUsers = Array.isArray(res) ? res : (res?.items || res?.users || []);
      }

      // Combine for the list view to resolve names
      // We store this in a separate state or merge into teamMembers for the view?
      // RecurringTaskList uses 'teamMembers' prop to look up users. 
      // We can just merge them into setTeamMembers, or better, keep separate and merge on render or pass merged.
      // Merging into setTeamMembers is easiest for now given the prop name.
      if (results[2].status === 'fulfilled' && results[5].status === 'fulfilled') {
        const membersData = Array.isArray(results[2].value) ? results[2].value : (results[2].value?.items || []);
        // Normalize entity users to have { id, name, ... }
        const normalizedEntityUsers = entityUsers.map(u => ({
          ...u,
          id: u.user_id || u.id,
          name: u.name || u.full_name || u.email,
          role: u.role || 'Client User'
        }));

        // Combine and deduplicate by ID just in case
        const combined = [...membersData, ...normalizedEntityUsers];
        // Simple dedup
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        setTeamMembers(unique);
      } else if (results[2].status === 'fulfilled') {
        // Fallback if entity fetch fails
        const membersData = Array.isArray(results[2].value) ? results[2].value : (results[2].value?.items || []);
        setTeamMembers(membersData);
      }

      if (results[3].status === 'fulfilled') {
        setTags(Array.isArray(results[3].value) ? results[3].value : []);
      }
      if (results[4].status === 'fulfilled') {
        const tasksRes = results[4].value;
        setRecurringTasks(tasksRes.items || (Array.isArray(tasksRes) ? tasksRes : []));
      }

    } catch (e) {
      console.error("Error loading for recurring task tab", e);
      toast({
        title: "Error loading data",
        description: "Failed to load necessary data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, service.id]);

  const handleCreate = async (taskData, isEdit) => {
    try {
      // NewTaskForm already sends recurrence_* fields, but API expects old field names for mapping
      // Map to old field names so API can map them back to recurrence_* fields
      const finalTaskData = {
        title: taskData.title,
        client_id: taskData.client_id || null,
        service_id: service.id,
        description: taskData.description || null,
        assigned_to: taskData.assigned_to || null,
        priority: taskData.priority || null,
        tag_id: taskData.tag_id || null,
        checklist: taskData.checklist || null,

        // Map recurrence_* fields to old field names for API mapping
        frequency: taskData.recurrence_frequency || null,
        interval: taskData.recurrence_interval !== undefined ? taskData.recurrence_interval : 1,
        start_date: taskData.recurrence_start_date || null,
        end_date: taskData.recurrence_end_date || null,
        day_of_week: taskData.recurrence_day_of_week !== undefined ? taskData.recurrence_day_of_week : null,
        day_of_month: taskData.recurrence_day_of_month !== undefined ? taskData.recurrence_day_of_month : null,
        week_of_month: taskData.recurrence_week_of_month !== undefined ? taskData.recurrence_week_of_month : null,
        due_date_offset: taskData.due_date_offset !== undefined ? taskData.due_date_offset : 0,
        target_date_offset: taskData.target_date_offset !== undefined ? taskData.target_date_offset : null,
        is_active: true
      };

      await createRecurringTask(finalTaskData, user.agency_id, user.access_token);
      toast({
        title: 'Recurring Task Created',
        description: 'The recurring task has been created successfully from this service.',
      });
      setIsModalOpen(false);
      fetchData(); // Refresh list
    } catch (error) {
      toast({
        title: 'Error creating recurring task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (taskData, isEdit) => {
    try {
      if (!editingTask) return;

      const finalTaskData = {
        title: taskData.title,
        client_id: taskData.client_id || null,
        service_id: service.id,
        description: taskData.description || null,
        assigned_to: taskData.assigned_to || null,
        priority: taskData.priority || null,
        tag_id: taskData.tag_id || null,
        checklist: taskData.checklist || null,

        // Map recurrence_* fields to old field names for API mapping
        frequency: taskData.recurrence_frequency || null,
        interval: taskData.recurrence_interval !== undefined ? taskData.recurrence_interval : 1,
        start_date: taskData.recurrence_start_date || null,
        end_date: taskData.recurrence_end_date || null,
        day_of_week: taskData.recurrence_day_of_week !== undefined ? taskData.recurrence_day_of_week : null,
        day_of_month: taskData.recurrence_day_of_month !== undefined ? taskData.recurrence_day_of_month : null,
        week_of_month: taskData.recurrence_week_of_month !== undefined ? taskData.recurrence_week_of_month : null,
        due_date_offset: taskData.due_date_offset !== undefined ? taskData.due_date_offset : 0,
        target_date_offset: taskData.target_date_offset !== undefined ? taskData.target_date_offset : null,
        is_active: (editingTask.recurrence_is_active !== undefined ? editingTask.recurrence_is_active : editingTask.is_active) !== undefined ? (editingTask.recurrence_is_active !== undefined ? editingTask.recurrence_is_active : editingTask.is_active) : true
      };

      await updateRecurringTask(editingTask.id, finalTaskData, user.agency_id, user.access_token);
      toast({
        title: 'Recurring Task Updated',
        description: 'The recurring task has been updated successfully.',
      });
      setIsModalOpen(false);
      setEditingTask(null);
      fetchData();
    } catch (error) {
      toast({
        title: 'Error updating recurring task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await deleteRecurringTask(taskId, user.agency_id, user.access_token);
      toast({
        title: 'Recurring Task Deleted',
        description: 'The recurring task has been deleted successfully.',
      });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error deleting recurring task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openNewTaskModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditTaskModal = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleViewTask = (taskId) => {
    navigate(`/tasks/recurring/${taskId}`, { state: { fromService: true, serviceId: service.id } });
  };


  if (isLoading && recurringTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-semibold text-white">Recurring Tasks</h3>
          <p className="text-sm text-gray-400">Recurring tasks created for this service.</p>
        </div>
        <Button
          onClick={openNewTaskModal}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      </div>

      <ServiceRecurringTasksTable
        recurringTasks={recurringTasks}
        teamMembers={teamMembers}
        onEdit={openEditTaskModal}
        onDelete={handleDelete}
        onViewTask={handleViewTask}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10 text-white p-0">
          {/* 
                   We don't need a DialogHeader here because `NewRecurringTaskForm` has its own structure 
                   or we can add a simple one if `isEmbedded` hides everything. 
                   Since `isEmbedded` hides the main header, let's add a Dialog Header for better UX.
                 */}
          <DialogHeader className="p-6 pb-2 border-b border-white/10">
            <DialogTitle className="text-xl font-bold">
              {editingTask ? 'Edit Recurring Task' : 'Create New Recurring Task'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-2">
            <NewTaskForm
              onSave={editingTask ? handleUpdate : handleCreate}
              onCancel={() => setIsModalOpen(false)}
              clients={clients}
              services={services}
              teamMembers={teamMembers}
              tags={tags}
              // Map existing recurring task to NewTaskForm expectation
              // Support both old field names (frequency, interval) and new unified names (recurrence_frequency, recurrence_interval)
              task={editingTask ? {
                ...editingTask,
                service_id: editingTask.service_id || service.id || '',
                checklist: editingTask.checklist || { enabled: false, items: [] },
                is_recurring: true,
                recurrence_frequency: editingTask.recurrence_frequency || editingTask.frequency,
                recurrence_interval: editingTask.recurrence_interval !== undefined ? editingTask.recurrence_interval : (editingTask.interval !== undefined ? editingTask.interval : 1),
                recurrence_start_date: editingTask.recurrence_start_date || editingTask.start_date,
                recurrence_end_date: editingTask.recurrence_end_date || editingTask.end_date,
                recurrence_day_of_week: editingTask.recurrence_day_of_week !== undefined ? editingTask.recurrence_day_of_week : editingTask.day_of_week,
                recurrence_day_of_month: editingTask.recurrence_day_of_month !== undefined ? editingTask.recurrence_day_of_month : editingTask.day_of_month,
                recurrence_week_of_month: editingTask.recurrence_week_of_month !== undefined ? editingTask.recurrence_week_of_month : editingTask.week_of_month,
                due_date_offset: editingTask.due_date_offset !== undefined ? editingTask.due_date_offset : 0,
                target_date_offset: editingTask.target_date_offset !== undefined ? editingTask.target_date_offset : null
              } : null}
              isRecurringOnly={true}
              fixedServiceId={service.id}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecurringTaskTab;
