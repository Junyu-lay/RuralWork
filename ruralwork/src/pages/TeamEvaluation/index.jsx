import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Input,
  message,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Rate,
  Divider,
  Alert
} from 'antd';
import {
  EyeOutlined,
  TeamOutlined,
  StarOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { getData, insertData } from '../../services/databaseService';
import { TABLES } from '../../config/supabase';
import dayjs from 'dayjs';
import './styles.css';

const { TextArea } = Input;

const TeamEvaluationPage = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activities, setActivities] = useState([]);
  const [workTeams, setWorkTeams] = useState([]);
  const [myEvaluations, setMyEvaluations] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [viewingEvaluation, setViewingEvaluation] = useState(null);

  // 评分维度配置
  const evaluationDimensions = [
    { key: 'work_quality_score', label: '工作质量', maxScore: 20, color: '#1890ff' },
    { key: 'cooperation_score', label: '配合程度', maxScore: 20, color: '#52c41a' },
    { key: 'efficiency_score', label: '工作效率', maxScore: 20, color: '#faad14' },
    { key: 'innovation_score', label: '创新能力', maxScore: 20, color: '#722ed1' },
    { key: 'service_attitude_score', label: '服务态度', maxScore: 20, color: '#ff7875' }
  ];

  // 加载评分活动
  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await getData(TABLES.TEAM_EVALUATION_ACTIVITIES, {
        filters: { status: 'active' }
      });
      if (error) {
        message.error('加载评分活动失败');
        return;
      }
      setActivities(data || []);
    } catch (error) {
      console.error('加载评分活动失败:', error);
      message.error('加载评分活动失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载工作队信息
  const loadWorkTeams = useCallback(async () => {
    try {
      const { data, error } = await getData(TABLES.WORK_TEAMS, {
        filters: { is_active: true }
      });
      if (error) {
        message.error('加载工作队信息失败');
        return;
      }
      setWorkTeams(data || []);
    } catch (error) {
      console.error('加载工作队信息失败:', error);
      message.error('加载工作队信息失败');
    }
  }, []);

  // 加载我的评分记录
  const loadMyEvaluations = useCallback(async () => {
    try {
      const { data, error } = await getData(TABLES.WORK_TEAM_EVALUATIONS, {
        filters: { evaluator_id: user.id }
      });
      if (error) {
        message.error('加载评分记录失败');
        return;
      }
      setMyEvaluations(data || []);
    } catch (error) {
      console.error('加载评分记录失败:', error);
      message.error('加载评分记录失败');
    }
  }, [user.id]);

  useEffect(() => {
    if (user?.id) {
      loadActivities();
      loadWorkTeams();
      loadMyEvaluations();
    }
  }, [user?.id, loadActivities, loadWorkTeams, loadMyEvaluations]);

  // 开始评分
  const startEvaluation = (activity, team) => {
    // 检查是否已经评分过
    const existingEvaluation = myEvaluations.find(
      evaluation => evaluation.activity_id === activity.id && evaluation.team_id === team.id
    );
    
    if (existingEvaluation) {
      message.warning('您已经对该工作队进行过评分');
      return;
    }

    setCurrentActivity(activity);
    setCurrentTeam(team);
    form.resetFields();
    setModalVisible(true);
  };

  // 查看评分详情
  const viewEvaluation = (evaluation) => {
    setViewingEvaluation(evaluation);
    setViewModalVisible(true);
  };

  // 提交评分
  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      // 计算总分
      const totalScore = evaluationDimensions.reduce((sum, dim) => {
        return sum + (values[dim.key] || 0);
      }, 0);

      const evaluationData = {
        activity_id: currentActivity.id,
        team_id: currentTeam.id,
        evaluator_id: user.id,
        evaluator_department: user.department,
        work_quality_score: values.work_quality_score || 0,
        cooperation_score: values.cooperation_score || 0,
        efficiency_score: values.efficiency_score || 0,
        innovation_score: values.innovation_score || 0,
        service_attitude_score: values.service_attitude_score || 0,
        total_score: totalScore,
        comments: values.comments || '',
        is_submitted: true,
        submitted_at: new Date().toISOString()
      };

      const { error } = await insertData(TABLES.WORK_TEAM_EVALUATIONS, evaluationData);
      
      if (error) {
        message.error('提交评分失败');
        return;
      }

      message.success('评分提交成功');
      setModalVisible(false);
      loadMyEvaluations();
    } catch (error) {
      console.error('提交评分失败:', error);
      message.error('提交评分失败');
    } finally {
      setSubmitting(false);
    }
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
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => viewEvaluation(record)}
        >
          查看详情
        </Button>
      )
    }
  ];

  return (
    <div className="team-evaluation-page">
      {/* 页面头部说明 */}
      <Alert
        message="工作队评分"
        description="请根据工作队在您所在站所的实际工作表现进行客观公正的评分。每个工作队只能评分一次。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 当前活跃的评分活动 */}
      <Card title="当前评分活动" className="admin-card" style={{ marginBottom: 24 }}>
        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <TeamOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <p>暂无进行中的工作队评分活动</p>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {activities.map(activity => (
              <Col xs={24} sm={12} lg={8} key={activity.id}>
                <Card
                  size="small"
                  title={activity.title}
                  extra={statusTag(activity.status)}
                  style={{ height: '100%' }}
                >
                  <p style={{ marginBottom: 12, color: '#666' }}>
                    {activity.description}
                  </p>
                  <p style={{ marginBottom: 12, fontSize: 12, color: '#999' }}>
                    时间：{dayjs(activity.start_time).format('MM-DD')} 至 {dayjs(activity.end_time).format('MM-DD')}
                  </p>
                  
                  <Divider style={{ margin: '12px 0' }} />
                  
                  <div style={{ marginBottom: 12 }}>
                    <strong>待评分工作队：</strong>
                  </div>
                  
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {workTeams.map(team => {
                      const hasEvaluated = myEvaluations.some(
                        evaluation => evaluation.activity_id === activity.id && evaluation.team_id === team.id
                      );
                      
                      return (
                        <div key={team.id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '8px 12px',
                          border: '1px solid #f0f0f0',
                          borderRadius: 6,
                          backgroundColor: hasEvaluated ? '#f6ffed' : '#fff'
                        }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>{team.team_name}</div>
                            <div style={{ fontSize: 12, color: '#666' }}>
                              负责村：{team.assigned_village} | 队长：{team.team_leader}
                            </div>
                          </div>
                          {hasEvaluated ? (
                            <Tag color="green">已评分</Tag>
                          ) : (
                            <Button
                              type="primary"
                              size="small"
                              icon={<StarOutlined />}
                              onClick={() => startEvaluation(activity, team)}
                            >
                              评分
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* 我的评分记录 */}
      <Card title="我的评分记录" className="admin-card">
        <Table
          columns={evaluationColumns}
          dataSource={myEvaluations}
          rowKey="id"
          loading={loading}
          pagination={{
            total: myEvaluations.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>

      {/* 评分模态框 */}
      <Modal
        title={`评分：${currentTeam?.team_name || ''}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        {currentActivity && currentTeam && (
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <h4>评分活动：{currentActivity.title}</h4>
              <p style={{ color: '#666' }}>
                工作队：{currentTeam.team_name} | 负责村：{currentTeam.assigned_village} | 队长：{currentTeam.team_leader}
              </p>
            </div>

            <Row gutter={16}>
              {evaluationDimensions.map(dimension => (
                <Col xs={24} sm={12} key={dimension.key}>
                  <Form.Item
                    name={dimension.key}
                    label={`${dimension.label} (${dimension.maxScore}分)`}
                    rules={[
                      { required: true, message: `请为${dimension.label}评分` },
                      { type: 'number', min: 0, max: dimension.maxScore, message: `分数范围：0-${dimension.maxScore}` }
                    ]}
                  >
                    <div>
                      <InputNumber
                        min={0}
                        max={dimension.maxScore}
                        style={{ width: '100%' }}
                        placeholder={`请输入${dimension.label}分数`}
                      />
                      <div style={{ marginTop: 8 }}>
                        <Rate
                          count={5}
                          value={form.getFieldValue(dimension.key) ? form.getFieldValue(dimension.key) / 4 : 0}
                          onChange={(value) => {
                            form.setFieldsValue({ [dimension.key]: Math.round(value * 4) });
                          }}
                          style={{ fontSize: 16, color: dimension.color }}
                        />
                        <span style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>
                          参考：优秀(18-20) 良好(15-17) 一般(12-14) 较差(8-11) 很差(0-7)
                        </span>
                      </div>
                    </div>
                  </Form.Item>
                </Col>
              ))}
            </Row>

            <Form.Item
              name="comments"
              label="评价意见"
              rules={[{ required: true, message: '请填写评价意见' }]}
            >
              <TextArea
                rows={4}
                placeholder="请详细描述该工作队的工作表现，包括优点和需要改进的地方..."
                showCount
                maxLength={500}
              />
            </Form.Item>

            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setModalVisible(false)}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  提交评分
                </Button>
              </Space>
            </div>
          </Form>
        )}
      </Modal>

      {/* 查看评分详情模态框 */}
      <Modal
        title="评分详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {viewingEvaluation && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <strong>评分活动：</strong>{getActivityName(viewingEvaluation.activity_id)}
              </Col>
              <Col span={12}>
                <strong>工作队：</strong>{getTeamName(viewingEvaluation.team_id)}
              </Col>
              <Col span={12}>
                <strong>总分：</strong>
                <span style={{ 
                  fontSize: 18, 
                  fontWeight: 600,
                  color: viewingEvaluation.total_score >= 90 ? '#52c41a' : 
                         viewingEvaluation.total_score >= 80 ? '#1890ff' : 
                         viewingEvaluation.total_score >= 70 ? '#faad14' : '#ff4d4f'
                }}>
                  {viewingEvaluation.total_score}/100
                </span>
              </Col>
              <Col span={12}>
                <strong>提交时间：</strong>{dayjs(viewingEvaluation.submitted_at).format('YYYY-MM-DD HH:mm')}
              </Col>
            </Row>

            <Divider />

            <h4>各维度评分：</h4>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {evaluationDimensions.map(dimension => (
                <Col span={12} key={dimension.key}>
                  <Statistic
                    title={dimension.label}
                    value={viewingEvaluation[dimension.key]}
                    suffix={`/${dimension.maxScore}`}
                    valueStyle={{ color: dimension.color }}
                  />
                </Col>
              ))}
            </Row>

            <Divider />

            <div>
              <h4>评价意见：</h4>
              <div style={{ 
                padding: 12, 
                background: '#f5f5f5', 
                borderRadius: 6,
                whiteSpace: 'pre-wrap'
              }}>
                {viewingEvaluation.comments || '无'}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TeamEvaluationPage;
