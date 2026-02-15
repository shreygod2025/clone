import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Users, Building2, CheckCircle, Clock, Search, Download, Filter, X } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SchoolPaymentTrackerPublic = () => {
  const { schoolId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [school, setSchool] = useState(null);
  const [studentList, setStudentList] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [availableGrades, setAvailableGrades] = useState([]);
  const [availableDivisions, setAvailableDivisions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await axios.get(`${API}/school-payment/tracker-public/${schoolId}`);
        setStats(statsRes.data);
        setSchool(statsRes.data);
        setStudentList(statsRes.data.student_list || []);
        setAvailableGrades(statsRes.data.available_grades || []);
        setAvailableDivisions(statsRes.data.available_divisions || []);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load payment tracker');
      } finally {
        setLoading(false);
      }
    };
    
    if (schoolId) {
      fetchData();
    }
  }, [schoolId]);

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return studentList.filter(student => {
      const matchesSearch = !searchQuery || 
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.phone.includes(searchQuery);
      const matchesGrade = !selectedGrade || student.grade === selectedGrade;
      const matchesDivision = !selectedDivision || student.division === selectedDivision;
      return matchesSearch && matchesGrade && matchesDivision;
    });
  }, [studentList, searchQuery, selectedGrade, selectedDivision]);

  // Export to Excel
  const handleExport = () => {
    const exportData = filteredStudents.map((student, index) => ({
      'S.No': index + 1,
      'Student Name': student.name,
      'Phone (Last 4 digits)': student.phone,
      'Grade': student.grade,
      'Division': student.division || '-',
      'Paid Date': student.paid_at ? new Date(student.paid_at).toLocaleDateString('en-IN') : '-'
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Paid Students');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 6 },  // S.No
      { wch: 25 }, // Name
      { wch: 18 }, // Phone
      { wch: 10 }, // Grade
      { wch: 10 }, // Division
      { wch: 15 }  // Paid Date
    ];
    
    XLSX.writeFile(wb, `${school?.school_name || 'School'}_Paid_Students.xlsx`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGrade('');
    setSelectedDivision('');
  };

  const hasActiveFilters = searchQuery || selectedGrade || selectedDivision;

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
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Tracker Not Found</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link to="/" className="text-[#1E3A5F] hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Fee Collection Status | {school?.school_name || 'School'} | OLL</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                  alt="OLL Logo"
                  className="h-10 w-auto"
                />
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* School Info with Progress */}
          <div className="bg-[#1E3A5F] text-white rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold">{school?.school_name || 'School'}</h1>
                <p className="text-white/70 text-sm">Fee Collection Status</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="bg-white/20 rounded-full h-4 overflow-hidden mb-2">
              <div 
                className="h-full bg-green-400 transition-all duration-500"
                style={{ width: `${Math.min(stats?.collection_percentage || 0, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span>{stats?.collection_percentage || 0}% Collected</span>
              <span>{stats?.paid_count || 0} / {stats?.total_students || 0} Students</span>
            </div>
          </div>

          {/* Stats Cards - Only Paid, Pending, Total (No Amount) */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{stats?.paid_count || 0}</p>
              <p className="text-xs text-slate-500">Paid</p>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats?.pending_count || 0}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats?.total_students || 0}</p>
              <p className="text-xs text-slate-500">Total Students</p>
            </div>
          </div>

          {/* Student List Section */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {/* Header with Search and Filters */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Paid Students ({filteredStudents.length})
                </h2>
                
                {/* Export Button */}
                <button
                  onClick={handleExport}
                  disabled={filteredStudents.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2a4a6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
              </div>
              
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]"
                  />
                </div>
                
                {/* Grade Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] appearance-none bg-white min-w-[120px]"
                  >
                    <option value="">All Grades</option>
                    {availableGrades.map(grade => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </div>
                
                {/* Division Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] appearance-none bg-white min-w-[130px]"
                  >
                    <option value="">All Divisions</option>
                    {availableDivisions.map(div => (
                      <option key={div} value={div}>Division {div}</option>
                    ))}
                  </select>
                </div>
                
                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                )}
              </div>
            </div>
            
            {/* Student Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">S.No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Student Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Grade</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Division</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{student.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">****{student.phone}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{student.grade}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{student.division || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Users className="w-12 h-12 text-slate-300 mb-3" />
                          <p className="text-slate-500 text-sm">
                            {hasActiveFilters ? 'No students match your filters' : 'No paid students yet'}
                          </p>
                          {hasActiveFilters && (
                            <button
                              onClick={clearFilters}
                              className="mt-2 text-sm text-[#1E3A5F] hover:underline"
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Table Footer with count */}
            {filteredStudents.length > 0 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-sm text-slate-500">
                Showing {filteredStudents.length} of {studentList.length} paid students
              </div>
            )}
          </div>

          {/* Payment Link CTA */}
          <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
            <h3 className="font-semibold text-green-800 mb-2">Haven't paid yet?</h3>
            <p className="text-sm text-green-700 mb-4">
              Parents can pay their child's fees online using the link below.
            </p>
            <a 
              href={`/school-pay/${schoolId}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Pay Now
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#1E3A5F] text-white mt-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 text-center text-sm text-white/70">
            © {new Date().getFullYear()} Clonefutura Live Solutions Pvt. Ltd
          </div>
        </footer>
      </div>
    </>
  );
};

export default SchoolPaymentTrackerPublic;
