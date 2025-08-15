import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Tag, 
  Modal, 
  Radio, 
  Space, 
  message, 
  Statistic, 
  Progress,
  Avatar,
  Empty,
  Badge
} from 'antd';
import { 
  TrophyOutlined, 
  UserOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { getData, insertData } from '../../services/databaseService';
import { TABLES } from '../../config/supabase';
import dayjs from 'dayjs';
import './styles.css';

const VotingPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [votes, setVotes] = useState([]);
  const [selectedVote, setSelectedVote] = useState(null);
  const [votingModalVisible, setVotingModalVisible] = useState(false);
  const [resultsModalVisible, setResultsModalVisible] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [voteResults, setVoteResults] = useState([]);

  // 加载投票数据
  const loadVotes = useCallback(async () => {
    setLoading(true);
    try {
      // 获取所有投票活动
      const { data: votesData, error } = await getData(TABLES.VOTES);
      
      if (error) {
        message.error('加载投票数据失败');
        return;
      }

      // 获取用户已投票记录
      const { data: userVoteRecords } = await getData(TABLES.VOTE_RECORDS, {
        voter_id: user.id
      });

      // 标记用户已投票的活动
      const votesWithStatus = votesData.map(vote => ({
        ...vote,
        hasVoted: userVoteRecords?.some(record => record.vote_id === vote.id) || false,
        candidates: vote.candidates || []
      }));

      setVotes(votesWithStatus);
    } catch (error) {
      console.error('加载投票数据失败:', error);
      message.error('加载投票数据失败');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadVotes();
  }, [loadVotes]);

  // 获取投票状态标签
  const getStatusTag = (vote) => {
    const now = dayjs();
    const startTime = dayjs(vote.start_time);
    const endTime = dayjs(vote.end_time);

    if (vote.status === 'closed') {
      return <Tag color="default" icon={<StopOutlined />}>已结束</Tag>;
    }
    
    if (now.isBefore(startTime)) {
      return <Tag color="blue" icon={<ClockCircleOutlined />}>未开始</Tag>;
    }
    
    if (now.isAfter(endTime)) {
      return <Tag color="red" icon={<StopOutlined />}>已过期</Tag>;
    }
    
    if (vote.hasVoted) {
      return <Tag color="green" icon={<CheckCircleOutlined />}>已投票</Tag>;
    }
    
    return <Tag color="orange" icon={<ClockCircleOutlined />}>进行中</Tag>;
  };

  // 获取投票状态文本
  const getStatusText = (vote) => {
    const now = dayjs();
    const startTime = dayjs(vote.start_time);
    const endTime = dayjs(vote.end_time);

    if (vote.status === 'closed') {
      return '投票已结束';
    }
    
    if (now.isBefore(startTime)) {
      return `将于 ${startTime.format('MM-DD HH:mm')} 开始`;
    }
    
    if (now.isAfter(endTime)) {
      return '投票已过期';
    }
    
    if (vote.hasVoted) {
      return '您已参与投票';
    }
    
    return `截止时间：${endTime.format('MM-DD HH:mm')}`;
  };

  // 检查是否可以投票
  const canVote = (vote) => {
    const now = dayjs();
    const startTime = dayjs(vote.start_time);
    const endTime = dayjs(vote.end_time);
    
    return vote.status === 'active' && 
           now.isAfter(startTime) && 
           now.isBefore(endTime) && 
           !vote.hasVoted;
  };

  // 检查是否可以查看结果
  const canViewResults = (vote) => {
    return vote.show_results || vote.status === 'closed' || vote.hasVoted;
  };

  // 开始投票
  const startVoting = (vote) => {
    setSelectedVote(vote);
    setSelectedCandidates([]);
    setVotingModalVisible(true);
  };

  // 处理候选人选择
  const handleCandidateSelect = (candidateId) => {
    const maxVotes = selectedVote?.max_votes_per_user || 1;
    
    if (selectedCandidates.includes(candidateId)) {
      // 取消选择
      setSelectedCandidates(selectedCandidates.filter(id => id !== candidateId));
    } else {
      // 选择候选人
      if (selectedCandidates.length < maxVotes) {
        setSelectedCandidates([...selectedCandidates, candidateId]);
      } else {
        message.warning(`最多只能选择 ${maxVotes} 位候选人`);
      }
    }
  };

  // 提交投票
  const submitVote = async () => {
    if (selectedCandidates.length === 0) {
      message.warning('请选择候选人');
      return;
    }

    setLoading(true);
    try {
      // 创建投票记录
      const voteRecord = {
        vote_id: selectedVote.id,
        voter_id: user.id,
        candidates: selectedCandidates,
        vote_time: new Date().toISOString()
      };

      const { error } = await insertData(TABLES.VOTE_RECORDS, voteRecord);
      
      if (error) {
        message.error('投票失败，请重试');
        return;
      }

      message.success('投票成功！');
      setVotingModalVisible(false);
      loadVotes(); // 重新加载数据
      
    } catch (error) {
      console.error('投票失败:', error);
      message.error('投票失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 查看投票结果
  const viewResults = async (vote) => {
    setLoading(true);
    try {
      // 获取投票记录统计
      const { data: records, error } = await getData(TABLES.VOTE_RECORDS, {
        vote_id: vote.id
      });

      if (error) {
        message.error('加载投票结果失败');
        return;
      }

      // 统计候选人得票
      const candidateVotes = {};
      const totalVotes = records?.length || 0;

      records?.forEach(record => {
        record.candidates?.forEach(candidateId => {
          candidateVotes[candidateId] = (candidateVotes[candidateId] || 0) + 1;
        });
      });

      // 生成结果数据
      const results = vote.candidates.map(candidate => ({
        ...candidate,
        votes: candidateVotes[candidate.id] || 0,
        percentage: totalVotes > 0 ? ((candidateVotes[candidate.id] || 0) / totalVotes * 100).toFixed(1) : 0
      })).sort((a, b) => b.votes - a.votes);

      setVoteResults(results);
      setSelectedVote(vote);
      setResultsModalVisible(true);
      
    } catch (error) {
      console.error('加载投票结果失败:', error);
      message.error('加载投票结果失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="voting-page">
      <div className="voting-header">
        <Card>
          <div className="header-content">
            <div className="header-info">
              <h1>投票管理</h1>
              <p>参与童坊镇各类投票活动</p>
            </div>
            <div className="header-stats">
              <Statistic 
                title="可参与投票" 
                value={votes.filter(vote => canVote(vote)).length} 
                prefix={<TrophyOutlined />}
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="voting-content">
        <Card title="投票活动列表" className="votes-list-card">
          {votes.length === 0 ? (
            <Empty 
              description="暂无投票活动"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <List
              loading={loading}
              dataSource={votes}
              renderItem={(vote) => (
                <List.Item
                  key={vote.id}
                  className="vote-item"
                  actions={[
                    canVote(vote) && (
                      <Button 
                        type="primary" 
                        onClick={() => startVoting(vote)}
                        icon={<TrophyOutlined />}
                      >
                        立即投票
                      </Button>
                    ),
                    canViewResults(vote) && (
                      <Button 
                        onClick={() => viewResults(vote)}
                        icon={<BarChartOutlined />}
                      >
                        查看结果
                      </Button>
                    )
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge 
                        count={vote.hasVoted ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 0}
                        offset={[-8, 8]}
                      >
                        <Avatar 
                          size={64} 
                          icon={<TrophyOutlined />}
                          style={{ backgroundColor: vote.hasVoted ? '#52c41a' : '#1890ff' }}
                        />
                      </Badge>
                    }
                    title={
                      <div className="vote-title">
                        <span>{vote.title}</span>
                        {getStatusTag(vote)}
                      </div>
                    }
                    description={
                      <div className="vote-description">
                        <p>{vote.description}</p>
                        <div className="vote-meta">
                          <span><UserOutlined /> 候选人：{vote.candidates?.length || 0} 人</span>
                          <span><TrophyOutlined /> 可投票数：{vote.max_votes_per_user || 1} 票</span>
                          <span className="vote-time">{getStatusText(vote)}</span>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>

      {/* 投票弹窗 */}
      <Modal
        title={`投票：${selectedVote?.title}`}
        open={votingModalVisible}
        onCancel={() => setVotingModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setVotingModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={loading}
            onClick={submitVote}
            disabled={selectedCandidates.length === 0}
          >
            确认投票
          </Button>
        ]}
        width={600}
      >
        <div className="voting-modal">
          <div className="voting-info">
            <p>{selectedVote?.description}</p>
            <p className="vote-rule">
              <TrophyOutlined /> 您最多可以选择 {selectedVote?.max_votes_per_user || 1} 位候选人
            </p>
            <p className="selected-count">
              已选择：{selectedCandidates.length} / {selectedVote?.max_votes_per_user || 1}
            </p>
          </div>
          
          <div className="candidates-list">
            <Radio.Group 
              value={selectedCandidates} 
              onChange={null}
              style={{ width: '100%' }}
            >
              <List
                dataSource={selectedVote?.candidates || []}
                renderItem={(candidate) => (
                  <List.Item
                    key={candidate.id}
                    className={`candidate-item ${selectedCandidates.includes(candidate.id) ? 'selected' : ''}`}
                    onClick={() => handleCandidateSelect(candidate.id)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          src={candidate.avatar} 
                          icon={<UserOutlined />}
                          size={48}
                        />
                      }
                      title={candidate.name}
                      description={candidate.description}
                    />
                    <div className="candidate-check">
                      <Radio 
                        checked={selectedCandidates.includes(candidate.id)}
                        onChange={() => {}}
                      />
                    </div>
                  </List.Item>
                )}
              />
            </Radio.Group>
          </div>
        </div>
      </Modal>

      {/* 投票结果弹窗 */}
      <Modal
        title={`投票结果：${selectedVote?.title}`}
        open={resultsModalVisible}
        onCancel={() => setResultsModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setResultsModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        <div className="results-modal">
          <div className="results-summary">
            <Space size="large">
              <Statistic 
                title="总参与人数" 
                value={voteResults.reduce((sum, item) => sum + item.votes, 0)}
                prefix={<UserOutlined />}
              />
              <Statistic 
                title="候选人数" 
                value={voteResults.length}
                prefix={<TrophyOutlined />}
              />
            </Space>
          </div>
          
          <div className="results-list">
            <List
              dataSource={voteResults}
              renderItem={(candidate, index) => (
                <List.Item key={candidate.id} className="result-item">
                  <List.Item.Meta
                    avatar={
                      <Badge 
                        count={index + 1}
                        style={{ 
                          backgroundColor: index === 0 ? '#faad14' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#1890ff' 
                        }}
                      >
                        <Avatar 
                          src={candidate.avatar} 
                          icon={<UserOutlined />}
                          size={54}
                        />
                      </Badge>
                    }
                    title={
                      <div className="result-title">
                        <span>{candidate.name}</span>
                        {index === 0 && <TrophyOutlined style={{ color: '#faad14', marginLeft: 8 }} />}
                      </div>
                    }
                    description={
                      <div className="result-description">
                        <p>{candidate.description}</p>
                        <div className="vote-stats">
                          <span>得票数：{candidate.votes} 票</span>
                          <span>得票率：{candidate.percentage}%</span>
                        </div>
                      </div>
                    }
                  />
                  <div className="result-progress">
                    <Progress 
                      percent={parseFloat(candidate.percentage)}
                      strokeColor={{
                        '0%': '#1890ff',
                        '100%': '#40a9ff',
                      }}
                      showInfo={false}
                    />
                  </div>
                </List.Item>
              )}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VotingPage;
