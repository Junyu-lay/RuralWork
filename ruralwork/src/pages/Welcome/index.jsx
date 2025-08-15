import React from 'react';
import { Button, Avatar, message } from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined, 
  BarChartOutlined,
  TrophyOutlined,
  CalendarOutlined,
  TeamOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import FeatureCard from '../../components/FeatureCard';

import './styles.css';

const WelcomePage = () => {
  const navigate = useNavigate();
  const { user, logout, canAccess, getRoleName } = useAuth();

  // 功能配置
  const getAllFeatures = () => [
    {
      id: 'voting',
      icon: <BarChartOutlined />,
      title: '投票管理',
      description: '参与各类投票活动，查看投票结果',
      path: '/voting',
      roles: ['admin', 'town_staff', 'station_staff', 'work_team']
    },
    {
      id: 'evaluation', 
      icon: <TrophyOutlined />,
      title: '年度互评',
      description: '德能勤技廉评分，全员互相评价',
      path: '/evaluation',
      roles: ['admin', 'town_staff', 'station_staff', 'work_team']
    },
    {
      id: 'leave',
      icon: <CalendarOutlined />,
      title: '请假申请', 
      description: '提交请假申请，查看申请状态',
      path: '/leave',
      roles: ['admin', 'town_staff', 'station_staff', 'work_team']
    },
    {
      id: 'team-evaluation',
      icon: <TeamOutlined />,
      title: '工作队评分',
      description: '对包村工作队评分，站所专用功能',
      path: '/team-evaluation', 
      roles: ['admin', 'station_staff']
    },
    {
      id: 'admin',
      icon: <SettingOutlined />,
      title: '系统管理',
      description: '用户管理、数据导出，管理员专用',
      path: '/admin',
      roles: ['admin']
    }
  ];

  // 根据用户权限获取可见功能
  const getVisibleFeatures = () => {
    return getAllFeatures().filter(feature => 
      canAccess(feature.id)
    );
  };

  const visibleFeatures = getVisibleFeatures();

  // 滚动到功能区域
  const scrollToFeatures = () => {
    document.getElementById('features').scrollIntoView({
      behavior: 'smooth'
    });
  };

  // 跳转到仪表板
  const goToDashboard = () => {
    // 根据用户角色跳转到不同页面
    if (canAccess('admin')) {
      navigate('/admin');
    } else {
      // 普通用户可以跳转到投票页面作为默认仪表板
      navigate('/voting');
    }
  };

  // 功能卡片点击处理
  const navigateToFeature = (featureId) => {
    // 根据功能ID获取对应路径
    const featurePaths = {
      'voting': '/voting',
      'evaluation': '/evaluation', 
      'leave': '/leave',
      'team-evaluation': '/team-evaluation',
      'admin': '/admin'
    };
    
    const path = featurePaths[featureId];
    if (path) {
      navigate(path);
    } else {
      message.warning('功能暂未开放');
    }
  };

  // 退出登录
  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login', { replace: true });
  };

  return (
    <div className="welcome-page">
      {/* 顶部导航栏 */}
      <nav className="top-nav">
        <div className="nav-content">
          <div className="nav-left">
            <div className="system-logo">
              <UserOutlined className="logo-icon" />
              <span className="system-name">童坊镇政务系统</span>
            </div>
          </div>
          <div className="nav-right">
            <div className="user-info">
              <Avatar size="small" icon={<UserOutlined />} />
              <span className="user-name">{user?.name}</span>
              <span className="user-role">({getRoleName()})</span>
            </div>
            <Button 
              type="text" 
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className="logout-btn"
            >
              退出
            </Button>
          </div>
        </div>
      </nav>

      {/* 上半部分 - 欢迎区域 */}
      <section className="hero-section">
        <div className="hero-background" />
        <div className="hero-overlay" />
        
        <div className="hero-content">
          <h1 className="hero-title">欢迎使用童坊镇政务管理系统</h1>
          <p className="hero-subtitle">高效、透明、便民的数字化政务平台</p>
          
          <div className="hero-buttons">
            <Button 
              type="primary" 
              size="large"
              onClick={scrollToFeatures}
              className="explore-btn"
            >
              探索功能 ↓
            </Button>
            
            <Button 
              size="large"
              ghost
              onClick={goToDashboard}
              className="dashboard-btn"
            >
              进入系统
            </Button>
          </div>
        </div>
        
        <div className="scroll-indicator">
          <span className="scroll-text">滚动了解更多</span>
          <div className="scroll-arrow">↓</div>
        </div>
      </section>

      {/* 下半部分 - 功能卡片区域 */}
      <section className="features-section" id="features">
        <div className="features-header">
          <h2 className="features-title">系统功能</h2>
          <p className="features-subtitle">
            根据您的权限，以下是您可以使用的功能
          </p>
        </div>
        
        <div className="features-container">
          {visibleFeatures.map(feature => (
            <FeatureCard 
              key={feature.id}
              id={feature.id}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              onClick={navigateToFeature}
              className="feature-item"
            />
          ))}
        </div>
        
        {visibleFeatures.length === 0 && (
          <div className="no-features">
            <p>暂无可用功能，请联系管理员分配权限</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default WelcomePage;
