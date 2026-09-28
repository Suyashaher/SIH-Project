import { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Tag, Modal, Form, Input, Select, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, ApiOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { adminService } from '../../api/adminService';

const { Title } = Typography;
const { Option } = Select;

const OfficerManagement = () => {
  const [officers, setOfficers] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  const [currentOfficer, setCurrentOfficer] = useState(null);
  
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [assignForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [offRes, schRes] = await Promise.all([
        adminService.getOfficers(),
        adminService.getSchemes(),
      ]);
      setOfficers(offRes.data.officers);
      setSchemes(schRes.data.schemes.filter(s => s.isActive));
    } catch (error) {
      message.error('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (values) => {
    if (values.password !== values.confirmPassword) {
      return message.error('Passwords do not match');
    }
    try {
      await adminService.createOfficer({ name: values.name, email: values.email, password: values.password });
      message.success('Officer created successfully');
      setIsCreateModalOpen(false);
      createForm.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to create officer');
    }
  };

  const handleEdit = async (values) => {
    try {
      await adminService.updateOfficer(currentOfficer.id, values);
      message.success('Officer updated');
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to update officer');
    }
  };

  const handleAssignSchemes = async (values) => {
    try {
      await adminService.updateOfficerSchemes(currentOfficer.id, values.schemeIds);
      message.success('Schemes assigned');
      setIsAssignModalOpen(false);
      fetchData();
    } catch (error) {
      message.error('Failed to assign schemes');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await adminService.toggleOfficerStatus(id);
      message.success('Officer status updated');
      fetchData();
    } catch (error) {
      message.error('Failed to update status');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Assigned Schemes',
      key: 'schemes',
      render: (_, record) => (
        <Space size={[0, 4]} wrap>
          {record.assignedSchemes?.length > 0 ? (
            record.assignedSchemes.map(as => (
              <Tag color="blue" key={as.scheme.id}>{as.scheme.name}</Tag>
            ))
          ) : (
            <span className="text-gray-400">None</span>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Created Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => {
              setCurrentOfficer(record);
              editForm.setFieldsValue({ name: record.name, email: record.email });
              setIsEditModalOpen(true);
            }} 
          />
          <Button 
            type="text" 
            icon={<ApiOutlined />} 
            onClick={() => {
              setCurrentOfficer(record);
              assignForm.setFieldsValue({ schemeIds: record.assignedSchemes.map(as => as.scheme.id) });
              setIsAssignModalOpen(true);
            }} 
          >
            Assign Schemes
          </Button>
          <Popconfirm
            title={record.isActive ? 'Deactivate Officer?' : 'Activate Officer?'}
            description={record.isActive ? 'They will no longer be able to log in.' : 'They will regain access.'}
            onConfirm={() => handleToggleStatus(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              type="text" 
              danger={record.isActive} 
              className={!record.isActive ? 'text-green-500' : ''}
              icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
            >
              {record.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Officer Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>
          Create New Officer
        </Button>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={officers} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create Modal */}
      <Modal
        title="Create New Officer"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="confirmPassword" label="Confirm Password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Create Officer</Button>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Officer"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Update Officer</Button>
        </Form>
      </Modal>

      {/* Assign Schemes Modal */}
      <Modal
        title={`Assign Schemes to ${currentOfficer?.name}`}
        open={isAssignModalOpen}
        onCancel={() => setIsAssignModalOpen(false)}
        footer={null}
      >
        <Form form={assignForm} layout="vertical" onFinish={handleAssignSchemes}>
          <Form.Item 
            name="schemeIds" 
            label="Select Active Schemes"
            extra="The officer will be able to review applications for these schemes."
          >
            <Select mode="multiple" placeholder="Select schemes" style={{ width: '100%' }}>
              {schemes.map(s => (
                <Option key={s.id} value={s.id}>{s.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Save Assignments</Button>
        </Form>
      </Modal>
    </div>
  );
};

export default OfficerManagement;
