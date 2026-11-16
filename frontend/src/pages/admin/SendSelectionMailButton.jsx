import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel,
} from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TRACKS = { robo_sumo: 'Robo Sumo', robo_race: 'Robo Race', robo_innovation: 'Robotics Innovation (Grand Finale)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const Summary = ({ info, result }) => (
  <div className="text-sm text-slate-700 space-y-1" data-testid="send-mail-summary">
    {result ? (
      <p data-testid="send-mail-result">
        {result.status === 'done' ? 'Finished' : 'Sending…'} <strong>Sent: {result.sent}</strong> · Failed: {result.failed} · Skipped: {result.skipped} (of {result.total} to send)
      </p>
    ) : (
      <>
        <p><strong data-testid="send-mail-count">{info.to_send}</strong> approved submission(s) will get their track's selection email (team lead + all members).</p>
        {Object.entries(info.by_track || {}).filter(([, n]) => n).map(([k, n]) => <p key={k}>• {TRACKS[k]}: {n}</p>)}
        <p className="text-xs text-slate-500">Skipped: {info.already_sent} already emailed · {info.invalid_email} without a valid email · {info.not_approved} not approved</p>
        {!info.email_configured && <p className="text-red-600 font-semibold" data-testid="send-mail-not-configured">Email isn't configured on the server — mails can't be sent.</p>}
      </>
    )}
  </div>
);

export default function SendSelectionMailButton({ ids, headers, statusFilter, onDone }) {
  const [info, setInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const blocked = ['rejected', 'final_rejected'].includes(statusFilter);

  const open = async () => {
    if (blocked) return toast.info('Rejected / Rework filter selected — no approval emails are sent.');
    if (!ids.length) return toast.info('No submissions match the current filters.');
    setBusy(true);
    try {
      const r = await axios.post(`${API}/admin/techfest/submissions/send-selection-mails`, { ids, dry_run: true }, { headers });
      setResult(null); setInfo(r.data);
    } catch (e) { toast.error(e.response?.data?.detail || 'Could not count recipients'); } finally { setBusy(false); }
  };

  const send = async () => {
    setBusy(true);
    try {
      const r = await axios.post(`${API}/admin/techfest/submissions/send-selection-mails`, { ids, dry_run: false }, { headers });
      let job = { status: 'running', total: r.data.to_send, sent: 0, failed: 0, skipped: r.data.already_sent + r.data.invalid_email };
      setResult(job);
      while (job.status !== 'done') {
        await sleep(2000);
        job = (await axios.get(`${API}/admin/techfest/mail-jobs/${r.data.job_id}`, { headers })).data;
        setResult(job);
      }
      toast.success(`Selection emails — Sent: ${job.sent}, Failed: ${job.failed}, Skipped: ${job.skipped}`);
      onDone && onDone();
    } catch (e) { toast.error(e.response?.data?.detail || 'Sending failed'); } finally { setBusy(false); }
  };

  return (
    <>
      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={open} disabled={busy && !info} data-testid="admin-submissions-send-mail-btn">
        {busy && !info ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1" />} Send Mail
      </Button>
      <AlertDialog open={!!info} onOpenChange={(o) => !o && !busy && setInfo(null)}>
        <AlertDialogContent data-testid="send-mail-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Send selection emails?</AlertDialogTitle>
            <AlertDialogDescription asChild><div>{info && <Summary info={info} result={result} />}</div></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} data-testid="send-mail-cancel">{result?.status === 'done' ? 'Close' : 'No'}</AlertDialogCancel>
            {!result && (
              <Button onClick={send} disabled={busy || !info?.to_send || !info?.email_configured} className="bg-[#DC2626] hover:bg-red-700 text-white" data-testid="send-mail-confirm">
                {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Yes, send {info?.to_send || 0}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
