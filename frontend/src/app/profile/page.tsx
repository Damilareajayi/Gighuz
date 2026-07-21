'use client';
import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { Star, MapPin, DollarSign, ExternalLink, Camera, FileText, Sparkles, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { Freelancer } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

function Avatar({ profile, onUpload, uploading }: {
  profile: Freelancer; onUpload: (file: File) => void; uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative w-16 h-16 shrink-0">
      {profile.profilePictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.profilePictureUrl} alt={profile.name} className="w-16 h-16 rounded-full object-cover border border-surface-border" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-teal-700 flex items-center justify-center text-white text-xl font-bold">
          {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
      )}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Change profile picture"
        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-surface-border flex items-center justify-center shadow-sm hover:bg-gray-50">
        <Camera size={11} className="text-gray-600" />
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
    </div>
  );
}

function ProfileContent() {
  const [profile, setProfile] = useState<Freelancer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [resumeBusy, setResumeBusy] = useState<'' | 'uploading' | 'generating'>('');
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [availability, setAvailability] = useState<'open' | 'busy' | 'unavailable'>('open');

  function load() {
    return api.getMe()
      .then((data: any) => {
        setProfile(data);
        setBio(data.bio || '');
        setSkills((data.skills || []).join(', '));
        setAvailability(data.availability || 'open');
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateMe({
        bio,
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        availability,
      });
      setProfile(p => p && { ...p, bio, skills: skills.split(',').map(s => s.trim()).filter(Boolean), availability });
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    setError('');
    setAvatarUploading(true);
    try {
      const { profilePictureUrl } = await api.uploadAvatar(file) as { profilePictureUrl: string };
      setProfile(p => p && { ...p, profilePictureUrl });
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleResumeUpload(file: File) {
    setError('');
    setResumeBusy('uploading');
    try {
      const data = await api.uploadResume(file) as { resumeUrl: string; resumeSource: 'uploaded' };
      setProfile(p => p && { ...p, resumeUrl: data.resumeUrl, resumeSource: data.resumeSource, resumeUpdatedAt: new Date().toISOString() });
    } catch (err: any) {
      setError(err.message || 'Failed to upload resume');
    } finally {
      setResumeBusy('');
    }
  }

  async function handleGenerateResume() {
    setError('');
    setResumeBusy('generating');
    try {
      const data = await api.generateResume() as { resumeText: string; resumeSource: 'ai_generated' };
      setProfile(p => p && { ...p, resumeText: data.resumeText, resumeSource: data.resumeSource, resumeUpdatedAt: new Date().toISOString() });
    } catch (err: any) {
      setError(err.message || 'Failed to generate resume');
    } finally {
      setResumeBusy('');
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="freelancer" />
      <main className="ml-56 flex-1 p-6 space-y-6 max-w-3xl">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your professional identity on GigHuz</p>
          </div>
          {profile && (
            <button
              onClick={() => (editing ? handleSave() : setEditing(true))}
              disabled={saving}
              className="btn-outline">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Edit Profile'}
            </button>
          )}
        </div>

        {loading && <p className="text-sm text-gray-400">Loading profile…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {profile && (
          <>
            <div className="card space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <Avatar profile={profile} onUpload={handleAvatarUpload} uploading={avatarUploading} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{profile.name}</h2>
                      {profile.verified && <span className="badge badge-orange">✓ Verified</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><MapPin size={11} /> {profile.country}</span>
                      {profile.hourlyRate && (
                        <span className="flex items-center gap-1"><DollarSign size={11} /> ${profile.hourlyRate}/hr {profile.currency}</span>
                      )}
                      <span className="flex items-center gap-1"><Star size={11} className="text-orange-500" /> {profile.averageRating} ({profile.completedJobs} jobs)</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-teal-700">${(profile.totalEarnings / 100).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">total earned</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Bio</p>
                {editing ? (
                  <textarea className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500 resize-none h-24"
                    value={bio} onChange={e => setBio(e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-600">{profile.bio}</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Skills</p>
                {editing ? (
                  <input className="w-full border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
                    placeholder="Comma separated skills" value={skills} onChange={e => setSkills(e.target.value)} />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((s) => (
                      <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-gray-50 border border-surface-border text-gray-600">{s}</span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Availability</p>
                <div className="flex gap-2">
                  {(['open', 'busy', 'unavailable'] as const).map((a) => (
                    <button key={a}
                      onClick={() => editing && setAvailability(a)}
                      disabled={!editing}
                      className={`text-xs px-3 py-1.5 rounded-lg border capitalize transition-colors ${
                        availability === a
                          ? a === 'open' ? 'border-teal-700 bg-teal-50 text-teal-700' : 'border-orange-600 bg-orange-50 text-orange-600'
                          : 'border-surface-border text-gray-500'
                      }`}>{a}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <p className="section-label">Resume</p>
                {profile.resumeUpdatedAt && (
                  <span className="text-xs text-gray-400">Updated {timeAgo(profile.resumeUpdatedAt)}</span>
                )}
              </div>

              {profile.resumeSource === 'ai_generated' && profile.resumeText && (
                <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 border border-surface-border rounded-lg p-3 max-h-64 overflow-y-auto font-sans">
                  {profile.resumeText}
                </pre>
              )}

              {profile.resumeSource === 'uploaded' && profile.resumeUrl && (
                <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-teal-700 hover:text-orange-600 transition-colors">
                  <FileText size={14} /> View uploaded resume <ExternalLink size={11} />
                </a>
              )}

              {!profile.resumeSource && (
                <p className="text-sm text-gray-500">No resume yet — upload your own or let AI write one from your profile.</p>
              )}

              <div className="flex gap-2">
                <button onClick={() => resumeInputRef.current?.click()} disabled={resumeBusy !== ''} className="btn-outline text-xs flex items-center gap-1.5">
                  <Upload size={12} /> {resumeBusy === 'uploading' ? 'Uploading…' : 'Upload Resume'}
                </button>
                <button onClick={handleGenerateResume} disabled={resumeBusy !== ''} className="btn-outline text-xs flex items-center gap-1.5">
                  <Sparkles size={12} /> {resumeBusy === 'generating' ? 'Generating…' : profile.resumeSource === 'ai_generated' ? 'Regenerate with AI' : 'Generate with AI'}
                </button>
                <input ref={resumeInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleResumeUpload(f); e.target.value = ''; }} />
              </div>
            </div>

            {profile.portfolioLinks.length > 0 && (
              <div className="card space-y-3">
                <p className="section-label">Portfolio & Links</p>
                {profile.portfolioLinks.map((link) => (
                  <a key={link} href={link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between py-2 border-b border-surface-border last:border-0 text-sm text-teal-700 hover:text-orange-600 transition-colors">
                    {link}
                    <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            )}

            <div className="card space-y-3">
              <p className="section-label">Payout Settings</p>
              <div className="text-sm space-y-2">
                <div className="flex justify-between py-2 border-b border-surface-border">
                  <span className="text-gray-500">WhatsApp</span>
                  <span className="text-gray-700">{profile.whatsappNumber || 'Not set'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Platform fee</span>
                  <span className="text-gray-700">18% per milestone</span>
                </div>
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth role="freelancer">
      <ProfileContent />
    </RequireAuth>
  );
}
