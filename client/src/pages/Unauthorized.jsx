import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoBack = () => {
    if (user) {
      const dashboardMap = {
        ADMIN: '/admin/dashboard',
        OFFICER: '/officer/dashboard',
        APPLICANT: '/applicant/dashboard',
      };
      navigate(dashboardMap[user.role] || '/');
    } else {
      navigate('/');
    }
  };

  return (
    <Result
      status="403"
      title="403"
      subTitle="Sorry, you are not authorized to access this page."
      extra={
        <Button type="primary" onClick={handleGoBack}>
          Go to Dashboard
        </Button>
      }
    />
  );
};

export default Unauthorized;
