import { Layout, Menu, Button } from 'antd';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined, LoginOutlined, LogoutOutlined, DashboardOutlined,
  UserAddOutlined, SearchOutlined, FileTextOutlined, AppstoreOutlined, TeamOutlined,
  BarChartOutlined, TrophyOutlined, SafetyCertificateOutlined, ExperimentOutlined,
  DownloadOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from '../components/NotificationBell';

const { Header, Content, Footer } = Layout;

const MainLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    const dashboardMap = {
      ADMIN: '/admin/dashboard',
      OFFICER: '/officer/dashboard',
      APPLICANT: '/applicant/dashboard',
    };
    return dashboardMap[user?.role] || '/';
  };

  const getMenuItems = () => {
    if (!isAuthenticated()) {
      return [
        { key: 'home', icon: <HomeOutlined />, label: <Link to="/">Home</Link> },
        { key: 'about', icon: <InfoCircleOutlined />, label: <Link to="/about">About</Link> },
        { key: 'login', icon: <LoginOutlined />, label: <Link to="/login">Login</Link> },
        { key: 'register', icon: <UserAddOutlined />, label: <Link to="/register">Register</Link> },
      ];
    }

    const items = [
      { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to={getDashboardPath()}>Dashboard</Link> },
    ];

    if (user?.role === 'APPLICANT') {
      items.push(
        { key: 'schemes', icon: <SearchOutlined />, label: <Link to="/applicant/schemes">Browse Schemes</Link> },
        { key: 'applications', icon: <FileTextOutlined />, label: <Link to="/applicant/applications">My Applications</Link> },
        { key: 'fellowship', icon: <TrophyOutlined />, label: <Link to="/applicant/fellowship">My Fellowship</Link> },
      );
    }

    if (user?.role === 'ADMIN') {
      items.push(
        { key: 'scheme-mgmt', icon: <AppstoreOutlined />, label: <Link to="/admin/schemes">Schemes</Link> },
        { key: 'officer-mgmt', icon: <TeamOutlined />, label: <Link to="/admin/officers">Officers</Link> },
        { key: 'fellowships', icon: <TrophyOutlined />, label: <Link to="/admin/fellowships">Fellowships</Link> },
        {
          key: 'analytics', icon: <BarChartOutlined />, label: 'Analytics',
          children: [
            { key: 'ana-verification', icon: <SafetyCertificateOutlined />, label: <Link to="/admin/analytics/verification">Verification</Link> },
            { key: 'ana-selection', icon: <TrophyOutlined />, label: <Link to="/admin/analytics/selection">Selection</Link> },
            { key: 'ana-officers', icon: <TeamOutlined />, label: <Link to="/admin/analytics/officers">Officers</Link> },
            { key: 'ana-fellowships', icon: <TrophyOutlined />, label: <Link to="/admin/analytics/fellowships">Fellowships</Link> },
            { key: 'ana-processing', icon: <BarChartOutlined />, label: <Link to="/admin/processing-analytics">Processing ETA</Link> },
            { key: 'ana-ai', icon: <ExperimentOutlined />, label: <Link to="/admin/ai-insights">AI Insights</Link> },
          ],
        },
        { key: 'reports', icon: <DownloadOutlined />, label: <Link to="/admin/reports">Reports</Link> },
      );
    }

    if (user?.role === 'OFFICER') {
      items.push(
        { key: 'app-queue', icon: <FileTextOutlined />, label: <Link to="/officer/applications">Applications</Link> },
      );
    }

    return items;
  };

  const isFullBleed = location.pathname === '/';

  return (
    <Layout className="min-h-screen">
      <Header className="flex items-center">
        <Link to="/" className="flex items-center mr-8 flex-shrink-0">
          <img src="/images/logo.png" alt="ShikshaSaarthi Logo" className="h-12 bg-white rounded-md p-1" />
        </Link>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname === '/' ? 'home' : location.pathname.split('/')[1] || 'dashboard']}
          items={getMenuItems()}
          className="flex-1 min-w-0 justify-end"
        />
        {isAuthenticated() && (
          <div className="flex items-center gap-4 flex-shrink-0 ml-4">
            <NotificationBell />
            <span className="text-white text-sm hidden sm:inline" style={{ color: '#fff' }}>
              {user?.name} ({user?.role})
            </span>
            <Button type="link" onClick={() => navigate('/settings/notifications')} className="text-white px-0" style={{ color: '#fff' }}>Settings</Button>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className="text-white hover:text-red-400"
              style={{ color: '#fff' }}
              size="small"
            >
              Logout
            </Button>
          </div>
        )}
      </Header>
      <Content className={isFullBleed ? "" : "p-6 bg-gray-50"}>
        {isFullBleed ? (
          <Outlet />
        ) : (
          <div className="bg-white rounded-lg p-6 min-h-[calc(100vh-180px)]">
            <Outlet />
          </div>
        )}
      </Content>
      <Footer className="text-center text-gray-500">
        ShikshaSaarthi ©{new Date().getFullYear()} — Ministry of Tribal Affairs
      </Footer>
    </Layout>
  );
};

export default MainLayout;
