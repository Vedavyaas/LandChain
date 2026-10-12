package com.landchain.api.blockchain.service;

import com.landchain.api.blockchain.engine.FabricLedgerEngine;
import com.landchain.api.blockchain.model.BlockchainTransaction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MortgageContractService {

    private final FabricLedgerEngine ledgerEngine;

    public BlockchainTransaction createMortgage(
            String propertyId,
            String bankName,
            double amount,
            String actor,
            String callerMspId
    ) {
        log.info("Invoking Fabric chaincode: createMortgage(propId={}, bank={}, amount={}) by {}",
                propertyId, bankName, amount, actor);

        String msp = (callerMspId != null && !callerMspId.isBlank()) ? callerMspId : "BankMSP";
        return ledgerEngine.createMortgage(propertyId, bankName, amount, actor, msp);
    }

    public BlockchainTransaction releaseMortgage(
            String propertyId,
            String actor,
            String callerMspId
    ) {
        log.info("Invoking Fabric chaincode: releaseMortgage(propId={}) by {}", propertyId, actor);

        String msp = (callerMspId != null && !callerMspId.isBlank()) ? callerMspId : "BankMSP";
        return ledgerEngine.releaseMortgage(propertyId, actor, msp);
    }

    public BlockchainTransaction freezeProperty(
            String propertyId,
            String reason,
            String actor,
            String callerMspId
    ) {
        log.info("Invoking Fabric chaincode: freezeProperty(propId={}, reason={}) by {}",
                propertyId, reason, actor);

        String msp = (callerMspId != null && !callerMspId.isBlank()) ? callerMspId : "GovernmentMSP";
        return ledgerEngine.freezeProperty(propertyId, reason, actor, msp);
    }

    public BlockchainTransaction unfreezeProperty(
            String propertyId,
            String actor,
            String callerMspId
    ) {
        log.info("Invoking Fabric chaincode: unfreezeProperty(propId={}) by {}", propertyId, actor);

        String msp = (callerMspId != null && !callerMspId.isBlank()) ? callerMspId : "GovernmentMSP";
        return ledgerEngine.unfreezeProperty(propertyId, actor, msp);
    }
}
