import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Input,
  Select,
  DatePicker,
  Button,
  Tag,
  Space,
  Row,
  Col,
  message,
  Tooltip
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ClearOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { getData } from '../../../services/databaseService';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    user_id: '',
    dateRange: [dayjs().subtract(7, 'day'), dayjs()]
  });
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
    loadLogs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadLogs();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // 加载用户列表（用于筛选）
  const loadUsers = async () => {
    try {
      const result = await getData('users', {
        select: 'id, name, phone'
      });
      
      if (result.error) {
        console.error('加载用户列表失败:', result.error);
        return;
      }
      
      setUsers(result.data || []);
    } catch (error) {
      console.error('加载用户列表错误:', error);
    }
  };

  // 加载系统日志
  const loadLogs = async () => {
    setLoading(true);
    try {
      const options = {
        select: `
          *,
          user:user_id(name, phone)
        `,
        orderBy: { column: 'created_at', ascending: false }
      };

      // 添加日期过滤
      if (filters.dateRange && filters.dateRange.length === 2) {
        // 注意：这里需要根据实际的 Supabase 查询语法调整
        // 由于我们使用的是简化的 getData 函数，可能需要在服务中扩展日期范围查询
      }

      const result = await getData('system_logs', options);
      
      if (result.error) {
        message.error('加载日志失败: ' + result.error);
        return;
      }

      let logData = result.data || [];

      // 前端过滤（在实际项目中应该在后端处理）
      if (filters.action) {
        logData = logData.filter(log => log.action === filters.action);
      }
      
      if (filters.resource) {
        logData = logData.filter(log => log.resource === filters.resource);
      }
      
      if (filters.user_id) {
        logData = logData.filter(log => log.user_id === filters.user_id);
      }

      if (filters.dateRange && filters.dateRange.length === 2) {
        const [startDate, endDate] = filters.dateRange;
        logData = logData.filter(log => {
          const logDate = dayjs(log.created_at);
          return logDate.isAfter(startDate.startOf('day')) && 
                 logDate.isBefore(endDate.endOf('day'));
        });
      }

      // 搜索过滤
      if (searchText) {
        logData = logData.filter(log =>
          log.action?.toLowerCase().includes(searchText.toLowerCase()) ||
          log.resource?.toLowerCase().includes(searchText.toLowerCase()) ||
          log.user?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
          log.user?.phone?.includes(searchText)
        );
      }

      setLogs(logData);
    } catch (error) {
      console.error('加载日志错误:', error);
      message.error('加载日志失败');
    } finally {
      setLoading(false);
    }
  };

  // 清空筛选条件
  const clearFilters = () => {
    setFilters({
      action: '',
      resource: '',
      user_id: '',
      dateRange: [dayjs().subtract(7, 'day'), dayjs()]
    });
    setSearchText('');
  };

  // 获取操作类型的颜色
  const getActionColor = (action) => {
    const colors = {
      login: 'green',
      logout: 'orange',
      create: 'blue',
      update: 'purple',
      delete: 'red',
      view: 'cyan',
      export: 'magenta',
      import: 'lime'
    };
    return colors[action] || 'default';
  };

  // 获取资源类型的颜色
  const getResourceColor = (resource) => {
    const colors = {
      users: 'blue',
      votes: 'green',
      evaluations: 'purple',
      leave_requests: 'orange',
      system: 'red'
    };
    return colors[resource] || 'default';
  };

  // 操作类型选项
  const actionOptions = [
    { value: 'login', label: '登录' },
    { value: 'logout', label: '登出' },
    { value: 'create', label: '创建' },
    { value: 'update', label: '更新' },
    { value: 'delete', label: '删除' },
    { value: 'view', label: '查看' },
    { value: 'export', label: '导出' },
    { value: 'import', label: '导入' }
  ];

  // 资源类型选项
  const resourceOptions = [
    { value: 'users', label: '用户管理' },
    { value: 'votes', label: '投票管理' },
    { value: 'evaluations', label: '评价管理' },
    { value: 'leave_requests', label: '请假管理' },
    { value: 'system', label: '系统设置' },
    { value: 'auth', label: '认证相关' }
  ];

  // 表格列定义
  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (text) => (
        <div>
          <div>{dayjs(text).format('YYYY-MM-DD')}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {dayjs(text).format('HH:mm:ss')}
          </div>
        </div>
      ),
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      defaultSortOrder: 'descend'
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      render: (user, record) => (
        <Space direction="vertical" size={0}>
          <span>{user?.name || '系统'}</span>
          {user?.phone && (
            <span style={{ fontSize: '12px', color: '#999' }}>
              {user.phone}
            </span>
          )}
        </Space>
      )
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action) => (
        <Tag color={getActionColor(action)}>
          {actionOptions.find(opt => opt.value === action)?.label || action}
        </Tag>
      )
    },
    {
      title: '资源',
      dataIndex: 'resource',
      key: 'resource',
      width: 120,
      render: (resource) => (
        <Tag color={getResourceColor(resource)}>
          {resourceOptions.find(opt => opt.value === resource)?.label || resource}
        </Tag>
      )
    },
    {
      title: '详情',
      dataIndex: 'metadata',
      key: 'metadata',
      ellipsis: true,
      render: (metadata) => {
        if (!metadata) return '-';
        
        const metadataStr = typeof metadata === 'object' 
          ? JSON.stringify(metadata) 
          : metadata;
          
        return (
          <Tooltip title={metadataStr} placement="topLeft">
            <span style={{ cursor: 'pointer' }}>
              {metadataStr.length > 50 
                ? metadataStr.substring(0, 50) + '...' 
                : metadataStr}
            </span>
          </Tooltip>
        );
      }
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
      render: (ip) => ip || '-'
    }
  ];

  return (
    <div className="system-logs">
      <Card title="系统日志" className="admin-card">
        {/* 筛选工具栏 */}
        <div className="logs-toolbar" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="操作类型"
                value={filters.action}
                onChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
                style={{ width: '100%' }}
                allowClear
              >
                {actionOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="资源类型"
                value={filters.resource}
                onChange={(value) => setFilters(prev => ({ ...prev, resource: value }))}
                style={{ width: '100%' }}
                allowClear
              >
                {resourceOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="操作用户"
                value={filters.user_id}
                onChange={(value) => setFilters(prev => ({ ...prev, user_id: value }))}
                style={{ width: '100%' }}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {users.map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.name} ({user.phone})
                  </Option>
                ))}
              </Select>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <RangePicker
                value={filters.dateRange}
                onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
                format="YYYY-MM-DD"
                style={{ width: '100%' }}
              />
            </Col>
          </Row>
          
          <Row style={{ marginTop: 16 }} justify="space-between">
            <Col>
              <Space>
                <Search
                  placeholder="搜索日志内容"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onSearch={loadLogs}
                  style={{ width: 250 }}
                  enterButton={<SearchOutlined />}
                />
                <Button
                  icon={<ClearOutlined />}
                  onClick={clearFilters}
                >
                  清空筛选
                </Button>
              </Space>
            </Col>
            
            <Col>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={loadLogs}
                loading={loading}
              >
                刷新日志
              </Button>
            </Col>
          </Row>
        </div>

        {/* 日志统计信息 */}
        <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
          <Row gutter={16}>
            <Col>
              <Space>
                <InfoCircleOutlined style={{ color: '#1890ff' }} />
                <span>共找到 <strong>{logs.length}</strong> 条日志记录</span>
              </Space>
            </Col>
            {filters.dateRange && (
              <Col>
                <span>
                  时间范围：{filters.dateRange[0].format('YYYY-MM-DD')} 至 {filters.dateRange[1].format('YYYY-MM-DD')}
                </span>
              </Col>
            )}
          </Row>
        </div>

        {/* 日志表格 */}
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            total: logs.length,
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `显示 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          className="admin-table"
          size="small"
        />
      </Card>
    </div>
  );
};

export default SystemLogs;
