// contactsData.js — tier/status constants (contacts themselves are served by the API)

export const TIER_LABELS = {
  1: 'Inner Circle',
  2: 'Collaborator',
  3: 'Network',
  4: 'Target',
  5: 'Blacklist',
};

export const TIER_COLORS = {
  1: '#f59e0b', // amber
  2: '#3b82f6', // blue
  3: '#6b7280', // gray
  4: '#10b981', // green
  5: '#ef4444', // red
};

export const STATUS_COLORS = {
  Active:      '#10b981',
  Inactive:    '#6b7280',
  'Reach Out': '#f59e0b',
};

// Contacts are no longer bundled into the site: they come from the authenticated API.
export const contactsData = [];

export default contactsData;
