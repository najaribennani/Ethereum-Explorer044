import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { useInterval } from 'react-use';
import { Box, Flex, Text } from 'rebass';
import styled from 'styled-components';

import { ethereumClient, createEthereumWebSocketClient } from '../ethereumAdapter';
import { DATA_POLL_DELAY_MS } from '../constants';
import { ReactComponent as ActiveNodesSvg } from '../svgs/computing-cloud.svg';
import { ReactComponent as ConnectionsSvg } from '../svgs/modeling.svg';
import { ReactComponent as OrderbookSvg } from '../svgs/order-book-thing.svg';
import { ReactComponent as XIconSvg } from '../svgs/x.svg';
import { colors } from '../theme';
import { VizceralTraffic, EthereumBlock, EthereumTransaction, EthereumNetworkInfo, EthereumBlockMessage } from '../types';
import { utils } from '../utils';

import { Card } from './Card';
import { Footer } from './Footer';
import { Navigation } from './Navigation';
import { Vizceral } from './Vizceral';

const baseTraffic: VizceralTraffic = {
  // Which graph renderer to use for this graph (currently only 'global' and 'region')
  renderer: 'region',
  // since the root object is a node, it has a name too.
  name: 'Ethereum Network',
  // OPTIONAL: The maximum volume seen recently to relatively measure particle density. This 'global' maxVolume is optional because it can be calculated by using all of the required sub-node maxVolumes.
  maxVolume: 10000,
  // list of nodes for this graph
  nodes: [],
  // list of edges for this graph
  connections: [],
};

const AppContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
  max-width: 100vw;
  padding-left: 32px;
  padding-right: 32px;
`;

const Main = styled.main`
  display: flex;
  flex: 1;
  flex-direction: row;
`;

const GraphContainer = styled.div`
  background-color: ${colors.greyBg};
  display: flex;
  flex: 1;
  flex-direction: row;
  margin-left: 20px;
`;

const GraphHeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  height: 100px;
  flex-direction: row;
  color: #fff;
  width: 100%;
  border-bottom: 2px solid #2e2e2e;
  padding-top: 20px;
  padding-bottom: 8px;
  padding-left: 20px;
`;

const GraphHeaderMetricsContainer = styled.div`
  display: flex;
  flex-direction: row;
`;

const GraphHeaderStatusContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-right: 24px;
`;

const StatusCircle = styled.div`
  background-color: ${colors.zeroExGreen};
  border-radius: 100%;
  height: 16px;
  width: 16px;
  margin-right: 12px;
`;

const StatusLabel = styled.div`
  font-size: 16px;
  color: ${colors.whiteText};
`;

const HeaderVerticalDivider = styled.div`
  height: 100%;
  width: 2px;
  background-color: #2b2b2b;
  margin-right: 24px;
`;

const GraphHeaderMetricContainer = styled.div`
  display: flex;
  align-items: center;
  flex-direction: row;
  margin-bottom: 8px;
  margin-right: 24px;
`;

const GraphHeaderMetricLabel = styled.div`
  color: ${colors.secondaryText};
  font-size: 18px;
  padding-bottom: 10px;
`;

const GraphHeaderMetricValue = styled.div`
  color: ${colors.whiteText};
  font-size: 24px;
`;

const HeaderMetricDataContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding-left: 16px;
`;

const MainGraphPanelContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  position: relative;
`;

// todo(jj) Figure out how to do container ratio better w/out max height ?
// works for now...
const VizceralContainer = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  max-height: 80%;
  padding: 0 16px;
  padding-right: 120px;
`;

const SidePanelContainer = styled.div`
  background-color: #000;
  opacity: 0.8;
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  width: 220px;
  border: 2px solid #2e2e2e;
  border-top: none;
`;

const SidePanelHeaderContainer = styled.div`
  display: flex;
  height: 100px;
  border-bottom: 2px solid #2e2e2e;
  flex-direction: row;
  padding: 0 16px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const LineGraphContainer = styled.div`
  display: flex;
  justify-content: center;
`;

const SidePanelHeaderLabel = styled.div`
  font-size: 24px;
  color: ${colors.whiteText};
`;

const SidePanelHeaderSecondaryLabel = styled.div`
  font-size: 24px;
  cursor: pointer;
  color: ${colors.secondaryText};
  transition: 0.2s color;
  :hover {
    color: ${colors.zeroExGreen};
  }
