import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, Circle, Clock, Calendar, Package, Users, Settings, BookOpen, FileText, ThumbsUp, ArrowLeft, Truck, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

const API = process.env.REACT_APP_BACKEND_URL;

const STEP_ICONS = {
  payment_collection: <CheckCircle2 className="w-5 h-5" />,
  kit_delivery: <Package className="w-5 h-5" />,
  distribution_checking: <Users className="w-5 h-5" />,
  technical_check: <Settings className="w-5 h-5" />,
  teacher_training: <BookOpen className="w-5 h-5" />,
  calendar_making: <Calendar className="w-5 h-5" />,
  timetable_finalization: <Clock className="w-5 h-5" />,
  mou_signing: <FileText className="w-5 h-5" />,
  school_confirmation: <ThumbsUp className="w-5 h-5" />
};

const SchoolTrackingPage = () => {
  const { token } = useParams();
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const response = await axios.get(`${API}/track/${token}`);
        setTrackingData(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Tracking not found');
      } finally {
        setLoading(false);
      }
    };
    fetchTracking();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Tracking Not Found</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link to="/" className="text-[#1E3A5F] hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const { school_name, contact_name, programs, progress_percent, completed_steps, total_steps, steps, timeline, current_step, started_at, completed_at } = trackingData;

  return (
    <>
      <Helmet>
        <title>Onboarding Progress - {school_name} | OLL</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <div className="bg-[#1E3A5F] text-white py-6">
          <div className="max-w-4xl mx-auto px-4">
            <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to OLL
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{school_name}</h1>
                <p className="text-white/80 mt-1">Onboarding Progress Tracker</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{progress_percent}%</div>
                <div className="text-sm text-white/80">{completed_steps} of {total_steps} steps</div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto px-4 -mt-2">
          <div className="bg-white rounded-full h-3 shadow-lg overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progress_percent}%` }}
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Status Banner */}
          {completed_at ? (
            <div className="bg-green-100 border border-green-300 rounded-xl p-4 mb-8 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Onboarding Complete!</p>
                <p className="text-sm text-green-700">Completed on {format(new Date(completed_at), 'MMMM d, yyyy')}</p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-100 border border-blue-300 rounded-xl p-4 mb-8 flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-800">Onboarding In Progress</p>
                <p className="text-sm text-blue-700">Started on {started_at ? format(new Date(started_at), 'MMMM d, yyyy') : 'N/A'}</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-8">
            {/* Steps Timeline */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">Onboarding Steps</h2>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {steps.map((step, idx) => (
                  <div 
                    key={step.key}
                    className={`flex items-start gap-4 p-4 border-b last:border-b-0 ${
                      step.completed ? 'bg-green-50' : 
                      current_step === step.key ? 'bg-blue-50' : 'bg-white'
                    }`}
                  >
                    {/* Step Number/Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      step.completed 
                        ? 'bg-green-500 text-white' 
                        : current_step === step.key 
                          ? 'bg-blue-500 text-white animate-pulse' 
                          : 'bg-slate-200 text-slate-500'
                    }`}>
                      {step.completed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        STEP_ICONS[step.key] || <Circle className="w-5 h-5" />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-medium ${step.completed ? 'text-green-800' : 'text-slate-800'}`}>
                          {step.title}
                        </h3>
                        {step.completed && step.completed_date && (
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            {format(new Date(step.completed_date), 'MMM d')}
                          </span>
                        )}
                        {current_step === step.key && !step.completed && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full animate-pulse">
                            In Progress
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{step.description}</p>
                      
                      {/* Kit Tracking Link */}
                      {step.key === 'kit_delivery' && step.tracking_link && (
                        <a 
                          href={step.tracking_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:underline"
                        >
                          <Truck className="w-4 h-4" /> Track Shipment
                        </a>
                      )}
                      
                      {/* Training Date */}
                      {step.key === 'teacher_training' && step.training_date && (
                        <p className="text-sm text-blue-600 mt-2">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Scheduled: {format(new Date(step.training_date), 'MMMM d, yyyy')}
                        </p>
                      )}
                    </div>

                    {/* Connection Line */}
                    {idx < steps.length - 1 && (
                      <div className="absolute left-[2.25rem] mt-10 w-0.5 h-full bg-slate-200" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* School Info */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="font-semibold text-[#1E3A5F] mb-3">School Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Contact:</span> {contact_name}</p>
                  {programs && programs.length > 0 && (
                    <div>
                      <span className="text-slate-500">Programs:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {programs.map(p => (
                          <span key={p} className="text-xs bg-[#1E3A5F]/10 text-[#1E3A5F] px-2 py-0.5 rounded">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="font-semibold text-[#1E3A5F] mb-3">Recent Activity</h3>
                <div className="space-y-3">
                  {timeline.length === 0 ? (
                    <p className="text-sm text-slate-500">No activity yet</p>
                  ) : (
                    timeline.slice().reverse().map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-[#1E3A5F] mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-slate-700">{item.action}</p>
                          <p className="text-xs text-slate-400">
                            {format(new Date(item.date), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Help */}
              <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2d4a6f] rounded-xl shadow-lg p-4 text-white">
                <h3 className="font-semibold mb-2">Need Help?</h3>
                <p className="text-sm text-white/80 mb-3">
                  Contact your OLL representative for any questions about your onboarding.
                </p>
                <a 
                  href="mailto:support@oll.co" 
                  className="inline-block bg-white text-[#1E3A5F] px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 py-6 mt-12">
          <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500">
            <p>© {new Date().getFullYear()} OLL - Omni Learning Labs. All rights reserved.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default SchoolTrackingPage;
