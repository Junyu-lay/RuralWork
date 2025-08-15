import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Menu, 
  Card, 
  Statistic, 
  Row, 
  Col, 
  Button,
  message,
  Spin
} from 'antd';
import {
  UserOutlined,
  BarChartOutlined,
  FileTextOutlined,
  SettingOutlined,
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { getAllUsers, getData } from '../../services/databaseService';
import UserManagement from './components/UserManagement';
import VoteManagement from './components/VoteManagement';
import EvaluationManagement from './components/EvaluationManagement';
import LeaveManagement from './components/LeaveManagement';
import TeamEvaluationManagement from './components/TeamEvaluationManagement';
import DataStatistics from './components/DataStatistics';
import SystemLogs from './components/SystemLogs';
import './styles.css';

const { Header, Sider, Content } = Layout;

const AdminPage = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    activeVotes: 0,
    pendingLeaves: 0,
    completedEvaluations: 0
  });

  // 检查管理员权限
  useEffect(() => {
    if (!hasPermission('admin')) {
      message.error('您没有访问管理员页面的权限');
      return;
    }
    loadStatistics();
  }, [hasPermission]);

  // 加载统计数据
  const loadStatistics = async () => {
    setLoading(true);
    try {
      const [usersResult, votesResult, leavesResult, evaluationsResult] = await Promise.all([
        getAllUsers(),
        getData('votes', { filters: { status: 'active' } }),
        getData('leave_requests', { filters: { status: 'pending' } }),
        getData('evaluations', { filters: { is_completed: true } })
      ]);

      setStatistics({
        totalUsers: usersResult.data?.length || 0,
        activeVotes: votesResult.data?.length || 0,
        pendingLeaves: leavesResult.data?.length || 0,
        completedEvaluations: evaluationsResult.data?.length || 0
      });
    } catch (error) {
      console.error('加载统计数据错误:', error);
      message.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 菜单项配置
  const menuItems = [
    {
      key: 'overview',
      icon: <BarChartOutlined />,
      label: '系统概览'
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: '用户管理'
    },
    {
      key: 'votes',
      icon: <TeamOutlined />,
      label: '投票管理'
    },
    {
      key: 'evaluations',
      icon: <TrophyOutlined />,
      label: '年度互评'
    },
    {
      key: 'leaves',
      icon: <CalendarOutlined />,
      label: '请假管理'
    },
    {
      key: 'team-evaluation',
      icon: <TeamOutlined />,
      label: '工作队评分'
    },
    {
      key: 'statistics',
      icon: <BarChartOutlined />,
      label: '数据统计'
    },
    {
      key: 'logs',
      icon: <FileTextOutlined />,
      label: '系统日志'
    }
  ];

  // 渲染概览页面
  const renderOverview = () => (
    <div className="admin-overview">
      <Row gutter={[24, 24]} className="stats-row">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={statistics.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="进行中投票"
              value={statistics.activeVotes}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待审批请假"
              value={statistics.pendingLeaves}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已完成评价"
              value={statistics.completedEvaluations}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} className="quick-actions">
        <Col span={24}>
          <Card title="快速操作" className="quick-actions-card">
            <div className="quick-action-buttons">
              <Button 
                type="primary" 
                icon={<UserOutlined />}
                size="large"
                onClick={() => setActiveTab('users')}
              >
                添加新用户
              </Button>
              
              <Button 
                type="primary" 
                icon={<TeamOutlined />}
                size="large"
                onClick={() => setActiveTab('votes')}
              >
                创建投票
              </Button>
              
              <Button 
                icon={<TrophyOutlined />}
                size="large"
                onClick={() => setActiveTab('evaluations')}
              >
                年度互评
              </Button>
              
              <Button 
                type="primary" 
                icon={<DownloadOutlined />}
                size="large"
                onClick={() => setActiveTab('statistics')}
              >
                导出报表
              </Button>
              
              <Button 
                icon={<SettingOutlined />}
                size="large"
                onClick={loadStatistics}
              >
                刷新数据
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );

  // 渲染内容区域
  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <Spin size="large">
            <div style={{ paddingTop: 16, color: '#666' }}>加载中...</div>
          </Spin>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'users':
        return <UserManagement />;
      case 'votes':
        return <VoteManagement />;
      case 'evaluations':
        return <EvaluationManagement />;
      case 'leaves':
        return <LeaveManagement />;
      case 'team-evaluation':
        return <TeamEvaluationManagement />;
      case 'statistics':
        return <DataStatistics />;
      case 'logs':
        return <SystemLogs />;
      default:
        return renderOverview();
    }
  };

  if (!hasPermission('admin')) {
    return (
      <div className="no-permission">
        <Card>
          <div className="no-permission-content">
            <UserOutlined className="no-permission-icon" />
            <h3>访问受限</h3>
            <p>您没有访问管理员页面的权限</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Layout className="admin-layout">
      <Header className="admin-header">
        <div className="admin-header-content">
          <h2>系统管理</h2>
          <div className="admin-user-info">
            <span>管理员：{user?.name}</span>
          </div>
        </div>
      </Header>
      
      <Layout>
        <Sider 
          width={240} 
          className="admin-sider"
          breakpoint="lg"
          collapsedWidth="0"
        >
          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            items={menuItems}
            onClick={({ key }) => setActiveTab(key)}
            className="admin-menu"
          />
        </Sider>
        
        <Layout className="admin-content-layout">
          <Content className="admin-content">
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default AdminPage;
