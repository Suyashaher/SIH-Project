import { useState, useEffect } from 'react';
import { Typography, Card, Table, Tag, Spin } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { adminService } from '../../api/adminService';

const { Title, Text } = Typography;

const OfficerPerformance = () => {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getOfficerStats().then(r => setOfficers(r.data.officers || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'Officer', dataIndex: 'name', key: 'name', render: (n, r) => <><Text strong>{n}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text></> },
    { title: 'Assigned', dataIndex: 'assignedCount', key: 'assigned', sorter: (a, b) => a.assignedCount - b.assignedCount },
    { title: 'Completed', dataIndex: 'completedCount', key: 'completed', sorter: (a, b) => a.completedCount - b.completedCount, render: (v) => <Tag color="success">{v}</Tag> },
    { title: 'Avg Days', dataIndex: 'avgProcessingDays', key: 'avgDays', sorter: (a, b) => a.avgProcessingDays - b.avgProcessingDays, render: (v) => v > 0 ? `${v} days` : '-' },
    { title: 'AI Overrides', dataIndex: 'overrideCount', key: 'overrides', sorter: (a, b) => a.overrideCount - b.overrideCount, render: (v) => v > 0 ? <Tag color="warning">{v}</Tag> : <Tag>0</Tag> },
  ];

  return (
    <div>
      <Title level={3}><TeamOutlined /> Officer Performance</Title>
      <Card>
        <Table columns={columns} dataSource={officers} rowKey="id" loading={loading} />
      </Card>
    </div>
  );
};

export default OfficerPerformance;
