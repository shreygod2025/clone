import { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

export const SchoolContext = createContext(null);

const API = process.env.REACT_APP_BACKEND_URL || '';

export const SchoolProvider = ({ children }) => {
  const [selectedProgram, setSelectedProgram] = useState('icse-robotics');
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [activeBrochure, setActiveBrochure] = useState({
    downloadUrl: '',
    fileName: '',
    subject: ''
  });
  const [submittingLead, setSubmittingLead] = useState(false);

  // Open the curriculum / brochure download gate modal
  const openBrochureGate = useCallback(({ downloadUrl, fileName, subject }) => {
    setActiveBrochure({ downloadUrl, fileName, subject });
    setGateModalOpen(true);
  }, []);

  const closeBrochureGate = useCallback(() => {
    setGateModalOpen(false);
  }, []);

  // Submit school demo or consultation inquiry to backend
  const submitSchoolLead = useCallback(async (payload) => {
    setSubmittingLead(true);
    try {
      const response = await axios.post(`${API}/api/schools/inquiry`, {
        school_name: payload.school_name?.trim(),
        contact_name: payload.contact_name?.trim() || 'Principal / Administrator',
        email: payload.email?.trim() || `lead_${payload.phone?.replace(/\D/g, '')}@pending.oll.co`,
        phone: payload.phone?.trim(),
        city: payload.city?.trim() || 'Not specified',
        board: payload.board || 'CBSE / ICSE',
        source: payload.source || 'school_portal_lead',
        notes: payload.notes || payload.message || 'School Program Demonstration Request'
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to submit school inquiry:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Submission failed'
      };
    } finally {
      setSubmittingLead(false);
    }
  }, []);

  return (
    <SchoolContext.Provider
      value={{
        selectedProgram,
        setSelectedProgram,
        gateModalOpen,
        openBrochureGate,
        closeBrochureGate,
        activeBrochure,
        submittingLead,
        submitSchoolLead
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};

export default SchoolContext;