`;

const Table = styled.table`
  width: calc(100% - 32px);
  color: #fff;
  margin: 10px 16px;
  box-sizing: border-box;
  max-height: 400px;
  overflow-y: auto;
`;

const TableHeaderRow = styled.tr`
  border-bottom: 2px solid #2e2e2e;
`;

const RecentTrandeTableDataRow = styled.tr`
  margin-bottom: 8px;
  margin-top: 8px;
`;

const TableHeaderItem = styled.th`
  padding-top: 8px;
  margin-bottom: 8px;
  box-sizing: border-box;
  height: 30px;
  padding: 10px 0;
  text-align: left;
`;

const TableDataItem = styled.td`
  margin-bottom: 8px;
  margin-top: 8px;
  height: 30px;
  padding-top: 10px;
`;

const NodeDetailPanelContainer = styled.div`
  padding-left: 28px;
`;

const NodeDetailPanelTitle = styled.div`
  font-size: 24px;
  color: ${colors.whiteText};
  padding-top: 42px;
  margin-bottom: 40px;
`;

const NodeDetailLabel = styled.div`
  margin-bottom: 10px;
  color: ${colors.secondaryText};
  font-size: 18px;
`;

const NodeDetailValue = styled.div`
  margin-bottom: 28px;
  color: ${colors.whiteText};
  font-size: 24px;
`;

const XIconContainer = styled.div`
  position: absolute;
  right: 0;
  padding: 16px;
  top: 0;
  cursor: pointer;
`;

const TokenIcon = styled.img`
  height: 24px;
  & + & {
    margin-left: 5px;
  }
