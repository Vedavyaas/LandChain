package com.landchain.api.blockchain.engine;

import com.landchain.api.blockchain.exception.*;
import com.landchain.api.blockchain.model.*;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Component
public class FabricLedgerEngine {

    private final Map<String, BlockchainPropertyRecord> propertyWorldState = new ConcurrentHashMap<>();
    private final Map<String, BlockchainDocumentRecord> documentWorldState = new ConcurrentHashMap<>();
    private final Map<String, BlockchainTransferRecord> transferWorldState = new ConcurrentHashMap<>();
    private final Map<String, List<BlockchainHistoryRecord>> propertyHistoryStore = new ConcurrentHashMap<>();
    private final Map<String, BlockchainTransaction> transactionStore = new ConcurrentHashMap<>();

    private final AtomicLong currentBlockNumber = new AtomicLong(0);
    private String lastBlockHash = "0000000000000000000000000000000000000000000000000000000000000000";
    private String genesisBlockHash;
    private LocalDateTime genesisTimestamp;
    private boolean networkAvailable = true;

    private static final String DEFAULT_CHANNEL = "landchannel";
    private static final String DEFAULT_CHAINCODE = "landchain";
    private final SecureRandom random = new SecureRandom();

    @PostConstruct
    public void initLedger() {
        // Mint Genesis Block #0
        this.genesisTimestamp = LocalDateTime.now();
        this.genesisBlockHash = sha256Hex("GENESIS_BLOCK_LANDCHAIN_" + System.currentTimeMillis());
        this.lastBlockHash = this.genesisBlockHash;
        log.info("⛓️ Hyperledger Fabric In-Process Ledger Engine initialized. Genesis Block: [{}] Hash: {}",
                currentBlockNumber.get(), lastBlockHash);
    }

    public boolean isNetworkAvailable() {
        return networkAvailable;
    }

    public void setNetworkAvailable(boolean networkAvailable) {
        this.networkAvailable = networkAvailable;
    }

    private void checkLiveness() {
        if (!networkAvailable) {
            throw new FabricUnavailableException("Hyperledger Fabric Peer Gateway is currently unreachable at configured endpoint.");
        }
    }

    /* ── PROPERTY CHAINCODE FUNCTIONS ────────────────────────────────────────── */

    public synchronized BlockchainTransaction registerProperty(
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
        checkLiveness();

        if (callerMspId != null && !callerMspId.equalsIgnoreCase("GovernmentMSP") && !callerMspId.equalsIgnoreCase("Org1MSP")) {
            throw new UnauthorizedOrganizationException("Organization [" + callerMspId + "] is not authorized to register cadastral properties.");
        }

        if (propertyWorldState.containsKey(propertyId)) {
            throw new ChaincodeException("Chaincode Error: Property with ID [" + propertyId + "] already exists on the ledger.");
        }

        if (initialOwner == null || initialOwner.isBlank()) {
            throw new InvalidOwnerException("Chaincode Error: An initial owner username must be specified.");
        }

        long blockNum = currentBlockNumber.incrementAndGet();
        String txId = generateTxId("registerProperty", propertyId, actor);
        LocalDateTime now = LocalDateTime.now();

        BlockchainPropertyRecord record = BlockchainPropertyRecord.builder()
                .propertyId(propertyId)
                .surveyNumber(surveyNumber)
                .address(address)
                .village(village)
                .taluk(taluk)
                .district(district)
                .area(area)
                .propertyType(propertyType)
                .currentOwner(initialOwner)
                .status("ACTIVE")
                .registeredBy(actor)
                .registeredAt(now)
                .lastTxId(txId)
                .lastBlockNumber(blockNum)
                .lastUpdatedAt(now)
                .build();

        propertyWorldState.put(propertyId, record);

        // Record on-chain history
        BlockchainHistoryRecord history = BlockchainHistoryRecord.builder()
                .txId(txId)
                .blockNumber(blockNum)
                .timestamp(now)
                .propertyId(propertyId)
                .action("REGISTER_PROPERTY")
                .previousOwner(null)
                .newOwner(initialOwner)
                .status("ACTIVE")
                .actor(actor)
                .actorMsp(callerMspId)
                .details("Parcel initially registered on Fabric ledger and titled to @" + initialOwner)
                .isDelete(false)
                .build();
        propertyHistoryStore.computeIfAbsent(propertyId, k -> new ArrayList<>()).add(history);

        // Commit transaction record
        String payload = String.format("{\"propertyId\":\"%s\",\"owner\":\"%s\",\"survey\":\"%s\"}", propertyId, initialOwner, surveyNumber);
        BlockchainTransaction tx = commitTransaction(txId, blockNum, now, "registerProperty", callerMspId, actor, payload);

        log.info("⛓️ [Fabric Commit] Block #{} | TxID: {} | registerProperty({}) -> Owner: {}",
                blockNum, txId, propertyId, initialOwner);

        return tx;
    }

