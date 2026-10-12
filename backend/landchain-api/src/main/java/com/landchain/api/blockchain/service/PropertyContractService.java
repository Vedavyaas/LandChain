package com.landchain.api.blockchain.service;

import com.landchain.api.blockchain.engine.FabricLedgerEngine;
import com.landchain.api.blockchain.model.BlockchainHistoryRecord;
import com.landchain.api.blockchain.model.BlockchainPropertyRecord;
import com.landchain.api.blockchain.model.BlockchainTransaction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PropertyContractService {

    private final FabricLedgerEngine ledgerEngine;

    public BlockchainTransaction registerProperty(
            String propertyId,
            String surveyNumber,
            String address,
            String village,
            String taluk,
            String district,
            String area,
            String propertyType,
            String initialOwner,
            String actor,
            String callerMspId
    ) {
        log.info("Invoking Fabric chaincode: registerProperty(id={}, owner={}, survey={}) by {}",
                propertyId, initialOwner, surveyNumber, actor);

        String msp = (callerMspId != null && !callerMspId.isBlank()) ? callerMspId : "GovernmentMSP";

        return ledgerEngine.registerProperty(
                propertyId,
                surveyNumber,
                address,
                village,
                taluk,
                district,
                area,
                propertyType,
                initialOwner,
                actor,
                msp
        );
    }

    public BlockchainPropertyRecord getProperty(String propertyId) {
        return ledgerEngine.getProperty(propertyId);
    }

    public List<BlockchainPropertyRecord> getAllProperties() {
        return ledgerEngine.getAllProperties();
    }

    public List<BlockchainHistoryRecord> getPropertyHistory(String propertyId) {
        log.info("Evaluating Fabric chaincode: getPropertyHistory({})", propertyId);
        return ledgerEngine.getPropertyHistory(propertyId);
    }
}
