import {
  signInWithPopup, signInWithRedirect, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile,
  setPersistence, browserLocalPersistence, browserSessionPersistence, signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../components/firebase';
import { markOffline } from './presence';

// Google popup, falling back to a full page redirect when popups are blocked.
export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
};

// "Remember me" keeps the session across browser restarts; otherwise it ends with the tab.
export const signInWithEmail = async (email, password, remember = true) => {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  return signInWithEmailAndPassword(auth, email.trim(), password);
};

export const signUpWithEmail = async (name, email, password) => {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
  return cred;
};

export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());

// Mark the visitor offline first: once signed out, the tracker can no longer write their record.
export const signOutUser = async () => {
  await markOffline(auth.currentUser);
  return signOut(auth);
};

// Friendly copy for Firebase auth error codes.
export const authErrorMessage = (err) => {
  switch (err?.code) {
    case 'auth/invalid-email': return 'That email address does not look right.';
    case 'auth/missing-password': return 'Enter your password.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Email or password is incorrect.';
    case 'auth/email-already-in-use': return 'An account with this email already exists. Try signing in.';
    case 'auth/weak-password': return 'Choose a stronger password (at least 8 characters).';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a moment and try again.';
    case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed': return 'Email sign in is not enabled for this site yet.';
    case 'auth/popup-closed-by-user': return 'The sign in window was closed.';
    default: return 'Something went wrong. Please try again.';
  }
};
