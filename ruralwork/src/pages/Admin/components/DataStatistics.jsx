import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  DatePicker,
  message,
  Statistic,
  Table,
  Space,
  Divider,
  Tabs
} from 'antd';
import { Column, Pie, Radar } from '@ant-design/charts';
import {
  DownloadOutlined,
  BarChartOutlined,
  UserOutlined,
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import { getData } from '../../../services/databaseService';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const DataStatistics = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  const [statisticsData, setStatisticsData] = useState({
    users: {
      total: 0,
      byRole: {},
      recent: 0
    },
    votes: {
      total: 0,
      active: 0,
      completed: 0,
      participationRate: 0
    },
    evaluations: {
      total: 0,
      completed: 0,
      averageScores: {},
      topPerformers: [],
      departmentStats: [],
      dimensionStats: [],
      scoreDistribution: [],
      monthlyTrend: []
    },
    leaves: {
      total: 0,
      pending: 0,
      approved: 0,
      totalDays: 0,
      byType: {}
    }
  });

  useEffect(() => {
    loadStatistics();
  }, [dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // 加载统计数据
  const loadStatistics = async () => {
    setLoading(true);
    try {
      // 日期范围暂时未使用，但保留用于后续功能扩展
      // const startDate = dateRange[0].format('YYYY-MM-DD');
      // const endDate = dateRange[1].format('YYYY-MM-DD');

      // 并行加载所有数据
      const [
        usersResult,
        votesResult,
        evaluationsResult,
        leavesResult,
        voteRecordsResult
      ] = await Promise.all([
        getData('users'),
        getData('votes'),
        getData('evaluations', {
          filters: { is_completed: true }
        }),
        getData('leave_requests'),
        getData('vote_records')
      ]);

      // 处理用户数据
      const users = usersResult.data || [];
      const usersByRole = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      
      const recentUsers = users.filter(user => 
        dayjs(user.created_at).isAfter(dayjs().subtract(7, 'day'))
      ).length;

      // 处理投票数据
      const votes = votesResult.data || [];
      const activeVotes = votes.filter(vote => vote.status === 'active').length;
      const completedVotes = votes.filter(vote => vote.status === 'completed').length;
      
      // 计算参与率
      const voteRecords = voteRecordsResult.data || [];
      const totalPossibleParticipation = votes.length * users.length;
      const actualParticipation = voteRecords.length;
      const participationRate = totalPossibleParticipation > 0 
        ? (actualParticipation / totalPossibleParticipation * 100).toFixed(1)
        : 0;

      // 处理评价数据
      const evaluations = evaluationsResult.data || [];
      const completedEvaluations = evaluations.filter(e => e.is_completed);
      const userMap = new Map(users.map(user => [user.id, user]));

      const averageScores = {
        de: (completedEvaluations.reduce((sum, evaluation) => sum + (evaluation.score_de || 0), 0) / completedEvaluations.length || 0).toFixed(1),
        neng: (completedEvaluations.reduce((sum, evaluation) => sum + (evaluation.score_neng || 0), 0) / completedEvaluations.length || 0).toFixed(1),
        qin: (completedEvaluations.reduce((sum, evaluation) => sum + (evaluation.score_qin || 0), 0) / completedEvaluations.length || 0).toFixed(1),
        ji: (completedEvaluations.reduce((sum, evaluation) => sum + (evaluation.score_ji || 0), 0) / completedEvaluations.length || 0).toFixed(1),
        lian: (completedEvaluations.reduce((sum, evaluation) => sum + (evaluation.score_lian || 0), 0) / completedEvaluations.length || 0).toFixed(1)
      };

      // 生成维度统计数据（用于雷达图）
      const dimensionStats = [
        { dimension: '德', score: parseFloat(averageScores.de), fullScore: 20 },
        { dimension: '能', score: parseFloat(averageScores.neng), fullScore: 20 },
        { dimension: '勤', score: parseFloat(averageScores.qin), fullScore: 20 },
        { dimension: '技', score: parseFloat(averageScores.ji), fullScore: 20 },
        { dimension: '廉', score: parseFloat(averageScores.lian), fullScore: 20 }
      ];

      // 计算个人得分排名
      const userScores = completedEvaluations.reduce((acc, evaluation) => {
        const user = userMap.get(evaluation.evaluatee_id);
        if (!user || user.role === 'admin') return acc;
        
        if (!acc[evaluation.evaluatee_id]) {
          acc[evaluation.evaluatee_id] = { 
            user,
            totalScore: 0, 
            count: 0 
          };
        }
        acc[evaluation.evaluatee_id].totalScore += evaluation.total_score || 0;
        acc[evaluation.evaluatee_id].count += 1;
        return acc;
      }, {});

      const topPerformers = Object.entries(userScores)
        .map(([userId, data]) => ({
          name: data.user.name,
          department: data.user.department,
          score: (data.totalScore / data.count).toFixed(1),
          evaluationCount: data.count
        }))
        .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
        .slice(0, 10);

      // 计算部门统计（用于柱状图）
      const departmentStats = {};
      completedEvaluations.forEach(evaluation => {
        const user = userMap.get(evaluation.evaluatee_id);
        if (!user || user.role === 'admin') return;
        
        const dept = user.department;
        if (!departmentStats[dept]) {
          departmentStats[dept] = {
            department: dept,
            totalScore: 0,
            count: 0,
            userCount: new Set()
          };
        }
        
        departmentStats[dept].totalScore += evaluation.total_score || 0;
        departmentStats[dept].count += 1;
        departmentStats[dept].userCount.add(user.id);
      });

      const departmentStatsArray = Object.values(departmentStats).map(dept => ({
        department: dept.department,
        averageScore: dept.count > 0 ? parseFloat((dept.totalScore / dept.count).toFixed(1)) : 0,
        userCount: dept.userCount.size,
        evaluationCount: dept.count
      })).sort((a, b) => b.averageScore - a.averageScore);

      // 计算分数分布（用于饼图）
      const scoreDistribution = [
        { range: '90-100分', count: 0 },
        { range: '80-89分', count: 0 },
        { range: '70-79分', count: 0 },
        { range: '60-69分', count: 0 },
        { range: '60分以下', count: 0 }
      ];

      completedEvaluations.forEach(evaluation => {
        const score = evaluation.total_score || 0;
        if (score >= 90) scoreDistribution[0].count++;
        else if (score >= 80) scoreDistribution[1].count++;
        else if (score >= 70) scoreDistribution[2].count++;
        else if (score >= 60) scoreDistribution[3].count++;
        else scoreDistribution[4].count++;
      });

      // 处理请假数据
      const leaves = leavesResult.data || [];
      const pendingLeaves = leaves.filter(leave => leave.status === 'pending').length;
      const approvedLeaves = leaves.filter(leave => leave.status === 'approved').length;
      const totalLeaveDays = leaves
        .filter(leave => leave.status === 'approved')
        .reduce((sum, leave) => sum + (leave.days_count || 0), 0);
      
      const leavesByType = leaves.reduce((acc, leave) => {
        acc[leave.leave_type] = (acc[leave.leave_type] || 0) + 1;
        return acc;
      }, {});

      setStatisticsData({
        users: {
          total: users.length,
          byRole: usersByRole,
          recent: recentUsers
        },
        votes: {
          total: votes.length,
          active: activeVotes,
          completed: completedVotes,
          participationRate: parseFloat(participationRate)
        },
        evaluations: {
          total: evaluations.length,
          completed: completedEvaluations.length,
          averageScores,
          topPerformers,
          departmentStats: departmentStatsArray,
          dimensionStats,
          scoreDistribution,
          monthlyTrend: [] // 可以根据需要添加月度趋势数据
        },
        leaves: {
          total: leaves.length,
          pending: pendingLeaves,
          approved: approvedLeaves,
          totalDays: totalLeaveDays,
          byType: leavesByType
        }
      });

    } catch (error) {
      console.error('加载统计数据错误:', error);
      message.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出数据
  const exportData = (type) => {
    try {
      let data, filename;
      
      switch (type) {
        case 'users':
          data = statisticsData.users;
          filename = `用户统计_${dayjs().format('YYYY-MM-DD')}.json`;
          break;
        case 'evaluations':
          data = statisticsData.evaluations;
          filename = `评价统计_${dayjs().format('YYYY-MM-DD')}.json`;
          break;
        case 'votes':
          data = statisticsData.votes;
          filename = `投票统计_${dayjs().format('YYYY-MM-DD')}.json`;
          break;
        case 'leaves':
          data = statisticsData.leaves;
          filename = `请假统计_${dayjs().format('YYYY-MM-DD')}.json`;
          break;
        default:
          data = statisticsData;
          filename = `全部统计_${dayjs().format('YYYY-MM-DD')}.json`;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      message.success('数据导出成功');
    } catch (error) {
      console.error('导出数据错误:', error);
      message.error('导出数据失败');
    }
  };

  // 角色名称映射
  const roleNames = {
    admin: '管理员',
    town_staff: '镇干部',
    station_staff: '站所人员',
    work_team: '工作队'
  };

  // 请假类型名称映射
  const leaveTypeNames = {
    personal: '私假',
    sick: '病假',
    annual: '年假',
    other: '其他'
  };

  // 顶级表现者表格列
  const topPerformersColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_, __, index) => index + 1
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      ellipsis: true
    },
    {
      title: '平均分',
      dataIndex: 'score',
      key: 'score',
      render: (score) => <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{score}</span>
    },
    {
      title: '评价次数',
      dataIndex: 'evaluationCount',
      key: 'evaluationCount'
    }
  ];

  return (
    <div className="data-statistics">
      {/* 时间范围选择 */}
      <Card className="admin-card" style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <span>统计时间范围：</span>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
              />
              <Button 
                type="primary" 
                icon={<BarChartOutlined />}
                onClick={loadStatistics}
                loading={loading}
              >
                刷新统计
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<DownloadOutlined />}
                onClick={() => exportData('all')}
              >
                导出全部
              </Button>
              <Button 
                icon={<FileExcelOutlined />}
                onClick={() => exportData('evaluations')}
              >
                导出评价数据
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 用户统计 */}
      <Card title="用户统计" className="admin-card">
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Statistic
              title="总用户数"
              value={statisticsData.users.total}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="近7天新增"
              value={statisticsData.users.recent}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          {Object.entries(statisticsData.users.byRole).map(([role, count]) => (
            <Col xs={12} sm={6} key={role}>
              <Statistic
                title={roleNames[role] || role}
                value={count}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
          ))}
        </Row>
        <Divider />
        <Button 
          icon={<DownloadOutlined />}
          onClick={() => exportData('users')}
        >
          导出用户统计
        </Button>
      </Card>

      {/* 投票统计 */}
      <Card title="投票统计" className="admin-card">
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Statistic
              title="总投票数"
              value={statisticsData.votes.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="进行中"
              value={statisticsData.votes.active}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="已完成"
              value={statisticsData.votes.completed}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="参与率"
              value={statisticsData.votes.participationRate}
              suffix="%"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
        </Row>
        <Divider />
        <Button 
          icon={<DownloadOutlined />}
          onClick={() => exportData('votes')}
        >
          导出投票统计
        </Button>
      </Card>

      {/* 评价统计 */}
      <Card title="年度互评统计" className="admin-card">
        <Tabs defaultActiveKey="overview" size="large">
          <TabPane tab="概览统计" key="overview">
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <h4>各维度平均分</h4>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic
                      title="德分"
                      value={statisticsData.evaluations.averageScores.de}
                      suffix="/20"
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="能分"
                      value={statisticsData.evaluations.averageScores.neng}
                      suffix="/20"
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="勤分"
                      value={statisticsData.evaluations.averageScores.qin}
                      suffix="/20"
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="技分"
                      value={statisticsData.evaluations.averageScores.ji}
                      suffix="/20"
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                  <Col span={24}>
                    <Statistic
                      title="廉分"
                      value={statisticsData.evaluations.averageScores.lian}
                      suffix="/20"
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Col>
                </Row>
              </Col>
              <Col xs={24} lg={12}>
                <h4>表现优秀人员 TOP 10</h4>
                <Table
                  columns={topPerformersColumns}
                  dataSource={statisticsData.evaluations.topPerformers}
                  pagination={false}
                  size="small"
                  rowKey="name"
                  scroll={{ y: 300 }}
                />
              </Col>
            </Row>
            <Divider />
            <Space>
              <Statistic
                title="评价总数"
                value={statisticsData.evaluations.total}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
              <Statistic
                title="已完成评价"
                value={statisticsData.evaluations.completed}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
              <Button 
                icon={<DownloadOutlined />}
                onClick={() => exportData('evaluations')}
              >
                导出评价统计
              </Button>
            </Space>
          </TabPane>

          <TabPane tab="可视化分析" key="charts">
            <Row gutter={[24, 24]}>
              {/* 雷达图 - 各维度得分 */}
              <Col xs={24} lg={12}>
                <div style={{ marginBottom: 16 }}>
                  <h4>各维度平均得分雷达图</h4>
                  <Radar
                    data={statisticsData.evaluations.dimensionStats}
                    xField="dimension"
                    yField="score"
                    area={{}}
                    point={{
                      size: 2,
                    }}
                    meta={{
                      score: {
                        alias: '得分',
                        min: 0,
                        max: 20,
                      },
                    }}
                    xAxis={{
                      line: null,
                      tickLine: null,
                    }}
                    yAxis={{
                      label: false,
                      grid: {
                        alternateColor: 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                    height={300}
                  />
                </div>
              </Col>

              {/* 柱状图 - 部门平均分 */}
              <Col xs={24} lg={12}>
                <div style={{ marginBottom: 16 }}>
                  <h4>各部门平均得分排名</h4>
                  <Column
                    data={statisticsData.evaluations.departmentStats}
                    xField="department"
                    yField="averageScore"
                    label={{
                      position: 'middle',
                      style: {
                        fill: '#FFFFFF',
                        opacity: 0.6,
                      },
                    }}
                    xAxis={{
                      label: {
                        autoHide: true,
                        autoRotate: false,
                      },
                    }}
                    meta={{
                      averageScore: {
                        alias: '平均分',
                      },
                    }}
                    height={300}
                  />
                </div>
              </Col>

              {/* 饼图 - 分数分布 */}
              <Col xs={24} lg={12}>
                <div style={{ marginBottom: 16 }}>
                  <h4>评分分布情况</h4>
                  <Pie
                    data={statisticsData.evaluations.scoreDistribution}
                    angleField="count"
                    colorField="range"
                    radius={0.8}
                    label={{
                      type: 'outer',
                      content: '{name} {percentage}',
                    }}
                    interactions={[
                      {
                        type: 'element-active',
                      },
                    ]}
                    height={300}
                  />
                </div>
              </Col>

              {/* 柱状图 - 部门参与情况 */}
              <Col xs={24} lg={12}>
                <div style={{ marginBottom: 16 }}>
                  <h4>部门参与情况统计</h4>
                  <Column
                    data={statisticsData.evaluations.departmentStats}
                    xField="department"
                    yField="evaluationCount"
                    label={{
                      position: 'middle',
                      style: {
                        fill: '#FFFFFF',
                        opacity: 0.6,
                      },
                    }}
                    xAxis={{
                      label: {
                        autoHide: true,
                        autoRotate: false,
                      },
                    }}
                    meta={{
                      evaluationCount: {
                        alias: '评价次数',
                      },
                    }}
                    color="#52c41a"
                    height={300}
                  />
                </div>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* 请假统计 */}
      <Card title="请假统计" className="admin-card">
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Statistic
              title="总申请数"
              value={statisticsData.leaves.total}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="待审批"
              value={statisticsData.leaves.pending}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="已批准"
              value={statisticsData.leaves.approved}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="总请假天数"
              value={statisticsData.leaves.totalDays}
              suffix="天"
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
        
        {Object.keys(statisticsData.leaves.byType).length > 0 && (
          <>
            <Divider />
            <h4>按请假类型统计</h4>
            <Row gutter={[16, 16]}>
              {Object.entries(statisticsData.leaves.byType).map(([type, count]) => (
                <Col xs={12} sm={6} key={type}>
                  <Statistic
                    title={leaveTypeNames[type] || type}
                    value={count}
                    valueStyle={{ color: '#666' }}
                  />
                </Col>
              ))}
            </Row>
          </>
        )}
        
        <Divider />
        <Button 
          icon={<DownloadOutlined />}
          onClick={() => exportData('leaves')}
        >
          导出请假统计
        </Button>
      </Card>
    </div>
  );
};

export default DataStatistics;