    public BlockchainPropertyRecord getProperty(String propertyId) {
        checkLiveness();
        BlockchainPropertyRecord record = propertyWorldState.get(propertyId);
        if (record == null) {
            throw new InvalidPropertyException("Chaincode Error: Property [" + propertyId + "] not found on Fabric ledger.");
        }
        return record;
    }

    public List<BlockchainPropertyRecord> getAllProperties() {
        checkLiveness();
        return new ArrayList<>(propertyWorldState.values());
    }

    public List<BlockchainHistoryRecord> getPropertyHistory(String propertyId) {
        checkLiveness();
        if (!propertyWorldState.containsKey(propertyId) && !propertyHistoryStore.containsKey(propertyId)) {
            throw new InvalidPropertyException("Chaincode Error: Property [" + propertyId + "] does not exist on the ledger.");
        }
        List<BlockchainHistoryRecord> history = propertyHistoryStore.getOrDefault(propertyId, List.of());
        return new ArrayList<>(history);
    }

    /* ── DOCUMENT CHAINCODE FUNCTIONS ────────────────────────────────────────── */

    public synchronized BlockchainTransaction registerDocumentHash(
            String documentId,
            String propertyId,
            String documentType,
            String sha256Hash,
            String actor,
            String callerMspId
    ) {
        checkLiveness();

        if (!propertyWorldState.containsKey(propertyId)) {
            throw new InvalidPropertyException("Chaincode Error: Cannot bind document to non-existent property [" + propertyId + "]");
        }

        if (documentWorldState.containsKey(documentId)) {
            throw new ChaincodeException("Chaincode Error: Document ID [" + documentId + "] already exists on ledger.");
        }

        long blockNum = currentBlockNumber.incrementAndGet();
        String txId = generateTxId("registerDocumentHash", documentId, actor);
        LocalDateTime now = LocalDateTime.now();

        BlockchainDocumentRecord doc = BlockchainDocumentRecord.builder()
                .documentId(documentId)
                .propertyId(propertyId)
                .documentType(documentType)
                .sha256Hash(sha256Hash)
                .registeredBy(actor)
                .txId(txId)
                .blockNumber(blockNum)
                .registeredAt(now)
                .build();

        documentWorldState.put(documentId, doc);

        // Record history event on the property
        BlockchainHistoryRecord history = BlockchainHistoryRecord.builder()
                .txId(txId)
                .blockNumber(blockNum)
                .timestamp(now)
                .propertyId(propertyId)
                .action("REGISTER_DOCUMENT_HASH")
                .previousOwner(propertyWorldState.get(propertyId).getCurrentOwner())
                .newOwner(propertyWorldState.get(propertyId).getCurrentOwner())
                .status(propertyWorldState.get(propertyId).getStatus())
                .actor(actor)
                .actorMsp(callerMspId)
                .details("Registered cryptographic proof for deed [" + documentId + "] (" + documentType + ") SHA-256: " + sha256Hash.substring(0, 16) + "…")
                .isDelete(false)
                .build();
        propertyHistoryStore.computeIfAbsent(propertyId, k -> new ArrayList<>()).add(history);

        String payload = String.format("{\"documentId\":\"%s\",\"propertyId\":\"%s\",\"sha256\":\"%s\"}", documentId, propertyId, sha256Hash);
        BlockchainTransaction tx = commitTransaction(txId, blockNum, now, "registerDocumentHash", callerMspId, actor, payload);

        log.info("⛓️ [Fabric Commit] Block #{} | TxID: {} | registerDocumentHash({}) -> SHA-256: {}",
                blockNum, txId, documentId, sha256Hash);

        return tx;
    }

