import React, { useState, useEffect } from 'react';
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
  Switch,
  List,
  Popconfirm,
  InputNumber,
  Avatar,
  Tabs,
  Divider,
  Transfer
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  StopOutlined,
  UserOutlined,
  TeamOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { getData, insertData, updateData, deleteData } from '../../../services/databaseService';
import { useAuth } from '../../../contexts/AuthContext';
import { TABLES } from '../../../config/supabase';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const VoteManagement = () => {
  const { user: currentUser } = useAuth();
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingVote, setEditingVote] = useState(null);
  const [viewingVote, setViewingVote] = useState(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    loadVotes();
    loadUsers();
  }, []);

  // 加载投票数据
  const loadVotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await getData(TABLES.VOTES);
      if (error) {
        message.error('加载投票数据失败');
        return;
      }
      setVotes(data || []);
    } catch (error) {
      console.error('加载投票数据失败:', error);
      message.error('加载投票数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载所有用户数据
  const loadUsers = async () => {
    try {
      const { data, error } = await getData(TABLES.USERS);
      if (error) {
        message.error('加载用户数据失败');
        return;
      }
      setAllUsers(data || []);
    } catch (error) {
      console.error('加载用户数据失败:', error);
      message.error('加载用户数据失败');
    }
  };

  // 打开创建/编辑投票弹窗
  const openModal = (vote = null) => {
    setEditingVote(vote);
    if (vote) {
      form.setFieldsValue({
        ...vote,
        time_range: vote.start_time && vote.end_time ? [dayjs(vote.start_time), dayjs(vote.end_time)] : null
      });
      // 从候选人数组中提取用户ID
      const candidateIds = (vote.candidates || []).map(c => c.id);
      setSelectedCandidateIds(candidateIds);
    } else {
      form.resetFields();
      setSelectedCandidateIds([]);
    }
    setModalVisible(true);
  };

  // 保存投票
  const saveVote = async (values) => {
    setLoading(true);
    try {
      const [startTime, endTime] = values.time_range || [];
      
      // 根据选中的用户ID生成候选人数据
      const candidates = selectedCandidateIds.map(userId => {
        const user = allUsers.find(u => u.id === userId);
        return {
          id: user.id,
          name: user.name,
          description: `${user.department} - ${user.position}`,
          department: user.department,
          phone: user.phone,
          avatar: user.avatar || ''
        };
      });

      const voteData = {
        title: values.title,
        description: values.description,
        start_time: startTime?.toISOString(),
        end_time: endTime?.toISOString(),
        max_votes_per_user: values.max_votes_per_user || 1,
        show_results: values.show_results || false,
        status: values.status || 'draft',
        candidates: candidates,
        created_by: currentUser.id,
        updated_at: new Date().toISOString()
      };

      let result;
      if (editingVote) {
        result = await updateData(TABLES.VOTES, editingVote.id, voteData);
      } else {
        voteData.created_at = new Date().toISOString();
        result = await insertData(TABLES.VOTES, voteData);
      }

      if (result.error) {
        message.error(editingVote ? '更新投票失败' : '创建投票失败');
        return;
      }

      message.success(editingVote ? '投票更新成功' : '投票创建成功');
      setModalVisible(false);
      loadVotes();
    } catch (error) {
      console.error('保存投票失败:', error);
      message.error('保存投票失败');
    } finally {
      setLoading(false);
    }
  };

  // 更新投票状态
  const updateVoteStatus = async (voteId, status) => {
    try {
      const result = await updateData(TABLES.VOTES, voteId, { 
        status,
        updated_at: new Date().toISOString()
      });
      
      if (result.error) {
        message.error('更新状态失败');
        return;
      }
      
      message.success('状态更新成功');
      loadVotes();
    } catch (error) {
      console.error('更新状态失败:', error);
      message.error('更新状态失败');
    }
  };

  // 删除投票
  const deleteVote = async (voteId) => {
    try {
      const result = await deleteData(TABLES.VOTES, voteId);
      if (result.error) {
        message.error('删除投票失败');
        return;
      }
      message.success('投票删除成功');
      loadVotes();
    } catch (error) {
      console.error('删除投票错误:', error);
      message.error('删除投票失败');
    }
  };

  // 查看投票详情
  const viewVoteDetail = (vote) => {
    setViewingVote(vote);
    setViewModalVisible(true);
  };

  // 处理候选人选择变化
  const handleCandidateChange = (targetKeys) => {
    setSelectedCandidateIds(targetKeys);
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

  // 表格列定义
  const columns = [
    {
      title: '投票标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: renderStatusTag
    },
    {
      title: '候选人数',
      key: 'candidates',
      width: 100,
      render: (_, record) => (
        <span>
          <TeamOutlined /> {record.candidates?.length || 0}
        </span>
      )
    },
    {
      title: '每人可投票数',
      dataIndex: 'max_votes_per_user',
      key: 'max_votes_per_user',
      width: 120,
      render: (count) => (
        <span>
          <TrophyOutlined /> {count || 1}
        </span>
      )
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 150,
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      width: 150,
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={() => viewVoteDetail(record)}
          >
            查看
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => openModal(record)}
          >
            编辑
          </Button>
          {record.status === 'draft' && (
            <Button 
              type="link" 
              icon={<PlayCircleOutlined />}
              onClick={() => updateVoteStatus(record.id, 'active')}
            >
              开始
            </Button>
          )}
          {record.status === 'active' && (
            <Button 
              type="link" 
              icon={<StopOutlined />}
              onClick={() => updateVoteStatus(record.id, 'closed')}
            >
              结束
            </Button>
          )}
          <Popconfirm
            title="确定要删除这个投票吗？"
            onConfirm={() => deleteVote(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="vote-management">
      <Card 
        title="投票管理" 
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => openModal()}
          >
            创建投票
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={votes}
          rowKey="id"
          loading={loading}
          pagination={{
            total: votes.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>

      {/* 创建/编辑投票弹窗 */}
      <Modal
        title={editingVote ? '编辑投票' : '创建投票'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveVote}
        >
          <Tabs defaultActiveKey="basic">
            <TabPane tab="基本信息" key="basic">
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    label="投票标题"
                    name="title"
                    rules={[{ required: true, message: '请输入投票标题' }]}
                  >
                    <Input placeholder="请输入投票标题" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    label="投票描述"
                    name="description"
                  >
                    <TextArea 
                      rows={3} 
                      placeholder="请输入投票描述"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="投票时间"
                    name="time_range"
                    rules={[{ required: true, message: '请选择投票时间' }]}
                  >
                    <RangePicker 
                      showTime
                      format="YYYY-MM-DD HH:mm"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="每人可投票数"
                    name="max_votes_per_user"
                    rules={[{ required: true, message: '请设置每人可投票数' }]}
                  >
                    <InputNumber 
                      min={1} 
                      max={10} 
                      style={{ width: '100%' }}
                      placeholder="每人可投票数"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="显示结果"
                    name="show_results"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="投票状态"
                    name="status"
                  >
                    <Tag color="default">草稿</Tag>
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>
            
            <TabPane tab="候选人选择" key="candidates">
              <div className="candidates-section">
                <div className="candidates-header">
                  <h4>从系统用户中选择候选人 ({selectedCandidateIds.length} 人已选)</h4>
                </div>
                
                <Transfer
                  dataSource={allUsers.map(user => ({
                    key: user.id,
                    title: user.name,
                    description: `${user.department} - ${user.position}`,
                    disabled: user.id === currentUser.id // 管理员不能选择自己
                  }))}
                  targetKeys={selectedCandidateIds}
                  onChange={handleCandidateChange}
                  render={item => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar size="small" icon={<UserOutlined />} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>{item.description}</div>
                      </div>
                    </div>
                  )}
                  titles={['可选用户', '已选候选人']}
                  searchPlaceholder="搜索用户"
                  listStyle={{
                    width: 300,
                    height: 400,
                  }}
                  showSearch
                />
              </div>
            </TabPane>
          </Tabs>
          
          <Divider />
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingVote ? '更新投票' : '创建投票'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>



      {/* 查看投票详情弹窗 */}
      <Modal
        title="投票详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {viewingVote && (
          <div className="vote-detail">
            <Row gutter={16}>
              <Col span={24}>
                <h3>{viewingVote.title}</h3>
                <p>{viewingVote.description}</p>
              </Col>
              <Col span={12}>
                <strong>状态：</strong> {renderStatusTag(viewingVote.status)}
              </Col>
              <Col span={12}>
                <strong>每人可投票数：</strong> {viewingVote.max_votes_per_user || 1}
              </Col>
              <Col span={12}>
                <strong>开始时间：</strong> {viewingVote.start_time ? dayjs(viewingVote.start_time).format('YYYY-MM-DD HH:mm') : '-'}
              </Col>
              <Col span={12}>
                <strong>结束时间：</strong> {viewingVote.end_time ? dayjs(viewingVote.end_time).format('YYYY-MM-DD HH:mm') : '-'}
              </Col>
            </Row>
            
            <Divider />
            
            <h4>候选人列表 ({viewingVote.candidates?.length || 0})</h4>
            <List
              dataSource={viewingVote.candidates || []}
              renderItem={(candidate) => (
                <List.Item key={candidate.id}>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        src={candidate.avatar} 
                        icon={<UserOutlined />}
                      />
                    }
                    title={candidate.name}
                    description={candidate.description}
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VoteManagement;