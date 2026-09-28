import { useState, useEffect } from 'react';
import { Typography, Card, Tag, Table, List, Avatar, Upload, Button, message, Spin, Alert, Empty } from 'antd';
import {
  TrophyOutlined, DollarOutlined, FileTextOutlined, MessageOutlined,
  UploadOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { fellowshipApplicantService } from '../../api/fellowshipService';

const { Title, Text, Paragraph } = Typography;

const statusColors = {
  ACTIVE: 'success', SUSPENDED: 'warning', COMPLETED: 'blue', TERMINATED: 'error',
};
const disbColors = {
  PENDING: 'default', PROCESSED: 'success', DELAYED: 'error', ON_HOLD: 'warning',
};
const docStatusColors = {
  PENDING: 'default', SUBMITTED: 'processing', APPROVED: 'success', OVERDUE: 'error',
};

const MyFellowship = () => {
  const [fellowship, setFellowship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);

  const fetchFellowship = async () => {
    setLoading(true);
    try {
      const res = await fellowshipApplicantService.getMyFellowship();
      setFellowship(res.data.fellowship);
    } catch (error) {
      message.error('Failed to load fellowship.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFellowship(); }, []);

  const handleUpload = async (fellowshipId, reqId, file) => {
    setUploading(reqId);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await fellowshipApplicantService.submitDocument(fellowshipId, reqId, formData);
      message.success('Document submitted!');
      fetchFellowship();
    } catch (error) {
      message.error('Upload failed.');
    } finally {
      setUploading(null);
    }
    return false; // prevent antd auto upload
  };

  if (loading) return <div className="flex justify-center items-center min-h-[40vh]"><Spin size="large" /></div>;
  if (!fellowship) return <Empty description="No active fellowship found. You will see your fellowship details here once you are selected for a scheme." />;

  const pendingDocs = fellowship.documentRequirements?.filter(d => d.status === 'PENDING' || d.status === 'OVERDUE') || [];

  return (
    <div>
      <Title level={3}><TrophyOutlined /> My Fellowship</Title>

      {/* Status Summary */}
      <Card className="mb-4">
        <div className="flex justify-between items-center">
          <div>
            <Text strong className="text-lg">{fellowship.scheme?.name}</Text><br />
            <Text type="secondary">Started: {new Date(fellowship.startDate).toLocaleDateString()}</Text>
            {fellowship.expectedEndDate && (
              <><br /><Text type="secondary">Expected End: {new Date(fellowship.expectedEndDate).toLocaleDateString()}</Text></>
            )}
          </div>
          <Tag color={statusColors[fellowship.fellowshipStatus]} className="text-lg px-4 py-1">
            {fellowship.fellowshipStatus}
          </Tag>
        </div>
      </Card>

      {fellowship.fellowshipStatus === 'SUSPENDED' && (
        <Alert message="Your fellowship has been suspended. Please contact the Ministry for details." type="warning" showIcon className="mb-4" />
      )}

      {/* Pending Document Requirements */}
      {pendingDocs.length > 0 && (
        <Card title={<><FileTextOutlined /> Pending Document Requirements ({pendingDocs.length})</>} className="mb-4">
          <Table
            dataSource={pendingDocs}
            rowKey="id"
            pagination={false}
            columns={[
              { title: 'Document', dataIndex: 'documentType', key: 'type' },
              { title: 'Due Date', dataIndex: 'dueDate', key: 'due', render: (d) => new Date(d).toLocaleDateString() },
              { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={docStatusColors[s]}>{s}</Tag> },
              {
                title: 'Action', key: 'action',
                render: (_, r) => r.status !== 'APPROVED' && r.status !== 'SUBMITTED' ? (
                  <Upload
                    beforeUpload={(file) => handleUpload(fellowship.id, r.id, file)}
                    showUploadList={false}
                    accept=".pdf,.jpg,.png"
                  >
                    <Button icon={<UploadOutlined />} loading={uploading === r.id} size="small" type="primary">
                      Upload
                    </Button>
                  </Upload>
                ) : <Tag icon={<CheckCircleOutlined />} color="processing">Submitted</Tag>,
              },
            ]}
          />
        </Card>
      )}

      {/* Disbursement Tracker */}
      <Card title={<><DollarOutlined /> Disbursement Schedule</>} className="mb-4">
        <Table
          dataSource={fellowship.disbursements}
          rowKey="id"
          pagination={false}
          columns={[
            { title: '#', dataIndex: 'installmentNumber', key: 'num', width: 50 },
            { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v) => `\u20B9${v.toLocaleString()}` },
            { title: 'Due Date', dataIndex: 'dueDate', key: 'due', render: (d) => new Date(d).toLocaleDateString() },
            { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={disbColors[s]}>{s}</Tag> },
            { title: 'Processed On', dataIndex: 'processedDate', key: 'proc', render: (d) => d ? new Date(d).toLocaleDateString() : '-' },
          ]}
        />
      </Card>

      {/* Communications */}
      <Card title={<><MessageOutlined /> Messages from Ministry</>}>
        {fellowship.communications?.length > 0 ? (
          <List
            dataSource={fellowship.communications}
            rowKey="id"
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar>{item.sentBy?.name?.[0] || '?'}</Avatar>}
                  title={<><Text strong>{item.sentBy?.name}</Text> <Text type="secondary" className="text-xs">{new Date(item.sentAt).toLocaleString()}</Text></>}
                  description={item.message}
                />
              </List.Item>
            )}
          />
        ) : (
          <Paragraph type="secondary">No messages yet.</Paragraph>
        )}
      </Card>
    </div>
  );
};

export default MyFellowship;