    public BlockchainDocumentRecord getDocument(String documentId) {
        checkLiveness();
        BlockchainDocumentRecord doc = documentWorldState.get(documentId);
        if (doc == null) {
            throw new ChaincodeException("Document [" + documentId + "] hash not found on Fabric ledger.");
        }
        return doc;
    }

    /* ── TRANSFER CHAINCODE FUNCTIONS ────────────────────────────────────────── */

    public synchronized BlockchainTransferRecord initiateTransfer(
            String transferId,
            String propertyId,
            String newOwner,
            String deedDocumentId,
            String actor,
            String callerMspId
    ) {
        checkLiveness();

        BlockchainPropertyRecord prop = propertyWorldState.get(propertyId);
        if (prop == null) {
            throw new InvalidPropertyException("Chaincode Error: Property [" + propertyId + "] not found.");
        }

        // Validate Ownership
        if (!prop.getCurrentOwner().equalsIgnoreCase(actor)) {
            throw new InvalidOwnerException("Chaincode Error: Only the authoritative deed holder [@" + prop.getCurrentOwner() +
                    "] can initiate transfer. Caller is [@" + actor + "].");
        }

        // Validate Encumbrance & Freezing
        if ("FROZEN".equalsIgnoreCase(prop.getStatus())) {
            throw new PropertyFrozenException("Chaincode Error: Property [" + propertyId + "] is FROZEN. Transfer forbidden.");
        }
        if ("MORTGAGED".equalsIgnoreCase(prop.getStatus())) {
            throw new PropertyMortgagedException("Chaincode Error: Property [" + propertyId + "] has an active MORTGAGE encumbrance. Transfer forbidden.");
        }
        if ("PENDING_TRANSFER".equalsIgnoreCase(prop.getStatus())) {
            throw new ChaincodeException("Chaincode Error: Property [" + propertyId + "] already has a pending transfer proposal.");
        }

        // Validate Deed Hash
        String deedHash = null;
        if (deedDocumentId != null && !deedDocumentId.isBlank()) {
            BlockchainDocumentRecord doc = documentWorldState.get(deedDocumentId);
            if (doc != null) {
                deedHash = doc.getSha256Hash();
            }
        }

        long blockNum = currentBlockNumber.incrementAndGet();
        String txId = generateTxId("initiateTransfer", transferId, actor);
        LocalDateTime now = LocalDateTime.now();

        // Update property state to PENDING_TRANSFER
        prop.setStatus("PENDING_TRANSFER");
        prop.setLastTxId(txId);
        prop.setLastBlockNumber(blockNum);
        prop.setLastUpdatedAt(now);

        BlockchainTransferRecord transfer = BlockchainTransferRecord.builder()
                .transferId(transferId)
                .propertyId(propertyId)
                .currentOwner(prop.getCurrentOwner())
                .newOwner(newOwner)
                .deedDocumentId(deedDocumentId)
                .deedSha256Hash(deedHash)
                .status("INITIATED")
                .initiatedBy(actor)
                .initiatedAt(now)
                .txId(txId)
                .blockNumber(blockNum)
                .build();

        transferWorldState.put(transferId, transfer);

        BlockchainHistoryRecord history = BlockchainHistoryRecord.builder()
                .txId(txId)
                .blockNumber(blockNum)
                .timestamp(now)
                .propertyId(propertyId)
                .action("TRANSFER_INITIATED")
                .previousOwner(prop.getCurrentOwner())
                .newOwner(newOwner)
                .status("PENDING_TRANSFER")
                .actor(actor)
                .actorMsp(callerMspId)
                .details("Transfer proposal initiated by @" + actor + " to new buyer @" + newOwner + " (Awaiting Registrar approval)")
                .isDelete(false)
                .build();
        propertyHistoryStore.computeIfAbsent(propertyId, k -> new ArrayList<>()).add(history);

        String payload = String.format("{\"transferId\":\"%s\",\"propertyId\":\"%s\",\"newOwner\":\"%s\"}", transferId, propertyId, newOwner);
        commitTransaction(txId, blockNum, now, "initiateTransfer", callerMspId, actor, payload);

        log.info("⛓️ [Fabric Commit] Block #{} | TxID: {} | initiateTransfer({}) -> Pending buyer: {}",
                blockNum, txId, transferId, newOwner);

        return transfer;
    }

