import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { CityCombobox } from './CityCombobox';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const BROCHURE_URL = '/franchise/oll-franchise-brochure.pdf';

const triggerDownload = () => {
  const a = document.createElement('a');
  a.href = BROCHURE_URL;
  a.download = 'OLL-Franchise-Brochure.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
};

export const BrochureButton = ({ className = 'fr-ghost', label = 'Download Brochure', testid = 'franchise-brochure-btn' }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} data-testid={testid}>
        <Download size={16} /> {label}
      </button>
      <BrochureModal open={open} onOpenChange={setOpen} />
    </>
  );
};

const BrochureModal = ({ open, onOpenChange }) => {
  const [f, setF] = useState({ name: '', phone: '', city: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const phone = f.phone.replace(/\D/g, '').slice(-10);
    if (f.name.trim().length < 2) { toast.error('Please enter your name'); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { toast.error('Enter a valid 10-digit mobile number'); return; }
    if (!f.city) { toast.error('Please select your city'); return; }
    setBusy(true);
    try {
      await axios.post(`${API}/franchise/brochure-lead`, { name: f.name.trim(), phone, city: f.city });
      setDone(true);
      triggerDownload();
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === 'string' ? d : 'Please check your details and try again');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="franchise-brochure-modal">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Zing Rust','Anton',sans-serif", fontWeight: 400, fontSize: '1.9rem', textTransform: 'uppercase', color: '#0A1A5C' }}>
            Get the <span style={{ color: '#E11D2E' }}>Franchise Brochure</span>
          </DialogTitle>
          <DialogDescription>Share a few details and the brochure will download instantly.</DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="text-center py-4" data-testid="franchise-brochure-success">
            <CheckCircle2 size={44} className="mx-auto text-green-600" />
            <p className="mt-3 font-semibold text-slate-800">Your download has started.</p>
            <a href={BROCHURE_URL} download="OLL-Franchise-Brochure.pdf" className="mt-2 inline-block text-sm font-bold text-blue-700 underline" data-testid="franchise-brochure-manual-link">Didn&apos;t start? Download again</a>
          </div>
        ) : (
          <form onSubmit={submit} className="fr-modal-form" data-testid="franchise-brochure-form">
            <label className="fr-field"><span>Full Name <b style={{ color: '#E11D2E' }}>*</b></span>
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Your full name" data-testid="franchise-brochure-name" /></label>
            <label className="fr-field"><span>Phone Number <b style={{ color: '#E11D2E' }}>*</b></span>
              <input inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="10-digit mobile" data-testid="franchise-brochure-phone" /></label>
            <div className="fr-field"><span>City <b style={{ color: '#E11D2E' }}>*</b></span>
              <CityCombobox value={f.city} onChange={(city) => setF({ ...f, city })} testid="franchise-brochure-city" /></div>
            <button type="submit" disabled={busy} className="fr-cta" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} data-testid="franchise-brochure-submit">
              {busy ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> Download Brochure</>}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
