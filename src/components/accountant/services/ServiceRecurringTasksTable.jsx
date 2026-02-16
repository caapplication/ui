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
  // Support both old field names (frequency, interval) and new unified names (recurrence_frequency, recurrence_interval)
  const frequency = task?.recurrence_frequency || task?.frequency;
  const interval = task?.recurrence_interval !== undefined ? task.recurrence_interval : (task?.interval !== undefined ? task.interval : null);
  const dayOfWeek = task?.recurrence_day_of_week !== undefined ? task.recurrence_day_of_week : task?.day_of_week;
  const dayOfMonth = task?.recurrence_day_of_month !== undefined ? task.recurrence_day_of_month : task?.day_of_month;
  const weekOfMonth = task?.recurrence_week_of_month !== undefined ? task.recurrence_week_of_month : task?.week_of_month;
  
  if (!frequency || interval === null || interval === undefined) return "N/A";
  let desc = `Every ${interval} ${FREQUENCY_LABELS[frequency] || frequency}`;

  if (frequency === "weekly" && dayOfWeek !== null && dayOfWeek !== undefined) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    desc += ` on ${days[dayOfWeek] || ""}`.trimEnd();
  } else if (frequency === "monthly") {
    if (dayOfMonth !== null && dayOfMonth !== undefined) {
      desc += ` on day ${dayOfMonth}`;
    } else if (weekOfMonth !== null && weekOfMonth !== undefined && dayOfWeek !== null && dayOfWeek !== undefined) {
      const weeks = ["first", "second", "third", "fourth"];
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      desc = `${weeks[weekOfMonth - 1] || ""} ${days[dayOfWeek] || ""} of every ${interval} month(s)`.trim();
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

const ServiceRecurringTasksTable = ({ recurringTasks = [], teamMembers = [], onEdit, onDelete, onViewTask }) => {
  const handleRowClick = (e, taskId) => {
    // Don't trigger if clicking on action buttons
    if (e.target.closest('button') || e.target.closest('[role="button"]')) {
      return;
    }
    if (onViewTask) {
      onViewTask(taskId);
    }
  };

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {recurringTasks.map((task) => (
              <TableRow 
                key={task.id} 
                className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                onClick={(e) => handleRowClick(e, task.id)}
              >
                <TableCell className="align-top">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-white text-base">{task.title}</span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        {getFrequencyDescription(task)}
                      </span>
                      {(task.recurrence_start_date || task.start_date) && (() => {
                        const startDate = task.recurrence_start_date || task.start_date;
                        try {
                          const date = new Date(startDate);
                          if (!isNaN(date.getTime())) {
                            return (
                              <Badge variant="outline" className="bg-white/5 text-gray-200 border-white/10">
                                Start: {format(date, "dd MMM yyyy")}
                              </Badge>
                            );
                          }
                        } catch {}
                        return null;
                      })()}
                      <Badge
                        variant={(task.recurrence_is_active !== undefined ? task.recurrence_is_active : task.is_active) ? "default" : "outline"}
                        className={
                          (task.recurrence_is_active !== undefined ? task.recurrence_is_active : task.is_active)
                            ? "bg-green-500/20 text-green-300 border-green-500/50"
                            : "bg-gray-500/20 text-gray-300 border-gray-500/50"
                        }
                      >
                        {(task.recurrence_is_active !== undefined ? task.recurrence_is_active : task.is_active) ? "Active" : "Inactive"}
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
                    {(task.recurrence_start_date || task.start_date) && (() => {
                      const startDate = task.recurrence_start_date || task.start_date;
                      try {
                        const date = new Date(startDate);
                        if (!isNaN(date.getTime())) {
                          return (
                            <span className="text-xs text-gray-400">
                              Starts on {format(date, "dd MMM yyyy")}
                            </span>
                          );
                        }
                      } catch {}
                      return null;
                    })()}
                  </div>
                </TableCell>

                <TableCell className="align-top">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-white">Due: {formatOffset(task.due_date_offset)}</span>
                    <span className="text-xs text-gray-400">Target: {formatOffset(task.target_date_offset)}</span>
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

