import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Card, Tag, Space, Button, Spin, Descriptions, Divider, List, Alert,
  Modal, Form, Input, Select, message, Timeline, Collapse, Tooltip, Badge, Progress, Tabs
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleFilled, CloseCircleFilled, ExclamationCircleFilled,
  SafetyCertificateOutlined, FileOutlined, WarningOutlined, LoadingOutlined,
  SwapOutlined, FlagOutlined, CheckOutlined, EditOutlined,
} from '@ant-design/icons';
import { officerService } from '../../api/officerService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;
const { Option } = Select;

const statusColors = {
  DRAFT: 'default', SUBMITTED: 'blue', UNDER_VERIFICATION: 'processing',
  DEFICIENT: 'warning', UNDER_SCRUTINY: 'purple', SELECTED: 'success', REJECTED: 'error',
};

const aiStatusConfig = {
  VERIFIED: { color: 'success', icon: <SafetyCertificateOutlined />, text: 'AI Verified' },
  FLAGGED: { color: 'error', icon: <ExclamationCircleFilled />, text: 'AI Flagged' },
  PENDING: { color: 'processing', icon: <LoadingOutlined />, text: 'Processing' },
  FAILED: { color: 'default', icon: <CloseCircleFilled />, text: 'OCR Failed' },
};

const ApplicationReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState('');

  const [overrideModal, setOverrideModal] = useState({ open: false, doc: null });
  const [deficiencyModal, setDeficiencyModal] = useState(false);
  const [scrutinyModal, setScrutinyModal] = useState(false);
  const [previewModal, setPreviewModal] = useState({ open: false, url: '', name: '' });

  const [overrideForm] = Form.useForm();
  const [deficiencyForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, eligRes] = await Promise.all([
        officerService.getApplicationById(id),
        officerService.checkEligibility(id).catch(() => ({ data: { eligible: null } })),
      ]);
      setApplication(appRes.data.application);
      setEligibility(eligRes.data);
      setRemarks(appRes.data.application.officerRemarks || '');
    } catch (error) {
      message.error('Failed to load application.');
      navigate('/officer/applications');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOverride = async (values) => {
    try {
      await officerService.overrideDocument(overrideModal.doc.id, values);
      message.success('Document status overridden.');
      setOverrideModal({ open: false, doc: null });
      overrideForm.resetFields();
      fetchData();
    } catch (error) {
      message.error('Override failed.');
    }
  };

  const handleDeficiency = async (values) => {
    try {
      await officerService.raiseDeficiency(id, values);
      message.success('Deficiency raised.');
      setDeficiencyModal(false);
      deficiencyForm.resetFields();
      fetchData();
    } catch (error) {
      message.error('Failed to raise deficiency.');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await officerService.updateStatus(id, { status: newStatus, remarks });
      message.success(`Status updated to ${newStatus}.`);
      fetchData();
    } catch (error) {
      message.error('Status update failed.');
    }
  };

  const handleSaveRemarks = async () => {
    try {
      await officerService.saveRemarks(id, remarks);
      message.success('Remarks saved.');
    } catch (error) {
      message.error('Failed to save remarks.');
    }
  };

  const handleCompleteScrutiny = async (values) => {
    try {
      await officerService.completeScrutiny(id, values.remarks);
      message.success('Scrutiny completed!');
      setScrutinyModal(false);
      fetchData();
    } catch (error) {
      message.error('Failed to complete scrutiny.');
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[40vh]"><Spin size="large" /></div>;
  if (!application) return null;

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-4">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/officer/applications')}>
          Back to Queue
        </Button>
        <Space>
          {['SUBMITTED', 'UNDER_VERIFICATION'].includes(application.status) && (
            <Button type="primary" icon={<CheckOutlined />}
              onClick={() => handleStatusChange('UNDER_SCRUTINY')}>
              Move to Scrutiny
            </Button>
          )}
          {application.status === 'UNDER_SCRUTINY' && (
            <Button type="primary" style={{ backgroundColor: '#52c41a' }} icon={<CheckCircleFilled />}
              onClick={() => setScrutinyModal(true)}>
              Complete Scrutiny
            </Button>
          )}
          <Button danger icon={<FlagOutlined />} onClick={() => setDeficiencyModal(true)}>
            Request Correction
          </Button>
        </Space>
      </div>

      {/* Header Profile Card */}
      <Card className="mb-6 shadow-sm border-t-4 border-t-blue-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <Title level={3} className="!mb-1">{application.scheme.name}</Title>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
              <Text type="secondary">
                <strong className="text-gray-700">Applicant:</strong> {application.applicant.name}
              </Text>
              <Text type="secondary">
                <strong className="text-gray-700">Email:</strong> {application.applicant.email}
              </Text>
              <Text type="secondary">
                <strong className="text-gray-700">Application ID:</strong> <Text copyable>{application.id}</Text>
              </Text>
            </div>
          </div>
          <div className="mt-4 md:mt-0 text-right">
            <Text className="block mb-1 text-xs uppercase tracking-wider text-gray-500">Current Status</Text>
            <Tag color={statusColors[application.status]} className="text-sm px-4 py-1.5 m-0 font-medium rounded-md">
              {application.status.replace(/_/g, ' ')}
            </Tag>
          </div>
        </div>
      </Card>

      <Tabs
        defaultActiveKey="1"
        type="card"
        className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
        items={[
          {
            key: '1',
            label: 'Overview & Data',
            children: (
              <div className="flex flex-col gap-6 pt-4">
                <Card title="Eligibility AI Check" size="small" className="shadow-sm">
                  {eligibility?.eligible === true && (
                    <Alert message="All eligibility criteria satisfied" type="success" showIcon />
                  )}
                  {eligibility?.eligible === false && (
                    <div>
                      <Alert message="Eligibility criteria not fully met" type="warning" showIcon className="mb-4" />
                      <List
                        size="small"
                        bordered
                        dataSource={eligibility.failedRules}
                        renderItem={(r) => (
                          <List.Item>
                            <Text type="danger">
                              <WarningOutlined className="mr-2" />
                              <strong className="mr-1">{r.rule}:</strong> {r.reason}
                            </Text>
                          </List.Item>
                        )}
                      />
                    </div>
                  )}
                </Card>

                <Card title="Submitted Form Data" size="small" className="shadow-sm">
                  <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }} size="small">
                    {application.fieldValues?.map((fv) => (
                      <Descriptions.Item key={fv.id} label={fv.field.fieldLabel}>
                        <Text strong>{fv.value}</Text>
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                </Card>
              </div>
            )
          },
          {
            key: '2',
            label: 'Document AI Analysis',
            children: (
              <div className="pt-4">
                <Collapse className="shadow-sm bg-white">
                  {application.documents?.map((doc) => {
                    const cfg = aiStatusConfig[doc.aiStatus] || aiStatusConfig.PENDING;
                    return (
                      <Panel
                        key={doc.id}
                        header={
                          <div className="flex justify-between items-center w-full pr-4">
                            <Space size="middle">
                              <Text strong>{doc.documentRequirement.documentName}</Text>
                              <Button 
                                size="small" 
                                type="primary" 
                                ghost 
                                icon={<FileOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewModal({ open: true, url: doc.fileUrl, name: doc.documentRequirement.documentName });
                                }}
                              >
                                View Document
                              </Button>
                            </Space>
                            <Space>
                              <Tag icon={cfg.icon} color={cfg.color}>{cfg.text}</Tag>
                              {doc.confidenceScore != null && (
                                <Text type="secondary" className="text-xs">Conf: {doc.confidenceScore.toFixed(0)}%</Text>
                              )}
                            </Space>
                          </div>
                        }
                      >
                        <Space direction="vertical" className="w-full" size="middle">
                          <div className="flex gap-4">
                            <Button
                              icon={<SwapOutlined />}
                              onClick={() => {
                                setOverrideModal({ open: true, doc });
                                overrideForm.setFieldsValue({ newStatus: doc.aiStatus === 'FLAGGED' ? 'VERIFIED' : 'FLAGGED' });
                              }}
                            >
                              Override AI Status
                            </Button>
                          </div>

                          {doc.confidenceScore != null && (
                            <div>
                              <Text strong className="block mb-1">OCR Confidence Score</Text>
                              <Progress percent={doc.confidenceScore} size="small"
                                status={doc.confidenceScore >= 80 ? 'success' : doc.confidenceScore >= 50 ? 'normal' : 'exception'}
                              />
                            </div>
                          )}

                          {doc.aiFlagReason && (
                            <Alert message={doc.aiFlagReason} type="error" showIcon icon={<FlagOutlined />} className="py-1" />
                          )}

                          {doc.overrideReason && (
                            <Alert message={`Officer Override: ${doc.overrideReason}`} type="info" showIcon className="py-1" />
                          )}

                          {doc.matchResult && Object.keys(doc.matchResult).length > 0 && (
                            <div className="mt-2">
                              <Text strong className="block mb-2">Field Comparison (Document vs Application)</Text>
                              <List
                                size="small"
                                bordered
                                dataSource={Object.entries(doc.matchResult)}
                                renderItem={([field, result]) => (
                                  <List.Item className={result.match === false ? 'bg-red-50' : result.match === true ? 'bg-green-50' : 'bg-yellow-50'}>
                                    <div className="flex items-start w-full">
                                      <div className="mt-1 mr-3">
                                        {result.match === true ? (
                                          <CheckCircleFilled style={{ color: '#52c41a' }} />
                                        ) : result.match === false ? (
                                          <CloseCircleFilled style={{ color: '#ff4d4f' }} />
                                        ) : (
                                          <ExclamationCircleFilled style={{ color: '#faad14' }} />
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <Text strong className="block mb-1 capitalize">{field}</Text>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                          <div>
                                            <span className="text-gray-500 block text-xs uppercase tracking-wider">Found in Doc</span>
                                            <Text>{result.found || 'N/A'}</Text>
                                          </div>
                                          <div>
                                            <span className="text-gray-500 block text-xs uppercase tracking-wider">Expected (App)</span>
                                            <Text>{result.expected || 'N/A'}</Text>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </List.Item>
                                )}
                              />
                            </div>
                          )}
                        </Space>
                      </Panel>
                    );
                  })}
                </Collapse>
              </div>
            )
          },
          {
            key: '3',
            label: 'Deficiencies',
            children: (
              <div className="pt-4">
                <div className="flex justify-end mb-4">
                  <Button type="primary" danger icon={<FlagOutlined />} onClick={() => setDeficiencyModal(true)}>
                    Raise New Deficiency
                  </Button>
                </div>
                {application.deficiencies?.length > 0 ? (
                  <List
                    bordered
                    className="bg-white shadow-sm"
                    dataSource={application.deficiencies}
                    renderItem={(d) => (
                      <List.Item>
                        <List.Item.Meta
                          title={<Space><Text strong>{d.reason}</Text><Tag color={d.status === 'OPEN' ? 'error' : 'success'}>{d.status}</Tag></Space>}
                          description={`Raised: ${new Date(d.raisedAt).toLocaleDateString()}${d.resolvedAt ? ' | Resolved: ' + new Date(d.resolvedAt).toLocaleDateString() : ''}`}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
                    <CheckCircleFilled className="text-3xl text-green-500 mb-2" />
                    <Title level={5} className="!mt-0 !mb-1">No Deficiencies</Title>
                    <Text type="secondary">The applicant has not been asked for any corrections.</Text>
                  </div>
                )}
              </div>
            )
          },
          {
            key: '4',
            label: 'History & Remarks',
            children: (
              <div className="flex flex-col gap-6 pt-4">
                <Card title="Officer Remarks" size="small" className="shadow-sm">
                  <TextArea rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add your private notes or assessment reasoning about this application here..." />
                  <div className="flex justify-end mt-3">
                    <Button type="primary" icon={<EditOutlined />} onClick={handleSaveRemarks}>Save Remarks</Button>
                  </div>
                </Card>

                <Card title="Status History log" size="small" className="shadow-sm">
                  {application.statusHistory?.length > 0 ? (
                    <Timeline
                      className="mt-4 ml-2"
                      items={application.statusHistory.map((h) => ({
                        color: h.newStatus === 'SELECTED' ? 'green' : h.newStatus === 'REJECTED' ? 'red' : 'blue',
                        children: (
                          <div className="pb-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Tag color={statusColors[h.previousStatus]}>{h.previousStatus}</Tag>
                              <ArrowLeftOutlined className="rotate-180 text-gray-400 text-xs" />
                              <Tag color={statusColors[h.newStatus]}>{h.newStatus}</Tag>
                            </div>
                            <Text type="secondary" className="text-xs block mb-1">
                              {new Date(h.changedAt).toLocaleString()}
                            </Text>
                            {h.remarks && <Paragraph className="bg-gray-50 p-2 rounded text-sm italic !mb-0">{h.remarks}</Paragraph>}
                          </div>
                        ),
                      }))}
                    />
                  ) : <Text type="secondary">No status changes recorded yet.</Text>}
                </Card>
              </div>
            )
          }
        ]}
      />

      {/* Override Modal */}
      <Modal title="Override Document AI Status" open={overrideModal.open}
        onCancel={() => setOverrideModal({ open: false, doc: null })} footer={null}>
        <Form form={overrideForm} layout="vertical" onFinish={handleOverride}>
          <Form.Item name="newStatus" label="New Status" rules={[{ required: true }]}>
            <Select>
              <Option value="VERIFIED">VERIFIED</Option>
              <Option value="FLAGGED">FLAGGED</Option>
            </Select>
          </Form.Item>
          <Form.Item name="overrideReason" label="Reason for Override" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Apply Override</Button>
        </Form>
      </Modal>

      {/* Deficiency Modal */}
      <Modal title="Raise Deficiency" open={deficiencyModal}
        onCancel={() => setDeficiencyModal(false)} footer={null}>
        <Form form={deficiencyForm} layout="vertical" onFinish={handleDeficiency}>
          <Form.Item name="documentId" label="Related Document (Optional)">
            <Select allowClear placeholder="Select document">
              {application.documents?.map(d => (
                <Option key={d.id} value={d.id}>{d.documentRequirement.documentName}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block danger>Raise Deficiency</Button>
        </Form>
      </Modal>

      {/* Complete Scrutiny Modal */}
      <Modal title="Complete Scrutiny" open={scrutinyModal}
        onCancel={() => setScrutinyModal(false)} footer={null}>
        <Form layout="vertical" onFinish={handleCompleteScrutiny}>
          <Form.Item name="remarks" label="Final Remarks" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="Provide your assessment and recommendation..." />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Complete Scrutiny & Approve</Button>
        </Form>
      </Modal>

      {/* Document Preview Modal */}
      <Modal
        title={previewModal.name}
        open={previewModal.open}
        onCancel={() => setPreviewModal({ open: false, url: '', name: '' })}
        footer={null}
        width={800}
        centered
        destroyOnClose
      >
        {previewModal.url && (
          previewModal.url.toLowerCase().endsWith('.pdf') ? (
            <iframe
              src={previewModal.url}
              className="w-full h-[75vh] border-0 rounded-md bg-gray-50"
              title="Document Preview"
            />
          ) : (
            <div className="w-full h-[75vh] flex items-center justify-center bg-gray-50 rounded-md overflow-hidden p-4">
              <img
                src={previewModal.url}
                alt="Document Preview"
                className="max-w-full max-h-full object-contain shadow-sm"
              />
            </div>
          )
        )}
      </Modal>
    </div>
  );
};

export default ApplicationReview;
