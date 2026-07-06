export const ENTITY_TYPES = {
  individual: { label: 'Individual (Salaried/Non-Business)', shortLabel: 'Individual', itrForm: 'ITR-1/ITR-2', icon: 'UserCircle', color: 'slate' },
  sole_proprietorship: { label: 'Sole Proprietorship', shortLabel: 'Sole Prop', itrForm: 'ITR-3/ITR-4', icon: 'User', color: 'blue' },
  partnership: { label: 'Partnership Firm', shortLabel: 'Partnership', itrForm: 'ITR-5', icon: 'Users', color: 'green' },
  llp: { label: 'Limited Liability Partnership', shortLabel: 'LLP', itrForm: 'ITR-5', icon: 'Shield', color: 'purple' },
  opc: { label: 'One Person Company', shortLabel: 'OPC', itrForm: 'ITR-6', icon: 'UserCheck', color: 'indigo' },
  pvt_ltd: { label: 'Private Limited Company', shortLabel: 'Pvt Ltd', itrForm: 'ITR-6', icon: 'Building2', color: 'red' },
  public_ltd: { label: 'Public Limited Company', shortLabel: 'Public Ltd', itrForm: 'ITR-6', icon: 'Landmark', color: 'amber' },
  huf: { label: 'Hindu Undivided Family', shortLabel: 'HUF', itrForm: 'ITR-2', icon: 'Home', color: 'teal' },
  trust: { label: 'Trust', shortLabel: 'Trust', itrForm: 'ITR-7', icon: 'Heart', color: 'pink' },
  society: { label: 'Society', shortLabel: 'Society', itrForm: 'ITR-7', icon: 'Users2', color: 'orange' },
  section8: { label: 'Section 8 Company', shortLabel: 'Sec 8', itrForm: 'ITR-6', icon: 'HeartHandshake', color: 'rose' },
  aop_boi: { label: 'AOP / BOI', shortLabel: 'AOP/BOI', itrForm: 'ITR-5', icon: 'Network', color: 'cyan' },
  cooperative: { label: 'Cooperative Society', shortLabel: 'Cooperative', itrForm: 'ITR-5', icon: 'Handshake', color: 'lime' },
} as const;

export type EntityType = keyof typeof ENTITY_TYPES;
export const ENTITY_TYPE_LIST = Object.entries(ENTITY_TYPES).map(([key, val]) => ({ ...val, key }));
