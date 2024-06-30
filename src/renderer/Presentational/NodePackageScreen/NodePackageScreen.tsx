// import { useTranslation } from 'react-i18next';

import { useCallback, useEffect, useState } from 'react';
// import { NodeStatus } from '../common/node';
import { useTranslation } from 'react-i18next';
import Button from '../../Generics/redesign/Button/Button';
import type { ClientProps, NodeAction } from '../../Generics/redesign/consts';
import type { NodeBackgroundId } from '../../assets/images/nodeBackgrounds';
import electron from '../../electronGlobal';
// import { useGetNodesQuery } from './state/nodeService';
import { useAppDispatch, useAppSelector } from '../../state/hooks';
import { setModalState } from '../../state/modal';
import {
  selectIsAvailableForPolling,
  selectSelectedNodePackage,
  selectUserNodes,
} from '../../state/node';
import {
  useGetExecutionIsSyncingQuery,
  useGetExecutionLatestBlockQuery,
  useGetExecutionPeersQuery,
  useGetNodeVersionQuery,
} from '../../state/services';
import { useGetIsPodmanRunningQuery } from '../../state/settingsService';
import { hexToDecimal } from '../../utils';
import ContentMultipleClients from '../ContentMultipleClients/ContentMultipleClients';
// import { useGetNetworkConnectedQuery } from './state/network';
import type { SingleNodeContent } from '../ContentSingleClient/ContentSingleClient';
import {
  container,
  contentContainer,
  descriptionFont,
  titleFont,
} from './NodePackageScreen.css';
import { getStatusObject } from '../../Generics/redesign/utils.js';

let alphaModalRendered = false;

