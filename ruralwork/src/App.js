import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/Login';
import WelcomePage from './pages/Welcome';
import AdminPage from './pages/Admin';
import VotingPage from './pages/Voting';
import EvaluationPage from './pages/Evaluation';
import PagePlaceholder from './components/PagePlaceholder';
import './App.css';

// 全局配置
const antdConfig = {
  theme: {
    token: {
      colorPrimary: '#1890ff',
      borderRadius: 8,
    },
  },
};

// 受保护的路由组件
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large">
          <div style={{ padding: '20px' }}>加载中...</div>
        </Spin>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// 应用路由组件
const AppRoutes = () => {
  const { loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large">
          <div style={{ padding: '20px' }}>初始化中...</div>
        </Spin>
      </div>
    );
  }
  
  return (
    <Routes>
      {/* 默认路由重定向到登录页 */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* 登录页面 */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* 受保护的页面 */}
      <Route path="/welcome" element={
        <ProtectedRoute>
          <WelcomePage />
        </ProtectedRoute>
      } />
      
      {/* 功能页面 */}
      <Route path="/voting" element={
        <ProtectedRoute>
          <VotingPage />
        </ProtectedRoute>
      } />
      <Route path="/evaluation" element={
        <ProtectedRoute>
          <EvaluationPage />
        </ProtectedRoute>
      } />
      <Route path="/leave" element={
        <ProtectedRoute>
          <PagePlaceholder 
            title="请假申请"
            description="请假申请功能正在开发中，您可以提交和查看请假申请。"
          />
        </ProtectedRoute>
      } />
      <Route path="/team-evaluation" element={
        <ProtectedRoute>
          <PagePlaceholder 
            title="工作队评分"
            description="工作队评分功能正在开发中，站所可以对包村工作队进行评分。"
          />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminPage />
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <PagePlaceholder 
            title="系统仪表板"
            description="仪表板功能正在开发中，您可以查看系统概览和统计信息。"
          />
        </ProtectedRoute>
      } />
      
      {/* 404 页面 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ConfigProvider locale={zhCN} theme={antdConfig.theme}>
      <AuthProvider>
        <Router>
          <div className="App">
            <AppRoutes />
          </div>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;