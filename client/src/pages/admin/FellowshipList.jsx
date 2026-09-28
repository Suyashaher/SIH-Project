import { useState, useEffect } from 'react';
import { Typography, Card, Table, Tag, Button, Input, Select, Space, message } from 'antd';
import { SearchOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { fellowshipAdminService } from '../../api/fellowshipService';

const { Title } = Typography;
const { Option } = Select;

const statusColors = {
  ACTIVE: 'success', SUSPENDED: 'warning', COMPLETED: 'blue', TERMINATED: 'error',
};

const FellowshipList = () => {
  const navigate = useNavigate();
  const [fellowships, setFellowships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '' });

  const fetchFellowships = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const res = await fellowshipAdminService.getAll(params);
      setFellowships(res.data.fellowships || []);
    } catch (error) {
      message.error('Failed to load fellowships.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFellowships(); }, [filters]);

  const handleCheckOverdue = async () => {
    try {
      const res = await fellowshipAdminService.checkOverdue();
      message.success(`Overdue check: ${res.data.overdueDisb} disbursements delayed, ${res.data.overdueDocs} documents overdue.`);
      fetchFellowships();
    } catch (error) {
      message.error('Overdue check failed.');
    }
  };

  const columns = [
    {
      title: 'Applicant', key: 'applicant',
      render: (_, r) => r.applicant?.name || 'Unknown',
    },
    {
      title: 'Scheme', key: 'scheme',
      render: (_, r) => r.scheme?.name || 'Unknown',
    },
    {
      title: 'Status', dataIndex: 'fellowshipStatus', key: 'status',
      render: (s) => <Tag color={statusColors[s]}>{s}</Tag>,
    },
    {
      title: 'Start Date', dataIndex: 'startDate', key: 'startDate',
      render: (d) => new Date(d).toLocaleDateString(),
    },
    {
      title: 'Next Disbursement', key: 'nextDisb',
      render: (_, r) => r.nextDisbursementDue
        ? new Date(r.nextDisbursementDue).toLocaleDateString()
        : <Tag>None</Tag>,
    },
    {
      title: 'Pending Docs', key: 'pendingDocs',
      render: (_, r) => r.pendingDocumentsCount > 0
        ? <Tag color="orange" icon={<WarningOutlined />}>{r.pendingDocumentsCount}</Tag>
        : <Tag color="green" icon={<CheckCircleOutlined />}>0</Tag>,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Button type="primary" size="small" onClick={() => navigate(`/admin/fellowships/${r.id}`)}>View</Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Title level={3}>Fellowship Management</Title>
        <Button onClick={handleCheckOverdue}>Check Overdue</Button>
      </div>
      <Card className="mb-4">
        <Space wrap>
          <Input placeholder="Search applicant" prefix={<SearchOutlined />} allowClear
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))} style={{ width: 250 }} />
          <Select placeholder="Filter by Status" allowClear style={{ width: 200 }}
            onChange={(v) => setFilters(f => ({ ...f, status: v || '' }))}>
            <Option value="ACTIVE">Active</Option>
            <Option value="SUSPENDED">Suspended</Option>
            <Option value="COMPLETED">Completed</Option>
            <Option value="TERMINATED">Terminated</Option>
          </Select>
        </Space>
      </Card>
      <Card>
        <Table columns={columns} dataSource={fellowships} rowKey="id" loading={loading} />
      </Card>
    </div>
  );
};

export default FellowshipList;
