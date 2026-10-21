// First visit tour (spec 0007): shown once per browser, replayable from the About page.
export const TOUR_EVENT = 'mh:tour';
const TOUR_KEY = 'mh:tour';
const OLD_WELCOME_KEY = 'moviehub_first_time_user'; // set by the welcome popup the tour replaced

export const startTour = () => window.dispatchEvent(new CustomEvent(TOUR_EVENT));

export const seenTour = () => {
  try { return !!(localStorage.getItem(TOUR_KEY) || localStorage.getItem(OLD_WELCOME_KEY)); } catch { return true; }
};

// how: 'done' | 'skipped'
export const markTourSeen = (how) => {
  try {
    localStorage.setItem(TOUR_KEY, how);
    localStorage.setItem(OLD_WELCOME_KEY, 'returning');
  } catch { /* storage blocked: the tour may show again next visit */ }
};