`;

export const App: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined);
  const [ethereumTransactions, setEthereumTransactions] = useState<EthereumTransaction[]>([]);
  const [latestBlock, setLatestBlock] = useState<EthereumBlock | null>(null);
  const [networkInfo, setNetworkInfo] = useState<EthereumNetworkInfo>({
    blockNumber: 0,
    gasPrice: '0',
    txCount: 0,
  });
  // tslint:disable-next-line: boolean-naming
  const [userOverrideNodePanel, setUserOverrideNodePanel] = useState<boolean>(false);

  const handleNodeClick = (clickNodeEvent: any | undefined) => {
    if (!clickNodeEvent) {
      // Implies a blur
      return setSelectedNodeId(undefined);
    }
    setUserOverrideNodePanel(false);
    setSelectedNodeId(clickNodeEvent.name);
  };

  const [traffic, setTraffic] = useState<VizceralTraffic>(baseTraffic);
  const [selectedNode] = selectedNodeId ? traffic.nodes.filter(x => x.name === selectedNodeId) : [];

  useInterval(() => {
    const fetchAndSetDataAsync = async () => {
      const graph = await ethereumClient.getVizsceralGraphAsync();
      setTraffic({
        ...baseTraffic,
        name: 'Ethereum Network',
        ...graph,
      });
    };
    // tslint:disable-next-line:no-floating-promises
    fetchAndSetDataAsync();
  }, DATA_POLL_DELAY_MS);

  useEffect(() => {
    const wsClient = createEthereumWebSocketClient();

    wsClient.onmessage = msg => {
      const data: EthereumBlockMessage = JSON.parse(msg.data);
      if (data.type === 'NEW_BLOCK' || data.type === 'INITIAL_STATE') {
        setLatestBlock(data.payload.block);
        setEthereumTransactions(data.payload.transactions);
        setNetworkInfo(data.payload.networkInfo);
      }
    };

    wsClient.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      wsClient.close();
    };
  }, []);

  let connectionCount;
  let activeNodes;
  if (traffic && traffic.nodes.length) {
    connectionCount = traffic.connections.length;
    activeNodes = traffic.nodes.length;
  }
  return (
    <AppContainer>
      <Navigation />
      <Main>
        <Flex overflowY={'auto'} style={{ flexBasis: 370 }} flexDirection={'column'}>
          {/* <Card title="trades" subtitle="last 24 hours">
            <LineGraphContainer>
              <LineGraphWithTooltip
                width={370}
                height={200}
                margin={{
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
              />
            </LineGraphContainer>
          </Card> */}

          <Card height={325} overflowY={'auto'} title="latest transactions">
            <Table>
              <TableHeaderRow>
                <TableHeaderItem>From</TableHeaderItem>
                <TableHeaderItem>To</TableHeaderItem>
                <TableHeaderItem>Value (ETH)</TableHeaderItem>
              </TableHeaderRow>
              {ethereumTransactions.slice(0, 20).map((tx) => {
                return (
                  <RecentTrandeTableDataRow key={tx.hash}>
                    <TableDataItem>{utils.truncateString(tx.from)}</TableDataItem>
                    <TableDataItem>{utils.truncateString(tx.to)}</TableDataItem>
                    <TableDataItem>{parseFloat(tx.value).toFixed(4)}</TableDataItem>
                  </RecentTrandeTableDataRow>
                );
              })}
            </Table>
          </Card>

          <Card height={325} overflowY={'auto'} title="network status">
            <Box margin={20}>
              <Flex flexDirection="column" marginBottom={20}>
                <Text color={colors.secondaryText} fontSize={16} marginBottom={10}>
                  Current Block
                </Text>
                <Text color={colors.whiteText} fontSize={24}>
                  {networkInfo.blockNumber.toLocaleString()}
                </Text>
              </Flex>

              <Flex flexDirection="column" marginBottom={20}>
                <Text color={colors.secondaryText} fontSize={16} marginBottom={10}>
                  Average Gas Price
                </Text>
                <Text color={colors.whiteText} fontSize={24}>
                  {parseFloat(networkInfo.gasPrice).toFixed(2)} Gwei
                </Text>
              </Flex>

              <Flex flexDirection="column" marginBottom={20}>
                <Text color={colors.secondaryText} fontSize={16} marginBottom={10}>
                  Transactions in Last Block
                </Text>
                <Text color={colors.whiteText} fontSize={24}>
                  {networkInfo.txCount}
                </Text>
              </Flex>

              {latestBlock && (
                <>
                  <Flex flexDirection="column" marginBottom={20}>
                    <Text color={colors.secondaryText} fontSize={16} marginBottom={10}>
                      Block Hash
                    </Text>
                    <Text color={colors.whiteText} fontSize={14}>
                      {utils.truncateString(latestBlock.hash)}
                    </Text>
                  </Flex>

                  <Flex flexDirection="column" marginBottom={20}>
                    <Text color={colors.secondaryText} fontSize={16} marginBottom={10}>
                      Miner
                    </Text>
                    <Text color={colors.whiteText} fontSize={14}>
                      {utils.truncateString(latestBlock.miner)}
                    </Text>
                  </Flex>
                </>
              )}
            </Box>
          </Card>

          <Card height={325} mb={0} overflowY={'auto'} title="block information">
            {latestBlock && (
              <Box margin={20}>
                <Flex flexDirection="column" marginBottom={20}>
                  <Text color={colors.secondaryText} fontSize={16} marginBottom={10}>
                    Block Number
                  </Text>
                  <Text color={colors.whiteText} fontSize={24}>
                    {latestBlock.number.toLocaleString()}
                  </Text>
                </Flex>

                <Flex flexDirection="column" marginBottom={20}>
                  <Text color={colors.secondaryText} fontSize={16} marginBottom={10}>
                    Timestamp
                  </Text>
                  <Text color={colors.whiteText} fontSize={18}>
                    {format(new Date(latestBlock.timestamp * 1000), 'dd/MM/yyyy HH:mm:ss')}
                  </Text>
                </Flex>

                <Flex flexDirection="column" marginBottom={20}>
                  <Text color={colors.secondaryText} fontSize={16} marginBottom={10}>
                    Gas Used
                  </Text>
                  <Text color={colors.whiteText} fontSize={18}>
                    {parseInt(latestBlock.gasUsed).toLocaleString()}
                  </Text>
                </Flex>

                <Flex flexDirection="column" marginBottom={20}>
                  <Text color={colors.secondaryText} fontSize={16} marginBottom={10}>
                    Gas Limit
                  </Text>
                  <Text color={colors.whiteText} fontSize={18}>
                    {parseInt(latestBlock.gasLimit).toLocaleString()}
                  </Text>
                </Flex>
              </Box>
            )}
          </Card>
          {/* <Card title="volume" subtitle="last 24 hours">
            <LineGraphContainer>
              <LineGraphWithTooltip
                width={370}
                height={200}
                margin={{
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
              />
            </LineGraphContainer>
          </Card> */}
        </Flex>
        <GraphContainer>
          <MainGraphPanelContainer>
            <GraphHeaderContainer>
              <GraphHeaderMetricsContainer>
                <GraphHeaderMetricContainer>
                  <ActiveNodesSvg fill="#fff" width={40} height={40} />
                  <HeaderMetricDataContainer>
                    <GraphHeaderMetricLabel>block number</GraphHeaderMetricLabel>
                    <GraphHeaderMetricValue>{networkInfo.blockNumber ? networkInfo.blockNumber.toLocaleString() : '-'}</GraphHeaderMetricValue>
                  </HeaderMetricDataContainer>
                </GraphHeaderMetricContainer>
                <HeaderVerticalDivider />
                <GraphHeaderMetricContainer>
                  <ConnectionsSvg fill={'#fff'} width={40} height={40} />
                  <HeaderMetricDataContainer>
                    <GraphHeaderMetricLabel>gas price (gwei)</GraphHeaderMetricLabel>
                    <GraphHeaderMetricValue>
                      {networkInfo.gasPrice ? parseFloat(networkInfo.gasPrice).toFixed(2) : '-'}
                    </GraphHeaderMetricValue>
                  </HeaderMetricDataContainer>
                </GraphHeaderMetricContainer>
                <HeaderVerticalDivider />
                <GraphHeaderMetricContainer>
                  <OrderbookSvg fill="#fff" width={40} height={40} />
                  <HeaderMetricDataContainer>
                    <GraphHeaderMetricLabel>transactions</GraphHeaderMetricLabel>
                    <GraphHeaderMetricValue>
                      {networkInfo.txCount ? networkInfo.txCount.toLocaleString() : '-'}
                    </GraphHeaderMetricValue>
                  </HeaderMetricDataContainer>
                </GraphHeaderMetricContainer>
              </GraphHeaderMetricsContainer>
              <GraphHeaderStatusContainer>
                <StatusCircle />
                <StatusLabel>All systems operational</StatusLabel>
              </GraphHeaderStatusContainer>
            </GraphHeaderContainer>
            <VizceralContainer>
              {traffic.nodes.length > 0 && (
                // Hack updating traffic does not work at the moment
                <Vizceral
                  traffic={traffic}
                  allowDraggingOfNodes={true}
                  viewChanged={() => {}}
                  viewUpdated={() => {}}
                  objectHighlighted={(e: any) => handleNodeClick(e)}
                />
              )}
              <SidePanelContainer>
                {selectedNode && !userOverrideNodePanel ? (
                  <NodeDetailPanelContainer>
                    <XIconContainer onClick={() => setUserOverrideNodePanel(true)}>
                      <XIconSvg />
                    </XIconContainer>
                    <NodeDetailPanelTitle>Node {selectedNode.displayName || selectedNodeId}</NodeDetailPanelTitle>
                    {selectedNode.metadata && (
                      <>
                        <NodeDetailLabel>order count</NodeDetailLabel>
                        <NodeDetailValue>{selectedNode.metadata.numOrders_number || 'n/a'}</NodeDetailValue>
                        <NodeDetailLabel>peer count</NodeDetailLabel>
                        <NodeDetailValue>{selectedNode.metadata.numPeers_number || 'n/a'}</NodeDetailValue>
                        <NodeDetailLabel>ip</NodeDetailLabel>
                        <NodeDetailValue>{selectedNode.metadata.ip || 'n/a'}</NodeDetailValue>
                        <NodeDetailLabel>location</NodeDetailLabel>
                        <NodeDetailValue>
                          {selectedNode?.metadata?.geo?.city
                            ? `${selectedNode.metadata.geo.city}, ${selectedNode.metadata.geo.country}`
                            : selectedNode?.metadata?.geo?.country
                            ? selectedNode.metadata.geo.country
                            : 'N/A'}
                        </NodeDetailValue>
                      </>
                    )}
                  </NodeDetailPanelContainer>
                ) : null}
              </SidePanelContainer>
            </VizceralContainer>
          </MainGraphPanelContainer>
        </GraphContainer>
      </Main>
      <Footer />
    </AppContainer>
  );
};
