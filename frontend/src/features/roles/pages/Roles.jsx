
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppstoreOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import {
  Table,
  Input,
  Select,
  Button,
  Tag,
  Card,
  Statistic,
  Row,
  Col,
  Space,
  Popconfirm,
  message,
} from "antd";

import UMLayout from "../../../layouts/UMLayout";
import { useTheme } from "../../../context/ThemeContext";
import { getRoles, deleteRole } from "../services/roleService";

export default function Roles() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [moduleCode, setModuleCode] = useState(undefined);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
  });

  const fetchRoles = async () => {
    try {
      setLoading(true);

      const response = await getRoles({
        page,
        limit: pagination.limit,
        search: search || undefined,
        module_code: moduleCode,
      });

      const result = response.data;

      setRoles(result.items || []);
      setPagination({
        total: result.pagination?.total || 0,
        limit: result.pagination?.limit || 20,
      });
    } catch (error) {
      message.error(
        error.response?.data?.message || "Unable to load roles."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [page, search, moduleCode]);

  const handleDelete = async (id) => {
    try {
      await deleteRole(id);
      message.success("Role deleted or deactivated successfully.");
      fetchRoles();
    } catch (error) {
      message.error(
        error.response?.data?.message || "Unable to delete role."
      );
    }
  };

  const totalRoles = pagination.total;
  const systemRoles = roles.filter(
    (role) => role.scope === "SYSTEM"
  ).length;
  const moduleRoles = roles.filter(
    (role) => role.scope === "MODULE"
  ).length;

  const columns = [
    {
      title: "ROLE",
      key: "role",
      render: (_, record) => (
        <div>
          <div className="font-semibold">
            {record.name}
          </div>
          <div className="text-xs text-gray-500">
            {record.code}
          </div>
        </div>
      ),
    },
    {
      title: "MODULE",
      dataIndex: "modules",
      key: "module",
      render: (module) =>
        module ? (
          <Tag color="purple">{module.name}</Tag>
        ) : (
          <Tag color="blue">System</Tag>
        ),
    },
    {
      title: "SCOPE",
      dataIndex: "scope",
      key: "scope",
      render: (scope) => (
        <Tag color={scope === "SYSTEM" ? "blue" : "green"}>
          {scope}
        </Tag>
      ),
    },
    {
      title: "PERMISSIONS",
      key: "permissions",
      render: (_, record) => (
        <span>
          {record._count?.role_permissions ?? 0}
        </span>
      ),
    },
    {
      title: "ASSIGNED USERS",
      key: "users",
      render: (_, record) => (
        <span>
          {(record._count?.user_module_roles ?? 0) +
            (record._count?.user_system_roles ?? 0)}
        </span>
      ),
    },
    {
      title: "STATUS",
      dataIndex: "is_active",
      key: "status",
      render: (active) => (
        <Tag color={active ? "success" : "default"}>
          {active ? "ACTIVE" : "INACTIVE"}
        </Tag>
      ),
    },
    {
      title: "ACTIONS",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/roles/view/${record.id}`)}
            title="View role"
          />

          <Button
            type="text"
            icon={<EditOutlined />}
            disabled={record.is_system_role}
            onClick={() => navigate(`/roles/edit/${record.id}`)}
            title="Edit role"
          />

          <Popconfirm
            title="Delete this role?"
            description="Assigned roles will be deactivated instead."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            disabled={record.is_system_role}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={record.is_system_role}
              title="Delete role"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <UMLayout>
      <div
        className={`min-h-screen p-4 md:p-6 ${
          isDarkMode
            ? "bg-[#111827] text-white"
            : "bg-[#F8F7FA] text-gray-800"
        }`}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              Roles Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage system roles, module roles and permissions.
            </p>
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/roles/add")}
            style={{
              background: "#7A1849",
              borderColor: "#7A1849",
            }}
          >
            Create Role
          </Button>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Roles"
                value={totalRoles}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="System Roles (Current Page)"
                value={systemRoles}
                prefix={<SafetyCertificateOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Module Roles (Current Page)"
                value={moduleRoles}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Roles Table */}
        <Card
          title="All Roles"
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchRoles}
            >
              Refresh
            </Button>
          }
        >
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search role name or code..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="max-w-md"
            />

            <Select
              allowClear
              placeholder="Filter by module"
              className="w-full sm:w-52"
              value={moduleCode}
              onChange={(value) => {
                setModuleCode(value);
                setPage(1);
              }}
              options={[
                { label: "Journal Management", value: "JMS" },
                { label: "eBook Publishing", value: "EBOOK" },
                { label: "Library Management", value: "LMS" },
                { label: "Research Repository", value: "REPOSITORY" },
                { label: "Oromo Wiki", value: "WIKI" },
                { label: "Researchers Network", value: "RNP" },
              ]}
            />
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={roles}
            loading={loading}
            scroll={{ x: 900 }}
            pagination={{
              current: page,
              pageSize: pagination.limit,
              total: pagination.total,
              showSizeChanger: false,
              onChange: (nextPage) => setPage(nextPage),
            }}
          />
        </Card>
      </div>
    </UMLayout>
  );
}
