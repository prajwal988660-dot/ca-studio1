export const GSTR1_CONFIG = {
  SCHEMA_VERSION: 'GST3.0.4',
  B2CL_THRESHOLD: 100000, // ₹1,00,000 — inter-state B2C > this goes to B2CL
  STORAGE_KEY: 'gstr1_filings_v1',
} as const;

export const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
  '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Daman & Diu', '27': 'Maharashtra', '28': 'Andhra Pradesh',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
  '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh', '97': 'Other Territory',
};

export const UQC_OPTIONS = [
  'BAG','BAL','BDL','BKL','BOU','BOX','BTL','BUN','CAN','CBM','CCM',
  'CMS','CTN','DOZ','DRM','GGK','GMS','GRS','GYD','KGS','KLR','KME',
  'LTR','MLS','MLT','MTR','MTS','NOS','OTH','PAC','PCS','PKT','PRS',
  'QNT','ROL','SET','SQF','SQM','SQY','TBS','TGM','THD','TON','TUB',
  'UGS','UNT','YDS',
];
