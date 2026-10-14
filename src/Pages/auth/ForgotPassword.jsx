import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, MailCheck, ArrowLeft } from 'lucide-react';
import AuthLayout from './AuthLayout';
import Button from '../../components/ui/Button';
import { TextField } from '../../components/ui/fields';
import { resetPassword, authErrorMessage } from '../../services/authService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Not in Figma: built in the Login card style. Sends Firebase's password reset email.
const ForgotPassword = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      // Do not reveal whether an account exists for this email.
      if (err?.code === 'auth/user-not-found') setSent(true);
      else setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      {sent ? (
        <div className="text-center" role="status">
          <span className="mx-auto mb-5 h-14 w-14 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center text-accent-text">
            <MailCheck size={26} aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold">Check your inbox</h1>
          <p className="mt-2 text-sm text-muted">
            If an account exists for <span className="text-white">{email.trim()}</span>, a reset link is on its way. It can take a minute, and may land in spam.
          </p>
          <Button to="/login" size="lg" className="w-full mt-7">Back to sign in</Button>
          <button type="button" onClick={() => setSent(false)} className="mt-4 text-sm text-muted hover:text-white">Use a different email</button>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold">Reset your password</h1>
          <p className="mt-2 text-sm text-muted">Enter the email you signed up with and we will send you a link to choose a new password.</p>
          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
            <TextField label="Email address" type="email" autoComplete="email" placeholder="you@example.com" icon={<Mail size={20} />} value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
            <Button type="submit" size="lg" className="w-full" loading={busy}>Send reset link</Button>
          </form>
          <Link to="/login" className="mt-7 inline-flex items-center gap-2 text-sm text-muted hover:text-white">
            <ArrowLeft size={16} aria-hidden="true" /> Back to sign in
          </Link>
        </>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
