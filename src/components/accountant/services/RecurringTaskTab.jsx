import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NewRecurringTaskForm from '@/components/accountant/tasks/NewRecurringTaskForm.jsx';
import RecurringTaskList from '@/components/accountant/tasks/RecurringTaskList.jsx';
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
  getTags
} from '@/lib/api';

const RecurringTaskTab = ({ service, onUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
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
        listRecurringTasks(user.agency_id, user.access_token, null, 1, 100, service.id) // Filter by service_id
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

  const handleCreate = async (taskData) => {
    try {
      const finalTaskData = { ...taskData, service_id: service.id };
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

  const handleUpdate = async (taskData) => {
    try {
      if (!editingTask) return;
      const finalTaskData = { ...taskData, service_id: service.id };
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


  if (isLoading && recurringTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">Recurring Tasks for {service.name}</h3>
          <Button onClick={openNewTaskModal} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Create Recurring Task
          </Button>
        </div>
        <RecurringTaskList
          recurringTasks={recurringTasks}
          onEdit={openEditTaskModal}
          onDelete={handleDelete}
          isLoading={isLoading}
          clients={clients}
          teamMembers={teamMembers}
        />
      </div>

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
            <NewRecurringTaskForm
              onSave={editingTask ? handleUpdate : handleCreate}
              onCancel={() => setIsModalOpen(false)}
              clients={clients}
              services={services}
              teamMembers={teamMembers}
              tags={tags}
              recurringTask={editingTask}
              fixedServiceId={service.id}
              isEmbedded={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecurringTaskTab;
