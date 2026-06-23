export type UserRole = 'super_admin' | 'tenant_owner' | 'manager' | 'cashier' | 'customer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string;
}

export type BillingType = 'time_based' | 'match_based' | 'flat';
export type UnitStatus = 'available' | 'maintenance' | 'disabled';
export type TenantStatus = 'active' | 'inactive' | 'suspended';

export interface GameType {
  id: string;
  name: string;
  billingType: BillingType;
  iconUrl?: string;
  status: 'active' | 'inactive';
}

export interface GameUnit {
  id: string;
  gameTypeId: string;
  name: string;
  weekdayPrice: number;
  weekendPrice: number;
  specialPrice?: number;
  status: UnitStatus;
}

export interface SessionPlayer {
  id: string;
  name: string;
  mobile?: string;
  membershipId?: string;
  canteenItems: CanteenItem[];
}

export interface CanteenItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface ActiveSession {
  id: string;
  gameTypeId: string;
  gameTypeName: string;
  unitId: string;
  unitName: string;
  players: SessionPlayer[];
  startedAt: string;
  pausedAt?: string;
  isPaused: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  planId?: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  maxUnits?: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

export type PaymentMethod = 'cash' | 'card' | 'mixed' | 'credit' | 'online';

export interface CompletedSession {
  id: string;
  gameTypeName: string;
  unitName: string;
  playerCount: number;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  gameCharge: number;
  canteenTotal: number;
  vat: number;
  discount: number;
  totalAmount: number;
  paymentMode: 'single' | 'split';
  paymentMethod: PaymentMethod;
}
