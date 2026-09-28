import { Typography, Card, Row, Col } from 'antd';
import { SafetyCertificateOutlined, RobotOutlined, BankOutlined, SolutionOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const About = () => {
  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="text-center mb-16">
        <Title level={1} className="!text-4xl sm:!text-5xl !font-bold !mb-6 text-gray-900">
          About ShikshaSaarthi
        </Title>
        <Paragraph className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
          A unified, AI-enabled digital platform for Scheduled Tribe (ST) students to access scholarships and fellowships. We bridge the gap between opportunity and talent through transparent governance.
        </Paragraph>
      </div>

      {/* Mission & Vision */}
      <div className="mb-16">
        <Row gutter={[32, 32]}>
          <Col xs={24} md={12}>
            <Card className="h-full shadow-sm hover:shadow-md transition-shadow border-t-4 border-t-[#10b981]">
              <Title level={3} className="text-gray-800">Our Mission</Title>
              <Paragraph className="text-gray-600 text-base">
                To empower ST students nationwide by providing a seamless, paperless, and completely transparent scholarship management system. We aim to ensure that financial assistance reaches the rightful beneficiaries on time, without bureaucratic delays.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card className="h-full shadow-sm hover:shadow-md transition-shadow border-t-4 border-t-[#0f172a]">
              <Title level={3} className="text-gray-800">Our Vision</Title>
              <Paragraph className="text-gray-600 text-base">
                Building an inclusive digital India where every tribal student has equitable access to higher education funding. Through predictive analytics and AI, we envision a proactive government ecosystem that guides students from application to graduation.
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Core Features */}
      <div>
        <Title level={2} className="text-center !mb-12">Core Features</Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="h-full text-center hover:-translate-y-1 transition-transform border-0 shadow-sm">
              <RobotOutlined className="text-4xl text-blue-500 mb-4" />
              <Title level={4}>AI Verification</Title>
              <Paragraph className="text-gray-600">
                Automated document scanning (OCR) and anomaly detection ensures fast, unbiased processing of submitted certificates.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="h-full text-center hover:-translate-y-1 transition-transform border-0 shadow-sm">
              <SolutionOutlined className="text-4xl text-green-500 mb-4" />
              <Title level={4}>Smart Scrutiny</Title>
              <Paragraph className="text-gray-600">
                Dedicated officer modules with built-in rule engines that cross-verify eligibility criteria in real-time.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="h-full text-center hover:-translate-y-1 transition-transform border-0 shadow-sm">
              <SafetyCertificateOutlined className="text-4xl text-purple-500 mb-4" />
              <Title level={4}>Transparent Tracking</Title>
              <Paragraph className="text-gray-600">
                Applicants get accurate ETA predictions for their application status, leveraging machine learning on historical data.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="h-full text-center hover:-translate-y-1 transition-transform border-0 shadow-sm">
              <BankOutlined className="text-4xl text-orange-500 mb-4" />
              <Title level={4}>Fellowship Lifecycle</Title>
              <Paragraph className="text-gray-600">
                End-to-end management from selection, post-selection document verification, to scheduled financial disbursements.
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default About;
