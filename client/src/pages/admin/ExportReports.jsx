import { useState, useEffect } from 'react';
import { Typography, Card, Select, Button, Space, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { adminService } from '../../api/adminService';

const { Title, Paragraph } = Typography;
const { Option } = Select;

const ExportReports = () => {
  const [type, setType] = useState('applications');
  const [schemeId, setSchemeId] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    adminService.getSchemes().then(r => setSchemes(r.data.schemes || r.data || []));
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await adminService.exportData(type, schemeId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('Report downloaded!');
    } catch (error) {
      message.error('Export failed.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <Title level={3}><DownloadOutlined /> Export Reports</Title>
      <Card>
        <Paragraph>Generate CSV reports for offline Ministry reporting.</Paragraph>
        <Space direction="vertical" size="middle" className="w-full" style={{ maxWidth: 400 }}>
          <div>
            <label className="block text-sm font-medium mb-1">Report Type</label>
            <Select value={type} onChange={setType} className="w-full">
              <Option value="applications">Applications</Option>
              <Option value="fellowships">Fellowships</Option>
              <Option value="disbursements">Disbursements</Option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scheme (optional)</label>
            <Select placeholder="All Schemes" allowClear className="w-full" onChange={(v) => setSchemeId(v || null)}>
              {schemes.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
            </Select>
          </div>
          <Button type="primary" icon={<DownloadOutlined />} loading={downloading} onClick={handleDownload} size="large">
            Download CSV
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default ExportReports;
