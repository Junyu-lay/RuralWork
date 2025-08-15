import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { PhoneOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './styles.css';

const LoginPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // 如果已经登录，直接跳转到欢迎页面
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/welcome', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const result = await login(values.phone, values.password);
      
      if (result.success) {
        message.success('登录成功！');
        navigate('/welcome', { replace: true });
      } else {
        message.error(result.message || '登录失败');
      }
      
    } catch (error) {
      message.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-overlay" />
      </div>
      
      <div className="login-container">
        <Card className="login-card" variant="filled">
          <div className="login-header">
            <div className="logo-section">
              <UserOutlined className="logo-icon" />
            </div>
            <h1 className="system-title">童坊镇政务管理系统</h1>
            <p className="system-subtitle">请使用您的账户登录系统</p>
          </div>
          
          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="phone"
              label="手机号码"
              rules={[
                { required: true, message: '请输入手机号码' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
              ]}
            >
              <Input 
                prefix={<PhoneOutlined className="input-icon" />}
                placeholder="请输入手机号码"
                className="login-input"
              />
            </Form.Item>
            
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="input-icon" />}
                placeholder="请输入密码"
                className="login-input"
              />
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                className="login-button"
                loading={loading}
                block
              >
                登录系统
              </Button>
            </Form.Item>
          </Form>
          
          <div className="login-footer">
            <p className="help-text">忘记密码？请联系系统管理员</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
