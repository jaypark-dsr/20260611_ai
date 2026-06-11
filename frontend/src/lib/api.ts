// 백엔드 뉴스 API 호출 래퍼. 개발 중에는 Vite 프록시로 /api 가 백엔드(3001)로 전달된다.

import type { Dashboard, ArchiveIndex } from "../types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchLatest(): Promise<Dashboard> {
  return getJson<Dashboard>("/api/news");
}

export function fetchArchiveIndex(): Promise<ArchiveIndex> {
  return getJson<ArchiveIndex>("/api/archive");
}

export function fetchDay(date: string): Promise<Dashboard> {
  return getJson<Dashboard>(`/api/news/${encodeURIComponent(date)}`);
}

export function fetchMonth(month: string): Promise<Dashboard> {
  return getJson<Dashboard>(`/api/month/${encodeURIComponent(month)}`);
}
