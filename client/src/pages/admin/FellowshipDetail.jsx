import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Card, Tabs, Table, Tag, Button, Space, message, Modal, Input,
  Select, Descriptions, Spin, Popconfirm, Form, DatePicker, List, Avatar,
} from 'antd';
import {
  ArrowLeftOutlined, DollarOutlined, FileTextOutlined, MessageOutlined,
  CheckCircleOutlined, PauseCircleOutlined, SendOutlined,
} from '@ant-design/icons';
import { fellowshipAdminService } from '../../api/fellowshipService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const statusColors = {
  ACTIVE: 'success', SUSPENDED: 'warning', COMPLETED: 'blue', TERMINATED: 'error',
};
const disbColors = {
  PENDING: 'default', PROCESSED: 'success', DELAYED: 'error', ON_HOLD: 'warning',
};
const docStatusColors = {
  PENDING: 'default', SUBMITTED: 'processing', APPROVED: 'success', OVERDUE: 'error',
};

const FellowshipDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fellowship, setFellowship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [docModal, setDocModal] = useState(false);
  const [docForm] = Form.useForm();
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchFellowship = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fellowshipAdminService.getById(id);
      setFellowship(res.data.fellowship);
    } catch (error) {
      message.error('Failed to load fellowship.');
      navigate('/admin/fellowships');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchFellowship(); }, [fetchFellowship]);

  const handleStatusChange = async () => {
    if (!statusRemarks.trim()) { message.error('Remarks required.'); return; }
    try {
      await fellowshipAdminService.updateStatus(id, { status: newStatus, remarks: statusRemarks });
      message.success(`Status updated to ${newStatus}.`);
      setStatusModal(false); setNewStatus(''); setStatusRemarks('');
      fetchFellowship();
    } catch (error) { message.error('Failed to update status.'); }
  };

  const handleProcessDisb = async (disbId) => {
    try {
      await fellowshipAdminService.processDisbursement(disbId, { remarks: 'Processed by admin' });
      message.success('Disbursement processed.'); fetchFellowship();
    } catch (error) { message.error('Failed to process.'); }
  };

  const handleHoldDisb = async (disbId) => {
    try {
      await fellowshipAdminService.holdDisbursement(disbId, { remarks: 'Placed on hold by admin' });
      message.success('Disbursement placed on hold.'); fetchFellowship();
    } catch (error) { message.error('Failed.'); }
  };

  const handleAddDocReq = async (values) => {
    try {
      await fellowshipAdminService.addDocRequirement(id, {
        documentType: values.documentType,
        dueDate: values.dueDate.toISOString(),
      });
      message.success('Document requirement added.'); setDocModal(false); docForm.resetFields();
      fetchFellowship();
    } catch (error) { message.error('Failed.'); }
  };

  const handleReviewDoc = async (docId, status) => {
    try {
      await fellowshipAdminService.reviewDocument(docId, { status });
      message.success(`Document ${status === 'APPROVED' ? 'approved' : 'sent back'}.`); fetchFellowship();
    } catch (error) { message.error('Failed.'); }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setSendingMessage(true);
    try {
      await fellowshipAdminService.sendMessage(id, { message: newMessage });
      message.success('Message sent.'); setNewMessage(''); fetchFellowship();
    } catch (error) { message.error('Failed to send.'); }
    finally { setSendingMessage(false); }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[40vh]"><Spin size="large" /></div>;
  if (!fellowship) return null;

  const disbColumns = [
    { title: '#', dataIndex: 'installmentNumber', key: 'num', width: 50 },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v) => `\u20B9${v.toLocaleString()}` },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'due', render: (d) => new Date(d).toLocaleDateString() },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={disbColors[s]}>{s}</Tag> },
    { title: 'Processed', dataIndex: 'processedDate', key: 'proc', render: (d) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', render: (r) => r || '-' },
    {
      title: 'Actions', key: 'actions', width: 200,
      render: (_, r) => r.status === 'PENDING' || r.status === 'DELAYED' ? (
        <Space>
          <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleProcessDisb(r.id)}>Process</Button>
          <Button size="small" icon={<PauseCircleOutlined />} onClick={() => handleHoldDisb(r.id)}>Hold</Button>
        </Space>
      ) : null,
    },
  ];

  const docColumns = [
    { title: 'Document', dataIndex: 'documentType', key: 'type' },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'due', render: (d) => new Date(d).toLocaleDateString() },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={docStatusColors[s]}>{s}</Tag> },
    { title: 'Submitted', dataIndex: 'submittedAt', key: 'sub', render: (d) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'Reviewed By', key: 'rev', render: (_, r) => r.reviewedBy?.name || '-' },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => r.status === 'SUBMITTED' ? (
        <Space>
          <Button size="small" type="primary" onClick={() => handleReviewDoc(r.id, 'APPROVED')}>Approve</Button>
          <Button size="small" danger onClick={() => handleReviewDoc(r.id, 'PENDING')}>Resubmit</Button>
        </Space>
      ) : r.fileUrl ? <a href={r.fileUrl} target="_blank" rel="noreferrer">View File</a> : null,
    },
  ];

  const tabItems = [
    {
      key: 'disbursements', label: <><DollarOutlined /> Disbursements ({fellowship.disbursements?.length || 0})</>,
      children: <Table columns={disbColumns} dataSource={fellowship.disbursements} rowKey="id" pagination={false} />,
    },
    {
      key: 'documents', label: <><FileTextOutlined /> Documents ({fellowship.documentRequirements?.length || 0})</>,
      children: (
        <div>
          <div className="flex justify-end mb-4">
            <Button type="primary" onClick={() => setDocModal(true)}>Add Requirement</Button>
          </div>
          <Table columns={docColumns} dataSource={fellowship.documentRequirements} rowKey="id" pagination={false} />
        </div>
      ),
    },
    {
      key: 'communications', label: <><MessageOutlined /> Communications ({fellowship.communications?.length || 0})</>,
      children: (
        <div>
          <Card className="mb-4">
            <Space.Compact style={{ width: '100%' }}>
              <TextArea rows={2} value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message to the applicant..." />
              <Button type="primary" icon={<SendOutlined />} loading={sendingMessage}
                onClick={handleSendMessage} style={{ height: 'auto' }}>Send</Button>
            </Space.Compact>
          </Card>
          <List dataSource={fellowship.communications} rowKey="id"
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
        </div>
      ),
    },
  ];

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/fellowships')} className="mb-4">Back</Button>
      <Card className="mb-4">
        <div className="flex justify-between items-center">
          <Descriptions title={`Fellowship — ${fellowship.applicant?.name}`} column={3}>
            <Descriptions.Item label="Scheme">{fellowship.scheme?.name}</Descriptions.Item>
            <Descriptions.Item label="Start Date">{new Date(fellowship.startDate).toLocaleDateString()}</Descriptions.Item>
            <Descriptions.Item label="Expected End">{fellowship.expectedEndDate ? new Date(fellowship.expectedEndDate).toLocaleDateString() : 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Frequency">{fellowship.disbursementFrequency || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={statusColors[fellowship.fellowshipStatus]}>{fellowship.fellowshipStatus}</Tag></Descriptions.Item>
          </Descriptions>
          <Button onClick={() => { setNewStatus(fellowship.fellowshipStatus); setStatusModal(true); }}>Change Status</Button>
        </div>
      </Card>
      <Tabs items={tabItems} />

      {/* Status Change Modal */}
      <Modal title="Change Fellowship Status" open={statusModal}
        onCancel={() => setStatusModal(false)} onOk={handleStatusChange}>
        <Select value={newStatus} onChange={setNewStatus} className="w-full mb-3">
          <Option value="ACTIVE">Active</Option>
          <Option value="SUSPENDED">Suspended</Option>
          <Option value="COMPLETED">Completed</Option>
          <Option value="TERMINATED">Terminated</Option>
        </Select>
        <TextArea rows={3} value={statusRemarks} onChange={(e) => setStatusRemarks(e.target.value)}
          placeholder="Remarks (required for audit)" />
      </Modal>

      {/* Add Document Requirement Modal */}
      <Modal title="Add Document Requirement" open={docModal}
        onCancel={() => { setDocModal(false); docForm.resetFields(); }}
        onOk={() => docForm.submit()}>
        <Form form={docForm} layout="vertical" onFinish={handleAddDocReq}>
          <Form.Item name="documentType" label="Document Type" rules={[{ required: true }]}>
            <Input placeholder="e.g., Annual Progress Report" />
          </Form.Item>
          <Form.Item name="dueDate" label="Due Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FellowshipDetail;
