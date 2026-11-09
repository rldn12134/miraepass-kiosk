"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/fetcher";
import { qk } from "@/lib/query-keys";
import type { AppSettings, CategoryDTO, KioskSettings, SessionUser, StoreStatus, VoiceSettings } from "@/lib/types";

export const useMenu = () => useQuery({ queryKey: qk.menu, queryFn: () => api<CategoryDTO[]>("/api/menu") });

export const useStoreStatus = () =>
  useQuery({
    queryKey: qk.storeStatus,
    queryFn: () => api<StoreStatus>("/api/store/status"),
    refetchInterval: 60_000,
  });

export const usePublicSettings = () =>
  useQuery({
    queryKey: qk.publicSettings,
    queryFn: () => api<{ voice: VoiceSettings; kiosk: KioskSettings }>("/api/settings/public"),
    staleTime: 5 * 60_000,
  });

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: () => api<SessionUser | null>("/api/auth/me") });

export const useAdminSettings = () =>
  useQuery({
    queryKey: qk.adminSettings,
    queryFn: () => api<{ settings: AppSettings; status: StoreStatus; kioskToken: string }>("/api/admin/settings"),
  });

export const useAdminMenu = () =>
  useQuery({ queryKey: qk.adminMenu, queryFn: () => api<CategoryDTO[]>("/api/admin/menu") });
