import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { propertyApi, documentApi } from '../api/client';
import type { Property, PropertyDocument, DocumentType, VerifyDocumentResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import DynamicSidebar from '../components/DynamicSidebar';

export const PropertyDocumentsPage: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload Form State
  const [uploadType, setUploadType] = useState<DocumentType>('SALE_DEED');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Verification State
  const [selectedVerifyDocId, setSelectedVerifyDocId] = useState<string>('');
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyDocumentResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Helper to generate a valid PDF blob and File for samples
  const createSamplePdf = (title: string, details: string, altered = false): { blob: Blob; file: File } => {
    const stamp = altered ? 'MODIFIED / TAMPERED COPY - ALTERED DIGEST' : 'AUTHENTIC ORIGINAL RECORD - CERTIFIED DEED';
    const pdfString = `%PDF-1.4
%âãÏÓ
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 260 >>
stream
BT
/F1 18 Tf
50 720 Td
(LANDCHAIN LEGAL CADASTRE) Tj
/F1 14 Tf
0 -30 Td
(${title}) Tj
/F1 11 Tf
0 -25 Td
(${details}) Tj
0 -25 Td
(${stamp}) Tj
0 -25 Td
(Security Protocol: SHA-256 Digest Verification) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000015 00000 n 
0000000064 00000 n 
0000000121 00000 n 
0000000244 00000 n 
0000000318 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
630
%%EOF`;

    const blob = new Blob([pdfString], { type: 'application/pdf' });
    const filename = altered ? 'sale-deed-altered.pdf' : 'sale-deed.pdf';
    const file = new File([blob], filename, { type: 'application/pdf' });
    return { blob, file };
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const loadProperty = async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    try {
      const [data, docs] = await Promise.all([
        propertyApi.getById(propertyId),
        documentApi.getByProperty(propertyId).catch(() => []),
      ]);
      setProperty(data);
      const docList = (docs && docs.length > 0) ? docs : (data.documents || []);
      setDocuments(docList);
      if (docList.length > 0 && !selectedVerifyDocId) {
        setSelectedVerifyDocId(docList[0].documentId);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load property documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperty();
  }, [propertyId]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !uploadFile) {
      setUploadError('Please select a PDF document to upload.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const newDoc = await documentApi.upload(propertyId, uploadFile, uploadType);
      setUploadSuccess(`Document ${newDoc.documentId} (${newDoc.originalFileName}) registered successfully with SHA-256 hash.`);
      setUploadFile(null);
      const fileInput = document.getElementById('upload-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Immediately add the new document to state
      setDocuments((prev) => [newDoc, ...prev.filter((d) => d.documentId !== newDoc.documentId)]);
      setSelectedVerifyDocId(newDoc.documentId);

      // Refresh in background to ensure all records sync
      const [refreshedProp, refreshedDocs] = await Promise.all([
        propertyApi.getById(propertyId).catch(() => null),
        documentApi.getByProperty(propertyId).catch(() => []),
      ]);
      if (refreshedProp) setProperty(refreshedProp);
      if (refreshedDocs && refreshedDocs.length > 0) {
        setDocuments(refreshedDocs);
      }
    } catch (err: any) {
      setUploadError(err.response?.data?.message || err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVerifyDocId || !verifyFile) {
      setVerifyError('Select a registered document record and a candidate file.');
      return;
    }

    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const res = await documentApi.verify(selectedVerifyDocId, verifyFile);
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyError(err.response?.data?.message || err.message || 'Verification process failed.');
    } finally {
      setVerifying(false);
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
      alert('Failed to download: ' + (err.message || 'Network error'));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  if (!user) return null;

  // Role Protection: Admin cannot access property documents
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
                The <strong style={{ color: '#fff' }}>ADMIN</strong> role is restricted to system operations, identity management, and audit logs. Title deeds and documents are reserved for operational participants (Government, Registrar, Owner, Bank, Auditor).
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
            <Link to={`/properties/${propertyId}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>{propertyId}</Link>
            <span className="lc-topbar__crumb-sep">/</span>
            <span className="lc-topbar__crumb-current">Documents</span>
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
                <div>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
                    Document Storage & SHA-256 Verifier
                  </h1>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                    Parcel <strong style={{ color: 'var(--violet-light)', fontFamily: 'monospace' }}>{property.propertyId}</strong> · Survey No: <strong style={{ color: '#fff' }}>{property.surveyNumber}</strong> · {property.village}, {property.district}
                  </p>
                </div>

                <Link
                  to={`/properties/${property.propertyId}`}
                  className="lc-btn lc-btn-ghost"
                  style={{ textDecoration: 'none', fontSize: '0.78rem', padding: '0.45rem 0.9rem' }}
                >
                  ← Back to Parcel Specs
                </Link>
              </div>

              {/* Grid: Upload (Left) for REGISTRAR & Registered Deeds, or Full-Width Registered Deeds for others */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: user.role === 'REGISTRAR' ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr',
                gap: '1.25rem'
              }}>
                
                {/* Left Column: Upload Card ONLY for REGISTRAR */}
                {user.role === 'REGISTRAR' && (
                  <div className="lc-card">
                    <div className="lc-card__header">
                      <span className="lc-card__title">📤 Sub-Registrar Deed Registration</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--emerald)', fontWeight: 700 }}>Official Registry Desk</span>
                    </div>

                    <div className="lc-card__body">
                      {uploadSuccess && (
                        <div style={{
                          padding: '0.65rem 0.9rem',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          color: '#6ee7b7',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          marginBottom: '1rem',
                        }}>
                          ✓ {uploadSuccess}
                        </div>
                      )}

                      {uploadError && (
                        <div className="lc-error" style={{ marginBottom: '1rem' }}>
                          ⚠ {uploadError}
                        </div>
                      )}

                      <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="lc-form-group">
                          <label className="lc-label">Document Classification *</label>
                          <select
                            value={uploadType}
                            onChange={(e) => setUploadType(e.target.value as DocumentType)}
                            className="lc-input"
                            style={{ width: '100%', fontSize: '0.84rem' }}
                          >
                            <option value="SALE_DEED">Sale Deed (Title Transfer)</option>
                            <option value="REGISTRATION_DOCUMENT">Registration Document (Official Cadastre)</option>
                            <option value="TAX_DOCUMENT">Tax Assessment Document</option>
                            <option value="OTHER">Other Official Document</option>
                          </select>
                        </div>

                        <div className="lc-form-group">
                          <label className="lc-label">Select PDF Document *</label>
                          <input
                            id="upload-file-input"
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setUploadFile(e.target.files[0]);
                              }
                            }}
                            className="lc-input"
                            style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem' }}
                          />

                          {/* Quick Sample Actions */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.5rem 0.75rem',
                            marginTop: '0.5rem',
                          }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              Sample File:
                            </span>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const { blob } = createSamplePdf(`SALE DEED - ${property?.propertyId}`, `Survey No: ${property?.surveyNumber}`);
                                  triggerDownload(blob, 'sale-deed.pdf');
                                }}
                                className="lc-btn"
                                style={{
                                  padding: '0.25rem 0.55rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#2dd4bf',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                📥 Download PDF
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const { file } = createSamplePdf(`SALE DEED - ${property?.propertyId}`, `Survey No: ${property?.surveyNumber}`);
                                  setUploadFile(file);
                                }}
                                className="lc-btn"
                                style={{
                                  padding: '0.25rem 0.55rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  color: '#fff',
                                  border: '1px solid var(--border)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                ✨ Auto-Attach
                              </button>
                            </div>
                          </div>

                          {uploadFile && (
                            <div style={{
                              marginTop: '0.5rem',
                              padding: '0.4rem 0.65rem',
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              color: '#6ee7b7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}>
                              <span>📎 <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                              <span style={{ fontWeight: 800, fontSize: '0.68rem' }}>READY</span>
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={uploading || !uploadFile}
                          className="lc-btn lc-btn-primary"
                          style={{
                            width: '100%',
                            padding: '0.65rem',
                            fontSize: '0.84rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            marginTop: '0.5rem',
                          }}
                        >
                          {uploading ? (
                            <>
                              <div className="lc-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                              <span>Computing SHA-256 & Registering…</span>
                            </>
                          ) : (
                            <>
                              <span>🏛️</span>
                              <span>Register Title Deed & SHA-256</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Registered Deeds List */}
                <div className="lc-card">
                  <div className="lc-card__header">
                    <span className="lc-card__title">📑 Registered Documents ({documents.length})</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cryptographic Archive</span>
                  </div>

                  <div className="lc-card__body">
                    {documents.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '3rem 1rem',
                        border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}>
                        <span style={{ fontSize: '2rem' }}>📁</span>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                          No documents registered yet.
                        </p>
                        {user.role === 'REGISTRAR' ? (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                            Use the form on the left to upload a title deed.
                          </p>
                        ) : (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                            Official title deeds will appear here once executed by the Sub-Registrar.
                          </p>
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

                            {/* SHA-256 Box with Copy */}
                            <div style={{
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid rgba(13, 148, 136, 0.15)',
                              borderRadius: '4px',
                              padding: '0.45rem 0.65rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.2rem',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                                  H2 Database SHA-256
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(doc.sha256Hash)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--violet-light)',
                                    fontSize: '0.68rem',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                  }}
                                >
                                  {copiedHash === doc.sha256Hash ? '✓ Copied' : 'Copy'}
                                </button>
                              </div>
                              <span style={{
                                fontSize: '0.7rem',
                                fontFamily: 'monospace',
                                color: 'var(--text-primary)',
                                wordBreak: 'break-all',
                              }}>
                                {doc.sha256Hash}
                              </span>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                              <button
                                type="button"
                                onClick={() => handleDownload(doc)}
                                className="lc-btn lc-btn-ghost"
                                style={{ padding: '0.3rem 0.7rem', fontSize: '0.74rem' }}
                              >
                                📥 Download PDF
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVerifyDocId(doc.documentId);
                                  const el = document.getElementById('verifier-section');
                                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="lc-btn"
                                style={{
                                  padding: '0.3rem 0.7rem',
                                  fontSize: '0.74rem',
                                  background: 'rgba(13, 148, 136, 0.15)',
                                  color: '#2dd4bf',
                                  border: '1px solid rgba(13, 148, 136, 0.4)',
                                  cursor: 'pointer',
                                }}
                              >
                                🔍 Verify Hash
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Cryptographic Verification Section */}
              <div id="verifier-section" className="lc-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                  }}>
                    🔍
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                      Cryptographic SHA-256 Verifier
                    </h2>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                      Upload any test PDF to verify if its computed hash matches the archived registry record.
                    </p>
                  </div>
                </div>

                {verifyError && (
                  <div className="lc-error" style={{ marginBottom: '1rem' }}>
                    ⚠ {verifyError}
                  </div>
                )}

                <form onSubmit={handleVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    
                    <div className="lc-form-group">
                      <label className="lc-label">Target Document Record *</label>
                      <select
                        value={selectedVerifyDocId}
                        onChange={(e) => setSelectedVerifyDocId(e.target.value)}
                        className="lc-input"
                        style={{ width: '100%', fontSize: '0.84rem', fontFamily: 'monospace' }}
                      >
                        <option value="">-- Select a registered document --</option>
                        {documents.map((d) => (
                          <option key={d.documentId} value={d.documentId}>
                            {d.documentId} — {d.originalFileName} ({d.documentType})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lc-form-group">
                      <label className="lc-label">Candidate PDF File to Test *</label>
                      <input
                        id="verify-file-input"
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setVerifyFile(e.target.files[0]);
                          }
                        }}
                        className="lc-input"
                        style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem' }}
                      />

                      {/* Sample Verification Options */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.5rem 0.75rem',
                        marginTop: '0.5rem',
                      }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Test Files:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const { blob } = createSamplePdf(`SALE DEED - ${property?.propertyId}`, `Survey No: ${property?.surveyNumber}`);
                              triggerDownload(blob, 'sale-deed.pdf');
                            }}
                            className="lc-btn"
                            style={{
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#2dd4bf',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            📥 Download Match
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const { blob } = createSamplePdf(`SALE DEED - ${property?.propertyId}`, `Survey No: ${property?.surveyNumber}`, true);
                              triggerDownload(blob, 'sale-deed-altered.pdf');
                            }}
                            className="lc-btn"
                            style={{
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: 'rgba(244, 63, 94, 0.15)',
                              color: 'var(--rose)',
                              border: '1px solid rgba(244, 63, 94, 0.4)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            📥 Download Altered
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const { file } = createSamplePdf(`SALE DEED - ${property?.propertyId}`, `Survey No: ${property?.surveyNumber}`);
                              setVerifyFile(file);
                            }}
                            className="lc-btn"
                            style={{
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#fff',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            ✨ Auto-Attach Match
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const { file } = createSamplePdf(`SALE DEED - ${property?.propertyId}`, `Survey No: ${property?.surveyNumber}`, true);
                              setVerifyFile(file);
                            }}
                            className="lc-btn"
                            style={{
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: 'rgba(244, 63, 94, 0.1)',
                              color: 'var(--rose)',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            ⚠️ Auto-Attach Altered
                          </button>
                        </div>
                      </div>

                      {verifyFile && (
                        <div style={{
                          marginTop: '0.5rem',
                          padding: '0.4rem 0.65rem',
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '4px',
                          fontSize: '0.74rem',
                          color: '#7dd3fc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <span>📎 Candidate: <strong>{verifyFile.name}</strong> ({(verifyFile.size / 1024).toFixed(1)} KB)</span>
                          <span style={{ fontWeight: 800, fontSize: '0.68rem' }}>READY</span>
                        </div>
                      )}
                    </div>

                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                      type="submit"
                      disabled={verifying || !selectedVerifyDocId || !verifyFile}
                      className="lc-btn lc-btn-primary"
                      style={{
                        padding: '0.6rem 1.4rem',
                        fontSize: '0.84rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      {verifying ? (
                        <>
                          <div className="lc-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                          <span>Computing Digest…</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>Run Cryptographic Verification</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Verification Result Panel */}
                {verifyResult && (() => {
                  const isMatch = verifyResult.matches || verifyResult.status === 'MATCH';
                  return (
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isMatch ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                      border: `1px solid ${isMatch ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: isMatch ? '#6ee7b7' : 'var(--rose)',
                          background: isMatch ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)',
                          border: `1px solid ${isMatch ? '#10b981' : '#f43f5e'}`,
                        }}>
                          {isMatch ? '✓ MATCH' : '✗ MISMATCH'}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: isMatch ? '#a7f3d0' : '#fecdd3', fontWeight: 600 }}>
                          {verifyResult.message}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'monospace', fontSize: '0.74rem' }}>
                        <div style={{
                          background: 'rgba(0,0,0,0.5)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '4px',
                          padding: '0.5rem 0.75rem',
                        }}>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.66rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.15rem' }}>
                            Database Hash ({verifyResult.documentId})
                          </span>
                          <span style={{ color: '#fff', wordBreak: 'break-all' }}>
                            {verifyResult.storedHash}
                          </span>
                        </div>

                        <div style={{
                          background: 'rgba(0,0,0,0.5)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '4px',
                          padding: '0.5rem 0.75rem',
                        }}>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.66rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.15rem' }}>
                            Candidate File Hash ({verifyResult.originalFileName})
                          </span>
                          <span style={{ color: isMatch ? '#6ee7b7' : 'var(--rose)', wordBreak: 'break-all', fontWeight: 700 }}>
                            {verifyResult.uploadedHash}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
};
