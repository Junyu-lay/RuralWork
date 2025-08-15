import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Space,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  TeamOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { getAllUsers, createUser, updateUser, deleteData } from '../../../services/databaseService';
import { ROLE_NAMES } from '../../../utils/constants';
import { useAuth } from '../../../contexts/AuthContext';

const { Option } = Select;
const { Search } = Input;

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [statistics, setStatistics] = useState({
    total: 0,
    admin: 0,
    town_staff: 0,
    station_staff: 0,
    work_team: 0
  });

  useEffect(() => {
    loadUsers();
  }, []);

  // 加载用户列表
  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getAllUsers();
      if (result.error) {
        message.error('加载用户列表失败: ' + result.error);
        return;
      }

      const userList = result.data || [];
      setUsers(userList);
      
      // 计算统计数据
      const stats = {
        total: userList.length,
        admin: userList.filter(u => u.role === 'admin').length,
        town_staff: userList.filter(u => u.role === 'town_staff').length,
        station_staff: userList.filter(u => u.role === 'station_staff').length,
        work_team: userList.filter(u => u.role === 'work_team').length
      };
      setStatistics(stats);
      
    } catch (error) {
      console.error('加载用户列表错误:', error);
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开添加/编辑用户弹窗
  const openUserModal = (user = null) => {
    setEditingUser(user);
    setModalVisible(true);
    
    if (user) {
      form.setFieldsValue({
        phone: user.phone,
        name: user.name,
        role: user.role,
        department: user.department,
        position: user.position
      });
    } else {
      form.resetFields();
    }
  };

  // 关闭弹窗
  const closeModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  // 保存用户
  const saveUser = async (values) => {
    try {
      if (editingUser) {
        // 编辑用户
        const result = await updateUser(editingUser.id, values);
        if (result.error) {
          message.error('更新用户失败: ' + result.error);
          return;
        }
        message.success('用户信息更新成功');
      } else {
        // 添加新用户
        const userData = {
          ...values,
          password_hash: values.password || '123456', // 默认密码
          created_by: currentUser.id,
          is_active: true
        };
        
        const result = await createUser(userData);
        if (result.error) {
          message.error('创建用户失败: ' + result.error);
          return;
        }
        message.success('用户创建成功，默认密码：123456');
      }
      
      closeModal();
      loadUsers();
    } catch (error) {
      console.error('保存用户错误:', error);
      message.error('保存用户失败');
    }
  };

  // 删除用户
  const deleteUser = async (userId) => {
    try {
      const result = await deleteData('users', userId);
      if (result.error) {
        message.error('删除用户失败: ' + result.error);
        return;
      }
      message.success('用户删除成功');
      loadUsers();
    } catch (error) {
      console.error('删除用户错误:', error);
      message.error('删除用户失败');
    }
  };

  // 重置用户密码
  const resetPassword = async (userId) => {
    try {
      const result = await updateUser(userId, { password_hash: '123456' });
      if (result.error) {
        message.error('重置密码失败: ' + result.error);
        return;
      }
      message.success('密码重置成功，新密码：123456');
    } catch (error) {
      console.error('重置密码错误:', error);
      message.error('重置密码失败');
    }
  };

  // 过滤用户数据
  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    user.phone?.includes(searchText) ||
    user.department?.toLowerCase().includes(searchText.toLowerCase())
  );

  // 表格列定义
  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text, record) => (
        <Space>
          <UserOutlined />
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (text) => (
        <Space>
          <PhoneOutlined />
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role) => {
        const colors = {
          admin: 'red',
          town_staff: 'blue',
          station_staff: 'green',
          work_team: 'orange'
        };
        return (
          <Tag color={colors[role]} className="status-tag">
            {ROLE_NAMES[role]}
          </Tag>
        );
      }
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 140
    },
    {
      title: '职位',
      dataIndex: 'position',
      key: 'position',
      width: 120
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'} className="status-tag">
          {isActive ? '正常' : '停用'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (text) => new Date(text).toLocaleDateString()
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space className="action-buttons">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openUserModal(record)}
          >
            编辑
          </Button>
          
          <Button
            size="small"
            onClick={() => resetPassword(record.id)}
          >
            重置密码
          </Button>
          
          {record.id !== currentUser.id && (
            <Popconfirm
              title="确定要删除这个用户吗？"
              onConfirm={() => deleteUser(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="primary"
                danger
                size="small"
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="user-management">
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="总用户"
              value={statistics.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: '20px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="管理员"
              value={statistics.admin}
              valueStyle={{ color: '#ff4d4f', fontSize: '20px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="镇干部"
              value={statistics.town_staff}
              valueStyle={{ color: '#52c41a', fontSize: '20px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="站所人员"
              value={statistics.station_staff}
              valueStyle={{ color: '#722ed1', fontSize: '20px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="工作队"
              value={statistics.work_team}
              valueStyle={{ color: '#faad14', fontSize: '20px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 用户列表 */}
      <Card title="用户列表" className="admin-card">
        <div className="table-toolbar">
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openUserModal()}
                size="large"
              >
                添加用户
              </Button>
            </Col>
            <Col>
              <Search
                placeholder="搜索用户姓名、手机号或部门"
                allowClear
                style={{ width: 280 }}
                onSearch={setSearchText}
                onChange={(e) => setSearchText(e.target.value)}
                enterButton={<SearchOutlined />}
              />
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            total: filteredUsers.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `显示 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
          }}
          className="admin-table"
        />
      </Card>

      {/* 添加/编辑用户弹窗 */}
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onCancel={closeModal}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveUser}
          autoComplete="off"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="手机号"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
                ]}
              >
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="角色"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="请选择角色">
                  {Object.entries(ROLE_NAMES).map(([key, value]) => (
                    <Option key={key} value={key}>
                      {value}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="department"
                label="部门"
                rules={[{ required: true, message: '请输入部门' }]}
              >
                <Input placeholder="请输入部门" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="position"
                label="职位"
                rules={[{ required: true, message: '请输入职位' }]}
              >
                <Input placeholder="请输入职位" />
              </Form.Item>
            </Col>
            {!editingUser && (
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="初始密码"
                  extra="留空则使用默认密码：123456"
                >
                  <Input.Password placeholder="留空使用默认密码" />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={closeModal}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
