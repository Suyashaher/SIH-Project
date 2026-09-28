import { useState, useEffect } from 'react';
import { Typography, Card, List, Button, Tag, Spin, Pagination } from 'antd';
import { BellOutlined, CheckCircleOutlined, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { notificationService } from '../api/notificationService';

const { Title, Text } = Typography;

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchNotifications = async (p = 1) => {
    setLoading(true);
    try {
      const res = await notificationService.getMyNotifications(p);
      setNotifications(res.data.notifications);
      setPage(res.data.page);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(page); }, [page]);

  const handleMarkAsRead = async (id) => {
    await notificationService.markAsRead(id);
    fetchNotifications(page);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2}><BellOutlined /> All Notifications</Title>
        <Button onClick={() => notificationService.markAllAsRead().then(() => fetchNotifications(page))}>
          Mark All as Read
        </Button>
      </div>
      
      <Card>
        {loading ? <Spin /> : (
          <>
            <List
              itemLayout="horizontal"
              dataSource={notifications}
              renderItem={item => (
                <List.Item
                  actions={[
                    !item.isRead && <Button type="link" onClick={() => handleMarkAsRead(item.id)}>Mark Read</Button>
                  ]}
                  className={!item.isRead ? 'bg-blue-50/30' : ''}
                >
                  <List.Item.Meta
                    avatar={item.type === 'STATUS_CHANGE' ? <InfoCircleOutlined className="text-blue-500 text-2xl"/> : <BellOutlined className="text-gray-400 text-2xl"/>}
                    title={
                      <div className="flex items-center gap-2">
                        <Text strong={!item.isRead}>{item.title}</Text>
                        {!item.isRead && <Tag color="blue">New</Tag>}
                        {item.emailSent && <Tag color="green">Email Sent</Tag>}
                      </div>
                    }
                    description={
                      <div>
                        <p className="mb-1">{item.message}</p>
                        <Text type="secondary" className="text-xs">{new Date(item.createdAt).toLocaleString()}</Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
            <div className="mt-4 flex justify-end">
              <Pagination current={page} onChange={setPage} total={50} pageSize={20} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
export default Notifications;
