// The site owner: sees the Admin tab and page, the visitor tracker, and the site while it is in
// maintenance (spec 0003). Page code only hides; Firestore rules must enforce the same email.
export const OWNER_EMAIL = 'joyshadman@gmail.com';

export const isOwner = (user) => user?.email?.toLowerCase() === OWNER_EMAIL;
