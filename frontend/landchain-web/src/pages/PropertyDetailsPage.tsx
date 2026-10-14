import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { propertyApi, documentApi, blockchainApi, transferApi, mortgageApi, buyRequestApi } from '../api/client';
import type { Property, PropertyDocument, BlockchainHistoryRecord, BlockchainTransferRecord, BuyRequest, DocumentType } from '../types';
import { useAuth } from '../context/AuthContext';
import DynamicSidebar from '../components/DynamicSidebar';

export const PropertyDetailsPage: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [history, setHistory] = useState<BlockchainHistoryRecord[]>([]);
  const [transfers, setTransfers] = useState<BlockchainTransferRecord[]>([]);
  const [buyRequests, setBuyRequests] = useState<BuyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [buyerUsername, setBuyerUsername] = useState('buyer1');
  const [selectedDeedId, setSelectedDeedId] = useState('');
  const [transferRemarks, setTransferRemarks] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferFeedback, setTransferFeedback] = useState<string | null>(null);

  // Sub-Registrar deed upload & auto-attach on transfer
  const [registrarDocFile, setRegistrarDocFile] = useState<File | null>(null);
  const [registrarDocType, setRegistrarDocType] = useState<DocumentType>('SALE_DEED');
  const [uploadingRegistrarDoc, setUploadingRegistrarDoc] = useState(false);
  const [autoAttachOnSelect, setAutoAttachOnSelect] = useState(true);
  const [selectedExistingDocId, setSelectedExistingDocId] = useState('');

  // Mortgage modal state (for BANK)
  const [showMortgageModal, setShowMortgageModal] = useState(false);
  const [loanAmount, setLoanAmount] = useState('5000000');
  const [mortgageDeedId, setMortgageDeedId] = useState('');
  const [mortgageSubmitting, setMortgageSubmitting] = useState(false);



  const canApproveTransfer = user?.role === 'REGISTRAR' || user?.role === 'GOVERNMENT';
  const isRegistrar = user?.role === 'REGISTRAR';
  const isBanker = user?.role === 'BANK';
  const isCurrentOwner = user?.role === 'OWNER' && user?.username?.toLowerCase() === property?.ownerUsername?.toLowerCase();
  const isPotentialBuyer = user?.role === 'OWNER' && !isCurrentOwner;

  const loadData = async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    try {
      const [propData, docsData, historyData, transfersData, offersData] = await Promise.all([
        propertyApi.getById(propertyId),
        documentApi.getByProperty(propertyId).catch(() => []),
        blockchainApi.getHistory(propertyId).catch(() => []),
        transferApi.getAll().catch(() => []),
        buyRequestApi.getByProperty(propertyId).catch(() => []),
      ]);
      setProperty(propData);
      const docs = (docsData && docsData.length > 0) ? docsData : (propData.documents || []);
      setDocuments(docs);
      setHistory(historyData || []);
      const propTransfers = (transfersData || []).filter((t: BlockchainTransferRecord) => t.propertyId === propertyId);
      setTransfers(propTransfers);
      setBuyRequests(offersData || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load property details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [propertyId]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderStatusPill = (status: string) => {
    let color = 'var(--emerald)';
    let bg = 'rgba(16, 185, 129, 0.15)';
    let border = 'rgba(16, 185, 129, 0.4)';

    if (status === 'PENDING_TRANSFER') {
      color = 'var(--gold)';
      bg = 'rgba(251, 191, 36, 0.15)';
      border = 'rgba(251, 191, 36, 0.4)';
    } else if (status === 'FROZEN') {
      color = 'var(--rose)';
      bg = 'rgba(244, 63, 94, 0.15)';
      border = 'rgba(244, 63, 94, 0.4)';
    } else if (status === 'MORTGAGED') {
      color = '#a855f7';
      bg = 'rgba(168, 85, 247, 0.15)';
      border = 'rgba(168, 85, 247, 0.4)';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '999px',
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: '0.06em',
          color,
          background: bg,
          border: `1px solid ${border}`,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
        {status}
      </span>
    );
  };

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setTransferSubmitting(true);
    setTransferFeedback(null);
    try {
      if (isCurrentOwner) {
        await transferApi.initiate({
          propertyId: property.propertyId,
          newOwner: buyerUsername,
          deedDocumentId: selectedDeedId || undefined,
          remarks: transferRemarks || undefined,
        });
        setTransferFeedback('✓ Transfer proposal initiated on Hyperledger Fabric! Status set to PENDING_BUYER_ACCEPTANCE.');
      } else {
        await transferApi.initiate({
          propertyId: property.propertyId,
          remarks: transferRemarks || undefined,
        });
        setTransferFeedback('✓ Purchase transaction initiated on Hyperledger Fabric! Status set to PENDING_OWNER_ACCEPTANCE.');
      }
      setTimeout(() => {
        setShowTransferModal(false);
        setTransferFeedback(null);
        setTransferRemarks('');
        loadData();
      }, 1500);
    } catch (err: any) {
      setTransferFeedback('✗ Error: ' + (err.response?.data?.message || err.message || 'Failed to initiate transfer'));
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handleAcceptTransfer = async (transferId: string) => {
    if (!window.confirm('Confirm accepting this property transfer transaction? Both parties must accept before the Sub-Registrar reviews and executes it.')) return;
    setLoading(true);
    try {
      await transferApi.accept(transferId);
      alert('✓ Transfer transaction accepted! Both parties have accepted; proposal is forwarded to the Sub-Registrar for document upload and execution.');
      loadData();
    } catch (err: any) {
      alert('Failed to accept transfer: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const handleCancelTransfer = async (transferId: string, askReason: boolean = false) => {
    let reason = 'Cancelled by user';
    if (askReason) {
      const input = window.prompt('Specify reason for cancelling / rejecting this transfer proposal:', 'Discrepancy in documentation / terms');
      if (input === null) return;
      if (input.trim()) reason = input.trim();
    } else {
      if (!window.confirm('Are you sure you want to cancel this transfer transaction? Property will be restored to ACTIVE.')) return;
    }
    setLoading(true);
    try {
      await transferApi.cancel(transferId, reason);
      alert('✓ Transfer transaction cancelled. Property status restored to ACTIVE.');
      loadData();
    } catch (err: any) {
      alert('Failed to cancel transfer: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  // Frontend-level Auto-Attach: Generates authoritative conveyance deed in browser memory and uploads it
  const handleFrontendAutoAttachDeed = async (trf: BlockchainTransferRecord) => {
    if (!property) return;
    setUploadingRegistrarDoc(true);
    try {
      const timestamp = new Date().toISOString();
      const deedText = `================================================================================
GOVERNMENT LAND REGISTRY & CADASTRAL RECORD
AUTHORITATIVE DEED OF TITLE TRANSFER & CONVEYANCE (SALE DEED)
================================================================================
Cadastral Parcel Identification: ${property.propertyId}
Cadastral Survey Number: ${property.surveyNumber}
Revenue Village: ${property.village}
Taluk / Tahsil: ${property.taluk}
District: ${property.district}
Area / Extent: ${property.area} | Parcel Type: ${property.propertyType}
Conveyance Transfer ID: ${trf.transferId}
Registration Timestamp: ${timestamp}

GRANTOR (PREVIOUS REGISTERED TITLE HOLDER): @${trf.currentOwner}
GRANTEE (AUTHORITATIVE NEW BUYER): @${trf.newOwner}
INITIATED BY: @${trf.initiatedBy} (Mutual Acceptance Complete)

REGISTRATION AUTHORITY:
Sub-Registrar Authority: @${user?.username || 'registrar1'}
MSP Organization: RegistrarMSP
Authoritative Channel: Hyperledger Fabric [landchannel]

LEGAL DECLARATION & COVENANTS:
In consideration of mutual agreement between Grantor and Grantee,
all rights, title, interest, claims, and possession in the cadastral parcel
specified above are hereby fully, freely, and irrevocably conveyed and vested in the Grantee.
This official instrument is cryptographically sealed, hashed with SHA-256, and recorded
on the distributed ledger.
================================================================================`;

      const fileName = `Official_Sale_Deed_${trf.transferId}.txt`;
      const blob = new Blob([deedText], { type: 'text/plain' });
      const autoDeedFile = new File([blob], fileName, { type: 'text/plain' });

      await transferApi.uploadDoc(trf.transferId, autoDeedFile, 'SALE_DEED');
      alert(`✓ Frontend Auto-Attached Official Sale Deed (${fileName})! Cryptographic SHA-256 hash registered on Fabric.`);
      loadData();
    } catch (err: any) {
      alert('Failed to auto-attach deed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingRegistrarDoc(false);
    }
  };

  const handleAttachExistingDoc = async (transferId: string, docId: string) => {
    if (!docId) {
      alert('Please select a document from the dropdown to attach.');
      return;
    }
    setUploadingRegistrarDoc(true);
    try {
      await transferApi.attachDoc(transferId, docId);
      alert(`✓ Document #${docId} successfully attached to transfer proposal!`);
      loadData();
    } catch (err: any) {
      alert('Failed to attach document: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingRegistrarDoc(false);
    }
  };

  const handleRegistrarFileChange = async (e: React.ChangeEvent<HTMLInputElement>, transferId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRegistrarDocFile(file);

    if (autoAttachOnSelect) {
      setUploadingRegistrarDoc(true);
      try {
        await transferApi.uploadDoc(transferId, file, registrarDocType);
        alert(`✓ Auto-attached imported file "${file.name}" to transfer! SHA-256 hash registered on Fabric.`);
        setRegistrarDocFile(null);
        // Reset file input
        e.target.value = '';
        loadData();
      } catch (err: any) {
        alert('Failed to auto-attach imported file: ' + (err.response?.data?.message || err.message));
      } finally {
        setUploadingRegistrarDoc(false);
      }
    }
  };

  const handleUploadTransferDoc = async (transferId: string) => {
    if (!registrarDocFile) {
      alert('Please select a document file to upload.');
      return;
    }
    setUploadingRegistrarDoc(true);
    try {
      await transferApi.uploadDoc(transferId, registrarDocFile, registrarDocType);
      alert('✓ Official deed uploaded and SHA-256 cryptographic hash anchored to Fabric ledger!');
      setRegistrarDocFile(null);
      loadData();
    } catch (err: any) {
      alert('Failed to upload document: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingRegistrarDoc(false);
    }
  };

  const handleApproveTransfer = async (transferId: string, deedDocId?: string) => {
    if (!window.confirm('Confirm executing authoritative title conveyance on Hyperledger Fabric blockchain? Ownership will be irrevocably transferred.')) return;
    setLoading(true);
    try {
      await transferApi.approve(transferId, deedDocId);
      alert('✓ Title conveyance successfully committed to Hyperledger Fabric! New owner is now authoritative.');
      loadData();
    } catch (err: any) {
      alert('Failed to approve transfer: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const handleFileMortgage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setMortgageSubmitting(true);
    try {
      await mortgageApi.file({
        propertyId: property.propertyId,
        amount: parseFloat(loanAmount),
        bankName: user?.organization || 'Commercial Apex Bank',
        documentId: mortgageDeedId || undefined,
      });
      alert('✓ Mortgage lien filed on Hyperledger Fabric! Property state is now MORTGAGED.');
      setShowMortgageModal(false);
      loadData();
    } catch (err: any) {
      alert('Failed to file mortgage: ' + (err.response?.data?.message || err.message));
    } finally {
      setMortgageSubmitting(false);
    }
  };

  const handleReleaseMortgage = async () => {
    if (!property) return;
    if (!window.confirm('Confirm releasing mortgage encumbrance on Hyperledger Fabric blockchain?')) return;
    setLoading(true);
    try {
      await mortgageApi.release(property.propertyId);
      alert('✓ Mortgage encumbrance released on Hyperledger Fabric! Property status restored to ACTIVE.');
      loadData();
    } catch (err: any) {
      alert('Failed to release mortgage: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };



  const handleAcceptBuyRequest = async (requestId: string) => {
    if (!window.confirm('Accept purchase offer and initiate title conveyance proposal on Hyperledger Fabric?')) return;
    setLoading(true);
    try {
      await buyRequestApi.accept(requestId);
      alert('✓ Offer accepted! Transfer proposal registered on Fabric awaiting Sub-Registrar review.');
      loadData();
    } catch (err: any) {
      alert('Failed to accept offer: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const handleRejectBuyRequest = async (requestId: string) => {
    try {
      await buyRequestApi.reject(requestId);
      loadData();
    } catch (err: any) {
      alert('Failed to reject offer: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDownload = async (doc: PropertyDocument) => {
    try {
      const blob = await documentApi.download(doc.documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFileName || `${doc.documentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Failed to download document: ' + (err.message || 'Network error'));
    }
  };

  if (!user) return null;

  // Role Protection: Admin cannot view property details
  if (user.role === 'ADMIN') {
    return (
      <div className="lc-portal-wrapper">
        <DynamicSidebar
          activeTab="desk"
          onSelectTab={() => navigate('/dashboard')}
          user={user}
          onLogout={handleLogout}
        />
        <div className="lc-portal-main">
          <header className="lc-topbar">
            <div className="lc-topbar__left">
              <span className="lc-topbar__crumb-section">LandChain</span>
              <span className="lc-topbar__crumb-sep">/</span>
              <span className="lc-topbar__crumb-current">Access Restricted</span>
            </div>
            <div className="lc-topbar__right">
              <div className="lc-topbar__user">
                <span className="lc-topbar__user-name">{user.fullName}</span>
                <span className={`lc-role-badge lc-role-badge--${user.role}`} style={{ padding: '0.15rem 0.55rem', fontSize: '0.66rem' }}>
                  {user.role}
                </span>
              </div>
            </div>
          </header>
          <main className="lc-portal-content">
            <div className="lc-card" style={{ maxWidth: 620, margin: '3rem auto', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛡️</div>
              <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Administrative Access Restriction
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                The <strong style={{ color: '#fff' }}>ADMIN</strong> role is restricted to system operations, identity management, and audit logs. Cadastral records and property details are reserved for operational participants (Government, Registrar, Owner, Bank, Auditor).
              </p>
              <button
                type="button"
                className="lc-btn lc-btn-primary"
                onClick={() => navigate('/dashboard')}
                style={{ margin: '0 auto' }}
              >
                ← Return to Admin Console
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="lc-portal-wrapper">
      <DynamicSidebar
        activeTab="properties"
        onSelectTab={(tabId) => {
          if (tabId === 'desk' || tabId === 'profile' || tabId === 'privileges' || tabId === 'members' || tabId === 'logs') {
            navigate('/dashboard');
          } else if (tabId === 'properties') {
            navigate('/properties');
          } else if (tabId === 'blockchain') {
            navigate('/blockchain');
          }
        }}
        user={user}
        onLogout={handleLogout}
      />

      <div className="lc-portal-main">
        {/* Top bar */}
        <header className="lc-topbar">
          <div className="lc-topbar__left">
            <span className="lc-topbar__crumb-section">LandChain</span>
            <span className="lc-topbar__crumb-sep">/</span>
            <Link to="/properties" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>Properties</Link>
            <span className="lc-topbar__crumb-sep">/</span>
            <span className="lc-topbar__crumb-current">{propertyId}</span>
          </div>

          <div className="lc-topbar__right">
            <div className="lc-topbar__user">
              <span className="lc-topbar__user-name">{user.fullName}</span>
              <span className={`lc-role-badge lc-role-badge--${user.role}`} style={{ padding: '0.15rem 0.55rem', fontSize: '0.66rem' }}>
                {user.role}
              </span>
            </div>
          </div>
        </header>

        <main className="lc-portal-content">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
              <div className="lc-spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
            </div>
          ) : error || !property ? (
            <div className="lc-card" style={{ maxWidth: 500, margin: '2rem auto', textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--rose)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>
                {error || 'Property not found.'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/properties')}
                className="lc-btn lc-btn-ghost"
                style={{ margin: '0 auto' }}
              >
                ← Back to Registry
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Header Title Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem 1.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: 'var(--violet-dim)',
                    border: '1px solid var(--violet-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                  }}>
                    🏛
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace', letterSpacing: '-0.02em', margin: 0 }}>
                        {property.propertyId}
                      </h1>
                      {renderStatusPill(property.status)}
                      {property.ownerUsername?.toLowerCase() === user.username.toLowerCase() ? (
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          color: '#6ee7b7',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}>
                          ★ My Property (Title Owner)
                        </span>
                      ) : property.ownerUsername ? (
                        <span style={{
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          color: '#38bdf8',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}>
                          👤 Title Owner: @{property.ownerUsername}
                        </span>
                      ) : null}
                      {property.blockchainTxId ? (
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          color: '#34d399',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}>
                          <span>⛓️ Fabric Block #{property.blockchainBlockNumber || 1}</span>
                          <span>·</span>
                          <span>Tx: {property.blockchainTxId.substring(0, 12)}…</span>
                        </span>
                      ) : null}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                      Survey No: <strong style={{ color: '#fff' }}>{property.surveyNumber}</strong> · {property.village}, {property.district}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                  {/* Owner: Initiate Transfer */}
                  {isCurrentOwner && property.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => setShowTransferModal(true)}
                      className="lc-btn"
                      style={{
                        padding: '0.55rem 1.15rem',
                        fontSize: '0.82rem',
                        background: 'linear-gradient(135deg, #0d9488, #059669)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>🔄</span>
                      <span>Initiate Transfer</span>
                    </button>
                  )}

                  {/* Banker: File Mortgage Lien */}
                  {isBanker && property.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => setShowMortgageModal(true)}
                      className="lc-btn"
                      style={{
                        padding: '0.55rem 1.15rem',
                        fontSize: '0.82rem',
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>🏦</span>
                      <span>File Mortgage Lien</span>
                    </button>
                  )}

                  {/* Banker: Release Mortgage */}
                  {isBanker && property.status === 'MORTGAGED' && (
                    <button
                      type="button"
                      onClick={handleReleaseMortgage}
                      className="lc-btn"
                      style={{
                        padding: '0.55rem 1.15rem',
                        fontSize: '0.82rem',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>🔓</span>
                      <span>Release Mortgage</span>
                    </button>
                  )}

                  {/* Buyer: Start Transfer / Buy Transaction */}
                  {isPotentialBuyer && property.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => setShowTransferModal(true)}
                      className="lc-btn"
                      style={{
                        padding: '0.55rem 1.15rem',
                        fontSize: '0.82rem',
                        background: 'linear-gradient(135deg, #0d9488, #059669)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>🛒</span>
                      <span>Start Buy Transaction</span>
                    </button>
                  )}



                  <Link
                    to={`/properties/${property.propertyId}/documents`}
                    className="lc-btn lc-btn-primary"
                    style={{
                      padding: '0.55rem 1.15rem',
                      fontSize: '0.82rem',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>📑</span>
                    <span>{isRegistrar ? 'Manage Documents' : 'View Documents'} ({documents.length})</span>
                  </Link>
                </div>
              </div>

              {/* Quick Spec Metrics Bar */}
              <div className="lc-mini-stats">
                <div className="lc-mini-stat">
                  <span className="lc-mini-stat__label">Survey Number</span>
                  <span className="lc-mini-stat__val" style={{ fontFamily: 'monospace', color: '#fff' }}>
                    {property.surveyNumber}
                  </span>
                </div>
                <div className="lc-mini-stat">
                  <span className="lc-mini-stat__label">Title Owner</span>
                  <span className="lc-mini-stat__val" style={{ color: 'var(--gold)' }}>
                    {property.ownerUsername ? `@${property.ownerUsername}` : 'Unassigned'}
                  </span>
                </div>
                <div className="lc-mini-stat">
                  <span className="lc-mini-stat__label">Property Type</span>
                  <span className="lc-mini-stat__val" style={{ color: 'var(--violet-light)' }}>
                    {property.propertyType}
                  </span>
                </div>
                <div className="lc-mini-stat">
                  <span className="lc-mini-stat__label">Area / Extent</span>
                  <span className="lc-mini-stat__val" style={{ color: 'var(--emerald)' }}>
                    {property.area}
                  </span>
                </div>
                <div className="lc-mini-stat">
                  <span className="lc-mini-stat__label">Taluk / Tehsil</span>
                  <span className="lc-mini-stat__val" style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                    {property.taluk}
                  </span>
                </div>
              </div>

              {/* Main Content Grid: 2 Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                
                {/* Left Card: Geographic & Cadastral Specs */}
                <div className="lc-card">
                  <div className="lc-card__header">
                    <span className="lc-card__title">📍 Cadastral Specifications</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Jurisdiction Record</span>
                  </div>
                  <div className="lc-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div style={{ background: 'var(--bg-surface)', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                          Village
                        </span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {property.village}
                        </span>
                      </div>

                      <div style={{ background: 'var(--bg-surface)', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                          District
                        </span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {property.district}
                        </span>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                        Registered Legal Address
                      </span>
                      <p style={{ fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                        {property.address}
                      </p>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.8rem',
                      background: 'rgba(13, 148, 136, 0.08)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(13, 148, 136, 0.2)',
                      fontSize: '0.74rem',
                      color: 'var(--text-secondary)',
                    }}>
                      <span>Registered Date</span>
                      <strong style={{ color: '#fff' }}>
                        {property.createdAt ? new Date(property.createdAt).toLocaleDateString() : 'Active'}
                      </strong>
                    </div>

                  </div>
                </div>

                {/* Right Card: Documents & Immutability */}
                <div className="lc-card">
                  <div className="lc-card__header">
                    <span className="lc-card__title">📑 Title Deeds & Documents ({documents.length})</span>
                    <Link
                      to={`/properties/${property.propertyId}/documents`}
                      style={{ fontSize: '0.74rem', color: 'var(--violet-light)', textDecoration: 'none', fontWeight: 700 }}
                    >
                      {isRegistrar ? 'Manage Deeds →' : 'Verify SHA-256 →'}
                    </Link>
                  </div>

                  <div className="lc-card__body">
                    {documents.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '2.5rem 1rem',
                        border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}>
                        <span style={{ fontSize: '2rem' }}>📁</span>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                          No documents registered on this parcel.
                        </p>
                        {isRegistrar && (
                          <Link
                            to={`/properties/${property.propertyId}/documents`}
                            className="lc-btn lc-btn-ghost"
                            style={{
                              marginTop: '0.5rem',
                              fontSize: '0.78rem',
                              padding: '0.4rem 0.9rem',
                              textDecoration: 'none',
                            }}
                          >
                            + Register Document
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {documents.map((doc) => (
                          <div
                            key={doc.documentId}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.85rem 1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: 'var(--emerald)',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                }}>
                                  {doc.documentId}
                                </span>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  color: 'var(--gold)',
                                  background: 'rgba(251, 191, 36, 0.1)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                }}>
                                  {doc.documentType}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>
                              📄 {doc.originalFileName}
                            </div>

                            {/* Monospace SHA-256 Box */}
                            <div style={{
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid rgba(13, 148, 136, 0.15)',
                              borderRadius: '4px',
                              padding: '0.4rem 0.6rem',
                              fontSize: '0.7rem',
                              fontFamily: 'monospace',
                              color: 'var(--text-secondary)',
                              wordBreak: 'break-all',
                            }}>
                              <span style={{ color: 'var(--text-muted)', marginRight: '0.4rem' }}>SHA-256:</span>
                              {doc.sha256Hash}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                              <button
                                type="button"
                                onClick={() => handleDownload(doc)}
                                className="lc-btn lc-btn-ghost"
                                style={{ padding: '0.3rem 0.7rem', fontSize: '0.74rem' }}
                              >
                                📥 Download
                              </button>
                              <Link
                                to={`/properties/${property.propertyId}/documents`}
                                className="lc-btn"
                                style={{
                                  padding: '0.3rem 0.7rem',
                                  fontSize: '0.74rem',
                                  textDecoration: 'none',
                                  background: 'rgba(13, 148, 136, 0.15)',
                                  color: '#2dd4bf',
                                  border: '1px solid rgba(13, 148, 136, 0.4)',
                                }}
                              >
                                🔍 Verify Hash
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Incoming Purchase Offers for Deed Owner */}
                {buyRequests.length > 0 && (
                  <div className="lc-card" style={{ gridColumn: '1 / -1', border: '1px solid rgba(59, 130, 246, 0.4)', background: 'rgba(59, 130, 246, 0.03)' }}>
                    <div className="lc-card__header">
                      <span className="lc-card__title">💼 Incoming Citizen Purchase Offers ({buyRequests.length})</span>
                      <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700 }}>Citizen Trading Desk</span>
                    </div>
                    <div className="lc-card__body">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {buyRequests.map((offer) => (
                          <div
                            key={offer.requestId}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '1rem',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa', fontSize: '0.8rem' }}>
                                  {offer.requestId}
                                </span>
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '999px',
                                  background: offer.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.15)' : (offer.status === 'REJECTED' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                                  color: offer.status === 'ACCEPTED' ? 'var(--emerald)' : (offer.status === 'REJECTED' ? 'var(--rose)' : '#60a5fa'),
                                  border: `1px solid ${offer.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.4)' : (offer.status === 'REJECTED' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(59, 130, 246, 0.4)')}`,
                                }}>
                                  {offer.status}
                                </span>
                                <strong style={{ color: 'var(--emerald)', fontSize: '0.9rem' }}>
                                  ₹{offer.offeredPrice.toLocaleString()}
                                </strong>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.82rem', color: '#fff' }}>
                                Buyer: <strong style={{ color: 'var(--gold)' }}>@{offer.buyerUsername}</strong>
                                {offer.message && <span style={{ color: 'var(--text-secondary)' }}> — "{offer.message}"</span>}
                              </p>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Offered on {new Date(offer.createdAt).toLocaleString()}
                              </span>
                            </div>

                            {isCurrentOwner && offer.status === 'PENDING' && property.status === 'ACTIVE' && (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptBuyRequest(offer.requestId)}
                                  className="lc-btn"
                                  style={{
                                    padding: '0.45rem 1rem',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  ✓ Accept & Transfer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectBuyRequest(offer.requestId)}
                                  className="lc-btn lc-btn-ghost"
                                  style={{
                                    padding: '0.45rem 0.8rem',
                                    fontSize: '0.76rem',
                                    color: 'var(--rose)',
                                    borderColor: 'rgba(244, 63, 94, 0.3)',
                                  }}
                                >
                                  ✗ Decline
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cadastral Title Transfer & Conveyance Workflow */}
                {(canApproveTransfer || transfers.length > 0) && (
                  <div
                    className="lc-card"
                    style={{
                      gridColumn: '1 / -1',
                      border: '1px solid rgba(13, 148, 136, 0.4)',
                      background: 'linear-gradient(180deg, rgba(13, 148, 136, 0.05) 0%, rgba(15, 23, 42, 0.6) 100%)',
                    }}
                  >
                    <div className="lc-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className="lc-card__title" style={{ fontSize: '1rem', color: '#fff', fontWeight: 800 }}>
                          🏛️ Property Title Transfer Workflow
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '999px',
                            background: 'rgba(13, 148, 136, 0.2)',
                            color: '#2dd4bf',
                            border: '1px solid rgba(45, 212, 191, 0.3)',
                          }}
                        >
                          {transfers.filter((t) => t.status !== 'APPROVED' && t.status !== 'REJECTED' && t.status !== 'CANCELLED').length} Active
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Hyperledger Fabric Distributed Conveyance Protocol
                      </span>
                    </div>

                    <div className="lc-card__body">
                      {transfers.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '0.5rem 0' }}>
                          No transfer proposals initiated on this parcel yet.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          {transfers.map((trf) => {
                            const isPendingBuyer = trf.status === 'PENDING_BUYER_ACCEPTANCE';
                            const isPendingOwner = trf.status === 'PENDING_OWNER_ACCEPTANCE';
                            const isPendingRegistrar = trf.status === 'PENDING_REGISTRAR' || trf.status === 'INITIATED';
                            const isApproved = trf.status === 'APPROVED';
                            const isCancelled = trf.status === 'REJECTED' || trf.status === 'CANCELLED';

                            const isUserDesignatedBuyer = user?.username?.toLowerCase() === trf.newOwner?.toLowerCase();
                            const isUserCurrentOwner = user?.username?.toLowerCase() === trf.currentOwner?.toLowerCase();

                            // Determine status badge styling
                            let badgeBg = 'rgba(251, 191, 36, 0.15)';
                            let badgeColor = '#fbbf24';
                            let badgeBorder = 'rgba(251, 191, 36, 0.4)';
                            let statusLabel: string = trf.status;

                            if (isApproved) {
                              badgeBg = 'rgba(16, 185, 129, 0.15)';
                              badgeColor = '#34d399';
                              badgeBorder = 'rgba(16, 185, 129, 0.4)';
                              statusLabel = '✓ CONVEYED ON-CHAIN';
                            } else if (isCancelled) {
                              badgeBg = 'rgba(244, 63, 94, 0.15)';
                              badgeColor = '#f87171';
                              badgeBorder = 'rgba(244, 63, 94, 0.4)';
                              statusLabel = '✗ CANCELLED';
                            } else if (isPendingRegistrar) {
                              badgeBg = 'rgba(6, 182, 212, 0.15)';
                              badgeColor = '#22d3ee';
                              badgeBorder = 'rgba(6, 182, 212, 0.4)';
                              statusLabel = '⚖️ AWAITING SUB-REGISTRAR';
                            } else if (isPendingBuyer) {
                              statusLabel = `⏳ AWAITING BUYER ACCEPTANCE (@${trf.newOwner})`;
                            } else if (isPendingOwner) {
                              statusLabel = `⏳ AWAITING OWNER ACCEPTANCE (@${trf.currentOwner})`;
                            }

                            return (
                              <div
                                key={trf.transferId}
                                style={{
                                  background: 'var(--bg-surface)',
                                  border: `1px solid ${isPendingRegistrar ? 'rgba(6, 182, 212, 0.4)' : (isApproved ? 'rgba(16, 185, 129, 0.4)' : 'var(--border)')}`,
                                  borderRadius: 'var(--radius-md)',
                                  padding: '1.25rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '1rem',
                                  boxShadow: isPendingRegistrar ? '0 0 20px rgba(6, 182, 212, 0.08)' : 'none',
                                }}
                              >
                                {/* Header Row */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#fbbf24', fontSize: '0.9rem' }}>
                                      {trf.transferId}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '999px',
                                        background: badgeBg,
                                        color: badgeColor,
                                        border: `1px solid ${badgeBorder}`,
                                        letterSpacing: '0.04em',
                                      }}
                                    >
                                      {statusLabel}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    Initiated on {new Date(trf.initiatedAt).toLocaleString()} by <strong style={{ color: '#fff' }}>@{trf.initiatedBy}</strong>
                                  </span>
                                </div>

                                {/* Participants Overview */}
                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.85rem' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Current Owner:</span>
                                    <strong style={{ color: '#fbbf24' }}>@{trf.currentOwner}</strong>
                                    {trf.ownerAccepted ? (
                                      <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>✓ Accepted</span>
                                    ) : (
                                      <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 700 }}>⏳ Pending</span>
                                    )}
                                  </div>
                                  <span style={{ color: 'var(--text-muted)' }}>➔</span>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Target Buyer:</span>
                                    <strong style={{ color: '#34d399' }}>@{trf.newOwner}</strong>
                                    {trf.buyerAccepted ? (
                                      <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>✓ Accepted</span>
                                    ) : (
                                      <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 700 }}>⏳ Pending</span>
                                    )}
                                  </div>
                                  {trf.deedDocumentId && (
                                    <span style={{ fontSize: '0.75rem', color: '#60a5fa', marginLeft: 'auto' }}>
                                      📎 Deed: <strong>{trf.deedDocumentId}</strong>
                                    </span>
                                  )}
                                </div>

                                {/* 4-Step Stepper Progress Bar */}
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(4, 1fr)',
                                    gap: '0.5rem',
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                  }}
                                >
                                  {/* Step 1 */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#34d399' }}>1. Initiated ✓</span>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>By @{trf.initiatedBy}</span>
                                  </div>
                                  {/* Step 2 */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    <span
                                      style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        color: trf.ownerAccepted && trf.buyerAccepted ? '#34d399' : '#fbbf24',
                                      }}
                                    >
                                      2. Mutual Acceptance {trf.ownerAccepted && trf.buyerAccepted ? '✓' : '⏳'}
                                    </span>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                      {trf.ownerAccepted && trf.buyerAccepted ? 'Both Agreed' : 'Awaiting Peer'}
                                    </span>
                                  </div>
                                  {/* Step 3 */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    <span
                                      style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        color: isApproved ? '#34d399' : (isPendingRegistrar ? '#22d3ee' : 'var(--text-muted)'),
                                      }}
                                    >
                                      3. Registrar Review {isApproved ? '✓' : (isPendingRegistrar ? '📂' : '🔒')}
                                    </span>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                      {trf.deedDocumentId ? 'Docs Attached' : (isPendingRegistrar ? 'Ready for Docs' : 'Pending Step 2')}
                                    </span>
                                  </div>
                                  {/* Step 4 */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    <span
                                      style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        color: isApproved ? '#34d399' : (isCancelled ? '#f87171' : 'var(--text-muted)'),
                                      }}
                                    >
                                      4. Conveyance {isApproved ? '✓' : (isCancelled ? '✗' : '⏳')}
                                    </span>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                      {isApproved ? 'Minted on Fabric' : (isCancelled ? 'Cancelled' : 'Pending')}
                                    </span>
                                  </div>
                                </div>

                                {/* Action Areas */}

                                {/* Case A: Buyer acceptance required */}
                                {isPendingBuyer && (
                                  <div
                                    style={{
                                      background: 'rgba(251, 191, 36, 0.08)',
                                      border: '1px solid rgba(251, 191, 36, 0.3)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '0.85rem 1rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      flexWrap: 'wrap',
                                      gap: '0.75rem',
                                    }}
                                  >
                                    <div>
                                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>
                                        {isUserDesignatedBuyer
                                          ? `🔔 Action Required: Owner @${trf.currentOwner} has proposed transferring this title to you.`
                                          : `⏳ Awaiting acceptance from designated buyer @${trf.newOwner}.`}
                                      </p>
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        Both owner and buyer must accept before the transaction is escalated to the Sub-Registrar.
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      {isUserDesignatedBuyer && (
                                        <button
                                          type="button"
                                          onClick={() => handleAcceptTransfer(trf.transferId)}
                                          className="lc-btn"
                                          style={{
                                            padding: '0.5rem 1.1rem',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          ✓ Accept Transfer Proposal
                                        </button>
                                      )}
                                      {(isUserDesignatedBuyer || isUserCurrentOwner || canApproveTransfer) && (
                                        <button
                                          type="button"
                                          onClick={() => handleCancelTransfer(trf.transferId, false)}
                                          className="lc-btn lc-btn-ghost"
                                          style={{
                                            padding: '0.5rem 0.9rem',
                                            fontSize: '0.78rem',
                                            color: 'var(--rose)',
                                            borderColor: 'rgba(244, 63, 94, 0.3)',
                                          }}
                                        >
                                          ✗ Decline / Cancel
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Case B: Owner acceptance required */}
                                {isPendingOwner && (
                                  <div
                                    style={{
                                      background: 'rgba(251, 191, 36, 0.08)',
                                      border: '1px solid rgba(251, 191, 36, 0.3)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '0.85rem 1rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      flexWrap: 'wrap',
                                      gap: '0.75rem',
                                    }}
                                  >
                                    <div>
                                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>
                                        {isUserCurrentOwner
                                          ? `🔔 Action Required: Buyer @${trf.newOwner} has initiated a transaction to acquire your parcel.`
                                          : `⏳ Awaiting acceptance from deed owner @${trf.currentOwner}.`}
                                      </p>
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        Both owner and buyer must accept before the transaction is escalated to the Sub-Registrar.
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      {isUserCurrentOwner && (
                                        <button
                                          type="button"
                                          onClick={() => handleAcceptTransfer(trf.transferId)}
                                          className="lc-btn"
                                          style={{
                                            padding: '0.5rem 1.1rem',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          ✓ Accept Purchase Transaction
                                        </button>
                                      )}
                                      {(isUserDesignatedBuyer || isUserCurrentOwner || canApproveTransfer) && (
                                        <button
                                          type="button"
                                          onClick={() => handleCancelTransfer(trf.transferId, false)}
                                          className="lc-btn lc-btn-ghost"
                                          style={{
                                            padding: '0.5rem 0.9rem',
                                            fontSize: '0.78rem',
                                            color: 'var(--rose)',
                                            borderColor: 'rgba(244, 63, 94, 0.3)',
                                          }}
                                        >
                                          ✗ Decline / Cancel
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Case C: Awaiting Sub-Registrar Execution (Both accepted!) */}
                                {isPendingRegistrar && (
                                  <div
                                    style={{
                                      background: 'rgba(6, 182, 212, 0.05)',
                                      border: '1px solid rgba(6, 182, 212, 0.3)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '1rem',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '0.85rem',
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                      <div>
                                        <h4 style={{ margin: 0, fontSize: '0.86rem', color: '#22d3ee', fontWeight: 700 }}>
                                          ⚖️ Sub-Registrar Conveyance Desk
                                        </h4>
                                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                                          Both parties have accepted! The Sub-Registrar must review, upload official deeds, and execute or cancel.
                                        </p>
                                      </div>
                                      {trf.deedDocumentId && (
                                        <span
                                          style={{
                                            fontSize: '0.72rem',
                                            background: 'rgba(16, 185, 129, 0.15)',
                                            color: '#34d399',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                          }}
                                        >
                                          ✓ Official Deed Attached: {trf.deedDocumentId}
                                        </span>
                                      )}
                                    </div>

                                    {/* Registrar-only Document Upload & Execution Tools */}
                                    {canApproveTransfer ? (
                                      <div
                                        style={{
                                          background: 'rgba(0, 0, 0, 0.35)',
                                          border: '1px solid rgba(255, 255, 255, 0.08)',
                                          borderRadius: 'var(--radius-sm)',
                                          padding: '1rem',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '0.9rem',
                                        }}
                                      >
                                        {/* Status / Alert */}
                                        {trf.deedDocumentId ? (
                                          <div
                                            style={{
                                              padding: '0.5rem 0.75rem',
                                              borderRadius: 'var(--radius-sm)',
                                              background: 'rgba(16, 185, 129, 0.12)',
                                              border: '1px solid rgba(16, 185, 129, 0.3)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              flexWrap: 'wrap',
                                              gap: '0.4rem',
                                            }}
                                          >
                                            <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
                                              ✓ Deed Attached: <strong>Doc #{trf.deedDocumentId}</strong> (Cryptographic SHA-256 registered on-chain)
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                              Ready for final conveyance execution
                                            </span>
                                          </div>
                                        ) : (
                                          <div
                                            style={{
                                              padding: '0.5rem 0.75rem',
                                              borderRadius: 'var(--radius-sm)',
                                              background: 'rgba(245, 158, 11, 0.1)',
                                              border: '1px solid rgba(245, 158, 11, 0.3)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              flexWrap: 'wrap',
                                              gap: '0.4rem',
                                            }}
                                          >
                                            <span style={{ fontSize: '0.76rem', color: '#fbbf24', fontWeight: 600 }}>
                                              ⚠️ Official Deed Required: Use Frontend Auto-Attach or import a deed document before execution.
                                            </span>
                                          </div>
                                        )}

                                        {/* 1. Frontend-Level Instant Auto-Attach Deed */}
                                        <div
                                          style={{
                                            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.08))',
                                            border: '1px solid rgba(6, 182, 212, 0.25)',
                                            borderRadius: 'var(--radius-sm)',
                                            padding: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            flexWrap: 'wrap',
                                            gap: '0.6rem',
                                          }}
                                        >
                                          <div>
                                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#22d3ee', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                              <span>✨</span> Frontend-Level Auto-Attach Deed Generator
                                            </div>
                                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                              Synthesizes legal conveyance deed in browser memory with parcel identifiers, parties, and covenants, hashes with SHA-256, and attaches immediately.
                                            </p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleFrontendAutoAttachDeed(trf)}
                                            disabled={uploadingRegistrarDoc}
                                            className="lc-btn"
                                            style={{
                                              padding: '0.45rem 1rem',
                                              fontSize: '0.76rem',
                                              fontWeight: 700,
                                              background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                                              color: '#fff',
                                              border: 'none',
                                              borderRadius: 'var(--radius-sm)',
                                              cursor: uploadingRegistrarDoc ? 'not-allowed' : 'pointer',
                                              boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)',
                                            }}
                                          >
                                            {uploadingRegistrarDoc ? 'Generating & Attaching…' : '⚡ Auto-Generate & Attach Deed'}
                                          </button>
                                        </div>

                                        {/* 2. File Import with Auto-Attach Option */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                                            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#fff' }}>
                                              📂 Import Deed / Conveyance Document:
                                            </span>
                                            <label
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                fontSize: '0.74rem',
                                                color: '#38bdf8',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                fontWeight: 600,
                                              }}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={autoAttachOnSelect}
                                                onChange={(e) => setAutoAttachOnSelect(e.target.checked)}
                                              />
                                              <span>⚡ Auto-attach on file import</span>
                                            </label>
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                                            <input
                                              type="file"
                                              accept=".pdf,.txt,.doc,.docx"
                                              onChange={(e) => handleRegistrarFileChange(e, trf.transferId)}
                                              style={{ fontSize: '0.76rem', color: '#fff', maxWidth: 220 }}
                                            />
                                            <select
                                              className="lc-input"
                                              style={{ width: 'auto', padding: '0.35rem 0.6rem', fontSize: '0.76rem' }}
                                              value={registrarDocType}
                                              onChange={(e) => setRegistrarDocType(e.target.value as DocumentType)}
                                            >
                                              <option value="SALE_DEED">SALE_DEED (Title Conveyance)</option>
                                              <option value="CONVEYANCE_DEED">CONVEYANCE_DEED</option>
                                              <option value="MUTATION_CERTIFICATE">MUTATION_CERTIFICATE</option>
                                              <option value="TAX_CLEARANCE">TAX_CLEARANCE</option>
                                              <option value="ENCUMBRANCE_CERTIFICATE">ENCUMBRANCE_CERTIFICATE</option>
                                            </select>
                                            {!autoAttachOnSelect && (
                                              <button
                                                type="button"
                                                onClick={() => handleUploadTransferDoc(trf.transferId)}
                                                disabled={!registrarDocFile || uploadingRegistrarDoc}
                                                className="lc-btn"
                                                style={{
                                                  padding: '0.4rem 0.85rem',
                                                  fontSize: '0.76rem',
                                                  fontWeight: 700,
                                                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                                  color: '#fff',
                                                  border: 'none',
                                                  borderRadius: 'var(--radius-sm)',
                                                  cursor: registrarDocFile ? 'pointer' : 'not-allowed',
                                                }}
                                              >
                                                {uploadingRegistrarDoc ? 'Uploading…' : '📤 Upload & Attach'}
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {/* 3. Attach Existing Document from Parcel Record */}
                                        {documents && documents.length > 0 && (
                                          <div
                                            style={{
                                              paddingTop: '0.5rem',
                                              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              flexWrap: 'wrap',
                                              gap: '0.5rem',
                                            }}
                                          >
                                            <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                                              Or attach existing parcel document:
                                            </span>
                                            <select
                                              className="lc-input"
                                              style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.74rem' }}
                                              value={selectedExistingDocId}
                                              onChange={(e) => setSelectedExistingDocId(e.target.value)}
                                            >
                                              <option value="">-- Select Existing Document --</option>
                                              {documents.map((d) => (
                                                <option key={d.documentId} value={d.documentId}>
                                                  #{d.documentId} - {d.documentType} ({d.originalFileName || 'file'})
                                                </option>
                                              ))}
                                            </select>
                                            <button
                                              type="button"
                                              onClick={() => handleAttachExistingDoc(trf.transferId, selectedExistingDocId)}
                                              disabled={!selectedExistingDocId || uploadingRegistrarDoc}
                                              className="lc-btn lc-btn-ghost"
                                              style={{
                                                padding: '0.3rem 0.75rem',
                                                fontSize: '0.74rem',
                                                borderColor: 'rgba(6, 182, 212, 0.4)',
                                                color: '#22d3ee',
                                                cursor: selectedExistingDocId ? 'pointer' : 'not-allowed',
                                              }}
                                            >
                                              📎 Attach Selected Doc
                                            </button>
                                          </div>
                                        )}

                                        {/* 4. Sub-Registrar Final Execution Actions */}
                                        <div
                                          style={{
                                            display: 'flex',
                                            gap: '0.75rem',
                                            marginTop: '0.3rem',
                                            paddingTop: '0.75rem',
                                            borderTop: '1px solid rgba(255,255,255,0.08)',
                                            flexWrap: 'wrap',
                                          }}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => handleApproveTransfer(trf.transferId, trf.deedDocumentId)}
                                            className="lc-btn"
                                            style={{
                                              padding: '0.6rem 1.4rem',
                                              fontSize: '0.82rem',
                                              fontWeight: 800,
                                              background: 'linear-gradient(135deg, #10b981, #059669)',
                                              color: '#fff',
                                              border: 'none',
                                              borderRadius: 'var(--radius-sm)',
                                              cursor: 'pointer',
                                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                            }}
                                          >
                                            ✓ Accept & Execute On-Chain Conveyance
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleCancelTransfer(trf.transferId, true)}
                                            className="lc-btn lc-btn-ghost"
                                            style={{
                                              padding: '0.6rem 1rem',
                                              fontSize: '0.82rem',
                                              color: 'var(--rose)',
                                              borderColor: 'rgba(244, 63, 94, 0.4)',
                                            }}
                                          >
                                            ✗ Reject & Cancel Transfer
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#fff' }}>
                                          The Sub-Registrar desk is preparing conveyance documentation and executing the transfer.
                                        </p>
                                        {(isUserDesignatedBuyer || isUserCurrentOwner) && (
                                          <button
                                            type="button"
                                            onClick={() => handleCancelTransfer(trf.transferId, false)}
                                            className="lc-btn lc-btn-ghost"
                                            style={{
                                              padding: '0.4rem 0.8rem',
                                              fontSize: '0.75rem',
                                              color: 'var(--rose)',
                                              borderColor: 'rgba(244, 63, 94, 0.3)',
                                            }}
                                          >
                                            Withdraw / Cancel Proposal
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Case D: Approved */}
                                {isApproved && (
                                  <div
                                    style={{
                                      background: 'rgba(16, 185, 129, 0.08)',
                                      border: '1px solid rgba(16, 185, 129, 0.3)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '0.85rem 1rem',
                                      fontSize: '0.8rem',
                                      color: '#34d399',
                                    }}
                                  >
                                    <strong>✓ Title Conveyance Formally Executed on Blockchain!</strong> Authoritative Owner: <strong>@{trf.newOwner}</strong>.
                                    Approved by @{trf.approvedBy || 'Registrar'} · Fabric Block #{trf.blockNumber || 1} · TxID: {trf.txId ? trf.txId.substring(0, 16) + '…' : 'Committed'}.
                                  </div>
                                )}

                                {/* Case E: Cancelled */}
                                {isCancelled && (
                                  <div
                                    style={{
                                      background: 'rgba(244, 63, 94, 0.08)',
                                      border: '1px solid rgba(244, 63, 94, 0.3)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '0.85rem 1rem',
                                      fontSize: '0.8rem',
                                      color: '#f87171',
                                    }}
                                  >
                                    <strong>✗ Transfer Proposal Cancelled:</strong> {trf.cancellationReason || 'Declined'}.
                                    {trf.rejectedBy && ` (Actioned by @${trf.rejectedBy})`}. Property status has been restored to ACTIVE.
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Hyperledger Fabric Ownership History Timeline */}
                <div className="lc-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="lc-card__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="lc-card__title">⛓️ Authoritative Hyperledger Fabric Ledger History ({history.length} Blocks)</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--emerald)', fontWeight: 700, fontFamily: 'monospace' }}>
                      GET /api/blockchain/properties/{property.propertyId}/history
                    </span>
                  </div>
                  <div className="lc-card__body">
                    {history.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '0.5rem 0' }}>
                        No on-chain state transitions recorded yet.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {history.slice().reverse().map((h, idx) => (
                          <div
                            key={h.txId || idx}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.9rem 1.1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.4rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  color: '#34d399',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                }}>
                                  Block #{h.blockNumber}
                                </span>
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: h.action === 'TRANSFER_CONVEYED' ? '#38bdf8' : (h.action === 'REGISTER_PROPERTY' ? 'var(--gold)' : 'var(--emerald)'),
                                  background: 'rgba(255,255,255,0.06)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                }}>
                                  {h.action}
                                </span>
                                {h.status && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    State: <strong>{h.status}</strong>
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.84rem', color: '#fff', margin: '0.2rem 0' }}>
                              {h.details}
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.7rem',
                              fontFamily: 'monospace',
                              color: 'var(--text-muted)',
                              background: 'rgba(0,0,0,0.3)',
                              padding: '0.35rem 0.6rem',
                              borderRadius: '4px',
                            }}>
                              <span>TxID: <strong style={{ color: 'var(--text-secondary)' }}>{h.txId}</strong></span>
                              <span>Endorser: <strong style={{ color: 'var(--gold)' }}>{h.actorMsp || 'Org1MSP'}</strong> (@{h.actor})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Transfer Initiation Modal */}
          {showTransferModal && property && (
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
                maxWidth: 520,
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 700 }}>
                    {isCurrentOwner ? '🔄 Initiate Property Transfer Proposal' : '🛒 Initiate Property Purchase Transaction'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.2rem' }}>
                  {isCurrentOwner
                    ? `You are initiating a title conveyance proposal for parcel ${property.propertyId} (${property.surveyNumber}). The designated buyer must accept before the transaction is escalated to the Sub-Registrar desk.`
                    : `You are initiating a transaction to acquire parcel ${property.propertyId} (${property.surveyNumber}) from Owner @${property.ownerUsername}. The owner must accept before the transaction is escalated to the Sub-Registrar desk.`}
                </p>

                {transferFeedback && (
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem',
                    fontSize: '0.8rem',
                    background: transferFeedback.startsWith('✓') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                    color: transferFeedback.startsWith('✓') ? '#34d399' : '#f87171',
                    border: `1px solid ${transferFeedback.startsWith('✓') ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
                  }}>
                    {transferFeedback}
                  </div>
                )}

                <form onSubmit={handleInitiateTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {isCurrentOwner ? (
                    <div className="lc-form-group">
                      <label className="lc-label">Designated Buyer Account Username *</label>
                      <input
                        className="lc-input"
                        value={buyerUsername}
                        onChange={(e) => setBuyerUsername(e.target.value)}
                        placeholder="e.g. buyer1"
                        required
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Available seed buyers: <strong>buyer1</strong>, <strong>buyer2</strong>, or any registered citizen.
                      </span>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Current Authoritative Owner:</span>
                        <strong style={{ color: '#fbbf24' }}>@{property.ownerUsername}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Initiating Buyer:</span>
                        <strong style={{ color: '#34d399' }}>@{user?.username}</strong>
                      </div>
                    </div>
                  )}

                  <div className="lc-form-group">
                    <label className="lc-label">Transaction Remarks / Notes (Optional)</label>
                    <input
                      className="lc-input"
                      value={transferRemarks}
                      onChange={(e) => setTransferRemarks(e.target.value)}
                      placeholder="e.g. Purchase agreement terms, payment reference, mutual understanding"
                    />
                  </div>

                  {isCurrentOwner && documents.length > 0 && (
                    <div className="lc-form-group">
                      <label className="lc-label">Associated Deed Document Proof (Optional)</label>
                      <select
                        className="lc-input"
                        value={selectedDeedId}
                        onChange={(e) => setSelectedDeedId(e.target.value)}
                      >
                        <option value="">-- Attach deed document --</option>
                        {documents.map((d) => (
                          <option key={d.documentId} value={d.documentId}>
                            {d.documentId} ({d.documentType}) - {d.originalFileName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowTransferModal(false)}
                      className="lc-btn lc-btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={transferSubmitting}
                      className="lc-btn lc-btn-primary"
                    >
                      {transferSubmitting
                        ? 'Submitting to Fabric…'
                        : isCurrentOwner
                          ? 'Submit Transfer Proposal (Awaiting Buyer)'
                          : 'Submit Purchase Transaction (Awaiting Owner)'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Mortgage Filing Modal for Bankers */}
          {showMortgageModal && property && (
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
                maxWidth: 520,
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 700 }}>
                    🏦 File Mortgage Encumbrance
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowMortgageModal(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.2rem' }}>
                  Registering a formal banking encumbrance against parcel <strong style={{ color: '#fff' }}>{property.propertyId}</strong> on Hyperledger Fabric.
                  The title will be marked <strong style={{ color: '#a855f7' }}>MORTGAGED</strong>, locking any transfers until released.
                </p>

                <form onSubmit={handleFileMortgage} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="lc-form-group">
                    <label className="lc-label">Loan Disbursed / Encumbrance Amount (₹) *</label>
                    <input
                      type="number"
                      className="lc-input"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      placeholder="e.g. 5000000"
                      required
                    />
                  </div>

                  {documents.length > 0 && (
                    <div className="lc-form-group">
                      <label className="lc-label">Associated Title Deed Document (Optional)</label>
                      <select
                        className="lc-input"
                        value={mortgageDeedId}
                        onChange={(e) => setMortgageDeedId(e.target.value)}
                      >
                        <option value="">-- Select mortgaged document deed --</option>
                        {documents.map((d) => (
                          <option key={d.documentId} value={d.documentId}>
                            {d.documentId} ({d.documentType}) - {d.originalFileName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowMortgageModal(false)}
                      className="lc-btn lc-btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={mortgageSubmitting}
                      className="lc-btn"
                      style={{
                        padding: '0.6rem 1.2rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      {mortgageSubmitting ? 'Registering Lien on Fabric…' : '✓ Commit Mortgage to Ledger'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}



        </main>
      </div>
    </div>
  );
};
