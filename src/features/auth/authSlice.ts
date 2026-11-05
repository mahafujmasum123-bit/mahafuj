import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItemInput } from '../../utils/ecommerceRules';

export interface UserAddress {
  id: string;
  name: string;
  phone: string;
  division: string;
  district: string;
  upazila: string;
  unionWard?: string;
  postalCode?: string;
  street: string;
  landmark?: string;
  isDefault: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'order_manager' | 'inventory_manager' | 'catalog_manager' | 'customer_support' | 'finance' | 'customer';
  phone?: string;
  addresses: UserAddress[];
  avatarUrl?: string;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register' | 'forgot';
  returnUrlAfterAuth?: string;
  isAdminLoginModalOpen: boolean;
  pendingCartAction: CartItemInput | null;
}

const TOKEN_KEY = 'novara_auth_token_v1';
const USER_KEY = 'novara_auth_user_v1';
const PENDING_CART_KEY = 'novara_pending_cart_v1';

function getInitialToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

function getInitialUser(): UserProfile | null {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return null;
}

function getInitialPendingCart(): CartItemInput | null {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(PENDING_CART_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return null;
}

const initialToken = getInitialToken();
const initialUser = getInitialUser();

const initialState: AuthState = {
  user: initialUser,
  token: initialToken,
  isAuthenticated: Boolean(initialToken && initialUser),
  isAuthModalOpen: false,
  authModalMode: 'register', // Default modal mode is strictly Account Creation per requirements
  isAdminLoginModalOpen: false,
  pendingCartAction: getInitialPendingCart(),
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: UserProfile; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isAuthModalOpen = false;
      state.isAdminLoginModalOpen = false;

      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, action.payload.token);
        localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user));
      }
    },
    updateUserAddresses: (state, action: PayloadAction<UserAddress[]>) => {
      if (state.user) {
        state.user.addresses = action.payload;
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_KEY, JSON.stringify(state.user));
        }
      }
    },
    updateUserProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_KEY, JSON.stringify(state.user));
        }
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(PENDING_CART_KEY);
      }
    },
    openAuthModal: (
      state,
      action: PayloadAction<{ mode?: 'login' | 'register' | 'forgot'; returnUrl?: string } | undefined>
    ) => {
      state.isAuthModalOpen = true;
      state.authModalMode = action?.payload?.mode || 'register'; // Default is register
      state.returnUrlAfterAuth = action?.payload?.returnUrl;
    },
    closeAuthModal: (state) => {
      state.isAuthModalOpen = false;
      state.returnUrlAfterAuth = undefined;
    },
    setAuthModalMode: (state, action: PayloadAction<'login' | 'register' | 'forgot'>) => {
      state.authModalMode = action.payload;
    },
    openAdminLoginModal: (state) => {
      state.isAdminLoginModalOpen = true;
    },
    closeAdminLoginModal: (state) => {
      state.isAdminLoginModalOpen = false;
    },
    setPendingCartAction: (state, action: PayloadAction<CartItemInput | null>) => {
      state.pendingCartAction = action.payload;
      if (typeof window !== 'undefined') {
        if (action.payload) {
          localStorage.setItem(PENDING_CART_KEY, JSON.stringify(action.payload));
        } else {
          localStorage.removeItem(PENDING_CART_KEY);
        }
      }
    },
    clearPendingCartAction: (state) => {
      state.pendingCartAction = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem(PENDING_CART_KEY);
      }
    },
  },
});

export const {
  setCredentials,
  updateUserAddresses,
  updateUserProfile,
  logout,
  openAuthModal,
  closeAuthModal,
  setAuthModalMode,
  openAdminLoginModal,
  closeAdminLoginModal,
  setPendingCartAction,
  clearPendingCartAction,
} = authSlice.actions;

export default authSlice.reducer;
