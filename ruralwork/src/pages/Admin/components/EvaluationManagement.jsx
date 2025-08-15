import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Tag,
  Space,
  Row,
  Col,
  DatePicker,
  Select,
  Statistic,
  List,
  Avatar,
  Badge
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  BarChartOutlined,
  UserOutlined,
  TrophyOutlined,
  FileExcelOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { getData } from '../../../services/databaseService';
import { useAuth } from '../../../contexts/AuthContext';
import { TABLES } from '../../../config/supabase';
import { exportEvaluationToExcel } from '../../../utils/exportUtils';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const EvaluationManagement = () => {
  const { user: currentUser } = useAuth();
  const [evaluations, setEvaluations] = useState([]);
  const [evaluationRecords, setEvaluationRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [resultsModalVisible, setResultsModalVisible] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState(null);
  const [viewingResults, setViewingResults] = useState(null);
  const [form] = Form.useForm();

  // 加载互评活动
  const loadEvaluations = useCallback(async () => {
    try {
      // 模拟互评活动数据（实际应从数据库加载）
      const currentYear = dayjs().year();
      const mockEvaluations = [
        {
          id: `eval_${currentYear}`,
          title: `${currentYear}年度干部互评`,
          description: '全镇干部年度互评，德能勤技廉五个维度评分',
          evaluation_year: currentYear.toString(),
          evaluation_period: '年度评价',
          start_time: `${currentYear}-01-01`,
          end_time: `${currentYear}-12-31`,
          status: 'active',
          is_active: true,
          created_by: currentUser.id,
          created_at: `${currentYear}-01-01T00:00:00.000Z`
        }
      ];
      setEvaluations(mockEvaluations);
    } catch (error) {
      console.error('加载互评活动失败:', error);
    }
  }, [currentUser.id]);

  // 加载互评记录
  const loadEvaluationRecords = useCallback(async () => {
    try {
      const { data, error } = await getData(TABLES.EVALUATIONS);
      if (error) {
        console.error('加载互评记录失败:', error);
        return;
      }
      setEvaluationRecords(data || []);
    } catch (error) {
      console.error('加载互评记录失败:', error);
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

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadEvaluations(),
        loadEvaluationRecords(),
        loadUsers()
      ]);
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [loadEvaluations, loadEvaluationRecords, loadUsers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 打开创建/编辑弹窗
  const openModal = (evaluation = null) => {
    setEditingEvaluation(evaluation);
    if (evaluation) {
      form.setFieldsValue({
        ...evaluation,
        time_range: evaluation.start_time && evaluation.end_time ? 
          [dayjs(evaluation.start_time), dayjs(evaluation.end_time)] : null
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 保存互评活动
  const saveEvaluation = async (values) => {
    setLoading(true);
    try {
      // 这里应该保存到数据库，暂时模拟
      console.log('保存互评活动:', values);
      message.success(editingEvaluation ? '互评活动更新成功' : '互评活动创建成功');
      setModalVisible(false);
      loadEvaluations();
    } catch (error) {
      console.error('保存互评活动失败:', error);
      message.error('保存互评活动失败');
    } finally {
      setLoading(false);
    }
  };

  // 查看互评结果
  const viewResults = async (evaluation) => {
    setViewingResults(evaluation);
    setResultsModalVisible(true);
  };

  // 获取用户互评统计
  const getUserEvaluationStats = (userId) => {
    const userEvaluations = evaluationRecords.filter(record => record.evaluatee_id === userId);
    if (userEvaluations.length === 0) {
      return { count: 0, avgScore: 0, dimensions: {} };
    }

    const totalCount = userEvaluations.length;
    const dimensions = {
      score_de: 0,
      score_neng: 0,
      score_qin: 0,
      score_ji: 0,
      score_lian: 0
    };

    userEvaluations.forEach(record => {
      dimensions.score_de += record.score_de || 0;
      dimensions.score_neng += record.score_neng || 0;
      dimensions.score_qin += record.score_qin || 0;
      dimensions.score_ji += record.score_ji || 0;
      dimensions.score_lian += record.score_lian || 0;
    });

    Object.keys(dimensions).forEach(key => {
      dimensions[key] = (dimensions[key] / totalCount).toFixed(1);
    });

    const avgScore = ((parseFloat(dimensions.score_de) + 
                      parseFloat(dimensions.score_neng) + 
                      parseFloat(dimensions.score_qin) + 
                      parseFloat(dimensions.score_ji) + 
                      parseFloat(dimensions.score_lian))).toFixed(1);

    return { count: totalCount, avgScore, dimensions };
  };

  // 获取互评进度统计
  const getEvaluationProgress = () => {
    const totalUsers = allUsers.length;
    const totalPairs = totalUsers * (totalUsers - 1); // 每人评价其他所有人
    const completedEvaluations = evaluationRecords.filter(record => record.is_completed).length;
    
    return {
      totalUsers,
      totalPairs,
      completedEvaluations,
      completionRate: totalPairs > 0 ? ((completedEvaluations / totalPairs) * 100).toFixed(1) : 0
    };
  };

  // 导出互评结果
  const exportResults = async () => {
    try {
      const result = exportEvaluationToExcel(evaluationRecords, allUsers, dayjs().year());
      if (result.success) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    }
  };



  // 状态标签渲染
  const renderStatusTag = (status) => {
    const statusConfig = {
      draft: { color: 'default', text: '草稿' },
      active: { color: 'green', text: '进行中' },
      completed: { color: 'blue', text: '已完成' },
      closed: { color: 'red', text: '已关闭' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const progress = getEvaluationProgress();

  // 表格列定义
  const columns = [
    {
      title: '活动标题',
      dataIndex: 'title',
      key: 'title',
      width: 200
    },
    {
      title: '评价年度',
      dataIndex: 'evaluation_year',
      key: 'evaluation_year',
      width: 100
    },
    {
      title: '评价期间',
      dataIndex: 'evaluation_period',
      key: 'evaluation_period',
      width: 120
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: renderStatusTag
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 150,
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD') : '-'
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      width: 150,
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={() => viewResults(record)}
          >
            查看结果
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => openModal(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            icon={<FileExcelOutlined />}
            onClick={exportResults}
            disabled={evaluationRecords.length === 0}
          >
            导出
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="evaluation-management">
      {/* 统计概览 */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="参与人数"
              value={progress.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成评价"
              value={progress.completedEvaluations}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总评价对数"
              value={progress.totalPairs}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="完成率"
              value={progress.completionRate}
              suffix="%"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 导出操作 */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, marginBottom: 8 }}>数据导出</h4>
                <p style={{ margin: 0, color: '#8c8c8c' }}>
                  导出包含个人得分汇总、详细评分记录、统计分析和部门排名的完整Excel报告
                </p>
              </div>
              <Button 
                type="primary" 
                icon={<FileExcelOutlined />}
                size="large"
                onClick={exportResults}
                disabled={evaluationRecords.length === 0}
              >
                导出互评结果
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 互评活动管理 */}
      <Card 
        title="互评活动管理" 
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => openModal()}
          >
            创建互评活动
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={evaluations}
          rowKey="id"
          loading={loading}
          pagination={{
            total: evaluations.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>

      {/* 创建/编辑互评活动弹窗 */}
      <Modal
        title={editingEvaluation ? '编辑互评活动' : '创建互评活动'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveEvaluation}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="活动标题"
                name="title"
                rules={[{ required: true, message: '请输入活动标题' }]}
              >
                <Input placeholder="请输入互评活动标题" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="活动描述"
                name="description"
              >
                <TextArea 
                  rows={3} 
                  placeholder="请输入活动描述"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="评价年度"
                name="evaluation_year"
                rules={[{ required: true, message: '请选择评价年度' }]}
              >
                <Select placeholder="请选择年度">
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = dayjs().year() - 2 + i;
                    return (
                      <Option key={year} value={year.toString()}>
                        {year}年
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="评价期间"
                name="evaluation_period"
                rules={[{ required: true, message: '请输入评价期间' }]}
              >
                <Select placeholder="请选择期间">
                  <Option value="年度评价">年度评价</Option>
                  <Option value="半年度评价">半年度评价</Option>
                  <Option value="季度评价">季度评价</Option>
                  <Option value="专项评价">专项评价</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="活动状态"
                name="status"
                rules={[{ required: true, message: '请选择活动状态' }]}
              >
                <Select placeholder="请选择状态">
                  <Option value="draft">草稿</Option>
                  <Option value="active">进行中</Option>
                  <Option value="completed">已完成</Option>
                  <Option value="closed">已关闭</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="活动时间"
                name="time_range"
              >
                <DatePicker.RangePicker 
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingEvaluation ? '更新活动' : '创建活动'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看互评结果弹窗 */}
      <Modal
        title="互评结果统计"
        open={resultsModalVisible}
        onCancel={() => setResultsModalVisible(false)}
        footer={[
          <Button 
            key="export" 
            icon={<FileExcelOutlined />} 
            onClick={exportResults}
            disabled={evaluationRecords.length === 0}
          >
            导出结果
          </Button>,
          <Button key="close" type="primary" onClick={() => setResultsModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {viewingResults && (
          <div className="evaluation-results">
            <Row gutter={24} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="参与人数"
                    value={allUsers.length}
                    prefix={<UserOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="完成评价"
                    value={evaluationRecords.filter(r => r.is_completed).length}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="完成率"
                    value={progress.completionRate}
                    suffix="%"
                    prefix={<BarChartOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            <Card title="个人评价结果" size="small">
              <List
                dataSource={allUsers}
                renderItem={(user) => {
                  const stats = getUserEvaluationStats(user.id);
                  return (
                    <List.Item key={user.id}>
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} />}
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span>{user.name}</span>
                            <Badge 
                              count={stats.count} 
                              style={{ backgroundColor: '#52c41a' }}
                              title="收到评价数"
                            />
                          </div>
                        }
                        description={
                          <div>
                            <div style={{ marginBottom: 4 }}>
                              {user.department} - {user.position}
                            </div>
                            <Space size="small">
                              <Tag color="red">德: {stats.dimensions.score_de || 0}</Tag>
                              <Tag color="blue">能: {stats.dimensions.score_neng || 0}</Tag>
                              <Tag color="green">勤: {stats.dimensions.score_qin || 0}</Tag>
                              <Tag color="orange">技: {stats.dimensions.score_ji || 0}</Tag>
                              <Tag color="purple">廉: {stats.dimensions.score_lian || 0}</Tag>
                            </Space>
                          </div>
                        }
                      />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 600, color: '#1890ff' }}>
                          {stats.avgScore}
                        </div>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                          平均分
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EvaluationManagement;
