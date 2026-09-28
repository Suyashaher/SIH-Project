import { useState, useEffect } from 'react';
import { Typography, Card, Table, Tag, Button, Space, message, Alert } from 'antd';
import { ReloadOutlined, BarChartOutlined, RobotOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { adminService } from '../../api/adminService';

const { Title, Text, Paragraph } = Typography;

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1'];

const ProcessingAnalytics = () => {
  const [benchmarks, setBenchmarks] = useState([]);
  const [mlStatus, setMlStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await adminService.getProcessingAnalytics();
      setBenchmarks(res.data.benchmarks || []);
      setMlStatus(res.data.mlModelStatus || null);
    } catch (error) {
      message.error('Failed to load processing analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await adminService.recalculateBenchmarks();
      message.success('Benchmarks recalculated and ML model retrained!');
      console.log('Results:', res.data);
      fetchAnalytics();
    } catch (error) {
      message.error('Recalculation failed.');
    } finally {
      setRecalculating(false);
    }
  };

  // Prepare chart data: group by scheme, show stage durations
  const chartData = [];
  const schemeMap = {};
  benchmarks.forEach(b => {
    if (!schemeMap[b.scheme]) {
      schemeMap[b.scheme] = { scheme: b.scheme };
    }
    schemeMap[b.scheme][b.stage] = b.averageDurationDays;
  });
  Object.values(schemeMap).forEach(s => chartData.push(s));

  const stageKeys = [...new Set(benchmarks.map(b => b.stage))];

  const columns = [
    { title: 'Scheme', dataIndex: 'scheme', key: 'scheme', render: (s) => <Text strong>{s}</Text> },
    {
      title: 'Stage', dataIndex: 'stage', key: 'stage',
      render: (s) => <Tag>{s.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Avg Duration (days)', dataIndex: 'averageDurationDays', key: 'avgDays',
      render: (v) => <Text strong>{v.toFixed(1)}</Text>,
      sorter: (a, b) => a.averageDurationDays - b.averageDurationDays,
    },
    {
      title: 'Sample Size', dataIndex: 'sampleSize', key: 'sampleSize',
      render: (v, r) => (
        <Space>
          <Text>{v}</Text>
          {r.usingDefault && <Tag color="orange">Using Default</Tag>}
        </Space>
      ),
    },
    {
      title: 'Last Updated', dataIndex: 'lastUpdatedAt', key: 'lastUpdated',
      render: (d) => d ? new Date(d).toLocaleString() : 'Never',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Title level={3}><BarChartOutlined /> Processing Analytics</Title>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          loading={recalculating}
          onClick={handleRecalculate}
          size="large"
        >
          Recalculate Benchmarks
        </Button>
      </div>

      {/* ML Model Status */}
      {mlStatus && (
        <Alert
          message={
            mlStatus.active
              ? `ML-based predictions active (${mlStatus.trainingDataSize} historical cases used)`
              : `Rule-based estimates in use (${mlStatus.trainingDataSize}/${mlStatus.minRequired} cases — need ${mlStatus.minRequired} for ML model)`
          }
          type={mlStatus.active ? 'success' : 'info'}
          showIcon
          icon={<RobotOutlined />}
          className="mb-4"
        />
      )}

      {/* Stage Duration Chart */}
      <Card title="Average Stage Durations by Scheme" className="mb-4">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="scheme" />
              <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {stageKeys.map((stage, idx) => (
                <Bar key={stage} dataKey={stage} name={stage.replace(/_/g, ' ')} fill={COLORS[idx % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Paragraph type="secondary">No benchmark data yet. Click "Recalculate Benchmarks" to generate.</Paragraph>
        )}
      </Card>

      {/* Benchmark Table */}
      <Card title="Stage Duration Benchmarks">
        <Table
          columns={columns}
          dataSource={benchmarks}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default ProcessingAnalytics;
