import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  message,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Popconfirm
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  CalendarOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import { getData, updateData } from '../../../services/databaseService';
import { useAuth } from '../../../contexts/AuthContext';
import { TABLES } from '../../../config/supabase';
import dayjs from 'dayjs';

const LeaveManagement = () => {
  const { user: currentUser } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingRequest, setViewingRequest] = useState(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalDays: 0
  });

  // 加载请假申请数据
  const loadLeaveRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await getData(TABLES.LEAVE_REQUESTS);
      if (error) {
        message.error('加载请假数据失败');
        return;
      }
      setLeaveRequests(data || []);
      
      // 计算统计数据
      const stats = {
        total: data?.length || 0,
        pending: data?.filter(r => r.status === 'pending').length || 0,
        approved: data?.filter(r => r.status === 'approved').length || 0,
        rejected: data?.filter(r => r.status === 'rejected').length || 0,
        totalDays: data?.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.days_count || 0), 0) || 0
      };
      setStatistics(stats);
    } catch (error) {
      console.error('加载请假数据失败:', error);
      message.error('加载请假数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载用户数据
  const loadUsers = useCallback(async () => {
    try {
      const { data, error } = await getData(TABLES.USERS);
      if (error) {
        message.error('加载用户数据失败');
        return;
      }
      setAllUsers(data || []);
    } catch (error) {
      console.error('加载用户数据失败:', error);
    }
  }, []);

  useEffect(() => {
    loadLeaveRequests();
    loadUsers();
  }, [loadLeaveRequests, loadUsers]);

  // 审批请假申请
  const approveLeave = async (requestId, approved, comment = '') => {
    try {
      const request = leaveRequests.find(r => r.id === requestId);
      if (!request) return;

      const updatePayload = {
        status: approved ? 'approved' : 'rejected',
        approver_id: currentUser.id,
        approver_comment: comment,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 如果是私假且批准了，需要扣分
      if (approved && request.leave_type === 'personal') {
        // 获取用户当前分数
        const user = allUsers.find(u => u.id === request.user_id);
        const currentScore = user?.total_score || 100;
        const deduction = request.days_count || 1; // 每天扣1分
        const newScore = Math.max(0, currentScore - deduction);

        // 更新用户分数
        await updateData(TABLES.USERS, request.user_id, {
          total_score: newScore,
          updated_at: new Date().toISOString()
        });

        updatePayload.score_deduction = deduction;
        message.success(`请假已批准，扣除${deduction}分，当前得分：${newScore}分`);
      } else {
        message.success(approved ? '请假已批准' : '请假已驳回');
      }

      const result = await updateData(TABLES.LEAVE_REQUESTS, requestId, updatePayload);
      if (result.error) {
        message.error('审批失败');
        return;
      }

      loadLeaveRequests();
      loadUsers(); // 重新加载用户数据以更新分数
    } catch (error) {
      console.error('审批失败:', error);
      message.error('审批失败');
    }
  };

  // 查看请假详情
  const viewRequest = (request) => {
    setViewingRequest(request);
    setViewModalVisible(true);
  };

  // 状态标签
  const statusTag = (status) => {
    const map = {
      pending: { color: 'gold', text: '待审批' },
      approved: { color: 'green', text: '已批准' },
      rejected: { color: 'red', text: '已驳回' }
    };
    const cfg = map[status] || map.pending;
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };

  // 请假类型标签
  const leaveTypeTag = (type) => {
    const map = {
      personal: { color: 'orange', text: '私假' },
      sick: { color: 'blue', text: '病假' },
      annual: { color: 'green', text: '年假' },
      other: { color: 'default', text: '其他' }
    };
    const cfg = map[type] || map.other;
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };

  // 获取用户信息
  const getUserInfo = (userId) => {
    return allUsers.find(u => u.id === userId) || {};
  };

  const columns = [
    {
      title: '申请人',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 120,
      render: (userId) => {
        const user = getUserInfo(userId);
        return (
          <div>
            <div>{user.name || '未知'}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{user.department}</div>
          </div>
        );
      }
    },
    {
      title: '请假类型',
      dataIndex: 'leave_type',
      key: 'leave_type',
      width: 100,
      render: leaveTypeTag
    },
    {
      title: '开始时间',
      dataIndex: 'start_date',
      key: 'start_date',
      width: 160,
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '结束时间',
      dataIndex: 'end_date',
      key: 'end_date',
      width: 160,
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '天数',
      dataIndex: 'days_count',
      key: 'days_count',
      width: 80,
      render: (days, record) => (
        <span>
          {days}天
          {record.leave_type === 'personal' && record.status === 'approved' && (
            <div style={{ fontSize: 12, color: '#ff4d4f' }}>
              <MinusCircleOutlined /> 扣{days}分
            </div>
          )}
        </span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: statusTag
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => viewRequest(record)}
          >
            查看
          </Button>
          {record.status === 'pending' && (
            <>
              <Popconfirm
                title="确定批准这个请假申请吗？"
                description={record.leave_type === 'personal' ? `私假将扣除${record.days_count}分` : ''}
                onConfirm={() => approveLeave(record.id, true)}
                okText="批准"
                cancelText="取消"
              >
                <Button
                  type="link"
                  icon={<CheckOutlined />}
                  style={{ color: '#52c41a' }}
                >
                  批准
                </Button>
              </Popconfirm>
              <Popconfirm
                title="确定驳回这个请假申请吗？"
                onConfirm={() => approveLeave(record.id, false)}
                okText="驳回"
                cancelText="取消"
              >
                <Button
                  type="link"
                  icon={<CloseOutlined />}
                  danger
                >
                  驳回
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="leave-management">
      {/* 统计概览 */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总申请数"
              value={statistics.total}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审批"
              value={statistics.pending}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已批准"
              value={statistics.approved}
              prefix={<CheckOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已批准总天数"
              value={statistics.totalDays}
              suffix="天"
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 请假申请列表 */}
      <Card title="请假申请管理" className="admin-card">
        <Table
          columns={columns}
          dataSource={leaveRequests}
          rowKey="id"
          loading={loading}
          className="admin-table"
          scroll={{ x: 1000 }}
          pagination={{
            total: leaveRequests.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>

      {/* 查看详情弹窗 */}
      <Modal
        title="请假申请详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {viewingRequest && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <strong>申请人：</strong>{getUserInfo(viewingRequest.user_id).name}
              </Col>
              <Col span={12}>
                <strong>部门：</strong>{getUserInfo(viewingRequest.user_id).department}
              </Col>
              <Col span={12}>
                <strong>请假类型：</strong>{leaveTypeTag(viewingRequest.leave_type)}
              </Col>
              <Col span={12}>
                <strong>请假天数：</strong>{viewingRequest.days_count}天
              </Col>
              <Col span={12}>
                <strong>开始时间：</strong>{dayjs(viewingRequest.start_date).format('YYYY-MM-DD HH:mm')}
              </Col>
              <Col span={12}>
                <strong>结束时间：</strong>{dayjs(viewingRequest.end_date).format('YYYY-MM-DD HH:mm')}
              </Col>
              <Col span={24} style={{ marginTop: 16 }}>
                <strong>请假事由：</strong>
                <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
                  {viewingRequest.reason || '无'}
                </div>
              </Col>
              <Col span={24} style={{ marginTop: 16 }}>
                <strong>状态：</strong>{statusTag(viewingRequest.status)}
              </Col>
              {viewingRequest.approver_comment && (
                <Col span={24} style={{ marginTop: 16 }}>
                  <strong>审批意见：</strong>
                  <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
                    {viewingRequest.approver_comment}
                  </div>
                </Col>
              )}
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LeaveManagement;
