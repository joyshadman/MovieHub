import React, { useState } from 'react';
import { profileImgAttrs } from '../../utils/avatarUrls';

// Figma Avatar sheet: rounded square, rose to violet gradient with the first initial,
// or the account photo when one loads.
const Avatar = ({ user, size = 36, className = '' }) => {
  const [failed, setFailed] = useState(false);
  const name = user?.displayName || user?.email || 'User';
  const initial = name.trim().charAt(0).toUpperCase() || 'U';
  const style = { width: size, height: size };

  if (user?.photoURL && !failed) {
    return (
      <img
        src={user.photoURL}
        alt=""
        style={style}
        className={`rounded-[10px] object-cover border border-line ${className}`}
        {...profileImgAttrs}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`inline-flex items-center justify-center rounded-[10px] bg-gradient-to-br from-accent to-violet-600 text-white font-semibold text-sm ${className}`}
    >
      {initial}
    </span>
  );
};

export default Avatar;
