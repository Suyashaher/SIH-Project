import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Form, Input, InputNumber, DatePicker, Select, Button, Card, Divider,
  Upload, Tag, Space, message, Spin, Alert, List, Result, Popconfirm, Tooltip, Steps,
} from 'antd';
import {
  SaveOutlined, SendOutlined, UploadOutlined, DeleteOutlined,
  CheckCircleFilled, CloseCircleFilled, ArrowLeftOutlined, FileOutlined,
  LoadingOutlined, ExclamationCircleFilled, SafetyCertificateOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { applicationService } from '../../api/applicantService';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const statusColors = {
  DRAFT: 'default', SUBMITTED: 'blue', UNDER_VERIFICATION: 'processing',
  DEFICIENT: 'warning', UNDER_SCRUTINY: 'purple', SELECTED: 'success', REJECTED: 'error',
};

const AiStatusIndicator = ({ doc }) => {
  if (!doc || !doc.aiStatus) return null;
  
  switch (doc.aiStatus) {
    case 'VERIFIED':
      return (
        <div className="mt-1">
          <Tag icon={<SafetyCertificateOutlined />} color="success">
            Verified
          </Tag>
        </div>
      );
    case 'FLAGGED':
      return (
        <div className="mt-1">
          <Tooltip title="This document is under additional review by our verification team.">
            <Tag icon={<ExclamationCircleFilled />} color="warning">
              Under Review
            </Tag>
          </Tooltip>
        </div>
      );
    case 'PENDING':
      return (
        <div className="mt-1">
          <Tag icon={<LoadingOutlined />} color="processing">
            Processing
          </Tag>
        </div>
      );
    case 'FAILED':
      return (
        <div className="mt-1">
          <Tooltip title="The system could not process this document. Please re-upload a clearer copy.">
            <Tag icon={<CloseCircleFilled />} color="error">
              Could not process — please re-upload a clearer copy
            </Tag>
          </Tooltip>
        </div>
      );
    default:
      return null;
  }
};

const ApplicationForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [etaPrediction, setEtaPrediction] = useState(null);

  const isReadOnly = application && !['DRAFT', 'DEFICIENT'].includes(application.status);

  const fetchApplication = useCallback(async () => {
    setLoading(true);
    try {
      const res = await applicationService.getById(id);
      const app = res.data.application;
      setApplication(app);

      const formValues = {};
      app.fieldValues?.forEach((fv) => {
        const field = app.scheme.applicationFields.find(f => f.id === fv.fieldId);
        if (field) {
          if (field.fieldType === 'DATE' && fv.value) {
            formValues[fv.fieldId] = dayjs(fv.value);
          } else if (field.fieldType === 'NUMBER' && fv.value) {
            formValues[fv.fieldId] = parseFloat(fv.value);
          } else {
            formValues[fv.fieldId] = fv.value;
          }
        }
      });
      form.setFieldsValue(formValues);
    } catch (error) {
      message.error('Failed to load application.');
      navigate('/applicant/applications');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, form]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  useEffect(() => {
    if (application && !['DRAFT', 'SELECTED', 'REJECTED', 'WAITLISTED'].includes(application.status)) {
      applicationService.predictEta(application.id)
        .then(res => setEtaPrediction(res.data))
        .catch(() => {});
    }
  }, [application?.id, application?.status]);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const values = form.getFieldsValue();
      const fieldValues = Object.entries(values)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([fieldId, value]) => ({
          fieldId,
          value: value instanceof dayjs ? value.format('YYYY-MM-DD') : String(value),
        }));
      await applicationService.saveFields(id, fieldValues);
      message.success('Draft saved successfully!');
    } catch (error) {
      message.error('Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const values = form.getFieldsValue();
      const fieldValues = Object.entries(values)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([fieldId, value]) => ({
          fieldId,
          value: value instanceof dayjs ? value.format('YYYY-MM-DD') : String(value),
        }));
      await applicationService.saveFields(id, fieldValues);
      await applicationService.submit(id);
      message.success('Application submitted successfully!');
      fetchApplication();
    } catch (error) {
      const data = error.response?.data;
      if (data?.missingFields || data?.missingDocuments) {
        const parts = [];
        if (data.missingFields?.length) {
          parts.push('Missing fields: ' + data.missingFields.map(f => f.label).join(', '));
        }
        if (data.missingDocuments?.length) {
          parts.push('Missing documents: ' + data.missingDocuments.map(d => d.name).join(', '));
        }
        message.error(parts.join('. '));
      } else {
        message.error(data?.message || 'Submission failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (file, docReqId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentRequirementId', docReqId);
    try {
      await applicationService.uploadDocument(id, formData);
      message.success('Document uploaded!');
      fetchApplication();
    } catch (error) {
      message.error(error.response?.data?.message || 'Upload failed.');
    }
    return false;
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await applicationService.deleteDocument(id, docId);
      message.success('Document removed.');
      fetchApplication();
    } catch (error) {
      message.error('Failed to remove document.');
    }
  };

  const renderField = (field) => {
    const commonProps = { disabled: isReadOnly };
    switch (field.fieldType) {
      case 'TEXT':
        return <Input {...commonProps} placeholder={`Enter ${field.fieldLabel}`} />;
      case 'NUMBER':
        return <InputNumber {...commonProps} className="w-full" placeholder={`Enter ${field.fieldLabel}`} />;
      case 'DATE':
        return <DatePicker {...commonProps} className="w-full" format="YYYY-MM-DD" />;
      case 'DROPDOWN': {
        const options = field.options ? field.options.split(',').map(o => o.trim()) : [];
        return (
          <Select {...commonProps} placeholder={`Select ${field.fieldLabel}`}>
            {options.map((opt) => <Option key={opt} value={opt}>{opt}</Option>)}
          </Select>
        );
      }
      default:
        return <Input {...commonProps} placeholder={`Enter ${field.fieldLabel}`} />;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[40vh]"><Spin size="large" /></div>;
  }

  if (!application) return null;

  const uploadedDocMap = {};
  application.documents?.forEach((doc) => {
    uploadedDocMap[doc.documentRequirementId] = doc;
  });

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/applicant/applications')} className="mb-4">
        Back to Applications
      </Button>

      {isReadOnly && application.status === 'SUBMITTED' && (
        <Result
          status="success"
          title="Application Submitted Successfully"
          subTitle={`Submitted on ${new Date(application.submittedAt).toLocaleDateString()}`}
          className="mb-4 py-4"
        />
      )}

      {isReadOnly && application.status === 'UNDER_VERIFICATION' && (
        <Alert
          message="Document Verification In Progress"
          description="Your documents are being reviewed by our AI-assisted verification system. Check back shortly for status updates."
          type="info"
          showIcon
          className="mb-4"
        />
      )}

      <Card className="mb-4">
        <div className="flex justify-between items-center">
          <div>
            <Title level={4}>{application.scheme.name}</Title>
            <Text type="secondary">Application ID: {application.id.slice(0, 8)}...</Text>
          </div>
          <Tag color={statusColors[application.status] || 'default'} className="text-sm px-3 py-1">
            {application.status.replace(/_/g, ' ')}
          </Tag>
        </div>
      </Card>

      {/* Estimated Timeline Panel */}
      {etaPrediction && !['DRAFT', 'SELECTED', 'REJECTED', 'WAITLISTED'].includes(application.status) && (
        <Card title={<><ClockCircleOutlined /> Estimated Processing Timeline</>} className="mb-4">
          <Steps
            current={['SUBMITTED', 'UNDER_VERIFICATION', 'UNDER_SCRUTINY', 'READY_FOR_SELECTION'].indexOf(application.status)}
            size="small"
            className="mb-4"
            items={[
              { title: 'Submitted' },
              { title: 'Verification' },
              { title: 'Scrutiny' },
              { title: 'Selection' },
              { title: 'Decision' },
            ]}
          />
          <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg">
            <div>
              <Text strong className="text-lg">
                Expected decision by: {new Date(etaPrediction.predictedCompletionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <br />
              <Text type="secondary">
                Estimated {Math.ceil(etaPrediction.predictedDaysRemaining)} days remaining
              </Text>
              <br />
              <Tag color={etaPrediction.predictionMethod === 'ML_MODEL' ? 'purple' : 'blue'} className="mt-1">
                {etaPrediction.predictionMethod === 'ML_MODEL' ? 'AI Prediction' : 'Rule-based Estimate'}
              </Tag>
            </div>
          </div>
          <Text type="secondary" className="text-xs mt-2 block">
            Disclaimer: This is an estimate based on typical processing times and may vary depending on verification requirements and application volume.
          </Text>
        </Card>
      )}

      {/* Application Fields */}
      <Card title="Application Form" className="mb-4">
        <Form form={form} layout="vertical">
          {application.scheme.applicationFields.map((field) => (
            <Form.Item
              key={field.id}
              name={field.id}
              label={field.fieldLabel}
              rules={field.isRequired && !isReadOnly ? [{ required: true, message: `${field.fieldLabel} is required` }] : []}
            >
              {renderField(field)}
            </Form.Item>
          ))}
        </Form>

        {!isReadOnly && (
          <Space className="mt-4">
            <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={saving}>
              Save Draft
            </Button>
          </Space>
        )}
      </Card>

      {/* Documents Section */}
      <Card title="Required Documents" className="mb-4">
        <List
          dataSource={application.scheme.documentRequirements}
          renderItem={(docReq) => {
            const uploaded = uploadedDocMap[docReq.id];
            return (
              <List.Item
                actions={!isReadOnly ? [
                  uploaded ? (
                    <Space key="actions">
                      <a href={uploaded.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="small" icon={<FileOutlined />}>View</Button>
                      </a>
                      <Popconfirm title="Remove this document?" onConfirm={() => handleDeleteDoc(uploaded.id)}>
                        <Button size="small" icon={<DeleteOutlined />} danger>Remove</Button>
                      </Popconfirm>
                    </Space>
                  ) : (
                    <Upload
                      key="upload"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxCount={1}
                      showUploadList={false}
                      beforeUpload={(file) => handleUpload(file, docReq.id)}
                    >
                      <Button size="small" icon={<UploadOutlined />}>Upload</Button>
                    </Upload>
                  ),
                ] : uploaded ? [
                  <a key="view" href={uploaded.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="small" icon={<FileOutlined />}>View</Button>
                  </a>,
                ] : []}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text>{docReq.documentName}</Text>
                      {docReq.isMandatory && <Tag color="red">Mandatory</Tag>}
                    </Space>
                  }
                  description={
                    uploaded
                      ? (
                        <div>
                          <Text type="success"><CheckCircleFilled /> {uploaded.fileName}</Text>
                          {isReadOnly && <AiStatusIndicator doc={uploaded} />}
                        </div>
                      )
                      : <Text type="secondary"><CloseCircleFilled /> Not uploaded</Text>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>

      {/* Submit Button */}
      {!isReadOnly && (
        <Card>
          <Popconfirm
            title="Submit Application?"
            description="Once submitted, you cannot edit this application. Make sure all required fields and documents are complete."
            onConfirm={handleSubmit}
            okText="Yes, Submit"
            cancelText="Cancel"
          >
            <Button type="primary" icon={<SendOutlined />} size="large" block loading={submitting}>
              Submit Application
            </Button>
          </Popconfirm>
        </Card>
      )}
    </div>
  );
};

export default ApplicationForm;
