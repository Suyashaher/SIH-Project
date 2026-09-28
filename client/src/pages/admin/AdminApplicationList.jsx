import { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, Space, Button, Input } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { adminService } from '../../api/adminService';

const { Title, Text } = Typography;

const statusColors = {
  DRAFT: 'default',
  SUBMITTED: 'blue',
  UNDER_VERIFICATION: 'processing',
  DEFICIENT: 'warning',
  UNDER_SCRUTINY: 'purple',
  READY_FOR_SELECTION: 'cyan',
  SELECTED: 'success',
  REJECTED: 'error',
  WAITLISTED: 'gold',
};

const AdminApplicationList = () => {
  const { schemeId } = useParams();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchApplications();
  }, [schemeId]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await adminService.getApplications(schemeId);
      setApplications(response.data.applications);
    } catch (error) {
      console.error('Failed to fetch applications', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Applicant Name',
      dataIndex: ['applicant', 'name'],
      key: 'name',
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) => record.applicant.name.toLowerCase().includes(value.toLowerCase()) || record.applicant.email.toLowerCase().includes(value.toLowerCase()),
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" className="text-xs">{record.applicant.email}</Text>
        </div>
      )
    },
    {
      title: 'Scheme',
      dataIndex: ['scheme', 'name'],
      key: 'schemeName',
    },
    {
      title: 'Submitted Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status] || 'default'}>
          {status.replace(/_/g, ' ')}
        </Tag>
      ),
      filters: Object.keys(statusColors).map(s => ({ text: s.replace(/_/g, ' '), value: s })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Application ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <Text copyable className="text-xs">{id.slice(0, 8)}...</Text>
    }
  ];

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-4">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/schemes')}>
          Back to Schemes
        </Button>
      </div>

      <Card className="shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <Title level={3} className="!mb-0">Scheme Applications</Title>
          <Input 
            placeholder="Search by applicant name or email" 
            prefix={<SearchOutlined />} 
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
        </div>

        <Table
          columns={columns}
          dataSource={applications}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>
    </div>
  );
};

export default AdminApplicationList;
