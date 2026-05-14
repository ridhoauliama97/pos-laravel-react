import type { ApiResponse } from "../types";

const BASE_URL = "/api";
let token: string | null = localStorage.getItem("token");

export function setToken(newToken: string | null) {
  token = newToken;
  if (newToken) {
    localStorage.setItem("token", newToken);
  } else {
    localStorage.removeItem("token");
  }
}

export function getToken(): string | null {
  return token;
}

let currentBranchId: string | number | null =
  localStorage.getItem("selectedBranchId");

export function setBranchId(id: number | null) {
  currentBranchId = id;
  if (id) {
    localStorage.setItem("selectedBranchId", String(id));
  } else {
    localStorage.removeItem("selectedBranchId");
  }
}

function getBranchId(): string {
  return String(
    currentBranchId || localStorage.getItem("selectedBranchId") || "1",
  );
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["X-Tenant-ID"] = "1";
    headers["X-Branch-ID"] = getBranchId();
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json: ApiResponse<T>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Server returned an invalid response");
  }

  if (!res.ok) {
    throw new Error(json.message || "Request failed");
  }

  return json;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
  upload: <T>(endpoint: string, data: FormData) => {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["X-Tenant-ID"] = "1";
      headers["X-Branch-ID"] = getBranchId();
    }
    return fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: data,
    }).then(async (res) => {
      const text = await res.text();
      let json: ApiResponse<T>;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Server returned an invalid response");
      }
      if (!res.ok) {
        throw new Error(json.message || "Request failed");
      }
      return json;
    });
  },
};
