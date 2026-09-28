import { Typography, Card, Row, Col } from 'antd';
import { BookOutlined, TeamOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const Home = () => {
  return (
    <div>
      <div className="text-center mb-8">
        <Title level={2}>Welcome to ShikshaSaarthi</Title>
        <Paragraph className="text-lg text-gray-600">
          AI-Enabled Scholarship & Fellowship Management System
        </Paragraph>
        <Paragraph className="text-gray-500">
          Ministry of Tribal Affairs, Government of India
        </Paragraph>
      </div>

      <Row gutter={[24, 24]} justify="center">
        <Col xs={24} sm={12} md={8}>
          <Card hoverable className="text-center h-full">
            <BookOutlined className="text-4xl text-blue-500 mb-4" />
            <Title level={4}>Scholarship Schemes</Title>
            <Paragraph>Browse and apply for available scholarship and fellowship programs.</Paragraph>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable className="text-center h-full">
            <TeamOutlined className="text-4xl text-green-500 mb-4" />
            <Title level={4}>Application Tracking</Title>
            <Paragraph>Track your application status and receive real-time updates.</Paragraph>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable className="text-center h-full">
            <SafetyCertificateOutlined className="text-4xl text-orange-500 mb-4" />
            <Title level={4}>AI-Powered Verification</Title>
            <Paragraph>Automated document verification and eligibility assessment.</Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Home;
