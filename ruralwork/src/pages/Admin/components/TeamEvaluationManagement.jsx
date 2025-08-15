import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Tabs,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  updateData, 
  deleteData,
  createTeamEvaluationActivity,
  getTeamEvaluationActivities,
  getTeamEvaluations,
  getWorkTeams
} from '../../../services/databaseService';
import { TABLES } from '../../../config/supabase';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const TeamEvaluationManagement = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activities, setActivities] = useState([]);
  const [workTeams, setWorkTeams] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [statisticsData, setStatisticsData] = useState({
    totalActivities: 0,
    activeActivities: 0,
    totalEvaluations: 0,
    averageScore: 0
  });

  // 评分维度配置
  const evaluationDimensions = [
    { key: 'work_quality_score', label: '工作质量', maxScore: 20, color: '#1890ff' },
    { key: 'cooperation_score', label: '配合程度', maxScore: 20, color: '#52c41a' },
    { key: 'efficiency_score', label: '工作效率', maxScore: 20, color: '#faad14' },
    { key: 'innovation_score', label: '创新能力', maxScore: 20, color: '#722ed1' },
    { key: 'service_attitude_score', label: '服务态度', maxScore: 20, color: '#ff7875' }
  ];

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [activitiesResult, teamsResult, evaluationsResult] = await Promise.all([
        getTeamEvaluationActivities(),
        getWorkTeams(),
        getTeamEvaluations()
      ]);

      if (activitiesResult.error) {
        message.error('加载评分活动失败');
        return;
      }
      if (teamsResult.error) {
        message.error('加载工作队信息失败');
        return;
      }
      if (evaluationsResult.error) {
        message.error('加载评分记录失败');
        return;
      }

      setActivities(activitiesResult.data || []);
      setWorkTeams(teamsResult.data || []);
      setEvaluations(evaluationsResult.data || []);

      // 计算统计数据
      const stats = {
        totalActivities: activitiesResult.data?.length || 0,
        activeActivities: activitiesResult.data?.filter(a => a.status === 'active').length || 0,
        totalEvaluations: evaluationsResult.data?.length || 0,
        averageScore: evaluationsResult.data?.length > 0 
          ? (evaluationsResult.data.reduce((sum, e) => sum + (e.total_score || 0), 0) / evaluationsResult.data.length).toFixed(1)
          : 0
      };
      setStatisticsData(stats);

    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 创建/编辑活动
  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const [startTime, endTime] = values.timeRange;
      const activityData = {
        title: values.title,
        description: values.description,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'active',
        created_by: user.id
      };

      if (editingActivity) {
        const { error } = await updateData(TABLES.TEAM_EVALUATION_ACTIVITIES, editingActivity.id, activityData);
        if (error) {
          message.error('更新活动失败');
          return;
        }
        message.success('活动更新成功');
      } else {
        const { error } = await createTeamEvaluationActivity(activityData);
        if (error) {
          message.error('创建活动失败');
          return;
        }
        message.success('活动创建成功');
      }

      setModalVisible(false);
      setEditingActivity(null);
      form.resetFields();
      loadData();
    } catch (error) {
      console.error('提交失败:', error);
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 编辑活动
  const editActivity = (activity) => {
    setEditingActivity(activity);
    form.setFieldsValue({
      title: activity.title,
      description: activity.description,
      timeRange: [dayjs(activity.start_time), dayjs(activity.end_time)]
    });
    setModalVisible(true);
  };

  // 删除活动
  const deleteActivity = async (activityId) => {
    try {
      const { error } = await deleteData(TABLES.TEAM_EVALUATION_ACTIVITIES, activityId);
      if (error) {
        message.error('删除活动失败');
        return;
      }
      message.success('活动删除成功');
      loadData();
    } catch (error) {
      console.error('删除活动失败:', error);
      message.error('删除活动失败');
    }
  };

  // 完成活动
  const completeActivity = async (activityId) => {
    try {
      const { error } = await updateData(TABLES.TEAM_EVALUATION_ACTIVITIES, activityId, {
        status: 'completed',
        updated_at: new Date().toISOString()
      });
      if (error) {
        message.error('完成活动失败');
        return;
      }
      message.success('活动已完成');
      loadData();
    } catch (error) {
      console.error('完成活动失败:', error);
      message.error('完成活动失败');
    }
  };

  // 状态标签
  const statusTag = (status) => {
    const map = {
      active: { color: 'green', text: '进行中' },
      completed: { color: 'blue', text: '已完成' },
      cancelled: { color: 'red', text: '已取消' }
    };
    const cfg = map[status] || map.active;
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };

  // 获取工作队名称
  const getTeamName = (teamId) => {
    const team = workTeams.find(t => t.id === teamId);
    return team ? team.team_name : '未知工作队';
  };

  // 获取活动名称
  const getActivityName = (activityId) => {
    const activity = activities.find(a => a.id === activityId);
    return activity ? activity.title : '未知活动';
  };



  // 活动表格列
  const activityColumns = [
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: statusTag
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => editActivity(record)}
            disabled={record.status === 'completed'}
          >
            编辑
          </Button>
          {record.status === 'active' && (
            <Popconfirm
              title="确定完成这个评分活动吗？"
              onConfirm={() => completeActivity(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link">
                完成
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="确定删除这个评分活动吗？"
            description="删除后将无法恢复，相关评分记录也会被删除。"
            onConfirm={() => deleteActivity(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              icon={<DeleteOutlined />}
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 评分记录表格列
  const evaluationColumns = [
    {
      title: '评分活动',
      dataIndex: 'activity_id',
      key: 'activity_id',
      render: (activityId) => getActivityName(activityId)
    },
    {
      title: '工作队',
      dataIndex: 'team_id',
      key: 'team_id',
      render: (teamId) => getTeamName(teamId)
    },
    {
      title: '评分人',
      dataIndex: 'evaluator_department',
      key: 'evaluator_department'
    },
    {
      title: '总分',
      dataIndex: 'total_score',
      key: 'total_score',
      render: (score) => (
        <span style={{ 
          fontSize: 16, 
          fontWeight: 600,
          color: score >= 90 ? '#52c41a' : score >= 80 ? '#1890ff' : score >= 70 ? '#faad14' : '#ff4d4f'
        }}>
          {score}/100
        </span>
      ),
      sorter: (a, b) => a.total_score - b.total_score
    },
    {
      title: '各维度得分',
      key: 'dimensions',
      render: (_, record) => (
        <Space>
          {evaluationDimensions.map(dim => (
            <Tag key={dim.key} color={dim.color}>
              {dim.label}: {record[dim.key]}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
    }
  ];

  return (
    <div className="team-evaluation-management">
      {/* 统计概览 */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总活动数"
              value={statisticsData.totalActivities}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="进行中活动"
              value={statisticsData.activeActivities}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总评分数"
              value={statisticsData.totalEvaluations}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均分"
              value={statisticsData.averageScore}
              suffix="/100"
              precision={1}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要内容 */}
      <Card title="工作队评分管理" className="admin-card">
        <Tabs 
          defaultActiveKey="activities"
          items={[
            {
              key: 'activities',
              label: '评分活动管理',
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingActivity(null);
                  form.resetFields();
                  setModalVisible(true);
                }}
              >
                创建评分活动
              </Button>
                  </div>

                  <Table
              columns={activityColumns}
              dataSource={activities}
              rowKey="id"
              loading={loading}
              className="admin-table"
              scroll={{ x: 1000 }}
              pagination={{
                total: activities.length,
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
                </div>
              )
            },
            {
              key: 'evaluations',
              label: '评分记录查看',
              children: (
                <Table
              columns={evaluationColumns}
              dataSource={evaluations}
              rowKey="id"
              loading={loading}
              className="admin-table"
              scroll={{ x: 1200 }}
              pagination={{
                total: evaluations.length,
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
              )
            }
          ]}
        />
      </Card>

      {/* 创建/编辑活动模态框 */}
      <Modal
        title={editingActivity ? '编辑评分活动' : '创建评分活动'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingActivity(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label="活动名称"
            rules={[{ required: true, message: '请输入活动名称' }]}
          >
            <Input placeholder="请输入活动名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="活动描述"
            rules={[{ required: true, message: '请输入活动描述' }]}
          >
            <TextArea
              rows={3}
              placeholder="请输入活动描述"
              showCount
              maxLength={200}
            />
          </Form.Item>

          <Form.Item
            name="timeRange"
            label="活动时间"
            rules={[{ required: true, message: '请选择活动时间范围' }]}
          >
            <RangePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder={['开始时间', '结束时间']}
            />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingActivity ? '更新' : '创建'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TeamEvaluationManagement;
