import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Keyboard, Platform, Linking, Alert, TextInput } from 'react-native';
import { Feather, Ionicons, FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import MarkdownView from './MarkdownView';

// Helper to sanitize and format assistant notes, stripping any legacy extraction boilerplate
function formatAssistantNote(notes, leadCard) {
  if (!notes) {
    return `Lead recorded for ${leadCard?.schoolName || leadCard?.school_name || 'the school'}. Demonstration and customized curriculum quote requested.`;
  }
  let clean = notes
    .replace(/Extracted & auto-logged by OLL Agentic AI Assistant from:.*?["']\.\.\./gi, '')
    .replace(/Extracted & auto-logged by OLL Agentic AI Assistant from:.*?(?:\.|$)/gi, '')
    .replace(/Extracted & auto-logged.*?(?:\.|$)/gi, '')
    .trim();
  if (!clean || clean.length < 5) {
    clean = `Lead recorded for ${leadCard?.schoolName || leadCard?.school_name || 'the school'}. Follow-up scheduled by AI Assistant with ${leadCard?.contactPerson || leadCard?.contact_name || 'Principal'}.`;
  }
  return clean;
}

// ── Task Management Helper Components (Web App Phase 1) ──────────────────────
function getPriorityBadge(priority = 'medium') {
  const p = (priority || 'medium').toLowerCase();
  if (p === 'urgent') return { label: '🔥 Urgent', bg: '#FEE2E2', color: '#DC2626' };
  if (p === 'high') return { label: '⚡ High', bg: '#FFEDD5', color: '#EA580C' };
  if (p === 'low') return { label: '💤 Low', bg: '#F1F5F9', color: '#475569' };
  return { label: '🔹 Medium', bg: '#FEF9C3', color: '#A16207' };
}

function getStatusBadge(status = 'pending') {
  const s = (status || 'pending').toLowerCase();
  if (s === 'completed') return { label: '✓ Completed', bg: '#DCFCE7', color: '#15803D' };
  if (s === 'in_progress') return { label: '⏳ In Progress', bg: '#DBEAFE', color: '#1D4ED8' };
  if (s === 'pending_approval') return { label: '📋 Pending Approval', bg: '#F3E8FF', color: '#7E22CE' };
  if (s === 'rejected') return { label: '✕ Rejected', bg: '#FEE2E2', color: '#DC2626' };
  return { label: '🕒 Pending', bg: '#FEF3C7', color: '#B45309' };
}

function TaskItemCard({
  task,
  onCompleteTask,
  onStartTask,
  onDeleteTask,
  onCommentTask,
}) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  const priorityMeta = getPriorityBadge(task.priority);
  const statusMeta = getStatusBadge(task.status);
  const isCompleted = (task.status || '').toLowerCase() === 'completed';
  const isInProgress = (task.status || '').toLowerCase() === 'in_progress';

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setIsSendingComment(true);
    if (onCommentTask) {
      await onCommentTask(task, commentText.trim());
    }
    setIsSendingComment(false);
    setCommentText('');
    setCommentOpen(false);
  };

  return (
    <View style={styles.taskItemContainer}>
      <View style={styles.taskItemTopRow}>
        <View style={styles.taskCodeBadge}>
          <Text style={styles.taskCodeText}>{task.code || 'TASK'}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <View style={[styles.taskBadgePill, { backgroundColor: priorityMeta.bg }]}>
            <Text style={[styles.taskBadgeText, { color: priorityMeta.color }]}>{priorityMeta.label}</Text>
          </View>
          <View style={[styles.taskBadgePill, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.taskBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.taskItemTitle}>{task.title}</Text>
      {task.description ? (
        <Text style={styles.taskItemDesc} numberOfLines={2}>{task.description}</Text>
      ) : null}

      <View style={styles.taskItemMetaRow}>
        <View style={styles.taskMetaCol}>
          <Feather name="user" size={11} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.taskMetaText} numberOfLines={1}>
            {task.assigned_to_name || 'Team Member'}
          </Text>
        </View>
        {task.due_date ? (
          <View style={styles.taskMetaCol}>
            <Feather name="calendar" size={11} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.taskMetaText}>
              Due: {task.due_date.split('T')[0]}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.taskActionsRow}>
        {!isCompleted && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.taskActionBtn, styles.taskBtnComplete]}
            onPress={() => onCompleteTask && onCompleteTask(task)}
          >
            <Feather name="check" size={11} color="#059669" style={{ marginRight: 3 }} />
            <Text style={[styles.taskActionBtnText, { color: '#059669' }]}>Complete</Text>
          </TouchableOpacity>
        )}

        {!isCompleted && !isInProgress && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.taskActionBtn, styles.taskBtnStart]}
            onPress={() => onStartTask && onStartTask(task)}
          >
            <Feather name="play" size={10} color="#2563EB" style={{ marginRight: 3 }} />
            <Text style={[styles.taskActionBtnText, { color: '#2563EB' }]}>Start</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.taskActionBtn, styles.taskBtnComment]}
          onPress={() => setCommentOpen(!commentOpen)}
        >
          <Feather name="message-square" size={11} color="#64748B" style={{ marginRight: 3 }} />
          <Text style={[styles.taskActionBtnText, { color: '#64748B' }]}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.taskActionBtn, styles.taskBtnDelete]}
          onPress={() => onDeleteTask && onDeleteTask(task)}
        >
          <Feather name="trash-2" size={11} color="#EF4444" style={{ marginRight: 3 }} />
          <Text style={[styles.taskActionBtnText, { color: '#EF4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>

      {commentOpen && (
        <View style={styles.inlineCommentBox}>
          <TextInput
            style={styles.inlineCommentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add update or remark..."
            placeholderTextColor="#94A3B8"
          />
          <TouchableOpacity
            style={styles.sendCommentBtn}
            onPress={handleSendComment}
            disabled={isSendingComment || !commentText.trim()}
          >
            <Text style={styles.sendCommentBtnText}>Post</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function TaskListCard({
  title,
  subtitle,
  tasks = [],
  onCompleteTask,
  onStartTask,
  onDeleteTask,
  onCommentTask,
}) {
  return (
    <View style={styles.taskListCardContainer}>
      <View style={styles.taskListHeader}>
        <View style={styles.taskListIconBubble}>
          <Feather name="check-square" size={16} color="#059669" />
        </View>
        <View style={{ flex: 1, marginLeft: 9 }}>
          <Text style={styles.taskListTitle}>{title || `Tasks (${tasks.length})`}</Text>
          {subtitle ? <Text style={styles.taskListSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      {tasks.length === 0 ? (
        <View style={styles.emptyTaskState}>
          <Text style={styles.emptyTaskText}>No tasks found in this view.</Text>
        </View>
      ) : (
        tasks.map((task, idx) => (
          <TaskItemCard
            key={task.id || idx}
            task={task}
            onCompleteTask={onCompleteTask}
            onStartTask={onStartTask}
            onDeleteTask={onDeleteTask}
            onCommentTask={onCommentTask}
          />
        ))
      )}
    </View>
  );
}

function InlineTaskCreationCard({
  initialTitle = '',
  onSubmit,
}) {
  const [title, setTitle] = useState(initialTitle);
  const [priority, setPriority] = useState('medium');
  const [dueDateDays, setDueDateDays] = useState(1);

  const handleSubmit = () => {
    if (!title.trim()) return;
    const due = new Date(Date.now() + dueDateDays * 86400000).toISOString().split('T')[0];
    if (onSubmit) {
      onSubmit({
        title: title.trim(),
        priority,
        due_date: due,
      });
    }
  };

  return (
    <View style={styles.taskCreationCard}>
      <View style={styles.taskCreationHeader}>
        <View style={styles.taskCreationIconWrap}>
          <Feather name="plus-circle" size={15} color="#059669" />
        </View>
        <View style={{ marginLeft: 8 }}>
          <Text style={styles.taskCreationTitle}>New Mission Control Task</Text>
          <Text style={styles.taskCreationSubtitle}>Auto-logged to tasks database</Text>
        </View>
      </View>

      <Text style={styles.taskCreationLabel}>Task Title *</Text>
      <TextInput
        style={styles.taskCreationInput}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Follow up on robotics syllabus with Principal"
        placeholderTextColor="#94A3B8"
      />

      <Text style={styles.taskCreationLabel}>Priority</Text>
      <View style={styles.pillSelectorRow}>
        {['low', 'medium', 'high', 'urgent'].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.selectorPill, priority === p && styles.selectorPillActive]}
            onPress={() => setPriority(p)}
          >
            <Text style={[styles.selectorPillText, priority === p && styles.selectorPillTextActive]}>
              {p.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.taskCreationLabel}>Due Date</Text>
      <View style={styles.pillSelectorRow}>
        {[
          { label: 'Today', days: 0 },
          { label: 'Tomorrow', days: 1 },
          { label: 'In 3 Days', days: 3 },
          { label: 'Next Week', days: 7 },
        ].map((d) => (
          <TouchableOpacity
            key={d.label}
            style={[styles.selectorPill, dueDateDays === d.days && styles.selectorPillActive]}
            onPress={() => setDueDateDays(d.days)}
          >
            <Text style={[styles.selectorPillText, dueDateDays === d.days && styles.selectorPillTextActive]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.createTaskSubmitBtn, !title.trim() && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={!title.trim()}
      >
        <Feather name="check" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.createTaskSubmitBtnText}>Create Task Now</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ChatMessagesView({
  messages,
  isTyping,
  onActionChipPress,
  onEditLead,
  onSendEmail,
  onSendWhatsApp,
  onViewLead,
  onGenerateProposal,
  onCallLead,
  onMeetingDone,
  onScheduleMeeting,
  onRaiseTicket,
  onFollowup,
  onDocs,
  onAssign,
  onNote,
  onDeleteLead,
  onLostLead,
  onArchiveLead,
  onUnarchiveLead,
  onConfirmAction,
  onCancelAction,
  onSelectDisambiguatedSchool,
  onSubmitInlineMeeting,
  onSubmitInlineNote,
  onCompleteTask,
  onStartTask,
  onDeleteTask,
  onCommentTask,
  onSubmitInlineTask,
}) {
  const scrollViewRef = useRef(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  // Auto-scroll when virtual keyboard appears on mobile
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const showSub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
    return () => showSub.remove();
  }, []);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {messages.map((msg, index) => (
        <View key={index} style={styles.messageRow}>
          {msg.sender === 'user' ? (
            /* User Message Bubble */
            <View style={styles.userBubbleContainer}>
              <View style={styles.userBubble}>
                <MarkdownView content={msg.text} baseStyle={styles.userText} isUser={true} />
              </View>
              <Text style={styles.timestamp}>{msg.time || 'Just now'}</Text>
            </View>
          ) : (
            /* AI Assistant Message */
            <View style={styles.aiMessageContainer}>
              {/* AI Avatar & Header */}
              <View style={styles.aiHeader}>
                <View style={styles.aiAvatar}>
                  <Text style={styles.aiAvatarText}>OLL</Text>
                </View>
                <View>
                  <View style={styles.aiNameRow}>
                    <Text style={styles.aiName}>OLL CRM AI</Text>
                    <View style={styles.agenticBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.agenticText}>AI</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* AI Bubble Body */}
              <View style={styles.aiBubble}>
                <MarkdownView content={msg.text} baseStyle={styles.aiText} isUser={false} />

                {/* Render Rich Lead Card if present */}
                {msg.leadCard && (() => {
                  const lead = msg.leadCard;
                  const isDeleted = lead.status === 'deleted' || lead.isDeleted === true;
                  const isArchived = !isDeleted && (lead.status === 'archived' || lead.isArchived === true);
                  const isLost = !isDeleted && !isArchived && lead.status === 'lost';
                  const isMeetingDone = !isDeleted && !isArchived && lead.status === 'meeting_done';
                  const isMeetingScheduled = !isDeleted && !isArchived && !isMeetingDone && (lead.status === 'meeting_scheduled' || Boolean(lead.meeting_date));

                  return (
                    <View style={styles.leadCardContainer}>
                      <View style={styles.cardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Ionicons name="school" size={17} color={isLost ? '#EF4444' : isDeleted ? '#64748B' : isArchived ? '#475569' : '#059669'} style={{ marginRight: 6 }} />
                          <Text style={styles.schoolName} numberOfLines={1}>{lead.schoolName || lead.school_name}</Text>
                        </View>
                      </View>

                      <View style={styles.badgeRow}>
                        {isLost ? (
                          <View style={[styles.boardBadge, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', borderWidth: 1 }]}>
                            <Text style={[styles.boardBadgeText, { color: '#B91C1C', fontWeight: '800' }]}>❌ LOST LEAD (CLOSED)</Text>
                          </View>
                        ) : isDeleted ? (
                          <View style={[styles.boardBadge, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', borderWidth: 1 }]}>
                            <Text style={[styles.boardBadgeText, { color: '#64748B', fontWeight: '800' }]}>🗑️ DELETED FROM CRM</Text>
                          </View>
                        ) : isArchived ? (
                          <View style={[styles.boardBadge, { backgroundColor: '#F1F5F9', borderColor: '#94A3B8', borderWidth: 1 }]}>
                            <Text style={[styles.boardBadgeText, { color: '#475569', fontWeight: '800' }]}>📦 ARCHIVED LEAD</Text>
                          </View>
                        ) : isMeetingDone ? (
                          <View style={[styles.boardBadge, { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE', borderWidth: 1 }]}>
                            <Text style={[styles.boardBadgeText, { color: '#7C3AED', fontWeight: '800' }]}>✓ MEETING DONE</Text>
                          </View>
                        ) : isMeetingScheduled ? (
                          <View style={[styles.boardBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1 }]}>
                            <Text style={[styles.boardBadgeText, { color: '#1D4ED8', fontWeight: '800' }]}>📅 MEETING SCHEDULED</Text>
                          </View>
                        ) : (
                          <View style={styles.boardBadge}>
                            <Text style={styles.boardBadgeText}>{lead.board || 'CBSE'}</Text>
                          </View>
                        )}

                        <View style={styles.scoreBadge}>
                          <Text style={styles.scoreBadgeText}>{lead.leadScore || (isLost ? '0/100 (Closed)' : '96/100 (Hot Lead)')}</Text>
                        </View>
                        {lead.id ? (
                          <View style={styles.dbIdBadge}>
                            <Text style={styles.dbIdText}>ID: {lead.id.substring(0, 8)}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.infoRow}>
                        <Feather name="map-pin" size={14} color="#64748B" />
                        <Text style={styles.infoText}>{lead.location || 'Mumbai, Maharashtra'}</Text>
                      </View>

                      <View style={styles.infoRow}>
                        <Feather name="user" size={14} color="#64748B" />
                        <Text style={styles.infoText}>{lead.contactPerson || lead.contact_name}</Text>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.infoRow}
                        onPress={() => {
                          if (isLost) {
                            Alert.alert('Lead Closed (Lost)', 'This lead is marked as Lost. Communication is disabled.');
                            return;
                          }
                          if (isDeleted) {
                            Alert.alert('Lead Deleted', 'This lead has been deleted from CRM.');
                            return;
                          }
                          if (isArchived) {
                            Alert.alert('Lead Archived', 'This lead is archived. Tap Unarchive Lead to resume active communications.');
                            return;
                          }
                          onSendEmail && onSendEmail(lead);
                        }}
                      >
                        <Feather name="mail" size={14} color="#E11D48" />
                        <Text style={[styles.infoText, { color: '#E11D48' }]}>
                          {lead.email || 'pending@school.edu.in'} <Text style={{ fontSize: 11, color: '#94A3B8' }}>(Tap to Email)</Text>
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.infoRow}
                        onPress={() => {
                          if (isLost) {
                            Alert.alert('Lead Closed (Lost)', 'This lead is marked as Lost. Communication is disabled.');
                            return;
                          }
                          if (isDeleted) {
                            Alert.alert('Lead Deleted', 'This lead has been deleted from CRM.');
                            return;
                          }
                          if (isArchived) {
                            Alert.alert('Lead Archived', 'This lead is archived. Tap Unarchive Lead to resume active communications.');
                            return;
                          }
                          onCallLead && onCallLead(lead);
                        }}
                      >
                        <Feather name="phone" size={14} color="#059669" />
                        <Text style={[styles.infoText, { color: '#059669', fontWeight: '600' }]}>
                          {lead.phone} <Text style={{ fontSize: 11, color: '#94A3B8' }}>(Tap to Call)</Text>
                        </Text>
                      </TouchableOpacity>

                      {/* Clean Assistant Latest Note */}
                      <View style={styles.latestNoteCard}>
                        <View style={styles.noteTitleRow}>
                          <View style={styles.noteAiPill}>
                            <Ionicons name="sparkles" size={10} color="#065F46" />
                            <Text style={styles.noteAiPillText}>Assistant</Text>
                          </View>
                          <Text style={styles.latestNoteTitle}>Latest Note:</Text>
                        </View>
                        <MarkdownView
                          content={formatAssistantNote(lead.notes, lead)}
                          baseStyle={styles.latestNoteBody}
                        />
                      </View>

                      {/* CRM Activity Log & Comments History */}
                      {lead.comments && lead.comments.length > 0 ? (
                        <View style={styles.activityLogContainer}>
                          <View style={styles.activityLogHeader}>
                            <Feather name="clock" size={11} color="#059669" style={{ marginRight: 5 }} />
                            <Text style={styles.activityLogTitle}>CRM Comments & Activity Log ({lead.comments.length}):</Text>
                          </View>
                          {lead.comments.slice(-3).reverse().map((c, i) => (
                            <View key={i} style={styles.activityLogRow}>
                              <View style={styles.activityLogBullet} />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.activityLogText}>{c.text || c.comment}</Text>
                                <Text style={styles.activityLogMeta}>
                                  👤 {c.author || 'CRM Assistant'} • {c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged recently'}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {/* Automated Follow-up Tasks from Backend */}
                      {lead.followup_tasks && lead.followup_tasks.length > 0 ? (
                        <View style={styles.followupTasksBox}>
                          <Text style={styles.followupBoxTitle}>Auto-Scheduled Follow-up Reminders:</Text>
                          {lead.followup_tasks.slice(0, 4).map((task, idx) => (
                            <View key={idx} style={styles.taskMiniRow}>
                              <Feather name="calendar" size={12} color="#059669" style={{ marginRight: 6 }} />
                              <Text style={styles.taskMiniText}>
                                Step {task.number}: {task.email_type} scheduled for {task.scheduled_date}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {/* Interactive Lead Action Buttons or Locked State */}
                      {isLost ? (
                        <View style={styles.leadLostBanner}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Feather name="slash" size={13} color="#DC2626" style={{ marginRight: 6 }} />
                            <Text style={styles.leadLostTitle}>Lost Lead — Closed Permanently</Text>
                          </View>
                          <Text style={styles.leadLostDescription}>
                            This school has been recorded as a Lost Lead. Per CRM rules, no meetings, proposals, notes, or edits can be performed.
                          </Text>
                        </View>
                      ) : isDeleted ? (
                        <View style={styles.leadDeletedBanner}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Feather name="trash-2" size={13} color="#64748B" style={{ marginRight: 6 }} />
                            <Text style={styles.leadDeletedTitle}>Lead Deleted from CRM</Text>
                          </View>
                          <Text style={styles.leadDeletedDescription}>
                            This record was deleted from the active database. Editing and further actions are disabled.
                          </Text>
                        </View>
                      ) : isArchived ? (
                        <View style={styles.leadArchivedBanner}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Feather name="archive" size={13} color="#475569" style={{ marginRight: 6 }} />
                            <Text style={styles.leadArchivedTitle}>Archived Lead</Text>
                          </View>
                          <Text style={styles.leadArchivedDescription}>
                            This school lead is stored in the CRM archive. You can restore it to the active pipeline or delete it permanently.
                          </Text>
                          <View style={styles.archivedButtonsRow}>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={[styles.archiveBtn, styles.btnUnarchive]}
                              onPress={() => onUnarchiveLead && onUnarchiveLead(lead)}
                            >
                              <Feather name="rotate-ccw" size={12} color="#059669" style={{ marginRight: 5 }} />
                              <Text style={styles.btnUnarchiveText}>Unarchive Lead</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={[styles.archiveBtn, styles.btnDeleteArchive]}
                              onPress={() => onDeleteLead && onDeleteLead(lead)}
                            >
                              <Feather name="trash-2" size={12} color="#DC2626" style={{ marginRight: 5 }} />
                              <Text style={styles.btnDeleteArchiveText}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.leadActionsBar}>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnEditLead]}
                            onPress={() => onEditLead && onEditLead(lead)}
                          >
                            <Feather name="edit-2" size={11} color="#0284C7" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#0284C7' }]}>Edit</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnProposal]}
                            onPress={() => onGenerateProposal && onGenerateProposal(lead)}
                          >
                            <Feather name="file-text" size={11} color="#D97706" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#D97706' }]}>Proposal</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[
                              styles.leadActionButton,
                              isMeetingDone ? { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' } : styles.btnMeetingDone,
                            ]}
                            onPress={() => onMeetingDone && onMeetingDone(lead)}
                          >
                            <View style={isMeetingDone ? styles.tinyGreenDot : styles.tinyPurpleDot} />
                            <Text
                              style={[
                                styles.leadActionText,
                                { color: isMeetingDone ? '#059669' : '#7C3AED', fontWeight: isMeetingDone ? '700' : '600' },
                              ]}
                            >
                              {isMeetingDone ? 'Meeting Done ✓' : 'Meeting Done'}
                            </Text>
                          </TouchableOpacity>

                          {/* Schedule Meeting: Rule 2 & 3 */}
                          {isMeetingScheduled ? (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={[styles.leadActionButton, styles.btnMeetingLocked]}
                              onPress={() => onScheduleMeeting && onScheduleMeeting(lead)}
                            >
                              <Feather name="lock" size={11} color="#64748B" style={{ marginRight: 3 }} />
                              <Text style={[styles.leadActionText, { color: '#64748B' }]}>Meeting Scheduled (Locked)</Text>
                            </TouchableOpacity>
                          ) : isMeetingDone ? (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={[styles.leadActionButton, styles.btnScheduleMeeting]}
                              onPress={() => onScheduleMeeting && onScheduleMeeting(lead)}
                            >
                              <Feather name="calendar" size={11} color="#2563EB" style={{ marginRight: 3 }} />
                              <Text style={[styles.leadActionText, { color: '#2563EB', fontWeight: '700' }]}>
                                Schedule 2nd Meeting
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={[styles.leadActionButton, styles.btnScheduleMeeting]}
                              onPress={() => onScheduleMeeting && onScheduleMeeting(lead)}
                            >
                              <Feather name="calendar" size={11} color="#2563EB" style={{ marginRight: 3 }} />
                              <Text style={[styles.leadActionText, { color: '#2563EB' }]}>Schedule Meeting</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnTicket]}
                            onPress={() => onRaiseTicket && onRaiseTicket(lead)}
                          >
                            <Ionicons name="ticket-outline" size={11} color="#EA580C" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#EA580C' }]}>Ticket</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnFollowup]}
                            onPress={() => onFollowup && onFollowup(lead)}
                          >
                            <Feather name="phone-call" size={11} color="#0D9488" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#0D9488' }]}>Followup</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnDocs]}
                            onPress={() => onDocs && onDocs(lead)}
                          >
                            <Feather name="file-text" size={11} color="#0891B2" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#0891B2' }]}>Docs</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnMail]}
                            onPress={() => onSendEmail && onSendEmail(lead)}
                          >
                            <Feather name="mail" size={11} color="#0284C7" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#0284C7' }]}>Mail</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnView]}
                            onPress={() => onViewLead && onViewLead(lead)}
                          >
                            <Feather name="eye" size={11} color="#0D9488" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#0D9488' }]}>View</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnAssign]}
                            onPress={() => onAssign && onAssign(lead)}
                          >
                            <Feather name="user-plus" size={11} color="#4F46E5" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#4F46E5' }]}>Assign</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnNote]}
                            onPress={() => onNote && onNote(lead)}
                          >
                            <Feather name="edit-3" size={11} color="#475569" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#475569' }]}>Note</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnDelete]}
                            onPress={() => onDeleteLead && onDeleteLead(lead)}
                          >
                            <Feather name="trash-2" size={11} color="#DC2626" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#DC2626' }]}>Delete</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnLostLead]}
                            onPress={() => onLostLead && onLostLead(lead)}
                          >
                            <Feather name="x" size={11} color="#E11D48" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#E11D48' }]}>Lost Lead</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnArchive]}
                            onPress={() => onArchiveLead && onArchiveLead(lead)}
                          >
                            <Feather name="archive" size={11} color="#64748B" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#64748B' }]}>Archive</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Render Follow-up Pipeline List if present */}
                {msg.followUpList && (
                  <View style={styles.pipelineContainer}>
                    {msg.followUpList.map((item, idx) => (
                      <View key={idx} style={styles.pipelineItem}>
                        <View style={styles.pipeTopRow}>
                          <Text style={styles.pipeSchool}>{item.name}</Text>
                          <View style={styles.urgencyTag}>
                            <Text style={styles.urgencyText}>{item.urgency}</Text>
                          </View>
                        </View>
                        <Text style={styles.pipeCampus}>{item.campus} • Value: {item.value}</Text>
                        <Text style={styles.pipeTask}>👉 {item.task}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Render Proposal Card if present */}
                {msg.proposal && (
                  <View style={styles.proposalContainer}>
                    <Text style={styles.proposalTitle}>{msg.proposal.title}</Text>
                    <Text style={styles.proposalTier}>{msg.proposal.tier}</Text>
                    <View style={styles.divider} />
                    {msg.proposal.modules.map((mod, i) => (
                      <Text key={i} style={styles.moduleItem}>✓ {mod}</Text>
                    ))}
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceText}>{msg.proposal.pricing}</Text>
                    </View>
                  </View>
                )}

                {/* Render Active Schools List if present */}
                {msg.activeSchools && (
                  <View style={styles.schoolsListContainer}>
                    {msg.activeSchools.map((sch, i) => (
                      <View key={i} style={styles.schoolItemRow}>
                        <View style={styles.schoolBullet} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.schoolItemName}>{sch.name}</Text>
                          <Text style={styles.schoolItemDetail}>{sch.tier} • {sch.students} students</Text>
                        </View>
                        <View style={styles.statusPillSmall}>
                          <Text style={styles.statusPillSmallText}>{sch.status}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Render Intro Email if present */}
                {msg.email && (
                  <View style={styles.emailContainer}>
                    <Text style={styles.emailSubject}>Subject: {msg.email.subject}</Text>
                    <Text style={styles.emailTo}>To: {msg.email.recipient}</Text>
                    <View style={styles.divider} />
                    <Text style={styles.emailBody}>{msg.email.body}</Text>
                  </View>
                )}

                {/* Render Disambiguation Card if multiple schools matched */}
                {msg.disambiguationCard && (
                  <View style={styles.disambiguationBox}>
                    <View style={styles.disambigHeader}>
                      <Feather name="help-circle" size={15} color="#0284C7" style={{ marginRight: 6 }} />
                      <Text style={styles.disambigTitle}>Multiple Schools Matched</Text>
                    </View>
                    <Text style={styles.disambigSubtitle}>
                      Please select which school you want to {msg.disambiguationCard.actionLabel || 'proceed with'}:
                    </Text>
                    <View style={styles.disambigList}>
                      {msg.disambiguationCard.candidates.map((c, idx) => (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.7}
                          style={styles.disambigBtn}
                          onPress={() => onSelectDisambiguatedSchool && onSelectDisambiguatedSchool(c, msg.disambiguationCard)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.disambigSchoolName}>{c.school_name || c.schoolName}</Text>
                            <Text style={styles.disambigSchoolMeta}>
                              📍 {c.location || 'Mumbai'} • 👤 {c.contact_name || c.contactPerson || 'Principal'} • 🎓 {c.board || 'CBSE'}
                            </Text>
                          </View>
                          <Feather name="chevron-right" size={16} color="#059669" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Render Inline Meeting Scheduler Form if present */}
                {msg.meetingSchedulerCard && (
                  <InlineMeetingScheduler
                    lead={msg.meetingSchedulerCard.lead}
                    onSubmit={onSubmitInlineMeeting}
                  />
                )}

                {/* Render Inline Note Input Form if present */}
                {msg.noteInputCard && (
                  <InlineNoteInput
                    lead={msg.noteInputCard.lead}
                    onSubmit={onSubmitInlineNote}
                  />
                )}

                {/* Render Confirmation Card (Yes/No buttons) */}
                {msg.confirmationCard && (
                  <View style={[
                    styles.confirmationCard,
                    msg.confirmationCard.danger ? styles.confirmationCardDanger : styles.confirmationCardPrimary,
                    msg.confirmationCard.status === 'confirmed' && styles.confirmationCardConfirmed,
                    msg.confirmationCard.status === 'cancelled' && styles.confirmationCardCancelled,
                  ]}>
                    <View style={styles.confirmHeaderRow}>
                      <View style={[
                        styles.confirmIconBubble,
                        msg.confirmationCard.danger ? styles.confirmIconDanger : styles.confirmIconPrimary
                      ]}>
                        <Feather
                          name={
                            msg.confirmationCard.actionType === 'delete' ? 'trash-2' :
                            msg.confirmationCard.actionType === 'delete_task' ? 'trash-2' :
                            msg.confirmationCard.actionType === 'create_task' ? 'check-square' :
                            msg.confirmationCard.actionType === 'complete_task' ? 'check-circle' :
                            msg.confirmationCard.actionType === 'lost' ? 'slash' :
                            msg.confirmationCard.actionType === 'archive' ? 'archive' :
                            msg.confirmationCard.actionType === 'unarchive' ? 'rotate-ccw' :
                            msg.confirmationCard.actionType === 'schedule_meeting' ? 'calendar' :
                            'edit-3'
                          }
                          size={16}
                          color={msg.confirmationCard.danger ? '#DC2626' : '#059669'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.confirmTitle}>{msg.confirmationCard.title}</Text>
                        {msg.confirmationCard.description ? (
                          <Text style={styles.confirmDesc}>{msg.confirmationCard.description}</Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Details Key-Value Box */}
                    {msg.confirmationCard.details && msg.confirmationCard.details.length > 0 && (
                      <View style={styles.confirmDetailsBox}>
                        {msg.confirmationCard.details.map((d, idx) => (
                          <View key={idx} style={styles.confirmDetailRow}>
                            <Text style={styles.confirmDetailLabel}>{d.label}:</Text>
                            <Text style={styles.confirmDetailValue} numberOfLines={2}>{d.value}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Interactive Yes / No Buttons if status is pending */}
                    {msg.confirmationCard.status === 'pending' ? (
                      <View style={styles.confirmButtonsRow}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[
                            styles.confirmBtn,
                            msg.confirmationCard.danger ? styles.confirmBtnDanger : styles.confirmBtnPrimary
                          ]}
                          onPress={() => onConfirmAction && onConfirmAction(msg.confirmationCard)}
                        >
                          <Feather name="check" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.confirmBtnText}>{msg.confirmationCard.confirmLabel || 'Yes, Confirm'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[styles.confirmBtn, styles.confirmBtnCancel]}
                          onPress={() => onCancelAction && onCancelAction(msg.confirmationCard)}
                        >
                          <Feather name="x" size={14} color="#64748B" style={{ marginRight: 6 }} />
                          <Text style={styles.confirmBtnCancelText}>{msg.confirmationCard.cancelLabel || 'No, Cancel'}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : msg.confirmationCard.status === 'confirmed' ? (
                      <View style={styles.confirmStatusBannerSuccess}>
                        <Feather name="check-circle" size={14} color="#059669" style={{ marginRight: 6 }} />
                        <Text style={styles.confirmStatusTextSuccess}>Action Confirmed & Executed</Text>
                      </View>
                    ) : (
                      <View style={styles.confirmStatusBannerCancelled}>
                        <Feather name="x-circle" size={14} color="#64748B" style={{ marginRight: 6 }} />
                        <Text style={styles.confirmStatusTextCancelled}>Operation Cancelled — No changes made</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Render Task List Card if present */}
                {msg.taskListCard && (
                  <TaskListCard
                    title={msg.taskListCard.title}
                    subtitle={msg.taskListCard.subtitle}
                    tasks={msg.taskListCard.tasks}
                    onCompleteTask={onCompleteTask}
                    onStartTask={onStartTask}
                    onDeleteTask={onDeleteTask}
                    onCommentTask={onCommentTask}
                  />
                )}

                {/* Render Single Task Card if present */}
                {msg.taskCard && (
                  <View style={styles.singleTaskWrapper}>
                    <TaskItemCard
                      task={msg.taskCard}
                      onCompleteTask={onCompleteTask}
                      onStartTask={onStartTask}
                      onDeleteTask={onDeleteTask}
                      onCommentTask={onCommentTask}
                    />
                  </View>
                )}

                {/* Render Inline Task Creation Card if present */}
                {msg.taskCreationCard && (
                  <InlineTaskCreationCard
                    initialTitle={msg.taskCreationCard.initialTitle}
                    onSubmit={onSubmitInlineTask}
                  />
                )}

                {/* Render Action Chips (hidden when leadCard is shown to avoid duplicate buttons) */}
                {!msg.leadCard && msg.nextActions && msg.nextActions.length > 0 && (
                  <View style={styles.chipsRow}>
                    {msg.nextActions.map((chip, idx) => (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.7}
                        style={styles.chipButton}
                        onPress={() => onActionChipPress && onActionChipPress(chip)}
                      >
                        <Feather name="chevron-right" size={13} color={COLORS.brandEmerald} style={{ marginRight: 3 }} />
                        <Text style={styles.chipText}>{chip}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      ))}

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <View style={styles.aiAvatarSmall}>
            <Text style={styles.aiAvatarSmallText}>OLL</Text>
          </View>
          <View style={styles.typingBubble}>
            <TypingDots />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function InlineMeetingScheduler({ lead, onSubmit }) {
  const [mode, setMode] = useState('In-Person Campus Visit');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('11:00 AM');
  const [location, setLocation] = useState(lead?.location || 'School Campus');
  const [notes, setNotes] = useState('Demonstration of Agentic AI & STEM Excellence Lab');

  const setQuickDate = (daysAhead, defaultTime) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setDate(d.toISOString().split('T')[0]);
    setTime(defaultTime);
  };

  return (
    <View style={styles.inlineFormCard}>
      <View style={styles.inlineFormHeader}>
        <Feather name="calendar" size={15} color="#2563EB" style={{ marginRight: 6 }} />
        <Text style={styles.inlineFormTitle}>Meeting Details: {lead?.schoolName || lead?.school_name}</Text>
      </View>

      <Text style={styles.inlineFieldLabel}>Meeting Mode</Text>
      <View style={styles.inlinePillsRow}>
        {['In-Person Campus Visit', 'Online Demo', 'Phone Call'].map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.inlinePill, mode === m && styles.inlinePillActive]}
            onPress={() => {
              setMode(m);
              if (m === 'Online Demo') setLocation('Google Meet / Zoom');
              else if (m === 'Phone Call') setLocation(lead?.phone || 'Phone Call');
              else setLocation(lead?.location || 'School Campus');
            }}
          >
            <Text style={[styles.inlinePillText, mode === m && styles.inlinePillTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.inlineFieldLabel}>Quick Schedule</Text>
      <View style={styles.inlinePillsRow}>
        <TouchableOpacity style={styles.inlineQuickChip} onPress={() => setQuickDate(1, '11:00 AM')}>
          <Text style={styles.inlineQuickChipText}>Tomorrow 11 AM</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.inlineQuickChip} onPress={() => setQuickDate(2, '02:00 PM')}>
          <Text style={styles.inlineQuickChipText}>In 2 Days 2 PM</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.inlineQuickChip} onPress={() => setQuickDate(4, '10:00 AM')}>
          <Text style={styles.inlineQuickChipText}>Next Week 10 AM</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.inlineFieldLabel}>Date</Text>
          <TextInput
            style={styles.inlineInput}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inlineFieldLabel}>Time</Text>
          <TextInput
            style={styles.inlineInput}
            value={time}
            onChangeText={setTime}
            placeholder="11:00 AM"
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      <Text style={styles.inlineFieldLabel}>{mode === 'Online Demo' ? 'Online Meeting Link' : 'Location'}</Text>
      <TextInput
        style={styles.inlineInput}
        value={location}
        onChangeText={setLocation}
        placeholder={mode === 'Online Demo' ? 'https://meet.google.com/...' : 'Campus Conference Room'}
        placeholderTextColor="#94A3B8"
      />

      <Text style={styles.inlineFieldLabel}>Meeting Notes / Agenda</Text>
      <TextInput
        style={[styles.inlineInput, { height: 46, textAlignVertical: 'top' }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Discussion objectives..."
        placeholderTextColor="#94A3B8"
        multiline
      />

      <TouchableOpacity
        style={styles.inlineSubmitBtn}
        activeOpacity={0.8}
        onPress={() => onSubmit && onSubmit({ lead, date, time, mode, location, notes })}
      >
        <Feather name="check-circle" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.inlineSubmitBtnText}>Review & Confirm Meeting</Text>
      </TouchableOpacity>
    </View>
  );
}

function InlineNoteInput({ lead, onSubmit }) {
  const [noteText, setNoteText] = useState('');

  return (
    <View style={styles.inlineFormCard}>
      <View style={styles.inlineFormHeader}>
        <Feather name="edit-3" size={15} color="#059669" style={{ marginRight: 6 }} />
        <Text style={styles.inlineFormTitle}>Add Note: {lead?.schoolName || lead?.school_name}</Text>
      </View>
      <TextInput
        style={[styles.inlineInput, { height: 56, textAlignVertical: 'top', marginTop: 8 }]}
        value={noteText}
        onChangeText={setNoteText}
        placeholder="Type note or comment to record in CRM..."
        placeholderTextColor="#94A3B8"
        multiline
      />
      <TouchableOpacity
        style={[styles.inlineSubmitBtn, { backgroundColor: '#059669' }]}
        activeOpacity={0.8}
        onPress={() => {
          if (noteText.trim()) {
            onSubmit && onSubmit(lead, noteText.trim());
          } else {
            Alert.alert('Notice', 'Please enter a note before saving.');
          }
        }}
      >
        <Feather name="save" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.inlineSubmitBtnText}>Save Note to CRM</Text>
      </TouchableOpacity>
    </View>
  );
}

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnim = (dot, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -5,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.delay(400),
        ])
      );
    };

    const a1 = createAnim(dot1, 0);
    const a2 = createAnim(dot2, 200);
    const a3 = createAnim(dot3, 400);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  messageRow: {
    marginBottom: 16,
  },
  userBubbleContainer: {
    alignItems: 'flex-end',
  },
  userBubble: {
    backgroundColor: COLORS.brandEmerald,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
    shadowColor: COLORS.brandEmerald,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    marginRight: 4,
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
    width: '100%',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COLORS.brandMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  aiAvatarText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.brandDark,
    fontStyle: 'italic',
  },
  aiNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginRight: 6,
  },
  agenticBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.brandGreen,
    marginRight: 4,
  },
  agenticText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  aiText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  leadCardContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  schoolName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 10,
  },
  boardBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  boardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  scoreBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  dbIdBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dbIdText: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  latestNoteCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    marginBottom: 6,
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteAiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  noteAiPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  latestNoteTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#065F46',
  },
  latestNoteBody: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#1E293B',
  },
  followupTasksBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
  },
  followupBoxTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  taskMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  taskMiniText: {
    fontSize: 11,
    color: '#334155',
  },
  leadActionsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  leadActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  emailBtn: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  waBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  callBtn: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  proposalBtn: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  btnEditLead: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  btnProposal: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  btnEditProposal: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  btnMeetingDone: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  tinyPurpleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C3AED',
    marginRight: 4,
  },
  btnScheduleMeeting: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  btnTicket: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  btnFollowup: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  btnDocs: {
    backgroundColor: '#ECFEFF',
    borderColor: '#A5F3FC',
  },
  btnMail: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  btnView: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  btnWa: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  btnAssign: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  btnNote: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  btnDelete: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
  },
  btnLostLead: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F43F5E',
  },
  btnArchive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#94A3B8',
  },
  leadActionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  tinyGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 4,
  },
  btnMeetingLocked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  leadLostBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  leadLostTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  leadLostDescription: {
    fontSize: 11,
    color: '#7F1D1D',
    lineHeight: 15,
  },
  leadDeletedBanner: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  leadDeletedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  leadDeletedDescription: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  leadArchivedBanner: {
    backgroundColor: '#F8FAFC',
    borderColor: '#94A3B8',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  leadArchivedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  leadArchivedDescription: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  archivedButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnUnarchive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  btnUnarchiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  btnDeleteArchive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
  },
  btnDeleteArchiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  pipelineContainer: {
    marginTop: 8,
  },
  pipelineItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  pipeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pipeSchool: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  urgencyTag: {
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  pipeCampus: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pipeTask: {
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '500',
    marginTop: 6,
  },
  proposalContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  proposalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  proposalTier: {
    fontSize: 12.5,
    color: '#4F46E5',
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  moduleItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  priceContainer: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  priceText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#065F46',
  },
  schoolsListContainer: {
    marginTop: 6,
  },
  schoolItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  schoolBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
    marginRight: 10,
  },
  schoolItemName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  schoolItemDetail: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  statusPillSmall: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  emailContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  emailSubject: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emailTo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emailBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandEmerald,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  aiAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: COLORS.brandMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  aiAvatarSmallText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.brandDark,
    fontStyle: 'italic',
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 36,
    justifyContent: 'space-between',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  // ── Conversational Confirmation Card ───────────────────────────────────────
  confirmationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmationCardPrimary: {
    borderColor: '#BBF7D0',
    backgroundColor: '#FAFCFA',
  },
  confirmationCardDanger: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  confirmationCardConfirmed: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  confirmationCardCancelled: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    opacity: 0.85,
  },
  confirmHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  confirmIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  confirmIconPrimary: {
    backgroundColor: '#ECFDF5',
  },
  confirmIconDanger: {
    backgroundColor: '#FEE2E2',
  },
  confirmTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  confirmDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  confirmDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  confirmDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  confirmDetailLabel: {
    width: 100,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmDetailValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  confirmBtnPrimary: {
    backgroundColor: '#059669',
  },
  confirmBtnDanger: {
    backgroundColor: '#DC2626',
  },
  confirmBtnCancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmBtnCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  confirmStatusBannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  confirmStatusTextSuccess: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  confirmStatusBannerCancelled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  confirmStatusTextCancelled: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  // ── Disambiguation Card ────────────────────────────────────────────────────
  disambiguationBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    padding: 14,
    marginTop: 10,
  },
  disambigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  disambigTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369A1',
  },
  disambigSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 8,
  },
  disambigList: {
    gap: 6,
  },
  disambigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
  },
  disambigSchoolName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  disambigSchoolMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // ── Inline Interactive Form Cards ──────────────────────────────────────────
  inlineFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 10,
  },
  inlineFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inlineFormTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  inlineFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 6,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  inlinePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  inlinePill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inlinePillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  inlinePillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  inlinePillTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  inlineQuickChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  inlineQuickChipText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  inlineInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12.5,
    color: '#0F172A',
  },
  inlineSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 10,
  },
  inlineSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── CRM Activity Log & Comments History in Lead Card ───────────────────────
  activityLogContainer: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    marginBottom: 6,
  },
  activityLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  activityLogTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#065F46',
  },
  activityLogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 3,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  activityLogBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
    marginTop: 6,
    marginRight: 6,
  },
  activityLogText: {
    fontSize: 11.5,
    color: '#1E293B',
    lineHeight: 16,
  },
  activityLogMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },

  // ── Task Management Cards Styles ──────────────────────────────────────────
  taskListCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 10,
    marginBottom: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  taskListHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskListIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskListTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  taskListSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  emptyTaskState: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyTaskText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  taskItemContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 8,
  },
  taskItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  taskCodeBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  taskCodeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.3,
  },
  taskBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  taskBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  taskItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 17,
  },
  taskItemDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 3,
    lineHeight: 15,
  },
  taskItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  taskMetaCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskMetaText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  taskActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  taskActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  taskBtnComplete: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  taskBtnStart: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  taskBtnComment: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  taskBtnDelete: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
  },
  taskActionBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  inlineCommentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  inlineCommentInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11.5,
    color: '#0F172A',
  },
  sendCommentBtn: {
    backgroundColor: '#059669',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sendCommentBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  singleTaskWrapper: {
    marginTop: 8,
    marginBottom: 6,
  },
  taskCreationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 10,
    marginBottom: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskCreationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  taskCreationIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCreationTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  taskCreationSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
  },
  taskCreationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 6,
  },
  taskCreationInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12.5,
    color: '#0F172A',
  },
  pillSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  selectorPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectorPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  selectorPillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  selectorPillTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  createTaskSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 9,
    marginTop: 12,
  },
  createTaskSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
