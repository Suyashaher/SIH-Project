import { Typography, Button, Card, Row, Col, Statistic } from 'antd';
import { LogoutOutlined, AuditOutlined, CheckCircleOutlined, ClockCircleOutlined, UnorderedListOutlined, TrophyOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const OfficerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2}>Officer Dashboard</Title>
          <Paragraph className="text-gray-500">
            Welcome back, {user?.name}. Review and process applications assigned to your schemes.
          </Paragraph>
        </div>
        <Button type="default" icon={<LogoutOutlined />} onClick={handleLogout} danger>
          Logout
        </Button>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable onClick={() => navigate('/officer/schemes')} className="cursor-pointer">
            <Statistic title="Selection" value="Management" prefix={<TrophyOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable onClick={() => navigate('/officer/applications')} className="cursor-pointer">
            <Statistic title="Application Queue" value="Review" prefix={<UnorderedListOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <Statistic title="Pending Review" value={0} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <Statistic title="Completed" value={0} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OfficerDashboard;
