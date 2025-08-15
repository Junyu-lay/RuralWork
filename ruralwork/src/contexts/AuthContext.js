import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser } from '../services/databaseService';

// 创建认证上下文
const AuthContext = createContext();

// 自定义 Hook 用于使用认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
};

// 认证状态提供者组件
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 从 localStorage 恢复用户状态
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem('ruralwork_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('恢复用户状态错误:', error);
        localStorage.removeItem('ruralwork_user');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 登录函数
  const login = async (phone, password) => {
    try {
      setLoading(true);
      
      const result = await loginUser(phone, password);
      
      if (result.error) {
        return { success: false, message: result.error };
      }

      const userData = result.data;
      
      // 设置用户状态
      setUser(userData);
      setIsAuthenticated(true);
      
      // 保存到 localStorage
      localStorage.setItem('ruralwork_user', JSON.stringify(userData));
      
      return { success: true, user: userData };
      
    } catch (error) {
      console.error('登录错误:', error);
      return { success: false, message: '登录失败，请稍后重试' };
    } finally {
      setLoading(false);
    }
  };

  // 登出函数
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('ruralwork_user');
  };

  // 更新用户信息
  const updateUserInfo = (newUserInfo) => {
    const updatedUser = { ...user, ...newUserInfo };
    setUser(updatedUser);
    localStorage.setItem('ruralwork_user', JSON.stringify(updatedUser));
  };

  // 检查用户权限
  const hasPermission = (requiredRole) => {
    if (!user) return false;
    
    // 管理员有所有权限
    if (user.role === 'admin') return true;
    
    // 检查特定角色权限
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    
    return user.role === requiredRole;
  };

  // 检查是否可以访问特定功能
  const canAccess = (feature) => {
    const featurePermissions = {
      voting: ['admin', 'town_staff', 'station_staff', 'work_team'],
      evaluation: ['admin', 'town_staff', 'station_staff', 'work_team'],
      leave: ['admin', 'town_staff', 'station_staff', 'work_team'],
      'team-evaluation': ['admin', 'station_staff'],
      admin: ['admin']
    };

    const allowedRoles = featurePermissions[feature];
    return allowedRoles ? hasPermission(allowedRoles) : false;
  };

  // 获取用户角色显示名称
  const getRoleName = () => {
    const roleNames = {
      admin: '系统管理员',
      town_staff: '镇干部',
      station_staff: '站所工作人员',
      work_team: '包村工作队'
    };
    return roleNames[user?.role] || '未知角色';
  };

  const value = {
    // 状态
    user,
    loading,
    isAuthenticated,
    
    // 方法
    login,
    logout,
    updateUserInfo,
    hasPermission,
    canAccess,
    getRoleName
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
