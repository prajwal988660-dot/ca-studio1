// Indian business number validators

export function isValidPAN(pan: string): boolean {
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(pan.toUpperCase());
}

export function isValidGSTIN(gstin: string): boolean {
  return /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin.toUpperCase());
}

export function isValidCIN(cin: string): boolean {
  return /^[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(cin.toUpperCase());
}

export function isValidDIN(din: string): boolean {
  return /^\d{8}$/.test(din);
}

export function isValidTAN(tan: string): boolean {
  return /^[A-Z]{4}\d{5}[A-Z]$/.test(tan.toUpperCase());
}

export function isValidLLPIN(llpin: string): boolean {
  return /^[A-Z]{3}-\d{4}$/.test(llpin.toUpperCase());
}

export function isValidIFSC(ifsc: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ''));
}

export function isValidPincode(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}
