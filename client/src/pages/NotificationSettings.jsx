import { useState, useEffect } from 'react';
import { Typography, Card, Switch, Button, message, Divider } from 'antd';
import { SettingOutlined, MailOutlined, BellOutlined } from '@ant-design/icons';
import { notificationService } from '../api/notificationService';

const { Title, Paragraph, Text } = Typography;

const NotificationSettings = () => {
  const [prefs, setPrefs] = useState({ emailEnabled: true, inAppEnabled: true });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    notificationService.getPreferences().then(r => setPrefs(r.data)).catch(console.error);
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await notificationService.updatePreferences(prefs);
      message.success('Preferences saved successfully!');
    } catch (error) {
      message.error('Failed to save preferences.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Title level={2}><SettingOutlined /> Notification Settings</Title>
      <Paragraph className="text-gray-500 mb-6">
        Control how and when you receive updates about your applications and fellowships.
      </Paragraph>
      
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MailOutlined className="text-lg text-blue-500" />
              <Text strong className="text-base">Email Notifications</Text>
            </div>
            <Text type="secondary">Receive updates directly to your registered email address.</Text>
          </div>
          <Switch checked={prefs.emailEnabled} onChange={(v) => setPrefs({...prefs, emailEnabled: v})} />
        </div>
        
        <Divider />
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BellOutlined className="text-lg text-blue-500" />
              <Text strong className="text-base">In-App Notifications</Text>
            </div>
            <Text type="secondary">Receive real-time alerts in the portal via the notification bell.</Text>
          </div>
          <Switch checked={prefs.inAppEnabled} onChange={(v) => setPrefs({...prefs, inAppEnabled: v})} />
        </div>
        
        <div className="flex justify-end">
          <Button type="primary" size="large" onClick={handleSave} loading={loading}>
            Save Preferences
          </Button>
        </div>
      </Card>
    </div>
  );
};
export default NotificationSettings;
