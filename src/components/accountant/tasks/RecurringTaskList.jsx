import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Repeat, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const RecurringTaskList = ({ recurringTasks, onEdit, onDelete, isLoading = false, clients = [], teamMembers = [] }) => {
  const navigate = useNavigate();
  const getClientName = (clientId) => {
    if (!clientId) return 'N/A';
    if (!Array.isArray(clients)) return 'N/A';

    // Robust comparison
    const clientIdStr = String(clientId).toLowerCase();
    const client = clients.find(c => {
      if (!c) return false;
      const cId = c.id ? String(c.id).toLowerCase() : '';
      return cId === clientIdStr;
    });

    return client ? client.name : clientId.substring(0, 8) + '...';
  };

  const getUserInfo = (userId) => {
    if (!userId) return { name: 'N/A', role: 'N/A' };
    if (!Array.isArray(teamMembers)) return { name: 'N/A', role: 'N/A' };

    const userIdStr = String(userId).toLowerCase();
    const member = teamMembers.find(m => {
      const mUserId = m.user_id ? String(m.user_id).toLowerCase() : '';
      const mId = m.id ? String(m.id).toLowerCase() : '';
      return mUserId === userIdStr || mId === userIdStr;
    });

    return member ? { name: member.name || member.full_name || 'N/A', role: member.role || 'N/A' } : { name: 'N/A', role: 'N/A' };
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'N/A';
    }
  };

  const getDateBadgeColor = (dateString) => {
    if (!dateString) return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
      }
      const now = new Date();
      const diffMs = now - date;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      if (diffHours <= 24) {
        return 'bg-green-500/20 text-green-300 border-green-500/50'; // Green for within 24 hours
      } else if (diffDays <= 7) {
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'; // Yellow for 24h to 7 days
      } else {
        return 'bg-red-500/20 text-red-300 border-red-500/50'; // Red for more than 7 days
      }
    } catch {
      return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const getFrequencyDescription = (task) => {
    // Map unified task schema fields to expected format
    const frequency = task.recurrence_frequency || task.frequency;
    const interval = task.recurrence_interval || task.interval || 1;
    const dayOfWeek = task.recurrence_day_of_week !== undefined ? task.recurrence_day_of_week : task.day_of_week;
    const dayOfMonth = task.recurrence_day_of_month !== undefined ? task.recurrence_day_of_month : task.day_of_month;
    const weekOfMonth = task.recurrence_week_of_month !== undefined ? task.recurrence_week_of_month : task.week_of_month;
    
    if (!frequency) return 'N/A';
    
    let desc = `Every ${interval} ${FREQUENCY_LABELS[frequency] || frequency}`;

    if (frequency === 'weekly' && dayOfWeek !== null && dayOfWeek !== undefined) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      desc += ` on ${days[dayOfWeek]}`;
    } else if (frequency === 'monthly') {
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        desc += ` on day ${dayOfMonth}`;
      } else if (weekOfMonth !== null && weekOfMonth !== undefined && dayOfWeek !== null && dayOfWeek !== undefined) {
        const weeks = ['first', 'second', 'third', 'fourth'];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        desc = `${weeks[weekOfMonth - 1]} ${days[dayOfWeek]} of every ${interval} month(s)`;
      }
    }

    return desc;
  };

  if (isLoading) {
    return (
      <div className="glass-pane rounded-lg overflow-hidden border border-white/10">
        <div className="p-4 border-b border-white/10">
          <Skeleton className="h-8 w-full bg-white/5" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-12 w-1/4 bg-white/5" />
              <Skeleton className="h-12 w-1/6 bg-white/5" />
              <Skeleton className="h-12 w-1/6 bg-white/5" />
              <Skeleton className="h-12 w-1/6 bg-white/5" />
              <Skeleton className="h-12 w-1/6 bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recurringTasks.length === 0) {
    return (
      <div className="glass-pane rounded-lg overflow-hidden border border-white/10 p-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <Repeat className="w-8 h-8 text-primary" />
        </div>
        <p className="text-lg font-semibold text-white mb-2">No recurring tasks found</p>
        <p className="text-gray-400">Create your first recurring task to get started!</p>
      </div>
    );
  }

  return (
    <div className="glass-pane rounded-lg overflow-hidden border border-white/10">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="text-white">TASK DETAILS</TableHead>
              <TableHead className="hidden lg:table-cell text-white">LAST UPDATE BY</TableHead>
              <TableHead className="hidden md:table-cell text-white">CREATED BY</TableHead>
              <TableHead className="hidden lg:table-cell text-white">FREQUENCY</TableHead>
              <TableHead className="hidden xl:table-cell text-white">START DATE</TableHead>
              <TableHead className="hidden sm:table-cell text-white">ASSIGNED TO</TableHead>
              <TableHead className="text-white">STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recurringTasks.map((task) => {
              const createdByInfo = getUserInfo(task.created_by);
              const updatedByInfo = getUserInfo(task.updated_by || task.created_by);
              const assignedToInfo = getUserInfo(task.assigned_to);

              return (
                <TableRow 
                  key={task.id} 
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => navigate(`/tasks/recurring/${task.id}`)}
                >
                  {/* TASK DETAILS */}
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-white text-base">{task.title}</span>
                      {task.client_id && (
                        <span className="text-xs text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded w-fit">
                          Client: {getClientName(task.client_id)}
                        </span>
                      )}
                      {/* Mobile View: Show Frequency here if hidden on larger screens */}
                      <div className="lg:hidden text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        {getFrequencyDescription(task)}
                      </div>
                    </div>
                  </TableCell>

                  {/* LAST UPDATE BY */}
                  <TableCell className="hidden lg:table-cell align-top">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-white">{updatedByInfo.name}</span>
                      {task.updated_at && (() => {
                        try {
                          const date = new Date(task.updated_at);
                          if (isNaN(date.getTime())) return null;
                          return (
                            <>
                              <span className="text-xs text-gray-400 italic">
                                {format(date, 'dd-MM-yyyy hh:mm a')}
                              </span>
                              <Badge variant="outline" className={`${getDateBadgeColor(task.updated_at)} w-fit text-xs italic`}>
                                {formatTimeAgo(task.updated_at)}
                              </Badge>
                            </>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  </TableCell>

                  {/* CREATED BY */}
                  <TableCell className="hidden md:table-cell align-top">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-white">{createdByInfo.name}</span>
                      {task.created_at && (() => {
                        try {
                          const date = new Date(task.created_at);
                          if (isNaN(date.getTime())) return null;
                          return (
                            <>
                              <span className="text-xs text-gray-400 italic">
                                {format(date, 'dd-MM-yyyy hh:mm a')}
                              </span>
                              <Badge variant="outline" className={`${getDateBadgeColor(task.created_at)} text-xs w-fit italic`}>
                                {formatTimeAgo(task.created_at)}
                              </Badge>
                            </>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  </TableCell>

                  {/* FREQUENCY */}
                  <TableCell className="hidden lg:table-cell align-top">
                    <div className="flex items-center gap-2 text-gray-300">
                      <span>{getFrequencyDescription(task)}</span>
                    </div>
                  </TableCell>

                  {/* START DATE */}
                  <TableCell className="hidden xl:table-cell align-top">
                    <span className="text-white">
                      {(() => {
                        const startDate = task.recurrence_start_date || task.start_date;
                        if (!startDate) return 'N/A';
                        try {
                          const date = new Date(startDate);
                          if (isNaN(date.getTime())) return 'N/A';
                          return format(date, 'MMM dd, yyyy');
                        } catch {
                          return 'N/A';
                        }
                      })()}
                    </span>
                  </TableCell>

                  {/* ASSIGNED TO */}
                  <TableCell className="hidden sm:table-cell align-top">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-white">{assignedToInfo.name}</span>
                      {task.created_at && (() => {
                        try {
                          const date = new Date(task.created_at);
                          if (isNaN(date.getTime())) return null;
                          return (
                            <>
                              <span className="text-xs text-gray-400 italic">
                                {format(date, 'dd-MM-yyyy hh:mm a')}
                              </span>
                              <Badge variant="outline" className={`${getDateBadgeColor(task.created_at)} text-xs w-fit italic`}>
                                {formatTimeAgo(task.created_at)}
                              </Badge>
                            </>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  </TableCell>

                  {/* STATUS */}
                  <TableCell className="align-top">
                    <Badge
                      variant={(task.recurrence_is_active !== undefined ? task.recurrence_is_active : task.is_active) ? 'default' : 'outline'}
                      className={(task.recurrence_is_active !== undefined ? task.recurrence_is_active : task.is_active)
                        ? 'bg-green-500/20 text-green-300 border-green-500/50 hover:bg-green-500/30'
                        : 'bg-gray-500/20 text-gray-300 border-gray-500/50 hover:bg-gray-500/30'
                      }
                    >
                      {(task.recurrence_is_active !== undefined ? task.recurrence_is_active : task.is_active) ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RecurringTaskList;
