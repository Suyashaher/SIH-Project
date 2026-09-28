import { Form, Input, Button, Card, Typography, Divider, message } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const { Title, Paragraph } = Typography;

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const userData = await login(values.email, values.password);
      message.success('Login successful!');

      // Redirect based on role
      const dashboardMap = {
        ADMIN: '/admin/dashboard',
        OFFICER: '/officer/dashboard',
        APPLICANT: '/applicant/dashboard',
      };
      navigate(dashboardMap[userData.role] || '/');
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Login failed. Please check your credentials.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-6">
          <img src="/images/logo.png" alt="ShikshaSaarthi Logo" className="h-16 mx-auto mb-4 object-contain" />
          <Title level={3} className="!mt-0">Sign In</Title>
          <Paragraph className="text-gray-500">
            Access your ShikshaSaarthi account
          </Paragraph>
        </div>

        <Form
          name="login"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Enter your email" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Enter your password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Divider />
        <div className="text-center text-gray-500 text-sm">
          Don't have an account? <Link to="/register" className="text-blue-500">Register here</Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
