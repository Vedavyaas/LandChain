package com.landchain.api.blockchain.service;

import com.landchain.api.blockchain.engine.FabricLedgerEngine;
import com.landchain.api.blockchain.model.BlockchainTransaction;
import com.landchain.api.blockchain.model.BlockchainTransferRecord;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransferContractService {

    private final FabricLedgerEngine ledgerEngine;

    public BlockchainTransferRecord initiateTransfer(
            String transferId,
            String propertyId,
            String newOwner,
            String deedDocumentId,
            String actor,
            String callerMspId
    ) {
        log.info("Invoking Fabric chaincode: initiateTransfer(transferId={}, propId={}, newOwner={}) by owner {}",
                transferId, propertyId, newOwner, actor);

        String msp = (callerMspId != null && !callerMspId.isBlank()) ? callerMspId : "OwnerMSP";

        return ledgerEngine.initiateTransfer(
                transferId,
                propertyId,
                newOwner,
                deedDocumentId,
                actor,
                msp
        );
    }

    public BlockchainTransaction approveTransfer(
            String transferId,
            String registrarActor,
            String callerMspId
    ) {
        log.info("Invoking Fabric chaincode: transferOwnership(transferId={}) approved by Registrar {}",
                transferId, registrarActor);

        String msp = (callerMspId != null && !callerMspId.isBlank()) ? callerMspId : "RegistrarMSP";

        return ledgerEngine.approveTransfer(transferId, registrarActor, msp);
    }

    public BlockchainTransferRecord getTransfer(String transferId) {
        return ledgerEngine.getTransfer(transferId);
    }

    public List<BlockchainTransferRecord> getAllTransfers() {
        return ledgerEngine.getAllTransfers();
    }
}