    public synchronized BlockchainTransaction approveTransfer(
            String transferId,
            String registrarActor,
            String callerMspId
    ) {
        checkLiveness();

        if (callerMspId != null && !callerMspId.equalsIgnoreCase("RegistrarMSP") && !callerMspId.equalsIgnoreCase("GovernmentMSP") && !callerMspId.equalsIgnoreCase("Org1MSP")) {
            throw new UnauthorizedOrganizationException("Organization [" + callerMspId + "] is not authorized to approve title conveyances.");
        }

        BlockchainTransferRecord transfer = transferWorldState.get(transferId);
        if (transfer == null) {
            throw new ChaincodeException("Chaincode Error: Transfer proposal [" + transferId + "] not found.");
        }

        if (!"INITIATED".equalsIgnoreCase(transfer.getStatus())) {
            throw new ChaincodeException("Chaincode Error: Transfer [" + transferId + "] is already " + transfer.getStatus());
        }

        BlockchainPropertyRecord prop = propertyWorldState.get(transfer.getPropertyId());
        if (prop == null) {
            throw new InvalidPropertyException("Chaincode Error: Property [" + transfer.getPropertyId() + "] not found.");
        }

        if ("FROZEN".equalsIgnoreCase(prop.getStatus())) {
            throw new PropertyFrozenException("Chaincode Error: Property was frozen during conveyance review. Conveyance aborted.");
        }

        long blockNum = currentBlockNumber.incrementAndGet();
        String txId = generateTxId("transferOwnership", transfer.getPropertyId(), registrarActor);
        LocalDateTime now = LocalDateTime.now();

        String oldOwner = prop.getCurrentOwner();
        String newOwner = transfer.getNewOwner();

        // ── Authoritative Ownership Conveyance on Ledger ──────────────────────
        prop.setCurrentOwner(newOwner);
        prop.setStatus("ACTIVE");
        prop.setLastTxId(txId);
        prop.setLastBlockNumber(blockNum);
        prop.setLastUpdatedAt(now);

        transfer.setStatus("APPROVED");
        transfer.setApprovedBy(registrarActor);
        transfer.setApprovedAt(now);

        BlockchainHistoryRecord history = BlockchainHistoryRecord.builder()
                .txId(txId)
                .blockNumber(blockNum)
                .timestamp(now)
                .propertyId(prop.getPropertyId())
                .action("TRANSFER_CONVEYED")
                .previousOwner(oldOwner)
                .newOwner(newOwner)
                .status("ACTIVE")
                .actor(registrarActor)
                .actorMsp(callerMspId)
                .details("Title conveyance formally executed on Fabric ledger by Sub-Registrar @" + registrarActor + ". Ownership transitioned from @" + oldOwner + " to @" + newOwner)
                .isDelete(false)
                .build();
        propertyHistoryStore.computeIfAbsent(prop.getPropertyId(), k -> new ArrayList<>()).add(history);

        String payload = String.format("{\"propertyId\":\"%s\",\"previousOwner\":\"%s\",\"newOwner\":\"%s\"}", prop.getPropertyId(), oldOwner, newOwner);
        BlockchainTransaction tx = commitTransaction(txId, blockNum, now, "transferOwnership", callerMspId, registrarActor, payload);

        log.info("⛓️ [Fabric Commit] Block #{} | TxID: {} | transferOwnership({}) -> New Authoritative Owner: {}",
                blockNum, txId, prop.getPropertyId(), newOwner);

        return tx;
    }

    public List<BlockchainTransferRecord> getAllTransfers() {
        checkLiveness();
        return new ArrayList<>(transferWorldState.values());
    }

    public BlockchainTransferRecord getTransfer(String transferId) {
        checkLiveness();
        BlockchainTransferRecord t = transferWorldState.get(transferId);
        if (t == null) {
            throw new ChaincodeException("Transfer [" + transferId + "] not found.");
        }
        return t;
    }

