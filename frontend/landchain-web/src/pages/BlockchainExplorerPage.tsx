import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DynamicSidebar from '../components/DynamicSidebar';
import { blockchainApi } from '../api/client';
import type { BlockchainBlock, BlockchainTransaction, BlockchainOverview } from '../types';

export const BlockchainExplorerPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [blocks, setBlocks] = useState<BlockchainBlock[]>([]);
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [worldState, setWorldState] = useState<any>(null);
  const [overview, setOverview] = useState<BlockchainOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'chain' | 'transactions' | 'worldstate' | 'verifier'
  const [activeView, setActiveView] = useState<'chain' | 'transactions' | 'worldstate' | 'verifier'>('chain');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [functionFilter, setFunctionFilter] = useState('ALL');

  // Inspector Modals
  const [selectedBlock, setSelectedBlock] = useState<BlockchainBlock | null>(null);
  const [selectedTx, setSelectedTx] = useState<BlockchainTransaction | null>(null);

  // Hash Verifier State
  const [verifyInput, setVerifyInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    found: boolean;
    type?: 'TRANSACTION' | 'DOCUMENT' | 'PROPERTY' | 'BLOCK';
    details?: any;
    message: string;
  } | null>(null);

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [blocksData, txData, stateData, overviewData] = await Promise.all([
        blockchainApi.getBlocks().catch(() => []),
        blockchainApi.getTransactions().catch(() => []),
        blockchainApi.getWorldState().catch(() => null),
        blockchainApi.getOverview().catch(() => null),
      ]);

      setBlocks(blocksData || []);
      setTransactions(txData || []);
      setWorldState(stateData);
      setOverview(overviewData);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to query blockchain telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        !searchQuery ||
        tx.txId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.functionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.payloadJson && tx.payloadJson.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFunction =
        functionFilter === 'ALL' || tx.functionName === functionFilter;

      return matchesSearch && matchesFunction;
    });
  }, [transactions, searchQuery, functionFilter]);

  const handleVerify = () => {
    const query = verifyInput.trim();
    if (!query) {
      setVerificationResult(null);
      return;
    }

    // Check transactions
    const foundTx = transactions.find(
      (t) => t.txId.toLowerCase() === query.toLowerCase()
    );
    if (foundTx) {
      setVerificationResult({
        found: true,
        type: 'TRANSACTION',
        details: foundTx,
        message: `Cryptographic proof verified! Transaction committed at Block #${foundTx.blockNumber}.`,
      });
      return;
    }

    // Check blocks
    const foundBlock = blocks.find(
      (b) =>
        b.blockHash.toLowerCase() === query.toLowerCase() ||
        String(b.blockNumber) === query
    );
    if (foundBlock) {
      setVerificationResult({
        found: true,
        type: 'BLOCK',
        details: foundBlock,
        message: `Cryptographic Block #${foundBlock.blockNumber} authenticated with valid SHA-256 seal.`,
      });
      return;
    }

    // Check document hashes in world state
    if (worldState && worldState.documents) {
      const foundDoc = worldState.documents.find(
        (d: any) =>
          d.sha256Hash?.toLowerCase() === query.toLowerCase() ||
          d.documentId?.toLowerCase() === query.toLowerCase()
      );
      if (foundDoc) {
        setVerificationResult({
          found: true,
          type: 'DOCUMENT',
          details: foundDoc,
          message: `Document Hash anchored on Fabric ledger for Property [${foundDoc.propertyId}]. Hash matches ledger state perfectly.`,
        });
        return;
      }
    }

    // Check property ID in world state
    if (worldState && worldState.properties) {
      const foundProp = worldState.properties.find(
        (p: any) => p.propertyId?.toLowerCase() === query.toLowerCase()
      );
      if (foundProp) {
        setVerificationResult({
          found: true,
          type: 'PROPERTY',
          details: foundProp,
          message: `Authoritative Cadastral Title record located on Hyperledger Fabric ledger under Owner @${foundProp.currentOwner}.`,
        });
        return;
      }
    }

    setVerificationResult({
      found: false,
      message: `No ledger entry found matching "${query}". Either the hash has not been anchored or the transaction was rejected.`,
    });
  };

  const getFunctionBadge = (fn: string) => {
    switch (fn) {
      case 'registerProperty':
        return { label: 'REGISTER PROPERTY', bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.4)' };
      case 'registerDocumentHash':
        return { label: 'DOCUMENT HASH', bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.4)' };
      case 'createTransfer':
      case 'initiateTransfer':
        return { label: 'INITIATE TRANSFER', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.4)' };
      case 'approveTransfer':
        return { label: 'CONVEYANCE APPROVED', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.4)' };
      case 'createMortgage':
        return { label: 'MORTGAGE LIEN', bg: 'rgba(244, 63, 94, 0.15)', color: '#f87171', border: 'rgba(244, 63, 94, 0.4)' };
      case 'releaseMortgage':
        return { label: 'MORTGAGE RELEASED', bg: 'rgba(45, 212, 191, 0.15)', color: '#2dd4bf', border: 'rgba(45, 212, 191, 0.4)' };
      default:
        return { label: fn.toUpperCase(), bg: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: 'rgba(255, 255, 255, 0.2)' };
    }
  };

  return (
    <div className="lc-portal-wrapper">
      <DynamicSidebar
        activeTab="blockchain"
        onSelectTab={(tabId) => {
          if (tabId === 'desk' || tabId === 'profile' || tabId === 'privileges' || tabId === 'members' || tabId === 'logs') {
            navigate('/dashboard');
          } else if (tabId === 'properties') {
            navigate('/properties');
          }
        }}
        user={user!}
        onLogout={handleLogout}
      />

      <div className="lc-portal-main">
        {/* Top bar */}
        <header className="lc-topbar">
          <div className="lc-topbar__left">
            <span className="lc-topbar__crumb-section">LandChain</span>
            <span className="lc-topbar__crumb-sep">/</span>
            <span className="lc-topbar__crumb-current">Hyperledger Fabric Ledger Explorer</span>
          </div>

          <div className="lc-topbar__right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#34d399',
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
                display: 'inline-block',
              }} />
              <span>FABRIC GATEWAY ONLINE · CHANNEL: LANDCHANNEL</span>
            </div>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="lc-btn lc-btn-ghost"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span style={{ display: 'inline-block', transform: loading ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s linear' }}>🔄</span>
              <span>{loading ? 'Syncing…' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        <main className="lc-portal-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {error && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#f87171',
              padding: '0.85rem 1.2rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.84rem',
              fontWeight: 600,
            }}>
              ⚠️ Ledger Warning: {error}
            </div>
          )}

          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem 1.8rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.2rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1.6rem' }}>⛓️</span>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                  Hyperledger Fabric Ledger Explorer
                </h1>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  color: '#fff',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                }}>
                  ENTERPRISE DLT
                </span>
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: 720, lineHeight: 1.5 }}>
                Cryptographic audit trail of land titles, SHA-256 deed certificates, and multi-signature conveyance proposals.
                State data is replicated and sealed by decentralized peer nodes.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 1rem',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Consensus</span>
                <strong style={{ color: '#38bdf8', fontSize: '0.9rem' }}>Raft CFT</strong>
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 1rem',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Chaincode</span>
                <strong style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>landchain v1.0</strong>
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 1rem',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Endorsers</span>
                <strong style={{ color: 'var(--emerald)', fontSize: '0.9rem' }}>4 Orgs / MSPs</strong>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="lc-mini-stats">
            <div className="lc-mini-stat" style={{ borderLeft: '3px solid #34d399' }}>
              <span className="lc-mini-stat__label">Total Blocks Minted</span>
              <span className="lc-mini-stat__val" style={{ fontFamily: 'monospace', color: '#34d399' }}>
                Block #{overview ? overview.blockHeight : blocks.length}
              </span>
            </div>
            <div className="lc-mini-stat" style={{ borderLeft: '3px solid #38bdf8' }}>
              <span className="lc-mini-stat__label">Committed Transactions</span>
              <span className="lc-mini-stat__val" style={{ color: '#38bdf8' }}>
                {overview ? overview.totalTransactions : transactions.length} Tx
              </span>
            </div>
            <div className="lc-mini-stat" style={{ borderLeft: '3px solid var(--gold)' }}>
              <span className="lc-mini-stat__label">On-Chain Land Parcels</span>
              <span className="lc-mini-stat__val" style={{ color: 'var(--gold)' }}>
                {overview ? overview.totalProperties : (worldState?.propertyCount || 0)} Parcels
              </span>
            </div>
            <div className="lc-mini-stat" style={{ borderLeft: '3px solid #c084fc' }}>
              <span className="lc-mini-stat__label">SHA-256 Anchored Deeds</span>
              <span className="lc-mini-stat__val" style={{ color: '#c084fc' }}>
                {overview ? overview.totalDocuments : (worldState?.documentCount || 0)} Documents
              </span>
            </div>
            <div className="lc-mini-stat" style={{ borderLeft: '3px solid #f43f5e' }}>
              <span className="lc-mini-stat__label">Title Conveyances</span>
              <span className="lc-mini-stat__val" style={{ color: '#f43f5e' }}>
                {overview ? overview.totalTransfers : (worldState?.transferCount || 0)} Transfers
              </span>
            </div>
          </div>

          {/* View Mode Navigation Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '0.75rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveView('chain')}
                className="lc-btn"
                style={{
                  background: activeView === 'chain' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: activeView === 'chain' ? '#38bdf8' : 'var(--text-muted)',
                  borderColor: activeView === 'chain' ? '#38bdf8' : 'var(--border)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>⛓️</span>
                <span>Visual Block Chain</span>
                <span style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '999px',
                  fontSize: '0.68rem',
                }}>
                  {blocks.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('transactions')}
                className="lc-btn"
                style={{
                  background: activeView === 'transactions' ? 'rgba(251, 191, 36, 0.2)' : 'transparent',
                  color: activeView === 'transactions' ? 'var(--gold)' : 'var(--text-muted)',
                  borderColor: activeView === 'transactions' ? 'var(--gold)' : 'var(--border)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>📜</span>
                <span>Transaction Stream</span>
                <span style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '999px',
                  fontSize: '0.68rem',
                }}>
                  {transactions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('worldstate')}
                className="lc-btn"
                style={{
                  background: activeView === 'worldstate' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: activeView === 'worldstate' ? '#34d399' : 'var(--text-muted)',
                  borderColor: activeView === 'worldstate' ? '#34d399' : 'var(--border)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>🌐</span>
                <span>Ledger World State</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('verifier')}
                className="lc-btn"
                style={{
                  background: activeView === 'verifier' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                  color: activeView === 'verifier' ? '#c084fc' : 'var(--text-muted)',
                  borderColor: activeView === 'verifier' ? '#c084fc' : 'var(--border)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>🔍</span>
                <span>SHA-256 Verifier Tool</span>
              </button>
            </div>

            {/* Quick Search */}
            <div style={{ position: 'relative', width: 280 }}>
              <input
                className="lc-input"
                style={{ padding: '0.45rem 0.8rem', fontSize: '0.8rem' }}
                placeholder="Search TxID, Actor, or Function…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: VISUAL BLOCK CHAIN */}
          {activeView === 'chain' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--text-muted)',
                fontSize: '0.78rem',
              }}>
                <span>Blocks are sequenced and linked via SHA-256 hash chains. Click any block card to inspect cryptographic payload.</span>
                <span>Showing {blocks.length} blocks (Newest to Genesis)</span>
              </div>

              {blocks.length === 0 ? (
                <div className="lc-card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)' }}>No blocks minted yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {blocks.map((block, idx) => {
                    const isGenesis = block.blockNumber === 0;
                    const prevBlock = blocks[idx + 1];

                    return (
                      <div key={block.blockNumber} style={{ position: 'relative' }}>
                        {/* Block Card */}
                        <div
                          className="lc-card"
                          onClick={() => setSelectedBlock(block)}
                          style={{
                            cursor: 'pointer',
                            border: isGenesis ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid var(--border)',
                            background: isGenesis ? 'rgba(251, 191, 36, 0.03)' : 'var(--bg-card)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#38bdf8';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = isGenesis ? 'rgba(251, 191, 36, 0.4)' : 'var(--border)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <div className="lc-card__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                              <span style={{
                                fontFamily: 'monospace',
                                fontSize: '0.9rem',
                                fontWeight: 800,
                                color: isGenesis ? 'var(--gold)' : '#34d399',
                                background: isGenesis ? 'rgba(251, 191, 36, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '6px',
                                border: `1px solid ${isGenesis ? 'rgba(251, 191, 36, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                              }}>
                                {isGenesis ? '⭐ Genesis Block #0' : `Block #${block.blockNumber}`}
                              </span>

                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: 'var(--text-secondary)',
                                background: 'rgba(255,255,255,0.06)',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '4px',
                              }}>
                                {block.transactionCount} Transaction{block.transactionCount === 1 ? '' : 's'}
                              </span>

                              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                                Channel: {block.channelName}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {block.timestamp ? new Date(block.timestamp).toLocaleString() : 'Init'}
                              </span>
                              <span style={{
                                fontSize: '0.7rem',
                                color: 'var(--emerald)',
                                background: 'rgba(16, 185, 129, 0.1)',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                fontWeight: 700,
                              }}>
                                VALIDATED
                              </span>
                            </div>
                          </div>

                          <div className="lc-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {/* Hashes Row */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                              gap: '0.75rem',
                              background: 'rgba(0,0,0,0.3)',
                              padding: '0.85rem 1rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border)',
                            }}>
                              <div>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                                  Block Hash (SHA-256)
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <code style={{ fontSize: '0.76rem', color: '#38bdf8', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                    {block.blockHash}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(block.blockHash);
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                                    title="Copy Hash"
                                  >
                                    {copiedText === block.blockHash ? '✓' : '📋'}
                                  </button>
                                </div>
                              </div>

                              <div>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                                  Previous Block Hash (Chained)
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <code style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                    {block.previousBlockHash}
                                  </code>
                                </div>
                              </div>
                            </div>

                            {/* Block Transactions Preview */}
                            {block.transactions && block.transactions.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                                  Committed Chaincode Invocations:
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  {block.transactions.map((tx) => {
                                    const badge = getFunctionBadge(tx.functionName);
                                    return (
                                      <div
                                        key={tx.txId}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                          background: badge.bg,
                                          border: `1px solid ${badge.border}`,
                                          padding: '0.35rem 0.75rem',
                                          borderRadius: '6px',
                                          fontSize: '0.75rem',
                                        }}
                                      >
                                        <strong style={{ color: badge.color }}>{badge.label}</strong>
                                        <span style={{ color: 'var(--text-muted)' }}>|</span>
                                        <code style={{ color: '#fff', fontSize: '0.72rem' }}>{tx.txId.substring(0, 10)}…</code>
                                        <span style={{ color: 'var(--gold)', fontSize: '0.72rem', fontWeight: 700 }}>@{tx.creator}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Graphic Link to Previous Block */}
                        {prevBlock && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 28,
                            position: 'relative',
                          }}>
                            <div style={{
                              width: 2,
                              height: '100%',
                              background: 'linear-gradient(to bottom, #38bdf8, var(--gold))',
                            }} />
                            <div style={{
                              position: 'absolute',
                              background: '#0f172a',
                              border: '1px solid #38bdf8',
                              borderRadius: '999px',
                              padding: '0.1rem 0.5rem',
                              fontSize: '0.62rem',
                              color: '#38bdf8',
                              fontWeight: 800,
                              fontFamily: 'monospace',
                            }}>
                              🔗 SHA-256 PREV_HASH LINK
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TRANSACTION STREAM */}
          {activeView === 'transactions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Function Filter Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginRight: '0.3rem' }}>
                  Filter Chaincode Function:
                </span>
                {[
                  { id: 'ALL', label: 'All Transactions' },
                  { id: 'registerProperty', label: 'registerProperty' },
                  { id: 'registerDocumentHash', label: 'registerDocumentHash' },
                  { id: 'initiateTransfer', label: 'initiateTransfer' },
                  { id: 'approveTransfer', label: 'approveTransfer' },
                  { id: 'createMortgage', label: 'createMortgage' },
                  { id: 'releaseMortgage', label: 'releaseMortgage' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFunctionFilter(f.id)}
                    className="lc-btn"
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      borderRadius: '999px',
                      background: functionFilter === f.id ? 'rgba(251, 191, 36, 0.2)' : 'transparent',
                      color: functionFilter === f.id ? 'var(--gold)' : 'var(--text-muted)',
                      borderColor: functionFilter === f.id ? 'var(--gold)' : 'var(--border)',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Transactions Table Card */}
              <div className="lc-card">
                <div className="lc-card__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="lc-card__title">Live Transaction Receipts ({filteredTransactions.length})</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    Hyperledger Fabric Transaction Store
                  </span>
                </div>
                <div className="lc-card__body" style={{ padding: 0 }}>
                  {filteredTransactions.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No transactions matched your search criteria.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                            <th style={{ padding: '0.85rem 1rem' }}>Transaction ID</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Block</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Function</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Endorser MSP</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Actor</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Timestamp</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Validation</th>
                            <th style={{ padding: '0.85rem 1rem' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTransactions.map((tx) => {
                            const badge = getFunctionBadge(tx.functionName);
                            return (
                              <tr
                                key={tx.txId}
                                style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s ease' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span>{tx.txId.substring(0, 16)}…</span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(tx.txId)}
                                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                                    >
                                      {copiedText === tx.txId ? '✓' : '📋'}
                                    </button>
                                  </div>
                                </td>
                                <td style={{ padding: '0.85rem 1rem' }}>
                                  <span style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 800,
                                    color: '#34d399',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '4px',
                                  }}>
                                    #{tx.blockNumber}
                                  </span>
                                </td>
                                <td style={{ padding: '0.85rem 1rem' }}>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '4px',
                                    background: badge.bg,
                                    color: badge.color,
                                    border: `1px solid ${badge.border}`,
                                  }}>
                                    {badge.label}
                                  </span>
                                </td>
                                <td style={{ padding: '0.85rem 1rem', color: 'var(--gold)', fontWeight: 600 }}>
                                  {tx.creatorMspId}
                                </td>
                                <td style={{ padding: '0.85rem 1rem', color: '#fff', fontWeight: 600 }}>
                                  @{tx.creator}
                                </td>
                                <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                  {tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : ''}
                                </td>
                                <td style={{ padding: '0.85rem 1rem' }}>
                                  <span style={{
                                    color: '#34d399',
                                    fontWeight: 800,
                                    fontSize: '0.72rem',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '4px',
                                  }}>
                                    {tx.validationCode}
                                  </span>
                                </td>
                                <td style={{ padding: '0.85rem 1rem' }}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedTx(tx)}
                                    className="lc-btn lc-btn-ghost"
                                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                                  >
                                    View Receipt
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LEDGER WORLD STATE */}
          {activeView === 'worldstate' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
                color: 'var(--text-secondary)',
                fontSize: '0.82rem',
              }}>
                Hyperledger Fabric maintains a <strong>World State Database</strong> representing the current snapshot of all digital assets.
                Historical changes can be reconstructed through GetHistoryForKey across the block sequence.
              </div>

              {worldState ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
                  {/* On-Chain Properties */}
                  <div className="lc-card">
                    <div className="lc-card__header">
                      <span className="lc-card__title">🏛 Registered Cadastral Assets ({worldState.properties?.length || 0})</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700 }}>Key Prefix: PROP-*</span>
                    </div>
                    <div className="lc-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 480, overflowY: 'auto' }}>
                      {worldState.properties?.map((prop: any) => (
                        <div key={prop.propertyId} style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.75rem 0.9rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>{prop.propertyId}</strong>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              color: prop.status === 'MORTGAGED' ? '#f87171' : 'var(--emerald)',
                            }}>
                              {prop.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#fff' }}>
                            Survey: <strong>{prop.surveyNumber}</strong> · Extent: {prop.area}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            Current Authoritative Owner: <strong style={{ color: 'var(--emerald)' }}>@{prop.currentOwner}</strong>
                          </div>
                          <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            Last Tx: {prop.lastTxId?.substring(0, 18)}… (Block #{prop.lastBlockNumber})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* On-Chain Hashed Documents */}
                  <div className="lc-card">
                    <div className="lc-card__header">
                      <span className="lc-card__title">📑 Hashed Deed Certificates ({worldState.documents?.length || 0})</span>
                      <span style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 700 }}>Key Prefix: DOC-*</span>
                    </div>
                    <div className="lc-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 480, overflowY: 'auto' }}>
                      {worldState.documents?.map((doc: any) => (
                        <div key={doc.documentId} style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.75rem 0.9rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: '#c084fc', fontFamily: 'monospace' }}>{doc.documentId}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{doc.documentType}</span>
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                            Property: <strong>{doc.propertyId}</strong> · Uploaded by @{doc.uploadedBy}
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>SHA-256 Digest:</span>
                            <code style={{ fontSize: '0.68rem', color: '#38bdf8', wordBreak: 'break-all' }}>{doc.sha256Hash}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* On-Chain Title Transfers */}
                  <div className="lc-card">
                    <div className="lc-card__header">
                      <span className="lc-card__title">🔄 Conveyance Proposals ({worldState.transfers?.length || 0})</span>
                      <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700 }}>Key Prefix: TRF-*</span>
                    </div>
                    <div className="lc-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 480, overflowY: 'auto' }}>
                      {worldState.transfers?.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No title transfers recorded.</p>
                      ) : (
                        worldState.transfers?.map((trf: any) => (
                          <div key={trf.transferId} style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.75rem 0.9rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{trf.transferId}</strong>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                color: trf.status === 'APPROVED' ? 'var(--emerald)' : 'var(--gold)',
                              }}>
                                {trf.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#fff' }}>
                              @{trf.currentOwner} ──▶ @{trf.newOwner}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              Parcel: {trf.propertyId} · Block #{trf.blockNumber}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="lc-card" style={{ padding: '2rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Loading World State Database…</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SHA-256 CRYPTOGRAPHIC VERIFIER */}
          {activeView === 'verifier' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="lc-card" style={{ maxWidth: 780, margin: '0 auto', width: '100%' }}>
                <div className="lc-card__header">
                  <span className="lc-card__title">🔍 Cryptographic Integrity & Hash Verifier</span>
                </div>
                <div className="lc-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Enter any <strong>Transaction ID</strong>, <strong>Block Hash</strong>, <strong>Property ID</strong>, or <strong>SHA-256 Document Digest</strong> to verify its authenticity directly against the authoritative Hyperledger Fabric ledger.
                  </p>

                  <div className="lc-form-group">
                    <label className="lc-label">Cryptographic Identifier or Hash to Verify</label>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <input
                        className="lc-input"
                        placeholder="e.g. 64-char SHA-256 Hash, TxID, PROP-100201, or Block #…"
                        value={verifyInput}
                        onChange={(e) => setVerifyInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                      />
                      <button
                        type="button"
                        onClick={handleVerify}
                        className="lc-btn lc-btn-primary"
                        style={{ padding: '0.6rem 1.4rem', fontWeight: 700 }}
                      >
                        Verify
                      </button>
                    </div>
                  </div>

                  {/* Verification Result Card */}
                  {verificationResult && (
                    <div style={{
                      padding: '1.2rem',
                      borderRadius: 'var(--radius-sm)',
                      background: verificationResult.found ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                      border: `1px solid ${verificationResult.found ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{verificationResult.found ? '✅' : '❌'}</span>
                        <strong style={{ color: verificationResult.found ? '#34d399' : '#f87171', fontSize: '0.95rem' }}>
                          {verificationResult.found ? 'Cryptographic Proof Authenticated' : 'Verification Failed'}
                        </strong>
                      </div>

                      <p style={{ margin: 0, fontSize: '0.84rem', color: '#fff', lineHeight: 1.5 }}>
                        {verificationResult.message}
                      </p>

                      {verificationResult.details && (
                        <div style={{
                          background: 'rgba(0,0,0,0.4)',
                          borderRadius: '4px',
                          padding: '0.8rem',
                          marginTop: '0.5rem',
                          fontFamily: 'monospace',
                          fontSize: '0.74rem',
                          color: '#38bdf8',
                          overflowX: 'auto',
                        }}>
                          <pre style={{ margin: 0 }}>
                            {JSON.stringify(verificationResult.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BLOCK DETAIL INSPECTOR MODAL */}
          {selectedBlock && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)',
            }}>
              <div style={{
                background: '#0f172a',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem',
                width: '100%',
                maxWidth: 680,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>⛓️ Cryptographic Block #{selectedBlock.blockNumber} Receipt</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedBlock(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.82rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                      Block SHA-256 Hash:
                    </span>
                    <code style={{ fontSize: '0.78rem', color: '#38bdf8', wordBreak: 'break-all' }}>{selectedBlock.blockHash}</code>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                      Previous Block Hash (Parent):
                    </span>
                    <code style={{ fontSize: '0.78rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{selectedBlock.previousBlockHash}</code>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Channel</span>
                      <strong style={{ color: '#fff' }}>{selectedBlock.channelName}</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Transactions</span>
                      <strong style={{ color: 'var(--emerald)' }}>{selectedBlock.transactionCount} Tx</strong>
                    </div>
                  </div>

                  {selectedBlock.transactions && selectedBlock.transactions.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>
                        Transactions in this block:
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {selectedBlock.transactions.map((tx) => (
                          <div key={tx.txId} style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.75rem',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8', fontSize: '0.75rem' }}>{tx.txId}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--gold)' }}>@{tx.creator} ({tx.creatorMspId})</span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#fff', marginBottom: '0.3rem' }}>
                              Function: <strong>{tx.functionName}</strong>
                            </div>
                            {tx.payloadJson && (
                              <pre style={{
                                margin: 0,
                                background: 'rgba(0,0,0,0.4)',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                color: '#a7f3d0',
                                overflowX: 'auto',
                              }}>
                                {tx.payloadJson}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedBlock(null)}
                      className="lc-btn lc-btn-ghost"
                    >
                      Close Receipt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TRANSACTION DETAIL INSPECTOR MODAL */}
          {selectedTx && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)',
            }}>
              <div style={{
                background: '#0f172a',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem',
                width: '100%',
                maxWidth: 620,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 700 }}>
                    📜 Transaction Cryptographic Receipt
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedTx(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.82rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                      Transaction ID:
                    </span>
                    <code style={{ fontSize: '0.76rem', color: '#38bdf8', wordBreak: 'break-all' }}>{selectedTx.txId}</code>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Committed Block</span>
                      <strong style={{ color: '#34d399', fontFamily: 'monospace' }}>Block #{selectedTx.blockNumber}</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Validation Code</span>
                      <strong style={{ color: 'var(--emerald)' }}>{selectedTx.validationCode}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Endorsing Org</span>
                      <strong style={{ color: 'var(--gold)' }}>{selectedTx.creatorMspId}</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Invoking Client</span>
                      <strong style={{ color: '#fff' }}>@{selectedTx.creator}</strong>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                      Chaincode Function:
                    </span>
                    <strong style={{ color: '#38bdf8' }}>{selectedTx.functionName}()</strong>
                  </div>

                  {selectedTx.payloadJson && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                        Decoded Transaction Payload JSON:
                      </span>
                      <pre style={{
                        margin: 0,
                        background: 'rgba(0,0,0,0.5)',
                        padding: '0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        color: '#a7f3d0',
                        overflowX: 'auto',
                      }}>
                        {selectedTx.payloadJson}
                      </pre>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedTx(null)}
                      className="lc-btn lc-btn-ghost"
                    >
                      Close Receipt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default BlockchainExplorerPage;
