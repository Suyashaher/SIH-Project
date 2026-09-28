import { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Button, Tag, Spin, message } from 'antd';
import { TrophyOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { officerService } from '../../api/officerService';

const { Title, Paragraph, Text } = Typography;

const MySchemes = () => {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSchemes = async () => {
    try {
      const res = await officerService.getMySchemes();
      setSchemes(res.data.schemes || []);
    } catch (error) {
      message.error('Failed to load assigned schemes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchemes(); }, []);

  if (loading) return <div className="flex justify-center mt-20"><Spin size="large" /></div>;

  return (
    <div>
      <Title level={3}>My Assigned Schemes</Title>
      <Paragraph className="text-gray-500 mb-6">
        Select a scheme below to manage its final selections and rankings.
      </Paragraph>

      <Row gutter={[24, 24]}>
        {schemes.map(scheme => (
          <Col xs={24} md={12} key={scheme.id}>
            <Card hoverable className="h-full flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <Title level={4} className="!mb-0">{scheme.name}</Title>
                  <Tag color={scheme.isActive ? 'green' : 'red'}>
                    {scheme.isActive ? 'Active' : 'Inactive'}
                  </Tag>
                </div>
                <Paragraph className="text-gray-600 line-clamp-2">
                  {scheme.description || 'No description provided.'}
                </Paragraph>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                <Button 
                  type="primary" 
                  icon={<TrophyOutlined />}
                  onClick={() => navigate(`/officer/schemes/${scheme.id}/selection`)}
                >
                  Manage Selection
                </Button>
              </div>
            </Card>
          </Col>
        ))}
        {schemes.length === 0 && (
          <Col span={24}>
            <Card className="text-center py-10 bg-gray-50">
              <Text type="secondary">You are not assigned to any schemes yet.</Text>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default MySchemes;
