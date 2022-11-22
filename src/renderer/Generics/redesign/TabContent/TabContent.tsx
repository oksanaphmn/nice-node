import React, { useState } from 'react';
import { container } from './tabContent.css';
import LabelValues from '../LabelValues/LabelValues';
import { getBreakdown } from './getBreakdown';

export interface TabContentProps {
  tabId: string;
}

export interface GranularNodeDataProps {
  sync: {
    maximumBlocksBehind: string;
    minimumBlockTime: string;
    maximumBlockTime: string;
    averageBlockTime: string;
    totalDownTime: string;
  };
  cpu: {
    minimumUsage: string;
    maxUsage: string;
    averageUsage: string;
  };
  memory: {
    minimumUsage: string;
    maxUsage: string;
    averageUsage: string;
  };
  network: {
    dataReceived: string;
    dataSent: string;
    highestPeerCount: string;
    lowestPeerCount: string;
    averagePeerCount: string;
    highestDownloadSpeed: string;
    lowestDownloadSpeed: string;
    averageDownloadSpeed: string;
    highestUploadSpeed: string;
    lowestUploadSpeed: string;
    averageUploadSpeed: string;
  };
  disk: {
    dataWritten: string;
    dataRead: string;
    highestWriteSpeed: string;
    lowestWriteSpeed: string;
    averageWriteSpeed: string;
    highestReadSpeed: string;
    lowestReadSpeed: string;
    averageReadSpeed: string;
  };
}

export const TabContent = ({ tabId }: TabContentProps) => {
  const renderContent = () => {};
  // switch statement here to determine which charts and sections to show?

  // format data passed into TabContent as this?
  const granularNodeData = {
    sync: {
      maximumBlocksBehind: '2',
      minimumBlockTime: '98ms',
      maximumBlockTime: '98ms',
      averageBlockTime: '98ms',
      totalDownTime: '98ms',
    },
    cpu: {
      minimumUsage: '12%',
      maxUsage: '83%',
      averageUsage: '50%',
    },
    memory: {
      minimumUsage: '12%',
      maxUsage: '83%',
      averageUsage: '50%',
    },
    network: {
      dataReceived: '6.62 GB',
      dataSent: '358.1 MB',
      highestPeerCount: '23',
      lowestPeerCount: '13',
      averagePeerCount: '18',
      highestDownloadSpeed: '23.9 MB/s',
      lowestDownloadSpeed: '25 KB/s',
      averageDownloadSpeed: '4.2 MB/s',
      highestUploadSpeed: '2.9 MB/s',
      lowestUploadSpeed: '0 KB/s',
      averageUploadSpeed: '126 KB/s',
    },
    disk: {
      dataWritten: '6.62 GB',
      dataRead: '358.1 MB',
      highestWriteSpeed: '23',
      lowestWriteSpeed: '13',
      averageWriteSpeed: '18',
      highestReadSpeed: '23.9 MB/s',
      lowestReadSpeed: '25 KB/s',
      averageReadSpeed: '4.2 MB/s',
    },
  };

  const breakdownData: { title: string; items: any[] } = {
    title: 'Period breakdown',
    items: getBreakdown(tabId.toLowerCase(), granularNodeData),
  };

  return (
    <div className={container}>
      <div className="breakdown">
        <LabelValues {...breakdownData} />
      </div>
    </div>
  );
};
