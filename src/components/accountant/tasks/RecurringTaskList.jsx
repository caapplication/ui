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
      <Card className="glass-pane">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">No recurring tasks found. Create your first recurring task to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {recurringTasks.map((task) => (
        <Card key={task.id} className="glass-pane hover:bg-white/5 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-xl">{task.title}</CardTitle>
                  <Badge variant={task.is_active ? 'success' : 'outline'}>
                    {task.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {task.description && (
                  <p className="text-gray-400 text-sm mt-2">{task.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(task)}
                  className="text-white hover:bg-white/10"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-pane">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Recurring Task</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{task.title}"? This will stop creating new tasks from this template, but will not delete existing tasks.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(task.id)}
                        className="bg-red-600 hover:bg-red-700"
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
              <div className="flex items-center gap-2 text-gray-300">
                <Repeat className="w-4 h-4 text-primary" />
                <span>{getFrequencyDescription(task)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="w-4 h-4 text-primary" />
                <span>
                  Starts: {format(new Date(task.start_date), 'MMM dd, yyyy')}
                  {task.end_date && ` - Ends: ${format(new Date(task.end_date), 'MMM dd, yyyy')}`}
                </span>
              </div>
              {task.due_date_offset !== 0 && (
                <div className="flex items-center gap-2 text-gray-300">
                  <span>Due Date: +{task.due_date_offset} days</span>
                </div>
              )}
              {task.last_created_at && (
                <div className="flex items-center gap-2 text-gray-300">
                  <span>Last created: {format(new Date(task.last_created_at), 'MMM dd, yyyy')}</span>
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

