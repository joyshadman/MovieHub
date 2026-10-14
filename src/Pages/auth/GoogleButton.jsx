import React, { useState } from 'react';
import { signInWithGoogle, authErrorMessage } from '../../services/authService';
import Button from '../../components/ui/Button';

// "or continue with" block: Google sign in (popup, falling back to redirect).
const GoogleButton = ({ onSuccess, onError, disabled }) => {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    onError?.('');
    try {
      const result = await signInWithGoogle();
      if (result?.user) onSuccess?.();
    } catch (err) {
      console.error('Google sign in failed:', err);
      onError?.(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 my-6" role="separator" aria-label="or continue with">
        <span className="h-px flex-1 bg-line-strong" />
        <span className="text-sm text-muted">or continue with</span>
        <span className="h-px flex-1 bg-line-strong" />
      </div>
      <Button
        variant="glass"
        size="lg"
        className="w-full"
        onClick={handleClick}
        loading={busy}
        disabled={disabled}
        icon={!busy && <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-5 w-5" />}
      >
        Continue with Google
      </Button>
    </>
  );
};

export default GoogleButton;
