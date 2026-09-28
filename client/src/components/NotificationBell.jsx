import { useState, useEffect } from 'react';
import { Badge, Popover, List, Typography, Button } from 'antd';
import { BellOutlined, InfoCircleOutlined, WarningOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { notificationService } from '../api/notificationService';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getMyNotifications();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      fetchNotifications();
    } catch (e) {}
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationService.markAsRead(notif.id);
        fetchNotifications();
      } catch (e) {}
    }
    setOpen(false);
    
    // Generate route based on entity type if backend didn't provide actionUrl directly,
    // though for the demo we can just rely on standard paths.
    if (notif.relatedEntityType === 'Application') {
      navigate(`/applicant/applications/${notif.relatedEntityId}`);
    } else if (notif.relatedEntityType === 'PostSelectionDocument' || notif.relatedEntityType === 'FellowshipRecord') {
      navigate(`/applicant/fellowship`);
    } else {
      navigate('/notifications');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'SELECTION_DECISION':
      case 'DISBURSEMENT_UPDATE': return <CheckCircleOutlined className="text-green-500" />;
      case 'DEFICIENCY_RAISED':
      case 'DOCUMENT_REQUIREMENT_DUE': return <WarningOutlined className="text-yellow-500" />;
      case 'STATUS_CHANGE': return <InfoCircleOutlined className="text-blue-500" />;
      default: return <InfoCircleOutlined className="text-gray-500" />;
    }
  };

  const content = (
    <div style={{ width: 380, maxHeight: 450, overflowY: 'auto' }}>
      <div className="flex justify-between items-center mb-2 px-2 border-b pb-2">
        <Text strong>Notifications</Text>
        <div>
          {unreadCount > 0 && (
            <Button type="link" size="small" onClick={handleMarkAllRead}>Mark all as read</Button>
          )}
          <Button type="link" size="small" onClick={() => { setOpen(false); navigate('/notifications'); }}>View All</Button>
        </div>
      </div>
      <List
        itemLayout="horizontal"
        dataSource={notifications.slice(0, 5)}
        locale={{ emptyText: 'No recent notifications' }}
        renderItem={(item) => (
          <List.Item
            className={`cursor-pointer hover:bg-gray-50 px-2 transition-colors ${!item.isRead ? 'bg-blue-50/50' : ''}`}
            onClick={() => handleNotificationClick(item)}
          >
            <List.Item.Meta
              avatar={getIcon(item.type)}
              title={<span className={!item.isRead ? 'font-semibold text-sm' : 'font-normal text-sm'}>{item.title}</span>}
              description={
                <div className="flex flex-col">
                  <span className="text-xs text-gray-600 line-clamp-2">{item.message}</span>
                  <span className="text-[10px] text-gray-400 mt-1">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              }
            />
            {!item.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 ml-2 flex-shrink-0" />}
          </List.Item>
        )}
      />
    </div>
  );

  return (
    <Popover content={content} trigger="click" open={open} onOpenChange={setOpen} placement="bottomRight">
      <Badge count={unreadCount} size="small" className="cursor-pointer mr-4 mt-1">
        <BellOutlined className="text-white text-xl hover:text-blue-300 transition-colors" style={{ color: '#fff' }} />
      </Badge>
    </Popover>
  );
};

export default NotificationBell;
