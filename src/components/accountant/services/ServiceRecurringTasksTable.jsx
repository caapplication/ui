import React from "react";
import { format } from "date-fns";
import { Repeat, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const getFrequencyDescription = (task) => {
  if (!task?.frequency || !task?.interval) return "N/A";
  let desc = `Every ${task.interval} ${FREQUENCY_LABELS[task.frequency] || task.frequency}`;

  if (task.frequency === "weekly" && task.day_of_week !== null && task.day_of_week !== undefined) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    desc += ` on ${days[task.day_of_week] || ""}`.trimEnd();
  } else if (task.frequency === "monthly") {
    if (task.day_of_month) {
      desc += ` on day ${task.day_of_month}`;
    } else if (task.week_of_month && task.day_of_week !== null && task.day_of_week !== undefined) {
      const weeks = ["first", "second", "third", "fourth"];
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      desc = `${weeks[task.week_of_month - 1] || ""} ${days[task.day_of_week] || ""} of every ${task.interval} month(s)`.trim();
    }
  }

  return desc;
};

const getUserName = (userId, teamMembers = []) => {
  if (!userId) return "N/A";
  const id = String(userId).toLowerCase();
  const member = (teamMembers || []).find((m) => {
    const mUserId = m?.user_id ? String(m.user_id).toLowerCase() : "";
    const mId = m?.id ? String(m.id).toLowerCase() : "";
    return mUserId === id || mId === id;
  });
  return member?.name || member?.full_name || member?.email || "N/A";
};

const formatOffset = (days) => {
  if (days === null || days === undefined || days === "") return "N/A";
  const n = Number(days);
  if (Number.isNaN(n)) return "N/A";
  if (n === 0) return "Same day";
  return `${n} day${Math.abs(n) === 1 ? "" : "s"}`;
};

const ServiceRecurringTasksTable = ({ recurringTasks = [], teamMembers = [], onEdit, onDelete }) => {
  return (
    <div className="glass-pane rounded-lg overflow-hidden border border-white/10">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="text-white">TASK DETAILS</TableHead>
              <TableHead className="hidden md:table-cell text-white">CREATED BY</TableHead>
              <TableHead className="hidden lg:table-cell text-white">RECURRING DETAILS</TableHead>
              <TableHead className="text-white">DUE DETAILS</TableHead>
              <TableHead className="text-right text-white">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recurringTasks.map((task) => (
              <TableRow key={task.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <TableCell className="align-top">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-white text-base">{task.title}</span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        {getFrequencyDescription(task)}
                      </span>
                      {task.start_date && (
                        <Badge variant="outline" className="bg-white/5 text-gray-200 border-white/10">
                          Start: {format(new Date(task.start_date), "dd MMM yyyy")}
                        </Badge>
                      )}
                      <Badge
                        variant={task.is_active ? "default" : "outline"}
                        className={
                          task.is_active
                            ? "bg-green-500/20 text-green-300 border-green-500/50"
                            : "bg-gray-500/20 text-gray-300 border-gray-500/50"
                        }
                      >
                        {task.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="hidden md:table-cell align-top">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-white">{getUserName(task.created_by, teamMembers)}</span>
                    {task.created_at && (
                      <span className="text-xs text-gray-400 italic">
                        {format(new Date(task.created_at), "dd-MM-yyyy hh:mm a")}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="hidden lg:table-cell align-top text-gray-300">
                  <div className="flex flex-col gap-1">
                    <span>{getFrequencyDescription(task)}</span>
                    {task.start_date && (
                      <span className="text-xs text-gray-400">
                        Starts on {format(new Date(task.start_date), "dd MMM yyyy")}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="align-top">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-white">Due: {formatOffset(task.due_date_offset)}</span>
                    <span className="text-xs text-gray-400">Target: {formatOffset(task.target_date_offset)}</span>
                  </div>
                </TableCell>

                <TableCell className="text-right align-top">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit?.(task)}
                      className="text-gray-400 hover:text-white hover:bg-white/10"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-pane border border-white/20">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Delete Recurring Task</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-300">
                            Are you sure you want to delete "{task.title}"? This will stop creating new tasks from this template.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete?.(task.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ServiceRecurringTasksTable;