    /* ── MORTGAGE & FREEZE FUNCTIONS ─────────────────────────────────────────── */

    public synchronized BlockchainTransaction createMortgage(
            String propertyId,
            String bankName,
            double amount,
            String actor,
            String callerMspId
    ) {
        checkLiveness();
        BlockchainPropertyRecord prop = propertyWorldState.get(propertyId);
        if (prop == null) throw new InvalidPropertyException("Property not found: " + propertyId);

        if ("FROZEN".equalsIgnoreCase(prop.getStatus())) {
            throw new PropertyFrozenException("Property is frozen.");
        }
        if ("MORTGAGED".equalsIgnoreCase(prop.getStatus())) {
            throw new PropertyMortgagedException("Property already has an active mortgage.");
        }

        long blockNum = currentBlockNumber.incrementAndGet();
        String txId = generateTxId("createMortgage", propertyId, actor);
        LocalDateTime now = LocalDateTime.now();

        prop.setStatus("MORTGAGED");
        prop.setMortgageHolder(bankName);
        prop.setMortgageAmount(amount);
        prop.setLastTxId(txId);
        prop.setLastBlockNumber(blockNum);
        prop.setLastUpdatedAt(now);

        BlockchainHistoryRecord history = BlockchainHistoryRecord.builder()
                .txId(txId)
                .blockNumber(blockNum)
                .timestamp(now)
                .propertyId(propertyId)
                .action("MORTGAGE_CREATED")
                .previousOwner(prop.getCurrentOwner())
                .newOwner(prop.getCurrentOwner())
                .status("MORTGAGED")
                .actor(actor)
                .actorMsp(callerMspId)
                .details("Mortgage charge registered by " + bankName + " for amount ₹" + amount)
                .isDelete(false)
                .build();
        propertyHistoryStore.computeIfAbsent(propertyId, k -> new ArrayList<>()).add(history);

        String payload = String.format("{\"propertyId\":\"%s\",\"bank\":\"%s\",\"amount\":%.2f}", propertyId, bankName, amount);
        return commitTransaction(txId, blockNum, now, "createMortgage", callerMspId, actor, payload);
    }

    public synchronized BlockchainTransaction releaseMortgage(
            String propertyId,
            String actor,
            String callerMspId
    ) {
        checkLiveness();
        BlockchainPropertyRecord prop = propertyWorldState.get(propertyId);
        if (prop == null) throw new InvalidPropertyException("Property not found: " + propertyId);

        if (!"MORTGAGED".equalsIgnoreCase(prop.getStatus())) {
            throw new ChaincodeException("Property does not have an active mortgage to release.");
        }

        long blockNum = currentBlockNumber.incrementAndGet();
        String txId = generateTxId("releaseMortgage", propertyId, actor);
        LocalDateTime now = LocalDateTime.now();

        String previousBank = prop.getMortgageHolder();
        prop.setStatus("ACTIVE");
        prop.setMortgageHolder(null);
        prop.setMortgageAmount(null);
        prop.setLastTxId(txId);
        prop.setLastBlockNumber(blockNum);
        prop.setLastUpdatedAt(now);

        BlockchainHistoryRecord history = BlockchainHistoryRecord.builder()
                .txId(txId)
                .blockNumber(blockNum)
                .timestamp(now)
                .propertyId(propertyId)
                .action("MORTGAGE_RELEASED")
                .previousOwner(prop.getCurrentOwner())
                .newOwner(prop.getCurrentOwner())
                .status("ACTIVE")
                .actor(actor)
                .actorMsp(callerMspId)
                .details("Mortgage encumbrance cleared by " + previousBank + ". Title unencumbered.")
                .isDelete(false)
                .build();
        propertyHistoryStore.computeIfAbsent(propertyId, k -> new ArrayList<>()).add(history);

        String payload = String.format("{\"propertyId\":\"%s\",\"releasedBy\":\"%s\"}", propertyId, actor);
        return commitTransaction(txId, blockNum, now, "releaseMortgage", callerMspId, actor, payload);
    }

