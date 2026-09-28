import { Typography, Button, Card, Row, Col, Statistic } from 'antd';
import { LogoutOutlined, FormOutlined, SearchOutlined, FileDoneOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const ApplicantDashboard = () => {
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
          <Title level={2}>Applicant Dashboard</Title>
          <Paragraph className="text-gray-500">
            Welcome, {user?.name}. Browse schemes and track your applications.
          </Paragraph>
        </div>
        <Button type="default" icon={<LogoutOutlined />} onClick={handleLogout} danger>
          Logout
        </Button>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/applicant/schemes')} className="cursor-pointer">
            <Statistic title="Browse Schemes" value="Explore" prefix={<SearchOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/applicant/applications')} className="cursor-pointer">
            <Statistic title="My Applications" value="Track" prefix={<FormOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/applicant/fellowship')} className="cursor-pointer">
            <Statistic title="My Fellowship" value="View" prefix={<FileDoneOutlined />} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ApplicantDashboard;
