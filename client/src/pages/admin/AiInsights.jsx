import { useState, useEffect } from 'react';
import { Typography, Card, Table, Tag, Button, Space, message, Alert } from 'antd';
import {
  ReloadOutlined, ArrowUpOutlined, ArrowDownOutlined, MinusOutlined,
  ExperimentOutlined, RobotOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { adminService } from '../../api/adminService';

const { Title, Paragraph, Text } = Typography;

const trendIcons = {
  up: <ArrowUpOutlined style={{ color: '#ff4d4f' }} />,
  down: <ArrowDownOutlined style={{ color: '#52c41a' }} />,
  unchanged: <MinusOutlined style={{ color: '#8c8c8c' }} />,
};

const trendLabels = {
  up: 'More Conservative',
  down: 'More Confident',
  unchanged: 'No Change',
};

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1'];

const AiInsights = () => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalibrating, setRecalibrating] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAiInsights();
      setInsights(res.data.insights);
    } catch (error) {
      message.error('Failed to load AI insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInsights(); }, []);

  const handleRecalibrate = async () => {
    setRecalibrating(true);
    try {
      const res = await adminService.triggerRecalibration();
      message.success('Recalibration complete!');
      console.log('Recalibration results:', res.data.results);
      fetchInsights();
    } catch (error) {
      message.error('Recalibration failed.');
    } finally {
      setRecalibrating(false);
    }
  };

  const columns = [
    { title: 'Document Type', dataIndex: 'documentType', key: 'documentType',
      render: (t) => <Text strong>{t}</Text> },
    { title: 'Current Threshold', dataIndex: 'currentConfidenceThreshold', key: 'threshold',
      render: (v) => <Tag color="blue">{v}%</Tag> },
    { title: 'Override Rate', dataIndex: 'overrideRate', key: 'overrideRate',
      render: (v) => {
        const color = v > 30 ? 'red' : v > 10 ? 'orange' : 'green';
        return <Tag color={color}>{v.toFixed(1)}%</Tag>;
      } },
    { title: 'Sample Size', dataIndex: 'sampleSize', key: 'sampleSize' },
    { title: 'Last Recalculated', dataIndex: 'lastRecalculatedAt', key: 'lastRecalc',
      render: (d) => d ? new Date(d).toLocaleString() : 'Never' },
    { title: 'Trend', dataIndex: 'trend', key: 'trend',
      render: (t) => (
        <Space>
          {trendIcons[t] || trendIcons.unchanged}
          <Text>{trendLabels[t] || 'No Change'}</Text>
        </Space>
      ) },
  ];

  const chartData = insights.map(i => ({
    name: i.documentType,
    overrideRate: i.overrideRate,
    threshold: i.currentConfidenceThreshold,
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title level={3}><RobotOutlined /> AI Learning Insights</Title>
        </div>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          loading={recalibrating}
          onClick={handleRecalibrate}
          size="large"
        >
          Recalibrate Now
        </Button>
      </div>

      <Alert
        message="How AI Learning Works"
        description="The AI verification system adjusts its confidence thresholds based on officer feedback. Document types where officers frequently override AI decisions become more conservative (flagged more often for human review); document types where the AI is reliably correct require less manual review over time."
        type="info"
        showIcon
        icon={<ExperimentOutlined />}
        className="mb-4"
      />

      {/* Override Rate Chart */}
      <Card title="Override Rates by Document Type" className="mb-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Override Rate (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
            <Bar dataKey="overrideRate" name="Override Rate">
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Threshold Table */}
      <Card title="Document Type Thresholds">
        <Table
          columns={columns}
          dataSource={insights}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default AiInsights;
