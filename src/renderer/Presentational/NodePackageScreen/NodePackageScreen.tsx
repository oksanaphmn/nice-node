// import { useTranslation } from 'react-i18next';

import { useCallback, useEffect, useState } from 'react';
// import { NodeStatus } from '../common/node';
import { useTranslation } from 'react-i18next';
import { NodeStatus } from '../../../common/node.js';
import Button from '../../Generics/redesign/Button/Button';
import type { ClientProps, NodeAction } from '../../Generics/redesign/consts';
import { getStatusObject } from '../../Generics/redesign/utils.js';
import type { NodeBackgroundId } from '../../assets/images/nodeBackgrounds';
import electron from '../../electronGlobal';
// import { useGetNodesQuery } from './state/nodeService';
import { useAppDispatch, useAppSelector } from '../../state/hooks';
import { setModalState } from '../../state/modal';
import { useGetNetworkConnectedQuery } from '../../state/network';
import {
  selectIsAvailableForPolling,
  selectSelectedNodePackage,
  selectUserNodes,
} from '../../state/node';
import {
  useGetExecutionIsSyncingQuery,
  useGetExecutionLatestBlockQuery,
  useGetExecutionPeersQuery,
} from '../../state/services';
import { useGetIsPodmanRunningQuery } from '../../state/settingsService';
import { hexToDecimal } from '../../utils';
import { getSyncData } from '../../utils.js';
import ContentMultipleClients from '../ContentMultipleClients/ContentMultipleClients';
import type { SingleNodeContent } from '../ContentSingleClient/ContentSingleClient';
import {
  container,
  contentContainer,
  descriptionFont,
  titleFont,
} from './NodePackageScreen.css';

let alphaModalRendered = false;

