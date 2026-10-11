// Fixed option lists used by block panels.
export const UTC_OFFSETS = ['local', ...Array.from({ length: 27 }, (_, i) => { const h = i - 12; return (h < 0 ? '-' : '+') + String(Math.abs(h)).padStart(2, '0') + ':00'; }), '+05:30', '+09:30'];
export const BUSINESS_TYPES = ['LocalBusiness', 'Restaurant', 'Store', 'CafeOrCoffeeShop', 'Dentist', 'HairSalon', 'HealthAndBeautyBusiness', 'ProfessionalService', 'LegalService', 'AutoRepair', 'Hotel', 'Organization'];
export const DEFAULT_HOURS = [
  { day: 'Monday', open: '09:00', close: '18:00', closed: false }, { day: 'Tuesday', open: '09:00', close: '18:00', closed: false },
  { day: 'Wednesday', open: '09:00', close: '18:00', closed: false }, { day: 'Thursday', open: '09:00', close: '18:00', closed: false },
  { day: 'Friday', open: '09:00', close: '18:00', closed: false }, { day: 'Saturday', open: '09:00', close: '13:00', closed: false },
  { day: 'Sunday', open: '', close: '', closed: true },
];
