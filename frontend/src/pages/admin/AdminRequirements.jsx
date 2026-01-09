import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2, Briefcase, MapPin, Users } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SKILLS = ['Robotics', 'Coding', 'AI & ML', 'Entrepreneurship', 'Financial Literacy'];
const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'
];

const AdminRequirements = () => {
  const { getAuthHeaders } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReq, setEditingReq] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    skill: '',
    city: '',
    description: '',
    requirements: '',
    positions: 1,
    is_active: true
  });

  useEffect(() => {
    fetchRequirements();
  }, []);

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/requirements`, {
        headers: getAuthHeaders()
      });
      setRequirements(response.data);
    } catch (error) {
      toast.error('Failed to fetch requirements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.skill || !formData.city) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingReq) {
        await axios.patch(`${API}/requirements/${editingReq.id}`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('Requirement updated successfully');
      } else {
        await axios.post(`${API}/requirements`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('Requirement created successfully');
      }

      setShowForm(false);
      setEditingReq(null);
      resetForm();
      fetchRequirements();
    } catch (error) {
      toast.error('Failed to save requirement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this requirement?')) return;

    try {
      await axios.delete(`${API}/requirements/${id}`, {
        headers: getAuthHeaders()
      });
      toast.success('Requirement deleted');
      fetchRequirements();
    } catch (error) {
      toast.error('Failed to delete requirement');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      skill: '',
      city: '',
      description: '',
      requirements: '',
      positions: 1,
      is_active: true
    });
  };

  const openEditForm = (req) => {
    setEditingReq(req);
    setFormData({
      title: req.title,
      skill: req.skill,
      city: req.city,
      description: req.description,
      requirements: req.requirements,
      positions: req.positions,
      is_active: req.is_active
    });
    setShowForm(true);
  };

  return (
    <AdminLayout title="Open Requirements">
      <div className="flex justify-between items-center mb-6">
        <p className="text-slate-500">{requirements.length} open positions</p>
        <Button 
          onClick={() => {
            resetForm();
            setEditingReq(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
          data-testid="add-requirement-btn"
        >
          <Plus className="w-4 h-4" /> Add Requirement
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : requirements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No open requirements</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {requirements.map((req) => (
            <div 
              key={req.id} 
              className={`bg-white rounded-2xl border p-6 ${req.is_active ? 'border-slate-100' : 'border-slate-200 opacity-60'}`}
              data-testid={`requirement-card-${req.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-[#1E3A5F] text-lg">{req.title}</h3>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" /> {req.skill}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> {req.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" /> {req.positions} positions
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${req.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {req.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <p className="text-slate-600 text-sm mb-4">{req.description}</p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditForm(req)}
                  className="flex-1"
                  data-testid={`edit-requirement-${req.id}`}
                >
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(req.id)}
                  className="text-red-500 hover:text-red-700"
                  data-testid={`delete-requirement-${req.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Requirement Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingReq ? 'Edit Requirement' : 'Add New Requirement'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Robotics Instructor - Mumbai"
                data-testid="requirement-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Skill *</label>
                <select
                  value={formData.skill}
                  onChange={(e) => setFormData({...formData, skill: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="requirement-skill"
                >
                  <option value="">Select Skill</option>
                  {SKILLS.map(skill => (
                    <option key={skill} value={skill}>{skill}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City *</label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="requirement-city"
                >
                  <option value="">Select City</option>
                  {CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Positions</label>
              <Input
                type="number"
                min="1"
                value={formData.positions}
                onChange={(e) => setFormData({...formData, positions: parseInt(e.target.value) || 1})}
                data-testid="requirement-positions"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the role..."
                className="min-h-[80px]"
                data-testid="requirement-description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Requirements</label>
              <Textarea
                value={formData.requirements}
                onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                placeholder="Qualifications and requirements..."
                className="min-h-[80px]"
                data-testid="requirement-requirements"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                data-testid="requirement-active"
              />
              <label className="text-sm text-slate-600">Active (visible to educators)</label>
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowForm(false)} 
                className="flex-1"
                data-testid="cancel-requirement"
              >
                Cancel
              </Button>
              <Button type="submit" className="btn-primary flex-1" data-testid="save-requirement">
                {editingReq ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminRequirements;
