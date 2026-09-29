import { useState, useEffect } from 'react';
import { Typography, Card, Table, Tag, Spin, Tabs, Popover, Space, Statistic, Row, Col } from 'antd';
import { TrophyOutlined, InfoCircleOutlined, ThunderboltOutlined, CrownOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { adminService } from '../../api/adminService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

const { Title, Text } = Typography;

const OfficerLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('WEEKLY');

  useEffect(() => {
    fetchLeaderboard(period);
  }, [period]);

  const fetchLeaderboard = async (selectedPeriod) => {
    setLoading(true);
    try {
      const response = await adminService.getOfficerLeaderboard(selectedPeriod);
      setLeaderboard(response.data.leaderboard || []);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <CrownOutlined className="text-yellow-500 text-xl" />;
    if (rank === 2) return <CrownOutlined className="text-gray-400 text-xl" />;
    if (rank === 3) return <CrownOutlined className="text-amber-600 text-xl" />;
    return <span className="text-gray-500 font-medium">#{rank}</span>;
  };

  const ScoreBreakdown = ({ breakdown }) => (
    <div className="p-2 w-64">
      <Title level={5} className="!mb-4 border-b pb-2">Score Formula</Title>
      <Row justify="space-between" className="mb-2">
        <Col><Text type="secondary">Apps Completed (×10):</Text></Col>
        <Col><Text className="text-green-600">+{breakdown.completionPoints}</Text></Col>
      </Row>
      <Row justify="space-between" className="mb-2">
        <Col><Text type="secondary">Avg Hours (×-0.5):</Text></Col>
        <Col><Text className="text-red-500">{breakdown.speedPenalty}</Text></Col>
      </Row>
      <Row justify="space-between" className="mb-2 border-b pb-2">
        <Col><Text type="secondary">Accuracy Rate (×2):</Text></Col>
        <Col><Text className="text-blue-500">+{breakdown.accuracyBonus}</Text></Col>
      </Row>
      <Row justify="space-between">
        <Col><Text strong>Total Score:</Text></Col>
        <Col><Text strong>{(breakdown.completionPoints + breakdown.speedPenalty + breakdown.accuracyBonus).toFixed(2)}</Text></Col>
      </Row>
    </div>
  );

  const columns = [
    { 
      title: 'Rank', 
      dataIndex: 'rank', 
      key: 'rank', 
      width: 80,
      align: 'center',
      render: (rank) => getRankIcon(rank)
    },
    { 
      title: 'Officer', 
      dataIndex: 'officerName', 
      key: 'name', 
      render: (n, r) => (
        <div>
          <Text strong className="text-gray-800">{n}</Text>
          <br />
          <Text type="secondary" className="text-xs">{r.officerEmail}</Text>
        </div>
      )
    },
    { 
      title: 'Score', 
      dataIndex: 'score', 
      key: 'score',
      render: (score, record) => (
        <Space>
          <Text strong className="text-indigo-600 text-lg">{score}</Text>
          <Popover content={<ScoreBreakdown breakdown={record.scoreBreakdown} />} title="How is this calculated?" trigger="hover">
            <InfoCircleOutlined className="text-gray-400 cursor-help" />
          </Popover>
        </Space>
      )
    },
    { 
      title: 'Completed', 
      dataIndex: 'applicationsCompleted', 
      key: 'completed',
      render: (val) => (
        <Space>
          <CheckCircleOutlined className="text-green-500" />
          <Text>{val}</Text>
        </Space>
      )
    },
    { 
      title: 'Avg Time (Hrs)', 
      dataIndex: 'avgProcessingHours', 
      key: 'time',
      render: (val) => (
        <Space>
          <ThunderboltOutlined className={val < 5 ? "text-green-500" : val > 10 ? "text-red-500" : "text-amber-500"} />
          <Text>{val}</Text>
        </Space>
      )
    },
    { 
      title: 'Accuracy', 
      dataIndex: 'accuracyRate', 
      key: 'accuracy',
      render: (val) => (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div className={`h-2.5 rounded-full ${val >= 90 ? 'bg-green-500' : val >= 75 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${val}%` }}></div>
          <Text className="text-xs mt-1 block">{val}%</Text>
        </div>
      )
    },
    { 
      title: 'Data Source', 
      dataIndex: 'dataSource', 
      key: 'dataSource',
      render: (val) => (
        <Tag color={val === 'real' ? 'green' : 'default'}>
          {val === 'real' ? 'Live Data' : 'Demo Data'}
        </Tag>
      )
    },
  ];

  const tabItems = [
    { key: 'WEEKLY', label: 'This Week' },
    { key: 'MONTHLY', label: 'This Month' },
    { key: 'ALL_TIME', label: 'All Time' }
  ];

  // Colors for the top 5 bar chart
  const COLORS = ['#F59E0B', '#9CA3AF', '#D97706', '#3B82F6', '#8B5CF6'];

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <Title level={2} className="!mb-1">
            <TrophyOutlined className="text-yellow-500 mr-2" />
            Officer Leaderboard
          </Title>
          <Text type="secondary" className="text-base">
            Recognizing top performers in application scrutiny and verification.
          </Text>
        </div>
        <div className="mt-4 sm:mt-0">
          <Tabs 
            activeKey={period} 
            onChange={setPeriod} 
            items={tabItems}
            type="card"
          />
        </div>
      </div>

      <Row gutter={[24, 24]} className="mb-6">
        <Col xs={24} lg={8}>
          <Card className="h-full shadow-sm rounded-xl border-t-4 border-t-indigo-500">
            <Title level={4} className="!mb-6">Top 5 Performers</Title>
            {loading ? (
              <div className="flex justify-center items-center h-48"><Spin /></div>
            ) : leaderboard.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaderboard.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="officerName" type="category" width={100} tick={{ fontSize: 12 }} />
                    <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {leaderboard.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex justify-center items-center h-48 text-gray-400">No data available</div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card className="h-full shadow-sm rounded-xl">
            <Table 
              columns={columns} 
              dataSource={leaderboard} 
              rowKey="officerId" 
              loading={loading} 
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              scroll={{ x: 'max-content' }}
              className="leaderboard-table"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OfficerLeaderboard;
