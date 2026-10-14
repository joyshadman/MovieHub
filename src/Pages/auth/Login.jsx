import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import AuthLayout from './AuthLayout';
import GoogleButton from './GoogleButton';
import Button from '../../components/ui/Button';
import { TextField, Checkbox } from '../../components/ui/fields';
import { signInWithEmail, authErrorMessage } from '../../services/authService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Figma "Login": email + password, remember me, forgot password, Google.
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from && !location.state.from.startsWith('/login') ? location.state.from : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const done = () => navigate(from, { replace: true });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await signInWithEmail(email, password, remember);
      done();
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Sign in to continue watching where you left off.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail size={20} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          icon={<Lock size={20} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <div className="flex items-center justify-between gap-3">
          <Checkbox label="Remember me" checked={remember} onChange={setRemember} />
          <Link to="/forgot-password" state={{ email }} className="text-sm font-medium text-accent-text hover:underline">Forgot password?</Link>
        </div>

        {formError && <p role="alert" className="rounded-control border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-white">{formError}</p>}

        <Button type="submit" size="lg" className="w-full" loading={busy}>Sign In</Button>
      </form>

      <GoogleButton onSuccess={done} onError={setFormError} disabled={busy} />

      <p className="mt-7 text-center text-sm text-muted">
        New to MovieHub? <Link to="/signup" state={location.state} className="font-semibold text-white hover:underline">Sign up now</Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
