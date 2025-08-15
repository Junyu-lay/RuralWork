import React from 'react';
import { Card, Avatar, Button, Tag } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import './styles.css';

const FeatureCard = ({ 
  id,
  icon, 
  title, 
  description, 
  onClick, 
  disabled = false,
  restricted = false,
  className = ''
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(id);
    }
  };

  return (
    <Card 
      className={`feature-card ${className} ${disabled ? 'disabled' : ''}`}
      hoverable={!disabled}
      onClick={handleClick}
      styles={{ body: { padding: '24px' } }}
    >
      <div className="card-content">
        <div className="card-icon-wrapper">
          <Avatar 
            size={64} 
            icon={icon} 
            className="card-icon"
          />
        </div>
        
        <div className="card-body">
          <div className="card-header">
            <h3 className="card-title">{title}</h3>
            {restricted && (
              <Tag color="orange" size="small">需要权限</Tag>
            )}
          </div>
          
          <p className="card-description">{description}</p>
        </div>
        
        <div className="card-footer">
          <Button 
            type="link" 
            icon={<ArrowRightOutlined />}
            className="card-action-btn"
            disabled={disabled}
          >
            进入功能
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default FeatureCard;