const NodePackageScreen = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedNodePackage = useAppSelector(selectSelectedNodePackage);
  const sUserNodes = useAppSelector(selectUserNodes);
  const qNodeVersion = useGetNodeVersionQuery(
    selectedNodePackage?.spec.rpcTranslation,
  );
  const [sFormattedServices, setFormattedServices] = useState<ClientProps[]>();
  // we will bring these vars back in the future
  const [sIsSyncing, setIsSyncing] = useState<boolean>();
  const [sSyncPercent, setSyncPercent] = useState<string>('');
  const [sPeers, setPeers] = useState<number>();
  const [sDiskUsed, setDiskUsed] = useState<number>(0);
  const [sCpuPercentUsed, setCpuPercentUsed] = useState<number>(0);
  const [sMemoryUsagePercent, setMemoryUsagePercent] = useState<number>(0);
  const [sHasSeenAlphaModal, setHasSeenAlphaModal] = useState<boolean>();
  const [sLatestBlockNumber, setLatestBlockNumber] = useState<number>(0);
  const sIsAvailableForPolling = useAppSelector(selectIsAvailableForPolling);
  const pollingInterval = sIsAvailableForPolling ? 15000 : 0;
  const executionNode = selectedNodePackage?.services.find((service) => {
    return service.serviceId === 'executionClient';
  });
  const nodeId = executionNode?.node.id;
  const httpPort =
    nodeId && sUserNodes?.nodes[nodeId]?.config.configValuesMap.httpPort;
  const rpcTranslation = selectedNodePackage?.spec.rpcTranslation;
  const qExecutionIsSyncing = useGetExecutionIsSyncingQuery(
    {
      rpcTranslation,
      httpPort,
    },
    {
      pollingInterval,
    },
  );
  const qExecutionPeers = useGetExecutionPeersQuery(
    {
      rpcTranslation,
      httpPort,
    },
    {
      pollingInterval,
    },
  );
  const qLatestBlock = useGetExecutionLatestBlockQuery(
    {
      rpcTranslation,
      httpPort,
    },
    {
      pollingInterval,
    },
  );
  const qIsPodmanRunning = useGetIsPodmanRunningQuery(null, {
    pollingInterval: 15000,
  });
  let isPodmanRunning = true;
  if (qIsPodmanRunning && !qIsPodmanRunning.fetching) {
    isPodmanRunning = qIsPodmanRunning.data;
  }
  // temporary until network is set at the node package level
  const [sNetworkNodePackage, setNetworkNodePackage] = useState<string>('');

  useEffect(() => {
    if (selectedNodePackage?.config?.configValuesMap?.network) {
      setNetworkNodePackage(
        selectedNodePackage?.config?.configValuesMap?.network,
      );
    } else {
      setNetworkNodePackage('');
    }
  }, [selectedNodePackage]);
  // use to show if internet is disconnected
  // const qNetwork = useGetNetworkConnectedQuery(null, {
  //   // Only polls network connection if there are exactly 0 peers
  //   pollingInterval: typeof sPeers === 'number' && sPeers === 0 ? 30000 : 0,
  // });

  // calc node package resource usage
  useEffect(() => {
    // format for presentation
    let diskUsedGBs = 0;
    let cpuPercent = 0;
    let memoryPercent = 0;
    selectedNodePackage?.services.map((service) => {
      const nodeId = service.node.id;
      const node = sUserNodes?.nodes[nodeId];
      diskUsedGBs += node?.runtime?.usage?.diskGBs?.[0]?.y ?? 0;
      cpuPercent += node?.runtime?.usage?.cpuPercent?.[0]?.y ?? 0;
      memoryPercent += node?.runtime?.usage?.memoryBytes?.[0]?.y ?? 0;
    });
    setDiskUsed(diskUsedGBs);
    setCpuPercentUsed(cpuPercent);
    setMemoryUsagePercent(memoryPercent);
  }, [selectedNodePackage?.services, sUserNodes]);

  useEffect(() => {
    if (!sIsAvailableForPolling) {
      // clear all node data when it becomes unavailable to get
      setSyncPercent('');
      setIsSyncing(undefined);
      setPeers(undefined);
      setLatestBlockNumber(0);
    }
  }, [sIsAvailableForPolling]);

  useEffect(() => {
    console.log('qExecutionIsSyncing: ', qExecutionIsSyncing);
    if (qExecutionIsSyncing.isError) {
      setSyncPercent('');
      setIsSyncing(undefined);
      return;
    }
    const syncingData = qExecutionIsSyncing.data;
    if (typeof syncingData === 'object') {
      setSyncPercent('');
      setIsSyncing(syncingData.isSyncing);
    } else if (syncingData === false) {
      // for nodes that do not have sync percent or other sync data
      setSyncPercent('');
      setIsSyncing(false);
    } else {
      setSyncPercent('');
      setIsSyncing(undefined);
    }
  }, [qExecutionIsSyncing]);

  useEffect(() => {
    console.log('qExecutionPeers: ', qExecutionPeers.data);
    if (qExecutionPeers.isError) {
      setPeers(undefined);
      return;
    }
    if (typeof qExecutionPeers.data === 'string') {
      setPeers(qExecutionPeers.data);
    } else if (typeof qExecutionPeers.data === 'number') {
      setPeers(qExecutionPeers.data.toString());
    } else {
      setPeers(undefined);
    }
  }, [qExecutionPeers]);

  useEffect(() => {
    const savedSyncedBlock =
      selectedNodePackage?.runtime?.usage?.syncedBlock || 0;
    if (qLatestBlock.isError) {
      setLatestBlockNumber(savedSyncedBlock);
      return;
    }

    const updateNodeLastSyncedBlock = async (latestBlockNum: number) => {
      if (!selectedNodePackage) {
        return;
      }
      await electron.updateNodeLastSyncedBlock(
        selectedNodePackage.id,
        latestBlockNum,
      );
    };

    const blockNumber = qLatestBlock?.data?.number;
    const slotNumber = qLatestBlock?.data?.header?.message?.slot;
    const rpcTranslation = selectedNodePackage?.spec?.rpcTranslation;

    let latestBlockNum = 0;
    if (
      blockNumber &&
      typeof blockNumber === 'string' &&
      rpcTranslation === 'eth-l1'
    ) {
      latestBlockNum = hexToDecimal(blockNumber);
    } else if (
      slotNumber &&
      typeof slotNumber === 'string' &&
      rpcTranslation === 'eth-l1-beacon'
    ) {
      latestBlockNum = Number.parseFloat(slotNumber);
    }

    const syncedBlock =
      latestBlockNum > savedSyncedBlock ? latestBlockNum : savedSyncedBlock;
    setLatestBlockNumber(syncedBlock);
    updateNodeLastSyncedBlock(syncedBlock);
  }, [qLatestBlock, selectedNodePackage]);

  const onNodeAction = useCallback(
    (action: NodeAction) => {
      console.log('NodeAction for node: ', action, selectedNodePackage);
      if (selectedNodePackage) {
        if (action === 'start') {
          electron.startNode(selectedNodePackage.id);
        } else if (action === 'stop') {
          electron.stopNode(selectedNodePackage.id);
        } else if (action === 'logs') {
          // show logs
        } else if (action === 'settings') {
          // show settings
        }
      }
    },
    [selectedNodePackage],
  );

  useEffect(() => {
    const setAlphaModal = async () => {
      const hasSeenAlpha = await electron.getSetHasSeenAlphaModal();
      setHasSeenAlphaModal(hasSeenAlpha || false);
    };
    setAlphaModal();
  }, []);

  useEffect(() => {
    const formattedServices: ClientProps[] =
      selectedNodePackage?.services.map((service) => {
        const nodeId = service.node.id;
        const node = sUserNodes?.nodes[nodeId];
        const data = qExecutionIsSyncing?.data;
        const stats =
          service.serviceName === 'Execution Client'
            ? {
                currentBlock: data?.currentBlock || 0,
                highestBlock: data?.highestBlock || 0,
              }
            : {
                currentSlot: data?.currentSlot || 0,
                highestSlot: data?.highestSlot || 0,
              };
        console.log('nodeStatus', node?.status);
        return {
          id: service.node.id,
          name: service.node.spec.specId,
          displayName: service.node.spec.displayName as NodeBackgroundId,
          version: '',
          nodeType: service.serviceName,
          status: getStatusObject(node?.status),
          stats,
          resources: service.node.spec.resources,
        };
      }) ?? [];
    setFormattedServices(formattedServices);
  }, [selectedNodePackage?.services, sUserNodes]);

  if (sHasSeenAlphaModal === false && !alphaModalRendered) {
    dispatch(
      setModalState({
        isModalOpen: true,
        screen: { route: 'alphaBuild', type: 'info' },
      }),
    );
    alphaModalRendered = true;
  }

  if (!selectedNodePackage) {
    // if there is no node selected, prompt user to create a new node
    return (
      <div className={container}>
        <div className={contentContainer}>
          <div className={titleFont}>{t('NoActiveNodes')}</div>
          <div className={descriptionFont}>{t('AddFirstNode')}</div>
          <Button
            label={t('AddNode')}
            variant="icon-left"
            iconId="add"
            type="primary"
            onClick={() => {
              dispatch(
                setModalState({
                  isModalOpen: true,
                  screen: { route: 'addNode', type: 'modal' },
                }),
              );
            }}
          />
        </div>
      </div>
    );
  }

  const { status, spec } = selectedNodePackage;
  // todo: get node type, single or multi-service
  // parse node details from selectedNodePackage => SingleNodeContent
  // todo: add stop/start ability?

  // TODO: make this more flexible for other client specs
  const formatSpec = (info: string | undefined) => {
    let result = '';
    if (info) {
      result = `${info} ${sNetworkNodePackage}`;
    } else if (sNetworkNodePackage !== '') {
      result = `${sNetworkNodePackage}`;
    }
    return result;
  };

  const formatVersion = (version: string | undefined) => {
    if (!version) {
      return '';
    }
    return version;
  };

  const clientName = spec.specId.replace('-beacon', '');
  const nodeVersionData =
    typeof qNodeVersion === 'string' ? qNodeVersion : qNodeVersion?.currentData;

  const nodePackageContent: SingleNodeContent = {
    nodeId: selectedNodePackage.id,
    displayName: spec.displayName,
    name: clientName as NodeBackgroundId,
    screenType: 'client',
    rpcTranslation: spec.rpcTranslation,
    version: formatVersion(nodeVersionData), // todo: remove
    info: formatSpec(spec.displayTagline),
    status: getStatusObject(status),
    stats: {
      peers: sPeers,
      currentBlock: sLatestBlockNumber,
      diskUsageGBs: sDiskUsed,
      memoryUsagePercent: sMemoryUsagePercent,
      cpuLoad: sCpuPercentUsed,
    },
    onAction: onNodeAction,
    description: spec.description,
    resources: spec.resources,
  };

  /**
   * export interface ClientStatusProps {
  updating?: boolean;
  initialized?: boolean; // initial initialization is done
  synchronized?: boolean; // constantly updated from checking current / height slot or block
  lowPeerCount?: boolean;
  updateAvailable?: boolean;
  blocksBehind?: boolean;
  noConnection?: boolean;
  stopped?: boolean;
  error?: boolean;
}

export interface ClientStatsProps {
  currentBlock?: number;
  highestBlock?: number;
  currentSlot?: number;
  highestSlot?: number;
  peers?: number;
  cpuLoad?: number;
  diskUsageGBs?: number;
  rewards?: number;
  balance?: number;
  stake?: number;
}

export interface ClientProps {
  name: NodeBackgroundId;
  version: string;
  nodeType: string;
  status: ClientStatusProps;
  stats: ClientStatsProps;
}
   */
  console.log('passing content to NodePackageScreen: ', nodePackageContent);

  // todo: use ContentMultiClient
  // return <ContentSingleClient {...nodeContent} />;

  if (!sFormattedServices) {
    return null;
  }

  return (
    <ContentMultipleClients
      clients={sFormattedServices}
      nodeContent={nodePackageContent}
      isPodmanRunning={isPodmanRunning}
    />
  );
};
export default NodePackageScreen;
