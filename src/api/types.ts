/** API request/response types – field names match backend (snake_case). */

// —— Auth ——
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  data?: {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    user?: {
      id: number;
      email: string;
      role_id?: number;
      tenant_id?: number;
    };
  };
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

// —— Health ——
export interface HealthResponse {
  status?: string;
}

// —— Tenants ——
export interface TenantListItem {
  id: number;
  name: string;
  slug?: string;
  status?: string;
  subscription_plan?: string;
}

export interface CreateTenantRequest {
  name: string;
  status?: string;
  subscription_plan?: string;
}

export interface UpdateTenantRequest {
  name?: string;
  status?: string;
  subscription_plan?: string;
}

// —— Users / Roles ——
export interface RoleItem {
  id: number;
  name?: string;
}

export interface UserListItem {
  id: number;
  email: string;
  display_name?: string;
  role_id: number;
  tenant_id: number;
  is_active: boolean;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role_id: number;
  tenant_id: number;
  is_active: boolean;
  display_name?: string;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  display_name?: string;
  role_id?: number;
  tenant_id?: number;
  is_active?: boolean;
}

// —— Game Types ——
export interface GameTypeItem {
  id: number;
  name: string;
  billing_type: string;
  icon?: string | null;
  status: string;
}

export interface CreateGameTypeRequest {
  name: string;
  billing_type: string;
  icon?: string | null;
  status: string;
}

export interface UpdateGameTypeRequest {
  name?: string;
  status?: string;
}

// —— Game Units ——
export interface GameUnitItem {
  id: number;
  game_type_id: number;
  unit_name: string;
  weekday_price: number;
  weekend_price: number;
  special_price?: number | null;
  status: string;
}

export interface CreateGameUnitRequest {
  game_type_id: number;
  unit_name: string;
  weekday_price: number;
  weekend_price: number;
  special_price?: number | null;
  status: string;
}

export interface UpdateGameUnitRequest {
  unit_name?: string;
  weekday_price?: number;
  weekend_price?: number;
  status?: string;
}

// —— Sessions ——
export interface SessionPlayerInput {
  name: string;
  mobile?: string | null;
  membership_id?: string | null;
}

export interface SessionPlayerItem {
  id: number;
  name: string;
  mobile?: string | null;
  membership_id?: string | null;
}

export interface SessionItem {
  id: number;
  game_type_id: number;
  game_unit_id: number;
  status: string;
  started_at?: string;
  ended_at?: string;
  paused_at?: string | null;
  game_type_name?: string;
  game_unit_name?: string;
  players?: SessionPlayerItem[];
  orders?: OrderItem[];
}

export interface StartSessionRequest {
  game_type_id: number;
  game_unit_id: number;
}

export interface StartSessionWithPlayersRequest {
  game_type_id: number;
  game_unit_id: number;
  players: SessionPlayerInput[];
}

export interface AddPlayerRequest {
  session_id: number;
  name: string;
  mobile?: string | null;
  membership_id?: string | null;
}

export interface PauseResumeEndRequest {
  session_id: number;
}

// —— Products ——
export interface ProductItem {
  id: number;
  name: string;
  price: number;
  category: string;
  status: string;
}

export interface CreateProductRequest {
  name: string;
  price: number;
  category: string;
  status: string;
}

export interface UpdateProductRequest {
  name?: string;
  price?: number;
  category?: string;
  status?: string;
}

// —— Orders ——
export interface OrderItem {
  id: number;
  session_id: number;
  player_id: number;
  product_id: number;
  quantity: number;
  price: number;
}

export interface CreateOrderRequest {
  session_id: number;
  player_id: number;
  product_id: number;
  quantity: number;
  price?: number | null;
}

// —— Billing ——
export interface CalculateBillRequest {
  session_id: number;
  vat_percent?: number;
  discount_amount?: number;
}

export interface CalculateBillResponse {
  session_id?: number;
  subtotal?: number;
  vat?: number;
  vat_amount?: number;
  discount_amount?: number;
  total?: number;
  duration_seconds?: number;
  rate_used?: number;
}

// —— Payments ——
export interface CreatePaymentRequest {
  session_id: number;
  amount: number;
  method: string;
  status: string;
  customer_id?: number;
  customer_name?: string;
  customer_mobile?: string;
}

export interface SplitPaymentItem {
  amount: number;
  method: string;
  status?: string;
}

export interface SplitPaymentRequest {
  session_id: number;
  payments: SplitPaymentItem[];
}

// —— Reports ——
export interface ReportQuery {
  start_date: string;
  end_date: string;
}

export interface ReportRevenueResponse {
  total?: number;
}

export interface ReportUtilizationResponse {
  utilization?: number;
}

export interface ReportPlayerSpendResponse {
  average?: number;
}

export interface ReportRevenueByGameTypeItem {
  game_type?: string;
  revenue?: number;
}

export interface ReportRevenueByHourItem {
  hour?: number;
  value?: number;
}

export interface AIQuery extends ReportQuery {
  limit?: number;
}

// —— Profile ——
export interface ProfileItem {
  id: number;
  email: string;
  display_name?: string;
  mobile?: string | null;
  role_id?: number;
  tenant_id?: number;
  role_name?: string;
  tenant_name?: string;
}

export interface UpdateProfileRequest {
  email?: string;
  password?: string;
  display_name?: string;
  mobile?: string | null;
}

// —— Categories ——
export interface CategoryItem {
  id: number;
  name: string;
  description?: string;
  status?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description: string;
  status: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  status?: string;
}

// —— Customers ——
export interface CustomerItem {
  id: number;
  name: string;
  email?: string | null;
  mobile?: string | null;
  membership_id?: string | null;
}

export interface CreateCustomerRequest {
  name: string;
  email?: string | null;
  mobile?: string | null;
  membership_id?: string | null;
}

export interface UpdateCustomerRequest {
  name: string;
  email?: string | null;
  mobile?: string | null;
  membership_id?: string | null;
}

// —— Shifts ——
export interface ShiftItem {
  id: number;
  started_at?: string;
  ended_at?: string | null;
  status?: string;
  opening_balance?: number;
  closing_balance?: number;
}

export interface CloseShiftRequest {
  shift_id: number;
}

// —— Dashboard ——
export interface DashboardOverviewResponse {
  data?: {
    revenue?: number;
    active_sessions?: number;
    utilization?: number;
    canteen_revenue?: number;
    top_game?: string;
    [key: string]: unknown;
  };
}
