package com.landchain.api.blockchain.service;

import com.landchain.api.blockchain.engine.FabricLedgerEngine;
import com.landchain.api.blockchain.model.BlockchainTransaction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class FabricGatewayService {

    private final FabricLedgerEngine ledgerEngine;

    @Value("${landchain.fabric.channel-name:landchannel}")
    private String channelName;

    @Value("${landchain.fabric.chaincode-name:landchain}")
    private String chaincodeName;

    @Value("${landchain.fabric.peer-endpoint:embedded-peer:7051}")
    private String peerEndpoint;

    @Value("${landchain.fabric.msp-id:Org1MSP}")
    private String defaultMspId;

    public boolean isConnected() {
        return ledgerEngine.isNetworkAvailable();
    }

    public void setNetworkAvailable(boolean available) {
        ledgerEngine.setNetworkAvailable(available);
    }

    public String getChannelName() {
        return channelName;
    }

    public String getChaincodeName() {
        return chaincodeName;
    }

    public String getPeerEndpoint() {
        return peerEndpoint;
    }

    public Map<String, Object> getNetworkStatus() {
        return Map.of(
                "connected", isConnected(),
                "channel", channelName,
                "chaincode", chaincodeName,
                "peerEndpoint", peerEndpoint,
                "defaultMspId", defaultMspId,
                "blockHeight", ledgerEngine.getCurrentBlockHeight(),
                "lastBlockHash", ledgerEngine.getLastBlockHash()
        );
    }

    public BlockchainTransaction getTransaction(String txId) {
        return ledgerEngine.getTransaction(txId);
    }

    public java.util.List<com.landchain.api.blockchain.model.BlockchainBlock> getAllBlocks() {
        return ledgerEngine.getAllBlocks();
    }

    public java.util.List<BlockchainTransaction> getAllTransactions() {
        return ledgerEngine.getAllTransactions();
    }

    public Map<String, Object> getWorldState() {
        return ledgerEngine.getWorldState();
    }

    public Map<String, Object> getOverview() {
        return ledgerEngine.getOverview();
    }
}
