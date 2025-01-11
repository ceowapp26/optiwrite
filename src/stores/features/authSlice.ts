import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Auth {
  sessionId: string | null;
  email: string | null;
}

interface AuthState {
  auth: Auth; 
}

const initialState: AuthState = {
  auth: {
    sessionId: null,
    email: null,
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    storeSession: (state, action: PayloadAction<Partial<Auth>>) => { 
      const { sessionId, email } = action.payload;
      if (sessionId !== undefined) {
        state.auth.sessionId = sessionId;
      }
      if (email !== undefined) {
        state.auth.email = email;
      }
    },
    reset: () => initialState,
  },
});

export const { storeSession, reset } = authSlice.actions;

export const selectSession = (state: { auth: AuthState }) => state.auth.auth;

export default authSlice.reducer;