import { useState, useEffect } from 'react';
import { Table, Typography, Tag, Button, Spin, message, Space } from 'antd';
import { EyeOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { applicationService } from '../../api/applicantService';

const { Title } = Typography;

const statusColors = {
  DRAFT: 'default',
  SUBMITTED: 'blue',
  UNDER_VERIFICATION: 'processing',
  DEFICIENT: 'warning',
  UNDER_SCRUTINY: 'purple',
  SELECTED: 'success',
  REJECTED: 'error',
};

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await applicationService.getAll();
        setApplications(res.data.applications);
      } catch (error) {
        message.error('Failed to load applications.');
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  const columns = [
    {
      title: 'Scheme',
      dataIndex: ['scheme', 'name'],
      key: 'scheme',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (status) => (
        <Tag color={statusColors[status] || 'default'}>
          {status.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Last Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          icon={record.status === 'DRAFT' ? <EditOutlined /> : <EyeOutlined />}
          onClick={() => navigate(`/applicant/applications/${record.id}`)}
        >
          {record.status === 'DRAFT' ? 'Continue' : 'View'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}>My Applications</Title>
      <Table
        columns={columns}
        dataSource={applications}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: 'You have no applications yet. Browse schemes to apply!' }}
      />
    </div>
  );
};

export default MyApplications;
