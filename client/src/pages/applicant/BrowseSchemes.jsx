import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Modal, Descriptions, Tag, List, Form, Input, InputNumber, Alert, Space, Spin, message, Divider, Result } from 'antd';
import { EyeOutlined, CheckCircleOutlined, WarningOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { applicantSchemeService, applicationService } from '../../api/applicantService';

const { Title, Paragraph, Text } = Typography;

const operatorLabels = {
  EQUALS: 'must be',
  NOT_EQUALS: 'must not be',
  LESS_THAN: 'must be less than',
  GREATER_THAN: 'must be greater than',
  LESS_THAN_OR_EQUAL: 'must be at most',
  GREATER_THAN_OR_EQUAL: 'must be at least',
  IN: 'must be one of',
};

const formatRuleText = (rule) => {
  const fieldLabels = { income: 'Family annual income', category: 'Category', marks: 'Marks percentage', age: 'Age' };
  const fieldLabel = fieldLabels[rule.fieldName] || rule.fieldName;
  const opLabel = operatorLabels[rule.operator] || rule.operator;
  let valueText = rule.value;
  if (rule.fieldName === 'income') {
    valueText = `\u20B9${parseInt(rule.value).toLocaleString('en-IN')}`;
  }
  if (rule.operator === 'IN') {
    valueText = rule.value.split(',').join(', ');
  }
  return `${fieldLabel} ${opLabel} ${valueText}`;
};

const BrowseSchemes = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [eligResult, setEligResult] = useState(null);
  const [eligLoading, setEligLoading] = useState(false);
  const [eligForm] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const res = await applicantSchemeService.getActiveSchemes();
        setSchemes(res.data.schemes);
      } catch (error) {
        message.error('Failed to load schemes.');
      } finally {
        setLoading(false);
      }
    };
    fetchSchemes();
  }, []);

  const handleViewDetails = async (schemeId) => {
    setDetailLoading(true);
    setModalOpen(true);
    setEligResult(null);
    eligForm.resetFields();
    try {
      const res = await applicantSchemeService.getSchemeDetails(schemeId);
      setSelectedScheme(res.data.scheme);
    } catch (error) {
      message.error('Failed to load scheme details.');
      setModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEligibilityCheck = async (values) => {
    if (!selectedScheme) return;
    setEligLoading(true);
    try {
      const res = await applicantSchemeService.checkEligibility(selectedScheme.id, values);
      setEligResult(res.data);
    } catch (error) {
      message.error('Eligibility check failed.');
    } finally {
      setEligLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedScheme) return;
    try {
      const res = await applicationService.create(selectedScheme.id);
      message.success('Application created!');
      setModalOpen(false);
      navigate(`/applicant/applications/${res.data.application.id}`);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to create application.';
      if (error.response?.data?.applicationId) {
        message.info(msg);
        navigate(`/applicant/applications/${error.response.data.applicationId}`);
      } else {
        message.error(msg);
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[40vh]"><Spin size="large" /></div>;
  }

  return (
    <div>
      <Title level={3}>Browse Scholarship Schemes</Title>
      <Paragraph className="text-gray-500 mb-6">
        Explore available scholarship and fellowship programs from the Ministry of Tribal Affairs.
      </Paragraph>

      <Row gutter={[24, 24]}>
        {schemes.map((scheme) => (
          <Col xs={24} sm={12} lg={8} key={scheme.id}>
            <Card
              hoverable
              className="h-full flex flex-col"
              actions={[
                <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetails(scheme.id)}>
                  View Details
                </Button>,
              ]}
            >
              <Title level={5}>{scheme.name}</Title>
              <Paragraph ellipsis={{ rows: 3 }} className="text-gray-600">
                {scheme.description || 'No description available.'}
              </Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      {schemes.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Paragraph>No active schemes available at the moment.</Paragraph>
        </div>
      )}

      <Modal
        title={selectedScheme?.name || 'Scheme Details'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setSelectedScheme(null); setEligResult(null); }}
        footer={null}
        width={720}
      >
        {detailLoading ? (
          <div className="flex justify-center py-8"><Spin size="large" /></div>
        ) : selectedScheme ? (
          <div>
            <Paragraph>{selectedScheme.description}</Paragraph>

            <Divider orientation="left">Eligibility Criteria</Divider>
            <List
              size="small"
              dataSource={selectedScheme.eligibilityRules}
              renderItem={(rule) => (
                <List.Item>
                  <Text>{formatRuleText(rule)}</Text>
                </List.Item>
              )}
            />

            <Divider orientation="left">Required Documents</Divider>
            <List
              size="small"
              dataSource={selectedScheme.documentRequirements}
              renderItem={(doc) => (
                <List.Item>
                  <Text>{doc.documentName}</Text>
                  {doc.isMandatory ? <Tag color="red">Mandatory</Tag> : <Tag color="blue">Optional</Tag>}
                </List.Item>
              )}
            />

            <Divider orientation="left">Quick Eligibility Check</Divider>
            <Form form={eligForm} layout="vertical" onFinish={handleEligibilityCheck} size="small">
              <Row gutter={16}>
                {selectedScheme.eligibilityRules.map((rule) => (
                  <Col xs={24} sm={12} key={rule.id}>
                    <Form.Item
                      label={rule.fieldName.charAt(0).toUpperCase() + rule.fieldName.slice(1)}
                      name={rule.fieldName}
                      rules={[{ required: true, message: `Enter your ${rule.fieldName}` }]}
                    >
                      {['income', 'marks', 'age'].includes(rule.fieldName) ? (
                        <InputNumber className="w-full" placeholder={`Enter ${rule.fieldName}`} />
                      ) : (
                        <Input placeholder={`Enter ${rule.fieldName}`} />
                      )}
                    </Form.Item>
                  </Col>
                ))}
              </Row>
              <Button type="primary" htmlType="submit" loading={eligLoading} block>
                Check Eligibility
              </Button>
            </Form>

            {eligResult && (
              <div className="mt-4">
                {eligResult.eligible ? (
                  <Alert
                    message="You appear eligible for this scheme!"
                    description={`All ${eligResult.totalRules} criteria met.`}
                    type="success"
                    showIcon
                    icon={<CheckCircleOutlined />}
                  />
                ) : (
                  <Alert
                    message="Some criteria may not be met"
                    description={
                      <div>
                        <p>{eligResult.passedRules} of {eligResult.totalRules} criteria met.</p>
                        <ul className="mt-2">
                          {eligResult.failedRules.map((fr, i) => (
                            <li key={i} className="text-red-600">\u2022 {fr.reason} (Expected: {fr.expectedValue}, Yours: {fr.yourValue || 'Not provided'})</li>
                          ))}
                        </ul>
                      </div>
                    }
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                  />
                )}
              </div>
            )}

            <Divider />
            <Button type="primary" icon={<RocketOutlined />} size="large" block onClick={handleApply}>
              Proceed to Application
            </Button>
            <Text type="secondary" className="block text-center mt-2">
              The eligibility check is advisory only and does not prevent you from applying.
            </Text>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default BrowseSchemes;
