import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';

const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#64748B', bg: '#F1F5F9' },
  { id: 'medium', label: 'Medium', color: '#A16207', bg: '#FEF9C3' },
  { id: 'high', label: 'High', color: '#EA580C', bg: '#FFEDD5' },
  { id: 'urgent', label: 'Urgent', color: '#DC2626', bg: '#FEE2E2' },
];

const STATUSES = [
  { id: 'pending', label: 'Pending', color: '#B45309', bg: '#FEF3C7' },
  { id: 'in_progress', label: 'In Progress', color: '#1D4ED8', bg: '#DBEAFE' },
  { id: 'completed', label: 'Completed', color: '#15803D', bg: '#DCFCE7' },
];

export default function TasksScreen({ user, onBackToChat, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pending', 'in_progress', 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  // User and permission state
  const [currentUser, setCurrentUser] = useState(user || null);
  const [assignableUsers, setAssignableUsers] = useState([]);

  // Task Creation Form Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createMode, setCreateMode] = useState('self'); // 'self' | 'assign'
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskStatus, setTaskStatus] = useState('pending');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [selectedAssigneeName, setSelectedAssigneeName] = useState('');

  // Task Edit Form Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState('pending');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editAssigneeName, setEditAssigneeName] = useState('');

  // Confirmation Modal State (For Create or Update)
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmActionType, setConfirmActionType] = useState('create'); // 'create' | 'update'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current user & assignable users on mount
  useEffect(() => {
    api.getMe().then((res) => {
      if (res.success && res.user) {
        setCurrentUser(res.user);
      }
    }).catch(() => {});

    api.fetchAssignableUsers().then((res) => {
      if (res.success && Array.isArray(res.users)) {
        setAssignableUsers(res.users);
      }
    }).catch(() => {});
  }, []);

  const effectiveUser = currentUser || user;
  const currentUserId = effectiveUser?.id || effectiveUser?.user_id || '';
  const currentUserName = effectiveUser?.name || effectiveUser?.email || 'Myself';
  const isUserAdmin = effectiveUser?.role === 'admin' || effectiveUser?.role === 'super_admin';

  // Only users who can manage subordinates or are admin have permission to assign to others
  const managedUsers = useMemo(() => {
    return assignableUsers.filter((u) => !u.is_self && u.id !== currentUserId);
  }, [assignableUsers, currentUserId]);

  const managedUserIds = useMemo(() => {
    return managedUsers.map((u) => u.id);
  }, [managedUsers]);

  const canAssignToOthers = isUserAdmin || managedUsers.length > 0;

  // Determine whether current user has permission to edit/delete a particular task
  const canEditTask = useCallback((task) => {
    if (!task) return false;
    if (isUserAdmin) return true;

    const taskAssigner = task.assigned_by || task.creator_id || task.created_by;
    const taskAssignee = task.assigned_to;

    const isAssignedByMe = Boolean(currentUserId && taskAssigner && taskAssigner === currentUserId);
    const isAssignedToMe = Boolean(currentUserId && taskAssignee && taskAssignee === currentUserId);

    // If task is assigned to me: strictly require that it was assigned by me to myself
    if (isAssignedToMe) {
      return isAssignedByMe;
    }

    // If task is assigned to another person: require that it was assigned by me and the person is in managed subordinates
    if (isAssignedByMe && Array.isArray(managedUserIds) && managedUserIds.includes(taskAssignee)) {
      return true;
    }

    return false;
  }, [isUserAdmin, currentUserId, managedUserIds]);

  // Load user's tasks
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.fetchTasks('my');
      if (res.success && Array.isArray(res.tasks)) {
        setTasks(res.tasks);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.warn('Failed to fetch tasks:', err);
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  // Filtered task list
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (activeFilter !== 'all') {
        const st = (t.status || 'pending').toLowerCase();
        if (st !== activeFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchCode = (t.code || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchAssignee = (t.assigned_to_name || '').toLowerCase().includes(q);
        return matchTitle || matchCode || matchDesc || matchAssignee;
      }
      return true;
    });
  }, [tasks, activeFilter, searchQuery]);

  // Quick Date Setter for Form
  const getQuickDueDate = (daysAhead) => {
    const d = new Date(Date.now() + daysAhead * 86400000);
    return d.toISOString().split('T')[0];
  };

  // ── Open Task Creation Modal ──
  const openCreateTask = () => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskPriority('medium');
    setTaskDueDate(getQuickDueDate(1));
    setTaskStatus('pending');
    setSelectedAssigneeId(currentUserId);
    setSelectedAssigneeName(currentUserName);
    setCreateModalVisible(true);
  };

  // ── On Clicking Submit in Create Modal: Trigger Confirmation Dialog ──
  const handleReviewCreateTask = () => {
    if (!taskTitle.trim()) {
      Alert.alert('Required', 'Please enter a task title.');
      return;
    }
    const assigneeId = (canAssignToOthers && selectedAssigneeId) ? selectedAssigneeId : currentUserId;
    if (!assigneeId) {
      Alert.alert('Required', 'Please select an assigned person.');
      return;
    }
    setConfirmActionType('create');
    setConfirmModalVisible(true);
  };

  // ── On Confirming Task Creation: Call Backend API ──
  const handleExecuteCreateTask = async () => {
    setIsSubmitting(true);
    const assigneeId = (canAssignToOthers && selectedAssigneeId) ? selectedAssigneeId : currentUserId;
    const payload = {
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      priority: taskPriority,
      due_date: taskDueDate || null,
      status: taskStatus,
      assigned_to: assigneeId,
    };

    const res = await api.createTask(payload);
    setIsSubmitting(false);

    if (res.success && res.task) {
      setConfirmModalVisible(false);
      setCreateModalVisible(false);
      await loadTasks();
      Alert.alert('Success', `Task "${res.task.title}" created successfully!`);
    } else {
      setConfirmModalVisible(false);
      if (res.status === 403 || (res.error && res.error.toLowerCase().includes('access denied'))) {
        Alert.alert('Access Denied', 'Access denied.');
      } else {
        Alert.alert('Error', res.error || 'Failed to create task.');
      }
    }
  };

  // ── Open Edit Task Modal ──
  const openEditTask = (task) => {
    if (!canEditTask(task)) {
      Alert.alert('Access Denied', 'You do not have permission to edit this task.');
      return;
    }
    setEditingTask(task);
    setEditTitle(task.title || '');
    setEditDescription(task.description || '');
    setEditPriority(task.priority || 'medium');
    setEditDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    setEditStatus(task.status || 'pending');
    setEditAssigneeId(task.assigned_to || currentUserId);
    setEditAssigneeName(task.assigned_to_name || currentUserName);
    setEditModalVisible(true);
  };

  // ── On Clicking Submit in Edit Modal: Trigger Confirmation Dialog ──
  const handleReviewUpdateTask = () => {
    if (!editTitle.trim()) {
      Alert.alert('Required', 'Task title cannot be empty.');
      return;
    }
    setConfirmActionType('update');
    setConfirmModalVisible(true);
  };

  // ── On Confirming Task Update: Call Backend API ──
  const handleExecuteUpdateTask = async () => {
    if (!editingTask) return;
    setIsSubmitting(true);

    const updatePayload = {
      title: editTitle.trim(),
      description: editDescription.trim(),
      priority: editPriority,
      due_date: editDueDate || null,
      status: editStatus,
      assigned_to: canAssignToOthers ? (editAssigneeId || editingTask.assigned_to) : editingTask.assigned_to,
    };

    const res = await api.updateTask(editingTask.id, updatePayload);
    setIsSubmitting(false);

    if (res.success && res.task) {
      setConfirmModalVisible(false);
      setEditModalVisible(false);
      await loadTasks();
      Alert.alert('Updated', `Task "${res.task.title}" updated successfully.`);
    } else {
      setConfirmModalVisible(false);
      if (res.status === 403 || (res.error && res.error.toLowerCase().includes('access denied'))) {
        Alert.alert('Access Denied', 'Access denied.');
      } else {
        Alert.alert('Error', res.error || 'Failed to update task.');
      }
    }
  };

  // ── Mark Task Completed ──
  const handleCompleteTask = async (task) => {
    try {
      const res = await api.updateTask(task.id, { status: 'completed' });
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'completed' } : t))
        );
      } else {
        Alert.alert('Error', res.error || 'Failed to complete task.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error completing task.');
    }
  };

  // ── Delete Task with confirmation ──
  const handleDeleteTask = (task) => {
    if (!canEditTask(task)) {
      Alert.alert('Access Denied', 'You do not have permission to delete this task.');
      return;
    }
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete task "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await api.deleteTask(task.id);
            if (res.success) {
              setTasks((prev) => prev.filter((t) => t.id !== task.id));
              Alert.alert('Deleted', 'Task has been deleted.');
            } else {
              Alert.alert('Error', res.error || 'Failed to delete task.');
            }
          },
        },
      ]
    );
  };

  const getPriorityInfo = (p = 'medium') => {
    return PRIORITIES.find((x) => x.id === p.toLowerCase()) || PRIORITIES[1];
  };

  const getStatusInfo = (s = 'pending') => {
    return STATUSES.find((x) => x.id === s.toLowerCase()) || STATUSES[0];
  };

  return (
    <View style={styles.container}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.backBtn}
          onPress={onBackToChat}
        >
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Task Management</Text>
          <Text style={styles.headerSubtitle}>
            {effectiveUser?.name || 'My Space'} • {isUserAdmin ? 'Admin' : 'Team Member'}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.refreshBtn}
          onPress={handleRefresh}
        >
          <Feather name="rotate-cw" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── Action Buttons Bar ── */}
      <View style={styles.actionButtonsBar}>
        {/* "Create Task" Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.primaryActionBtn, styles.btnAddTask, { flex: 1, justifyContent: 'center' }]}
          onPress={openCreateTask}
        >
          <Feather name="plus-circle" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.btnAddTaskText}>Create Task</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search & Filter Tabs ── */}
      <View style={styles.filterSection}>
        <View style={styles.searchBox}>
          <Feather name="search" size={14} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tasks by title, code, assignee..."
            placeholderTextColor="#94A3B8"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={14} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
          {[
            { id: 'all', label: `All (${tasks.length})` },
            { id: 'pending', label: `Pending (${tasks.filter((t) => t.status === 'pending').length})` },
            { id: 'in_progress', label: `In Progress (${tasks.filter((t) => t.status === 'in_progress').length})` },
            { id: 'completed', label: `Completed (${tasks.filter((t) => t.status === 'completed').length})` },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                onPress={() => setActiveFilter(tab.id)}
              >
                <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Task List ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Fetching tasks...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.taskListContainer}
          contentContainerStyle={styles.taskListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#059669']} />
          }
        >
          {filteredTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Feather name="clipboard" size={28} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No tasks found</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'No tasks match your search filter.'
                  : 'You have no tasks in this view. Use the buttons above to create one.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={openCreateTask}
              >
                <Feather name="plus" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyCreateBtnText}>Create Task</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredTasks.map((task) => {
              const priority = getPriorityInfo(task.priority);
              const status = getStatusInfo(task.status);
              const isCompleted = (task.status || '').toLowerCase() === 'completed';
              const canEdit = canEditTask(task);

              return (
                <View key={task.id} style={styles.taskCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText}>{task.code || 'TSK'}</Text>
                    </View>
                    <View style={styles.badgesGroup}>
                      <View style={[styles.pillBadge, { backgroundColor: priority.bg }]}>
                        <Text style={[styles.pillBadgeText, { color: priority.color }]}>
                          {priority.label}
                        </Text>
                      </View>
                      <View style={[styles.pillBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.pillBadgeText, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Title & Description */}
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  {task.description ? (
                    <Text style={styles.taskDesc} numberOfLines={2}>
                      {task.description}
                    </Text>
                  ) : null}

                  {/* Metadata Row */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Feather name="user" size={12} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {task.assigned_to_name || 'Assigned User'}
                      </Text>
                    </View>
                    {task.due_date ? (
                      <View style={styles.metaItem}>
                        <Feather name="calendar" size={12} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>
                          Due: {task.due_date.split('T')[0]}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Actions Row */}
                  <View style={styles.cardActionsRow}>
                    {!isCompleted && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.taskActionBtn, styles.btnComplete]}
                        onPress={() => handleCompleteTask(task)}
                      >
                        <Feather name="check" size={12} color="#059669" style={{ marginRight: 4 }} />
                        <Text style={[styles.taskActionText, { color: '#059669' }]}>Complete</Text>
                      </TouchableOpacity>
                    )}

                    {/* Edit Option: ONLY Displayed if Authorized */}
                    {canEdit && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.taskActionBtn, styles.btnEdit]}
                        onPress={() => openEditTask(task)}
                      >
                        <Feather name="edit-2" size={12} color="#0284C7" style={{ marginRight: 4 }} />
                        <Text style={[styles.taskActionText, { color: '#0284C7' }]}>Edit</Text>
                      </TouchableOpacity>
                    )}

                    {/* Delete Option: ONLY Displayed if Authorized */}
                    {canEdit && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.taskActionBtn, styles.btnDelete]}
                        onPress={() => handleDeleteTask(task)}
                      >
                        <Feather name="trash-2" size={12} color="#EF4444" style={{ marginRight: 4 }} />
                        <Text style={[styles.taskActionText, { color: '#EF4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── TASK CREATION MODAL (Add Task for Me / Add Task) ── */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Create Task</Text>
                <Text style={styles.modalSubtitle}>
                  Add a new task to Mission Control
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Task Title */}
              <Text style={styles.fieldLabel}>Task Title *</Text>
              <TextInput
                style={styles.textInput}
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="e.g. Schedule meeting with St. Xavier Principal"
                placeholderTextColor="#94A3B8"
              />

              {/* Task Description */}
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                value={taskDescription}
                onChangeText={setTaskDescription}
                placeholder="Provide task instructions or details..."
                placeholderTextColor="#94A3B8"
                multiline
              />

              {/* Assignee Selection (Only when canAssignToOthers) */}
              {canAssignToOthers && (
                <View>
                  <Text style={styles.fieldLabel}>Assign To</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <TouchableOpacity
                      style={[
                        styles.assigneePill,
                        (!selectedAssigneeId || selectedAssigneeId === currentUserId) && styles.assigneePillActive,
                      ]}
                      onPress={() => {
                        setSelectedAssigneeId(currentUserId);
                        setSelectedAssigneeName(currentUserName);
                      }}
                    >
                      <Text
                        style={[
                          styles.assigneePillText,
                          (!selectedAssigneeId || selectedAssigneeId === currentUserId) && styles.assigneePillTextActive,
                        ]}
                      >
                        👤 Myself ({currentUserName})
                      </Text>
                    </TouchableOpacity>
                    {managedUsers.map((u) => {
                      const isSelected = selectedAssigneeId === u.id;
                      return (
                        <TouchableOpacity
                          key={u.id}
                          style={[styles.assigneePill, isSelected && styles.assigneePillActive]}
                          onPress={() => {
                            setSelectedAssigneeId(u.id);
                            setSelectedAssigneeName(u.name);
                          }}
                        >
                          <Feather
                            name="user"
                            size={12}
                            color={isSelected ? '#FFFFFF' : '#475569'}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[styles.assigneePillText, isSelected && styles.assigneePillTextActive]}>
                            {u.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Priority */}
              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.optionsRow}>
                {PRIORITIES.map((p) => {
                  const isSelected = taskPriority === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.optionPill,
                        isSelected && { backgroundColor: p.bg, borderColor: p.color, borderWidth: 1.5 },
                      ]}
                      onPress={() => setTaskPriority(p.id)}
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          isSelected && { color: p.color, fontWeight: '800' },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Deadline / Due Date */}
              <Text style={styles.fieldLabel}>Deadline (Due Date)</Text>
              <View style={styles.quickDatesRow}>
                {[
                  { label: 'Today', days: 0 },
                  { label: 'Tomorrow', days: 1 },
                  { label: 'In 3 Days', days: 3 },
                  { label: 'In 7 Days', days: 7 },
                ].map((d) => (
                  <TouchableOpacity
                    key={d.label}
                    style={[
                      styles.quickDatePill,
                      taskDueDate === getQuickDueDate(d.days) && styles.quickDatePillActive,
                    ]}
                    onPress={() => setTaskDueDate(getQuickDueDate(d.days))}
                  >
                    <Text
                      style={[
                        styles.quickDateText,
                        taskDueDate === getQuickDueDate(d.days) && styles.quickDateTextActive,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.textInput}
                value={taskDueDate}
                onChangeText={setTaskDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
              />
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitReviewBtn}
                onPress={handleReviewCreateTask}
              >
                <Feather name="check" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.submitReviewBtnText}>Submit Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── TASK EDIT MODAL ── */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Edit Task</Text>
                <Text style={styles.modalSubtitle}>
                  Update task details and assignments
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Task Title *</Text>
              <TextInput
                style={styles.textInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Task Title"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Task description..."
                placeholderTextColor="#94A3B8"
                multiline
              />

              {/* Status */}
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.optionsRow}>
                {STATUSES.map((st) => {
                  const isSelected = editStatus === st.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[
                        styles.optionPill,
                        isSelected && { backgroundColor: st.bg, borderColor: st.color, borderWidth: 1.5 },
                      ]}
                      onPress={() => setEditStatus(st.id)}
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          isSelected && { color: st.color, fontWeight: '800' },
                        ]}
                      >
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Priority */}
              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.optionsRow}>
                {PRIORITIES.map((p) => {
                  const isSelected = editPriority === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.optionPill,
                        isSelected && { backgroundColor: p.bg, borderColor: p.color, borderWidth: 1.5 },
                      ]}
                      onPress={() => setEditPriority(p.id)}
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          isSelected && { color: p.color, fontWeight: '800' },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Deadline */}
              <Text style={styles.fieldLabel}>Deadline (Due Date)</Text>
              <TextInput
                style={styles.textInput}
                value={editDueDate}
                onChangeText={setEditDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
              />

              {/* Reassignment (Only for authorized managers/admins) */}
              {canAssignToOthers && managedUsers.length > 0 && (
                <View>
                  <Text style={styles.fieldLabel}>Reassign Task</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <TouchableOpacity
                      style={[styles.assigneePill, editAssigneeId === currentUserId && styles.assigneePillActive]}
                      onPress={() => {
                        setEditAssigneeId(currentUserId);
                        setEditAssigneeName(currentUserName);
                      }}
                    >
                      <Text style={[styles.assigneePillText, editAssigneeId === currentUserId && styles.assigneePillTextActive]}>
                        👤 Myself ({currentUserName})
                      </Text>
                    </TouchableOpacity>
                    {managedUsers.map((u) => {
                      const isSelected = editAssigneeId === u.id;
                      return (
                        <TouchableOpacity
                          key={u.id}
                          style={[styles.assigneePill, isSelected && styles.assigneePillActive]}
                          onPress={() => {
                            setEditAssigneeId(u.id);
                            setEditAssigneeName(u.name);
                          }}
                        >
                          <Text style={[styles.assigneePillText, isSelected && styles.assigneePillTextActive]}>
                            {u.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitReviewBtn}
                onPress={handleReviewUpdateTask}
              >
                <Feather name="check" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.submitReviewBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── CONFIRMATION DIALOG (Mandatory confirmation before saving) ── */}
      <Modal
        visible={confirmModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconBubble}>
              <Feather
                name={confirmActionType === 'create' ? 'check-circle' : 'refresh-cw'}
                size={24}
                color="#059669"
              />
            </View>

            <Text style={styles.confirmTitle}>
              {confirmActionType === 'create'
                ? 'Are you sure you want to create this task?'
                : 'Are you sure you want to update this task?'}
            </Text>

            <Text style={styles.confirmSubtitle}>
              Please review the important task details below before saving:
            </Text>

            {/* Task Details Summary */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Task Title:</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>
                  {confirmActionType === 'create' ? taskTitle : editTitle}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Description:</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>
                  {(confirmActionType === 'create' ? taskDescription : editDescription) || 'None provided'}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Assigned Person:</Text>
                <Text style={styles.summaryValue}>
                  {confirmActionType === 'create'
                    ? (selectedAssigneeId === currentUserId ? `Myself (${currentUserName})` : (selectedAssigneeName || 'Team Member'))
                    : (editAssigneeName || 'Team Member')}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Deadline:</Text>
                <Text style={styles.summaryValue}>
                  {(confirmActionType === 'create' ? taskDueDate : editDueDate) || 'No deadline'}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Priority:</Text>
                <Text style={[styles.summaryValue, { textTransform: 'capitalize' }]}>
                  {confirmActionType === 'create' ? taskPriority : editPriority}
                </Text>
              </View>

              {confirmActionType === 'update' && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Status:</Text>
                  <Text style={[styles.summaryValue, { textTransform: 'capitalize' }]}>
                    {editStatus.replace('_', ' ')}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm & Cancel Buttons */}
            <View style={styles.confirmButtonsCol}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.confirmExecuteBtn}
                onPress={confirmActionType === 'create' ? handleExecuteCreateTask : handleExecuteUpdateTask}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmExecuteBtnText}>
                      {confirmActionType === 'create' ? 'Confirm – Create Task' : 'Confirm – Update Task'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.cancelReturnBtn}
                onPress={() => setConfirmModalVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelReturnBtnText}>Cancel – Return to Editing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#A7F3D0',
    marginTop: 2,
  },
  refreshBtn: {
    padding: 6,
    marginLeft: 8,
  },
  actionButtonsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnMyTasks: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  btnMyTasksText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  btnAddTaskForMe: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  btnAddTaskForMeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  btnAddTask: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  btnAddTaskText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  tabsRow: {
    flexDirection: 'row',
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  tabPillActive: {
    backgroundColor: '#064E3B',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  taskListContainer: {
    flex: 1,
  },
  taskListContent: {
    padding: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyCreateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  badgesGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  taskActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnComplete: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  btnEdit: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  btnDelete: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
  },
  taskActionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
  },
  warnText: {
    fontSize: 12,
    color: '#DC2626',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  assigneePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  assigneePillActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  assigneePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  assigneePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  quickDatesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  quickDatePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickDatePillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  quickDateText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  quickDateTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  submitReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  submitReviewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  confirmBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  confirmIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  confirmSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  summaryContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    width: '38%',
  },
  summaryValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
    width: '60%',
    textAlign: 'right',
  },
  confirmButtonsCol: {
    width: '100%',
    gap: 10,
  },
  confirmExecuteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
  },
  confirmExecuteBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelReturnBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  cancelReturnBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
});
