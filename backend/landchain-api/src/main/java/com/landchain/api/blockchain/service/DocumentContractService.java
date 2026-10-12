package com.landchain.api.blockchain.service;

import com.landchain.api.blockchain.engine.FabricLedgerEngine;
import com.landchain.api.blockchain.model.BlockchainDocumentRecord;
import com.landchain.api.blockchain.model.BlockchainTransaction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentContractService {

    private final FabricLedgerEngine ledgerEngine;

    public BlockchainTransaction registerDocumentHash(
            String documentId,
            String propertyId,
            String documentType,
            String sha256Hash,
            String actor,
            String callerMspId
    ) {
        log.info("Invoking Fabric chaincode: registerDocumentHash(docId={}, propId={}, sha256={}) by {}",
                documentId, propertyId, sha256Hash, actor);

        String msp = (callerMspId != null && !callerMspId.isBlank()) ? callerMspId : "RegistrarMSP";

        return ledgerEngine.registerDocumentHash(
                documentId,
                propertyId,
                documentType,
                sha256Hash,
                actor,
                msp
        );
    }

    public BlockchainDocumentRecord getDocumentRecord(String documentId) {
        log.info("Evaluating Fabric chaincode: getDocumentRecord({})", documentId);
        return ledgerEngine.getDocument(documentId);
    }

    public boolean verifyDocumentHash(String documentId, String candidateHash) {
        BlockchainDocumentRecord record = ledgerEngine.getDocument(documentId);
        return record.getSha256Hash().equalsIgnoreCase(candidateHash);
    }
}
