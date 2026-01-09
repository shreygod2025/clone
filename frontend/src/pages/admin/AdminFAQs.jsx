import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2, HelpCircle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { value: 'courses', label: 'Courses' },
  { value: 'fees', label: 'Fees' },
  { value: 'demos', label: 'Demos' },
  { value: 'online_vs_offline', label: 'Online vs Offline' },
];

const AdminFAQs = () => {
  const { getAuthHeaders } = useAuth();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'courses',
    order: 0,
    is_active: true
  });

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/faqs`, {
        headers: getAuthHeaders()
      });
      setFaqs(response.data);
    } catch (error) {
      toast.error('Failed to fetch FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.question || !formData.answer) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingFaq) {
        await axios.patch(`${API}/faqs/${editingFaq.id}`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('FAQ updated successfully');
      } else {
        await axios.post(`${API}/faqs`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('FAQ created successfully');
      }

      setShowForm(false);
      setEditingFaq(null);
      resetForm();
      fetchFaqs();
    } catch (error) {
      toast.error('Failed to save FAQ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;

    try {
      await axios.delete(`${API}/faqs/${id}`, {
        headers: getAuthHeaders()
      });
      toast.success('FAQ deleted');
      fetchFaqs();
    } catch (error) {
      toast.error('Failed to delete FAQ');
    }
  };

  const resetForm = () => {
    setFormData({
      question: '',
      answer: '',
      category: 'courses',
      order: 0,
      is_active: true
    });
  };

  const openEditForm = (faq) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      order: faq.order,
      is_active: faq.is_active
    });
    setShowForm(true);
  };

  const getCategoryLabel = (value) => {
    const cat = CATEGORIES.find(c => c.value === value);
    return cat ? cat.label : value;
  };

  return (
    <AdminLayout title="FAQ Management">
      <div className="flex justify-between items-center mb-6">
        <p className="text-slate-500">{faqs.length} FAQs</p>
        <Button 
          onClick={() => {
            resetForm();
            setEditingFaq(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
          data-testid="add-faq-btn"
        >
          <Plus className="w-4 h-4" /> Add FAQ
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : faqs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No FAQs yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
          {faqs.map((faq) => (
            <div key={faq.id} className="p-4" data-testid={`faq-item-${faq.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-[#1E3A5F]/10 rounded text-xs text-[#1E3A5F]">
                      {getCategoryLabel(faq.category)}
                    </span>
                    {!faq.is_active && (
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500">
                        Inactive
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-[#1E3A5F] mb-1">{faq.question}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{faq.answer}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditForm(faq)}
                    data-testid={`edit-faq-${faq.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(faq.id)}
                    className="text-red-500 hover:text-red-700"
                    data-testid={`delete-faq-${faq.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAQ Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Question *</label>
              <Input
                value={formData.question}
                onChange={(e) => setFormData({...formData, question: e.target.value})}
                placeholder="Enter question"
                data-testid="faq-question"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Answer *</label>
              <Textarea
                value={formData.answer}
                onChange={(e) => setFormData({...formData, answer: e.target.value})}
                placeholder="Enter answer..."
                className="min-h-[120px]"
                data-testid="faq-answer"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="faq-category"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                  placeholder="0"
                  data-testid="faq-order"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                data-testid="faq-active"
              />
              <label className="text-sm text-slate-600">Active</label>
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowForm(false)} 
                className="flex-1"
                data-testid="cancel-faq"
              >
                Cancel
              </Button>
              <Button type="submit" className="btn-primary flex-1" data-testid="save-faq">
                {editingFaq ? 'Update FAQ' : 'Create FAQ'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminFAQs;
