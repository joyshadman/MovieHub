import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import GoogleButton from './GoogleButton';
import Button from '../../components/ui/Button';
import { TextField, Checkbox } from '../../components/ui/fields';
import { signUpWithEmail, authErrorMessage } from '../../services/authService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Figma "Sign Up": full name, email, password, confirm, terms, Google.
const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from && !location.state.from.startsWith('/signup') ? location.state.from : '/';

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const done = () => navigate(from, { replace: true });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Enter your name.';
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    if (!agreed) next.terms = 'Please agree to continue.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await signUpWithEmail(form.name, form.email, form.password);
      toast.success('Welcome to MovieHub!');
      done();
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-3xl font-bold">Create your account</h1>
      <p className="mt-2 text-sm text-muted">Save titles to My List and pick up where you left off on any device.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
        <TextField label="Full name" autoComplete="name" placeholder="Your name" icon={<User size={20} />} value={form.name} onChange={set('name')} error={errors.name} />
        <TextField label="Email address" type="email" autoComplete="email" placeholder="you@example.com" icon={<Mail size={20} />} value={form.email} onChange={set('email')} error={errors.email} />
        <TextField label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters" icon={<Lock size={20} />} value={form.password} onChange={set('password')} error={errors.password} />
        <TextField label="Confirm password" type="password" autoComplete="new-password" placeholder="Re-enter password" icon={<Lock size={20} />} value={form.confirm} onChange={set('confirm')} error={errors.confirm} />

        <div>
          <Checkbox checked={agreed} onChange={setAgreed} label="I agree to the Terms and Privacy Policy" />
          {errors.terms && <p className="mt-1.5 text-sm text-accent-text">{errors.terms}</p>}
        </div>

        {formError && <p role="alert" className="rounded-control border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-white">{formError}</p>}

        <Button type="submit" size="lg" className="w-full" loading={busy}>Create Account</Button>
      </form>

      <GoogleButton onSuccess={done} onError={setFormError} disabled={busy} />

      <p className="mt-7 text-center text-sm text-muted">
        Already have an account? <Link to="/login" state={location.state} className="font-semibold text-white hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
};

export default Signup;