const NodePackageScreen = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedNodePackage = useAppSelector(selectSelectedNodePackage);
  const sUserNodes = useAppSelector(selectUserNodes);
  const [sFormattedServices, setFormattedServices] = useState<ClientProps[]>(
    [],
  );
  const [sDiskUsed, setDiskUsed] = useState<number>(0);
  const [sCpuPercentUsed, setCpuPercentUsed] = useState<number>(0);
  const [sMemoryUsagePercent, setMemoryUsagePercent] = useState<number>(0);
  const [sHasSeenAlphaModal, setHasSeenAlphaModal] = useState<boolean>();
  const [sLatestBlockNumber, setLatestBlockNumber] = useState<number>(0);
  const [sNetworkNodePackage, setNetworkNodePackage] = useState<string>('');
  const sIsAvailableForPolling = useAppSelector(selectIsAvailableForPolling);
  const pollingInterval = sIsAvailableForPolling ? 15000 : 0;

  const executionNode = selectedNodePackage?.services.find(
    (service) => service.serviceId === 'executionClient',
  );
  const consensusNode = selectedNodePackage?.services.find(
    (service) => service.serviceId === 'consensusClient',
  );
  const executionNodeId = executionNode?.node.id;
  const consensusNodeId = consensusNode?.node.id;
  const executionHttpPort =
    executionNodeId &&
    sUserNodes?.nodes[executionNodeId]?.config.configValuesMap.httpPort;
  const consensusHttpPort =
    consensusNodeId &&
    sUserNodes?.nodes[consensusNodeId]?.config.configValuesMap.httpPort;
  const rpcTranslation = selectedNodePackage?.spec.rpcTranslation;
  const isEthereumNodePackage =
    selectedNodePackage?.spec?.specId === 'ethereum';
  const qPublicExecutionLatestBlock = useGetExecutionLatestBlockQuery(
    {
      rpcTranslation,
      httpPort: executionHttpPort,
      url: 'https://ethereum-rpc.publicnode.com',
    },
    { pollingInterval },
  );
  const qConsensusIsSyncing = useGetExecutionIsSyncingQuery(
    {
      rpcTranslation: consensusNode?.node?.spec?.rpcTranslation,
      httpPort: consensusHttpPort,
    },
    { pollingInterval },
  );
  const qExecutionIsSyncing = useGetExecutionIsSyncingQuery(
    { rpcTranslation, httpPort: executionHttpPort },
    { pollingInterval },
  );
  const qExecutionPeers = useGetExecutionPeersQuery(
    { rpcTranslation, httpPort: executionHttpPort },
    { pollingInterval },
  );
  const qExecutionLatestBlock = useGetExecutionLatestBlockQuery(
    { rpcTranslation, httpPort: executionHttpPort },
    { pollingInterval },
  );
  const qConsensusLatestBlock = useGetExecutionLatestBlockQuery(
    {
      rpcTranslation: consensusNode?.node?.spec?.rpcTranslation,
      httpPort: consensusHttpPort,
    },
    { pollingInterval },
  );
  const qIsPodmanRunning = useGetIsPodmanRunningQuery(null, {
    pollingInterval: 15000,
  });
  const isPodmanRunning = !qIsPodmanRunning?.fetching && qIsPodmanRunning?.data;
  // temporary until network is set at the node package level
  const qNetwork = useGetNetworkConnectedQuery(null, {
    pollingInterval: 30000,
  });

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
    const savedSyncedBlock =
      selectedNodePackage?.runtime?.usage?.syncedBlock || 0;
    if (qExecutionLatestBlock.isError) {
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

    const blockNumber = isEthereumNodePackage
      ? qExecutionLatestBlock?.data
      : qExecutionLatestBlock?.data?.number;
    const slotNumber = qExecutionLatestBlock?.data?.header?.message?.slot;
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
  }, [qExecutionLatestBlock, selectedNodePackage]);

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
          iconUrl: service.node.spec.iconUrl,
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

  // Check and stop the NodePackage if all services are stopped
  useEffect(() => {
    const checkAndStopNodePackage = async () => {
      if (selectedNodePackage?.status === NodeStatus.running) {
        const allServicesStopped = selectedNodePackage.services.every(
          (service) => {
            const nodeId = service.node.id;
            const nodeStatus = sUserNodes?.nodes[nodeId]?.status;
            return nodeStatus === NodeStatus.stopped;
          },
        );
        if (allServicesStopped) {
          await electron.stopNodePackage(selectedNodePackage.id);
        }
      }
    };
    checkAndStopNodePackage();
  }, [selectedNodePackage, sUserNodes]);

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
  // console.log('nodePackageStatus', status);
  // todo: get node type, single or multi-service
  // parse node details from selectedNodePackage => SingleNodeContent
  // todo: add stop/start ability?

  // TODO: make this more flexible for other client specs
  const formatSpec = (info: string | undefined) =>
    info ? `${info} ${sNetworkNodePackage}` : sNetworkNodePackage || '';

  const clientName = spec.specId.replace('-beacon', '');

  const executionSyncData = getSyncData(
    qExecutionIsSyncing,
    qExecutionPeers,
    qNetwork.status === 'rejected',
    selectedNodePackage?.lastRunningTimestampMsl,
    false,
    selectedNodePackage?.initialSyncFinished,
  );

  const consensusIsSyncing = qConsensusIsSyncing?.isError
    ? undefined
    : qConsensusIsSyncing?.data?.isSyncing || false;

  const executionLatestBlockNumber = qExecutionLatestBlock?.data;
  const isSynced = (executionBlockNumber: number, otherBlockNumber: number) => {
    return Math.abs(executionBlockNumber - otherBlockNumber) < 120; // ~30 minutes of blocks, should be fairly close to be considered synced
  };

  const isEthereumNodePackageSynced = () => {
    return (
      // Check if the execution block is close to the execution block contained within the consensus block
      isSynced(
        executionLatestBlockNumber,
        qConsensusLatestBlock?.data?.message?.body?.execution_payload
          ?.block_number,
      ) ||
      // If not, check if our execution block number is close to the public node that is already synced
      isSynced(executionLatestBlockNumber, qPublicExecutionLatestBlock?.data)
    );
  };

  const isSyncing =
    executionSyncData?.isSyncing ||
    consensusIsSyncing ||
    (isEthereumNodePackage && !isEthereumNodePackageSynced);

  const nodePackageSyncData = {
    ...executionSyncData,
    isSyncing,
  };

  console.log('nodePackage1', qExecutionIsSyncing);
  console.log('nodePackage2', qConsensusIsSyncing);
  console.log('nodePackage3', nodePackageSyncData);

  if (
    nodePackageSyncData.isSyncing === false &&
    selectedNodePackage?.status === NodeStatus.running &&
    selectedNodePackage?.initialSyncFinished === undefined
  ) {
    electron.updateNodePackage(selectedNodePackage.id, {
      initialSyncFinished: true,
    });
  }

  console.log('statusObject', getStatusObject(status, nodePackageSyncData));

  const nodePackageContent: SingleNodeContent = {
    nodeId: selectedNodePackage.id,
    displayName: spec.displayName,
    name: clientName as NodeBackgroundId,
    iconUrl: spec.iconUrl,
    screenType: 'client',
    rpcTranslation: spec.rpcTranslation,
    info: formatSpec(spec.displayTagline),
    status: getStatusObject(status, nodePackageSyncData),
    stats: {
      peers: nodePackageSyncData.peers,
      currentBlock: sLatestBlockNumber,
      diskUsageGBs: sDiskUsed,
      memoryUsagePercent: sMemoryUsagePercent,
      cpuLoad: sCpuPercentUsed,
    },
    onAction: onNodeAction,
    description: spec.description,
    resources: spec.resources,
    documentation: spec.documentation,
  };

  console.log('nodePackageScreen', nodePackageContent.status);

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
