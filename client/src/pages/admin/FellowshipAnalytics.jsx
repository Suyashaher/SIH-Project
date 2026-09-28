import { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Statistic, Spin, Tag, Button } from 'antd';
import { TrophyOutlined, DollarOutlined, WarningOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../api/adminService';

const { Title } = Typography;

const FellowshipAnalytics = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getFellowshipStats().then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center min-h-[40vh]"><Spin size="large" /></div>;

  const disbData = stats?.disbursements ? Object.entries(stats.disbursements).map(([status, data]) => ({
    status,
    count: data.count || 0,
    totalAmount: data.totalAmount || 0,
  })) : [];

  const DISB_COLORS = { PENDING: '#faad14', PROCESSED: '#52c41a', DELAYED: '#ff4d4f', ON_HOLD: '#d9d9d9' };

  return (
    <div>
      <Title level={3}><TrophyOutlined /> Fellowship Analytics</Title>
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={12} sm={6}><Card><Statistic title="Active" value={stats?.fellowshipsByStatus?.ACTIVE || 0} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Suspended" value={stats?.fellowshipsByStatus?.SUSPENDED || 0} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Completed" value={stats?.fellowshipsByStatus?.COMPLETED || 0} valueStyle={{ color: '#1677ff' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="Terminated" value={stats?.fellowshipsByStatus?.TERMINATED || 0} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} lg={14}>
          <Card title="Disbursement Summary">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={disbData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(v, name) => name === 'Total Amount' ? `\u20B9${v.toLocaleString()}` : v} />
                <Legend />
                <Bar yAxisId="left" dataKey="count" name="Count" fill="#1677ff" />
                <Bar yAxisId="right" dataKey="totalAmount" name="Total Amount" fill="#722ed1" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Overdue Documents">
            <Statistic title="Documents Overdue" value={stats?.overdueDocCount || 0} prefix={<WarningOutlined />} valueStyle={{ color: stats?.overdueDocCount > 0 ? '#ff4d4f' : '#52c41a', fontSize: 36 }} />
            {stats?.overdueDocCount > 0 && (
              <Button type="primary" danger className="mt-4" onClick={() => navigate('/admin/fellowships')}>View Fellowships</Button>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FellowshipAnalytics;
