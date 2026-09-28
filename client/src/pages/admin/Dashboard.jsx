import { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Statistic, Select, Tag, List, Spin } from 'antd';
import {
  FileTextOutlined, CheckCircleOutlined, TrophyOutlined, DollarOutlined,
  ClockCircleOutlined, ArrowRightOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { adminService } from '../../api/adminService';

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_COLORS = {
  SUBMITTED: '#1677ff', UNDER_VERIFICATION: '#722ed1', DEFICIENT: '#faad14',
  UNDER_SCRUTINY: '#13c2c2', READY_FOR_SELECTION: '#52c41a', SELECTED: '#389e0d',
  REJECTED: '#ff4d4f', WAITLISTED: '#fa8c16', DRAFT: '#d9d9d9',
};

const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async (schemeId) => {
    setLoading(true);
    try {
      const [overviewRes, schemesRes] = await Promise.all([
        adminService.getDashboardOverview(schemeId),
        adminService.getDashboardByScheme(),
      ]);
      setOverview(overviewRes.data);
      setSchemes(schemesRes.data.schemes || []);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(selectedScheme); }, [selectedScheme]);

  if (loading && !overview) return <div className="flex justify-center items-center min-h-[40vh]"><Spin size="large" /></div>;

  // Prepare funnel chart data
  const funnelData = overview ? [
    { stage: 'Submitted', count: (overview.byStatus?.SUBMITTED || 0) + (overview.byStatus?.UNDER_VERIFICATION || 0) + (overview.byStatus?.DEFICIENT || 0) + (overview.byStatus?.UNDER_SCRUTINY || 0) + (overview.byStatus?.READY_FOR_SELECTION || 0) + (overview.byStatus?.SELECTED || 0) + (overview.byStatus?.REJECTED || 0) + (overview.byStatus?.WAITLISTED || 0) },
    { stage: 'Verification', count: (overview.byStatus?.UNDER_VERIFICATION || 0) + (overview.byStatus?.UNDER_SCRUTINY || 0) + (overview.byStatus?.READY_FOR_SELECTION || 0) + (overview.byStatus?.SELECTED || 0) + (overview.byStatus?.REJECTED || 0) + (overview.byStatus?.WAITLISTED || 0) },
    { stage: 'Scrutiny', count: (overview.byStatus?.UNDER_SCRUTINY || 0) + (overview.byStatus?.READY_FOR_SELECTION || 0) + (overview.byStatus?.SELECTED || 0) + (overview.byStatus?.REJECTED || 0) + (overview.byStatus?.WAITLISTED || 0) },
    { stage: 'Selection', count: (overview.byStatus?.READY_FOR_SELECTION || 0) + (overview.byStatus?.SELECTED || 0) + (overview.byStatus?.REJECTED || 0) + (overview.byStatus?.WAITLISTED || 0) },
    { stage: 'Selected', count: overview.byStatus?.SELECTED || 0 },
  ] : [];

  const FUNNEL_COLORS = ['#1677ff', '#722ed1', '#13c2c2', '#52c41a', '#389e0d'];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>Admin Dashboard</Title>
        <Select
          placeholder="All Schemes" allowClear style={{ width: 250 }}
          onChange={(v) => setSelectedScheme(v || null)} value={selectedScheme}
        >
          {schemes.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
        </Select>
      </div>

      {/* Key Stats */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Total Applications" value={overview?.totalApplications || 0} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Selected" value={overview?.byStatus?.SELECTED || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#389e0d' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Active Fellowships" value={overview?.totalActiveFellowships || 0} prefix={<TrophyOutlined />} valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Pending Disbursements" value={overview?.totalDisbursementsPending || 0} prefix={<DollarOutlined />} valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
      </Row>

      {/* Application Status Funnel */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={14}>
          <Card title="Application Pipeline Funnel">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" name="Applications">
                  {funnelData.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Status Breakdown" style={{ height: '100%' }}>
            <Row gutter={[8, 8]}>
              {Object.entries(overview?.byStatus || {}).map(([status, count]) => (
                <Col span={12} key={status}>
                  <div className="flex justify-between items-center p-2 rounded" style={{ background: `${STATUS_COLORS[status]}10` }}>
                    <Text style={{ fontSize: 12 }}>{status.replace(/_/g, ' ')}</Text>
                    <Tag color={STATUS_COLORS[status]}>{count}</Tag>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Card title={<><ClockCircleOutlined /> Recent Activity</>}>
        <List
          dataSource={overview?.recentActivity || []}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={<Text>{item.applicantName} <ArrowRightOutlined style={{ fontSize: 10, margin: '0 4px' }} /> <Tag>{item.newStatus.replace(/_/g, ' ')}</Tag></Text>}
                description={<Text type="secondary">{item.schemeName} • {new Date(item.changedAt).toLocaleString()}{item.remarks ? ` • ${item.remarks}` : ''}</Text>}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default AdminDashboard;
