import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Modal, 
  Rate, 
  Progress,
  message, 
  Statistic, 
  Avatar,
  Empty,
  Badge,
  Divider,
  Form,
  Input,
  Row,
  Col,
  Typography,
  Alert,
  Steps
} from 'antd';
import { 
  StarOutlined, 
  UserOutlined, 
  CheckCircleOutlined,
  TrophyOutlined,
  FileTextOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { getData, insertData, updateData } from '../../services/databaseService';
import { TABLES } from '../../config/supabase';
import dayjs from 'dayjs';
import './styles.css';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Step } = Steps;

const EvaluationPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [evaluationModalVisible, setEvaluationModalVisible] = useState(false);
  const [evaluatingUser, setEvaluatingUser] = useState(null);
  const [myEvaluations, setMyEvaluations] = useState([]);
  const [form] = Form.useForm();

  // 评分维度配置
  const scoreDimensions = [
    { key: 'score_de', label: '德', description: '思想品德、职业道德', color: '#ff4d4f', maxScore: 20 },
    { key: 'score_neng', label: '能', description: '工作能力、业务水平', color: '#1890ff', maxScore: 20 },
    { key: 'score_qin', label: '勤', description: '工作态度、出勤情况', color: '#52c41a', maxScore: 20 },
    { key: 'score_ji', label: '技', description: '工作业绩、成果效果', color: '#faad14', maxScore: 20 },
    { key: 'score_lian', label: '廉', description: '廉洁自律、作风建设', color: '#722ed1', maxScore: 20 }
  ];

  // 加载所有用户
  const loadUsers = useCallback(async () => {
    try {
      const { data, error } = await getData(TABLES.USERS);
      if (error) {
        message.error('加载用户数据失败');
        return;
      }
      // 过滤掉当前用户（不能评价自己）
      const otherUsers = (data || []).filter(u => u.id !== user.id);
      setAllUsers(otherUsers);
    } catch (error) {
      console.error('加载用户数据失败:', error);
    }
  }, [user.id]);

  // 加载我的评价记录
  const loadMyEvaluations = useCallback(async () => {
    try {
      const { data, error } = await getData(TABLES.EVALUATIONS, {
        evaluator_id: user.id,
        evaluation_year: dayjs().year().toString()
      });
      if (error) {
        console.error('加载评价记录失败:', error);
        return;
      }
      setMyEvaluations(data || []);
    } catch (error) {
      console.error('加载评价记录失败:', error);
    }
  }, [user.id]);

  // 加载所有数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadMyEvaluations()
      ]);
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [loadUsers, loadMyEvaluations]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 检查用户是否已评价
  const isUserEvaluated = (userId) => {
    return myEvaluations.some(evaluation => evaluation.evaluatee_id === userId);
  };

  // 获取用户评价状态
  const getUserEvaluationStatus = (userId) => {
    const evaluation = myEvaluations.find(evaluation => evaluation.evaluatee_id === userId);
    if (evaluation) {
      return evaluation.is_completed ? 'completed' : 'draft';
    }
    return 'pending';
  };

  // 获取状态标签
  const getStatusBadge = (userId) => {
    const status = getUserEvaluationStatus(userId);
    const statusConfig = {
      pending: { status: 'default', text: '待评价', color: '#8c8c8c' },
      draft: { status: 'processing', text: '草稿', color: '#1890ff' },
      completed: { status: 'success', text: '已完成', color: '#52c41a' }
    };
    
    const config = statusConfig[status];
    return (
      <Badge 
        status={config.status} 
        text={config.text}
        style={{ color: config.color }}
      />
    );
  };

  // 开始评价
  const startEvaluation = (targetUser) => {
    setEvaluatingUser(targetUser);
    
    // 加载已有的评价数据（如果存在）
    const existingEvaluation = myEvaluations.find(evaluation => evaluation.evaluatee_id === targetUser.id);
    if (existingEvaluation) {
      form.setFieldsValue({
        score_de: existingEvaluation.score_de,
        score_neng: existingEvaluation.score_neng,
        score_qin: existingEvaluation.score_qin,
        score_ji: existingEvaluation.score_ji,
        score_lian: existingEvaluation.score_lian,
        comment: existingEvaluation.comment
      });
    } else {
      form.resetFields();
    }
    
    setEvaluationModalVisible(true);
  };

  // 保存评价
  const saveEvaluation = async (values, isCompleted = false) => {
    setLoading(true);
    try {
      const totalScore = (values.score_de || 0) + (values.score_neng || 0) + 
                        (values.score_qin || 0) + (values.score_ji || 0) + (values.score_lian || 0);

      const evaluationData = {
        evaluator_id: user.id,
        evaluatee_id: evaluatingUser.id,
        score_de: values.score_de || 0,
        score_neng: values.score_neng || 0,
        score_qin: values.score_qin || 0,
        score_ji: values.score_ji || 0,
        score_lian: values.score_lian || 0,
        total_score: totalScore,
        comment: values.comment || '',
        evaluation_year: dayjs().year().toString(),
        evaluation_period: '年度评价',
        is_completed: isCompleted,
        updated_at: new Date().toISOString()
      };

      // 检查是否已存在评价记录
      const existingEvaluation = myEvaluations.find(evaluation => evaluation.evaluatee_id === evaluatingUser.id);
      
      let result;
      if (existingEvaluation) {
        result = await updateData(TABLES.EVALUATIONS, existingEvaluation.id, evaluationData);
      } else {
        evaluationData.created_at = new Date().toISOString();
        result = await insertData(TABLES.EVALUATIONS, evaluationData);
      }

      if (result.error) {
        message.error('保存评价失败');
        return;
      }

      message.success(isCompleted ? '评价提交成功' : '草稿保存成功');
      setEvaluationModalVisible(false);
      loadMyEvaluations(); // 重新加载评价记录
      
    } catch (error) {
      console.error('保存评价失败:', error);
      message.error('保存评价失败');
    } finally {
      setLoading(false);
    }
  };

  // 提交评价
  const submitEvaluation = () => {
    form.validateFields().then(values => {
      // 检查是否所有维度都已评分
      const requiredFields = ['score_de', 'score_neng', 'score_qin', 'score_ji', 'score_lian'];
      const missingFields = requiredFields.filter(field => !values[field] || values[field] === 0);
      
      if (missingFields.length > 0) {
        message.warning('请为所有维度评分后再提交');
        return;
      }
      
      saveEvaluation(values, true);
    });
  };

  // 保存草稿
  const saveDraft = () => {
    form.validateFields(['comment']).then(values => {
      const formValues = form.getFieldsValue();
      saveEvaluation(formValues, false);
    });
  };

  // 计算评价进度
  const getEvaluationProgress = () => {
    const completed = myEvaluations.filter(evaluation => evaluation.is_completed).length;
    const total = allUsers.length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const progress = getEvaluationProgress();

  return (
    <div className="evaluation-page">
      <div className="evaluation-header">
        <Card>
          <div className="header-content">
            <div className="header-info">
              <Title level={2}>年度互评</Title>
              <Text type="secondary">全镇干部德能勤技廉五维度互评</Text>
            </div>
            <div className="header-stats">
              <Row gutter={24}>
                <Col span={8}>
                  <Statistic 
                    title="评价进度" 
                    value={progress.percentage} 
                    suffix="%" 
                    prefix={<TrophyOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="已评价人数" 
                    value={progress.completed} 
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="总人数" 
                    value={progress.total} 
                    prefix={<TeamOutlined />}
                  />
                </Col>
              </Row>
            </div>
          </div>
        </Card>
      </div>

      <div className="evaluation-content">
        <Row gutter={24}>
          <Col span={16}>
            <Card 
              title="待评价人员列表" 
              extra={
                <Text type="secondary">
                  {progress.completed} / {progress.total} 人已完成
                </Text>
              }
            >
              {allUsers.length === 0 ? (
                <Empty 
                  description="暂无可评价人员"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <List
                  loading={loading}
                  dataSource={allUsers}
                  renderItem={(targetUser) => (
                    <List.Item
                      key={targetUser.id}
                      className="evaluation-item"
                      actions={[
                        <Button 
                          type={isUserEvaluated(targetUser.id) ? "default" : "primary"}
                          onClick={() => startEvaluation(targetUser)}
                          icon={isUserEvaluated(targetUser.id) ? <FileTextOutlined /> : <StarOutlined />}
                        >
                          {isUserEvaluated(targetUser.id) ? '查看/修改' : '开始评价'}
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Badge 
                            count={isUserEvaluated(targetUser.id) ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 0}
                            offset={[-8, 8]}
                          >
                            <Avatar 
                              size={56} 
                              icon={<UserOutlined />}
                              style={{ 
                                backgroundColor: isUserEvaluated(targetUser.id) ? '#52c41a' : '#1890ff' 
                              }}
                            />
                          </Badge>
                        }
                        title={
                          <div className="user-title">
                            <span style={{ fontSize: 16, fontWeight: 600 }}>{targetUser.name}</span>
                            {getStatusBadge(targetUser.id)}
                          </div>
                        }
                        description={
                          <div className="user-description">
                            <div style={{ marginBottom: 4 }}>
                              <Text>{targetUser.department} - {targetUser.position}</Text>
                            </div>
                            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                              联系电话：{targetUser.phone}
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
          
          <Col span={8}>
            <Card title="评价说明" className="evaluation-guide">
              <Steps direction="vertical" size="small" current={-1}>
                <Step
                  title="评价原则"
                  description="客观公正，实事求是"
                  icon={<TrophyOutlined />}
                />
                <Step
                  title="评分标准"
                  description="德能勤技廉各20分，总分100分"
                  icon={<StarOutlined />}
                />
                <Step
                  title="提交要求"
                  description="所有维度必须评分才能提交"
                  icon={<CheckCircleOutlined />}
                />
              </Steps>
              
              <Divider />
              
              <div className="score-dimensions">
                <Title level={5}>评分维度说明</Title>
                {scoreDimensions.map(dimension => (
                  <div key={dimension.key} className="dimension-item">
                    <div className="dimension-header">
                      <span 
                        className="dimension-label"
                        style={{ color: dimension.color }}
                      >
                        {dimension.label}
                      </span>
                      <span className="dimension-score">
                        {dimension.maxScore}分
                      </span>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dimension.description}
                    </Text>
                  </div>
                ))}
              </div>
            </Card>
            
            <Card title="评价进度" style={{ marginTop: 16 }}>
              <Progress 
                percent={progress.percentage}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                status={progress.percentage === 100 ? 'success' : 'active'}
              />
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <Text type="secondary">
                  已完成 {progress.completed} 人，还需评价 {progress.total - progress.completed} 人
                </Text>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* 评价弹窗 */}
      <Modal
        title={`评价：${evaluatingUser?.name}`}
        open={evaluationModalVisible}
        onCancel={() => setEvaluationModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setEvaluationModalVisible(false)}>
            取消
          </Button>,
          <Button key="draft" onClick={saveDraft}>
            保存草稿
          </Button>,
          <Button key="submit" type="primary" onClick={submitEvaluation} loading={loading}>
            提交评价
          </Button>
        ]}
        width={700}
      >
        {evaluatingUser && (
          <div className="evaluation-modal">
            <Alert
              message="评价说明"
              description="请根据被评价人员在德、能、勤、技、廉五个方面的表现进行客观评价，每个维度满分20分。"
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />
            
            <div className="evaluatee-info">
              <Avatar size={64} icon={<UserOutlined />} />
              <div className="evaluatee-details">
                <Title level={4}>{evaluatingUser.name}</Title>
                <Text type="secondary">{evaluatingUser.department} - {evaluatingUser.position}</Text>
              </div>
            </div>
            
            <Form
              form={form}
              layout="vertical"
              className="evaluation-form"
            >
              {scoreDimensions.map(dimension => (
                <Form.Item
                  key={dimension.key}
                  label={
                    <div className="dimension-label-wrapper">
                      <span style={{ color: dimension.color, fontWeight: 600 }}>
                        {dimension.label} ({dimension.maxScore}分)
                      </span>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dimension.description}
                      </Text>
                    </div>
                  }
                  name={dimension.key}
                >
                  <Rate 
                    count={dimension.maxScore}
                    style={{ color: dimension.color }}
                    character={() => <StarOutlined style={{ fontSize: 14 }} />}
                  />
                </Form.Item>
              ))}
              
              <Form.Item
                label="评价意见"
                name="comment"
              >
                <TextArea 
                  rows={4} 
                  placeholder="请输入对该同志的评价意见和建议..."
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EvaluationPage;