    public synchronized BlockchainTransaction freezeProperty(
            String propertyId,
            String reason,
            String actor,
            String callerMspId
    ) {
        checkLiveness();
        BlockchainPropertyRecord prop = propertyWorldState.get(propertyId);
        if (prop == null) throw new InvalidPropertyException("Property not found: " + propertyId);

        long blockNum = currentBlockNumber.incrementAndGet();
        String txId = generateTxId("freezeProperty", propertyId, actor);
        LocalDateTime now = LocalDateTime.now();

        prop.setStatus("FROZEN");
        prop.setFreezeReason(reason);
        prop.setLastTxId(txId);
        prop.setLastBlockNumber(blockNum);
        prop.setLastUpdatedAt(now);

        BlockchainHistoryRecord history = BlockchainHistoryRecord.builder()
                .txId(txId)
                .blockNumber(blockNum)
                .timestamp(now)
                .propertyId(propertyId)
                .action("PROPERTY_FROZEN")
                .previousOwner(prop.getCurrentOwner())
                .newOwner(prop.getCurrentOwner())
                .status("FROZEN")
                .actor(actor)
                .actorMsp(callerMspId)
                .details("Title parcel placed under administrative/judicial freeze. Reason: " + reason)
                .isDelete(false)
                .build();
        propertyHistoryStore.computeIfAbsent(propertyId, k -> new ArrayList<>()).add(history);

        String payload = String.format("{\"propertyId\":\"%s\",\"reason\":\"%s\"}", propertyId, reason);
        return commitTransaction(txId, blockNum, now, "freezeProperty", callerMspId, actor, payload);
    }

    public synchronized BlockchainTransaction unfreezeProperty(
            String propertyId,
            String actor,
            String callerMspId
    ) {
        checkLiveness();
        BlockchainPropertyRecord prop = propertyWorldState.get(propertyId);
        if (prop == null) throw new InvalidPropertyException("Property not found: " + propertyId);

        if (!"FROZEN".equalsIgnoreCase(prop.getStatus())) {
            throw new ChaincodeException("Property is not frozen.");
        }

        long blockNum = currentBlockNumber.incrementAndGet();
        String txId = generateTxId("unfreezeProperty", propertyId, actor);
        LocalDateTime now = LocalDateTime.now();

        prop.setStatus("ACTIVE");
        prop.setFreezeReason(null);
        prop.setLastTxId(txId);
        prop.setLastBlockNumber(blockNum);
        prop.setLastUpdatedAt(now);

        BlockchainHistoryRecord history = BlockchainHistoryRecord.builder()
                .txId(txId)
                .blockNumber(blockNum)
                .timestamp(now)
                .propertyId(propertyId)
                .action("PROPERTY_UNFROZEN")
                .previousOwner(prop.getCurrentOwner())
                .newOwner(prop.getCurrentOwner())
                .status("ACTIVE")
                .actor(actor)
                .actorMsp(callerMspId)
                .details("Title parcel unfreeze authorized by @" + actor)
                .isDelete(false)
                .build();
        propertyHistoryStore.computeIfAbsent(propertyId, k -> new ArrayList<>()).add(history);

        String payload = String.format("{\"propertyId\":\"%s\",\"unfrozenBy\":\"%s\"}", propertyId, actor);
        return commitTransaction(txId, blockNum, now, "unfreezeProperty", callerMspId, actor, payload);
    }

    /* ── TRANSACTIONS & BLOCKS ───────────────────────────────────────────────── */

    public BlockchainTransaction getTransaction(String txId) {
        checkLiveness();
        BlockchainTransaction tx = transactionStore.get(txId);
        if (tx == null) {
            throw new TransactionRejectedException("Transaction ID [" + txId + "] not found on Fabric ledger.");
        }
        return tx;
    }

    public long getCurrentBlockHeight() {
        return currentBlockNumber.get();
    }

    public String getLastBlockHash() {
        return lastBlockHash;
    }

    public List<BlockchainTransaction> getAllTransactions() {
        checkLiveness();
        List<BlockchainTransaction> txs = new ArrayList<>(transactionStore.values());
        txs.sort(Comparator.comparing(BlockchainTransaction::getBlockNumber).reversed());
        return txs;
    }

