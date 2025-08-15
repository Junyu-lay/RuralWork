import React from 'react';
import { Card, Button, Result } from 'antd';
import { ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './styles.css';

const PagePlaceholder = ({ 
  title = '功能开发中', 
  description = '该功能正在开发中，敬请期待！',
  icon = null,
  showBackButton = true,
  showHomeButton = true 
}) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/welcome');
  };

  return (
    <div className="page-placeholder-container">
      <Card className="placeholder-card">
        <Result
          icon={icon}
          title={title}
          subTitle={description}
          extra={[
            showBackButton && (
              <Button 
                key="back"
                icon={<ArrowLeftOutlined />} 
                onClick={handleGoBack}
              >
                返回上页
              </Button>
            ),
            showHomeButton && (
              <Button 
                key="home"
                type="primary" 
                icon={<HomeOutlined />}
                onClick={handleGoHome}
              >
                返回主页
              </Button>
            )
          ].filter(Boolean)}
        />
      </Card>
    </div>
  );
};

export default PagePlaceholder;
