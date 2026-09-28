import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Typography, Card, Table, Tag, Button, Space, message, Modal, Input,
  Popconfirm, Spin, Alert, Descriptions, Divider, Collapse,
} from 'antd';
import {
  ArrowLeftOutlined, TrophyOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ClockCircleOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { schemeService } from '../../api/schemeService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const decisionColors = {
  SELECTED: 'success',
  REJECTED: 'error',
  WAITLISTED: 'warning',
  READY_FOR_SELECTION: 'processing',
};

const SelectionManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scheme, setScheme] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [decidingId, setDecidingId] = useState(null);
  const [decisionModal, setDecisionModal] = useState({ open: false, appId: null, decision: null });
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [bulkDeciding, setBulkDeciding] = useState(false);

  const fetchSelectionList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await schemeService.getSelectionList(id);
      setScheme(res.data.scheme);
      setApplications(res.data.applications || []);
    } catch (error) {
      message.error('Failed to load selection list.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchSelectionList(); }, [fetchSelectionList]);

  const handleCalculateRankings = async () => {
    setCalculating(true);
    try {
      const res = await schemeService.calculateRankings(id);
      message.success(`Rankings calculated for ${res.data.count} applications.`);
      fetchSelectionList();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to calculate rankings.');
    } finally {
      setCalculating(false);
    }
  };

  const handleDecide = async () => {
    if (!decisionRemarks.trim()) {
      message.error('Remarks are required for audit purposes.');
      return;
    }
    setDecidingId(decisionModal.appId);
    try {
      await schemeService.decideApplication(decisionModal.appId, {
        decision: decisionModal.decision,
        remarks: decisionRemarks,
      });
      message.success(`Application ${decisionModal.decision}.`);
      setDecisionModal({ open: false, appId: null, decision: null });
      setDecisionRemarks('');
      fetchSelectionList();
    } catch (error) {
      message.error(error.response?.data?.message || 'Decision failed.');
    } finally {
      setDecidingId(null);
    }
  };

  const handleBulkSelect = async () => {
    setBulkDeciding(true);
    try {
      const res = await schemeService.bulkDecide(id, {
        decision: 'SELECTED',
        remarks: 'Bulk selection within seat limit',
      });
      message.success(res.data.message);
      fetchSelectionList();
    } catch (error) {
      message.error(error.response?.data?.message || 'Bulk decision failed.');
    } finally {
      setBulkDeciding(false);
    }
  };

  const openDecisionModal = (appId, decision) => {
    setDecisionModal({ open: true, appId, decision });
    setDecisionRemarks('');
  };

  const columns = [
    {
      title: 'Rank', key: 'rank', width: 70,
      render: (_, record) => {
        const rank = record.selectionScore?.rank;
        return rank ? <Tag color={record.withinSeatLimit ? 'green' : 'default'}>#{rank}</Tag> : '—';
      },
    },
    {
      title: 'Applicant', key: 'applicant',
      render: (_, record) => (
        <div>
          <Text strong>{record.applicant?.name}</Text>
          <br />
          <Text type="secondary" className="text-xs">{record.applicant?.email}</Text>
        </div>
      ),
    },
    {
      title: 'Score', key: 'score', width: 100,
      render: (_, record) => {
        const score = record.selectionScore?.calculatedScore;
        return score !== undefined && score !== null ? <Text strong>{score.toFixed(2)}</Text> : '—';
      },
      sorter: (a, b) => (a.selectionScore?.calculatedScore || 0) - (b.selectionScore?.calculatedScore || 0),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 140,
      render: (s) => <Tag color={decisionColors[s] || 'default'}>{s.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Decision', key: 'decision', width: 160,
      render: (_, record) => {
        const lastDecision = record.selectionDecisions?.[0];
        if (lastDecision) {
          return (
            <div>
              <Tag color={decisionColors[lastDecision.decision] || 'default'}>{lastDecision.decision}</Tag>
              <br />
              <Text type="secondary" className="text-xs">by {lastDecision.decidedBy?.name}</Text>
            </div>
          );
        }
        return '—';
      },
    },
    {
      title: 'Actions', key: 'actions', width: 220,
      render: (_, record) => {
        if (record.status !== 'READY_FOR_SELECTION') return <Text type="secondary">Decided</Text>;
        return (
          <Space size="small">
            <Button size="small" type="primary" icon={<CheckCircleOutlined />}
              onClick={() => openDecisionModal(record.id, 'SELECTED')}>Select</Button>
            <Button size="small" icon={<ClockCircleOutlined />}
              onClick={() => openDecisionModal(record.id, 'WAITLISTED')}>Waitlist</Button>
            <Button size="small" danger icon={<CloseCircleOutlined />}
              onClick={() => openDecisionModal(record.id, 'REJECTED')}>Reject</Button>
          </Space>
        );
      },
    },
  ];

  const expandedRowRender = (record) => {
    const breakdown = record.selectionScore?.scoreBreakdown;
    if (!breakdown) return <Text type="secondary">No score breakdown available.</Text>;

    return (
      <Card size="small" title="Score Breakdown">
        <Table
          size="small"
          pagination={false}
          dataSource={Object.entries(breakdown).map(([key, val]) => ({ key, ...val, criteriaName: key }))}
          columns={[
            { title: 'Criteria', dataIndex: 'criteriaName', key: 'criteriaName' },
            { title: 'Raw Value', dataIndex: 'rawValue', key: 'rawValue', render: (v) => v !== null ? v : <Tag color="red">Missing</Tag> },
            { title: 'Normalized (0-100)', dataIndex: 'normalizedValue', key: 'normalizedValue' },
            { title: 'Weightage', dataIndex: 'weightage', key: 'weightage', render: (v) => v ? `${(v * 100).toFixed(0)}%` : '—' },
            { title: 'Weighted Score', dataIndex: 'weightedScore', key: 'weightedScore', render: (v) => <Text strong>{v}</Text> },
            { title: 'Direction', dataIndex: 'direction', key: 'direction', render: (d) => d === 'HIGHER_IS_BETTER' ? '↑' : '↓' },
          ]}
        />
      </Card>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[40vh]"><Spin size="large" /></div>;
  }

  const readyCount = applications.filter(a => a.status === 'READY_FOR_SELECTION').length;
  const scoredCount = applications.filter(a => a.selectionScore).length;

  // Find seat cutoff index
  const seatCutoffIndex = scheme?.totalSeats || 0;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(user?.role === 'ADMIN' ? '/admin/schemes' : '/officer/schemes')} className="mb-4">
        Back to Schemes
      </Button>

      <Card className="mb-4">
        <div className="flex justify-between items-center">
          <div>
            <Title level={3}><TrophyOutlined /> Selection Management — {scheme?.name}</Title>
            <Space size="large">
              <Text>Total Seats: <Tag color="blue">{scheme?.totalSeats || 'Not set'}</Tag></Text>
              <Text>Ready for Selection: <Tag color="processing">{readyCount}</Tag></Text>
              <Text>Scored: <Tag color="green">{scoredCount}</Tag></Text>
            </Space>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleCalculateRankings}
              loading={calculating}
              size="large"
            >
              Calculate Rankings
            </Button>
            {readyCount > 0 && scheme?.totalSeats && (
              <Popconfirm
                title={`Bulk select top ${scheme.totalSeats} applicants?`}
                description={`This will select all applicants ranked within the ${scheme.totalSeats} seat limit and waitlist the rest. Each decision will be individually logged.`}
                onConfirm={handleBulkSelect}
                okText="Yes, Proceed"
              >
                <Button type="primary" ghost loading={bulkDeciding} size="large">
                  Bulk Select Within Seat Limit
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>
      </Card>

      {scheme?.totalSeats && seatCutoffIndex > 0 && (
        <Alert
          message={`Seat Cutoff: Top ${scheme.totalSeats} ranked applicants are within the seat limit.`}
          description="Applications ranked at or above this cutoff are recommended for selection. Those below may be waitlisted."
          type="info"
          showIcon
          className="mb-4"
        />
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={applications}
          rowKey="id"
          expandable={{ expandedRowRender }}
          pagination={{ pageSize: 20 }}
          rowClassName={(record) => {
            if (record.status === 'SELECTED') return 'bg-green-50';
            if (record.status === 'REJECTED') return 'bg-red-50';
            if (record.status === 'WAITLISTED') return 'bg-yellow-50';
            if (record.withinSeatLimit === false) return 'bg-gray-50';
            return '';
          }}
        />
      </Card>

      {/* Decision Modal */}
      <Modal
        title={`Confirm: ${decisionModal.decision}`}
        open={decisionModal.open}
        onCancel={() => { setDecisionModal({ open: false, appId: null, decision: null }); setDecisionRemarks(''); }}
        onOk={handleDecide}
        confirmLoading={!!decidingId}
        okText={`Confirm ${decisionModal.decision}`}
        okButtonProps={{
          danger: decisionModal.decision === 'REJECTED',
        }}
      >
        <Paragraph>Please provide remarks for this decision (required for audit trail):</Paragraph>
        <TextArea
          rows={3}
          value={decisionRemarks}
          onChange={(e) => setDecisionRemarks(e.target.value)}
          placeholder="Enter your remarks..."
        />
      </Modal>
    </div>
  );
};

export default SelectionManagement;