    public List<BlockchainBlock> getAllBlocks() {
        checkLiveness();
        List<BlockchainBlock> blocks = new ArrayList<>();

        // Group transactions by block number (descending order)
        Map<Long, List<BlockchainTransaction>> txsByBlock = new TreeMap<>(Collections.reverseOrder());
        for (BlockchainTransaction tx : transactionStore.values()) {
            txsByBlock.computeIfAbsent(tx.getBlockNumber(), k -> new ArrayList<>()).add(tx);
        }

        for (Map.Entry<Long, List<BlockchainTransaction>> entry : txsByBlock.entrySet()) {
            long bNum = entry.getKey();
            List<BlockchainTransaction> txs = entry.getValue();
            BlockchainTransaction firstTx = txs.get(0);
            blocks.add(BlockchainBlock.builder()
                    .blockNumber(bNum)
                    .blockHash(firstTx.getBlockHash())
                    .previousBlockHash(firstTx.getPreviousBlockHash())
                    .timestamp(firstTx.getTimestamp())
                    .transactionCount(txs.size())
                    .transactions(txs)
                    .channelName(firstTx.getChannelName())
                    .dataHash(sha256Hex(firstTx.getTxId()))
                    .build());
        }

        // Always include Genesis Block #0
        blocks.add(BlockchainBlock.builder()
                .blockNumber(0)
                .blockHash(genesisBlockHash != null ? genesisBlockHash : "0000000000000000000000000000000000000000000000000000000000000000")
                .previousBlockHash("0000000000000000000000000000000000000000000000000000000000000000")
                .timestamp(genesisTimestamp != null ? genesisTimestamp : LocalDateTime.now())
                .transactionCount(0)
                .transactions(Collections.emptyList())
                .channelName(DEFAULT_CHANNEL)
                .dataHash("0000000000000000000000000000000000000000000000000000000000000000")
                .build());

        return blocks;
    }

    public Map<String, Object> getWorldState() {
        checkLiveness();
        return Map.of(
                "properties", new ArrayList<>(propertyWorldState.values()),
                "documents", new ArrayList<>(documentWorldState.values()),
                "transfers", new ArrayList<>(transferWorldState.values()),
                "propertyCount", propertyWorldState.size(),
                "documentCount", documentWorldState.size(),
                "transferCount", transferWorldState.size()
        );
    }

    public Map<String, Object> getOverview() {
        return Map.of(
                "blockHeight", currentBlockNumber.get(),
                "totalTransactions", transactionStore.size(),
                "lastBlockHash", lastBlockHash,
                "genesisBlockHash", genesisBlockHash != null ? genesisBlockHash : "",
                "channelName", DEFAULT_CHANNEL,
                "chaincodeName", DEFAULT_CHAINCODE,
                "networkAvailable", networkAvailable,
                "totalProperties", propertyWorldState.size(),
                "totalDocuments", documentWorldState.size(),
                "totalTransfers", transferWorldState.size()
        );
    }

    private BlockchainTransaction commitTransaction(
            String txId,
            long blockNumber,
            LocalDateTime timestamp,
            String functionName,
            String mspId,
            String creator,
            String payloadJson
    ) {
        String prevHash = this.lastBlockHash;
        // Calculate new block hash chaining with last block hash
        String blockContent = String.format("%d|%s|%s|%s", blockNumber, prevHash, txId, timestamp);
        this.lastBlockHash = sha256Hex(blockContent);

        BlockchainTransaction tx = BlockchainTransaction.builder()
                .txId(txId)
                .blockNumber(blockNumber)
                .timestamp(timestamp)
                .channelName(DEFAULT_CHANNEL)
                .chaincodeName(DEFAULT_CHAINCODE)
                .functionName(functionName)
                .creatorMspId(mspId != null ? mspId : "Org1MSP")
                .creator(creator)
                .payloadJson(payloadJson)
                .validationCode("VALID")
                .blockHash(this.lastBlockHash)
                .previousBlockHash(prevHash)
                .build();

        transactionStore.put(txId, tx);
        return tx;
    }

    private String generateTxId(String func, String key, String actor) {
        String seed = func + ":" + key + ":" + actor + ":" + System.nanoTime() + ":" + random.nextLong();
        return sha256Hex(seed);
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm unavailable", e);
        }
    }
}
