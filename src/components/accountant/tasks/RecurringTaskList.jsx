import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Calendar, Repeat, User, Building } from 'lucide-react';
import { format } from 'date-fns';
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

const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const RecurringTaskList = ({ recurringTasks, onEdit, onDelete }) => {
  const getFrequencyDescription = (task) => {
    let desc = `Every ${task.interval} ${FREQUENCY_LABELS[task.frequency]}`;
    
    if (task.frequency === 'weekly' && task.day_of_week !== null) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      desc += ` on ${days[task.day_of_week]}`;
    } else if (task.frequency === 'monthly') {
      if (task.day_of_month) {
        desc += ` on day ${task.day_of_month}`;
      } else if (task.week_of_month && task.day_of_week !== null) {
        const weeks = ['first', 'second', 'third', 'fourth'];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        desc = `${weeks[task.week_of_month - 1]} ${days[task.day_of_week]} of every ${task.interval} month(s)`;
      }
    }
    
    return desc;
  };

  if (recurringTasks.length === 0) {
    return (
      <Card className="glass-pane rounded-2xl border border-white/10">
        <CardContent className="py-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Repeat className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white mb-2">No recurring tasks found</p>
              <p className="text-gray-400">Create your first recurring task to get started!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {recurringTasks.map((task) => (
        <Card key={task.id} className="glass-pane rounded-2xl border border-white/10 hover:bg-white/5 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <CardTitle className="text-xl text-white">{task.title}</CardTitle>
                  <Badge 
                    variant={task.is_active ? 'default' : 'outline'}
                    className={task.is_active 
                      ? 'bg-green-500/20 text-green-300 border-green-500/50' 
                      : 'bg-gray-500/20 text-gray-300 border-gray-500/50'
                    }
                  >
                    {task.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {task.description && (
                  <p className="text-gray-400 text-sm mt-2">{task.description}</p>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(task)}
                  className="text-white hover:bg-white/10 hover:text-primary transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-pane border border-white/20">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Delete Recurring Task</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-300">
                        Are you sure you want to delete "{task.title}"? This will stop creating new tasks from this template, but will not delete existing tasks.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(task.id)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-300 bg-white/5 p-2 rounded-lg">
                <Repeat className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="truncate">{getFrequencyDescription(task)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 bg-white/5 p-2 rounded-lg">
                <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="truncate">
                  Starts: {format(new Date(task.start_date), 'MMM dd, yyyy')}
                  {task.end_date && ` - Ends: ${format(new Date(task.end_date), 'MMM dd, yyyy')}`}
                </span>
              </div>
              {task.due_date_offset !== 0 && (
                <div className="flex items-center gap-2 text-gray-300 bg-white/5 p-2 rounded-lg">
                  <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Due Date: +{task.due_date_offset} days</span>
                </div>
              )}
              {task.last_created_at && (
                <div className="flex items-center gap-2 text-gray-300 bg-white/5 p-2 rounded-lg">
                  <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Last created: {format(new Date(task.last_created_at), 'MMM dd, yyyy')}</span>
                </div>
              )}
              {task.client_id && (
                <div className="flex items-center gap-2 text-gray-300 bg-white/5 p-2 rounded-lg">
                  <Building className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Client: {task.client_name || 'N/A'}</span>
                </div>
              )}
              {task.assigned_to && (
                <div className="flex items-center gap-2 text-gray-300 bg-white/5 p-2 rounded-lg">
                  <User className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Assigned: {task.assigned_to_name || 'N/A'}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RecurringTaskList;

