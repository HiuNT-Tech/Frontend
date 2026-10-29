import { configureStore } from '@reduxjs/toolkit';
import { activeBoardReducer } from '@/redux/activeBoard/activeBoardSlice';
import { userReducer } from '@/redux/user/userSlice';
import { combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  createTransform,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  type PersistConfig,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { stripAuthTokens } from '@/lib/auth-token';
import type { UserState } from '@/redux/user/userSlice';

const reducers = combineReducers({
  activeBoard: activeBoardReducer,
  user: userReducer,
});

type AppState = ReturnType<typeof reducers>;

// Chốt chặn cuối: dù slice user có lỡ chứa token (bản cũ đã persist, hoặc code
// mới nhét nhầm) thì không bao giờ ghi xuống / đọc lên từ localStorage.
const stripTokensFromUser = (state: UserState): UserState => ({
  ...state,
  currentUser: state.currentUser ? stripAuthTokens(state.currentUser) : null,
});

const stripAuthTokensTransform = createTransform<
  UserState,
  UserState,
  AppState
>(stripTokensFromUser, stripTokensFromUser, { whitelist: ['user'] });

const persistConfig: PersistConfig<AppState> = {
  key: 'root',
  storage,
  whitelist: ['user'],
  transforms: [stripAuthTokensTransform],
};

const persistedReducer = persistReducer(persistConfig, reducers);

const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
