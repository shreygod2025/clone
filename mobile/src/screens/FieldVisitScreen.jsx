import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Image,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';

// Format helper
const formatDate = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
};

const formatTime = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * PhotoCardWithUserAttached
 * Renders an uploaded Cloudinary image with the user's name, role/email,
 * timestamp, and notes attached directly below it.
 */
function PhotoCardWithUserAttached({
  photoUrl,
  userName,
  userEmail,
  timestamp,
  locationLabel,
  notes,
  tagLabel = 'Check-in Photo',
  onPressImage,
}) {
  const initials = getInitials(userName || userEmail || 'User');

  return (
    <View style={styles.attachedCardContainer}>
      {/* Top Photo Header / Tag */}
      <View style={styles.attachedCardHeader}>
        <View style={styles.attachedTagPill}>
          <Feather name="camera" size={11} color="#059669" style={{ marginRight: 4 }} />
          <Text style={styles.attachedTagText}>{tagLabel}</Text>
        </View>
      </View>

      {/* The Photo Container */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPressImage}
        style={styles.attachedImageWrapper}
      >
        <Image
          source={{ uri: photoUrl }}
          style={styles.attachedImage}
          resizeMode="cover"
        />
        <View style={styles.zoomPill}>
          <Feather name="maximize-2" size={11} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* User Name & Details Attached Directly Below Photo */}
      <View style={styles.attachedUserBar}>
        <View style={styles.attachedUserRow}>
          <View style={styles.attachedAvatar}>
            <Text style={styles.attachedAvatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.attachedUserName}>{userName || 'Bhumi Sanghvi'}</Text>
              <View style={styles.verifiedCheckCircle}>
                <Ionicons name="checkmark" size={9} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.attachedUserEmail} numberOfLines={1}>
              {userEmail || 'founderoffice@oll.co'}
            </Text>
          </View>
        </View>

        {/* Timestamp strip */}
        <View style={styles.attachedMetaGrid}>
          {timestamp ? (
            <View style={styles.attachedMetaItem}>
              <Feather name="clock" size={11} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.attachedMetaText}>{formatDate(timestamp)} • {formatTime(timestamp)}</Text>
            </View>
          ) : null}
        </View>

        {notes ? (
          <View style={styles.attachedNotesBox}>
            <Text style={styles.attachedNotesText}>"{notes}"</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function FieldVisitScreen({ user, onBackToChat, onLogout }) {
  // Navigation sub-tabs matching screenshot: 'My Field Day', 'Reports', 'Calendar'
  const [subTab, setSubTab] = useState('field_day'); // 'field_day' | 'reports' | 'calendar'

  // Data states
  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check-In Form / Modal states
  const [checkinModalVisible, setCheckinModalVisible] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Mumbai, Maharashtra');
  const [checkinNotes, setCheckinNotes] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [selectedImageAsset, setSelectedImageAsset] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadedCloudinaryUrl, setUploadedCloudinaryUrl] = useState(null);
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);

  // Add School Visit Modal states
  const [visitModalVisible, setVisitModalVisible] = useState(false);
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);
  const [visitSchoolName, setVisitSchoolName] = useState('');
  const [visitCity, setVisitCity] = useState('Mumbai');
  const [visitContactName, setVisitContactName] = useState('');
  const [visitContactRole, setVisitContactRole] = useState('Principal');
  const [visitContactPhone, setVisitContactPhone] = useState('');
  const [visitContactEmail, setVisitContactEmail] = useState('');
  const [visitBoard, setVisitBoard] = useState('CBSE');
  const [visitStudentCount, setVisitStudentCount] = useState('500-1000');
  const [visitHasRobotics, setVisitHasRobotics] = useState('no');
  const [visitRoboticsProvider, setVisitRoboticsProvider] = useState('');
  const [visitLeadInterested, setVisitLeadInterested] = useState('yes');
  const [visitNotes, setVisitNotes] = useState('');
  const [visitPhotoUri, setVisitPhotoUri] = useState(null);
  const [visitUploadedPhotoUrl, setVisitUploadedPhotoUrl] = useState(null);
  const [isUploadingVisitPhoto, setIsUploadingVisitPhoto] = useState(false);

  // Check Out Modal states
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);

  // Fullscreen Image preview
  const [previewImageModal, setPreviewImageModal] = useState({
    visible: false,
    url: null,
    title: '',
  });

  // Current user info
  const currentUserName = user?.name || user?.full_name || 'Bhumi Sanghvi';
  const currentUserEmail = user?.email || 'founderoffice@oll.co';

  // Load field reports
  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.fetchFieldReports();
      if (res.success && Array.isArray(res.reports)) {
        setReports(res.reports);
        // Find active report (not checked out)
        const openReport = res.reports.find((r) => !r.check_out);
        setActiveReport(openReport || null);
      }
    } catch (err) {
      console.error('[FieldVisitScreen] Error fetching field reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReports();
  }, [loadReports]);

  // Launch Camera or Gallery
  const handlePickPhoto = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'Please allow camera access to take your check-in selfie.'
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Photo Library Permission',
            'Please grant permission to select photos from your device.'
          );
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImageUri(asset.uri);
        setSelectedImageAsset(asset);

        // Upload to Cloudinary immediately
        setIsUploadingPhoto(true);
        const uploadRes = await api.uploadPhotoToCloudinary(asset);
        setIsUploadingPhoto(false);

        if (uploadRes.success && uploadRes.url) {
          setUploadedCloudinaryUrl(uploadRes.url);
        } else {
          Alert.alert('Upload Error', uploadRes.error || 'Failed to upload photo to Cloudinary');
        }
      }
    } catch (err) {
      setIsUploadingPhoto(false);
      console.error('[FieldVisitScreen] Error selecting image:', err);
      Alert.alert('Error', 'Unable to pick photo: ' + err.message);
    }
  };

  // Check-In submission
  const handleSubmitCheckin = async () => {
    if (!uploadedCloudinaryUrl && !selectedImageUri) {
      Alert.alert('Photo Required', 'Please take or upload a photo to start your field day.');
      return;
    }

    setIsSubmittingCheckin(true);
    let finalPhotoUrl = uploadedCloudinaryUrl;

    // If not yet uploaded, upload now
    if (!finalPhotoUrl && selectedImageAsset) {
      setIsUploadingPhoto(true);
      const uploadRes = await api.uploadPhotoToCloudinary(selectedImageAsset);
      setIsUploadingPhoto(false);
      if (uploadRes.success && uploadRes.url) {
        finalPhotoUrl = uploadRes.url;
      }
    }

    const checkinData = {
      photo_url: finalPhotoUrl || selectedImageUri,
      location_label: locationLabel || 'Mumbai, Maharashtra',
      latitude: 19.0760,
      longitude: 72.8777,
      notes: checkinNotes.trim(),
    };

    const res = await api.createFieldCheckin(checkinData);
    setIsSubmittingCheckin(false);

    if (res.success && res.report) {
      setActiveReport(res.report);
      setReports((prev) => [res.report, ...prev]);
      setCheckinModalVisible(false);
      setSelectedImageUri(null);
      setSelectedImageAsset(null);
      setUploadedCloudinaryUrl(null);
      setCheckinNotes('');
      Alert.alert(
        'Check-In Successful',
        `Field Day started for ${currentUserName}. Photo stored in Cloudinary.`
      );
    } else {
      Alert.alert('Check-In Failed', res.error || 'Could not save check-in.');
    }
  };

  // Visit photo upload
  const handlePickVisitPhoto = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Camera Permission Required', 'Please enable camera access.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setVisitPhotoUri(asset.uri);

        setIsUploadingVisitPhoto(true);
        const uploadRes = await api.uploadPhotoToCloudinary(asset);
        setIsUploadingVisitPhoto(false);

        if (uploadRes.success && uploadRes.url) {
          setVisitUploadedPhotoUrl(uploadRes.url);
        } else {
          Alert.alert('Upload Error', uploadRes.error || 'Failed to upload visit photo to Cloudinary');
        }
      }
    } catch (err) {
      setIsUploadingVisitPhoto(false);
      Alert.alert('Error', err.message);
    }
  };

  // Add School Visit submission
  const handleSubmitSchoolVisit = async () => {
    if (!visitSchoolName.trim()) {
      Alert.alert('School Name Required', 'Please enter the visited school name.');
      return;
    }
    if (!activeReport) {
      Alert.alert('No Active Session', 'Please check in first to log a school visit.');
      return;
    }

    setIsSubmittingVisit(true);
    const visitPayload = {
      school_name: visitSchoolName.trim(),
      city: visitCity.trim(),
      board: visitBoard,
      student_count: visitStudentCount,
      fees_range: '₹30,000 - ₹80,000',
      has_robotics: visitHasRobotics,
      robotics_provider: visitHasRobotics === 'yes' ? visitRoboticsProvider : null,
      got_entry: 'yes',
      lead_interested: visitLeadInterested,
      met_with: visitContactName.trim() || 'Principal',
      products_interested: ['Agentic AI & Coding Excellence Lab (K-12)'],
      notes: visitNotes.trim(),
      photo_url: visitUploadedPhotoUrl || visitPhotoUri || null,
      contacts: [
        {
          name: visitContactName.trim() || 'School Representative',
          role: visitContactRole || 'Principal',
          phone: visitContactPhone.trim() || '',
          email: visitContactEmail.trim() || '',
        },
      ],
    };

    const res = await api.addFieldSchoolVisit(activeReport.id, visitPayload);
    setIsSubmittingVisit(false);

    if (res.success && res.visit) {
      // Update local state
      const updatedVisits = [...(activeReport.school_visits || []), res.visit];
      const updatedReport = { ...activeReport, school_visits: updatedVisits };
      setActiveReport(updatedReport);
      setReports((prev) =>
        prev.map((r) => (r.id === activeReport.id ? updatedReport : r))
      );
      setVisitModalVisible(false);
      // Reset form
      setVisitSchoolName('');
      setVisitContactName('');
      setVisitContactPhone('');
      setVisitContactEmail('');
      setVisitNotes('');
      setVisitPhotoUri(null);
      setVisitUploadedPhotoUrl(null);

      Alert.alert(
        'School Visit Logged',
        `Visit to ${visitPayload.school_name} logged successfully by ${currentUserName}.${
          visitLeadInterested === 'yes' ? ' Lead automatically synced to School CRM.' : ''
        }`
      );
    } else {
      Alert.alert('Error', res.error || 'Failed to save school visit');
    }
  };

  // Checkout submission
  const handleSubmitCheckout = async () => {
    if (!activeReport) return;
    setIsSubmittingCheckout(true);

    const res = await api.checkoutFieldReport(activeReport.id, {
      end_notes: checkoutNotes.trim() || 'Field day concluded successfully',
      latitude: 19.0760,
      longitude: 72.8777,
    });
    setIsSubmittingCheckout(false);

    if (res.success && res.report) {
      setActiveReport(null);
      setReports((prev) =>
        prev.map((r) => (r.id === activeReport.id ? res.report : r))
      );
      setCheckoutModalVisible(false);
      setCheckoutNotes('');
      Alert.alert(
        'Field Day Completed',
        `Good work, ${currentUserName}! Total distance: ${res.report.distance_km || 0} km.`
      );
    } else {
      Alert.alert('Checkout Failed', res.error || 'Could not conclude day.');
    }
  };

  // Delete a school visit
  const handleDeleteVisit = async (visitId, schoolName) => {
    if (!activeReport) return;
    Alert.alert(
      'Delete Visit',
      `Are you sure you want to delete the visit for "${schoolName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await api.deleteFieldSchoolVisit(activeReport.id, visitId);
            if (res.success) {
              const filtered = (activeReport.school_visits || []).filter(
                (v) => v.id !== visitId
              );
              const updated = { ...activeReport, school_visits: filtered };
              setActiveReport(updated);
              setReports((prev) =>
                prev.map((r) => (r.id === activeReport.id ? updated : r))
              );
            } else {
              Alert.alert('Error', res.error || 'Failed to delete visit');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Top Header matching Screenshot ──────────────────────────────────── */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeftRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.backButton}
            onPress={onBackToChat}
            accessibilityLabel="Back to AI Chat"
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerPinCircle}>
            <Ionicons name="location" size={17} color="#059669" />
          </View>
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.headerTitle}>Field Reports</Text>
            <Text style={styles.headerSubtitle}>Log daily visits & Cloudinary photos</Text>
          </View>
        </View>

        <View style={styles.headerRightRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.logoutBtn}
            onPress={onLogout}
            accessibilityLabel="Logout"
          >
            <Feather name="log-out" size={12} color="#EF4444" style={{ marginRight: 4 }} />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Sub-Tabs Nav: My Field Day | Reports | Calendar ─────────────────── */}
      <View style={styles.subTabsContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.subTabPill, subTab === 'field_day' && styles.subTabPillActive]}
          onPress={() => setSubTab('field_day')}
        >
          <Ionicons
            name="walk-outline"
            size={14}
            color={subTab === 'field_day' ? '#059669' : '#64748B'}
            style={{ marginRight: 5 }}
          />
          <Text
            style={[
              styles.subTabLabel,
              subTab === 'field_day' && styles.subTabLabelActive,
            ]}
          >
            My Field Day
          </Text>
          {activeReport ? (
            <View style={styles.activeDot} />
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.subTabPill, subTab === 'reports' && styles.subTabPillActive]}
          onPress={() => setSubTab('reports')}
        >
          <Ionicons
            name="document-text-outline"
            size={14}
            color={subTab === 'reports' ? '#059669' : '#64748B'}
            style={{ marginRight: 5 }}
          />
          <Text
            style={[
              styles.subTabLabel,
              subTab === 'reports' && styles.subTabLabelActive,
            ]}
          >
            Reports
          </Text>
          {reports.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{reports.length}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.subTabPill, subTab === 'calendar' && styles.subTabPillActive]}
          onPress={() => setSubTab('calendar')}
        >
          <Ionicons
            name="calendar-outline"
            size={14}
            color={subTab === 'calendar' ? '#059669' : '#64748B'}
            style={{ marginRight: 5 }}
          />
          <Text
            style={[
              styles.subTabLabel,
              subTab === 'calendar' && styles.subTabLabelActive,
            ]}
          >
            Calendar
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Main Content Area ────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading field day data...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#059669']}
              tintColor="#059669"
            />
          }
        >
          {/* ═════════ TAB 1: MY FIELD DAY ═════════ */}
          {subTab === 'field_day' && (
            <View style={styles.tabContentWrapper}>
              {!activeReport ? (
                /* ── SCREENSHOT 1:1 MATCH: "Ready to hit the field?" Card ── */
                <View style={styles.readyCard}>
                  <View style={styles.readyPinCircle}>
                    <Ionicons name="location-outline" size={46} color="#CBD5E1" />
                  </View>

                  <Text style={styles.readyTitle}>Ready to hit the field?</Text>
                  <Text style={styles.readySubtitle}>
                    Check in with a photo to start logging school visits.
                  </Text>

                  {/* Logged in User Tag */}
                  <View style={styles.readyUserTag}>
                    <View style={styles.readyUserAvatar}>
                      <Text style={styles.readyUserAvatarText}>{getInitials(currentUserName)}</Text>
                    </View>
                    <View>
                      <Text style={styles.readyUserNameText}>{currentUserName}</Text>
                      <Text style={styles.readyUserEmailText}>{currentUserEmail}</Text>
                    </View>
                  </View>

                  {/* Check In Button */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.checkInMainBtn}
                    onPress={() => {
                      setCheckinModalVisible(true);
                    }}
                  >
                    <Feather name="camera" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.checkInMainBtnText}>Check In (click photo)</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* ── ACTIVE FIELD DAY IN PROGRESS ── */
                <View style={styles.activeDayContainer}>
                  {/* Status Banner */}
                  <View style={styles.activeDayBanner}>
                    <View style={styles.activeBannerTopRow}>
                      <View style={styles.liveIndicatorRow}>
                        <View style={styles.pulsingGreenDot} />
                        <Text style={styles.liveBannerTitle}>Active Field Day</Text>
                      </View>
                      <View style={styles.activeTagPill}>
                        <Text style={styles.activeTagPillText}>IN PROGRESS</Text>
                      </View>
                    </View>

                    {/* Stats strip */}
                    <View style={styles.activeMetricsRow}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>
                          {activeReport.school_visits?.length || 0}
                        </Text>
                        <Text style={styles.metricLabel}>Schools Visited</Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>
                          {activeReport.distance_km ? `${activeReport.distance_km} km` : '0.0 km'}
                        </Text>
                        <Text style={styles.metricLabel}>Distance</Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>
                          {formatTime(activeReport.check_in?.at)}
                        </Text>
                        <Text style={styles.metricLabel}>Checked In</Text>
                      </View>
                    </View>
                  </View>

                  {/* Check-In Photo Card with USER NAME ATTACHED BELOW IT */}
                  {activeReport.check_in?.photo_url ? (
                    <View style={{ marginVertical: 14 }}>
                      <Text style={styles.sectionHeading}>Check-In Photo & User Identity</Text>
                      <PhotoCardWithUserAttached
                        photoUrl={activeReport.check_in.photo_url}
                        userName={activeReport.user_name || currentUserName}
                        userEmail={activeReport.user_email || currentUserEmail}
                        timestamp={activeReport.check_in.at}
                        locationLabel={activeReport.check_in.location_label}
                        notes={activeReport.check_in.notes}
                        tagLabel="Field Day Check-In"
                        onPressImage={() =>
                          setPreviewImageModal({
                            visible: true,
                            url: activeReport.check_in.photo_url,
                            title: `Check-In by ${activeReport.user_name || currentUserName}`,
                          })
                        }
                      />
                    </View>
                  ) : null}

                  {/* Action Buttons: Log School Visit & Checkout */}
                  <View style={styles.activeActionsRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.addVisitBtn}
                      onPress={() => setVisitModalVisible(true)}
                    >
                      <Feather name="plus-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.addVisitBtnText}>Log School Visit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.checkoutBtn}
                      onPress={() => setCheckoutModalVisible(true)}
                    >
                      <Feather name="log-out" size={15} color="#DC2626" style={{ marginRight: 5 }} />
                      <Text style={styles.checkoutBtnText}>Check Out (End Day)</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Logged School Visits List */}
                  <View style={styles.visitsSection}>
                    <View style={styles.visitsSectionHeader}>
                      <Text style={styles.sectionHeading}>
                        Logged School Visits ({activeReport.school_visits?.length || 0})
                      </Text>
                    </View>

                    {(!activeReport.school_visits || activeReport.school_visits.length === 0) ? (
                      <View style={styles.emptyVisitsBox}>
                        <Ionicons name="school-outline" size={32} color="#94A3B8" />
                        <Text style={styles.emptyVisitsTitle}>No School Visits Logged Yet</Text>
                        <Text style={styles.emptyVisitsSub}>
                          Tap "+ Log School Visit" above to log a school visit with details and photos.
                        </Text>
                      </View>
                    ) : (
                      activeReport.school_visits.map((visit, idx) => (
                        <View key={visit.id || idx} style={styles.visitCard}>
                          <View style={styles.visitCardTop}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.visitSchoolName}>{visit.school_name}</Text>
                                {visit.lead_interested === 'yes' && (
                                  <View style={styles.interestedPill}>
                                    <Text style={styles.interestedPillText}>Interested</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.visitCityText}>
                                📍 {visit.city || 'Mumbai'} • {visit.board || 'CBSE'}
                              </Text>
                            </View>

                            <TouchableOpacity
                              activeOpacity={0.7}
                              style={styles.deleteVisitBtn}
                              onPress={() => handleDeleteVisit(visit.id, visit.school_name)}
                            >
                              <Feather name="trash-2" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>

                          {/* Contact Details */}
                          {(visit.contacts && visit.contacts[0]) ? (
                            <View style={styles.visitContactRow}>
                              <Feather name="user" size={12} color="#475569" style={{ marginRight: 4 }} />
                              <Text style={styles.visitContactText}>
                                {visit.contacts[0].name} ({visit.contacts[0].role || 'Contact'}) • {visit.contacts[0].phone || 'No phone'}
                              </Text>
                            </View>
                          ) : null}

                          {/* Notes */}
                          {visit.notes ? (
                            <View style={styles.visitNotesRow}>
                              <Text style={styles.visitNotesText}>"{visit.notes}"</Text>
                            </View>
                          ) : null}

                          {/* School Visit Photo with User Name Attached */}
                          {visit.photo_url ? (
                            <View style={{ marginTop: 10 }}>
                              <PhotoCardWithUserAttached
                                photoUrl={visit.photo_url}
                                userName={currentUserName}
                                userEmail={currentUserEmail}
                                timestamp={visit.at}
                                locationLabel={visit.school_name}
                                tagLabel="School Visit Photo"
                                onPressImage={() =>
                                  setPreviewImageModal({
                                    visible: true,
                                    url: visit.photo_url,
                                    title: `Visit: ${visit.school_name}`,
                                  })
                                }
                              />
                            </View>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ═════════ TAB 2: REPORTS HISTORY ═════════ */}
          {subTab === 'reports' && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.historyHeaderRow}>
                <Text style={styles.sectionHeading}>Field Reports Log ({reports.length})</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.refreshBtn}
                  onPress={loadReports}
                >
                  <Feather name="refresh-cw" size={13} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.refreshBtnText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {reports.length === 0 ? (
                <View style={styles.emptyVisitsBox}>
                  <Ionicons name="folder-open-outline" size={38} color="#94A3B8" />
                  <Text style={styles.emptyVisitsTitle}>No Field Reports Yet</Text>
                  <Text style={styles.emptyVisitsSub}>
                    Start your first field day on the "My Field Day" tab!
                  </Text>
                </View>
              ) : (
                reports.map((item) => {
                  const isClosed = Boolean(item.check_out);
                  const visitsCount = item.school_visits?.length || 0;

                  return (
                    <View key={item.id} style={styles.reportHistoryCard}>
                      {/* Top Row: User & Status */}
                      <View style={styles.reportTopRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={styles.attachedAvatar}>
                            <Text style={styles.attachedAvatarText}>
                              {getInitials(item.user_name || item.user_email || 'U')}
                            </Text>
                          </View>
                          <View style={{ marginLeft: 9 }}>
                            <Text style={styles.reportUserName}>{item.user_name || 'Team Member'}</Text>
                            <Text style={styles.reportDateText}>
                              {formatDate(item.created_at)} • {formatTime(item.check_in?.at)}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.reportStatusBadge,
                            isClosed ? styles.statusBadgeClosed : styles.statusBadgeOpen,
                          ]}
                        >
                          <Text
                            style={[
                              styles.reportStatusText,
                              isClosed ? styles.statusTextClosed : styles.statusTextOpen,
                            ]}
                          >
                            {isClosed ? 'Completed' : 'Active'}
                          </Text>
                        </View>
                      </View>

                      {/* Metrics Strip */}
                      <View style={styles.reportMetricsStrip}>
                        <View style={styles.reportMetricCell}>
                          <Text style={styles.reportMetricNum}>{visitsCount}</Text>
                          <Text style={styles.reportMetricLabel}>Visits</Text>
                        </View>
                        <View style={styles.reportMetricDivider} />
                        <View style={styles.reportMetricCell}>
                          <Text style={styles.reportMetricNum}>
                            {item.distance_km ? `${item.distance_km} km` : '0.0 km'}
                          </Text>
                          <Text style={styles.reportMetricLabel}>Distance</Text>
                        </View>
                        <View style={styles.reportMetricDivider} />
                        <View style={styles.reportMetricCell}>
                          <Text style={styles.reportMetricNum}>
                            {item.check_in?.location_label?.split(',')[0] || 'Mumbai'}
                          </Text>
                          <Text style={styles.reportMetricLabel}>Region</Text>
                        </View>
                      </View>

                      {/* Attached Check-In Photo Card with User Name */}
                      {item.check_in?.photo_url ? (
                        <View style={{ marginTop: 10 }}>
                          <PhotoCardWithUserAttached
                            photoUrl={item.check_in.photo_url}
                            userName={item.user_name}
                            userEmail={item.user_email}
                            timestamp={item.check_in.at}
                            locationLabel={item.check_in.location_label}
                            notes={item.check_in.notes}
                            tagLabel="Check-In Photo"
                            onPressImage={() =>
                              setPreviewImageModal({
                                visible: true,
                                url: item.check_in.photo_url,
                                title: `Report by ${item.user_name}`,
                              })
                            }
                          />
                        </View>
                      ) : null}

                      {/* Visited Schools Chips */}
                      {visitsCount > 0 && (
                        <View style={styles.historyVisitsList}>
                          <Text style={styles.historyVisitsTitle}>Schools Visited:</Text>
                          <View style={styles.historyVisitsChipsRow}>
                            {item.school_visits.map((sv, sIdx) => (
                              <View key={sv.id || sIdx} style={styles.historySchoolChip}>
                                <Ionicons name="school" size={11} color="#059669" style={{ marginRight: 4 }} />
                                <Text style={styles.historySchoolChipText}>{sv.school_name}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ═════════ TAB 3: CALENDAR VIEW ═════════ */}
          {subTab === 'calendar' && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeaderRow}>
                  <Text style={styles.sectionHeading}>Field Visits Calendar</Text>
                  <View style={styles.currentMonthBadge}>
                    <Text style={styles.currentMonthText}>November 2026</Text>
                  </View>
                </View>

                {/* Summary stats */}
                <View style={styles.calendarStatsRow}>
                  <View style={styles.calendarStatBox}>
                    <Text style={styles.calendarStatNum}>{reports.length}</Text>
                    <Text style={styles.calendarStatLabel}>Field Days</Text>
                  </View>
                  <View style={styles.calendarStatBox}>
                    <Text style={styles.calendarStatNum}>
                      {reports.reduce((acc, r) => acc + (r.school_visits?.length || 0), 0)}
                    </Text>
                    <Text style={styles.calendarStatLabel}>Total Visits</Text>
                  </View>
                  <View style={styles.calendarStatBox}>
                    <Text style={styles.calendarStatNum}>
                      {reports.reduce((acc, r) => acc + (r.distance_km || 0), 0).toFixed(1)} km
                    </Text>
                    <Text style={styles.calendarStatLabel}>Total Distance</Text>
                  </View>
                </View>

                {/* Day Agenda List */}
                <View style={styles.calendarAgendaList}>
                  <Text style={styles.agendaHeading}>Recent Activity Timeline</Text>
                  {reports.slice(0, 5).map((r, i) => (
                    <View key={r.id || i} style={styles.agendaItem}>
                      <View style={styles.agendaDateBox}>
                        <Text style={styles.agendaDateDay}>
                          {new Date(r.created_at).getDate()}
                        </Text>
                        <Text style={styles.agendaDateMonth}>
                          {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short' })}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.agendaItemTitle}>
                          {r.user_name || currentUserName}
                        </Text>
                        <Text style={styles.agendaItemSub}>
                          {r.school_visits?.length || 0} schools visited • {r.distance_km || 0} km logged
                        </Text>
                      </View>
                      {r.check_in?.photo_url && (
                        <Image
                          source={{ uri: r.check_in.photo_url }}
                          style={styles.agendaThumbnail}
                        />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── MODAL 1: Check-In with Photo Modal ──────────────────────────────── */}
      <Modal
        visible={checkinModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCheckinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.modalIconWrap}>
                  <Feather name="camera" size={16} color="#059669" />
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.modalTitle}>Field Day Check-In</Text>
                  <Text style={styles.modalSubtitle}>Attach photo & user identity</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setCheckinModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {/* User Identity Preview */}
              <View style={styles.modalUserIdentityStrip}>
                <View style={styles.attachedAvatar}>
                  <Text style={styles.attachedAvatarText}>{getInitials(currentUserName)}</Text>
                </View>
                <View style={{ marginLeft: 9, flex: 1 }}>
                  <Text style={styles.modalUserName}>{currentUserName}</Text>
                  <Text style={styles.modalUserRole}>{currentUserEmail} • Founder's Office</Text>
                </View>
              </View>

              {/* Photo Preview or Selection Area */}
              {selectedImageUri || uploadedCloudinaryUrl ? (
                <View style={{ marginVertical: 10 }}>
                  <PhotoCardWithUserAttached
                    photoUrl={uploadedCloudinaryUrl || selectedImageUri}
                    userName={currentUserName}
                    userEmail={currentUserEmail}
                    timestamp={new Date().toISOString()}
                    tagLabel="Live Check-In Selfie"
                  />
                  {isUploadingPhoto && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.uploadingText}>Saving photo...</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.retakeBtn}
                    onPress={() => handlePickPhoto(true)}
                  >
                    <Feather name="refresh-cw" size={13} color="#059669" style={{ marginRight: 5 }} />
                    <Text style={styles.retakeBtnText}>Retake Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoPickerBox}>
                  <Ionicons name="camera-outline" size={42} color="#059669" />
                  <Text style={styles.pickerBoxTitle}>Take Photo to Check In</Text>
                  <Text style={styles.pickerBoxSub}>
                    Upload or capture a photo to start your field day.
                  </Text>

                  <View style={styles.pickerActionsRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.cameraBtn}
                      onPress={() => handlePickPhoto(true)}
                    >
                      <Feather name="camera" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.cameraBtnText}>Open Camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.galleryBtn}
                      onPress={() => handlePickPhoto(false)}
                    >
                      <Feather name="image" size={14} color="#475569" style={{ marginRight: 6 }} />
                      <Text style={styles.galleryBtnText}>Choose from Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Notes Field */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Check-in Notes (Optional)</Text>
                <TextInput
                  style={[styles.formInput, { minHeight: 60 }]}
                  value={checkinNotes}
                  onChangeText={setCheckinNotes}
                  placeholder="e.g. Starting South Mumbai school visit tour..."
                  placeholderTextColor="#94A3B8"
                  multiline
                />
              </View>
            </ScrollView>

            {/* Modal Bottom Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCheckinModalVisible(false)}
                disabled={isSubmittingCheckin}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  (!selectedImageUri && !uploadedCloudinaryUrl) && styles.modalSubmitBtnDisabled,
                ]}
                onPress={handleSubmitCheckin}
                disabled={isSubmittingCheckin || (!selectedImageUri && !uploadedCloudinaryUrl)}
              >
                {isSubmittingCheckin ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={styles.modalSubmitText}>Confirm & Start Day</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: Add School Visit Modal ──────────────────────────────────── */}
      <Modal
        visible={visitModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVisitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.modalIconWrap}>
                  <Ionicons name="school" size={16} color="#059669" />
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.modalTitle}>Log School Visit</Text>
                  <Text style={styles.modalSubtitle}>Attach photo & details below</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setVisitModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingVertical: 6 }} showsVerticalScrollIndicator={false}>
              {/* School Name */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>School Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={visitSchoolName}
                  onChangeText={setVisitSchoolName}
                  placeholder="e.g. St. Xavier's High School"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* City & Board */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.formInput}
                    value={visitCity}
                    onChangeText={setVisitCity}
                    placeholder="Mumbai"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Board</Text>
                  <TextInput
                    style={styles.formInput}
                    value={visitBoard}
                    onChangeText={setVisitBoard}
                    placeholder="CBSE / ICSE / IB"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Contact Person Details */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Contact Person</Text>
                  <TextInput
                    style={styles.formInput}
                    value={visitContactName}
                    onChangeText={setVisitContactName}
                    placeholder="Principal / Coordinator"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Contact Role</Text>
                  <TextInput
                    style={styles.formInput}
                    value={visitContactRole}
                    onChangeText={setVisitContactRole}
                    placeholder="Principal"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.formInput}
                    value={visitContactPhone}
                    onChangeText={setVisitContactPhone}
                    placeholder="9876543210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.formInput}
                    value={visitContactEmail}
                    onChangeText={setVisitContactEmail}
                    placeholder="principal@school.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Lead Interested Toggle */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Lead Interested in OLL AI Lab?</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.toggleBtn,
                      visitLeadInterested === 'yes' && styles.toggleBtnActive,
                    ]}
                    onPress={() => setVisitLeadInterested('yes')}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color={visitLeadInterested === 'yes' ? '#FFFFFF' : '#64748B'}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        styles.toggleBtnText,
                        visitLeadInterested === 'yes' && styles.toggleBtnTextActive,
                      ]}
                    >
                      Yes (Sync to CRM)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.toggleBtn,
                      visitLeadInterested === 'no' && styles.toggleBtnActiveRed,
                    ]}
                    onPress={() => setVisitLeadInterested('no')}
                  >
                    <Ionicons
                      name="close-circle"
                      size={15}
                      color={visitLeadInterested === 'no' ? '#FFFFFF' : '#64748B'}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        styles.toggleBtnText,
                        visitLeadInterested === 'no' && styles.toggleBtnTextActive,
                      ]}
                    >
                      No (Dead Lead)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Visit Photo Upload to Cloudinary */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Attach Visit Photo (Cloudinary)</Text>
                {visitPhotoUri || visitUploadedPhotoUrl ? (
                  <View style={{ marginVertical: 6 }}>
                    <PhotoCardWithUserAttached
                      photoUrl={visitUploadedPhotoUrl || visitPhotoUri}
                      userName={currentUserName}
                      userEmail={currentUserEmail}
                      timestamp={new Date().toISOString()}
                      locationLabel={visitSchoolName || 'School Visit'}
                      tagLabel="School Visit Photo"
                    />
                    {isUploadingVisitPhoto && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.uploadingText}>Uploading to Cloudinary...</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.retakeBtn}
                      onPress={() => handlePickVisitPhoto(true)}
                    >
                      <Feather name="refresh-cw" size={13} color="#059669" style={{ marginRight: 5 }} />
                      <Text style={styles.retakeBtnText}>Change Photo</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.pickerActionsRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[styles.cameraBtn, { flex: 1, marginRight: 6 }]}
                      onPress={() => handlePickVisitPhoto(true)}
                    >
                      <Feather name="camera" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                      <Text style={styles.cameraBtnText}>Click Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[styles.galleryBtn, { flex: 1 }]}
                      onPress={() => handlePickVisitPhoto(false)}
                    >
                      <Feather name="image" size={13} color="#475569" style={{ marginRight: 5 }} />
                      <Text style={styles.galleryBtnText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Notes */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Visit & Meeting Notes</Text>
                <TextInput
                  style={[styles.formInput, { minHeight: 70 }]}
                  value={visitNotes}
                  onChangeText={setVisitNotes}
                  placeholder="Key discussion points, demo feedback, decision maker notes..."
                  placeholderTextColor="#94A3B8"
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setVisitModalVisible(false)}
                disabled={isSubmittingVisit}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmitSchoolVisit}
                disabled={isSubmittingVisit}
              >
                {isSubmittingVisit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={styles.modalSubmitText}>Save Visit</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 3: Checkout Modal ─────────────────────────────────────────── */}
      <Modal
        visible={checkoutModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCheckoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.modalIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Feather name="log-out" size={16} color="#DC2626" />
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.modalTitle}>Check Out (End Day)</Text>
                  <Text style={styles.modalSubtitle}>Conclude your field day session</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setCheckoutModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 10 }}>
              <Text style={styles.checkoutPrompt}>
                You logged {activeReport?.school_visits?.length || 0} school visits today.
                Conclude session and calculate total km traveled?
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>End-of-day Summary Notes</Text>
                <TextInput
                  style={[styles.formInput, { minHeight: 70 }]}
                  value={checkoutNotes}
                  onChangeText={setCheckoutNotes}
                  placeholder="e.g. Completed all 4 visits in Bandra, 2 schools requested curriculum proposals."
                  placeholderTextColor="#94A3B8"
                  multiline
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCheckoutModalVisible(false)}
                disabled={isSubmittingCheckout}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleSubmitCheckout}
                disabled={isSubmittingCheckout}
              >
                {isSubmittingCheckout ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={styles.modalSubmitText}>Confirm Check Out</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 4: Fullscreen Image Preview ───────────────────────────────── */}
      <Modal
        visible={previewImageModal.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPreviewImageModal({ visible: false, url: null, title: '' })}
      >
        <View style={styles.previewImageOverlay}>
          <TouchableOpacity
            style={styles.previewCloseBtn}
            onPress={() => setPreviewImageModal({ visible: false, url: null, title: '' })}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {previewImageModal.url && (
            <Image
              source={{ uri: previewImageModal.url }}
              style={styles.previewFullImage}
              resizeMode="contain"
            />
          )}

          <View style={styles.previewCaptionBar}>
            <Text style={styles.previewCaptionTitle}>{previewImageModal.title}</Text>
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

  // ── Top Header matching Screenshot ────────────────────────────────────────
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: 10,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerPinCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Sub Tabs ──────────────────────────────────────────────────────────────
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  subTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  subTabPillActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  subTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabLabelActive: {
    color: '#059669',
    fontWeight: '700',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginLeft: 6,
  },
  countBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 5,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },

  // ── Loading ───────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  // ── Scroll Content ────────────────────────────────────────────────────────
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContentWrapper: {
    width: '100%',
  },

  // ── SCREENSHOT 1:1 MATCH: "Ready to hit the field?" Card ──────────────────
  readyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
    marginTop: 10,
  },
  readyPinCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  readyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  readySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 320,
  },
  readyUserTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 22,
  },
  readyUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  readyUserAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  readyUserNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  readyUserEmailText: {
    fontSize: 10,
    color: '#64748B',
  },
  checkInMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 13,
    minWidth: 220,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  checkInMainBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  readyFooterNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  readyFooterNoteText: {
    fontSize: 11,
    color: '#64748B',
  },

  // ── ACTIVE FIELD DAY STYLES ───────────────────────────────────────────────
  activeDayContainer: {
    width: '100%',
  },
  activeDayBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulsingGreenDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  liveBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeTagPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTagPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  activeMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
  },

  // ── ATTACHED PHOTO CARD WITH USER IDENTITY DIRECTLY BELOW IT ───────────────
  attachedCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  attachedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  attachedTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attachedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  cloudinaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  cloudinaryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  attachedImageWrapper: {
    width: '100%',
    height: 210,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  attachedImage: {
    width: '100%',
    height: '100%',
  },
  zoomPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 14,
    padding: 6,
  },
  // Bar attached below the photo
  attachedUserBar: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  attachedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  attachedAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  attachedUserName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  verifiedCheckCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  attachedUserEmail: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  attachedMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  attachedMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachedMetaText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  attachedNotesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 9,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  attachedNotesText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#334155',
  },

  // ── Active Day Action Buttons ──────────────────────────────────────────────
  activeActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 16,
  },
  addVisitBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  addVisitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  checkoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  checkoutBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Logged Visits Section ─────────────────────────────────────────────────
  visitsSection: {
    marginTop: 6,
  },
  visitsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  emptyVisitsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyVisitsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptyVisitsSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  visitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  visitCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  visitSchoolName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 6,
  },
  visitCityText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  interestedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  interestedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  deleteVisitBtn: {
    padding: 4,
  },
  visitContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  visitContactText: {
    fontSize: 11,
    color: '#475569',
  },
  visitNotesRow: {
    marginTop: 8,
  },
  visitNotesText: {
    fontSize: 11,
    color: '#334155',
    fontStyle: 'italic',
  },

  // ── Reports History Tab ───────────────────────────────────────────────────
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  reportHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  reportUserName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  reportDateText: {
    fontSize: 11,
    color: '#64748B',
  },
  reportStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeOpen: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeClosed: {
    backgroundColor: '#F1F5F9',
  },
  reportStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusTextOpen: {
    color: '#15803D',
  },
  statusTextClosed: {
    color: '#64748B',
  },
  reportMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 8,
    marginVertical: 4,
  },
  reportMetricCell: {
    alignItems: 'center',
  },
  reportMetricNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  reportMetricLabel: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
  },
  reportMetricDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
  },
  historyVisitsList: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  historyVisitsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  historyVisitsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  historySchoolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historySchoolChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#1E293B',
  },

  // ── Calendar Tab ──────────────────────────────────────────────────────────
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  currentMonthBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  currentMonthText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  calendarStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  calendarStatBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarStatNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  calendarStatLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  calendarAgendaList: {
    marginTop: 6,
  },
  agendaHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  agendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  agendaDateBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaDateDay: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  agendaDateMonth: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  agendaItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  agendaItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  agendaThumbnail: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },

  // ── Modals Common Styles ──────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalUserIdentityStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalUserRole: {
    fontSize: 10.5,
    color: '#64748B',
  },
  cloudTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  cloudTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },

  // ── Photo Picker Box ──────────────────────────────────────────────────────
  photoPickerBox: {
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginVertical: 10,
  },
  pickerBoxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  pickerBoxSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  pickerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cameraBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
  },
  cameraBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  galleryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 10,
  },
  galleryBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  uploadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  retakeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  // ── Form Elements ─────────────────────────────────────────────────────────
  formGroup: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  formInputFlex: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  detectGpsBtn: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detectGpsBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 9,
  },
  toggleBtnActive: {
    backgroundColor: '#059669',
  },
  toggleBtnActiveRed: {
    backgroundColor: '#DC2626',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },

  // ── Modal Footer ──────────────────────────────────────────────────────────
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  checkoutPrompt: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 12,
  },

  // ── Fullscreen Preview Modal ──────────────────────────────────────────────
  previewImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 24,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFullImage: {
    width: '94%',
    height: '75%',
  },
  previewCaptionBar: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
  },
  previewCaptionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  previewCloudinaryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  previewCloudinaryText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
});
