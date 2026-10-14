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
            String callerMspId,
            String remarks,
            boolean bothAccepted
    ) {
        log.info("Invoking Fabric chaincode: initiateTransfer(transferId={}, propId={}, newOwner={}) by actor {} (bothAccepted={})",
                transferId, propertyId, newOwner, actor, bothAccepted);

        String msp = (callerMspId != null && !callerMspId.isBlank()) ? callerMspId : "Org1MSP";

        return ledgerEngine.initiateTransfer(
                transferId,
                propertyId,
                newOwner,
                deedDocumentId,
                actor,
                msp,
                remarks,
                bothAccepted
        );
    }

    public BlockchainTransferRecord initiateTransfer(
            String transferId,
            String propertyId,
            String newOwner,
            String deedDocumentId,
            String actor,
            String callerMspId
    ) {
        return initiateTransfer(transferId, propertyId, newOwner, deedDocumentId, actor, callerMspId, null, false);
    }

    public BlockchainTransferRecord acceptTransfer(
            String transferId,
            String actor,
            String callerMspId
    ) {
        log.info("Invoking Fabric chaincode: acceptTransfer(transferId={}) by actor {}", transferId, actor);
        String msp = (callerMspId != null && !callerMspId.isBlank()) ? callerMspId : "Org1MSP";
        return ledgerEngine.acceptTransfer(transferId, actor, msp);
    }

    public BlockchainTransferRecord cancelTransfer(
            String transferId,
            String reason,
            String actor,
            String callerMspId
    ) {
        log.info("Invoking Fabric chaincode: cancelTransfer(transferId={}) by actor {} - Reason: {}", transferId, actor, reason);
        String msp = (callerMspId != null && !callerMspId.isBlank()) ? callerMspId : "Org1MSP";
        return ledgerEngine.cancelTransfer(transferId, reason, actor, msp);
    }

    public BlockchainTransaction approveTransfer(
            String transferId,
            String registrarActor,
            String callerMspId,
            String deedDocumentId
    ) {
        log.info("Invoking Fabric chaincode: transferOwnership(transferId={}, deed={}) approved by Registrar {}",
                transferId, deedDocumentId, registrarActor);

        String msp = (callerMspId != null && !callerMspId.isBlank()) ? callerMspId : "RegistrarMSP";

        return ledgerEngine.approveTransfer(transferId, registrarActor, msp, deedDocumentId);
    }

    public BlockchainTransaction approveTransfer(
            String transferId,
            String registrarActor,
            String callerMspId
    ) {
        return approveTransfer(transferId, registrarActor, callerMspId, null);
    }

    public BlockchainTransferRecord attachDocumentToTransfer(
            String transferId,
            String documentId,
            String sha256Hash
    ) {
        return ledgerEngine.attachDocumentToTransfer(transferId, documentId, sha256Hash);
    }

    public BlockchainTransferRecord getTransfer(String transferId) {
        return ledgerEngine.getTransfer(transferId);
    }

    public List<BlockchainTransferRecord> getAllTransfers() {
        return ledgerEngine.getAllTransfers();
    }

    public List<BlockchainTransferRecord> getTransfersByProperty(String propertyId) {
        return ledgerEngine.getTransfersByProperty(propertyId);
    }
}
