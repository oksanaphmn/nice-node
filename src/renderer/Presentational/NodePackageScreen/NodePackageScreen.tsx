// import { useTranslation } from 'react-i18next';

import { useCallback, useEffect, useState } from 'react';
// import { NodeStatus } from '../common/node';
import { useTranslation } from 'react-i18next';
import { NodeStatus } from '../../../common/node.js';
import Button from '../../Generics/redesign/Button/Button';
import type { ClientProps, NodeAction } from '../../Generics/redesign/consts';
import { SYNC_STATUS } from '../../Generics/redesign/consts';
import { getStatusObject } from '../../Generics/redesign/utils.js';
import type { NodeBackgroundId } from '../../assets/images/nodeBackgrounds';
import electron from '../../electronGlobal';
// import { useGetNodesQuery } from './state/nodeService';
import { useAppDispatch, useAppSelector } from '../../state/hooks';
import { setModalState } from '../../state/modal';
import { useGetNetworkConnectedQuery } from '../../state/network';
import { selectSelectedNodePackage, selectUserNodes } from '../../state/node';
import {
  useGetExecutionIsSyncingQuery,
  useGetExecutionLatestBlockQuery,
  useGetExecutionPeersQuery,
} from '../../state/services';
import { useGetIsPodmanRunningQuery } from '../../state/settingsService';
import { getSyncDataForServiceAndNode } from '../../utils.js';
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
  const [sResourceUsage, setResourceUsage] = useState({
    disk: 0,
    cpu: 0,
    memory: 0,
  });
  const [sHasSeenAlphaModal, setHasSeenAlphaModal] = useState<boolean>();
  const [sNetworkNodePackage, setNetworkNodePackage] = useState<string>('');
  const pollingInterval =
    selectedNodePackage?.status === SYNC_STATUS.RUNNING ? 15000 : 0;

  const executionService = selectedNodePackage?.services.find(
    (service) => service.serviceId !== 'consensusClient',
  );
  const consensusService = selectedNodePackage?.services.find(
    (service) => service.serviceId === 'consensusClient',
  );
  const executionServiceId = executionService?.node.id;
  const consensusServiceId = consensusService?.node.id;
  const executionNode = sUserNodes?.nodes[executionServiceId];
  const consensusNode = sUserNodes?.nodes[consensusServiceId];
  const executionHttpPort =
    executionServiceId && executionNode?.config.configValuesMap.httpPort;
  const consensusHttpPort =
    consensusServiceId && consensusNode?.config.configValuesMap.httpPort;
  const isEthereumNodePackage =
    selectedNodePackage?.spec?.specId === 'ethereum';
  const executionRpcTranslation = executionService?.node?.spec?.rpcTranslation;
  const consensusRpcTranslation = consensusService?.node?.spec?.rpcTranslation;
  const qPublicExecutionLatestBlock = useGetExecutionLatestBlockQuery(
    {
      rpcTranslation: executionRpcTranslation,
      httpPort: executionHttpPort,
      url: 'https://ethereum-rpc.publicnode.com',
    },
    { pollingInterval },
  );
  const qExecutionIsSyncing = useGetExecutionIsSyncingQuery(
    {
      rpcTranslation: executionRpcTranslation,
      httpPort: executionHttpPort,
      specId: executionNode?.spec.specId,
    },
    { pollingInterval },
  );
  const qExecutionPeers = useGetExecutionPeersQuery(
    {
      rpcTranslation: executionRpcTranslation,
      httpPort: executionHttpPort,
      specId: executionNode?.spec.specId,
    },
    { pollingInterval },
  );
  const qExecutionLatestBlock = useGetExecutionLatestBlockQuery(
    { rpcTranslation: executionRpcTranslation, httpPort: executionHttpPort },
    { pollingInterval },
  );
  const qConsensusIsSyncing = useGetExecutionIsSyncingQuery(
    {
      rpcTranslation: consensusRpcTranslation,
      httpPort: consensusHttpPort,
      specId: consensusNode?.spec.specId,
    },
    { pollingInterval },
  );
  const qConsensusPeers = useGetExecutionPeersQuery(
    {
      rpcTranslation: consensusRpcTranslation,
      httpPort: consensusHttpPort,
      specId: consensusNode?.spec.specId,
    },
    { pollingInterval },
  );
  const qConsensusLatestBlock = useGetExecutionLatestBlockQuery(
    {
      rpcTranslation: consensusRpcTranslation,
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
    setNetworkNodePackage(
      selectedNodePackage?.config?.configValuesMap?.network || '',
    );
  }, [selectedNodePackage]);

  // use to show if internet is disconnected
  // const qNetwork = useGetNetworkConnectedQuery(null, {
  //   // Only polls network connection if there are exactly 0 peers
  //   pollingInterval: typeof sPeers === 'number' && sPeers === 0 ? 30000 : 0,
  // });

  // calc node package resource usage
  useEffect(() => {
    const calculateResourceUsage = () => {
      let disk = 0;
      let cpu = 0;
      let memory = 0;
      selectedNodePackage?.services.forEach((service) => {
        const node = sUserNodes?.nodes[service.node.id];
        disk += node?.runtime?.usage?.diskGBs?.[0]?.y ?? 0;
        cpu += node?.runtime?.usage?.cpuPercent?.[0]?.y ?? 0;
        memory += node?.runtime?.usage?.memoryBytes?.[0]?.y ?? 0;
      });
      setResourceUsage({ disk, cpu, memory });
    };
    calculateResourceUsage();
  }, [selectedNodePackage?.services, sUserNodes]);

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

  const getSyncDataForService = useCallback(
    (service: any, node: any) => {
      return getSyncDataForServiceAndNode(
        service,
        node,
        qExecutionIsSyncing,
        qConsensusIsSyncing,
        qExecutionPeers,
        qConsensusPeers,
        qNetwork.status,
      );
    },
    [
      qExecutionIsSyncing,
      qConsensusIsSyncing,
      qExecutionPeers,
      qConsensusPeers,
      qNetwork.status,
    ],
  );

  useEffect(() => {
    const formattedServices: ClientProps[] =
      selectedNodePackage?.services.map((service) => {
        const { id: nodeId, spec } = service.node;
        const node = sUserNodes?.nodes[nodeId];
        if (!node) return null;
        console.log('nodeWee', node);
        // support other non-ethereum services
        const isNotConsensusClient = service.serviceId !== 'consensusClient';
        const syncData = getSyncDataForService(service, node);

        const stats = isNotConsensusClient
          ? {
              currentBlock: qExecutionIsSyncing?.data?.currentBlock || 0,
              highestBlock: qExecutionIsSyncing?.data?.highestBlock || 0,
            }
          : {
              currentSlot: qConsensusIsSyncing?.data?.currentSlot || 0,
              highestSlot: qConsensusIsSyncing?.data?.highestSlot || 0,
            };
        console.log('nodeStatus', getStatusObject(node?.status, syncData));
        return {
          id: nodeId,
          iconUrl: spec.iconUrl,
          name: spec.specId,
          displayName: spec.displayName as NodeBackgroundId,
          version: '',
          nodeType: service.serviceName,
          serviceId: service.serviceId,
          status: getStatusObject(node?.status, syncData),
          stats,
          resources: spec.resources,
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

  const { id, status, spec, initialSyncFinished } = selectedNodePackage;
  // console.log('nodePackageStatus', status);
  // todo: get node type, single or multi-service
  // parse node details from selectedNodePackage => SingleNodeContent
  // todo: add stop/start ability?

  // TODO: make this more flexible for other client specs
  const formatSpec = (info: string | undefined) =>
    info ? `${info} ${sNetworkNodePackage}` : sNetworkNodePackage || '';

  const clientName = spec.specId.replace('-beacon', '');

  const executionSyncData =
    executionService && executionNode
      ? getSyncDataForService(executionService, executionNode)
      : undefined;
  const consensusSyncData =
    consensusService && consensusNode
      ? getSyncDataForService(consensusService, consensusNode)
      : undefined;

  const isEthereumNodePackageSynced = () => {
    const isSynced = (
      executionBlockNumber: number,
      otherBlockNumber: number,
    ) => {
      return Math.abs(executionBlockNumber - otherBlockNumber) < 120; // ~30 minutes of blocks, should be fairly close to be considered synced
    };
    const executionLatestBlockNumber = qExecutionLatestBlock?.data;
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

  const isNodePackageSyncing =
    executionSyncData?.isSyncing ||
    consensusSyncData?.isSyncing ||
    (executionSyncData?.isSyncing === undefined &&
      consensusSyncData?.isSyncing === undefined) ||
    (isEthereumNodePackage && !isEthereumNodePackageSynced());

  const nodePackageSyncData = {
    ...executionSyncData,
    isSyncing: isNodePackageSyncing,
    updateAvailable: false,
  };

  console.log('nodePackage1', executionSyncData);
  console.log('nodePackage2', consensusSyncData);
  console.log('nodePackage3', nodePackageSyncData);

  if (
    nodePackageSyncData.isSyncing === false &&
    status === NodeStatus.running &&
    initialSyncFinished === undefined
  ) {
    electron.updateNodePackage(id, {
      initialSyncFinished: true,
    });
  }

  const nodePackageContent: SingleNodeContent = {
    nodeId: id,
    displayName: spec.displayName,
    name: clientName as NodeBackgroundId,
    iconUrl: spec.iconUrl,
    screenType: 'client',
    rpcTranslation: spec.rpcTranslation,
    info: formatSpec(spec.displayTagline),
    status: getStatusObject(status, nodePackageSyncData),
    stats: {
      peers: nodePackageSyncData.peers,
      diskUsageGBs: sResourceUsage.disk,
      memoryUsagePercent: sResourceUsage.memory,
      cpuLoad: sResourceUsage.cpu,
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
