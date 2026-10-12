/*
 * LandChain Smart Contract
 * Implements authoritative property, document hash, and conveyance state.
 */
'use strict';

const { Contract } = require('fabric-contract-api');

class LandChainContract extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        // Initial state is empty, properties registered by Government
        console.info('============= END : Initialize Ledger ===========');
    }

    async registerProperty(ctx, propertyId, surveyNumber, address, village, taluk, district, area, propertyType, initialOwner) {
        const clientOrg = ctx.clientIdentity.getMSPID();
        if (clientOrg !== 'GovernmentMSP' && clientOrg !== 'Org1MSP') {
            throw new Error(`Unauthorized: Org [${clientOrg}] cannot register properties`);
        }

        const exists = await this.propertyExists(ctx, propertyId);
        if (exists) {
            throw new Error(`Property ${propertyId} already exists on ledger`);
        }

        const property = {
            docType: 'property',
            propertyId,
            surveyNumber,
            address,
            village,
            taluk,
            district,
            area,
            propertyType,
            currentOwner: initialOwner,
            status: 'ACTIVE',
            registeredBy: ctx.clientIdentity.getID(),
            registeredAt: new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString()
        };

        await ctx.stub.putState(propertyId, Buffer.from(JSON.stringify(property)));
        return JSON.stringify(property);
    }

    async registerDocumentHash(ctx, documentId, propertyId, docType, sha256Hash) {
        const propBytes = await ctx.stub.getState(propertyId);
        if (!propBytes || propBytes.length === 0) {
            throw new Error(`Property ${propertyId} does not exist`);
        }

        const docRecord = {
            docType: 'document',
            documentId,
            propertyId,
            documentType: docType,
            sha256Hash,
            registeredBy: ctx.clientIdentity.getID(),
            timestamp: new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString()
        };

        await ctx.stub.putState(`DOC_${documentId}`, Buffer.from(JSON.stringify(docRecord)));
        return JSON.stringify(docRecord);
    }

    async transferOwnership(ctx, propertyId, newOwner) {
        const clientOrg = ctx.clientIdentity.getMSPID();
        if (clientOrg !== 'RegistrarMSP' && clientOrg !== 'Org1MSP') {
            throw new Error(`Unauthorized: Org [${clientOrg}] cannot approve ownership transfers`);
        }

        const propBytes = await ctx.stub.getState(propertyId);
        if (!propBytes || propBytes.length === 0) {
            throw new Error(`Property ${propertyId} does not exist`);
        }

        const property = JSON.parse(propBytes.toString());

        if (property.status === 'FROZEN') {
            throw new Error(`Property ${propertyId} is FROZEN`);
        }
        if (property.status === 'MORTGAGED') {
            throw new Error(`Property ${propertyId} is MORTGAGED`);
        }

        const previousOwner = property.currentOwner;
        property.currentOwner = newOwner;
        property.status = 'ACTIVE';
        property.lastConveyanceDate = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString();

        await ctx.stub.putState(propertyId, Buffer.from(JSON.stringify(property)));
        return JSON.stringify({ propertyId, previousOwner, newOwner });
    }

    async getProperty(ctx, propertyId) {
        const propBytes = await ctx.stub.getState(propertyId);
        if (!propBytes || propBytes.length === 0) {
            throw new Error(`Property ${propertyId} does not exist`);
        }
        return propBytes.toString();
    }

    async getPropertyHistory(ctx, propertyId) {
        const promiseIterator = ctx.stub.getHistoryForKey(propertyId);
        const results = [];
        for await (const keyMod of promiseIterator) {
            const resp = {
                txId: keyMod.txId,
                timestamp: new Date(keyMod.timestamp.seconds.low * 1000).toISOString(),
                isDelete: keyMod.isDelete,
                value: keyMod.value ? keyMod.value.toString('utf8') : null
            };
            results.push(resp);
        }
        return JSON.stringify(results);
    }

    async propertyExists(ctx, propertyId) {
        const propBytes = await ctx.stub.getState(propertyId);
        return propBytes && propBytes.length > 0;
    }
}

module.exports = LandChainContract;
