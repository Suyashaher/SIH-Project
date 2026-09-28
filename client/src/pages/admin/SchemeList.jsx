import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Tag, Space, message, Typography, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, SettingOutlined, CheckCircleOutlined, StopOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { schemeService } from '../../api/schemeService';

const { Title } = Typography;
const { TextArea } = Input;

const SchemeList = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const res = await schemeService.getAllSchemes();
      setSchemes(res.data.schemes);
    } catch (error) {
      message.error('Failed to fetch schemes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, []);

  const handleCreateOrUpdate = async (values) => {
    try {
      if (editingScheme) {
        await schemeService.updateScheme(editingScheme.id, values);
        message.success('Scheme updated successfully.');
      } else {
        await schemeService.createScheme(values);
        message.success('Scheme created successfully.');
      }
      setModalOpen(false);
      setEditingScheme(null);
      form.resetFields();
      fetchSchemes();
    } catch (error) {
      message.error(error.response?.data?.message || 'Operation failed.');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await schemeService.toggleStatus(id);
      message.success('Scheme status updated.');
      fetchSchemes();
    } catch (error) {
      message.error('Failed to update status.');
    }
  };

  const openEditModal = (scheme) => {
    setEditingScheme(scheme);
    form.setFieldsValue({ name: scheme.name, description: scheme.description });
    setModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingScheme(null);
    form.resetFields();
    setModalOpen(true);
  };

  const columns = [
    {
      title: 'Scheme Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Rules',
      key: 'rules',
      width: 80,
      render: (_, record) => record._count?.eligibilityRules || 0,
    },
    {
      title: 'Docs',
      key: 'docs',
      width: 80,
      render: (_, record) => record._count?.documentRequirements || 0,
    },
    {
      title: 'Fields',
      key: 'fields',
      width: 80,
      render: (_, record) => record._count?.applicationFields || 0,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button icon={<EditOutlined />} size="small" onClick={() => openEditModal(record)} />
          </Tooltip>
          <Tooltip title="View Applicants">
            <Button
              icon={<TeamOutlined />}
              size="small"
              onClick={() => navigate(`/admin/schemes/${record.id}/applications`)}
            />
          </Tooltip>
          <Tooltip title="Configure">
            <Button
              icon={<SettingOutlined />}
              size="small"
              type="primary"
              onClick={() => navigate(`/admin/schemes/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title={record.isActive ? 'Deactivate' : 'Activate'}>
            <Button
              icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
              size="small"
              danger={record.isActive}
              onClick={() => handleToggleStatus(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={3}>Scheme Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Create New Scheme
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={schemes}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingScheme ? 'Edit Scheme' : 'Create New Scheme'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingScheme(null); form.resetFields(); }}
        onOk={() => form.submit()}
        okText={editingScheme ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate}>
          <Form.Item
            name="name"
            label="Scheme Name"
            rules={[{ required: true, message: 'Please enter scheme name' }]}
          >
            <Input placeholder="e.g., National Fellowship for Scheduled Tribe" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={4} placeholder="Brief description of the scheme" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SchemeList;
