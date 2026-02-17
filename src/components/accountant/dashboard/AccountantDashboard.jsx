import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, UserCheck, Briefcase, Landmark, Building2, Banknote, ListTodo, Bell, FileWarning, Eye, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, ReferenceLine, LabelList } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import {
  listClients,
  listClientsByOrganization,
  listAllClientUsers,
  listTeamMembers,
  listServices,
  listAllEntities,
  listEntities,
  getCATeamInvoicesBulk,
  getCATeamVouchersBulk,
  listTasks,
  listRecurringTasks,
  getNotices,
  getClientBillingInvoices
} from '@/lib/api';
import { useOrganisation } from "@/hooks/useOrganisation";

const StatCard = ({ title, value, description, icon, color, delay, trend, meta, hideValue, suffix = "", onClick }) => {
  const Icon = icon;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}>
      <Card 
        className={`glass-card card-hover overflow-hidden h-full relative group rounded-3xl border-white/5 ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row gap-2 items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wider">
            {title}
          </CardTitle>
          <div className={`w-10 h-10 bg-gradient-to-r ${color} rounded-xl flex items-center justify-center shadow-lg shadow-black/20 shrink-0 group-hover:scale-110 transition-transform`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {!hideValue && (
            <div className="flex items-center gap-3 mb-1">
              <div className="text-2xl sm:text-3xl font-bold text-white">
                {suffix && <span className="text-xl mr-1">{suffix}</span>}
                {typeof value === 'number' ? value.toLocaleString() : value}
              </div>
              {trend && (
                <div className={`${trend.isBad ? 'text-red-500' : 'text-green-500'}`}>
                  {trend.isUp ? <TrendingUp className="w-5 h-5" /> : <TrendingUp className="w-5 h-5 rotate-180" />}
                </div>
              )}
            </div>
          )}
          {description && (
            <p className={`text-xs mt-1 ${trend ? (trend.isBad ? 'text-red-500' : 'text-green-500') : 'text-gray-400'}`}>
              {description}
            </p>
          )}
          {meta && (
            <div className={`${hideValue ? "mt-2" : "mt-4 pt-3 border-t border-white/10"} space-y-2 text-sm text-gray-400`}>
              {Object.entries(meta).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center text-xs">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="text-white font-medium">{val}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const DetailBlock = ({ title, subtitle, count, data, columns, onViewMore, delay, onRowClick, currentUserId }) => {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay }}>
      <Card className="glass-card flex flex-col h-full rounded-2xl border-white/5">
        <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
          <CardTitle className="text-lg font-bold text-white">{title}</CardTitle>
          {subtitle && <CardDescription className="text-gray-400 text-xs mt-0.5">{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className="p-4 sm:p-5 flex-1 flex flex-col">
          <div className="space-y-2 flex-1">
            <div className="grid grid-cols-12 text-[10px] text-gray-400 font-medium uppercase tracking-wider border-b border-white/10 pb-2 mb-2 pr-2">
              <div className="col-span-2">{columns[0]}</div>
              <div className="col-span-6">{columns[1]}</div>
              <div className="col-span-4 text-right">{columns[2]}</div>
            </div>
            <div className="min-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
              {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[320px] text-gray-500 text-xs italic">
                  No records found
                </div>
              ) : (
                data.slice(0, 8).map((row, idx) => {
                  // Only highlight if currentUserId is provided AND row matches
                  const isCurrentUser = currentUserId && (row.isCurrentUser || (row.id && String(row.id) === String(currentUserId)));
                  const sNo = row.sNo !== undefined ? row.sNo : (row.rank !== undefined ? row.rank : idx + 1);
                  
                  return (
                    <div
                      key={row.id || idx}
                      onClick={() => {
                        if (onRowClick && isCurrentUser) {
                          onRowClick(row);
                        }
                      }}
                      className={`grid grid-cols-12 items-center text-sm py-2 transition-all rounded px-1 group border-b border-white/5 last:border-0 ${
                        isCurrentUser 
                          ? 'bg-blue-500/20 hover:bg-blue-500/30 cursor-pointer border-blue-400/30' 
                          : 'hover:bg-white/5 cursor-default'
                      }`}
                    >
                      <div className={`col-span-2 font-mono text-xs ${isCurrentUser ? 'text-blue-300 font-bold' : 'text-gray-400'}`}>
                        {String(sNo).padStart(2, "0")}
                      </div>
                      <div className={`col-span-6 truncate pr-2 group-hover:scale-[1.01] transition-transform origin-left text-xs sm:text-sm ${
                        isCurrentUser ? 'text-blue-200 font-semibold' : 'text-white'
                      }`}>
                        {row.col1}
                      </div>
                      <div className={`col-span-4 text-right font-semibold text-xs sm:text-sm ${
                        isCurrentUser ? 'text-blue-200' : 'text-red-100'
                      }`}>
                        {typeof row.col2 === 'number' ? row.col2.toLocaleString() : row.col2}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="pt-3 mt-auto border-t border-white/5">
            <Button
              variant="ghost"
              className="w-full text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-xl group transition-all text-xs py-1.5 h-auto"
              onClick={onViewMore}
            >
              View more
              <TrendingUp className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};



const AccountantDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const {
    selectedOrg,
    selectedEntity,
    entities,
    organisationId,
  } = useOrganisation();

  // State for the dashboard metrics
  const [stats, setStats] = useState({
    myClients: 0,
    clientUsers: 0,
    myTeam: 0,
    services: 0,
    revenue: 0,
    due: 0
  });

  const [chartData, setChartData] = useState([]);
  const [averageActivity, setAverageActivity] = useState(0);

  const [detailBlocks, setDetailBlocks] = useState({
    todayProgress: [],
    pendingVerification: [],
    ongoingTasks: [],
    ongoingNotices: []
  });

  const fetchDashboardStats = useCallback(async () => {
    if (!user?.access_token) return;

    setIsLoading(true);
    try {
      const token = user.access_token;
      const agencyId = user.agency_id;

      // Determine Entity IDs based on context
      let entityIds = [];
      let relevantEntities = [];

      // For CA_TEAM: Only show entities assigned to this user via EntityUser table
      if (user.role === 'CA_TEAM') {
        const myEntities = await listEntities(null, token).catch(() => []);
        entityIds = myEntities.map(e => e.id);
        relevantEntities = myEntities;
      } else if (organisationId) {
        if (selectedEntity && selectedEntity !== 'all') {
          entityIds = [selectedEntity];
          relevantEntities = entities.filter(e => e.id === selectedEntity);
        } else if (entities && entities.length > 0) {
          entityIds = entities.map(e => e.id);
          relevantEntities = entities;
        }
      } else {
        // Fallback: If no org selected, fetch all entities for the user (global view)
        const allEntities = await listAllEntities(token).catch(() => []);
        entityIds = allEntities.map(e => e.id);
        relevantEntities = allEntities;
      }

      // 1. Fetch Summary Stats
      let clientsData = [];
      // For CA_TEAM: Use assigned entities as clients
      if (user.role === 'CA_TEAM') {
        clientsData = relevantEntities; // Already filtered to assigned entities
      } else if (user.organizations && user.organizations.length > 0) {
        clientsData = await Promise.all(
          user.organizations.map(org =>
            listClientsByOrganization(org.id, token).catch(() => [])
          )
        ).then(results => results.flat());
      } else if (agencyId) {
        clientsData = await listClients(agencyId, token).catch(() => []);
      }

      const [clientUsersData, teamData, servicesData] = await Promise.all([
        listAllClientUsers(token).catch(() => []),
        listTeamMembers(token).catch(() => []),
        listServices(agencyId, token).catch(() => [])
      ]);

      // 2. Fetch Historical Trend Data (Last 15 Days)
      const [invoices, vouchers, tasks, recurringTasksData, notices] = await Promise.all([
        entityIds.length > 0 ? getCATeamInvoicesBulk(entityIds, token).catch(() => []) : Promise.resolve([]),
        entityIds.length > 0 ? getCATeamVouchersBulk(entityIds, token).catch(() => []) : Promise.resolve([]),
        listTasks(agencyId, token).catch(() => []),
        listRecurringTasks(agencyId, token, null, 1, 1000).catch(() => ({ items: [] })),
        getNotices(null, token).catch(() => [])
      ]);

      const regularTasks = Array.isArray(tasks) ? tasks : (tasks?.items || []);
      const recurringTasks = Array.isArray(recurringTasksData) ? recurringTasksData : (recurringTasksData?.items || []);
      const recurringTaskIds = new Set(recurringTasks.map(rt => String(rt.id)));
      const tasksList = [
        ...regularTasks.filter(t => !recurringTaskIds.has(String(t.id))),
        ...recurringTasks
      ];
      const noticesList = notices || [];

      // Filter tasks and notices by entityIds
      // Tasks use client_id (which maps to entity_id in the system)
      // For CA_TEAM: Filter tasks by assigned_to OR created_by (tasks they created or are assigned to)
      // For CA_ACCOUNTANT: Show all tasks for their entities
      let filteredTasks = tasksList.filter(t => {
        // Check if task belongs to any of our entities (tasks use client_id which is entity_id)
        const taskEntityId = t.entity_id || t.client_id;
        let matchesEntity = true;
        
        if (entityIds.length > 0 && taskEntityId) {
          // Check if task's entity/client matches any of our entities
          matchesEntity = entityIds.includes(taskEntityId) || 
                         entityIds.some(eId => String(eId) === String(taskEntityId)) ||
                         entityIds.some(eId => String(eId).toLowerCase() === String(taskEntityId).toLowerCase());
        }
        // When task has no entity_id/client_id, include it (e.g. recurring tasks or unassigned)
        
        // For CA_TEAM: Also check if task is assigned to or created by this user
        if (user.role === 'CA_TEAM') {
          const taskUserId = t.assigned_to || t.created_by;
          const matchesUser = taskUserId && (String(taskUserId) === String(user.id));
          return matchesEntity && matchesUser;
        }
        
        return matchesEntity;
      });
      
      // Debug: Log task filtering results
      console.log('DEBUG Task filtering:', {
        totalTasks: tasksList.length,
        filteredTasks: filteredTasks.length,
        entityIds: entityIds,
        userRole: user.role,
        sampleTasks: tasksList.slice(0, 2).map(t => ({
          id: t.id,
          title: t.title,
          client_id: t.client_id,
          entity_id: t.entity_id,
          created_by: t.created_by,
          assigned_to: t.assigned_to,
          created_at: t.created_at
        }))
      });
      
      const filteredNotices = noticesList.filter(n => {
        const noticeEntityId = n.entity_id || n.client_id;
        return entityIds.length === 0 || entityIds.includes(noticeEntityId) || entityIds.some(eId => String(eId) === String(noticeEntityId));
      });

      // Compute Revenue & Due from current month billing invoices
      let totalRevenue = 0;
      let totalDue = 0;
      
      try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // Get all clients for this CA
        const allClients = Array.isArray(clientsData) ? clientsData : (clientsData?.results || []);
        
        // Fetch invoices for all clients and calculate current month totals
        for (const client of allClients) {
          try {
            const invoices = await getClientBillingInvoices(client.id, agencyId, token);
            if (Array.isArray(invoices)) {
              for (const invoice of invoices) {
                const invoiceDate = new Date(invoice.invoice_date);
                // Check if invoice is from current month
                if (invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear) {
                  const amount = parseFloat(invoice.invoice_amount || 0);
                  totalRevenue += amount;
                  
                  // Add to due if status is due or overdue
                  if (invoice.status === 'due' || invoice.status === 'overdue') {
                    totalDue += amount;
                  }
                }
              }
            }
          } catch (error) {
            console.warn(`Error fetching invoices for client ${client.id}:`, error);
          }
        }
      } catch (error) {
        console.error('Error calculating Revenue & Due:', error);
      }

      setStats({
        myClients: Array.isArray(clientsData) ? clientsData.length : (clientsData?.results?.length || 0),
        clientUsers: Array.isArray(clientUsersData) ? clientUsersData.length : 0,
        myTeam: Array.isArray(teamData) ? teamData.length : 0,
        services: Array.isArray(servicesData) ? servicesData.length : 0,
        revenue: totalRevenue,
        due: totalDue
      });

      // Process Trend Data
      const last15Days = [];
      for (let i = 14; i >= 0; i--) {
        const date = subDays(startOfDay(new Date()), i);
        last15Days.push({
          date,
          name: format(date, 'MMM dd'),
          tasks: 0,
          vouchers: 0,
          invoices: 0,
          notices: 0,
          total: 0
        });
      }

      const processItems = (items, key, dateKey = 'created_at', filterByUser = false) => {
        items.forEach(item => {
          // For CA_TEAM: Only process items created by or assigned to the logged-in user
          if (filterByUser && user.role === 'CA_TEAM') {
            // Tasks: check created_by OR assigned_to
            // Other items: check owner_id or created_by
            let userId = null;
            if (item.title) {
              // Task: check if created by OR assigned to user
              userId = item.created_by || item.assigned_to;
            } else {
              // Voucher, Invoice, Notice: check owner_id or created_by
              userId = item.owner_id || item.created_by || item.created_by_id;
            }
            
            if (!userId || String(userId) !== String(user.id)) {
              return;
            }
          }
          
          const rawDate = item[dateKey] || item.created_at || item.created_date || item.date;
          if (!rawDate) return;
          
          try {
            const itemDate = startOfDay(new Date(rawDate));
            const day = last15Days.find(d => d.date.getTime() === itemDate.getTime());
            if (day) {
              day[key]++;
              day.total++;
            }
          } catch (e) {
            // Skip items with invalid dates
            return;
          }
        });
      };

      // For CA_TEAM: Only show activities by the logged-in user
      const shouldFilterByUser = user.role === 'CA_TEAM';
      
      // For activity trend, show all activities (not just pending) for CA_TEAM
      // For CA_ACCOUNTANT, keep the original behavior (pending only for vouchers/invoices)
      if (shouldFilterByUser) {
        processItems(filteredTasks, 'tasks', 'created_at', true);
        processItems(vouchers, 'vouchers', 'date', true);
        processItems(invoices, 'invoices', 'date', true);
        processItems(filteredNotices, 'notices', 'created_at', true);
      } else {
        processItems(filteredTasks, 'tasks', 'created_at', false);
        processItems(vouchers.filter(v => v.status === 'pending_ca_approval'), 'vouchers', 'date', false);
        processItems(invoices.filter(i => i.status === 'pending_ca_approval'), 'invoices', 'date', false);
        processItems(filteredNotices, 'notices', 'created_at', false);
      }

      setChartData(last15Days);
      const totalActivity = last15Days.reduce((sum, day) => sum + day.total, 0);
      setAverageActivity(totalActivity / 15);

      // 3. Process Detail Blocks
      const entityMap = relevantEntities.reduce((acc, e) => ({ ...acc, [e.id]: e.name, [String(e.id)]: e.name }), {});
      const teamMap = teamData.reduce((acc, t) => ({ ...acc, [t.user_id || t.id]: t.full_name || t.name || 'Unknown' }), {});
      const today = startOfDay(new Date());

      const getEntityCounts = (items, filterFn = () => true) => {
        const counts = items.filter(filterFn).reduce((acc, item) => {
          const eId = item.entity_id || item.client_id || item.entity;
          if (eId && eId !== 'undefined' && eId !== 'null') {
            acc[eId] = (acc[eId] || 0) + 1;
          }
          return acc;
        }, {});
        return Object.entries(counts)
          .map(([id, count]) => ({ col1: entityMap[id] || `Entity ${id}`, col2: count }))
          .sort((a, b) => b.col2 - a.col2);
      };


      const getTodayUserProgress = () => {
        const today = startOfDay(new Date());
        const currentUserIdStr = String(user.id).toLowerCase().trim();
        
        // Get all CA_ACCOUNTANT and CA_TEAM members from teamData
        // teamData structure: { id, name, email, role, ... } - API returns 'id' not 'user_id'
        // Filter out invited users (they have id: null)
        const allTeamMembers = teamData.filter(m => {
          if (!m.id) return false; // Filter out invited users
          const memberRole = m.role;
          return memberRole === 'CA_ACCOUNTANT' || memberRole === 'CA_TEAM';
        });
        
        // Remove duplicates FIRST using Map with normalized IDs
        const uniqueMembersMap = new Map();
        for (const member of allTeamMembers) {
          const memberId = String(member.id).toLowerCase().trim();
          if (!uniqueMembersMap.has(memberId)) {
            uniqueMembersMap.set(memberId, {
              ...member,
              normalizedId: memberId
            });
          }
        }
        
        // Check if current user is already in the unique list
        const currentUserInTeam = uniqueMembersMap.has(currentUserIdStr);
        
        // Also include the current user if they're CA_ACCOUNTANT or CA_TEAM and not in teamData
        if (!currentUserInTeam && (user.role === 'CA_ACCOUNTANT' || user.role === 'CA_TEAM')) {
          uniqueMembersMap.set(currentUserIdStr, {
            id: user.id,
            name: user.name,
            full_name: user.full_name || user.name,
            email: user.email,
            role: user.role,
            normalizedId: currentUserIdStr
          });
        }
        
        const uniqueMembers = Array.from(uniqueMembersMap.values());
        
        // Get all items (not filtered by status for today's count)
        const allItems = [
          ...filteredTasks,
          ...vouchers,
          ...invoices,
          ...filteredNotices
        ];
        
        // Debug: Log all relevant data
        console.log('DEBUG getTodayUserProgress:', {
          filteredTasksCount: filteredTasks.length,
          vouchersCount: vouchers.length,
          invoicesCount: invoices.length,
          noticesCount: filteredNotices.length,
          allItemsCount: allItems.length,
          today: today.toISOString(),
          currentUserId: currentUserIdStr,
          uniqueMembersCount: uniqueMembers.length,
          entityIds: entityIds
        });
        
        // Debug: Log sample tasks
        if (filteredTasks.length > 0) {
          console.log('DEBUG Today Progress - Sample filtered tasks:', filteredTasks.slice(0, 3).map(t => ({
            id: t.id,
            title: t.title,
            created_by: t.created_by,
            assigned_to: t.assigned_to,
            created_at: t.created_at,
            client_id: t.client_id,
            entity_id: t.entity_id,
            hasTitle: !!t.title
          })));
        }
        
        // Count activities for each team member
        const memberCounts = uniqueMembers.map(member => {
          const memberId = (member.normalizedId || String(member.id)).toLowerCase().trim();
          const memberName = member.full_name || member.name || 'Unknown';
          
          const todayItems = allItems.filter(item => {
            // Check if item is from today - use multiple date fields
            const dateStr = item.date || item.created_at || item.created_date || item.timestamp;
            if (!dateStr) {
              return false;
            }
            
            try {
              // Parse date and compare only the date part (ignore time)
              const itemDate = startOfDay(new Date(dateStr));
              if (itemDate.getTime() !== today.getTime()) {
                return false;
              }
            } catch (e) {
              return false;
            }
            
            // Check if item belongs to this member
            // For tasks: count if member is creator (created_by) OR assignee (assigned_to)
            // For vouchers/invoices: use owner_id or created_by
            // For notices: use created_by or owner_id
            let userId = null;
            
            // Tasks have title field, use created_by or assigned_to
            if (item.title) {
              // Task: count if created by OR assigned to this member
              userId = item.created_by || item.assigned_to;
            } else {
              // Voucher, Invoice, or Notice: use owner_id or created_by
              userId = item.owner_id || item.created_by || item.created_by_id;
            }
            
            if (!userId) {
              return false;
            }
            
            // Normalize both IDs to lowercase strings for comparison
            const normalizedUserId = String(userId).toLowerCase().trim();
            const matches = normalizedUserId === memberId;
            
            // Debug for current user's items
            if (memberId === currentUserIdStr) {
              const isTask = !!item.title;
              if (isTask || matches) {
                console.log('DEBUG Today Progress - Item check for', memberName, {
                  type: isTask ? 'task' : (item.voucher_id ? 'voucher' : (item.bill_number ? 'invoice' : 'notice')),
                  title: item.title || item.voucher_id || item.bill_number,
                  dateStr: dateStr,
                  userId: normalizedUserId,
                  memberId: memberId,
                  matches: matches,
                  created_by: item.created_by,
                  assigned_to: item.assigned_to,
                  owner_id: item.owner_id
                });
              }
            }
            
            return matches;
          });
          
          return {
            id: memberId,
            col1: memberName,
            col2: todayItems.length,
            isCurrentUser: memberId === currentUserIdStr
          };
        });
        
        // Final deduplication - remove any duplicates by ID
        const finalDeduplicationMap = new Map();
        for (const member of memberCounts) {
          if (!finalDeduplicationMap.has(member.id)) {
            finalDeduplicationMap.set(member.id, member);
          }
        }
        const deduplicatedCounts = Array.from(finalDeduplicationMap.values());
        
        // Sort by activity count (descending)
        const sortedByCount = [...deduplicatedCounts].sort((a, b) => b.col2 - a.col2);
        
        // Re-arrange: current user first, then others by rank
        const currentUser = sortedByCount.find(item => item.isCurrentUser);
        const others = sortedByCount.filter(item => !item.isCurrentUser);
        
        const finalList = currentUser ? [currentUser, ...others] : others;
        
        // Assign S.No based on actual rank, but show current user first
        return finalList.map((item) => {
          const actualRank = sortedByCount.findIndex(i => i.id === item.id) + 1;
          return {
            ...item,
            rank: actualRank,
            sNo: actualRank
          };
        });
      };

      // Pending verification: invoices + vouchers awaiting CA approval
      const pendingItems = [
        ...invoices.filter(i => i.status === 'pending_ca_approval'),
        ...vouchers.filter(v => v.status === 'pending_ca_approval')
      ];

      setDetailBlocks({
        todayProgress: getTodayUserProgress(),
        pendingVerification: getEntityCounts(pendingItems),
        ongoingTasks: getEntityCounts(filteredTasks, t => t.status !== 'completed'),
        ongoingNotices: getEntityCounts(filteredNotices, n => n.status !== 'closed')
      });

    } catch (error) {
      console.error("Error fetching dashboard statistics:", error);
      toast({
        title: "Error",
        description: "Failed to load latest dashboard statistics.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 lg:mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
          Welcome, {user?.full_name || user?.name || 'Accountant'}
        </h1>
        <p className="text-gray-400 mt-1">Real-time overview of your consultancy activity.</p>
      </motion.div>

      {/* Row 1: 6 Metric Cards - Only show for CA_ACCOUNTANT, not CA_TEAM */}
      {user?.role === 'CA_ACCOUNTANT' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-4 lg:gap-4 mb-6 lg:mb-8">
          <StatCard
            title="MY CLIENTS"
            value={stats.myClients}
            icon={Building2}
            color="from-blue-500 to-indigo-600"
            delay={0.1}
          />
          <StatCard
            title="CLIENT USERS"
            value={stats.clientUsers}
            icon={Users}
            color="from-sky-400 to-blue-500"
            delay={0.15}
          />
          <StatCard
            title="MY TEAM"
            value={stats.myTeam}
            icon={UserCheck}
            color="from-violet-500 to-purple-600"
            delay={0.2}
          />
          <StatCard
            title="SERVICES"
            value={stats.services}
            icon={Briefcase}
            color="from-indigo-500 to-blue-600"
            delay={0.25}
          />
          <StatCard
            title="REVENUE"
            value={stats.revenue}
            suffix="₹"
            icon={Banknote}
            color="from-blue-600 to-indigo-700"
            delay={0.3}
            onClick={() => navigate('/clients-bill')}
          />
          <StatCard
            title="DUE"
            value={stats.due}
            suffix="₹"
            icon={Clock}
            color="from-slate-600 to-gray-700"
            delay={0.35}
            onClick={() => navigate('/clients-bill')}
          />
        </div>
      )}

      {/* Row 2: Chart Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mb-6">
        <Card className="glass-card overflow-hidden border-white/5 rounded-3xl">
          <CardHeader className="p-4 sm:px-6 py-3 pb-0">
            <CardTitle className="text-lg font-bold">Activity Trend</CardTitle>
            <CardDescription className="text-xs">Daily items processed (Invoices + Vouchers + Tasks)</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] px-4 sm:px-4 pt-2 pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ fontSize: '12px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', top: -10, right: 10 }}
                />
                {averageActivity > 0 && (
                  <ReferenceLine
                    y={averageActivity}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                  />
                )}
                <Bar dataKey="tasks" stackId="a" fill="#3b82f6" fillOpacity={0.9} radius={[4, 4, 0, 0]} barSize={32} maxBarSize={40} name="Tasks" />
                <Bar dataKey="vouchers" stackId="a" fill="#22c55e" fillOpacity={0.9} radius={[4, 4, 0, 0]} barSize={32} maxBarSize={40} name="Vouchers" />
                <Bar dataKey="invoices" stackId="a" fill="#eab308" fillOpacity={0.9} radius={[4, 4, 0, 0]} barSize={32} maxBarSize={40} name="Invoices" />
                <Bar dataKey="notices" stackId="a" fill="#ef4444" fillOpacity={0.9} radius={[4, 4, 0, 0]} barSize={32} maxBarSize={40} name="Notices">
                  <LabelList
                    dataKey="total"
                    position="top"
                    style={{ fill: '#9ca3af', fontSize: '10px' }}
                    formatter={(val) => val > 0 ? val : ''}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 3: 4 Detail Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pb-6">
        <DetailBlock
          title="Today's Progress"
          subtitle="Leaderboard of today's activities"
          count={detailBlocks.todayProgress.reduce((acc, curr) => acc + curr.col2, 0)}
          data={detailBlocks.todayProgress}
          columns={['S.No', 'Team Member', 'Items']}
          onViewMore={() => navigate('/dashboard/today-progress')}
          onRowClick={(row) => {
            // Only allow viewing own activities
            if (row.isCurrentUser || row.id === user.id) {
              navigate('/dashboard/today-progress', { state: { userId: user.id } });
            }
          }}
          currentUserId={user.id}
          delay={0.7}
        />
        <DetailBlock
          title="Pending Verification"
          subtitle="Items awaiting your approval"
          count={detailBlocks.pendingVerification.reduce((acc, curr) => acc + curr.col2, 0)}
          data={detailBlocks.pendingVerification}
          columns={['S.No', 'Entity', 'Pending']}
          onViewMore={() => navigate('/dashboard/pending-verification')}
          delay={0.8}
        />
        <DetailBlock
          title="Ongoing Tasks"
          subtitle="Open and active tasks"
          count={detailBlocks.ongoingTasks.reduce((acc, curr) => acc + curr.col2, 0)}
          data={detailBlocks.ongoingTasks}
          columns={['S.No', 'Entity', 'Tasks']}
          onViewMore={() => navigate('/dashboard/ongoing-tasks')}
          delay={0.9}
        />
        <DetailBlock
          title="Ongoing Notices"
          subtitle="Pending and active notices"
          count={detailBlocks.ongoingNotices.reduce((acc, curr) => acc + curr.col2, 0)}
          data={detailBlocks.ongoingNotices}
          columns={['S.No', 'Entity', 'Notices']}
          onViewMore={() => navigate('/dashboard/ongoing-notices')}
          delay={1.0}
        />
      </div>
    </div >
  );
};

export default AccountantDashboard;
