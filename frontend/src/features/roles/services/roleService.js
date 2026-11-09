import apiClient from "../../../lib/apiClient";

const roleClient = apiClient;

export const getRoles = async (params = {}) => {
  const response = await roleClient.get("/roles", { params });
  return response.data;
};

export const deleteRole = async (id) => {
  const response = await roleClient.delete(`/roles/${id}`);
  return response.data;
};

export default roleClient;
