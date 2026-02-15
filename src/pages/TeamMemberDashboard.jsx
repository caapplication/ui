import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Users, CheckCircle2, Calendar, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { listEntities, listRecurringTasks } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const StatCard = ({ title, value, icon }) => (
  <Card className="glass-card card-hover">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">{value}</div>
    </CardContent>
  </Card>
);

const TeamMemberDashboard = () => {
  const [assignedClients, setAssignedClients] = useState([]);
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [selectedClient, setSelectedClient] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.access_token) return;
      setIsLoading(true);
      try {
        // Fetch assigned entities and recurring tasks in parallel
        // For CA_TEAM users, listEntities() now filters by EntityUser table on the backend
        // Pass null for organization_id to get ALL entities across ALL organizations
        const [entitiesResponse, tasksResponse] = await Promise.all([
          listEntities(null, user.access_token),
          listRecurringTasks(user.agency_id, user.access_token, true, 1, 1000)
        ]);

        console.log('=== TEAM MEMBER DASHBOARD DEBUG ===');
        console.log('Entities Response:', entitiesResponse);
        console.log('Tasks Response:', tasksResponse);

        // Handle entities response (should be array of entities assigned via EntityUser)
        const myEntities = Array.isArray(entitiesResponse) ? entitiesResponse : [];

        // Map entities to client format for UI compatibility
        const clientsFromEntities = myEntities.map(entity => ({
          client_id: entity.id,
          client_name: entity.name,
          organization_id: entity.organization_id,
          organization_name: entity.organization_name
        }));

        console.log('My Assigned Entities:', clientsFromEntities);
        setAssignedClients(clientsFromEntities);

        // Filter tasks assigned to this user
        const allTasks = tasksResponse?.items || tasksResponse?.data || [];
        console.log('All tasks from API:', allTasks.length);

        const myTasks = allTasks.filter(task => {
          const isAssigned = task.assigned_to === user.id;
          if (!isAssigned && allTasks.length < 10) {
            console.log('Task', task.title, 'assigned_to:', task.assigned_to, 'user.id:', user.id, 'match:', isAssigned);
          }
          return isAssigned;
        });

        console.log('Filtered My Tasks:', myTasks.length, 'tasks');
        setRecurringTasks(myTasks);
      } catch (error) {
        console.error('Error fetching team member data:', error);
        toast({
          title: 'Error',
          description: `Failed to fetch dashboard data: ${error.message}`,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  // Filter tasks by selected client
  const filteredTasks = selectedClient === 'all'
    ? recurringTasks
    : recurringTasks.filter(task => task.client_id === selectedClient);

  const getFrequencyDisplay = (task) => {
    if (task.frequency === 'daily') return 'Daily';
    if (task.frequency === 'weekly') return `Weekly (${task.day_of_week || 'Sun'})`;
    if (task.frequency === 'monthly') return `Monthly (Day ${task.day_of_month || 1})`;
    if (task.frequency === 'yearly') return 'Yearly';
    return task.frequency;
  };

  const handleClientClick = (clientId) => {
    navigate(`/clients/${clientId}`);
  };

  const handleTaskClick = (taskId) => {
    navigate(`/tasks/recurring/${taskId}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-8"
    >
      <div className="mb-8">
        <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2">My Dashboard</h1>
        <p className="text-gray-400">Welcome back, {user?.first_name || user?.name || 'User'}</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard
          title="Assigned Clients"
          value={assignedClients.length}
          icon={<Building2 className="w-4 h-4 text-blue-400" />}
        />
        <StatCard
          title="Active Recurring Tasks"
          value={recurringTasks.length}
          icon={<Calendar className="w-4 h-4 text-green-400" />}
        />
        <StatCard
          title="Tasks This Week"
          value={recurringTasks.filter(t => t.frequency === 'weekly').length}
          icon={<CheckCircle2 className="w-4 h-4 text-purple-400" />}
        />
      </div>

      {/* Assigned Clients Section */}
      <Card className="glass-card mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            My Assigned Clients ({assignedClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedClients.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              No clients assigned to you yet.
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(
                assignedClients.reduce((acc, client) => {
                  const orgName = client.organization_name || 'Other Organizations';
                  if (!acc[orgName]) acc[orgName] = [];
                  acc[orgName].push(client);
                  return acc;
                }, {})
              ).map(([orgName, clients]) => (
                <div key={orgName}>
                  <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {orgName}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {clients.map((assignment) => (
                      <Card
                        key={assignment.client_id}
                        className="glass-card card-hover cursor-pointer border-white/5"
                        onClick={() => handleClientClick(assignment.client_id)}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="text-white font-semibold text-lg mb-1">
                                {assignment.client_name || 'Unknown Client'}
                              </h3>
                              {/* Organization name is now in header, so optional here, but keeping for clarity if mixed */}
                            </div>
                          </div>
                          {assignment.client_pan && (
                            <p className="text-gray-500 text-xs">PAN: {assignment.client_pan}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring Tasks Section */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              My Recurring Tasks ({filteredTasks.length})
            </CardTitle>
            <div className="w-full md:w-[250px]">
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {assignedClients.map((assignment) => (
                    <SelectItem key={assignment.client_id} value={assignment.client_id}>
                      {assignment.client_name || 'Unknown Client'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              {selectedClient === 'all'
                ? 'No recurring tasks assigned to you yet.'
                : 'No recurring tasks for this client.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-gray-400">Task</TableHead>
                    <TableHead className="text-gray-400">Client</TableHead>
                    <TableHead className="text-gray-400">Service</TableHead>
                    <TableHead className="text-gray-400">Frequency</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => {
                    const client = assignedClients.find(c => c.client_id === task.client_id);
                    return (
                      <TableRow
                        key={task.id}
                        className="border-white/10 hover:bg-white/5 cursor-pointer"
                        onClick={() => handleTaskClick(task.id)}
                      >
                        <TableCell className="text-white font-medium">
                          {task.title}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {client?.client_name || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {task.service_name || '-'}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {getFrequencyDisplay(task)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={task.is_active ? 'default' : 'secondary'}
                            className={task.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}
                          >
                            {task.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TeamMemberDashboard;
