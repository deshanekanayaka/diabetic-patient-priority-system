import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddPatientModal from './AddPatientModal';
import EditPatientModal from './EditPatientModal';

const BASE_URL = import.meta.env.VITE_API_URL;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// PriorityTable no longer fetches patients itself.
// It receives patients/loading/error from Dashboard and calls onRefresh
// after any mutation so Dashboard re-fetches and both StatCards + table update.
const PriorityTable = ({ patients = [], loading, error, onRefresh }) => {
    const [searchId,     setSearchId]     = useState('');
    const [riskFilter,   setRiskFilter]   = useState('all');
    const [page,         setPage]         = useState(1);
    const [pageSize,     setPageSize]     = useState(10);
    const [showAdd,      setShowAdd]      = useState(false);
    const [editPatient,  setEditPatient]  = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting,     setDeleting]     = useState(false);
    const [selected,     setSelected]     = useState(new Set());
    const [showSuccess,  setShowSuccess]  = useState(false);

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleting(true);
            const res = await axios.delete(`${BASE_URL}/api/patients/${deleteTarget.patient_id}`);
            if (!res.data.success) throw new Error(res.data.message);
            setDeleteTarget(null);
            onRefresh(); // ← triggers Dashboard re-fetch → StatCards + table both update
        } catch (err) {
            alert('Delete failed: ' + err.message);
        } finally {
            setDeleting(false);
        }
    };

    const toggleOne = (id) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const toggleAll = (visibleIds) =>
        setSelected((prev) => {
            const allChecked = visibleIds.every((id) => prev.has(id));
            return allChecked ? new Set() : new Set([...prev, ...visibleIds]);
        });

    // Search + filter + sort
    const filtered = patients
        .filter((p) => {
            if (searchId.trim() !== '') {
                const rawSearch = searchId.trim().replace(/^p/i, '');
                if (!String(p.patient_id).includes(rawSearch)) return false;
            }
            if (riskFilter !== 'all' && (p.risk_category || '').toLowerCase() !== riskFilter) return false;
            return true;
        })
        .sort((a, b) => (b.risk_score ?? -Infinity) - (a.risk_score ?? -Infinity));

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage   = Math.min(page, totalPages);
    const startIdx   = (safePage - 1) * pageSize;
    const pageRows   = filtered.slice(startIdx, startIdx + pageSize);
    const pageIds    = pageRows.map((p) => p.patient_id);

    // Reset page if it exceeds total
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    // Auto-dismiss success modal after 3 seconds
    useEffect(() => {
        if (!showSuccess) return;
        const timer = setTimeout(() => setShowSuccess(false), 3000);
        return () => clearTimeout(timer); // cleanup if dismissed manually first
    }, [showSuccess]);

    const pageNumbers = () => {
        const pages = [];
        for (let i = 1; i <= Math.min(4, totalPages); i++) pages.push(i);
        if (totalPages > 4) { pages.push('...'); pages.push(totalPages); }
        return pages;
    };

    const RiskBadge = ({ level = '' }) => (
        <span className={`risk-badge ${level.toLowerCase()}`}>{level || '—'}</span>
    );

    return (
        <>
            <AddPatientModal
                isOpen={showAdd}
                onClose={() => setShowAdd(false)}
                onPatientAdded={() => { setShowAdd(false); onRefresh(); setShowSuccess(true); }}
            />

            <EditPatientModal
                isOpen={!!editPatient}
                onClose={() => setEditPatient(null)}
                onPatientUpdated={() => { setEditPatient(null); onRefresh(); setShowSuccess(true); }}
                patient={editPatient}
            />

            {/* Success Modal */}
            {showSuccess && (
                <>
                    <div className="modal-overlay" onClick={() => setShowSuccess(false)} />
                    <div className="modal-panel-sm" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                        <h2 className="modal-title" style={{ justifyContent: 'center', marginBottom: 8 }}>
                            Patient Saved Successfully
                        </h2>
                        <p style={{ fontSize: 14, color: 'var(--gray-500)', marginBottom: 24 }}>
                            The patient record has been saved and risk score updated.
                        </p>
                        <button className="btn-modal-save" onClick={() => setShowSuccess(false)}>
                            Done
                        </button>
                        {/* Progress bar indicating auto-dismiss */}
                        <div style={{
                            height: 3,
                            background: 'var(--primary-blue-light)',
                            borderRadius: 99,
                            marginTop: 16,
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%',
                                background: 'var(--primary-blue)',
                                borderRadius: 99,
                                animation: 'shrink 3s linear forwards',
                            }} />
                        </div>
                    </div>
                </>
            )}

            {/* Delete Confirm Modal */}
            {deleteTarget && (
                <>
                    <div className="modal-overlay" onClick={() => setDeleteTarget(null)} />
                    <div className="modal-panel-sm">
                        <div className="modal-header">
                            <h2 className="modal-title">Delete Patient</h2>
                            <button className="modal-close-btn" onClick={() => setDeleteTarget(null)}>✕</button>
                        </div>
                        <p className="delete-confirm-text">
                            Are you sure you want to delete <strong>p{deleteTarget.patient_id}</strong>?
                        </p>
                        <p className="delete-confirm-sub">This action cannot be undone.</p>
                        <div className="modal-footer">
                            <button className="btn-modal-cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
                            <button className="btn-modal-delete" onClick={confirmDelete} disabled={deleting}>
                                {deleting ? 'Deleting…' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <div className="table-container">
                <div className="table-header">
                    <div className="table-header-top">
                        <h1 className="table-title">Priority Patients List</h1>
                        <div className="table-header-actions">
                            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                                + Add Patient
                            </button>
                        </div>
                    </div>

                    <div className="table-controls-row">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search by Patient ID (e.g. p8 or 8)"
                                value={searchId}
                                onChange={(e) => { setSearchId(e.target.value); setPage(1); }}
                            />
                        </div>
                        <div className="filter-controls">
                            <select
                                className="filter-select"
                                value={riskFilter}
                                onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
                            >
                                <option value="all">All Risk Levels</option>
                                <option value="high">High Risk Only</option>
                                <option value="medium">Medium Risk Only</option>
                                <option value="low">Low Risk Only</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loading && <p style={{ padding: '1.5rem', color: '#555' }}>Loading patients…</p>}

                {error && (
                    <div className="modal-error-banner" style={{ margin: '1rem' }}>
                        {error}{' '}
                        <button onClick={onRefresh} className="btn btn-secondary" style={{ marginLeft: 8 }}>
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                            <tr className="column-headers">
                                <th className="col-batch-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={pageIds.length > 0 && pageIds.every((id) => selected.has(id))}
                                        onChange={() => toggleAll(pageIds)}
                                    />
                                </th>
                                <th className="col-patient-id">Patient ID</th>
                                <th className="col-age">Age</th>
                                <th className="col-score">Score</th>
                                <th className="col-risk">Risk</th>
                                <th className="col-sex">Sex</th>
                                <th className="col-social">Social Life</th>
                                <th className="col-systolic">Systolic</th>
                                <th className="col-diastolic">Diastolic</th>
                                <th className="col-chol">Chol</th>
                                <th className="col-trig">Trig</th>
                                <th className="col-hdl">HDL</th>
                                <th className="col-ldl">LDL</th>
                                <th className="col-vldl">VLDL</th>
                                <th className="col-hba1c">HbA1c</th>
                                <th className="col-bmi">BMI</th>
                                <th className="col-rbs">RBS</th>
                                <th className="col-actions">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pageRows.length === 0 ? (
                                <tr>
                                    <td colSpan={18} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                                        No patients found.
                                    </td>
                                </tr>
                            ) : pageRows.map((p) => (
                                <tr key={p.patient_id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(p.patient_id)}
                                            onChange={() => toggleOne(p.patient_id)}
                                        />
                                    </td>
                                    <td className="patient-id">p{p.patient_id}</td>
                                    <td className="text-center">{p.age}</td>
                                    <td className="text-center risk-score">
                                        {p.risk_score != null ? Number(p.risk_score).toFixed(1) : '—'}
                                    </td>
                                    <td><RiskBadge level={p.risk_category} /></td>
                                    <td style={{ textTransform: 'capitalize' }}>{p.sex}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{p.social_life}</td>
                                    <td className="text-center">{p.bp_systolic}</td>
                                    <td className="text-center">{p.bp_diastolic}</td>
                                    <td className="text-center">{p.cholesterol}</td>
                                    <td className="text-center">{p.triglycerides}</td>
                                    <td className="text-center">{p.hdl}</td>
                                    <td className="text-center">{p.ldl}</td>
                                    <td className="text-center">{p.vldl}</td>
                                    <td className="text-center">{p.hba1c}</td>
                                    <td className="text-center">{p.bmi}</td>
                                    <td className="text-center">{p.rbs}</td>
                                    <td className="actions-cell">
                                        <button className="action-btn edit" onClick={() => setEditPatient(p)}>Edit</button>
                                        <button className="action-btn delete" onClick={() => setDeleteTarget(p)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !error && (
                    <div className="pagination">
                        <div className="pagination-info">
                            Showing{' '}
                            <strong>
                                {filtered.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + pageSize, filtered.length)}
                            </strong>{' '}
                            of <strong>{filtered.length}</strong> patients
                        </div>
                        <div className="pagination-controls">
                            <div className="rows-per-page">
                                Show
                                <select
                                    className="filter-select"
                                    style={{ padding: '4px 24px 4px 8px' }}
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                >
                                    {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                                </select>
                                per page
                            </div>
                            <button className="page-btn" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                                Previous
                            </button>
                            {pageNumbers().map((n, i) =>
                                n === '...' ? (
                                    <span key={`e-${i}`} style={{ padding: '0 8px', color: 'var(--gray-500)' }}>...</span>
                                ) : (
                                    <button key={n} className={`page-btn${safePage === n ? ' active' : ''}`} onClick={() => setPage(n)}>
                                        {n}
                                    </button>
                                )
                            )}
                            <button className="page-btn" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default PriorityTable;