import { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Statistic, Table, Tag, Spin } from 'antd';
import { SafetyCertificateOutlined, WarningOutlined, CloseCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { adminService } from '../../api/adminService';

const { Title } = Typography;
const COLORS = ['#52c41a', '#faad14', '#ff4d4f', '#d9d9d9'];

const VerificationAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [defStats, setDefStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [vRes, dRes] = await Promise.all([
          adminService.getVerificationStats(),
          adminService.getDeficiencyStats(),
        ]);
        setStats(vRes.data);
        setDefStats(dRes.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center items-center min-h-[40vh]"><Spin size="large" /></div>;

  const pieData = stats ? Object.entries(stats.aiStatusCounts || {}).map(([name, value]) => ({ name, value })) : [];

  const flaggedColumns = [
    { title: 'Document Type', dataIndex: 'documentType', key: 'type' },
    { title: 'Flag Count', dataIndex: 'flagCount', key: 'count', sorter: (a, b) => a.flagCount - b.flagCount, render: (v) => <Tag color="error">{v}</Tag> },
    { title: 'Top Reasons', key: 'reasons', render: (_, r) => r.topReasons?.map((tr, i) => <Tag key={i}>{tr.reason} ({tr.count})</Tag>) },
  ];

  return (
    <div>
      <Title level={3}><SafetyCertificateOutlined /> Verification Analytics</Title>
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={6}><Card><Statistic title="Total Documents" value={stats?.totalDocs || 0} prefix={<SafetyCertificateOutlined />} /></Card></Col>
        <Col xs={24} sm={6}><Card><Statistic title="Verified" value={stats?.aiStatusCounts?.VERIFIED || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={24} sm={6}><Card><Statistic title="Flagged" value={stats?.aiStatusCounts?.FLAGGED || 0} prefix={<WarningOutlined />} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col xs={24} sm={6}><Card><Statistic title="Failed" value={stats?.aiStatusCounts?.FAILED || 0} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} lg={10}>
          <Card title="AI Status Distribution">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /><Legend /></PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="Avg Confidence by Document Type">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats?.avgConfidenceByType || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="documentType" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="avgConfidence" fill="#1677ff" name="Avg Confidence" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} lg={14}>
          <Card title="Top Flagged Document Types">
            <Table columns={flaggedColumns} dataSource={stats?.topFlagged || []} rowKey="documentType" pagination={false} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Deficiency Summary">
            <Row gutter={[16, 16]}>
              <Col span={8}><Statistic title="Total" value={defStats?.total || 0} /></Col>
              <Col span={8}><Statistic title="Open" value={defStats?.open || 0} valueStyle={{ color: '#ff4d4f' }} /></Col>
              <Col span={8}><Statistic title="Resolved" value={defStats?.resolved || 0} valueStyle={{ color: '#52c41a' }} /></Col>
            </Row>
            <div className="mt-4"><Statistic title="Avg Resolution Time" value={defStats?.avgResolveDays || 0} suffix="days" /></div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default VerificationAnalytics;
