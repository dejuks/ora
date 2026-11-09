import apiClient from "../../../lib/apiClient";

export const listUsers = async (params = {}) =>
  (await apiClient.get("/users", { params })).data;

export const getUserOptions = async () =>
  (await apiClient.get("/users/options")).data;

export const createUser = async (payload) =>
  (await apiClient.post("/users", payload)).data;

export const updateUserStatus = async (id, status) =>
  (await apiClient.patch(`/users/${id}/status`, { status })).data;

export const getUserStats = async () =>
  (await apiClient.get("/users/stats")).data;
