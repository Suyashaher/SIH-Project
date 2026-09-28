import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Tabs, Typography, Button, Table, Form, Input, Select, Switch, Space,
  Modal, message, Tag, Popconfirm, Card, InputNumber, Descriptions, Spin, Alert
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
  ArrowUpOutlined, ArrowDownOutlined, TrophyOutlined
} from '@ant-design/icons';
import { schemeService } from '../../api/schemeService';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const FIELD_NAME_OPTIONS = ['income', 'category', 'marks', 'age'];
const OPERATOR_OPTIONS = [
  { value: 'EQUALS', label: 'Equals' },
  { value: 'NOT_EQUALS', label: 'Not Equals' },
  { value: 'LESS_THAN', label: 'Less Than' },
  { value: 'GREATER_THAN', label: 'Greater Than' },
  { value: 'LESS_THAN_OR_EQUAL', label: 'Less Than or Equal' },
  { value: 'GREATER_THAN_OR_EQUAL', label: 'Greater Than or Equal' },
  { value: 'IN', label: 'In (comma-separated)' },
];
const FIELD_TYPE_OPTIONS = ['TEXT', 'NUMBER', 'DATE', 'DROPDOWN', 'FILE'];

const SchemeConfig = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rules state
  const [rules, setRules] = useState([]);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm] = Form.useForm();

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [docForm] = Form.useForm();

  // Fields state
  const [fields, setFields] = useState([]);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [fieldForm] = Form.useForm();
  const [selectedFieldType, setSelectedFieldType] = useState('TEXT');

  // Selection criteria state
  const [selectionCriteria, setSelectionCriteria] = useState([]);
  const [totalWeightage, setTotalWeightage] = useState(0);
  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState(null);
  const [criteriaForm] = Form.useForm();
  const [totalSeats, setTotalSeats] = useState(null);
  const [savingSeats, setSavingSeats] = useState(false);

  const fetchScheme = useCallback(async () => {
    setLoading(true);
    try {
      const res = await schemeService.getSchemeById(id);
      const data = res.data.scheme;
      setScheme(data);
      setRules(data.eligibilityRules || []);
      setDocuments(data.documentRequirements || []);
      setFields(data.applicationFields || []);
      setTotalSeats(data.totalSeats || null);
    } catch (error) {
      message.error('Failed to load scheme.');
      navigate('/admin/schemes');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchScheme();
  }, [fetchScheme]);

  const fetchSelectionCriteria = useCallback(async () => {
    try {
      const res = await schemeService.getSelectionCriteria(id);
      setSelectionCriteria(res.data.criteria || []);
      setTotalWeightage(res.data.totalWeightage || 0);
    } catch (error) {
      // Selection criteria table may not exist yet, ignore
    }
  }, [id]);

  useEffect(() => {
    fetchSelectionCriteria();
  }, [fetchSelectionCriteria]);

  // === RULES HANDLERS ===
  const handleRuleSave = async (values) => {
    try {
      if (editingRule) {
        await schemeService.updateRule(editingRule.id, values);
        message.success('Rule updated.');
      } else {
        await schemeService.addRule(id, values);
        message.success('Rule added.');
      }
      setRuleModalOpen(false);
      setEditingRule(null);
      ruleForm.resetFields();
      fetchScheme();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to save rule.');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await schemeService.deleteRule(ruleId);
      message.success('Rule deleted.');
      fetchScheme();
    } catch (error) {
      message.error('Failed to delete rule.');
    }
  };

  // === DOCUMENT HANDLERS ===
  const handleDocSave = async (values) => {
    try {
      const payload = { ...values, isMandatory: values.isMandatory !== false };
      if (editingDoc) {
        await schemeService.updateDocument(editingDoc.id, payload);
        message.success('Document requirement updated.');
      } else {
        await schemeService.addDocument(id, payload);
        message.success('Document requirement added.');
      }
      setDocModalOpen(false);
      setEditingDoc(null);
      docForm.resetFields();
      fetchScheme();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to save document.');
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await schemeService.deleteDocument(docId);
      message.success('Document requirement deleted.');
      fetchScheme();
    } catch (error) {
      message.error('Failed to delete document.');
    }
  };

  // === FIELD HANDLERS ===
  const handleFieldSave = async (values) => {
    try {
      if (editingField) {
        await schemeService.updateField(editingField.id, values);
        message.success('Field updated.');
      } else {
        await schemeService.addField(id, values);
        message.success('Field added.');
      }
      setFieldModalOpen(false);
      setEditingField(null);
      fieldForm.resetFields();
      setSelectedFieldType('TEXT');
      fetchScheme();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to save field.');
    }
  };

  const handleDeleteField = async (fieldId) => {
    try {
      await schemeService.deleteField(fieldId);
      message.success('Field deleted.');
      fetchScheme();
    } catch (error) {
      message.error('Failed to delete field.');
    }
  };

  const handleMoveField = async (index, direction) => {
    const newFields = [...fields];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newFields.length) return;

    const tempOrder = newFields[index].displayOrder;
    newFields[index].displayOrder = newFields[swapIndex].displayOrder;
    newFields[swapIndex].displayOrder = tempOrder;

    [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];

    try {
      await schemeService.reorderFields(
        id,
        newFields.map((f, i) => ({ id: f.id, displayOrder: i }))
      );
      setFields(newFields);
    } catch (error) {
      message.error('Failed to reorder fields.');
    }
  };

  // === SELECTION CRITERIA HANDLERS ===
  const handleCriteriaSave = async (values) => {
    try {
      if (editingCriteria) {
        await schemeService.updateSelectionCriteria(editingCriteria.id, values);
        message.success('Criteria updated.');
      } else {
        const res = await schemeService.addSelectionCriteria(id, values);
        message.success('Criteria added.');
        if (res.data.warning) message.warning(res.data.warning);
      }
      setCriteriaModalOpen(false);
      setEditingCriteria(null);
      criteriaForm.resetFields();
      fetchSelectionCriteria();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to save criteria.');
    }
  };

  const handleDeleteCriteria = async (criteriaId) => {
    try {
      await schemeService.deleteSelectionCriteria(criteriaId);
      message.success('Criteria deleted.');
      fetchSelectionCriteria();
    } catch (error) {
      message.error('Failed to delete criteria.');
    }
  };

  const handleSaveTotalSeats = async () => {
    setSavingSeats(true);
    try {
      await schemeService.updateTotalSeats(id, totalSeats);
      message.success('Total seats updated.');
    } catch (error) {
      message.error('Failed to update total seats.');
    } finally {
      setSavingSeats(false);
    }
  };

  // === TABLE COLUMNS ===
  const ruleColumns = [
    { title: 'Field', dataIndex: 'fieldName', key: 'fieldName' },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', render: (op) => <Tag>{op}</Tag> },
    { title: 'Value', dataIndex: 'value', key: 'value' },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => {
            setEditingRule(record);
            ruleForm.setFieldsValue(record);
            setRuleModalOpen(true);
          }} />
          <Popconfirm title="Delete this rule?" onConfirm={() => handleDeleteRule(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const docColumns = [
    { title: 'Document Name', dataIndex: 'documentName', key: 'documentName' },
    {
      title: 'Mandatory', dataIndex: 'isMandatory', key: 'isMandatory', width: 100,
      render: (val) => <Tag color={val ? 'red' : 'blue'}>{val ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => {
            setEditingDoc(record);
            docForm.setFieldsValue(record);
            setDocModalOpen(true);
          }} />
          <Popconfirm title="Delete this document requirement?" onConfirm={() => handleDeleteDoc(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const fieldColumns = [
    { title: 'Order', dataIndex: 'displayOrder', key: 'displayOrder', width: 70 },
    { title: 'Label', dataIndex: 'fieldLabel', key: 'fieldLabel' },
    { title: 'Type', dataIndex: 'fieldType', key: 'fieldType', width: 100, render: (t) => <Tag>{t}</Tag> },
    {
      title: 'Required', dataIndex: 'isRequired', key: 'isRequired', width: 90,
      render: (val) => <Tag color={val ? 'green' : 'default'}>{val ? 'Yes' : 'No'}</Tag>,
    },
    { title: 'Options', dataIndex: 'options', key: 'options', ellipsis: true, render: (val) => val || '—' },
    {
      title: 'Actions', key: 'actions', width: 160,
      render: (_, record, index) => (
        <Space>
          <Button icon={<ArrowUpOutlined />} size="small" disabled={index === 0}
            onClick={() => handleMoveField(index, 'up')} />
          <Button icon={<ArrowDownOutlined />} size="small" disabled={index === fields.length - 1}
            onClick={() => handleMoveField(index, 'down')} />
          <Button icon={<EditOutlined />} size="small" onClick={() => {
            setEditingField(record);
            setSelectedFieldType(record.fieldType);
            fieldForm.setFieldsValue(record);
            setFieldModalOpen(true);
          }} />
          <Popconfirm title="Delete this field?" onConfirm={() => handleDeleteField(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const criteriaColumns = [
    { title: 'Criteria Name', dataIndex: 'criteriaName', key: 'criteriaName' },
    { title: 'Source Field', dataIndex: 'fieldSource', key: 'fieldSource' },
    {
      title: 'Weightage', dataIndex: 'weightage', key: 'weightage',
      render: (v) => <Tag color="blue">{(v * 100).toFixed(0)}%</Tag>,
    },
    {
      title: 'Direction', dataIndex: 'scoreDirection', key: 'scoreDirection',
      render: (d) => <Tag color={d === 'HIGHER_IS_BETTER' ? 'green' : 'orange'}>{d === 'HIGHER_IS_BETTER' ? '↑ Higher is Better' : '↓ Lower is Better'}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => {
            setEditingCriteria(record);
            criteriaForm.setFieldsValue(record);
            setCriteriaModalOpen(true);
          }} />
          <Popconfirm title="Delete this criteria?" onConfirm={() => handleDeleteCriteria(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return <div className="flex justify-center items-center min-h-[40vh]"><Spin size="large" /></div>;
  }

  const tabItems = [
    {
      key: 'rules',
      label: `Eligibility Rules (${rules.length})`,
      children: (
        <div>
          <div className="flex justify-end mb-4">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setEditingRule(null); ruleForm.resetFields(); setRuleModalOpen(true);
            }}>
              Add Rule
            </Button>
          </div>
          <Table columns={ruleColumns} dataSource={rules} rowKey="id" pagination={false} />
        </div>
      ),
    },
    {
      key: 'documents',
      label: `Required Documents (${documents.length})`,
      children: (
        <div>
          <div className="flex justify-end mb-4">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setEditingDoc(null); docForm.resetFields(); setDocModalOpen(true);
            }}>
              Add Document
            </Button>
          </div>
          <Table columns={docColumns} dataSource={documents} rowKey="id" pagination={false} />
        </div>
      ),
    },
    {
      key: 'fields',
      label: `Application Fields (${fields.length})`,
      children: (
        <div>
          <div className="flex justify-end mb-4">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setEditingField(null); fieldForm.resetFields(); setSelectedFieldType('TEXT'); setFieldModalOpen(true);
            }}>
              Add Field
            </Button>
          </div>
          <Table columns={fieldColumns} dataSource={fields} rowKey="id" pagination={false} />
        </div>
      ),
    },
    {
      key: 'selection',
      label: `Selection Criteria (${selectionCriteria.length})`,
      children: (
        <div>
          <Card className="mb-4">
            <Space align="end">
              <div>
                <Text strong>Total Seats: </Text>
                <InputNumber
                  min={1}
                  value={totalSeats}
                  onChange={setTotalSeats}
                  placeholder="Number of seats"
                  className="w-40"
                />
              </div>
              <Button onClick={handleSaveTotalSeats} loading={savingSeats}>Save Seats</Button>
            </Space>
          </Card>

          {Math.abs(totalWeightage - 1.0) > 0.01 && totalWeightage > 0 && (
            <Alert
              message={`Total weightage is ${(totalWeightage * 100).toFixed(1)}% — should be 100%`}
              type="warning"
              showIcon
              className="mb-4"
            />
          )}

          <div className="flex justify-end mb-4">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setEditingCriteria(null); criteriaForm.resetFields(); setCriteriaModalOpen(true);
            }}>
              Add Criteria
            </Button>
          </div>
          <Table columns={criteriaColumns} dataSource={selectionCriteria} rowKey="id" pagination={false} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/schemes')} className="mb-4">
        Back to Schemes
      </Button>

      <Card className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div />
          <Button type="primary" icon={<TrophyOutlined />} onClick={() => navigate(`/admin/schemes/${id}/selection`)}>
            Selection Management
          </Button>
        </div>
        <Descriptions title={scheme?.name} column={2}>
          <Descriptions.Item label="Description">{scheme?.description || 'No description'}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={scheme?.isActive ? 'green' : 'red'}>{scheme?.isActive ? 'Active' : 'Inactive'}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Tabs defaultActiveKey="rules" items={tabItems} />

      {/* Rule Modal */}
      <Modal
        title={editingRule ? 'Edit Rule' : 'Add Eligibility Rule'}
        open={ruleModalOpen}
        onCancel={() => { setRuleModalOpen(false); setEditingRule(null); ruleForm.resetFields(); }}
        onOk={() => ruleForm.submit()}
        okText={editingRule ? 'Update' : 'Add'}
      >
        <Form form={ruleForm} layout="vertical" onFinish={handleRuleSave}>
          <Form.Item name="fieldName" label="Field" rules={[{ required: true, message: 'Select a field' }]}>
            <Select placeholder="Select field">
              {FIELD_NAME_OPTIONS.map((f) => <Option key={f} value={f}>{f}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="operator" label="Operator" rules={[{ required: true, message: 'Select operator' }]}>
            <Select placeholder="Select operator">
              {OPERATOR_OPTIONS.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="value" label="Value" rules={[{ required: true, message: 'Enter value' }]}>
            <Input placeholder="e.g., 250000 or ST" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Document Modal */}
      <Modal
        title={editingDoc ? 'Edit Document Requirement' : 'Add Document Requirement'}
        open={docModalOpen}
        onCancel={() => { setDocModalOpen(false); setEditingDoc(null); docForm.resetFields(); }}
        onOk={() => docForm.submit()}
        okText={editingDoc ? 'Update' : 'Add'}
      >
        <Form form={docForm} layout="vertical" onFinish={handleDocSave} initialValues={{ isMandatory: true }}>
          <Form.Item name="documentName" label="Document Name" rules={[{ required: true, message: 'Enter document name' }]}>
            <Input placeholder="e.g., ST Certificate" />
          </Form.Item>
          <Form.Item name="isMandatory" label="Mandatory" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Field Modal */}
      <Modal
        title={editingField ? 'Edit Application Field' : 'Add Application Field'}
        open={fieldModalOpen}
        onCancel={() => { setFieldModalOpen(false); setEditingField(null); fieldForm.resetFields(); setSelectedFieldType('TEXT'); }}
        onOk={() => fieldForm.submit()}
        okText={editingField ? 'Update' : 'Add'}
      >
        <Form form={fieldForm} layout="vertical" onFinish={handleFieldSave} initialValues={{ fieldType: 'TEXT', isRequired: true }}>
          <Form.Item name="fieldLabel" label="Field Label" rules={[{ required: true, message: 'Enter field label' }]}>
            <Input placeholder="e.g., Course Name" />
          </Form.Item>
          <Form.Item name="fieldType" label="Field Type">
            <Select onChange={(val) => setSelectedFieldType(val)}>
              {FIELD_TYPE_OPTIONS.map((t) => <Option key={t} value={t}>{t}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="isRequired" label="Required" valuePropName="checked">
            <Switch />
          </Form.Item>
          {selectedFieldType === 'DROPDOWN' && (
            <Form.Item name="options" label="Options (comma-separated)" rules={[{ required: true, message: 'Enter options for dropdown' }]}>
              <Input placeholder="e.g., M.Phil,Ph.D" />
            </Form.Item>
          )}
          <Form.Item name="displayOrder" label="Display Order">
            <InputNumber min={0} placeholder="Auto-assigned if empty" className="w-full" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Selection Criteria Modal */}
      <Modal
        title={editingCriteria ? 'Edit Selection Criteria' : 'Add Selection Criteria'}
        open={criteriaModalOpen}
        onCancel={() => { setCriteriaModalOpen(false); setEditingCriteria(null); criteriaForm.resetFields(); }}
        onOk={() => criteriaForm.submit()}
        okText={editingCriteria ? 'Update' : 'Add'}
      >
        <Form form={criteriaForm} layout="vertical" onFinish={handleCriteriaSave}
          initialValues={{ weightage: 0.5, scoreDirection: 'HIGHER_IS_BETTER' }}>
          <Form.Item name="criteriaName" label="Criteria Name" rules={[{ required: true, message: 'Enter criteria name' }]}>
            <Input placeholder="e.g., Academic Marks" />
          </Form.Item>
          <Form.Item name="fieldSource" label="Source Field" rules={[{ required: true, message: 'Select source field' }]}>
            <Select placeholder="Select which application field to use">
              {fields.map(f => <Option key={f.id} value={f.fieldLabel}>{f.fieldLabel} ({f.fieldType})</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="weightage" label="Weightage (0-1, e.g., 0.4 = 40%)" rules={[{ required: true, message: 'Enter weightage' }]}>
            <InputNumber min={0} max={1} step={0.05} className="w-full" />
          </Form.Item>
          <Form.Item name="scoreDirection" label="Score Direction">
            <Select>
              <Option value="HIGHER_IS_BETTER">Higher is Better (e.g., marks)</Option>
              <Option value="LOWER_IS_BETTER">Lower is Better (e.g., income)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SchemeConfig;
