import { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, Button, Input, Select, Space, message, Tooltip } from 'antd';
import { EyeOutlined, UserAddOutlined, SearchOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { officerService } from '../../api/officerService';
import { useAuth } from '../../contexts/AuthContext';

const { Title } = Typography;
const { Option } = Select;

const statusColors = {
  SUBMITTED: 'blue', UNDER_VERIFICATION: 'processing', DEFICIENT: 'warning',
  UNDER_SCRUTINY: 'purple', READY_FOR_SELECTION: 'cyan', SELECTED: 'success',
  WAITLISTED: 'orange', REJECTED: 'error',
};

const ApplicationQueue = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', schemeId: '', search: '', page: 1, limit: 20 });

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.schemeId) params.schemeId = filters.schemeId;
      if (filters.search) params.search = filters.search;
      params.page = filters.page;
      params.limit = filters.limit;

      const res = await officerService.getApplications(params);
      setApplications(res.data.applications);
      setTotal(res.data.total);
    } catch (error) {
      message.error('Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplications(); }, [filters]);

  const handleClaim = async (id) => {
    try {
      await officerService.claimApplication(id);
      message.success('Application claimed!');
      fetchApplications();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to claim.');
    }
  };

  const columns = [
    { title: 'Applicant', dataIndex: ['applicant', 'name'], key: 'name' },
    { title: 'Scheme', dataIndex: ['scheme', 'name'], key: 'scheme' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => <Tag color={statusColors[s] || 'default'}>{s.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Submitted', dataIndex: 'submittedAt', key: 'date',
      render: (d) => d ? new Date(d).toLocaleDateString() : '-',
    },
    {
      title: 'ETA', key: 'eta', width: 120,
      render: (_, r) => {
        if (!r.predictedCompletionDate) return <Tag>N/A</Tag>;
        const daysLeft = r.predictedDaysRemaining ? Math.ceil(r.predictedDaysRemaining) : '?';
        return (
          <Tooltip title={`${r.predictionMethod === 'ML_MODEL' ? 'AI' : 'Rule-based'} estimate`}>
            <Tag icon={<ClockCircleOutlined />} color={daysLeft <= 3 ? 'red' : daysLeft <= 7 ? 'orange' : 'blue'}>
              {daysLeft}d
            </Tag>
          </Tooltip>
        );
      },
      sorter: (a, b) => (a.predictedDaysRemaining || 999) - (b.predictedDaysRemaining || 999),
    },
    {
      title: 'Assigned To', key: 'assigned',
      render: (_, r) => r.assignedOfficer ? (
        <Tag color="blue">{r.assignedOfficer.name}</Tag>
      ) : <Tag>Unclaimed</Tag>,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space>
          {!r.assignedOfficerId && (
            <Button size="small" icon={<UserAddOutlined />} onClick={() => handleClaim(r.id)}>Claim</Button>
          )}
          <Button size="small" type="primary" icon={<EyeOutlined />}
            onClick={() => navigate(`/officer/applications/${r.id}`)}>
            Review
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}>Application Queue</Title>
      <Card className="mb-4">
        <Space wrap>
          <Input
            placeholder="Search by applicant name"
            prefix={<SearchOutlined />}
            allowClear
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            style={{ width: 250 }}
          />
          <Select
            placeholder="Filter by Status"
            allowClear
            style={{ width: 200 }}
            onChange={(v) => setFilters(f => ({ ...f, status: v || '', page: 1 }))}
          >
            <Option value="SUBMITTED">Submitted</Option>
            <Option value="UNDER_VERIFICATION">Under Verification</Option>
            <Option value="DEFICIENT">Deficient</Option>
            <Option value="UNDER_SCRUTINY">Under Scrutiny</Option>
            <Option value="READY_FOR_SELECTION">Ready for Selection</Option>
            <Option value="SELECTED">Selected</Option>
            <Option value="WAITLISTED">Waitlisted</Option>
            <Option value="REJECTED">Rejected</Option>
          </Select>
        </Space>
      </Card>
      <Card>
        <Table
          columns={columns}
          dataSource={applications}
          rowKey="id"
          loading={loading}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total,
            onChange: (page) => setFilters(f => ({ ...f, page })),
          }}
        />
      </Card>
    </div>
  );
};

export default ApplicationQueue;
