import { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Statistic, Spin, Tag } from 'antd';
import { TrophyOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { adminService } from '../../api/adminService';

const { Title, Text } = Typography;

const SelectionAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getSelectionStats().then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center min-h-[40vh]"><Spin size="large" /></div>;

  return (
    <div>
      <Title level={3}><TrophyOutlined /> Selection Analytics</Title>
      {stats?.schemes?.map(scheme => (
        <Card key={scheme.schemeId} title={scheme.schemeName} className="mb-4">
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={12} sm={6}><Statistic title="Ranked" value={scheme.totalRanked} /></Col>
            <Col xs={12} sm={6}><Statistic title="Selected" value={scheme.totalSelected} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#389e0d' }} /></Col>
            <Col xs={12} sm={6}><Statistic title="Rejected" value={scheme.totalRejected} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} /></Col>
            <Col xs={12} sm={6}><Statistic title="Waitlisted" value={scheme.totalWaitlisted} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#fa8c16' }} /></Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic title="Seat Utilization" value={scheme.totalSelected} suffix={`/ ${scheme.totalSeats || 'N/A'}`} />
                <Tag color={scheme.totalSelected >= scheme.totalSeats ? 'success' : 'processing'} className="mt-2">
                  {scheme.totalSeats ? `${Math.round((scheme.totalSelected / scheme.totalSeats) * 100)}% filled` : 'No seats set'}
                </Tag>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small"><Statistic title="Avg Score" value={scheme.avgScore} suffix="/ 100" /></Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" title="Score Distribution">
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={scheme.scoreDistribution}>
                    <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#722ed1" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </Card>
      ))}
    </div>
  );
};

export default SelectionAnalytics;
